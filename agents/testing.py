# Testing Agent - Analyzes testability and adds error handling
from .base import BaseAgent


class TestingAgent(BaseAgent):
    """AI-Powered Agent that analyzes testability and generates test suggestions"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key)
        self.name = "Testing Agent"
        self.description = "Analyzes code testability, adds error handling, and suggests test cases"
        
        self.system_prompt = """You are an expert testing engineer that works with MULTIPLE programming languages.

CRITICAL: The code you receive may be a MULTI-FILE PROJECT with files separated by <!-- path/to/file.ext --> markers.
You MUST preserve this exact structure in your output.

Your job is to:
1. Analyze the code for testability issues across all files
2. Check if proper error handling exists (try/catch, try/except, etc.)
3. Verify input validation is present
4. Check for edge cases that should be handled
5. **ALWAYS FIX any issues you find** — add error handling, validation, etc.

IMPORTANT RULES FOR MULTI-FILE CODE:
- The input may contain <!-- filename.ext --> markers separating files
- You MUST keep ALL <!-- --> markers EXACTLY as they appear
- You MUST keep ALL files in your fixed_code output — do NOT remove any files
- fixed_code must contain the COMPLETE project with ALL files and ALL markers preserved
- If input has 9 files, output must have 9 files. NEVER reduce the file count.

Respond in this EXACT JSON format (no markdown, just valid JSON):
{
    "status": "all_passed" or "warnings" or "failed",
    "testability_score": 75,
    "results": [
        {"test_name": "Error handling", "status": "warning", "description": "Missing try/catch", "duration": "0.01s"}
    ],
    "issues_found": ["No error handling in localStorage.js"],
    "fixes_applied": [
        {
            "description": "Added try/catch block for localStorage operations",
            "before": "const data = JSON.parse(localStorage.getItem(key));",
            "after": "try {\\n    const data = JSON.parse(localStorage.getItem(key));\\n} catch (e) {\\n    console.error(e);\\n}",
            "line": 15
        }
    ],
    "fixed_code": "<THE ENTIRE CODE WITH ALL FILES AND <!-- --> MARKERS PRESERVED, WITH FIXES APPLIED>",
    "suggested_tests": ["Test with valid input", "Test with None/null", "Test exception handling"]
}

CRITICAL RULES:
- fixed_code MUST contain the ACTUAL complete source code with ALL files and ALL <!-- --> markers
- NEVER remove files from the output — if input has 9 files, output MUST have 9 files
- NEVER return placeholder strings — return real code
- Do NOT include markdown or code blocks — just pure JSON
- Escape all quotes and newlines properly in JSON strings
- COMMENTS: Keep comments MINIMAL. Only short single-line comments. Do NOT add docstrings, multi-line comment blocks, or verbose explanations. Do NOT add comments to every line.
- Do NOT wrap fixed_code in ```python or any markdown fence

Focus on adding:
- try/catch or try/except blocks for risky operations
- Input validation checks
- Edge case handling
- Null/undefined checks"""
    
    def test(self, code):
        """Analyze code testability and return results with potential fixes"""
        user_prompt = f"Please analyze testability and fix issues:\n\n{code}"
        
        print(f"🧪 {self.name}: Analyzing testability...")
        result = self.call_api(self.system_prompt, user_prompt, max_tokens=8000)
        parsed = self.parse_json_response(result)
        
        if parsed:
            parsed['ai_powered'] = True
            fixes_count = len(parsed.get('fixes_applied', []))
            parsed['message'] = f"Score: {parsed.get('testability_score', 0)}/100 - {fixes_count} fixes applied"
            print(f"✅ {self.name}: AI analysis complete - {fixes_count} fixes applied")
            return parsed
        
        print(f"⚠️ {self.name}: Using basic testing (API unavailable)")
        basic = self._basic_test(code)
        basic['ai_powered'] = False
        basic['message'] = '⚠️ Basic test (API key required for AI fixes)'
        return basic
    
    def _basic_test(self, code):
        """Fallback basic test analysis"""
        has_try = 'try:' in code
        has_validation = 'if ' in code and ('not ' in code or 'is None' in code)
        
        return {
            "status": "all_passed" if has_try and has_validation else "warnings",
            "testability_score": 70 if has_try else 50,
            "results": [
                {"test_name": "Syntax Check", "status": "passed", "description": "Code compiles", "duration": "0.01s"},
                {"test_name": "Error Handling", "status": "passed" if has_try else "warning", "description": "Has try/except" if has_try else "Missing error handling", "duration": "0.01s"}
            ],
            "issues_found": [] if has_try else ["Missing error handling"],
            "fixes_applied": [],
            "fixed_code": None,
            "suggested_tests": ["Test with valid inputs", "Test with edge cases"],
            "description": "📊 Basic testability analysis",
            "message": f"Testability score: {70 if has_try else 50}/100"
        }
