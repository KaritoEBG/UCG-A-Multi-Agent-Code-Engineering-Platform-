import React, { useState } from 'react';
import { Terminal, CheckCircle, Activity, Shield, ChevronRight } from 'lucide-react';
import ScrollReveal, { StaggerContainer, StaggerItem } from './ScrollReveal';
import './AgentPipeline.css';

const AgentPipeline = () => {
  const [activeAgent, setActiveAgent] = useState(0);

  // Optional: Auto-cycle through agents for demo purposes
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setActiveAgent((prev) => (prev + 1) % 4);
  //   }, 5000);
  //   return () => clearInterval(timer);
  // }, []);

  const agents = [
    { id: 0, title: 'Code Generator', icon: <Terminal size={20} />, subtext: 'Synthesizing architectural patterns' },
    { id: 1, title: 'Validator Agent', icon: <CheckCircle size={20} />, subtext: 'Heuristic syntax analysis' },
    { id: 2, title: 'Testing Agent', icon: <Activity size={20} />, subtext: 'Automated unit & integration coverage' },
    { id: 3, title: 'Security Agent', icon: <Shield size={20} />, subtext: 'Vulnerability & dependency scanning' }
  ];

  const renderTerminalContent = () => {
    switch (activeAgent) {
      case 0:
        return (
          <div className="ap-gen-view">
            <div className="ap-gen-loading">
              <span className="ap-spinner">⟳</span> Analyzing prompt: "Create FastAPI Auth"... generating code blocks...
            </div>
            <div className="ap-code-block ap-typing-cursor">
              <div><span className="c-blue">from</span> fastapi <span className="c-blue">import</span> FastAPI, Depends</div>
              <div><span className="c-blue">from</span> pydantic <span className="c-blue">import</span> BaseModel</div>
              <br/>
              <div>app = FastAPI()</div>
              <br/>
              <div><span className="c-blue">class</span> <span className="c-yellow">LoginRequest</span>(BaseModel):</div>
              <div>    username: <span className="c-green">str</span></div>
              <div>    password: <span className="c-green">str</span></div>
              <br/>
              <div><span className="c-blue">@app</span>.<span className="c-purple">post</span>(<span className="c-green">"/auth/login"</span>)</div>
              <div><span className="c-blue">async def</span> login(req: LoginRequest):</div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="ap-diff-container">
            <div className="ap-diff-box ap-diff-left">
              <div className="ap-diff-header">{"// Previous Draft"}</div>
              <div><span className="c-blue">def</span> get_user(id):</div>
              <div className="ap-line-del">  # fetch user</div>
              <div className="ap-line-del">  return db.query("select * from users where id="+id)</div>
            </div>
            <div className="ap-diff-box ap-diff-right">
              <div className="ap-diff-header">{"// Validated, Clean Code"}</div>
              <div><span className="c-blue">async def</span> get_user_async(user_id: UUID) -&gt; UserSchema:</div>
              <div className="ap-line-add">  """Fetches user context from secure cache"""</div>
              <div className="ap-line-add">  return await db.users.find_one({"{id: user_id}"})</div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="ap-test-container">
            <div className="ap-test-item">
              <div className="ap-test-top">
                <span className="ap-test-name">auth_test.py</span>
                <span className="ap-pill-pass">PASS</span>
              </div>
              <div className="ap-progress-bg">
                <div className="ap-progress-fill" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="ap-test-item">
              <div className="ap-test-top">
                <span className="ap-test-name">db_test.js</span>
                <span className="ap-pill-pass">PASS</span>
              </div>
              <div className="ap-progress-bg">
                <div className="ap-progress-fill" style={{ width: '100%', transitionDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="ap-secure-container">
            <Shield size={64} className="ap-shield-icon" />
            <h3 className="ap-secure-title">No Vulnerabilities Detected</h3>
            <p className="ap-secure-sub">Status: Secure Complete</p>
          </div>
        );
      default:
        return null;
    }
  };

  const steps = [
    { label: 'Input', index: -1 },
    { label: 'Generate', index: 0 },
    { label: 'Validate', index: 1 },
    { label: 'Test', index: 2 },
    { label: 'Secure', index: 3 },
    { label: 'Output', index: 4 }
  ];

  const getAgentProgrammaticName = () => {
    switch(activeAgent) {
      case 0: return '>_ generator.agent';
      case 1: return '>_ validator.agent';
      case 2: return '>_ testing.agent';
      case 3: return '>_ security.agent';
      default: return '>_ system';
    }
  };

  return (
    <section id="pipeline" className="agent-pipeline-section">
      <ScrollReveal direction="fadeUp">
        <div className="ap-header">
          <h2 className="ap-title">The Agent Pipeline</h2>
          <p className="ap-subtitle">See how our specialized agents orchestrate your code lifecycle</p>
        </div>
      </ScrollReveal>

      <div className="ap-container">
        {/* Left Column: Navigation Tabs */}
        <StaggerContainer staggerDelay={0.1} className="ap-tabs">
          {agents.map((agent) => (
            <StaggerItem key={agent.id} direction="fadeRight">
              <button
                className={`ap-tab-btn ${activeAgent === agent.id ? 'active' : 'inactive'}`}
                onClick={() => setActiveAgent(agent.id)}
              >
                <div className="ap-tab-icon">{agent.icon}</div>
                <div className="ap-tab-text">
                  <h4>{agent.title}</h4>
                  {activeAgent === agent.id && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{agent.subtext}</span>}
                </div>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Right Column: Dynamic Terminal Display */}
        <ScrollReveal direction="fadeLeft" className="ap-terminal">
          <div className="ap-terminal-header">
            <div className="ap-dots">
              <span className="ap-dot red"></span>
              <span className="ap-dot yellow"></span>
              <span className="ap-dot green"></span>
            </div>
            <div className="ap-term-title">{getAgentProgrammaticName()}</div>
            <div className="ap-header-spacer"></div>
          </div>
          
          <div className="ap-terminal-content">
            {renderTerminalContent()}
          </div>

          {/* Bottom Stepper */}
          <div className="ap-stepper">
            {steps.map((step, i) => {
              const isActive = step.index === activeAgent;
              const isCompleted = step.index < activeAgent && step.index >= 0;
              
              let stepClass = "ap-step";
              if (isActive) stepClass += " active";
              if (isCompleted) stepClass += " completed";

              return (
                <React.Fragment key={step.label}>
                  <div className={stepClass}>
                    {step.index >= 0 && <span className="ap-step-num">{step.index + 1}.</span>}
                    <span>{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <span className="ap-step-separator">
                      <ChevronRight size={14} />
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AgentPipeline;
