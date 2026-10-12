// Generative UI Chat Interface - Enhanced with AG-UI Protocol
// This component provides real-time agent-generated UI rendering

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import UsageLimitModal from '../components/UsageLimitModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  Grid,
  StatCard,
  ProgressBar,
  CodeBlock,
  CodeDiff,
  AgentStatusCard,
  FixCard,
  WorkflowTimeline,
  Expandable,
  Tabs,
  Badge
} from '../components/GenUIComponents';
import { useAGUIState, parseSSEData } from '../components/AGUIRenderer';
import '../components/GenUIComponents.css';
import './ChatPage.css';

const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const GenUIChatPage = () => {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const { authAxios, token, isAuthenticated, hasReachedGuestLimit, incrementGuestUsage } = useAuth();
  
  // Guest usage limit modal
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  
  // Session state
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [messages, setMessages] = useState([]);
  
  // Input state
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  
  // Streaming & result state
  const [loading, setLoading] = useState(false);
  const [streamingCode, setStreamingCode] = useState('');
  const [streamingStats, setStreamingStats] = useState({ lines: 0, chars: 0 });
  
  // AG-UI State
  const {
    workflow,
    processEvent,
    reset: resetAGUI
  } = useAGUIState();
  
  // Result state
  const [result, setResult] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  
  // Active agent for display
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const sessionCreatedRef = useRef(false);
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingCode, scrollToBottom]);
  
  // Handle URL session ID changes
  useEffect(() => {
    if (urlSessionId) {
      setSessionId(urlSessionId);
      sessionCreatedRef.current = true;
    } else if (!sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      // For guests, create a local-only session
      if (!isAuthenticated) {
        const localSessionId = `guest-${Date.now()}`;
        setSessionId(localSessionId);
        setSessionTitle('Guest Chat');
      } else {
        createSession();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId, isAuthenticated]);
  
  // Load session data
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
      if (response.data.messages?.length > 0) {
        const loadedMessages = response.data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          code_output: msg.code_output,
          hasResult: !!msg.code_output
        }));
        setMessages(loadedMessages);
        const lastAssistantMsg = [...response.data.messages].reverse().find(m => m.code_output);
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
    // For guests, create a local-only session (no server call)
    if (!isAuthenticated) {
      const localSessionId = `guest-${Date.now()}`;
      setSessionId(localSessionId);
      setSessionTitle('Guest Chat');
      setMessages([]);
      setPrompt('');
      setResult(null);
      setStreamingCode('');
      resetAGUI();
      sessionCreatedRef.current = true;
      return;
    }
    
    try {
      const response = await authAxios.post('/sessions');
      const newSessionId = response.data.session_id;
      setSessionId(newSessionId);
      setSessionTitle('New Chat');
      setMessages([]);
      setPrompt('');
      setResult(null);
      setStreamingCode('');
      resetAGUI();
      sessionCreatedRef.current = true;
      navigate(`/chat/${newSessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };
  
  // Main submit handler with AG-UI streaming
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
    
    // Save user message
    if (sessionId && token) {
      try {
        const saveResponse = await authAxios.post(`/sessions/${sessionId}/messages`, {
          role: 'user',
          content: prompt
        });
        if (saveResponse.data.new_title) {
          setSessionTitle(saveResponse.data.new_title);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }
    
    // Reset states
    setLoading(true);
    setStreamingCode('');
    setStreamingStats({ lines: 0, chars: 0 });
    setResult(null);
    setShowOriginal(false);
    setAgentMessages([]);
    resetAGUI();
    
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
      let finalAllFixes = [];
      let savedOriginalCode = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = parseSSEData(line);
          if (!data) continue;
          
          // Process through AG-UI state manager
          processEvent(data);
          
          // Handle specific event types
          switch (data.type) {
            case 'start':
              setActiveAgent(data.source || data.payload?.agentName);
              setAgentMessages(prev => [...prev, {
                agent: data.source || data.payload?.agentName,
                message: data.payload?.message || `Starting ${data.payload?.agentName}...`,
                type: 'start'
              }]);
              break;
              
            case 'stream_chunk':
              fullCode += data.payload?.content || '';
              setStreamingCode(fullCode);
              setStreamingStats({
                lines: data.payload?.totalLines || fullCode.split('\n').length,
                chars: data.payload?.totalChars || fullCode.length
              });
              break;
              
            case 'progress':
              setAgentMessages(prev => [...prev, {
                agent: data.source || data.payload?.agentName,
                message: data.payload?.message,
                progress: data.payload?.progress,
                type: 'progress'
              }]);
              break;
              
            case 'code_update':
              fullCode = data.payload?.code || fullCode;
              setStreamingCode(fullCode);
              if (data.payload?.fixes) {
                finalAllFixes.push({
                  agent: data.source || data.payload?.ui?.agent,
                  fixes: data.payload?.fixes
                });
              }
              setAgentMessages(prev => [...prev, {
                agent: data.source,
                message: `Applied ${data.payload?.fixCount || 0} fixes`,
                fixes: data.payload?.fixes,
                type: 'code_update'
              }]);
              break;
              
            case 'agent_result':
              const agentKey = data.payload?.agentName?.toLowerCase() || data.source;
              agentResults[agentKey] = data.payload?.data;
              setAgentMessages(prev => [...prev, {
                agent: data.payload?.agentName || data.source,
                message: `Completed - ${data.payload?.stats?.fixesApplied || 0} fixes applied`,
                stats: data.payload?.stats,
                type: 'result'
              }]);
              break;
              
            case 'workflow_update':
              // Workflow updates are handled by AG-UI state
              break;
              
            case 'complete':
              savedOriginalCode = data.payload?.original_code || savedOriginalCode;
              const finalResult = {
                code: data.payload?.code || fullCode,
                original_code: data.payload?.original_code,
                prompt: data.payload?.prompt,
                validation: agentResults.validator || data.payload?.validation,
                tests: agentResults.testing || agentResults['testing agent'] || data.payload?.tests,
                security: agentResults.security || agentResults['security agent'] || data.payload?.security,
                all_fixes: data.payload?.all_fixes || finalAllFixes,
                code_was_fixed: data.payload?.code_was_fixed,
                total_fixes: data.payload?.total_fixes,
                workflow: data.payload?.workflow,
                stats: data.payload?.stats
              };
              setResult(finalResult);
              setEditedCode(finalResult.code);
              setActiveAgent(null);
              break;
              
            default:
              break;
          }
        }
      }
      
      // Save assistant message
      const totalFixCount = finalAllFixes.reduce((sum, f) => sum + (f.fixes?.length || 0), 0);
      const assistantContent = `✅ Code generated successfully! (${fullCode.split('\n').length} lines)${totalFixCount > 0 ? `\n\n🔧 **${totalFixCount} AI fixes applied** by agents` : ''}`;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantContent,
        hasResult: true
      }]);
      
      if (sessionId && token) {
        try {
          await authAxios.post(`/sessions/${sessionId}/messages`, {
            role: 'assistant',
            content: assistantContent,
            code_output: fullCode,
            workflow_data: { total_fixes: totalFixCount }
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error generating code. Check your API key or try again.'
      }]);
    } finally {
      setLoading(false);
      setPrompt('');
    }
  };
  
  const copyCode = () => {
    const code = editMode ? editedCode : (result?.code || streamingCode);
    navigator.clipboard.writeText(code);
  };
  
  const getAgentIcon = (agentId) => {
    const icons = {
      code_generator: '⚡',
      validator: '✓',
      testing: '🧪',
      security: '🛡️'
    };
    const key = agentId?.toLowerCase().replace(' agent', '').replace(' ', '_');
    return icons[key] || '🤖';
  };
  
  // Render the Generative UI Result Panel
  const renderResultPanel = () => {
    if (!streamingCode && !result) return null;
    
    return (
      <motion.div 
        className="genui-result-panel"
        variants={fadeInUp}
        initial="initial"
        animate="animate"
      >
        {/* Workflow Timeline */}
        <Card title="Agent Pipeline" icon="🔄" variant="default">
          <WorkflowTimeline 
            steps={workflow.length > 0 ? workflow : [
              { id: 'code_gen', name: 'Code Generator', icon: '⚡', status: activeAgent === 'code_generator' ? 'active' : (result ? 'complete' : 'pending') },
              { id: 'validator', name: 'Validator', icon: '✓', status: activeAgent === 'validator' ? 'active' : (result?.validation ? 'complete' : 'pending') },
              { id: 'testing', name: 'Testing', icon: '🧪', status: activeAgent === 'testing' ? 'active' : (result?.tests ? 'complete' : 'pending') },
              { id: 'security', name: 'Security', icon: '🛡️', status: activeAgent === 'security' ? 'active' : (result?.security ? 'complete' : 'pending') }
            ]}
            orientation="horizontal"
          />
        </Card>
        
        {/* Live Agent Updates */}
        {loading && (
          <Card title="Live Agent Activity" icon="📡" variant="primary">
            <div className="genui-agent-feed">
              <AnimatePresence>
                {agentMessages.slice(-5).map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`genui-agent-msg ${msg.type}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="genui-agent-msg-icon">{getAgentIcon(msg.agent)}</span>
                    <span className="genui-agent-msg-name">{msg.agent}</span>
                    <span className="genui-agent-msg-text">{msg.message}</span>
                    {msg.progress && <ProgressBar value={msg.progress} showValue={false} />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card>
        )}
        
        {/* Code Output */}
        <Card 
          title={result?.code_was_fixed ? '✨ Fixed Code' : 'Generated Code'}
          icon="📝"
          actions={
            <div className="genui-code-actions">
              {result?.original_code && (
                <button 
                  className="genui-btn secondary"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? '📝 Show Fixed' : '📄 Show Original'}
                </button>
              )}
              <button className="genui-btn secondary" onClick={copyCode}>
                📋 Copy
              </button>
            </div>
          }
        >
          {result?.code_was_fixed && (
            <div className="genui-code-badge-bar">
              <Badge variant="success" icon="🔧">
                {result.total_fixes} fixes applied
              </Badge>
              {result.stats?.totalDuration && (
                <Badge variant="secondary" icon="⏱️">
                  {result.stats.totalDuration}s
                </Badge>
              )}
            </div>
          )}
          <CodeBlock
            code={showOriginal ? result?.original_code : (result?.code || streamingCode)}
            language="python"
            lineNumbers={true}
            maxHeight="400px"
          />
          {loading && (
            <div className="genui-streaming-indicator">
              <span className="genui-pulse">●</span>
              Streaming... {streamingStats.lines} lines
            </div>
          )}
        </Card>
        
        {/* Code Diff (if fixes were applied) */}
        {result?.code_was_fixed && result?.original_code && (
          <CodeDiff
            before={result.original_code}
            after={result.code}
            title="All Changes Applied by Agents"
            expanded={false}
          />
        )}
        
        {/* Stats Summary */}
        {result && (
          <Grid columns={4} className="genui-stats-grid">
            <StatCard 
              label="Lines Generated" 
              value={result.code?.split('\n').length || 0} 
              icon="📝"
              variant="default"
            />
            <StatCard 
              label="Fixes Applied" 
              value={result.total_fixes || 0} 
              icon="🔧"
              variant={result.total_fixes > 0 ? 'success' : 'default'}
            />
            <StatCard 
              label="Duration" 
              value={`${result.stats?.totalDuration || '-'}s`} 
              icon="⏱️"
            />
            <StatCard 
              label="Agents Run" 
              value={4} 
              icon="🤖"
            />
          </Grid>
        )}
        
        {/* Fixes Summary */}
        {result?.all_fixes && result.all_fixes.length > 0 && (
          <Card title="🔧 Auto-Fixes Applied" icon="✨" collapsible defaultExpanded={false}>
            <div className="genui-all-fixes">
              {result.all_fixes.map((agentFix, i) => (
                <Expandable
                  key={i}
                  title={`${agentFix.agent} (${agentFix.fixes?.length || 0} fixes)`}
                  icon={getAgentIcon(agentFix.agent)}
                  expanded={false}
                >
                  <div className="genui-fixes-list">
                    {agentFix.fixes?.map((fix, j) => (
                      <FixCard
                        key={j}
                        agent={agentFix.agent}
                        description={typeof fix === 'object' ? fix.description : fix}
                        severity={fix.severity || 'medium'}
                        before={fix.before}
                        after={fix.after}
                        line={fix.line}
                        expandable={true}
                      />
                    ))}
                  </div>
                </Expandable>
              ))}
            </div>
          </Card>
        )}
        
        {/* Agent Results Tabs */}
        {result && (
          <Tabs
            tabs={[
              {
                id: 'validation',
                label: 'Validation',
                icon: '✓',
                badge: result.validation?.fixes_applied?.length || 0,
                content: (
                  <AgentStatusCard
                    agentName="Validator"
                    icon="✓"
                    phase="complete"
                    message={result.validation?.message || 'Code quality verified'}
                    fixes={result.validation?.fixes_applied?.map(f => ({
                      description: typeof f === 'object' ? f.description : f,
                      severity: f.severity || 'medium'
                    }))}
                    stats={result.validation?.stats}
                  />
                )
              },
              {
                id: 'testing',
                label: 'Testing',
                icon: '🧪',
                badge: result.tests?.fixes_applied?.length || 0,
                content: (
                  <AgentStatusCard
                    agentName="Testing Agent"
                    icon="🧪"
                    phase="complete"
                    message={result.tests?.message || 'Error handling adequate'}
                    fixes={result.tests?.fixes_applied?.map(f => ({
                      description: typeof f === 'object' ? f.description : f,
                      severity: f.severity || 'medium'
                    }))}
                    stats={{ testabilityScore: result.tests?.testability_score }}
                  />
                )
              },
              {
                id: 'security',
                label: 'Security',
                icon: '🛡️',
                badge: result.security?.fixes_applied?.length || 0,
                content: (
                  <AgentStatusCard
                    agentName="Security Agent"
                    icon="🛡️"
                    phase="complete"
                    message={result.security?.message || 'Code is secure'}
                    fixes={result.security?.fixes_applied?.map(f => ({
                      description: typeof f === 'object' ? f.description : f,
                      severity: f.severity || 'high'
                    }))}
                    stats={{ riskLevel: result.security?.risk_level }}
                  />
                )
              }
            ]}
          />
        )}
      </motion.div>
    );
  };
  
  return (
    <div className="chat-page genui-enhanced">
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
          <h1>
            <span className="genui-header-badge">GenUI</span>
            Code Generator
          </h1>
          <div className="header-actions">
            <UserMenu />
          </div>
        </header>
        
        {/* Edit Actions Bar */}
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
              onClick={() => editMode ? null : setEditMode(true)}
            >
              {editMode ? '✓ Save Changes' : '📝 Edit Code'}
            </button>
          </div>
        )}
        
        {/* Prompt Edit Panel */}
        {showPromptEdit && (
          <motion.div 
            className="prompt-edit-panel"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <h3>Edit Your Request</h3>
            <p className="hint">Describe what changes you want</p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., Add error handling, change function name..."
              rows={3}
            />
            <div className="prompt-edit-actions">
              <button className="btn btn-primary" disabled={loading}>
                🔄 Regenerate
              </button>
              <button className="btn btn-secondary" onClick={() => setShowPromptEdit(false)}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
        
        {/* Messages Area */}
        <div className="chat-messages">
          {messages.length === 0 && !loading && (
            <motion.div 
              className="welcome-message"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
            >
              <div className="welcome-icon">🤖</div>
              <h2>Uber Code Generator</h2>
              <p>Powered by <Badge variant="primary">Generative UI</Badge> & Llama 3.3 via Groq</p>
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
            </motion.div>
          )}
          
          {messages.map((msg, index) => (
            <motion.div 
              key={index} 
              className={`message ${msg.role}`}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <p>{msg.content}</p>
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div 
              className="message assistant streaming"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
            >
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="genui-streaming-status">
                  <span className="genui-pulse">●</span>
                  {activeAgent ? `${getAgentIcon(activeAgent)} ${activeAgent} is working...` : 'Processing...'}
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Generative UI Result Panel */}
        {renderResultPanel()}
        
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

export default GenUIChatPage;
