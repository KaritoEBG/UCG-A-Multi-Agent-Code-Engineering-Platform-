# Project Planner Agent - Detects single vs multi-file projects and plans file structure
import json
from .base import BaseAgent


class ProjectPlannerAgent(BaseAgent):
    """
    AI-powered agent that:
    1. Classifies prompts as single-file or multi-file projects
    2. For multi-file: generates a project plan (file tree, purpose per file)
    3. Generates each file individually for higher quality output
    """

    def __init__(self, api_key=None):
        super().__init__(api_key)
        self.name = "Project Planner"
        self.description = "Classifies project scope and plans multi-file structure"

        # ── Classifier prompt ──
        self.classifier_prompt = """You are a project scope classifier. Given a user's coding request, 
determine whether it requires a SINGLE file or MULTIPLE files.

Rules:
- "single" = one script/module is enough (utility function, class, algorithm, snippet, calculator, etc.)
- "multi"  = needs a project structure (web app, REST API, full-stack app, CLI with config, anything 
  requiring separate models/routes/components/config/tests, or when the user explicitly asks for 
  "an app", "a website", "a project", "full-stack", etc.)

Respond in EXACT JSON (no markdown):
{"mode": "single"} or {"mode": "multi", "reason": "brief reason"}"""

        # ── Planner prompt (multi-file) ──
        self.planner_prompt = """You are an expert software architect who designs stunning, production-ready projects.
Given a project description, produce a project plan specifying every file that should be created.

Rules:
1. Be pragmatic — only include files that are genuinely needed.
2. Always include a README.md and a requirements.txt (Python) or package.json (JS/TS).
3. Group related files in directories (src/, tests/, config/, etc.).
4. Order files so dependencies come before dependents.
5. Include a brief purpose for each file.
6. Specify the language for each file.
7. For React/JS projects: use Vite (vite.config.js) as the build tool, NOT create-react-app.
   Always include: index.html (root), vite.config.js, src/main.jsx, package.json.
8. ALWAYS include dedicated styling files:
   - A global CSS file with CSS custom properties (design tokens: colors, fonts, spacing)
   - Component-specific CSS files where needed
   - Layout CSS file for responsive grid/flex structures
9. Plan for a minimum of 10 files. Break features into small, focused files.
10. Include a package.json or requirements.txt with CORRECT, MODERN dependency versions.

Respond in EXACT JSON (no markdown):
{
  "project_name": "my-project",
  "description": "Brief description",
  "files": [
    {"path": "README.md", "purpose": "Project documentation with setup instructions", "language": "markdown"},
    {"path": "package.json", "purpose": "Dependencies and scripts (React 18+, Vite)", "language": "json"},
    {"path": "vite.config.js", "purpose": "Vite build configuration with React plugin", "language": "javascript"},
    {"path": "index.html", "purpose": "HTML entry point for Vite", "language": "html"},
    {"path": "src/main.jsx", "purpose": "React 18 entry point with createRoot", "language": "javascript"},
    {"path": "src/App.jsx", "purpose": "Root application component", "language": "javascript"},
    {"path": "src/styles/globals.css", "purpose": "Design system: CSS variables, resets, typography", "language": "css"}
  ]
}"""

        # ── Per-file generation prompt ──
        self.file_gen_prompt = """You are an elite full-stack developer generating ONE specific file 
that is part of a larger project. The output MUST be production-quality and visually stunning.

Project context:
{project_context}

You are generating: {file_path}
Purpose: {file_purpose}
Language: {language}

Other files in this project (for correct import paths):
{other_files}

Previously generated files for reference (use correct imports/references):
{previous_files}

Rules:
1. Generate ONLY the content for this specific file — no wrapper, no explanation.
2. Use correct import paths relative to the project structure.
3. Reference other files in the project using proper import statements.
4. Follow best practices for the language.
5. Do NOT wrap in markdown code blocks — output raw code/content only.
6. Make sure exports/function signatures match what other files expect.

STYLING & DESIGN RULES (for UI components and CSS files):
7. Use React 18 functional components with hooks (useState, useEffect, useCallback).
8. For CSS files: use CSS custom properties (--color-primary, --color-bg, etc.) for theming.
9. For components: use modern, polished UI patterns — never raw unstyled HTML.
10. Add smooth transitions (transition: all 0.2s ease) on interactive elements.
11. Use proper spacing, rounded corners (border-radius: 8-12px), and box-shadows.
12. Implement responsive design with media queries.
13. Use semantic HTML (main, nav, section, article, button) and ARIA labels for accessibility.
14. For package.json: use React 18+, Vite as build tool. Include all necessary dependencies.
15. For README.md: include exact terminal commands (npm install, npm run dev) and project overview."""

        # ── Prompt Enhancer prompt ──
        self.enhancer_prompt = """You are a senior software architect and UI designer. Given a user's coding request,
expand it into a PRECISE, DETAILED project specification that a code generator can follow EXACTLY to produce
a production-ready application that runs perfectly on the first try with premium styling.

Your output MUST be a plain text enhanced prompt (NOT JSON, NOT code). It should read like a detailed architect's brief.

First, determine if the request is for a FRONTEND-ONLY app, or a FULL-STACK app (if it mentions database, backend, Express, or API).

═══ TECH STACK & CONFIGURATION ═══
FRONTEND-ONLY:
- React 18 + Vite 5 build tool
- Root package.json with "type": "module", dependencies: react, react-dom, react-router-dom. devDependencies: vite, @vitejs/plugin-react
- index.html at PROJECT ROOT MUST link Google Fonts Inter and have <script type="module" src="/src/main.jsx">
- vite.config.js with @vitejs/plugin-react
- Scripts: "dev": "vite", "build": "vite build"

FULL-STACK / BACKEND:
- React 18 + Vite 5 frontend WITH an Express.js backend natively integrated.
- A SINGLE root package.json that installs BOTH backend (express) and frontend tools (react, vite).
- Scripts must include ways to run both together, e.g., "server": "node server.js", "dev": "vite", "start": "concurrently \\"npm run server\\" \\"npm run dev\\""
- Root `server.js` running Express on port 3001, providing JSON parsing `express.json()`.
- `vite.config.js` MUST set up a proxy to route `/api` to `http://localhost:3001`.
- index.html at PROJECT ROOT MUST link Google Fonts Inter and have <script type="module" src="/src/main.jsx">

═══ FILE STRUCTURE & IMPORT RULES ═══
List EVERY file with its exact path. For React projects:
- package.json, vite.config.js, index.html, README.md (all at root)
- src/main.jsx — imports './styles/globals.css', uses createRoot, wraps app in BrowserRouter
- src/components/[Name].jsx — one per feature/page
- src/styles/globals.css — the CSS design system
- src/styles/[Name].css — one CSS file per component
If FULL-STACK, also include `server.js` at root.

CRITICAL IMPORT CONVENTIONS:
- Every component file: "export default ComponentName" at the bottom (NEVER named exports)
- Every import: "import ComponentName from './ComponentName.jsx'" (NEVER curly braces for components)
- Every CSS import from components: "import '../styles/ComponentName.css'" 
- For each component, write: "[Component].jsx (imports '../styles/[Component].css')" to confirm the path match

═══ DATA PERSISTENCE & API DESIGN ═══
- Frontend-only: ALWAYS use `localStorage` for persistence. NEVER call fake API URLs.
- Full-stack: The Express `server.js` must define explicit API routes (e.g., GET /api/todos, POST /api/todos). You MUST explicitly list the required API endpoints and data model definitions (e.g., `const items = []`) in your output. The React frontend MUST use `fetch` or `axios` to call these routes, and NEVER use `localStorage`.

═══ DESIGN SYSTEM (MANDATORY — SPECIFY THESE EXACT VALUES) ═══
Instruct the code generator to use this dark theme CSS design system in globals.css:

:root variables to define:
  --color-primary: #6c63ff (purple) with hover: #5a52d5 and glow: rgba(108,99,255,0.3)
  --color-secondary: #00d4aa (teal)
  --color-accent: #ff6b9d (pink)
  --color-bg: #0f0f1a (deep dark), --color-bg-secondary: #161625
  --color-surface: #1e1e32 (card backgrounds), --color-surface-hover: #2a2a42
  --color-text: #e8e8f0, --color-text-muted: #9090a8, --color-text-dim: #6a6a82
  --color-border: rgba(255,255,255,0.08), --color-border-hover: rgba(255,255,255,0.15)
  --color-danger: #ff4757, --color-success: #00d4aa
  --font-family: 'Inter', system-ui, sans-serif
  --radius-sm/md/lg/xl: 8px/12px/16px/24px
  --shadow-sm/md/lg, --transition-fast/normal/slow

Global reset: *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
Body: dark bg, Inter font, smooth scrolling, antialiased text

═══ UI PATTERNS TO SPECIFY ═══
For each page/component, describe these styling requirements in deep detail:
- Hero/Landing: gradient text (background-clip:text), animated CTA button with glow shadow,
  feature cards with dark surface + border + hover lift effect, radial gradient bg decoration
- Forms: dark surface inputs with border, purple focus ring (box-shadow glow), gradient submit button
- Lists/Cards: dark surface bg, subtle border, hover translateX(4px) slide effect, staggered fadeInUp animations
- Buttons: gradient primary (purple→violet), danger buttons with red tint bg + red border
- Navigation: glassmorphism header (rgba bg + backdrop-filter:blur), back links with hover color
- Empty states: centered icon + muted text message
- Animations: @keyframes fadeInUp, fadeIn, pulse — apply to page enters and list items

═══ OUTPUT FORMAT ═══
Your enhanced prompt should be highly detailed (400-600 words) and include:
1. Project overview (1-2 sentences describing what to build)
2. Complete file list with exact paths and CSS import mappings
3. Tech stack with exact package versions (specifying Full-Stack Express config if needed) 
4. Feature list with UI description for each feature (If full-stack, explicitly list the Backend API endpoints and expected data schemas).
5. Design system summary (reference the CSS variables above)
6. Data Persistence instruction (localStorage OR standard fetch to Express /api, clearly stated)

DO NOT generate any code. Output only the enhanced text prompt."""

    # ────────────────────── Public API ──────────────────────

    def enhance_prompt(self, prompt: str, mode: str = 'multi') -> str:
        """
        Enhance a user prompt with detailed specs for better code generation.
        Only enhances multi-file prompts; single-file prompts pass through unchanged.
        """
        if mode == 'single':
            return prompt

        print(f"✨ Enhancing prompt for multi-file generation...")
        result = self.call_api(self.enhancer_prompt, prompt, max_tokens=1200)

        if result and len(result.strip()) > 50:
            enhanced = result.strip()
            # Strip markdown fences if the LLM wrapped it
            enhanced = self._strip_markdown_fences(enhanced)
            print(f"✅ Prompt enhanced: {len(prompt)} → {len(enhanced)} chars")
            return enhanced

        print(f"⚠️ Enhancement failed, using original prompt")
        return prompt


    def classify(self, prompt: str) -> dict:
        """
        Classify a prompt as single-file or multi-file.
        Returns {"mode": "single"} or {"mode": "multi", "reason": "..."}.
        Uses both LLM and heuristic — if either says multi, it's multi.
        """
        # Always run heuristic first for keyword detection
        heuristic = self._heuristic_classify(prompt)

        # Try LLM classification
        result = self.call_api(self.classifier_prompt, prompt, max_tokens=200)
        parsed = self.parse_json_response(result)

        if parsed and parsed.get("mode") in ("single", "multi"):
            # If LLM says multi, use it
            if parsed["mode"] == "multi":
                return parsed
            # If LLM says single but heuristic says multi, trust the heuristic
            if heuristic.get("mode") == "multi":
                print(f"⚡ Heuristic override: LLM said single but keywords detected — {heuristic.get('reason')}")
                return heuristic
            return parsed

        # Heuristic fallback when API is unavailable
        return self._heuristic_classify(prompt)

    def plan_project(self, prompt: str) -> dict:
        """
        Generate a multi-file project plan.
        Returns {"project_name": ..., "description": ..., "files": [...]}.
        """
        result = self.call_api(self.planner_prompt, prompt, max_tokens=1500)
        parsed = self.parse_json_response(result)

        if parsed and parsed.get("files"):
            # Ensure each file entry has required fields
            for f in parsed["files"]:
                f.setdefault("language", self._detect_language(f["path"]))
                f.setdefault("purpose", "")
            return parsed

        # Fallback
        return self._fallback_plan(prompt)

    def generate_file_content(self, prompt: str, file_info: dict,
                              project_plan: dict,
                              generated_files: dict = None) -> str:
        """
        Generate content for a single file within a multi-file project.
        
        Args:
            prompt: Original user prompt
            file_info: {"path": ..., "purpose": ..., "language": ...}
            project_plan: Full project plan
            generated_files: {path: content} of already-generated files
        """
        generated_files = generated_files or {}

        # Build context strings
        other_files = "\n".join(
            f"  - {f['path']} ({f['purpose']})"
            for f in project_plan["files"]
            if f["path"] != file_info["path"]
        )

        # Include snippets of already-generated files (first 30 lines each)
        prev_snippets = []
        for path, content in generated_files.items():
            lines = content.split("\n")
            snippet = "\n".join(lines[:30])
            if len(lines) > 30:
                snippet += f"\n... ({len(lines) - 30} more lines)"
            prev_snippets.append(f"--- {path} ---\n{snippet}")
        previous_files = "\n\n".join(prev_snippets) if prev_snippets else "(none yet)"

        user_prompt = self.file_gen_prompt.format(
            project_context=f"{project_plan.get('project_name', 'project')}: {prompt}",
            file_path=file_info["path"],
            file_purpose=file_info["purpose"],
            language=file_info["language"],
            other_files=other_files or "(none)",
            previous_files=previous_files,
        )

        result = self.call_api(
            "You are an expert code generator. Output ONLY the raw file content, no markdown blocks.",
            user_prompt,
            max_tokens=3000
        )

        if result:
            # Strip markdown fences if the LLM added them anyway
            return self._strip_markdown_fences(result)

        return self._fallback_file_content(file_info)

    def generate_file_stream(self, prompt: str, file_info: dict,
                             project_plan: dict,
                             generated_files: dict = None):
        """
        Streaming version — yields chunks for a single file.
        """
        import requests
        generated_files = generated_files or {}

        other_files = "\n".join(
            f"  - {f['path']} ({f['purpose']})"
            for f in project_plan["files"]
            if f["path"] != file_info["path"]
        )

        prev_snippets = []
        for path, content in generated_files.items():
            lines = content.split("\n")
            snippet = "\n".join(lines[:30])
            if len(lines) > 30:
                snippet += f"\n... ({len(lines) - 30} more lines)"
            prev_snippets.append(f"--- {path} ---\n{snippet}")
        previous_files = "\n\n".join(prev_snippets) if prev_snippets else "(none yet)"

        user_prompt = self.file_gen_prompt.format(
            project_context=f"{project_plan.get('project_name', 'project')}: {prompt}",
            file_path=file_info["path"],
            file_purpose=file_info["purpose"],
            language=file_info["language"],
            other_files=other_files or "(none)",
            previous_files=previous_files,
        )

        from .base import GROQ_BASE_URL, MODEL
        try:
            response = requests.post(
                GROQ_BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "You are an expert code generator. Output ONLY the raw file content, no markdown code blocks."},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 3000,
                    "stream": True
                },
                stream=True,
                timeout=90
            )

            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        line = line.decode("utf-8")
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                if "choices" in chunk and len(chunk["choices"]) > 0:
                                    delta = chunk["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
            else:
                yield self._fallback_file_content(file_info)
        except Exception as e:
            print(f"Stream error for {file_info['path']}: {e}")
            yield self._fallback_file_content(file_info)

    # ────────────────────── Private Helpers ──────────────────────

    def _heuristic_classify(self, prompt: str) -> dict:
        """Rule-based fallback classifier."""
        lower = prompt.lower()
        multi_signals = [
            "app", "application", "website", "web app", "project",
            "full-stack", "fullstack", "frontend", "backend",
            "rest api", "crud", "dashboard", "landing page",
            "multiple files", "multi-file", "multi file",
            "with tests", "with database", "with auth",
            "with components", "with modules", "with routes",
            "react", "flask", "django", "fastapi", "express",
            "next.js", "nextjs", "vue", "angular", "svelte",
            "todo app", "todo application", "chat app", "chat application",
            "e-commerce", "ecommerce", "blog", "portfolio",
            "social media", "inventory", "management system",
            "login", "signup", "authentication"
        ]
        for signal in multi_signals:
            if signal in lower:
                return {"mode": "multi", "reason": f"detected '{signal}' in prompt"}
        return {"mode": "single"}

    def _detect_language(self, path: str) -> str:
        """Detect language from file extension."""
        ext_map = {
            ".py": "python", ".js": "javascript", ".jsx": "javascript",
            ".ts": "typescript", ".tsx": "typescript",
            ".html": "html", ".css": "css", ".scss": "scss",
            ".json": "json", ".yaml": "yaml", ".yml": "yaml",
            ".md": "markdown", ".txt": "text",
            ".sql": "sql", ".sh": "bash", ".bat": "batch",
            ".env": "text", ".toml": "toml", ".cfg": "ini",
            ".dockerfile": "dockerfile",
        }
        for ext, lang in ext_map.items():
            if path.lower().endswith(ext):
                return lang
        if path.lower() == "dockerfile":
            return "dockerfile"
        return "text"

    def _fallback_plan(self, prompt: str) -> dict:
        """Basic project plan when API is unavailable."""
        return {
            "project_name": "generated-project",
            "description": prompt[:100],
            "files": [
                {"path": "README.md", "purpose": "Project documentation", "language": "markdown"},
                {"path": "requirements.txt", "purpose": "Dependencies", "language": "text"},
                {"path": "main.py", "purpose": "Application entry point", "language": "python"},
                {"path": "utils.py", "purpose": "Helper utilities", "language": "python"},
            ]
        }

    def _fallback_file_content(self, file_info: dict) -> str:
        """Minimal fallback content for a file."""
        path = file_info["path"]
        purpose = file_info.get("purpose", "")
        if path.endswith(".md"):
            return f"# {purpose or 'Project'}\n\nGenerated project.\n"
        if path == "requirements.txt":
            return "# Add your dependencies here\n"
        if path.endswith(".py"):
            return f'# {path}\n# {purpose}\n\ndef main():\n    """Entry point."""\n    pass\n\nif __name__ == "__main__":\n    main()\n'
        return f"// {path}\n// {purpose}\n"

    @staticmethod
    def _strip_markdown_fences(text: str) -> str:
        """Remove ```lang ... ``` wrappers from LLM output."""
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.split("\n")
            # Remove first line (```lang)
            lines = lines[1:]
            # Remove last line if it's just ```
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            return "\n".join(lines)
        return stripped
