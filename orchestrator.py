# Orchestrator for Uber Code Generator
# Coordinates all AI-powered agents using LangGraph-style workflow

from datetime import datetime

# Import all agents from the agents package
from agents import (
    CodeGeneratorAgent,
    ValidationAgent,
    TestingAgent,
    SecurityAgent,
    ProjectPlannerAgent,
    AGENT_INFO
)


class Orchestrator:
    """LangGraph-style orchestrator that coordinates all AI-powered agents"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key
        
        # Initialize all agents
        self.planner = ProjectPlannerAgent(api_key)
        self.code_generator = CodeGeneratorAgent(api_key)
        self.validator = ValidationAgent(api_key)
        self.tester = TestingAgent(api_key)
        self.security = SecurityAgent(api_key)
        
        # Workflow definition (linear pipeline)
        self._workflow_nodes = ["planner", "code_generator", "validator", "tester", "security"]
        self._workflow_edges = [
            ("planner", "code_generator"),
            ("code_generator", "validator"),
            ("validator", "tester"),
            ("tester", "security"),
        ]
        self._agents = {
            "planner": self.planner,
            "code_generator": self.code_generator,
            "validator": self.validator,
            "tester": self.tester,
            "security": self.security,
        }
        
        # Memory for storing intermediate results
        self.memory = {}
        self.workflow_history = []
        self.all_fixes = []  # Track all fixes made by agents

    def get_workflow_info(self):
        """Return workflow graph information"""
        return {
            "nodes": self._workflow_nodes,
            "edges": self._workflow_edges,
            "execution_order": self._workflow_nodes,
            "agent_info": AGENT_INFO
        }

    def classify_prompt(self, prompt):
        """Classify whether prompt needs single-file or multi-file generation using the planner"""
        result = self.planner.classify(prompt)
        return result.get('mode', 'multi')

    def enhance_prompt(self, prompt, mode='multi'):
        """Enhance a user prompt with detailed specs using the planner agent"""
        return self.planner.enhance_prompt(prompt, mode)

    def generate_code_stream(self, prompt, mode='multi'):
        """Stream code generation - yields chunks for real-time display"""
        self.memory['latest_prompt'] = prompt
        for chunk in self.code_generator.generate_stream(prompt, mode=mode):
            yield chunk

    def validate_code(self, code):
        """Run validation agent on code"""
        result = self.validator.validate(code)
        self.memory['latest_validation'] = result
        step = {
            "agent": "Validator",
            "agent_name": self.validator.name,
            "status": "completed",
            "output": result,
            "timestamp": datetime.now().isoformat()
        }
        self.workflow_history.append(step)
        return result

    def test_code(self, code):
        """Run testing agent on code"""
        result = self.tester.test(code)
        self.memory['latest_test'] = result
        step = {
            "agent": "Testing",
            "agent_name": self.tester.name,
            "status": "completed",
            "output": result,
            "timestamp": datetime.now().isoformat()
        }
        self.workflow_history.append(step)
        return result

    def secure_code(self, code):
        """Run security agent on code"""
        result = self.security.scan(code)
        self.memory['latest_security'] = result
        step = {
            "agent": "Security",
            "agent_name": self.security.name,
            "status": "completed",
            "output": result,
            "timestamp": datetime.now().isoformat()
        }
        self.workflow_history.append(step)
        return result

    def run_workflow(self, prompt):
        """
        Execute the full LangGraph workflow with auto-fixing
        
        Flow:
        1. Code Generator -> Creates initial code
        2. Validator -> Checks style/syntax, fixes issues
        3. Tester -> Adds error handling, improves testability
        4. Security -> Scans vulnerabilities, applies security fixes
        
        Each agent can modify the code, and fixes are chained together.
        """
        self.workflow_history = []
        self.all_fixes = []
        
        # Step 1: Code Generation
        print(f"🚀 Running Code Generator Agent...")
        code = self.code_generator.generate(prompt)
        original_code = code
        self.memory['original_code'] = code
        self.memory['latest_code'] = code
        self.memory['latest_prompt'] = prompt
        
        self.workflow_history.append({
            "agent": "Code Generator",
            "agent_name": self.code_generator.name,
            "status": "completed",
            "timestamp": datetime.now().isoformat(),
            "description": f"Generated {len(code.split(chr(10)))} lines of code"
        })
        
        # Step 2: Validation - analyze and potentially fix
        print(f"✅ Running Validation Agent...")
        validation = self.validate_code(code)
        if validation.get('fixed_code') and validation.get('fixes_applied'):
            code = validation['fixed_code']
            self.memory['latest_code'] = code
            self.all_fixes.append({
                "agent": "Validator",
                "agent_name": self.validator.name,
                "icon": "✅",
                "fixes": validation['fixes_applied']
            })
            print(f"  → Applied {len(validation['fixes_applied'])} fixes")
        
        # Step 3: Testing - analyze and potentially fix
        print(f"🧪 Running Testing Agent...")
        tests = self.test_code(code)
        if tests.get('fixed_code') and tests.get('fixes_applied'):
            code = tests['fixed_code']
            self.memory['latest_code'] = code
            self.all_fixes.append({
                "agent": "Testing",
                "agent_name": self.tester.name,
                "icon": "🧪",
                "fixes": tests['fixes_applied']
            })
            print(f"  → Applied {len(tests['fixes_applied'])} fixes")
        
        # Step 4: Security - analyze and potentially fix
        print(f"🛡️ Running Security Agent...")
        security = self.secure_code(code)
        if security.get('fixed_code') and security.get('fixes_applied'):
            code = security['fixed_code']
            self.memory['latest_code'] = code
            self.all_fixes.append({
                "agent": "Security",
                "agent_name": self.security.name,
                "icon": "🛡️",
                "fixes": security['fixes_applied']
            })
            print(f"  → Applied {len(security['fixes_applied'])} fixes")
        
        # Determine final code (with all fixes applied)
        final_code = code
        code_was_fixed = final_code != original_code
        total_fixes = sum(len(f['fixes']) for f in self.all_fixes)
        
        print(f"✨ Workflow complete! {total_fixes} total fixes applied.")
        
        return {
            "code": final_code,
            "original_code": original_code if code_was_fixed else None,
            "prompt": prompt,
            "validation": validation,
            "tests": tests,
            "security": security,
            "workflow": self.workflow_history,
            "workflow_graph": self.get_workflow_info(),
            "all_fixes": self.all_fixes,
            "code_was_fixed": code_was_fixed,
            "total_fixes": total_fixes
        }

    def run_agents_on_code(self, code):
        """Run validation, testing, security on existing code (without generation)"""
        self.workflow_history = []
        self.all_fixes = []
        original_code = code
        
        # Run all analysis agents
        validation = self.validate_code(code)
        if validation.get('fixed_code') and validation.get('fixes_applied'):
            code = validation['fixed_code']
            self.all_fixes.append({
                "agent": "Validator",
                "fixes": validation['fixes_applied']
            })
        
        tests = self.test_code(code)
        if tests.get('fixed_code') and tests.get('fixes_applied'):
            code = tests['fixed_code']
            self.all_fixes.append({
                "agent": "Testing",
                "fixes": tests['fixes_applied']
            })
        
        security = self.secure_code(code)
        if security.get('fixed_code') and security.get('fixes_applied'):
            code = security['fixed_code']
            self.all_fixes.append({
                "agent": "Security",
                "fixes": security['fixes_applied']
            })
        
        code_was_fixed = code != original_code
        
        return {
            "validation": validation,
            "tests": tests,
            "security": security,
            "workflow": self.workflow_history,
            "code": code,
            "original_code": original_code if code_was_fixed else None,
            "all_fixes": self.all_fixes,
            "code_was_fixed": code_was_fixed,
            "total_fixes": sum(len(f['fixes']) for f in self.all_fixes)
        }

    def is_multi_file(self, code):
        """Check if the generated code is a multi-file project"""
        import re
        markers = re.findall(r'<!--\s*.+?\.\w{1,5}\s*-->', code)
        return len(markers) >= 2

    def generate_setup_instructions(self, code):
        """Generate setup instructions for multi-file projects using LLM"""
        if not self.is_multi_file(code):
            return None
        
        system_prompt = """You are a technical documentation expert. Given a multi-file project's source code, generate clear, beginner-friendly setup instructions.

Respond in this EXACT JSON format (no markdown, just valid JSON):
{
    "project_structure": "A tree-format string showing the folder structure e.g. project/\\n├── src/\\n│   ├── index.js\\n│   └── App.js\\n├── package.json\\n└── README.md",
    "prerequisites": ["Node.js v16+", "npm or yarn"],
    "installation_steps": [
        {"command": "npm install", "description": "Install all dependencies"}
    ],
    "env_setup": [
        {"variable": "API_KEY", "description": "Your API key", "example": "API_KEY=your-key-here"}
    ],
    "database_setup": [
        {"step": "Install MongoDB", "command": "brew install mongodb-community"}
    ],
    "run_commands": [
        {"command": "npm start", "description": "Start development server", "type": "dev"},
        {"command": "npm run build", "description": "Build for production", "type": "prod"}
    ],
    "how_it_works": "Brief explanation of the project architecture and flow",
    "troubleshooting": [
        {"problem": "Port 3000 already in use", "solution": "Kill the process using port 3000 or change the port in .env"}
    ],
    "vscode_tips": ["Open the project folder in VS Code", "Install recommended extensions"]
}

RULES:
- Only include database_setup if the project uses a database
- Only include env_setup if environment variables are needed
- Detect the tech stack from the code (React, Express, Flask, Django, HTML/CSS/JS, etc.)
- Keep instructions concise but technically accurate
- Format terminal commands exactly as they should be run
- Do NOT include markdown or code blocks — just pure JSON
- Escape all quotes and newlines properly in JSON strings"""

        user_prompt = f"Generate setup instructions for this multi-file project:\n\n{code[:6000]}"
        
        print(f"📋 Generating setup instructions for multi-file project...")
        from agents.base import call_groq_api
        import time as _time
        
        # Retry with delay to handle rate limits (429 errors)
        max_retries = 3
        result = None
        for attempt in range(max_retries):
            result = call_groq_api(self.api_key or self.code_generator.api_key, system_prompt, user_prompt, max_tokens=2000)
            if result:
                break
            if attempt < max_retries - 1:
                wait_secs = 10 * (attempt + 1)  # 10s, 20s, 30s
                print(f"⏳ Rate limited — retrying setup instructions in {wait_secs}s (attempt {attempt + 2}/{max_retries})...")
                _time.sleep(wait_secs)
        
        if result:
            try:
                import json
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    parsed = json.loads(result[json_start:json_end])
                    print(f"✅ Setup instructions generated successfully")
                    return parsed
            except Exception as e:
                print(f"⚠️ Failed to parse setup instructions: {e}")
        
        return None

    def generate_project_description(self, code, original_code, prompt):
        """Generate a structured, ChatGPT-style project description/changelog."""
        system_prompt = """You are an expert developer summarizing a project generation or update. 
Return a JSON object:
{
    "title": "A short, fitting emoji title for the project snippet (e.g. '✅ Todo Application' or '📊 Dashboard')",
    "summary": "Detailed paragraph explaining what was just built. If you see original_code provided, focus largely on explaining the precise changes and updates made from the original code (e.g. 'I refactored the App component and added a Settings page.'). If no original_code is given, explain the initial architecture.",
    "keyPoints": ["**ComponentName** - What it does", "`helper_func()` - Used for X"],
    "features": ["**Error handling** with try/catch", "**State management** using hooks"]
}
RULES:
- Limit keyPoints to 3-4 items max.
- Limit features to 3-5 items max.
- Be highly conversational in the summary, saying "I have built..." or "I have updated...".
- Only output valid JSON, absolutely no markdown."""

        user_prompt = f"Prompt: {prompt}\n\n"
        if original_code and original_code.strip() != code.strip():
            user_prompt += f"Original Code Snippet:\n{original_code[-2000:]}\n\n"
            user_prompt += f"Updated Code Snippet:\n{code[-3000:]}"
        else:
            user_prompt += f"Original Code: None\n\nGenerated Code Snippet:\n{code[-4000:]}"
            
        print(f"📝 Generating LLM description for the code...")
        from agents.base import call_groq_api
        
        # Don't spend too many retries on the visual description
        result = call_groq_api(self.api_key or self.code_generator.api_key, system_prompt, user_prompt, max_tokens=1000)
        
        if result:
            try:
                import json
                json_start = result.find('{')
                json_end = result.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    parsed = json.loads(result[json_start:json_end])
                    return parsed
            except Exception as e:
                print(f"⚠️ Failed to parse project description: {e}")
                
        return None

    def get_agent_info(self):
        """Get information about all agents"""
        return {
            "agents": [
                {
                    "id": "code_generator",
                    "name": self.code_generator.name,
                    "description": self.code_generator.description,
                    "icon": "🚀"
                },
                {
                    "id": "validator",
                    "name": self.validator.name,
                    "description": self.validator.description,
                    "icon": "✅"
                },
                {
                    "id": "tester",
                    "name": self.tester.name,
                    "description": self.tester.description,
                    "icon": "🧪"
                },
                {
                    "id": "security",
                    "name": self.security.name,
                    "description": self.security.description,
                    "icon": "🛡️"
                }
            ],
            "workflow": self.get_workflow_info()
        }
