# Security Agent - Scans for vulnerabilities and fixes them
from .base import BaseAgent


class SecurityAgent(BaseAgent):
    """AI-Powered Agent that scans for security vulnerabilities and fixes them"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key)
        self.name = "Security Agent"
        self.description = "Scans for security vulnerabilities and automatically applies fixes"
        
        self.system_prompt = """You are an expert cybersecurity engineer that works with MULTIPLE programming languages.

CRITICAL: The code you receive may be a MULTI-FILE PROJECT with files separated by <!-- path/to/file.ext --> markers.
You MUST preserve this exact structure in your output.

Your job is to:
1. Scan ALL files for security vulnerabilities (injection, XSS, CSRF, etc.)
2. Check for dangerous functions:
   - Python: eval, exec, pickle, os.system
   - JavaScript: innerHTML, eval, document.write
   - HTML: inline event handlers, missing CSP
3. Look for hardcoded secrets, credentials, API keys in ANY file
4. Check for insecure practices in each language
5. **ALWAYS FIX any vulnerabilities you find** — don't just report them!

IMPORTANT RULES FOR MULTI-FILE CODE:
- The input may contain <!-- filename.ext --> markers separating files
- You MUST keep ALL <!-- --> markers EXACTLY as they appear
- You MUST keep ALL files in your fixed_code output — do NOT remove any files
- fixed_code must contain the COMPLETE project with ALL files and ALL markers preserved
- If input has 9 files, output must have 9 files. NEVER reduce the file count.

Respond in this EXACT JSON format (no markdown, just valid JSON):
{
    "status": "secure" or "vulnerabilities_found",
    "risk_level": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL",
    "risk_score": 25,
    "vulnerabilities": [
        {"pattern": "innerHTML = userInput", "severity": "HIGH", "type": "XSS", "description": "Allows script injection", "line": 15}
    ],
    "warnings": [],
    "fixes_applied": [
        {
            "description": "Replaced innerHTML with textContent to prevent XSS",
            "severity": "HIGH",
            "before": "element.innerHTML = userInput",
            "after": "element.textContent = userInput",
            "line": 15
        }
    ],
    "fixed_code": "<THE ENTIRE CODE WITH ALL FILES AND <!-- --> MARKERS PRESERVED, WITH FIXES APPLIED>",
    "recommendations": ["Add input validation", "Implement CSP headers"]
}

CRITICAL RULES:
- fixed_code MUST contain the ACTUAL complete source code with ALL files and ALL <!-- --> markers
- NEVER remove files from the output — if input has 9 files, output MUST have 9 files
- NEVER return placeholder strings — return real code
- Do NOT include markdown or code blocks — just pure JSON
- Escape all quotes and newlines properly in JSON strings
- Include severity level (CRITICAL/HIGH/MEDIUM/LOW) for each fix
- COMMENTS: Keep comments MINIMAL. Only short single-line comments. Do NOT add docstrings, multi-line comment blocks, or verbose explanations. Do NOT add comments to every line.
- Do NOT wrap fixed_code in ```python or any markdown fence"""
    
    def scan(self, code):
        """Scan code for security vulnerabilities and return results with fixes"""
        user_prompt = f"Please perform a security audit and fix vulnerabilities:\n\n{code}"
        
        print(f"🛡️ {self.name}: Scanning for vulnerabilities...")
        result = self.call_api(self.system_prompt, user_prompt, max_tokens=8000)
        parsed = self.parse_json_response(result)
        
        if parsed:
            parsed['ai_powered'] = True
            vuln_count = len(parsed.get('vulnerabilities', []))
            fixes_count = len(parsed.get('fixes_applied', []))
            parsed['message'] = f"{'✅ Secure' if vuln_count == 0 else f'🚨 {vuln_count} vulnerabilities'} - {fixes_count} fixes applied"
            print(f"✅ {self.name}: AI scan complete - {fixes_count} security fixes applied")
            return parsed
        
        print(f"⚠️ {self.name}: Using basic scan (API unavailable)")
        basic = self._basic_scan(code)
        basic['ai_powered'] = False
        basic['message'] = '⚠️ Basic scan only - API key required for AI auto-fix'
        return basic
    
    def _basic_scan(self, code):
        """Fallback basic security scan"""
        vulnerabilities = []
        
        dangerous_patterns = [
            ("eval(", "CRITICAL", "Code Injection", "eval() can execute arbitrary code"),
            ("exec(", "CRITICAL", "Code Injection", "exec() can execute arbitrary code"),
            ("pickle.loads(", "HIGH", "Deserialization", "pickle.loads() can execute arbitrary code"),
            ("os.system(", "HIGH", "Command Injection", "os.system() is vulnerable to command injection"),
            ("subprocess.call(", "MEDIUM", "Command Injection", "Consider using subprocess.run with shell=False"),
            ("shell=True", "HIGH", "Command Injection", "shell=True enables command injection"),
            ("password =", "MEDIUM", "Hardcoded Secret", "Possible hardcoded password"),
            ("api_key =", "MEDIUM", "Hardcoded Secret", "Possible hardcoded API key"),
            ("secret =", "MEDIUM", "Hardcoded Secret", "Possible hardcoded secret"),
        ]
        
        for pattern, severity, vuln_type, description in dangerous_patterns:
            if pattern.lower() in code.lower():
                vulnerabilities.append({
                    "pattern": pattern,
                    "severity": severity,
                    "type": vuln_type,
                    "description": description
                })
        
        risk_score = min(len(vulnerabilities) * 25, 100)
        risk_level = "LOW" if risk_score < 25 else "MEDIUM" if risk_score < 50 else "HIGH" if risk_score < 75 else "CRITICAL"
        
        return {
            "status": "secure" if not vulnerabilities else "vulnerabilities_found",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "vulnerabilities": vulnerabilities,
            "warnings": [],
            "fixes_applied": [],
            "fixed_code": None,
            "recommendations": ["Review code manually for additional security issues"],
            "description": f"🛡️ Basic security scan: {len(vulnerabilities)} issues found",
            "message": f"Found {len(vulnerabilities)} vulnerability(ies)"
        }
