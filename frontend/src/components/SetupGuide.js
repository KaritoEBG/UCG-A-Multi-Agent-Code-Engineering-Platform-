import React, { useState } from 'react';
import './SetupGuide.css';

/* ========== Copyable Command Block ========== */
const CommandBlock = ({ command, description }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = command;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="sg-command-block">
      <div className="sg-command-row">
        <code className="sg-command-text">{command}</code>
        <button className="sg-copy-btn" onClick={handleCopy} title="Copy command">
          {copied ? '✓' : '📋'}
        </button>
      </div>
      {description && <span className="sg-command-desc">{description}</span>}
    </div>
  );
};

/* ========== Collapsible Section ========== */
const Section = ({ icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);

  if (!children) return null;

  return (
    <div className={`sg-section ${open ? 'open' : ''}`}>
      <button className="sg-section-header" onClick={() => setOpen(!open)}>
        <span className="sg-section-icon">{icon}</span>
        <span className="sg-section-title">{title}</span>
        <span className={`sg-chevron ${open ? 'open' : ''}`}>▶</span>
      </button>
      {open && <div className="sg-section-body">{children}</div>}
    </div>
  );
};

/* ========== Main SetupGuide Component ========== */
const SetupGuide = ({ data }) => {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  const {
    project_structure,
    prerequisites,
    installation_steps,
    env_setup,
    database_setup,
    run_commands,
    how_it_works,
    troubleshooting,
    vscode_tips
  } = data;

  const devCommands = run_commands?.filter(c => c.type === 'dev') || [];
  const prodCommands = run_commands?.filter(c => c.type === 'prod') || [];
  const otherCommands = run_commands?.filter(c => c.type !== 'dev' && c.type !== 'prod') || [];

  return (
    <div className="setup-guide">
      <button className="sg-toggle" onClick={() => setExpanded(!expanded)}>
        <span className="sg-toggle-icon">🚀</span>
        <span className="sg-toggle-text">How to Run This Project</span>
        <span className={`sg-toggle-chevron ${expanded ? 'open' : ''}`}>▶</span>
      </button>

      {expanded && (
        <div className="sg-content">
          {/* Project Structure */}
          {project_structure && (
            <Section icon="📁" title="Project Structure" defaultOpen={false}>
              <pre className="sg-tree">{project_structure}</pre>
            </Section>
          )}

          {/* Prerequisites */}
          {prerequisites?.length > 0 && (
            <Section icon="⚙️" title="Prerequisites">
              <ul className="sg-list">
                {prerequisites.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Installation Steps */}
          {installation_steps?.length > 0 && (
            <Section icon="📦" title="Installation Steps">
              {installation_steps.map((step, i) => (
                <CommandBlock key={i} command={step.command} description={step.description} />
              ))}
            </Section>
          )}

          {/* Environment Setup */}
          {env_setup?.length > 0 && (
            <Section icon="🔐" title="Environment Setup" defaultOpen={false}>
              <div className="sg-env-list">
                {env_setup.map((env, i) => (
                  <div key={i} className="sg-env-item">
                    <code className="sg-env-var">{env.variable}</code>
                    <span className="sg-env-desc">{env.description}</span>
                    {env.example && (
                      <CommandBlock command={env.example} />
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Database Setup */}
          {database_setup?.length > 0 && (
            <Section icon="🗄️" title="Database Setup" defaultOpen={false}>
              {database_setup.map((step, i) => (
                <div key={i} className="sg-db-step">
                  <span className="sg-db-label">{step.step}</span>
                  {step.command && <CommandBlock command={step.command} />}
                </div>
              ))}
            </Section>
          )}

          {/* Running the Project */}
          {(devCommands.length > 0 || otherCommands.length > 0) && (
            <Section icon="▶️" title="Running the Project">
              {[...devCommands, ...otherCommands].map((cmd, i) => (
                <CommandBlock key={i} command={cmd.command} description={cmd.description} />
              ))}
            </Section>
          )}

          {/* Build for Production */}
          {prodCommands.length > 0 && (
            <Section icon="🏗️" title="Build for Production" defaultOpen={false}>
              {prodCommands.map((cmd, i) => (
                <CommandBlock key={i} command={cmd.command} description={cmd.description} />
              ))}
            </Section>
          )}

          {/* How It Works */}
          {how_it_works && (
            <Section icon="🧠" title="How It Works" defaultOpen={false}>
              <p className="sg-explanation">{how_it_works}</p>
            </Section>
          )}

          {/* VS Code Tips */}
          {vscode_tips?.length > 0 && (
            <Section icon="💻" title="VS Code Setup" defaultOpen={false}>
              <ul className="sg-list">
                {vscode_tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </Section>
          )}

          {/* Troubleshooting */}
          {troubleshooting?.length > 0 && (
            <Section icon="❗" title="Troubleshooting" defaultOpen={false}>
              {troubleshooting.map((t, i) => (
                <div key={i} className="sg-trouble-item">
                  <div className="sg-trouble-problem">
                    <span className="sg-trouble-label">Problem:</span> {t.problem}
                  </div>
                  <div className="sg-trouble-solution">
                    <span className="sg-trouble-label">Solution:</span> {t.solution}
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

export default SetupGuide;
