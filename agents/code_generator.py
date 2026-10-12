# Code Generator Agent - Generates code using AI
import json
import requests
from .base import BaseAgent, GROQ_BASE_URL, MODEL


class CodeGeneratorAgent(BaseAgent):
    """Agent that generates code using AI"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key)
        self.name = "Code Generator"
        self.description = "Generates clean, production-ready code from natural language prompts"
        
        self.classify_prompt_text = """You are a code request classifier. Given a user prompt, respond with ONLY the word "single" or "multi" (nothing else).

Reply "single" if the request is for:
- A single function, algorithm, class, or short program
- A code snippet, utility, or script
- Anything described as "simple", "basic", or "a program to..."
- Examples: "write a C program to...", "implement binary search", "factorial using recursion", "create a Python function for..."

Reply "multi" if the request is for:
- A full app, project, website, system, dashboard, or platform
- Anything requiring multiple components, pages, routes, or modules
- Examples: "build a todo app", "create an e-commerce website", "make a chat application"
"""

        self.single_file_prompt = """You are an expert code generator. Generate a SINGLE clean, complete source file.

RULES:
1. Output ONLY raw source code — no markdown fences, no ```python, no ``` blocks.
2. Do NOT use <!-- --> file markers. Just output the code directly.
3. Use brief single-line comments only where needed. No docstrings, no triple-quote blocks.
4. Include proper error handling and edge case coverage.
5. Write clean, idiomatic code for the chosen language.
6. If generating HTML/CSS, use a modern color palette and clean typography (system-ui or Inter font).
7. Make output visually polished — avoid default browser styling."""

        self.multi_file_prompt = """You are an elite full-stack developer who creates stunning, production-ready projects.
Your generated code must be VISUALLY IMPRESSIVE, EASY TO RUN, and FUNCTIONALLY ROBUST.

═══════════════════════════════════════════
SECTION 1: OUTPUT FORMAT (CRITICAL — DO NOT BREAK)
═══════════════════════════════════════════
1. Prefix EACH file with an HTML comment marker showing its path:
   <!-- path/to/file.ext -->
   Use HTML comment markers <!-- --> for ALL file markers regardless of language.

2. Do NOT wrap code in markdown code blocks. Output raw code only.
3. NEVER include markdown language tags like ```python, ```javascript etc.
4. COMMENTS: Use ONLY brief single-line comments. No docstrings, no triple-quote blocks.

═══════════════════════════════════════════
SECTION 2: PROJECT STRUCTURE
═══════════════════════════════════════════
1. Generate a MINIMUM of 10 separate files. NEVER put everything in one monolithic file.
2. Use the MOST APPROPRIATE industry-standard project structure:
   - React/Vite: index.html, vite.config.js, src/App.jsx, src/main.jsx, src/components/, src/styles/, src/hooks/, src/utils/
   - Python/Flask: app/, app/routes/, app/models/, app/templates/, app/static/, tests/
   - Node/Express: src/routes/, src/middleware/, src/models/, src/controllers/
   - HTML/CSS/JS (no framework): css/, js/, assets/, index.html

3. Break features into individual files — one responsibility per file:
   - ONE file per UI component
   - ONE file per data model, hook, or service
   - Separate CSS files (globals/base, layout, per-component)
   - Utility/helper files
   - Test files for core modules

═══════════════════════════════════════════
SECTION 3: EASY TO RUN (MANDATORY)
═══════════════════════════════════════════
For JavaScript/React projects:
1. Use React 18+ with Vite as the build tool (NOT create-react-app / react-scripts).
2. Generate a COMPLETE, CORRECT package.json with:
   - "type": "module"
   - All dependencies with correct version numbers (react@^18, react-dom@^18, etc.)
   - devDependencies: @vitejs/plugin-react, vite
   - Scripts: "dev": "vite", "build": "vite build", "preview": "vite preview"
3. Generate a vite.config.js with the React plugin configured.
4. Entry point: index.html at root with <script type="module" src="/src/main.jsx"></script>
5. src/main.jsx should use createRoot (React 18 API).

For Python projects:
1. Generate requirements.txt with pinned versions.
2. Include a working entry point (main.py or app.py).

For ALL projects:
1. Generate a README.md that includes:
   - Project title and description
   - Prerequisites (Node.js 18+, Python 3.10+, etc.)
   - Exact terminal commands to install and run:
     ```
     npm install
     npm run dev
     ```
   - Features list
   - Project structure overview

═══════════════════════════════════════════
SECTION 4: VISUAL DESIGN (MANDATORY — THIS IS CRITICAL)
═══════════════════════════════════════════
Every generated UI MUST look professional and modern. Follow these rules:

COLOR SYSTEM:
- Define a CSS custom property design system in your global CSS:
  --color-primary, --color-primary-hover, --color-secondary,
  --color-bg, --color-surface, --color-text, --color-text-muted,
  --color-border, --color-accent, --color-success, --color-danger
- Use a sophisticated palette. Examples:
  Dark theme: bg #0f0f13, surface #1a1a2e, primary #6c63ff, accent #00d4aa
  Light theme: bg #f8f9fc, surface #ffffff, primary #4f46e5, accent #06b6d4
- NEVER use plain red (#ff0000), blue (#0000ff), or default browser colors.

TYPOGRAPHY:
- Use modern font stacks: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif
- Import from Google Fonts if using a web font: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
- Use proper font-weight hierarchy: headings 600-700, body 400, muted 300
- Use rem units for font sizes with a clear scale (0.75rem, 0.875rem, 1rem, 1.25rem, 1.5rem, 2rem)

LAYOUT:
- Use CSS Grid and Flexbox for all layouts
- Implement responsive design with at least 2 breakpoints (768px, 1024px)
- Add proper spacing with consistent padding/margin scale
- Max-width container for main content (1200px typical)

COMPONENTS:
- Buttons: gradient or solid backgrounds, rounded corners (8-12px), hover effects with transform/shadow
- Cards: subtle box-shadow (0 4px 6px -1px rgba(0,0,0,.1)), rounded corners (12-16px), border
- Inputs: styled borders, focus rings with box-shadow, proper padding (12px 16px)
- Lists: clean spacing, hover highlights, smooth transitions

ANIMATIONS & MICRO-INTERACTIONS:
- Add transition: all 0.2s ease on interactive elements
- Hover effects: translateY(-2px) + shadow increase on cards, color shifts on buttons
- Use @keyframes for loading spinners, fade-ins, slide-ups
- Add subtle entrance animations for content sections

ADVANCED TOUCHES:
- Glassmorphism where appropriate: background: rgba(255,255,255,0.05); backdrop-filter: blur(10px)
- Gradient accents on headers or hero sections
- Subtle border effects: border: 1px solid rgba(255,255,255,0.1)
- Empty states with icons and messages (not just blank space)
- Loading states with skeleton screens or spinners

═══════════════════════════════════════════
SECTION 5: CODE QUALITY
═══════════════════════════════════════════
1. Use React 18 functional components with hooks (useState, useEffect, useCallback, useMemo).
2. Proper component composition — pass data via props, lift state appropriately.
3. Include error handling (try/catch for storage, API calls, etc.).
4. Input validation on all forms.
5. Accessible markup: proper labels, ARIA attributes, semantic HTML (main, nav, section, article).
6. Each file must be complete and functional — no placeholder "TODO" comments.

═══════════════════════════════════════════
SECTION 6: COMMON MISTAKES — YOU MUST AVOID THESE
═══════════════════════════════════════════
These are CRITICAL errors that WILL break the app. Check every file against this list:

IMPORT/EXPORT CONSISTENCY:
- ALWAYS use "export default ComponentName" at the bottom of every component file.
- ALWAYS import with: import ComponentName from './ComponentName.jsx'
- NEVER use named exports like "export { ComponentName }" for React components.
- NEVER import with curly braces: import { ComponentName } from './ComponentName' — THIS WILL BREAK.
- Double-check EVERY import statement matches the actual export of the target file.

CSS FILE LOCATIONS:
- If a component imports './Foo.css', the file Foo.css MUST exist in the SAME directory as the component.
- If you put CSS files in src/styles/, then components MUST import '../styles/Foo.css' (NOT './Foo.css').
- PICK ONE PATTERN and be consistent across ALL files:
  Option A: CSS next to components → src/components/Foo.jsx imports './Foo.css', src/components/Foo.css exists
  Option B: CSS in styles folder → src/components/Foo.jsx imports '../styles/Foo.css', src/styles/Foo.css exists
- NEVER import a CSS file that doesn't exist. Every CSS import MUST have a matching generated file.

VITE PROJECT STRUCTURE:
- index.html must be at the PROJECT ROOT (next to package.json), NOT inside public/.
- package.json: vite and @vitejs/plugin-react go in "devDependencies", NOT "dependencies".
- Use COMPATIBLE version pairs: vite@^5.4.0 + @vitejs/plugin-react@^4.2.0 (these work together).
- Do NOT mix old versions (vite@^3 with plugin-react@^2 — this causes peer dependency errors).

DATA & STATE:
- For frontend-only apps, use localStorage for data persistence — do NOT call fake API URLs like "https://example.com/api".
- If the user asks for an API backend, generate a real working backend. Otherwise, use localStorage.

PACKAGE.JSON CORRECTNESS:
- Include ALL packages that are imported anywhere in the code.
- If any file imports 'react-router-dom', it MUST be in dependencies.
- If any file imports 'framer-motion', 'lucide-react', etc., they MUST be in dependencies.
- Scripts: "dev": "vite", "build": "vite build", "preview": "vite preview"

GLOBAL CSS IMPORT:
- The global CSS file (with CSS variables/design tokens) MUST be imported in src/main.jsx:
  import './styles/globals.css'
- Do NOT rely on index.html to link the CSS — Vite handles CSS through JS imports."""

        # Default system_prompt (for backward compat)
        self.system_prompt = self.multi_file_prompt
    
    def classify_prompt(self, prompt):
        """Quick LLM call to classify prompt as single-file or multi-file"""
        result = self.call_api(self.classify_prompt_text, prompt, max_tokens=10)
        if result:
            classification = result.strip().lower().replace('"', '').replace("'", "")
            if 'single' in classification:
                return 'single'
        return 'multi'
        
    def generate(self, prompt):
        """Non-streaming code generation"""
        result = self.call_api(self.system_prompt, prompt)
        if result:
            result = self._strip_markdown_fences(result)
            return result
        return self._mock_generate(prompt)
    
    @staticmethod
    def _strip_markdown_fences(code):
        """Remove markdown code fences like ```python, ```js, etc."""
        import re
        lines = code.split('\n')
        # Strip opening fence (```python, ```javascript, ```html, ```, etc.)
        if lines and re.match(r'^```\w*$', lines[0].strip()):
            lines = lines[1:]
        # Strip closing fence
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        return '\n'.join(lines)
    
    def generate_stream(self, prompt, mode='multi'):
        """Streaming code generation - yields chunks with automatic key rotation on rate limits"""
        from config import key_pool
        import time
        
        # Use the appropriate prompt based on classification
        active_prompt = self.single_file_prompt if mode == 'single' else self.multi_file_prompt
        max_retries = 3
        current_key = self.api_key
        
        for attempt in range(max_retries):
            try:
                print(f"🔄 Streaming with key ...{current_key[-8:]} (attempt {attempt + 1}/{max_retries})")
                response = requests.post(
                    GROQ_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {current_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": MODEL,
                        "messages": [
                            {"role": "system", "content": active_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 8000,
                        "stream": True
                    },
                    stream=True,
                    timeout=120
                )
                
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            line = line.decode('utf-8')
                            if line.startswith('data: '):
                                data = line[6:]
                                if data == '[DONE]':
                                    break
                                try:
                                    chunk = json.loads(data)
                                    if 'choices' in chunk and len(chunk['choices']) > 0:
                                        delta = chunk['choices'][0].get('delta', {})
                                        content = delta.get('content', '')
                                        if content:
                                            yield content
                                except json.JSONDecodeError:
                                    continue
                    return  # Success — exit the retry loop
                elif response.status_code == 429:
                    # Rate limited — rotate key and retry
                    key_pool.mark_rate_limited(current_key)
                    current_key = key_pool.get_key()
                    self.api_key = current_key
                    wait_time = min(2 ** attempt, 5)
                    print(f"⏳ Stream rate-limited. Rotating to key ...{current_key[-8:]}, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                elif response.status_code in (401, 403):
                    # Bad key — rotate and retry
                    key_pool.mark_rate_limited(current_key)
                    current_key = key_pool.get_key()
                    self.api_key = current_key
                    continue
                else:
                    print(f"Stream Error: {response.status_code}")
                    for chunk in self._mock_stream(prompt):
                        yield chunk
                    return
            except Exception as e:
                print(f"Stream Error: {e}")
                for chunk in self._mock_stream(prompt):
                    yield chunk
                return
        
        # All retries exhausted
        print(f"❌ Stream: All {max_retries} retry attempts exhausted")
        for chunk in self._mock_stream(prompt):
            yield chunk
    
    def _mock_stream(self, prompt):
        """Mock streaming for fallback"""
        code = self._mock_generate(prompt)
        chunk_size = 20
        for i in range(0, len(code), chunk_size):
            yield code[i:i+chunk_size]
    
    def _mock_generate(self, prompt):
        """Fallback mock generation"""
        return f'''def solution(param1, param2):
    """Generated function for: {prompt[:30]}..."""
    result = param1 + param2
    return result

if __name__ == "__main__":
    print(solution(10, 20))'''
