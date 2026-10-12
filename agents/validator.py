# Validation Agent - Validates code and auto-fixes issues
from .base import BaseAgent


class ValidationAgent(BaseAgent):
    """AI-Powered Agent that validates code and auto-fixes issues"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key)
        self.name = "Validation Agent"
        self.description = "Validates code for style, syntax, and best practices with auto-fix capability"
        
        self.system_prompt = """You are an expert code reviewer and validator that works with MULTIPLE programming languages.

CRITICAL: The code you receive may be a MULTI-FILE PROJECT with files separated by <!-- path/to/file.ext --> markers.
You MUST preserve this exact structure in your output.

Your job is to:
1. Analyze EACH file for syntax errors, style issues, and best practice violations
2. Check for proper naming conventions, missing documentation, and code organization
3. Detect the language of each file from its extension (JS, HTML, CSS, Python, etc.)
4. **ALWAYS FIX any issues you find** — don't just report them!

IMPORTANT RULES FOR MULTI-FILE CODE:
- The input may contain <!-- filename.ext --> markers separating files
- You MUST keep ALL <!-- --> markers EXACTLY as they appear
- You MUST keep ALL files in your fixed_code output — do NOT remove any files
- fixed_code must contain the COMPLETE project with ALL files and ALL markers preserved
- If input has 9 files, output must have 9 files. NEVER reduce the file count.

Respond in this EXACT JSON format (no markdown, just valid JSON):
{
    "status": "passed" or "warnings" or "failed",
    "issues": ["issue 1", "issue 2"],
    "warnings": ["warning 1"],
    "suggestions": ["suggestion 1"],
    "stats": {
        "functions": 5,
        "classes": 2,
        "lines": 100,
        "has_docstrings": false,
        "has_type_hints": false
    },
    "fixes_applied": [
        {
            "description": "Added error handling to TodoForm.js",
            "before": "const handleSubmit = () => {",
            "after": "const handleSubmit = () => {\\n    if (!input.trim()) return;",
            "line": 10
        }
    ],
    "fixed_code": "<THE ENTIRE CODE WITH ALL FILES AND <!-- --> MARKERS PRESERVED, WITH FIXES APPLIED>"
}

CRITICAL RULES:
- fixed_code MUST contain the ACTUAL complete source code with ALL files and ALL <!-- --> markers
- NEVER remove files from the output — if input has 9 files, output MUST have 9 files
- NEVER return placeholder strings — return real code
- Do NOT include markdown or code blocks — just pure JSON
- Escape all quotes and newlines properly in JSON strings
- COMMENTS: Keep comments MINIMAL. Only short single-line comments. Do NOT add docstrings, multi-line comment blocks, or verbose explanations. Do NOT add comments to every line — only where truly needed.
- Do NOT wrap fixed_code in ```python or any markdown fence"""
    
    def validate(self, code):
        """Validate code and return analysis with potential fixes"""
        user_prompt = f"Please validate and fix if needed:\n\n{code}"
        
        print(f"🔍 {self.name}: Analyzing code...")
        result = self.call_api(self.system_prompt, user_prompt, max_tokens=8000)
        parsed = self.parse_json_response(result)
        
        if parsed:
            parsed['ai_powered'] = True
            parsed['message'] = f"{'✅ Validation passed' if parsed.get('status') == 'passed' else '⚠️ Found issues'} - {len(parsed.get('issues', []))} issues, {len(parsed.get('fixes_applied', []))} fixes"
            print(f"✅ {self.name}: AI analysis complete - {len(parsed.get('fixes_applied', []))} fixes applied")
            return parsed
        
        # Fallback to basic validation
        print(f"⚠️ {self.name}: Using basic validation (API unavailable)")
        basic = self._basic_validate(code)
        basic['ai_powered'] = False
        basic['message'] = '⚠️ Basic validation (API key required for AI fixes)'
        return basic
    
    def _basic_validate(self, code):
        """Fallback basic validation"""
        issues = []
        lines = code.split('\n')
        
        for i, line in enumerate(lines, 1):
            if len(line) > 120:
                issues.append(f"Line {i}: exceeds 120 characters")
            if '\t' in line:
                issues.append(f"Line {i}: uses tabs instead of spaces")
        
        if "import *" in code:
            issues.append("Wildcard imports detected - avoid 'from x import *'")
        
        return {
            "status": "passed" if len(issues) == 0 else "warnings",
            "issues": issues,
            "warnings": [],
            "suggestions": [],
            "stats": {"functions": code.count('def '), "classes": code.count('class '), "lines": len(lines)},
            "fixes_applied": [],
            "fixed_code": None,
            "description": f"📊 Basic validation: {len(issues)} issues found",
            "message": f"Found {len(issues)} issue(s)"
        }
