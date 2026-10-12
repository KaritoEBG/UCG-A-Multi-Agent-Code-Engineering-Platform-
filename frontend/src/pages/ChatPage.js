     import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import UsageLimitModal from '../components/UsageLimitModal';
import './ChatPage.css';

const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

// Helper function to format markdown reports to HTML
// eslint-disable-next-line
const formatMarkdownReport = (markdown) => {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-snippet"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

  return `<div class="markdown-report"><p>${html}</p></div>`;
};

// Helper function to generate agent report from structured fixes data
const generateAgentReport = (agentType, data) => {
  if (!data || !data.fixes_applied || data.fixes_applied.length === 0) {
    return null;
  }

  const fixes = data.fixes_applied;
  const severityEmoji = {
    'CRITICAL': '🔴',
    'HIGH': '🟠',
    'MEDIUM': '🟡',
    'LOW': '🟢'
  };

  let html = '<div class="agent-report-generated">';

  // Header
  if (agentType === 'validation') {
    html += '<h3>✅ Validation Report</h3>';
    html += `<p class="report-summary"><strong>Issues Found:</strong> ${data.issues?.length || 0} | <strong>Fixes Applied:</strong> ${fixes.length}</p>`;
  } else if (agentType === 'testing') {
    html += '<h3>🧪 Testing & Error Handling Report</h3>';
    html += `<p class="report-summary"><strong>Testability Score:</strong> ${data.testability_score || 'N/A'}/100 | <strong>Fixes Applied:</strong> ${fixes.length}</p>`;
  } else if (agentType === 'security') {
    html += '<h3>🛡️ Security Audit Report</h3>';
    html += `<p class="report-summary"><strong>Risk Level:</strong> ${data.risk_level || 'N/A'} | <strong>Vulnerabilities Fixed:</strong> ${fixes.length}</p>`;
  }

  html += '<div class="fixes-detail-list">';

  fixes.forEach((fix, index) => {
    const isObject = typeof fix === 'object';
    const description = isObject ? fix.description : fix;
    const before = isObject ? fix.before : null;
    const after = isObject ? fix.after : null;
    const severity = isObject ? fix.severity : null;
    const line = isObject ? fix.line : null;

    html += '<div class="fix-detail-item">';
    html += `<h4>Fix ${index + 1}: ${description}</h4>`;

    if (severity) {
      html += `<span class="severity-badge severity-${severity.toLowerCase()}">${severityEmoji[severity] || '🔵'} ${severity}</span>`;
    }
    if (line) {
      html += `<span class="line-badge">Line ${line}</span>`;
    }

    if (before && after) {
      html += '<div class="before-after">';
      html += '<div class="code-before"><strong>Before:</strong><pre><code>' + escapeHtml(before.replace(/\\n/g, '\n')) + '</code></pre></div>';
      html += '<div class="code-after"><strong>After:</strong><pre><code>' + escapeHtml(after.replace(/\\n/g, '\n')) + '</code></pre></div>';
      html += '</div>';
    }

    html += '</div>';
  });

  html += '</div></div>';
  return html;
};

// Helper to escape HTML
const escapeHtml = (text) => {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Language detection from prompt text
const detectLanguage = (prompt) => {
  if (!prompt) return 'python';
  const p = prompt.toLowerCase();
  const langMap = [
    [/\b(python|flask|django|fastapi|pandas|numpy)\b/, 'python'],
    [/\b(javascript|node\.?js|express|react|vue|angular|nextjs|next\.js)\b/, 'javascript'],
    [/\b(typescript|tsx?)\b/, 'typescript'],
    [/\b(java\b(?!script))/, 'java'],
    [/\b(c\+\+|cpp)\b/, 'cpp'],
    [/\b(c#|csharp|dotnet|\.net)\b/, 'csharp'],
    [/\b(go|golang)\b/, 'go'],
    [/\b(rust|cargo)\b/, 'rust'],
    [/\b(ruby|rails)\b/, 'ruby'],
    [/\b(php|laravel)\b/, 'php'],
    [/\b(swift|swiftui)\b/, 'swift'],
    [/\b(kotlin|android)\b/, 'kotlin'],
    [/\b(sql|mysql|postgres|sqlite|database|query)\b/, 'sql'],
    [/\b(html|webpage|web page)\b/, 'html'],
    [/\b(css|stylesheet|tailwind)\b/, 'css'],
    [/\b(bash|shell|script|terminal|cli)\b/, 'bash'],
    [/\b(scala)\b/, 'scala'],
    [/\b(perl)\b/, 'perl'],
    [/\b(lua)\b/, 'lua'],
    [/\b(dart|flutter)\b/, 'dart'],
  ];
  for (const [regex, lang] of langMap) {
    if (regex.test(p)) return lang;
  }
  return 'python';
};

const ChatPage = () => {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const { authAxios, token, isAuthenticated, hasReachedGuestLimit, incrementGuestUsage } = useAuth();
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [streamingCode, setStreamingCode] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [agentFixes, setAgentFixes] = useState([]);
  const [, setOriginalCode] = useState('');
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const messagesEndRef = useRef(null);
  const codeEndRef = useRef(null);
  const sessionCreatedRef = useRef(false);  // Prevent duplicate session creation

  // Auto-detect language from the most recent user message
  const detectedLang = useMemo(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    return detectLanguage(lastUserMsg?.content || prompt);
  }, [messages, prompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingCode]);

  // Handle URL session ID changes
  useEffect(() => {
    if (urlSessionId && isAuthenticated) {
      // URL has a session ID - load it (only if authenticated)
      setSessionId(urlSessionId);
      sessionCreatedRef.current = true;
    } else if (!sessionCreatedRef.current) {
      // No URL session ID and no session created yet
      sessionCreatedRef.current = true;
      if (isAuthenticated) {
        createSession();
      } else {
        // Guest mode - just set up local state
        setSessionTitle('Guest Session');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId, isAuthenticated]);

  // Load session data when sessionId changes
  useEffect(() => {
    if (sessionId && token) {
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  const loadSession = async () => {
    if (!sessionId || !token) return;
    try {
      const response = await authAxios.get(`/sessions/${sessionId}`);
      setSessionTitle(response.data.title || 'New Chat');
      // Load existing messages if any
      if (response.data.messages && response.data.messages.length > 0) {
        const loadedMessages = response.data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          code_output: msg.code_output,
          hasResult: !!msg.code_output
        }));
        setMessages(loadedMessages);
        // If there's code output, set the result
        const lastAssistantMsg = response.data.messages.reverse().find(m => m.code_output);
        if (lastAssistantMsg) {
          setResult({ code: lastAssistantMsg.code_output });
          setEditedCode(lastAssistantMsg.code_output);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const createSession = async () => {
    // Only create sessions for authenticated users
    if (!isAuthenticated) {
      // Guest mode - just reset local state
      setSessionId(null);
      setSessionTitle('Guest Session');
      setMessages([]);
      setPrompt('');
      setResult(null);
      setStreamingCode('');
      setStreamingMessage('');
      setIsStreaming(false);
      setCurrentAgent(null);
      setEditMode(false);
      setEditedCode('');
      setShowPromptEdit(false);
      setAgentFixes([]);
      setOriginalCode('');
      sessionCreatedRef.current = true;
      navigate('/chat');
      return;
    }

    try {
      const response = await authAxios.post('/sessions');
      const newSessionId = response.data.session_id;

      // Reset all state for new chat
      setSessionId(newSessionId);
      setSessionTitle('New Chat');
      setMessages([]);
      setPrompt('');
      setResult(null);
      setStreamingCode('');
      setStreamingMessage('');
      setIsStreaming(false);
      setCurrentAgent(null);
      setEditMode(false);
      setEditedCode('');
      setShowPromptEdit(false);
      setAgentFixes([]);
      setOriginalCode('');
      sessionCreatedRef.current = true;

      // Navigate to the new session
      navigate(`/chat/${newSessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    // Check guest usage limit
    if (!isAuthenticated && hasReachedGuestLimit()) {
      setShowUsageLimitModal(true);
      return;
    }

    const userMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to MongoDB
    if (sessionId && token) {
      try {
        const saveResponse = await authAxios.post(`/sessions/${sessionId}/messages`, {
          role: 'user',
          content: prompt
        });
        // Update title if it was auto-generated
        if (saveResponse.data.new_title) {
          setSessionTitle(saveResponse.data.new_title);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    setLoading(true);
    setIsStreaming(true);
    setStreamingCode('');
    setStreamingMessage('🚀 Starting code generation...');
    setResult(null);
    setCurrentAgent('Code Generator');
    setAgentFixes([]);
    setOriginalCode('');
    setShowOriginal(false);

    try {
      const response = await fetch(`${API_BASE}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullCode = '';
      let agentResults = {};
      let allFixes = [];
      let savedOriginalCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'start') {
                setCurrentAgent(data.agent);
                setStreamingMessage(data.message || `${data.agent} is working...`);
              } else if (data.type === 'chunk') {
                fullCode += data.content;
                setStreamingCode(fullCode);
                setStreamingMessage(`⚡ Generating code... ${fullCode.split('\n').length} lines written`);
              } else if (data.type === 'agent_complete') {
                savedOriginalCode = fullCode;
                setOriginalCode(fullCode);
                setStreamingMessage(data.message || `${data.agent} completed`);
              } else if (data.type === 'code_update') {
                // Agent fixed the code - show the update!
                fullCode = data.code;
                setStreamingCode(fullCode);
                allFixes.push({ agent: data.agent, fixes: data.fixes });
                setAgentFixes([...allFixes]);
                const firstFix = data.fixes[0];
                const fixDesc = typeof firstFix === 'object' ? firstFix.description : firstFix;
                setStreamingMessage(`🔧 ${data.agent} fixed ${data.fixes.length} issue(s): ${fixDesc?.substring(0, 50) || 'code improvements'}...`);
              } else if (data.type === 'result') {
                agentResults[data.agent.toLowerCase()] = data.data;
                const status = data.data?.status || 'completed';
                const fixCount = data.data?.fixes_applied?.length || 0;
                const statusIcon = status === 'passed' || status === 'secure' || status === 'all_passed' ? '✅' : fixCount > 0 ? '🔧' : '⚠️';
                setStreamingMessage(`${data.agent}: ${statusIcon} ${data.data?.message || 'Done'}${fixCount > 0 ? ` (${fixCount} fixes applied)` : ''}`);
              } else if (data.type === 'complete') {
                const totalFixes = data.total_fixes || allFixes.reduce((sum, f) => sum + f.fixes.length, 0);
                setResult({
                  code: data.code,
                  original_code: data.original_code || savedOriginalCode,
                  prompt: data.prompt,
                  validation: agentResults.validator,
                  tests: agentResults.testing,
                  security: agentResults.security,
                  all_fixes: data.all_fixes || allFixes,
                  code_was_fixed: data.code_was_fixed || (data.code !== savedOriginalCode),
                  total_fixes: totalFixes,
                  workflow: [
                    { agent: 'Code Generator', status: 'completed' },
                    { agent: 'Validator', status: 'completed' },
                    { agent: 'Testing', status: 'completed' },
                    { agent: 'Security', status: 'completed' }
                  ]
                });
                setEditedCode(data.code);
                setCurrentAgent(null);
                setIsStreaming(false);
                setStreamingMessage('');
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      const totalFixCount = allFixes.reduce((sum, f) => sum + f.fixes.length, 0);
      const assistantContent = `✅ Code generated successfully! (${fullCode.split('\n').length} lines)${totalFixCount > 0 ? `\n\n🔧 **${totalFixCount} AI fixes applied** by agents` : ''}\n\n**Agent Results:**\n• Code Generator: Done\n• Validator: ${agentResults.validator?.fixes_applied?.length || 0} fixes\n• Testing: ${agentResults.testing?.fixes_applied?.length || 0} fixes\n• Security: ${agentResults.security?.fixes_applied?.length || 0} fixes`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantContent,
        hasResult: true
      }]);

      // Save assistant message to MongoDB
      if (sessionId && token) {
        try {
          await authAxios.post(`/sessions/${sessionId}/messages`, {
            role: 'assistant',
            content: assistantContent,
            code_output: fullCode,
            workflow_data: {
              validation: agentResults.validator,
              testing: agentResults.testing,
              security: agentResults.security,
              total_fixes: totalFixCount
            }
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

      // Increment guest usage after successful generation
      if (!isAuthenticated) {
        incrementGuestUsage();
      }
    } catch (error) {
      console.error('Error:', error);
      setIsStreaming(false);
      setStreamingMessage('');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error generating code. Check your API key or try again.'
      }]);
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };

  const handlePromptEdit = async () => {
    if (!editPrompt.trim() || loading || !result) return;

    setLoading(true);
    setStreamingCode('');
    setCurrentAgent('Code Generator');

    try {
      const response = await fetch(`${API_BASE}/regenerate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_prompt: result.prompt || prompt,
          edit_instructions: editPrompt,
          current_code: result.code
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullCode = '';
      let agentResults = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'start') {
                setCurrentAgent(data.agent);
              } else if (data.type === 'chunk') {
                fullCode += data.content;
                setStreamingCode(fullCode);
              } else if (data.type === 'result') {
                agentResults[data.agent.toLowerCase()] = data.data;
              } else if (data.type === 'complete') {
                setResult(prev => ({
                  ...prev,
                  code: data.code,
                  validation: agentResults.validator,
                  tests: agentResults.testing,
                  security: agentResults.security
                }));
                setEditedCode(data.code);
                setCurrentAgent(null);
              }
            } catch (e) { }
          }
        }
      }

      setMessages(prev => [...prev, {
        role: 'user',
        content: `Edit: ${editPrompt}`
      }, {
        role: 'assistant',
        content: 'Code updated based on your instructions!'
      }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setEditPrompt('');
      setShowPromptEdit(false);
    }
  };

  const handleCodeEdit = async () => {
    if (!result) return;
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/edit`, {
        original_code: result.code,
        updates: [{ old: result.code, new: editedCode }]
      });

      setResult(prev => ({
        ...prev,
        code: response.data.updated_code,
        validation: response.data.validation,
        tests: response.data.tests,
        security: response.data.security
      }));

      setEditMode(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'passed': { class: 'badge-success', label: 'Passed' },
      'warnings': { class: 'badge-warning', label: 'Warnings' },
      'all_passed': { class: 'badge-success', label: 'All Passed' },
      'secure': { class: 'badge-success', label: 'Secure' },
      'vulnerabilities_found': { class: 'badge-danger', label: 'Issues' }
    };
    const config = statusMap[status] || { class: 'badge-info', label: status };
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const copyCode = () => {
    const code = editMode ? editedCode : (result?.code || streamingCode);
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="logo">
            <span className="logo-icon">🚀</span>
            <span>Uber Code</span>
          </Link>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={createSession}>
            <span>➕</span> New Chat
          </button>
          <Link to="/dashboard" className="nav-item">
            <span>📊</span> Dashboard
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="session-info">
            <span className="session-title-label">{sessionTitle}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="chat-main">
        <header className="chat-header">
          <h1>Code Generator</h1>
          <div className="header-actions">
            <UserMenu />
          </div>
        </header>

        {/* Edit Actions Bar - Only show when there's a result */}
        {result && (
          <div className="edit-actions-bar">
            <button
              className={`btn ${showPromptEdit ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowPromptEdit(!showPromptEdit)}
            >
              ✏️ Edit Prompt
            </button>
            <button
              className={`btn ${editMode ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => editMode ? handleCodeEdit() : setEditMode(true)}
            >
              {editMode ? '✓ Save Changes' : '📝 Edit Code'}
            </button>
            {editMode && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setEditMode(false);
                  setEditedCode(result.code);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Prompt Edit Panel */}
        {showPromptEdit && (
          <div className="prompt-edit-panel">
            <h3>Edit Your Request</h3>
            <p className="hint">Describe what changes you want - only those changes will be applied</p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., Add error handling, change function name to calculate_sum, add type hints..."
              rows={3}
            />
            <div className="prompt-edit-actions">
              <button className="btn btn-primary" onClick={handlePromptEdit} disabled={loading}>
                {loading ? 'Regenerating...' : '🔄 Regenerate'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPromptEdit(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <div className="welcome-message">
              <div className="welcome-icon">🤖</div>
              <h2>Uber Code Generator</h2>
              <p>Powered by Llama 3.3 via Groq (Ultra Fast!)</p>
              <div className="example-prompts">
                <h4>Try these:</h4>
                <button onClick={() => setPrompt('Create a Python function to calculate fibonacci numbers with memoization')}>
                  Fibonacci with memoization
                </button>
                <button onClick={() => setPrompt('Create a REST API class with CRUD operations')}>
                  REST API class
                </button>
                <button onClick={() => setPrompt('Create a Flask API with authentication')}>
                  Flask API with auth
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <p>{msg.content}</p>
              </div>
            </div>
          ))}

          {isStreaming && (
            <div className="message assistant streaming">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="streaming-response">
                  <div className="streaming-text">
                    {streamingMessage}
                    <span className="typing-cursor">|</span>
                  </div>

                  {/* Real-time Agent Fixes Display */}
                  {agentFixes.length > 0 && (
                    <div className="realtime-fixes">
                      <h4>🔧 Live Fixes Applied:</h4>
                      {agentFixes.map((af, i) => (
                        <div key={i} className="realtime-fix-item">
                          <span className="fix-agent">{af.agent}:</span>
                          <ul>
                            {af.fixes.slice(0, 3).map((fix, j) => (
                              <li key={j}>{typeof fix === 'object' ? fix.description : fix}</li>
                            ))}
                            {af.fixes.length > 3 && <li>...and {af.fixes.length - 3} more</li>}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {streamingCode && (
                    <div className="streaming-preview">
                      <div className="preview-header">
                        <span>📝 Code Preview</span>
                        <span className="line-count">{streamingCode.split('\n').length} lines</span>
                      </div>
                      <SyntaxHighlighter
                        language={detectedLang}
                        style={vscDarkPlus}
                        showLineNumbers={false}
                        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '13px', maxHeight: '300px' }}
                        wrapLongLines={true}
                      >
                        {streamingCode.slice(-800)}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Code Output Panel */}
        {(streamingCode || result) && (
          <div className="result-panel">
            {/* Workflow Timeline */}
            <div className="workflow-section">
              <h3>Agent Pipeline</h3>
              <div className="workflow-timeline">
                {['Code Generator', 'Validator', 'Testing', 'Security'].map((agent, index) => {
                  const isActive = currentAgent === agent;
                  const isComplete = result?.workflow?.find(w => w.agent === agent);
                  return (
                    <div key={index} className={`workflow-item ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
                      <div className="workflow-icon">
                        {agent === 'Code Generator' && '⚡'}
                        {agent === 'Validator' && '✓'}
                        {agent === 'Testing' && '🧪'}
                        {agent === 'Security' && '🛡️'}
                      </div>
                      <span className="workflow-label">{agent}</span>
                      {isActive && <span className="workflow-spinner"></span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Code Output */}
            <div className="code-section">
              <div className="section-header">
                <h3>
                  {result?.code_was_fixed ? '✨ Fixed Code' : 'Generated Code'}
                  {loading && <span className="streaming-indicator">● Streaming</span>}
                  {result?.code_was_fixed && (
                    <span className="fixes-badge">🔧 {result.total_fixes} fixes applied</span>
                  )}
                </h3>
                <div className="code-actions">
                  {result?.original_code && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowOriginal(!showOriginal)}
                    >
                      {showOriginal ? '📝 Show Fixed' : '📄 Show Original'}
                    </button>
                  )}
                  <button className="btn btn-icon" onClick={copyCode}>📋 Copy</button>
                </div>
              </div>
              {editMode ? (
                <textarea
                  className="code-editor"
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                />
              ) : (
                <div className="code-block" ref={codeEndRef}>
                  <SyntaxHighlighter
                    language={detectedLang}
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    wrapLongLines={true}
                    customStyle={{ margin: 0, borderRadius: '8px', fontSize: '13px', background: '#1e1e2e' }}
                    lineNumberStyle={{ color: '#555', minWidth: '2.5em', paddingRight: '1em' }}
                  >
                    {showOriginal ? (result?.original_code || '') : (result?.code || streamingCode || '')}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>

            {/* Fixes Summary */}
            {result?.all_fixes && result.all_fixes.length > 0 && (
              <div className="fixes-summary">
                <h3>🔧 Auto-Fixes Applied by Agents</h3>
                <div className="fixes-list">
                  {result.all_fixes.map((agentFix, i) => (
                    <div key={i} className="fix-group">
                      <h4>{agentFix.agent} Agent</h4>
                      <ul>
                        {agentFix.fixes.map((fix, j) => (
                          <li key={j}>{typeof fix === 'object' ? fix.description : fix}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Grid - Detailed Agent Outputs */}
            {result && (
              <div className="results-section">
                <h3>🔄 LangGraph AI Agent Pipeline Results</h3>

                {/* Validation Agent */}
                <div className="agent-result-card">
                  <div className="agent-header">
                    <div className="agent-title">
                      <span className="agent-icon">✓</span>
                      <h4>Validation Agent</h4>
                      {result.validation?.ai_powered ? (
                        <span className="ai-badge">🤖 AI</span>
                      ) : (
                        <span className="basic-badge">⚡ Basic</span>
                      )}
                      {result.validation?.fixes_applied?.length > 0 && (
                        <span className="fix-count">🔧 {result.validation.fixes_applied.length} fixes</span>
                      )}
                    </div>
                    {getStatusBadge(result.validation?.status)}
                  </div>

                  {/* Agent Report - Generated from structured data */}
                  {result.validation?.fixes_applied?.length > 0 ? (
                    <div className="agent-report">
                      <div className="report-content" dangerouslySetInnerHTML={{
                        __html: generateAgentReport('validation', result.validation)
                      }} />
                    </div>
                  ) : (
                    <div className="agent-description">
                      <p>{result.validation?.message || (result.validation?.ai_powered ? '✅ Code passed validation - no fixes needed' : '⚠️ Basic validation (API key required for AI fixes)')}</p>
                    </div>
                  )}

                  {result.validation?.stats && (
                    <div className="agent-stats">
                      <span>📊 {result.validation.stats.functions} functions</span>
                      <span>📦 {result.validation.stats.classes} classes</span>
                      <span>📝 {result.validation.stats.lines} lines</span>
                    </div>
                  )}
                </div>

                {/* Testing Agent */}
                <div className="agent-result-card">
                  <div className="agent-header">
                    <div className="agent-title">
                      <span className="agent-icon">🧪</span>
                      <h4>Testing Agent</h4>
                      {result.tests?.ai_powered ? (
                        <span className="ai-badge">🤖 AI</span>
                      ) : (
                        <span className="basic-badge">⚡ Basic</span>
                      )}
                      {result.tests?.fixes_applied?.length > 0 && (
                        <span className="fix-count">🔧 {result.tests.fixes_applied.length} fixes</span>
                      )}
                    </div>
                    {getStatusBadge(result.tests?.status)}
                  </div>

                  {/* Agent Report - Generated from structured data */}
                  {result.tests?.fixes_applied?.length > 0 ? (
                    <div className="agent-report">
                      <div className="report-content" dangerouslySetInnerHTML={{
                        __html: generateAgentReport('testing', result.tests)
                      }} />
                    </div>
                  ) : (
                    <div className="agent-description">
                      <p>{result.tests?.message || (result.tests?.ai_powered ? '✅ Error handling is adequate - no fixes needed' : '⚠️ Basic test (API key required for AI fixes)')}</p>
                    </div>
                  )}

                  {result.tests?.testability_score && (
                    <div className="agent-stats">
                      <span>📊 Testability Score: {result.tests.testability_score}/100</span>
                    </div>
                  )}
                </div>

                {/* Security Agent */}
                <div className="agent-result-card">
                  <div className="agent-header">
                    <div className="agent-title">
                      <span className="agent-icon">🛡️</span>
                      <h4>Security Agent</h4>
                      {result.security?.ai_powered ? (
                        <span className="ai-badge">🤖 AI</span>
                      ) : (
                        <span className="basic-badge">⚡ Basic</span>
                      )}
                      {result.security?.fixes_applied?.length > 0 && (
                        <span className="fix-count">🔧 {result.security.fixes_applied.length} fixes</span>
                      )}
                    </div>
                    {getStatusBadge(result.security?.status)}
                  </div>

                  {/* Agent Report - Generated from structured data */}
                  {result.security?.fixes_applied?.length > 0 ? (
                    <div className="agent-report">
                      <div className="report-content" dangerouslySetInnerHTML={{
                        __html: generateAgentReport('security', result.security)
                      }} />
                    </div>
                  ) : (
                    <div className="agent-description">
                      <p>{result.security?.message || (result.security?.ai_powered ? '✅ Code is secure - no vulnerabilities found' : '⚠️ Basic scan only - API key required for AI auto-fix')}</p>
                    </div>
                  )}

                  {result.security?.risk_level && (
                    <div className="security-info">
                      <span className={`risk-badge risk-${result.security.risk_level.toLowerCase()}`}>
                        Risk: {result.security.risk_level}
                      </span>
                      {result.security.vulnerabilities?.length > 0 && (
                        <span className="vuln-count">
                          🚨 {result.security.vulnerabilities.length} vulnerabilities found
                        </span>
                      )}
                      {result.security.fixes_applied?.length > 0 && (
                        <span className="fixed-count">
                          ✅ {result.security.fixes_applied.length} fixed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Workflow Graph Info */}
                <div className="workflow-info">
                  <h4>📊 Workflow Execution</h4>
                  <div className="workflow-graph">
                    <div className="graph-node">Code Generator</div>
                    <div className="graph-arrow">→</div>
                    <div className="graph-node">Validator</div>
                    <div className="graph-arrow">→</div>
                    <div className="graph-node">Testing</div>
                    <div className="graph-arrow">→</div>
                    <div className="graph-node">Security</div>
                  </div>
                  <p className="workflow-note">Agents executed in DAG order using LangGraph orchestration</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <form className="chat-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the code you want to generate..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? '...' : '→'}
          </button>
        </form>
      </main>

      {/* Usage Limit Modal for guests */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        onSignInSuccess={() => {
          setShowUsageLimitModal(false);
        }}
      />
    </div>
  );
};

export default ChatPage;
