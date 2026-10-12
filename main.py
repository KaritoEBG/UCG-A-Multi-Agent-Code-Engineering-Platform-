# Entry point for Uber Code Generator API with Streaming & Generative UI - FastAPI Version
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
import json
import time
import re
import os

from config import settings, key_pool
from database import connect_to_mongo, close_mongo_connection, SessionDB, MessageDB
from auth import router as auth_router, get_current_user, get_optional_user
from orchestrator import Orchestrator
from agui_protocol import (
    AGUIBuilder, AGUIEventBuilder, UIEventType, AgentPhase, Severity,
    FixCardSpec, WorkflowStepSpec, create_fix_spec
)


# Lifespan for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


# FastAPI app
app = FastAPI(
    title="Uber Code Generator API",
    description="AI-powered code generation with multi-agent validation",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware - use ALLOWED_ORIGINS env var in production
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth_router)


# Pydantic Schemas (Request/Response models with automatic validation)
class GenerateRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    api_key: Optional[str] = None
    context_code: Optional[str] = None  # Previous code for follow-up prompts


class EditRequest(BaseModel):
    original_code: str
    updates: List[dict] = []


class RegenerateRequest(BaseModel):
    original_prompt: str = ""
    edit_instructions: str
    current_code: str = ""
    api_key: Optional[str] = None


class SessionResponse(BaseModel):
    session_id: str
    created_at: str


class HealthResponse(BaseModel):
    status: str
    message: str


# API Routes
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Uber Code Generator API (FastAPI + MongoDB)"}


@app.get("/api/key-pool/status")
async def key_pool_status():
    """Monitor API key pool health"""
    return key_pool.get_status()

@app.post("/api/generate")
async def generate_code(request: GenerateRequest, user: Optional[dict] = Depends(get_optional_user)):
    """Generate code from a prompt (non-streaming)"""
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    # Use API key from request or get a rotated key from the pool
    from config import key_pool
    api_key = request.api_key or key_pool.get_key()
    orchestrator = Orchestrator(api_key)
    result = orchestrator.run_workflow(request.prompt)
    
    # Save to session if provided
    if request.session_id:
        try:
            await MessageDB.add_message(
                session_id=request.session_id,
                role='user',
                content=request.prompt
            )
            await MessageDB.add_message(
                session_id=request.session_id,
                role='assistant',
                content="Code generated",
                code_output=result.get('code'),
                workflow_data=result.get('workflow')
            )
        except Exception as e:
            print(f"Session save error: {e}")
    
    return result


@app.post("/api/generate/stream")
async def generate_code_stream(request: GenerateRequest):
    """Streaming endpoint with Generative UI - Real-time agent-generated interface components"""
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    orchestrator = Orchestrator(request.api_key)
    
    # Build enhanced prompt with context if previous code exists
    enhanced_prompt = request.prompt
    if request.context_code:
        enhanced_prompt = f"""Previous code that was generated:
```
{request.context_code}
```

User's follow-up request: {request.prompt}

Please modify or rewrite the above code according to the user's request."""
    
    async def generate():
        full_code = ""
        current_code = ""
        original_code = ""
        all_fixes = []
        workflow_steps = [
            {"id": "code_gen", "name": "Code Generator", "icon": "⚡", "status": "pending"},
            {"id": "validator", "name": "Validator", "icon": "✓", "status": "pending"},
            {"id": "testing", "name": "Testing", "icon": "🧪", "status": "pending"},
            {"id": "security", "name": "Security", "icon": "🛡️", "status": "pending"}
        ]
        start_time = time.time()
        
        # ===== PLANNER PHASE (runs silently in background) =====
        # Classify prompt as single-file or multi-file
        code_mode = orchestrator.classify_prompt(enhanced_prompt)
        print(f"📋 Prompt classified as: {code_mode}")
        yield f"data: {json.dumps({'type': 'classification', 'mode': code_mode})}\n\n"
        
        # Enhance the prompt for multi-file projects
        generation_prompt = orchestrator.enhance_prompt(enhanced_prompt, mode=code_mode)
        
        # ===== CODE GENERATOR PHASE =====
        workflow_steps[0]["status"] = "active"
        agent_start = AGUIEventBuilder.agent_start(
            agent_id="code_generator",
            agent_name="Code Generator",
            message="🚀 Generating code from your prompt..."
        )
        yield agent_start.to_sse()
        
        # Stream workflow update
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        gen_start = time.time()
        line_count = 0
        
        fence_stripped = False  # Track if we already stripped opening fence
        
        # Use the enhanced prompt for code generation
        for chunk in orchestrator.generate_code_stream(generation_prompt, mode=code_mode):
            full_code += chunk
            
            # Strip opening markdown fence from very first chunk (e.g. ```python\n)
            if not fence_stripped:
                import re
                full_code = re.sub(r'^```\w*\n', '', full_code)
                fence_stripped = True
                # Recalculate chunk to send only the cleaned content
                chunk = full_code
            
            line_count = len(full_code.splitlines())
            
            # Send chunk with UI metadata
            chunk_event = {
                'type': 'stream_chunk',
                'source': 'code_generator',
                'payload': {
                    'content': chunk,
                    'totalLines': line_count,
                    'totalChars': len(full_code)
                }
            }
            yield f"data: {json.dumps(chunk_event)}\n\n"
        
        # Strip trailing ``` fence if present
        if full_code.rstrip().endswith('```'):
            full_code = full_code.rstrip()
            full_code = full_code[:full_code.rfind('```')].rstrip()
        
        gen_duration = time.time() - gen_start
        original_code = full_code
        current_code = full_code
        
        # Strip markdown fences if LLM included them (e.g. ```python ... ```)
        code_lines = current_code.split('\n')
        if code_lines and re.match(r'^```\w*$', code_lines[0].strip()):
            code_lines = code_lines[1:]
        if code_lines and code_lines[-1].strip() == '```':
            code_lines = code_lines[:-1]
        current_code = '\n'.join(code_lines)
        original_code = current_code
        
        # Code generator complete
        workflow_steps[0]["status"] = "complete"
        workflow_steps[0]["duration"] = round(gen_duration, 2)
        
        gen_complete = AGUIEventBuilder.agent_complete(
            agent_id="code_generator",
            agent_name="Code Generator",
            message=f"Generated {line_count} lines of code",
            stats={"lines": line_count, "chars": len(full_code), "duration": round(gen_duration, 2)}
        )
        yield gen_complete.to_sse()
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        # ===== VALIDATOR PHASE =====
        workflow_steps[1]["status"] = "active"
        val_start = time.time()
        
        val_start_event = AGUIEventBuilder.agent_start(
            agent_id="validator",
            agent_name="Validator",
            message="✅ Analyzing code quality and style..."
        )
        yield val_start_event.to_sse()
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        # Progress updates
        yield AGUIEventBuilder.agent_progress(
            agent_id="validator",
            agent_name="Validator",
            message="Checking syntax and style...",
            progress=30,
            phase=AgentPhase.ANALYZING
        ).to_sse()
        
        validation = orchestrator.validate_code(current_code)
        val_duration = time.time() - val_start
        
        # Process fixes with rich UI specs
        val_fixes = []
        if validation.get('fixed_code') and validation.get('fixes_applied'):
            fixed = validation['fixed_code']
            # Strip markdown fences from agent output
            fl = fixed.split('\n')
            if fl and re.match(r'^```\w*$', fl[0].strip()): fl = fl[1:]
            if fl and fl[-1].strip() == '```': fl = fl[:-1]
            current_code = '\n'.join(fl)
            for fix in validation['fixes_applied']:
                if isinstance(fix, dict):
                    fix_spec = create_fix_spec(
                        agent="Validator",
                        description=fix.get('description', str(fix)),
                        severity=fix.get('severity', 'medium'),
                        before=fix.get('before'),
                        after=fix.get('after'),
                        line=fix.get('line'),
                        category="Code Quality"
                    )
                else:
                    fix_spec = create_fix_spec(
                        agent="Validator",
                        description=str(fix),
                        severity="medium"
                    )
                val_fixes.append(fix_spec)
            
            all_fixes.append({'agent': 'Validator', 'fixes': validation['fixes_applied']})
            
            # Send code update with UI components
            code_update = {
                'type': 'code_update',
                'source': 'validator',
                'payload': {
                    'code': current_code,
                    'fixCount': len(val_fixes),
                    'fixes': [f.model_dump() for f in val_fixes],
                    'ui': {
                        'type': 'fix_summary',
                        'agent': 'Validator',
                        'icon': '✓',
                        'totalFixes': len(val_fixes),
                        'fixes': [{'description': f.description, 'severity': f.severity} for f in val_fixes]
                    }
                }
            }
            yield f"data: {json.dumps(code_update)}\n\n"
        
        workflow_steps[1]["status"] = "complete"
        workflow_steps[1]["duration"] = round(val_duration, 2)
        
        # Rich result event with UI components
        val_result = {
            'type': 'agent_result',
            'source': 'validator',
            'payload': {
                'agentName': 'Validator',
                'icon': '✓',
                'phase': 'complete',
                'data': validation,
                'fixes': [f.model_dump() for f in val_fixes],
                'stats': {
                    'issuesFound': len(validation.get('issues', [])),
                    'fixesApplied': len(val_fixes),
                    'duration': round(val_duration, 2)
                },
                'ui': AGUIBuilder.agent_card(
                    agent_name="Validator",
                    icon="✓",
                    phase=AgentPhase.COMPLETE,
                    message=f"{len(val_fixes)} fixes applied" if val_fixes else "Code quality verified",
                    fixes=val_fixes,
                    stats=validation.get('stats')
                ).model_dump()
            }
        }
        yield f"data: {json.dumps(val_result)}\n\n"
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        # ===== TESTING PHASE =====
        workflow_steps[2]["status"] = "active"
        test_start = time.time()
        
        test_start_event = AGUIEventBuilder.agent_start(
            agent_id="testing",
            agent_name="Testing Agent",
            message="🧪 Analyzing testability & error handling..."
        )
        yield test_start_event.to_sse()
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        yield AGUIEventBuilder.agent_progress(
            agent_id="testing",
            agent_name="Testing Agent",
            message="Checking error handling patterns...",
            progress=50,
            phase=AgentPhase.ANALYZING
        ).to_sse()
        
        tests = orchestrator.test_code(current_code)
        test_duration = time.time() - test_start
        
        test_fixes = []
        if tests.get('fixed_code') and tests.get('fixes_applied'):
            fixed = tests['fixed_code']
            # Strip markdown fences from agent output
            fl = fixed.split('\n')
            if fl and re.match(r'^```\w*$', fl[0].strip()): fl = fl[1:]
            if fl and fl[-1].strip() == '```': fl = fl[:-1]
            current_code = '\n'.join(fl)
            for fix in tests['fixes_applied']:
                if isinstance(fix, dict):
                    fix_spec = create_fix_spec(
                        agent="Testing",
                        description=fix.get('description', str(fix)),
                        severity=fix.get('severity', 'medium'),
                        before=fix.get('before'),
                        after=fix.get('after'),
                        line=fix.get('line'),
                        category="Error Handling"
                    )
                else:
                    fix_spec = create_fix_spec(
                        agent="Testing",
                        description=str(fix),
                        severity="medium"
                    )
                test_fixes.append(fix_spec)
            
            all_fixes.append({'agent': 'Testing', 'fixes': tests['fixes_applied']})
            
            code_update = {
                'type': 'code_update',
                'source': 'testing',
                'payload': {
                    'code': current_code,
                    'fixCount': len(test_fixes),
                    'fixes': [f.model_dump() for f in test_fixes],
                    'ui': {
                        'type': 'fix_summary',
                        'agent': 'Testing',
                        'icon': '🧪',
                        'totalFixes': len(test_fixes),
                        'fixes': [{'description': f.description, 'severity': f.severity} for f in test_fixes]
                    }
                }
            }
            yield f"data: {json.dumps(code_update)}\n\n"
        
        workflow_steps[2]["status"] = "complete"
        workflow_steps[2]["duration"] = round(test_duration, 2)
        
        test_result = {
            'type': 'agent_result',
            'source': 'testing',
            'payload': {
                'agentName': 'Testing Agent',
                'icon': '🧪',
                'phase': 'complete',
                'data': tests,
                'fixes': [f.model_dump() for f in test_fixes],
                'stats': {
                    'testabilityScore': tests.get('testability_score', 'N/A'),
                    'fixesApplied': len(test_fixes),
                    'duration': round(test_duration, 2)
                },
                'ui': AGUIBuilder.agent_card(
                    agent_name="Testing Agent",
                    icon="🧪",
                    phase=AgentPhase.COMPLETE,
                    message=f"{len(test_fixes)} improvements applied" if test_fixes else "Error handling adequate",
                    fixes=test_fixes,
                    stats={'testabilityScore': tests.get('testability_score')}
                ).model_dump()
            }
        }
        yield f"data: {json.dumps(test_result)}\n\n"
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        # ===== SECURITY PHASE =====
        workflow_steps[3]["status"] = "active"
        sec_start = time.time()
        
        sec_start_event = AGUIEventBuilder.agent_start(
            agent_id="security",
            agent_name="Security Agent",
            message="🛡️ Scanning for vulnerabilities..."
        )
        yield sec_start_event.to_sse()
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        yield AGUIEventBuilder.agent_progress(
            agent_id="security",
            agent_name="Security Agent",
            message="Running security audit...",
            progress=70,
            phase=AgentPhase.ANALYZING
        ).to_sse()
        
        security = orchestrator.secure_code(current_code)
        sec_duration = time.time() - sec_start
        
        sec_fixes = []
        if security.get('fixed_code') and security.get('fixes_applied'):
            fixed = security['fixed_code']
            # Strip markdown fences from agent output
            fl = fixed.split('\n')
            if fl and re.match(r'^```\w*$', fl[0].strip()): fl = fl[1:]
            if fl and fl[-1].strip() == '```': fl = fl[:-1]
            current_code = '\n'.join(fl)
            for fix in security['fixes_applied']:
                if isinstance(fix, dict):
                    fix_spec = create_fix_spec(
                        agent="Security",
                        description=fix.get('description', str(fix)),
                        severity=fix.get('severity', 'high'),
                        before=fix.get('before'),
                        after=fix.get('after'),
                        line=fix.get('line'),
                        category="Security"
                    )
                else:
                    fix_spec = create_fix_spec(
                        agent="Security",
                        description=str(fix),
                        severity="high"
                    )
                sec_fixes.append(fix_spec)
            
            all_fixes.append({'agent': 'Security', 'fixes': security['fixes_applied']})
            
            code_update = {
                'type': 'code_update',
                'source': 'security',
                'payload': {
                    'code': current_code,
                    'fixCount': len(sec_fixes),
                    'fixes': [f.model_dump() for f in sec_fixes],
                    'ui': {
                        'type': 'fix_summary',
                        'agent': 'Security',
                        'icon': '🛡️',
                        'totalFixes': len(sec_fixes),
                        'severity': security.get('risk_level', 'LOW'),
                        'fixes': [{'description': f.description, 'severity': f.severity} for f in sec_fixes]
                    }
                }
            }
            yield f"data: {json.dumps(code_update)}\n\n"
        
        workflow_steps[3]["status"] = "complete"
        workflow_steps[3]["duration"] = round(sec_duration, 2)
        
        sec_result = {
            'type': 'agent_result',
            'source': 'security',
            'payload': {
                'agentName': 'Security Agent',
                'icon': '🛡️',
                'phase': 'complete',
                'data': security,
                'fixes': [f.model_dump() for f in sec_fixes],
                'stats': {
                    'riskLevel': security.get('risk_level', 'LOW'),
                    'vulnerabilities': len(security.get('vulnerabilities', [])),
                    'fixesApplied': len(sec_fixes),
                    'duration': round(sec_duration, 2)
                },
                'ui': AGUIBuilder.agent_card(
                    agent_name="Security Agent",
                    icon="🛡️",
                    phase=AgentPhase.COMPLETE,
                    message=f"{len(sec_fixes)} security fixes applied" if sec_fixes else "Code is secure",
                    fixes=sec_fixes,
                    stats={'riskLevel': security.get('risk_level')}
                ).model_dump()
            }
        }
        yield f"data: {json.dumps(sec_result)}\n\n"
        yield f"data: {json.dumps({'type': 'workflow_update', 'steps': workflow_steps})}\n\n"
        
        # ===== SETUP INSTRUCTIONS (for multi-file projects) =====
        setup_guide = orchestrator.generate_setup_instructions(current_code)
        if setup_guide:
            yield f"data: {json.dumps({'type': 'setup_guide', 'data': setup_guide})}\n\n"
        
        # ===== FINAL RESULT =====
        total_duration = time.time() - start_time
        total_fixes = sum(len(f['fixes']) for f in all_fixes)
        code_was_fixed = current_code != original_code
        
        # ===== PROJECT DESCRIPTION (for chat cards) =====
        project_desc = orchestrator.generate_project_description(
            code=current_code, 
            original_code=original_code if code_was_fixed else None,
            prompt=request.prompt
        )
        if project_desc:
            yield f"data: {json.dumps({'type': 'project_description', 'data': project_desc})}\n\n"
            
        # Build comprehensive UI for final result
        final_ui_components = []
        
        # Summary stats grid
        final_ui_components.append(AGUIBuilder.grid([
            AGUIBuilder.stat_card("Total Lines", line_count, "📝"),
            AGUIBuilder.stat_card("Fixes Applied", total_fixes, "🔧"),
            AGUIBuilder.stat_card("Duration", f"{round(total_duration, 1)}s", "⏱️"),
            AGUIBuilder.stat_card("Agents Run", 4, "🤖")
        ], columns=4).model_dump())
        
        # If code was fixed, add diff component
        if code_was_fixed:
            final_ui_components.append(AGUIBuilder.code_diff(
                before=original_code,
                after=current_code,
                title="All Changes Applied"
            ).model_dump())
        
        final_data = {
            'type': 'complete',
            'payload': {
                'code': current_code,
                'original_code': original_code if code_was_fixed else None,
                'prompt': request.prompt,
                'all_fixes': all_fixes,
                'setup_guide': setup_guide,
                'project_desc': project_desc,
                'total_fixes': total_fixes,
                'code_was_fixed': code_was_fixed,
                'workflow': workflow_steps,
                'stats': {
                    'totalDuration': round(total_duration, 2),
                    'totalLines': line_count,
                    'totalFixes': total_fixes
                },
                'validation': validation,
                'tests': tests,
                'security': security,
                'ui': {
                    'type': 'completion_summary',
                    'components': final_ui_components,
                    'message': f"✨ Generation complete! {total_fixes} fixes applied in {round(total_duration, 1)}s"
                }
            }
        }
        yield f"data: {json.dumps(final_data)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/edit")
async def edit_code(request: EditRequest):
    """Edit existing code and re-run agents"""
    if not request.original_code:
        raise HTTPException(status_code=400, detail="Original code is required")
    
    updated_code = request.original_code
    for update in request.updates:
        old = update.get('old', '')
        new = update.get('new', '')
        if old:
            updated_code = updated_code.replace(old, new)
    
    orchestrator = Orchestrator()
    result = orchestrator.run_agents_on_code(updated_code)
    
    return {"updated_code": updated_code, **result}


@app.post("/api/regenerate")
async def regenerate_with_edit(request: RegenerateRequest):
    """Regenerate code with edited prompt"""
    if not request.edit_instructions:
        raise HTTPException(status_code=400, detail="Edit instructions required")
    
    new_prompt = f"""Original request: {request.original_prompt}

Current code:
```
{request.current_code}
```

Please modify the code based on these instructions: {request.edit_instructions}

Only make the requested changes, keep the rest of the code intact."""
    
    orchestrator = Orchestrator(request.api_key)
    result = orchestrator.run_workflow(new_prompt)
    
    return result


@app.post("/api/regenerate/stream")
async def regenerate_stream(request: RegenerateRequest):
    """Streaming regeneration with edited prompt"""
    new_prompt = f"""Original request: {request.original_prompt}

Current code:
```
{request.current_code}
```

Modify based on: {request.edit_instructions}
Only make requested changes."""
    
    orchestrator = Orchestrator(request.api_key)
    
    async def generate():
        full_code = ""
        yield f"data: {json.dumps({'type': 'start', 'agent': 'Code Generator'})}\n\n"
        
        for chunk in orchestrator.generate_code_stream(new_prompt):
            full_code += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        
        yield f"data: {json.dumps({'type': 'agent_complete', 'agent': 'Code Generator'})}\n\n"
        
        yield f"data: {json.dumps({'type': 'start', 'agent': 'Validator'})}\n\n"
        validation = orchestrator.validate_code(full_code)
        yield f"data: {json.dumps({'type': 'result', 'agent': 'Validator', 'data': validation})}\n\n"
        
        yield f"data: {json.dumps({'type': 'start', 'agent': 'Testing'})}\n\n"
        tests = orchestrator.test_code(full_code)
        yield f"data: {json.dumps({'type': 'result', 'agent': 'Testing', 'data': tests})}\n\n"
        
        yield f"data: {json.dumps({'type': 'start', 'agent': 'Security'})}\n\n"
        security = orchestrator.secure_code(full_code)
        yield f"data: {json.dumps({'type': 'result', 'agent': 'Security', 'data': security})}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete', 'code': full_code, 'prompt': request.edit_instructions})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


# ============== Session Management (MongoDB) ==============

@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(user: dict = Depends(get_current_user)):
    """Create a new chat session (requires authentication)"""
    session = await SessionDB.create_session(user_id=user["_id"])
    return {"session_id": session["_id"], "created_at": session["created_at"].isoformat()}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    """Get a specific chat session with messages"""
    session = await SessionDB.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check ownership
    if session["user_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await MessageDB.get_session_messages(session_id)
    
    return {
        "session_id": session["_id"],
        "title": session.get("title", "New Chat"),
        "project_name": session.get("project_name", ""),
        "created_at": session["created_at"].isoformat(),
        "messages": [{
            "id": msg["_id"],
            "role": msg["role"],
            "content": msg["content"],
            "code_output": msg.get("code_output"),
            "workflow_data": msg.get("workflow_data"),
            "created_at": msg["created_at"].isoformat()
        } for msg in messages]
    }


@app.get("/api/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    """List user's chat sessions"""
    sessions = await SessionDB.get_user_sessions(user["_id"])
    return [{
        "session_id": s["_id"],
        "title": s.get("title", "New Chat"),
        "created_at": s["created_at"].isoformat(),
        "updated_at": s["updated_at"].isoformat(),
        "message_count": s.get("message_count", 0)
    } for s in sessions]


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """Delete a chat session"""
    session = await SessionDB.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await SessionDB.delete_session(session_id)
    return {"message": "Session deleted"}


class AddMessageRequest(BaseModel):
    role: str
    content: str
    code_output: Optional[str] = None
    workflow_data: Optional[dict] = None


@app.post("/api/sessions/{session_id}/messages")
async def add_message_to_session(
    session_id: str, 
    request: AddMessageRequest,
    user: dict = Depends(get_current_user)
):
    """Add a message to a session and auto-generate title if first user message"""
    session = await SessionDB.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Add the message
    message = await MessageDB.add_message(
        session_id=session_id,
        role=request.role,
        content=request.content,
        code_output=request.code_output,
        workflow_data=request.workflow_data
    )
    
    # Auto-generate title on first user message if title is still "New Chat"
    if request.role == "user" and session.get("title") == "New Chat":
        # Get message count
        messages = await MessageDB.get_session_messages(session_id)
        user_messages = [m for m in messages if m["role"] == "user"]
        
        if len(user_messages) == 1:  # First user message
            title = await SessionDB.generate_title_from_chat(request.content)
            await SessionDB.update_session_title(session_id, title)
            return {
                "message_id": message["_id"],
                "new_title": title
            }
    
    return {"message_id": message["_id"]}


@app.patch("/api/sessions/{session_id}/title")
async def update_session_title_endpoint(
    session_id: str,
    title: str,
    user: dict = Depends(get_current_user)
):
    """Manually update session title"""
    session = await SessionDB.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await SessionDB.update_session_title(session_id, title)
    return {"message": "Title updated", "title": title}


class ProjectNameUpdateRequest(BaseModel):
    project_name: str


@app.patch("/api/sessions/{session_id}/project-name")
async def update_session_project_name_endpoint(
    session_id: str,
    request: ProjectNameUpdateRequest,
    user: dict = Depends(get_current_user)
):
    """Save the AI-generated project base name to a session"""
    session = await SessionDB.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["user_id"] != user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    await SessionDB.update_session_project_name(session_id, request.project_name)
    return {"message": "Project name updated", "project_name": request.project_name}


class BulkDeleteRequest(BaseModel):
    session_ids: List[str]


@app.post("/api/sessions/bulk-delete")
async def bulk_delete_sessions(
    request: BulkDeleteRequest,
    user: dict = Depends(get_current_user)
):
    """Delete multiple sessions at once"""
    deleted_count = 0
    
    for session_id in request.session_ids:
        try:
            session = await SessionDB.get_session(session_id)
            if session and session["user_id"] == user["_id"]:
                await SessionDB.delete_session(session_id)
                deleted_count += 1
        except Exception as e:
            print(f"Error deleting session {session_id}: {e}")
            continue
    
    return {"message": f"Deleted {deleted_count} sessions", "deleted_count": deleted_count}


@app.post("/api/sessions/cleanup-empty")
async def cleanup_empty_sessions(user: dict = Depends(get_current_user)):
    """Delete all sessions with 0 messages"""
    sessions = await SessionDB.get_user_sessions(user["_id"], limit=100)
    deleted_count = 0
    
    for session in sessions:
        if session.get("message_count", 0) == 0:
            try:
                await SessionDB.delete_session(session["_id"])
                deleted_count += 1
            except Exception as e:
                print(f"Error cleaning up session {session['_id']}: {e}")
    
    return {"message": f"Cleaned up {deleted_count} empty sessions", "deleted_count": deleted_count}

class ProjectNameRequest(BaseModel):
    prompt: str


@app.post("/api/generate-project-name")
async def generate_project_name(request: ProjectNameRequest):
    """Generate a compact, kebab-case project name from a user prompt using AI"""
    import httpx

    prompt_text = request.prompt.strip()
    if not prompt_text:
        return {"project_name": "generated-code"}

    try:
        timeout = httpx.Timeout(connect=10.0, read=15.0, write=10.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Retry up to 3 times with different API keys
            for attempt in range(3):
                try:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {key_pool.get_key()}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": (
                                        "Generate a very short project name (2-3 words max) in kebab-case (lowercase, hyphen-separated) "
                                        "for a coding project based on the user's request. "
                                        "Examples: 'api-retry-handler', 'auth-system', 'rate-limiter', 'todo-app', 'db-pool-manager'. "
                                        "Return ONLY the kebab-case name, nothing else. No quotes, no explanation."
                                    )
                                },
                                {
                                    "role": "user",
                                    "content": f"User's request: {prompt_text[:500]}"
                                }
                            ],
                            "temperature": 0.3,
                            "max_tokens": 20
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    name = data["choices"][0]["message"]["content"].strip().strip('"').strip("'").strip()
                    # Sanitize: ensure kebab-case, no special chars
                    name = re.sub(r'[^a-z0-9\-]', '', name.lower().replace(' ', '-'))
                    name = re.sub(r'-+', '-', name).strip('-')
                    if name:
                        return {"project_name": name[:40]}
                    break
                except (httpx.ConnectTimeout, httpx.ReadTimeout, httpx.ConnectError) as timeout_err:
                    print(f"⚠️ Project name gen attempt {attempt+1}/3 failed: {type(timeout_err).__name__}")
                    if attempt == 2:
                        raise
    except Exception as e:
        print(f"Error generating project name ({type(e).__name__}): {repr(e)}")

    # Fallback: extract keywords
    words = re.sub(r'[^a-z0-9\s]', '', prompt_text.lower()).split()
    stop = {'a','an','the','and','or','to','for','of','with','in','on','is','create','build','write','generate','make','using','use','code','function','class','please'}
    keywords = [w for w in words if w not in stop and len(w) > 1][:3]
    return {"project_name": "-".join(keywords) if keywords else "generated-code"}


# Run with: python main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
