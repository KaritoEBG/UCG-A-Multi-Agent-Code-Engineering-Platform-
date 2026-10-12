// Generative UI Chat Interface V2 - Clean Split-Panel Design
// Professional-grade, spacious layout with AG-UI Protocol

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import UsageLimitModal from '../components/UsageLimitModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CodeDiff,
  FixCard,
  Expandable,
  Tabs,
  Badge
} from '../components/GenUIComponents';
import { useAGUIState, parseSSEData } from '../components/AGUIRenderer';
import '../components/GenUIComponents.css';
import TabbedCodeBlock from '../components/TabbedCodeBlock';
import SetupGuide from '../components/SetupGuide';
import { UCGLogo } from './LandingPage';
import './GenUIChatPageV2.css';

const GodParticleOrb = lazy(() => import('../components/GodParticleOrb'));

// Lightweight placeholder while orb loads
const OrbFallback = () => (
  <div style={{
    width: 420, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 24px'
  }}>
    <div style={{
      width: 180, height: 180, borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #3b82f6 0%, #1e3a5f 50%, #0a1628 100%)',
      boxShadow: '0 0 80px rgba(59,130,246,0.3), 0 0 160px rgba(59,130,246,0.1)',
      animation: 'godGlowPulse 2s ease-in-out infinite'
    }} />
  </div>
);

const API_BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

// --- SVG Icon Components ---
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);
const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconCode = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconWrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconCpu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
  </svg>
);

// --- Sidebar Skeleton ---
const SidebarSkeleton = () => (
  <>
    {[1,2,3,4].map(i => (
      <div className="skeleton-item" key={i}>
        <div className="skeleton-circle" />
        <div className="skeleton-lines">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      </div>
    ))}
  </>
);

const GenUIChatPageV2 = () => {
  const { sessionId: urlSessionId } = useParams();
  const navigate = useNavigate();
  const { authAxios, token, isAuthenticated, hasReachedGuestLimit, incrementGuestUsage } = useAuth();

  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('ucg-theme') || 'dark');
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ucg-theme', next);
      return next;
    });
  }, []);

  // Usage limit modal state
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);

  // Sessions loading state
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Session state
  const [sessionId, setSessionId] = useState(urlSessionId || null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [messages, setMessages] = useState([]);

  // Input state
  const [prompt, setPrompt] = useState('');

  // Streaming & result state
  const [loading, setLoading] = useState(false);
  const [streamingCode, setStreamingCode] = useState('');
  const [streamingStats, setStreamingStats] = useState({ lines: 0, chars: 0 });

  // AG-UI State
  const { processEvent, reset: resetAGUI } = useAGUIState();

  // Result state
  const [result, setResult] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Sidebar state - collapse on mobile by default
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [chatSessions, setChatSessions] = useState([]);

  // Edit message state
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Selected message index for viewing previous results
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);

  // Panel state
  const [rightPanelTab, setRightPanelTab] = useState('code'); // 'code', 'agents', 'fixes'
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [panelWidth, setPanelWidth] = useState(500);

  // Mobile detection & auto-collapse sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && sidebarExpanded) {
        setSidebarExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isResizing, setIsResizing] = useState(false);

  // Active agent for display
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentMessages, setAgentMessages] = useState([]);

  // Completion celebration
  const [showCompletion, setShowCompletion] = useState(false);

  // AI-generated project name for zip downloads (set once on first prompt)
  const [projectName, setProjectName] = useState('');
  // Version number: increments on each new code generation
  const [codeVersion, setCodeVersion] = useState(0);
  // Version displayed in right panel (matches the selected result card)
  const [displayVersion, setDisplayVersion] = useState(1);

  // Refs
  const messagesEndRef = useRef(null);
  const sessionCreatedRef = useRef(false);
  const resizeRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Panel resize handlers - using refs to avoid stale closures
  const panelWidthRef = useRef(panelWidth);

  const startResize = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = e.clientX;
    panelWidthRef.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const diff = resizeRef.current - e.clientX;
      const newWidth = Math.min(Math.max(panelWidthRef.current + diff, 520), 900);
      panelWidthRef.current = newWidth;
      resizeRef.current = e.clientX;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle URL session ID changes
  useEffect(() => {
    if (urlSessionId && isAuthenticated) {
      // Only load session from URL if authenticated
      setSessionId(urlSessionId);
      sessionCreatedRef.current = true;
    } else if (!sessionCreatedRef.current) {
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

  // Load session data
  useEffect(() => {
    if (sessionId && token) {
      loadSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  // Helper to build a result object from a message's stored data
  const buildResultFromMessage = (msg) => {
    const workflowData = msg.workflow_data || {};
    const restoredStats = workflowData.stats || {};
    return {
      code: msg.code_output,
      original_code: workflowData.original_code,
      all_fixes: workflowData.all_fixes || [],
      code_was_fixed: workflowData.code_was_fixed,
      total_fixes: workflowData.total_fixes || 0,
      validation: workflowData.validation,
      tests: workflowData.tests,
      security: workflowData.security,
      setup_guide: workflowData.setup_guide || null,
      version: workflowData.version || 1,
      stats: {
        totalDuration: restoredStats.totalDuration || restoredStats.total_duration || null,
        totalLines: restoredStats.totalLines || restoredStats.total_lines || 0,
        totalFixes: restoredStats.totalFixes || restoredStats.total_fixes || 0
      }
    };
  };

  // Handle clicking an assistant message to view its result in the right panel
  const selectMessage = useCallback((index) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant' || !msg.hasResult) return;

    setSelectedMessageIndex(index);
    const builtResult = buildResultFromMessage(msg);
    setResult(builtResult);
    // Show the version that belongs to this specific result card
    if (msg.workflow_data?.version) {
      setDisplayVersion(msg.workflow_data.version);
    }
    setShowOriginal(false);
    setShowRightPanel(true);
    setRightPanelTab('code');

    // Restore agent messages for this specific message
    if (msg.workflow_data?.agent_messages) {
      setAgentMessages(msg.workflow_data.agent_messages);
    }
  }, [messages]);

  const loadSession = async () => {
    if (!sessionId || !token) return;
    try {
      const response = await authAxios.get(`/sessions/${sessionId}`);
      setSessionTitle(response.data.title || 'New Chat');
      // Restore project name from DB
      if (response.data.project_name) {
        setProjectName(response.data.project_name);
      }
      if (response.data.messages?.length > 0) {
        const loadedMessages = response.data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          code_output: msg.code_output,
          workflow_data: msg.workflow_data,
          hasResult: !!msg.code_output
        }));
        setMessages(loadedMessages);

        // Find last assistant message with code and select it
        const lastAssistantIndex = loadedMessages.map((m, i) => ({ ...m, i })).filter(m => m.hasResult).pop()?.i;
        if (lastAssistantIndex !== undefined) {
          const lastMsg = loadedMessages[lastAssistantIndex];
          setSelectedMessageIndex(lastAssistantIndex);
          setResult(buildResultFromMessage(lastMsg));
          // Restore displayVersion from stored version
          if (lastMsg.workflow_data?.version) {
            setDisplayVersion(lastMsg.workflow_data.version);
            setCodeVersion(lastMsg.workflow_data.version);
          }
          // Restore agent messages if available
          if (lastMsg.workflow_data?.agent_messages) {
            setAgentMessages(lastMsg.workflow_data.agent_messages);
          }
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // --- Sidebar: fetch chat sessions ---
  const fetchSessions = useCallback(async () => {
    if (!isAuthenticated) {
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    try {
      const response = await authAxios.get('/sessions');
      setChatSessions(response.data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, [isAuthenticated, authAxios]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Relative time helper
  const timeAgo = (dateStr) => {
    const now = new Date();
    // MongoDB stores UTC — ensure the string is parsed as UTC
    let utcStr = dateStr;
    if (utcStr && !utcStr.endsWith('Z') && !utcStr.includes('+')) {
      utcStr += 'Z';
    }
    const date = new Date(utcStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const sidebarWidth = sidebarExpanded ? 280 : 72;

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
      resetAGUI();
      sessionCreatedRef.current = true;
      navigate('/chat');
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
      setProjectName('');
      setCodeVersion(0);
      resetAGUI();
      sessionCreatedRef.current = true;
      navigate(`/chat/${newSessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // Main submit handler
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

    setLoading(true);
    setStreamingCode('');
    setStreamingStats({ lines: 0, chars: 0 });
    setResult(null);
    setShowOriginal(false);
    setAgentMessages([]);
    setShowRightPanel(true);
    setRightPanelTab('code');
    resetAGUI();

    // Increment version on each new generation, and sync displayVersion
    const nextVersion = codeVersion + 1;
    setCodeVersion(nextVersion);
    setDisplayVersion(nextVersion);

    // Generate AI project name on first prompt (don't await — fire and forget)
    if (!projectName) {
      fetch(`${API_BASE}/generate-project-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
        .then(res => res.json())
        .then(data => {
          if (data.project_name) {
            setProjectName(data.project_name);
            // Persist the base project name to the session in MongoDB
            if (sessionId && token) {
              authAxios.patch(`/sessions/${sessionId}/project-name`, {
                project_name: data.project_name
              }).catch(err => console.error('Failed to save project name:', err));
            }
          }
        })
        .catch(err => console.error('Project name generation failed:', err));
    }

    try {
      // Include context_code if we have previously generated code
      const requestBody = {
        prompt,
        context_code: result?.code || null  // Send previous code for follow-up prompts
      };

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(`${API_BASE}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullCode = '';
      let originalCode = ''; // Store the first generated code before any fixes
      let agentResults = {};
      let finalAllFixes = [];
      let localAgentMessages = []; // Track agent messages locally for saving
      let setupGuideData = null; // Track setup guide for multi-file projects
      let projectDescData = null; // Track LLM project description
      const startTime = Date.now(); // Track start time for duration calculation

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = parseSSEData(line);
          if (!data) continue;

          processEvent(data);

          switch (data.type) {
            case 'start':
              setActiveAgent(data.source || data.payload?.agentName);
              const startMsg = {
                agent: data.source || data.payload?.agentName,
                message: data.payload?.message || `Starting ${data.payload?.agentName}...`,
                type: 'start',
                time: new Date().toLocaleTimeString()
              };
              localAgentMessages.push(startMsg);
              setAgentMessages(prev => [...prev, startMsg]);
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
              const progressMsg = {
                agent: data.source || data.payload?.agentName,
                message: data.payload?.message,
                progress: data.payload?.progress,
                type: 'progress',
                time: new Date().toLocaleTimeString()
              };
              localAgentMessages.push(progressMsg);
              setAgentMessages(prev => [...prev, progressMsg]);
              break;

            case 'code_update':
              // Capture original code before first fix is applied
              if (!originalCode && fullCode) {
                originalCode = fullCode;
              }
              fullCode = data.payload?.code || fullCode;
              setStreamingCode(fullCode);
              if (data.payload?.fixes) {
                finalAllFixes.push({
                  agent: data.source || data.payload?.ui?.agent,
                  fixes: data.payload?.fixes
                });
              }
              const codeUpdateMsg = {
                agent: data.source,
                message: `Applied ${data.payload?.fixCount || 0} fixes`,
                fixes: data.payload?.fixes,
                type: 'code_update',
                time: new Date().toLocaleTimeString()
              };
              localAgentMessages.push(codeUpdateMsg);
              setAgentMessages(prev => [...prev, codeUpdateMsg]);
              break;

            case 'agent_result':
              const agentKey = data.payload?.agentName?.toLowerCase() || data.source;
              agentResults[agentKey] = data.payload?.data;

              // Capture fixes from agent_result if present
              if (data.payload?.fixes && data.payload.fixes.length > 0) {
                finalAllFixes.push({
                  agent: data.payload?.agentName || data.source,
                  fixes: data.payload.fixes
                });
              }

              const resultMsg = {
                agent: data.payload?.agentName || data.source,
                message: data.payload?.stats?.fixesApplied
                  ? `Completed with ${data.payload.stats.fixesApplied} fixes`
                  : `Completed`,
                stats: data.payload?.stats,
                fixes: data.payload?.fixes,
                type: 'result',
                time: new Date().toLocaleTimeString()
              };
              localAgentMessages.push(resultMsg);
              setAgentMessages(prev => [...prev, resultMsg]);
              break;

            case 'setup_guide':
              // Capture setup instructions for multi-file projects
              setupGuideData = data.data || null;
              break;

            case 'project_description':
              // Capture LLM-generated project description for the chat card
              projectDescData = data.data || null;
              break;

            case 'complete':
              // Merge backend all_fixes with locally collected fixes
              const backendFixes = data.payload?.all_fixes || [];
              const mergedFixes = backendFixes.length > 0 ? backendFixes : finalAllFixes;

              // Calculate duration
              const duration = data.payload?.stats?.totalDuration || ((Date.now() - startTime) / 1000).toFixed(1);

              // Use our locally captured originalCode — do NOT fallback to result state (it may be stale)
              const finalOriginalCode = originalCode || null;

              const finalResult = {
                code: data.payload?.code || fullCode,
                original_code: finalOriginalCode,
                prompt: data.payload?.prompt,
                validation: agentResults.validator || data.payload?.validation,
                tests: agentResults.testing || agentResults['testing agent'] || data.payload?.tests,
                security: agentResults.security || agentResults['security agent'] || data.payload?.security,
                all_fixes: mergedFixes,
                code_was_fixed: data.payload?.code_was_fixed || mergedFixes.length > 0,
                total_fixes: data.payload?.total_fixes || mergedFixes.reduce((sum, f) => sum + (f.fixes?.length || 0), 0),
                project_desc: data.payload?.project_desc || projectDescData,
                workflow: data.payload?.workflow,
                stats: {
                  ...data.payload?.stats,
                  totalDuration: duration
                }
              };
              setResult(finalResult);
              setActiveAgent(null);
              break;

            default:
              break;
          }
        }
      }

      const deduplicatedFinalFixes = deduplicateFixes(finalAllFixes);
      const totalFixCount = deduplicatedFinalFixes.reduce((sum, f) => sum + (f.fixes?.length || 0), 0);
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      const assistantContent = `Generated ${fullCode.split('\n').length} lines of code${totalFixCount > 0 ? ` with ${totalFixCount} auto-fixes` : ''} in ${totalDuration}s`;

      // Use captured originalCode (code before any fixes were applied) — do NOT fallback to stale result
      const finalOriginalCodeForSave = originalCode || null;
      const savedResult = {
        code: fullCode,
        original_code: (totalFixCount > 0 && finalOriginalCodeForSave && finalOriginalCodeForSave !== fullCode) ? finalOriginalCodeForSave : null,
        all_fixes: finalAllFixes,
        code_was_fixed: totalFixCount > 0 || (originalCode && originalCode !== fullCode),
        total_fixes: totalFixCount,
        validation: agentResults.validator,
        tests: agentResults.testing || agentResults['testing agent'],
        security: agentResults.security || agentResults['security agent'],
        setup_guide: setupGuideData,
        project_desc: projectDescData,
        stats: {
          totalDuration: totalDuration,
          totalLines: fullCode.split('\n').length,
          totalFixes: totalFixCount
        }
      };

      // Update the result state with final values including original_code
      setResult(savedResult);

      const newAssistantMsg = {
        role: 'assistant',
        content: assistantContent,
        code_output: fullCode,
        workflow_data: {
          original_code: savedResult.original_code,
          all_fixes: finalAllFixes,
          code_was_fixed: savedResult.code_was_fixed,
          total_fixes: totalFixCount,
          validation: savedResult.validation,
          tests: savedResult.tests,
          security: savedResult.security,
          setup_guide: setupGuideData,
          project_desc: savedResult.project_desc,
          stats: savedResult.stats,
          version: nextVersion,
          agent_messages: localAgentMessages.slice(-20)
        },
        hasResult: true
      };
      setMessages(prev => {
        const updated = [...prev, newAssistantMsg];
        setSelectedMessageIndex(updated.length - 1);
        return updated;
      });

      if (sessionId && token) {
        try {
          // Build stats object for saving
          const statsToSave = {
            totalDuration: totalDuration,
            totalLines: fullCode.split('\n').length,
            totalFixes: totalFixCount
          };

          // Save message with full workflow_data including fixes
          await authAxios.post(`/sessions/${sessionId}/messages`, {
            role: 'assistant',
            content: assistantContent,
            code_output: fullCode,
            workflow_data: {
              original_code: savedResult.original_code,
              all_fixes: finalAllFixes,
              code_was_fixed: savedResult.code_was_fixed,
              total_fixes: totalFixCount,
              validation: savedResult.validation,
              tests: savedResult.tests,
              security: savedResult.security,
              setup_guide: setupGuideData,
              stats: statsToSave,
              version: nextVersion,
              agent_messages: localAgentMessages.slice(-20)
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
      if (error.name === 'AbortError') {
        console.log('Generation terminated by user');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏹ Generation stopped by user.'
        }]);
      } else {
        console.error('Error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error generating code. Please try again.'
        }]);
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      setPrompt('');
      // Trigger completion celebration
      setShowCompletion(true);
      setTimeout(() => setShowCompletion(false), 3000);
    }
  };


  const getAgentIcon = (agentId) => {
    const icons = {
      code_generator: '⚡',
      validator: '✓',
      testing: '⬡',
      security: '◈'
    };
    const key = agentId?.toLowerCase().replace(' agent', '').replace(' ', '_');
    return icons[key] || '◉';
  };

  // Terminate generation
  const handleTerminate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Handle clicking on a user message to edit
  const handleEditMessage = (index, content) => {
    if (loading) return;
    setEditingMessageIndex(index);
    setEditingContent(content);
  };

  // Handle saving edited message and resubmitting
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingContent.trim() || loading) return;

    // Remove all messages from this point onwards
    setMessages(prev => prev.slice(0, editingMessageIndex));

    // Reset results
    setResult(null);
    setStreamingCode('');
    setAgentMessages([]);

    // Close edit mode
    setEditingMessageIndex(null);

    // Set prompt and trigger submit
    const newPrompt = editingContent;
    setEditingContent('');
    setPrompt(newPrompt);

    // Trigger form submission after state updates
    setTimeout(() => {
      document.querySelector('.input-form')?.requestSubmit();
    }, 50);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditingContent('');
  };

  // Generate a rich description for the code — language-aware (Python + JS/React)
  const generateDescription = (code, prompt) => {
    if (!code) return null;

    const lines = code.split('\n').length;
    const promptLower = prompt?.toLowerCase() || '';

    // ── Language detection ─────────────────────────────────────────
    const isReact = code.includes("from 'react'") || code.includes('useState') || code.includes('useEffect') || code.includes('import React');
    const isJS = !isReact && (code.includes('export default') || code.includes('export const') || code.includes('const ') || code.includes('function '));

    let desc = { title: '', summary: '', keyPoints: [], features: [], structure: '' };

    // ── Prompt-based title (works for all languages) ───────────────
    if (promptLower.includes('auth') || promptLower.includes('login')) desc.title = '🔐 Authentication System';
    else if (promptLower.includes('landing')) desc.title = '🌟 Landing Page';
    else if (promptLower.includes('dashboard')) desc.title = '📊 Dashboard';
    else if (promptLower.includes('todo') || promptLower.includes('task')) desc.title = '✅ Todo Application';
    else if (promptLower.includes('chat') || promptLower.includes('message')) desc.title = '💬 Chat Interface';
    else if (promptLower.includes('api') || promptLower.includes('fetch')) desc.title = '🌐 API Integration';
    else if (promptLower.includes('database') || promptLower.includes(' db ')) desc.title = '🗄️ Database Handler';
    else if (promptLower.includes('rate limit')) desc.title = '⏱️ Rate Limiter';
    else if (promptLower.includes('cache')) desc.title = '💾 Caching System';
    else if (promptLower.includes('test')) desc.title = '🧪 Testing Utilities';
    else if (promptLower.includes('calculator') || promptLower.includes('calc')) desc.title = '🧮 Calculator App';

    // ══════════════════════════════════════════════════════════════
    // ── JS / REACT branch ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    if (isReact || isJS) {
      // Title fallback
      if (!desc.title) {
        if (isReact) desc.title = '⚛️ React Application';
        else desc.title = '⚡ JavaScript Module';
      }

      // Component names (PascalCase)
      const components = [...new Set([
        ...(code.match(/export\s+default\s+(?:function\s+)?([A-Z]\w+)/g) || []).map(m => m.replace(/export\s+default\s+(?:function\s+)?/, '')),
        ...(code.match(/(?:function|const)\s+([A-Z]\w+)\s*[=(]/g) || []).map(m => m.replace(/(?:function|const)\s+/, '').replace(/\s*[=(].*/, '')),
      ])].filter(c => c.length > 1 && c !== 'React');

      // Override title with primary component if more specific
      if (components.length > 0 && desc.title === '⚛️ React Application') {
        desc.title = `⚛️ ${components[0]} App`;
      }

      // Regular JS functions (camelCase)
      const jsFuncs = [...new Set(
        (code.match(/(?:function|const)\s+([a-z]\w+)\s*[=(]/g) || []).map(m => m.replace(/(?:function|const)\s+/, '').replace(/\s*[=(].*/, ''))
      )].filter(f => f.length > 2 && !['true', 'false', 'null', 'let', 'var', 'async'].includes(f));

      // React hooks used
      const hooks = [...new Set((code.match(/\buse[A-Z]\w+/g) || []))];

      // Import count
      const jsImports = (code.match(/^import\s/gm) || []).length;

      // File count (multi-file marker)
      const fileCount = (code.match(/={3,}\s+[\w./]+\s+={3,}/g) || []).length;

      // Summary
      if (components.length > 0) {
        desc.summary = `I've built **${components[0]}**${components.length > 1 ? ` along with ${components.length - 1} other component${components.length > 2 ? 's' : ''}` : ''}. The code follows modern React best practices and is production-ready.`;
      } else if (jsFuncs.length > 0) {
        desc.summary = `I've implemented **${jsFuncs[0]}**${jsFuncs.length > 1 ? ` and ${jsFuncs.length - 1} other function${jsFuncs.length > 2 ? 's' : ''}` : ''}. Clean, modular, and well-structured JavaScript.`;
      } else {
        desc.summary = `Here's a ${isReact ? 'React' : 'JavaScript'} implementation tailored to your request. Structured for maintainability with modern best practices.`;
      }

      // Key components
      components.slice(0, 4).forEach(c => {
        const role = /[Pp]age/.test(c) ? 'Full page view' : /[Ff]orm/.test(c) ? 'Handles user input' : /[Ll]ist/.test(c) ? 'Renders item collection' : /[Ii]tem/.test(c) ? 'Individual item display' : /[Nn]av/.test(c) ? 'Navigation bar' : /[Mm]odal/.test(c) ? 'Overlay dialog' : /[Hh]eader/.test(c) ? 'Page header' : /[Ff]ooter/.test(c) ? 'Page footer' : /[Ss]idebar/.test(c) ? 'Side panel' : /[Cc]ard/.test(c) ? 'Card display' : /[Aa]pp/.test(c) ? 'Root application' : 'React component';
        desc.keyPoints.push(`**${c}** - ${role}`);
      });
      jsFuncs.slice(0, Math.max(0, 4 - components.length)).forEach(f => {
        const role = /fetch|load|get/.test(f) ? 'Fetches / loads data' : /handle|on[A-Z]/.test(f) ? 'Event handler' : /format|parse|convert/.test(f) ? 'Data transformation' : /validate|check/.test(f) ? 'Input validation' : /save|store|persist/.test(f) ? 'Persists data' : /render/.test(f) ? 'Renders UI' : 'Helper function';
        desc.keyPoints.push(`\`${f}()\` - ${role}`);
      });

      // React/JS features
      if (hooks.includes('useState')) desc.features.push('**State management** with React hooks');
      if (hooks.includes('useEffect')) desc.features.push('**Side effects** handled via useEffect');
      if (hooks.includes('useContext') || code.includes('createContext')) desc.features.push('**Context API** for global state');
      if (hooks.includes('useCallback') || hooks.includes('useMemo')) desc.features.push('**Performance optimised** with memoization');
      if (hooks.includes('useRef')) desc.features.push('**DOM refs** for element access');
      if (code.includes('fetch(') || code.includes('axios')) desc.features.push('**API calls** with async data fetching');
      if (code.includes('async ') && code.includes('await ')) desc.features.push('**Async/await** for non-blocking operations');
      if (code.includes('try') && code.includes('catch')) desc.features.push('**Error handling** with try/catch');
      if (code.includes('localStorage') || code.includes('sessionStorage')) desc.features.push('**Persistent storage** via localStorage');
      if (code.includes('useNavigate') || code.includes('BrowserRouter') || code.includes('<Route')) desc.features.push('**Client-side routing** with React Router');
      if (code.includes('@media') || code.includes('responsive')) desc.features.push('**Responsive design** for all screens');
      if (code.includes('animation') || code.includes('transition') || code.includes('framer')) desc.features.push('**Smooth animations** for polished UX');
      if (code.includes('.test.') || code.includes('describe(') || code.includes('it(')) desc.features.push('**Unit tests** included');
      if (code.includes('PropTypes') || code.includes(': Props')) desc.features.push('**Typed props** for component contracts');

      // Structure
      desc.structure = `${lines} lines • ${jsImports} import${jsImports !== 1 ? 's' : ''}${components.length ? ` • ${components.length} component${components.length > 1 ? 's' : ''}` : ''}${hooks.length ? ` • ${hooks.length} hook${hooks.length > 1 ? 's' : ''}` : ''}${fileCount > 1 ? ` • ${fileCount} files` : ''}`;
      return desc;
    }

    // ══════════════════════════════════════════════════════════════
    // ── PYTHON branch ─────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    const pyImports   = (code.match(/^(?:import |from )/gm) || []).length;
    const classMatch  = [...new Set((code.match(/class\s+(\w+)/g) || []).map(c => c.replace('class ', '')))];
    const funcMatch   = [...new Set((code.match(/def\s+(\w+)/g) || []).map(f => f.replace('def ', '')).filter(f => !f.startsWith('_')))];
    const publicMethods = funcMatch.filter(f => !f.startsWith('__'));

    const hasAsync      = code.includes('async ');
    const hasErrorH     = code.includes('try:') || code.includes('except');
    const hasLogging    = code.includes('logging') || code.includes('logger');
    const hasTypeHints  = code.includes(': str') || code.includes(': int') || code.includes('-> ');
    const hasDocstrings = code.includes('"""') || code.includes("'''");
    const hasDecorators = (code.match(/@\w+/g) || []).length > 0;
    const hasDataclass  = code.includes('@dataclass');
    const hasValidation = code.includes('raise ') || code.includes('ValueError') || code.includes('assert');

    // Title fallback
    if (!desc.title) {
      if (classMatch.length > 0) desc.title = `📦 ${classMatch[0]} Class`;
      else if (publicMethods.length > 0) desc.title = `⚡ ${publicMethods[0]} Function`;
      else desc.title = '✨ Generated Code';
    }

    // Summary
    if (classMatch.length > 0) {
      const methodCount = publicMethods.length;
      desc.summary = `I've created a **${classMatch[0]}** class with ${methodCount} method${methodCount !== 1 ? 's' : ''}. The code follows Python best practices and includes proper error handling.`;
    } else if (publicMethods.length > 0) {
      desc.summary = `I've implemented **${publicMethods[0]}**${publicMethods.length > 1 ? ` along with ${publicMethods.length - 1} helper function${publicMethods.length > 2 ? 's' : ''}` : ''}. Production-ready with comprehensive error handling.`;
    } else {
      desc.summary = `Here's a Python implementation tailored to your request. Structured for maintainability following best practices.`;
    }

    // Key points
    classMatch.slice(0, 2).forEach(c => desc.keyPoints.push(`**${c}** - Main class encapsulating the logic`));
    publicMethods.slice(0, Math.max(0, 4 - classMatch.length)).forEach(m => {
      const role = m.includes('init') ? 'Initializes instance' : m.includes('get') ? 'Retrieves data' : m.includes('set') ? 'Updates configuration' : m.includes('validate') ? 'Validates input' : m.includes('create') ? 'Creates new resource' : m.includes('delete') ? 'Removes resource' : m.includes('update') ? 'Updates data' : m.includes('parse') ? 'Parses input' : 'Core functionality';
      desc.keyPoints.push(`\`${m}()\` - ${role}`);
    });

    // Features
    if (hasAsync)      desc.features.push('**Async/await** for non-blocking I/O operations');
    if (hasErrorH)     desc.features.push('**Exception handling** with proper error recovery');
    if (hasTypeHints)  desc.features.push('**Type hints** for better IDE support and documentation');
    if (hasDocstrings) desc.features.push('**Docstrings** explaining function behaviour');
    if (hasLogging)    desc.features.push('**Logging** for debugging and monitoring');
    if (hasDecorators) desc.features.push('**Decorators** for clean, reusable patterns');
    if (hasValidation) desc.features.push('**Input validation** preventing bad data');
    if (hasDataclass)  desc.features.push('**Dataclasses** for clean data structures');
    if (code.includes('hashlib') || code.includes('bcrypt')) desc.features.push('**Secure hashing** for sensitive data');
    if (code.includes('retry') || code.includes('backoff')) desc.features.push('**Retry logic** with exponential backoff');
    if (code.includes('threading') || code.includes('asyncio')) desc.features.push('**Concurrency** support built-in');

    desc.structure = `${lines} lines • ${pyImports} import${pyImports !== 1 ? 's' : ''}${classMatch.length ? ` • ${classMatch.length} class${classMatch.length > 1 ? 'es' : ''}` : ''}${publicMethods.length ? ` • ${publicMethods.length} function${publicMethods.length > 1 ? 's' : ''}` : ''}`;
    return desc;
  };

  // Normalize agent name to consistent format
  const normalizeAgentName = (name) => {
    if (!name) return 'Unknown';
    const lower = name.toLowerCase().replace(' agent', '').replace('_', ' ');
    // Capitalize first letter
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  // Deduplicate and merge fixes by normalized agent name
  const deduplicateFixes = (fixes) => {
    const merged = {};
    for (const item of fixes) {
      const normalizedName = normalizeAgentName(item.agent);
      if (!merged[normalizedName]) {
        merged[normalizedName] = { agent: normalizedName, fixes: [] };
      }
      // Add fixes if not already present (check by description)
      const existingDescs = new Set(merged[normalizedName].fixes.map(f =>
        typeof f === 'object' ? f.description : f
      ));
      for (const fix of (item.fixes || [])) {
        const desc = typeof fix === 'object' ? fix.description : fix;
        if (!existingDescs.has(desc)) {
          merged[normalizedName].fixes.push(fix);
          existingDescs.add(desc);
        }
      }
    }
    return Object.values(merged).filter(m => m.fixes.length > 0);
  };

  // Calculate deduplicated total fixes
  const deduplicatedFixes = result?.all_fixes ? deduplicateFixes(result.all_fixes) : [];
  const totalFixes = deduplicatedFixes.reduce((sum, f) => sum + (f.fixes?.length || 0), 0);

  return (
    <div className={`genui-v2 ${isResizing ? 'resizing' : ''} ${theme === 'light' ? 'light' : ''}`}>
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarExpanded && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      {/* Expandable Sidebar */}
      <aside className={`genui-v2-sidebar ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/" className="brand-link">
            <UCGLogo size={28} />
            {sidebarExpanded && <span className="brand-text-full">UCG</span>}
            {!sidebarExpanded && <span className="brand-text">UCG</span>}
          </Link>
        </div>

        <nav className="sidebar-actions">
          <button className="action-btn primary" onClick={createSession}>
            <span>+</span>
            {sidebarExpanded && <span className="action-label">New Chat</span>}
            {!sidebarExpanded && <span>New</span>}
          </button>
          <Link to="/dashboard" className="action-btn">
            <span><IconDashboard /></span>
            {sidebarExpanded && <span className="action-label">Dashboard</span>}
            {!sidebarExpanded && <span>History</span>}
          </Link>

          <button
            className="action-btn sidebar-toggle"
            onClick={() => setSidebarExpanded(!sidebarExpanded)}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className={`toggle-arrow ${sidebarExpanded ? 'expanded' : ''}`}>›</span>
            {sidebarExpanded && <span className="action-label">Collapse</span>}
          </button>
        </nav>

        {/* Chat Sessions List (expanded only) */}
        {sidebarExpanded && isAuthenticated && (
          <div className="sidebar-chats">
            <div className="chats-header">
              <span>Recent Chats</span>
              <span className="chats-count">{chatSessions.filter(s => s.message_count > 0).length}</span>
            </div>
            <div className="chats-list">
              {sessionsLoading ? (
                <SidebarSkeleton />
              ) : (
                <>
                  {chatSessions
                    .filter(session => session.message_count > 0)
                    .map((session) => (
                      <button
                        key={session.session_id}
                        className={`chat-item ${session.session_id === sessionId ? 'active' : ''}`}
                        onClick={() => {
                          navigate(`/chat/${session.session_id}`);
                        }}
                        title={session.title}
                      >
                        <span className="chat-icon"><IconChat /></span>
                        <div className="chat-item-info">
                          <span className="chat-item-title">{session.title || 'New Chat'}</span>
                          <span className="chat-item-meta">
                            {timeAgo(session.updated_at)}
                            {session.message_count > 0 && (
                              <span className="chat-msg-count">· {session.message_count} msgs</span>
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                  {chatSessions.filter(s => s.message_count > 0).length === 0 && (
                    <div className="chats-empty">No active chats</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <UserMenu />
        </div>
      </aside>

      {/* Main Chat Area */}
      <main
        className={`genui-v2-main ${showRightPanel && (streamingCode || result) ? 'with-panel' : ''}`}
        style={showRightPanel && (streamingCode || result) && !isMobile ? { maxWidth: `calc(100vw - ${sidebarWidth}px - ${panelWidth}px)` } : {}}
      >
        {/* Header */}
        <header className="main-header">
          <div className="header-title">
            {/* Mobile hamburger */}
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              aria-label="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1>{sessionTitle}</h1>
            <Badge variant="primary" size="sm">GenUI</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            {(streamingCode || result) && (
              <button
                className="panel-toggle"
                onClick={() => setShowRightPanel(!showRightPanel)}
              >
                {showRightPanel ? '◀ Hide Panel' : '▶ Show Panel'}
              </button>
            )}
          </div>
        </header>

        {/* Floating Workflow Indicator */}
        {loading && (
          <motion.div
            className="floating-workflow"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="workflow-steps">
              {['Code Gen', 'Validate', 'Test', 'Secure'].map((step, i) => {
                const agents = ['code_generator', 'validator', 'testing', 'security'];
                const isActive = activeAgent?.toLowerCase().includes(agents[i].split('_')[0]);
                const isDone = agentMessages.some(m =>
                  m.agent?.toLowerCase().includes(agents[i].split('_')[0]) && m.type === 'result'
                );
                return (
                  <React.Fragment key={step}>
                    <div className={`workflow-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                      <span className="step-icon">{isDone ? '✓' : ['⚡', '✓', '🧪', '🛡️'][i]}</span>
                      <span className="step-name">{step}</span>
                    </div>
                    {i < 3 && (
                      <div className={`workflow-connector ${isDone ? 'filled' : ''} ${isActive ? 'active' : ''}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 && !loading && (
            <div className="welcome-screen welcome-centered">
              {/* Ambient glow behind the orb */}
              <div className="welcome-ambient-glow" />
              <div className="welcome-ambient-glow-inner" />

              {/* 1. God Particle Orb — negative margin so prompt overlaps it */}
              <div className="welcome-orb-wrapper">
                <Suspense fallback={<OrbFallback />}>
                  <GodParticleOrb size={500} />
                </Suspense>
              </div>

              {/* 2. Full-width glass pill prompt bar — overlaps the orb bottom */}
              <div className="glass-prompt-wrapper">
                <div className="glass-prompt-glow" />
                <div className="glass-prompt-overlay">
                  <div className="glass-prompt-shine" />
                  <div className="glass-prompt-volume" />
                  <form onSubmit={handleSubmit} className="glass-prompt-form">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what you want to build..."
                      disabled={loading}
                      className="glass-prompt-input"
                    />
                    <button type="submit" disabled={!prompt.trim()} className="glass-prompt-btn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* 3. Title + subtitle + badge below */}
              <div className="welcome-text-below">
                <h2>Uber Code Generator</h2>
                <p className="welcome-subtitle">Describe what you want to build. 4 AI agents will generate, validate, test, and secure your code.</p>
                <div className="welcome-powered-badge">
                  <span className="powered-dot" />
                  <span>Powered by Llama 3.3 via Groq</span>
                </div>
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                className={`message ${msg.role} ${editingMessageIndex === index ? 'editing' : ''} ${msg.role === 'assistant' && msg.hasResult && selectedMessageIndex === index ? 'selected' : ''} ${msg.role === 'assistant' && msg.hasResult ? 'clickable' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => msg.role === 'assistant' && msg.hasResult && selectMessage(index)}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? <IconUser /> : <IconBot />}
                </div>
                <div className="message-body">
                  {/* Editable user message */}
                  {msg.role === 'user' && editingMessageIndex === index ? (
                    <form className="edit-message-form" onSubmit={handleSaveEdit}>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        autoFocus
                        rows={3}
                      />
                      <div className="edit-actions">
                        <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                          Cancel
                        </button>
                        <button type="submit" className="save-btn" disabled={!editingContent.trim()}>
                          Save & Submit
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>{msg.content}</p>
                      {msg.role === 'user' && !loading && (
                        <button
                          className="edit-message-btn"
                          onClick={() => handleEditMessage(index, msg.content)}
                          title="Edit message"
                        >
                          ✎
                        </button>
                      )}
                    </>
                  )}

                  {/* Code description for assistant messages with results */}
                  {msg.role === 'assistant' && msg.hasResult && msg.code_output && (() => {
                    const fallbackDesc = generateDescription(msg.code_output, messages[index - 1]?.content);
                    const desc = msg.workflow_data?.project_desc ? { ...fallbackDesc, ...msg.workflow_data.project_desc } : fallbackDesc;
                    const msgFixes = msg.workflow_data?.all_fixes || [];
                    const msgDedupFixes = deduplicateFixes(msgFixes);
                    const msgTotalFixes = msgDedupFixes.reduce((sum, f) => sum + (f.fixes?.length || 0), 0);
                    return desc ? (
                      <div className="code-description">
                        <div className="desc-header">
                          <span className="desc-title">{desc.title}</span>
                        </div>
                        <p className="desc-summary" dangerouslySetInnerHTML={{
                          __html: desc.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />

                        {desc.keyPoints.length > 0 && (
                          <div className="desc-key-points">
                            <span className="section-label">Key Components:</span>
                            <ul>
                              {desc.keyPoints.map((point, i) => (
                                <li key={i} dangerouslySetInnerHTML={{
                                  __html: point.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`(.*?)`/g, '<code>$1</code>')
                                }} />
                              ))}
                            </ul>
                          </div>
                        )}

                        {desc.features.length > 0 && (
                          <div className="desc-features-section">
                            <span className="section-label">Features:</span>
                            <ul className="desc-features">
                              {desc.features.slice(0, 5).map((feat, i) => (
                                <li key={i} dangerouslySetInnerHTML={{
                                  __html: feat.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                }} />
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="desc-footer">
                          <span className="desc-structure">{desc.structure}</span>
                          {msgTotalFixes > 0 && (
                            <span className="desc-fixes">🔧 {msgTotalFixes} auto-fixes applied</span>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Setup guide for multi-file projects */}
                  {msg.role === 'assistant' && msg.hasResult && msg.workflow_data?.setup_guide && (
                    <SetupGuide data={msg.workflow_data.setup_guide} />
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                className="message assistant"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="message-avatar"><IconBot /></div>
                <div className="message-body">
                  <div className="typing-indicator">
                    <span className="typing-text">
                      {activeAgent ? `${getAgentIcon(activeAgent)} ${activeAgent}` : 'Processing'}
                    </span>
                    <span className="typing-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - only show at bottom when there are messages or actively loading */}
        {(messages.length > 0 || loading) && (
          <div className="input-container">
            <form onSubmit={handleSubmit} className="input-form">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the code you want to generate..."
                disabled={loading}
              />
              {loading ? (
                <button type="button" className="terminate-btn" onClick={handleTerminate} title="Stop generation">
                  <div className="stop-icon" />
                </button>
              ) : (
                <button type="submit" disabled={!prompt.trim()}>
                  <span>→</span>
                </button>
              )}
            </form>
            <p className="input-hint">Powered by Llama 3.3 via Groq • 4 AI Agents</p>
          </div>
        )}
      </main>

      {/* Right Panel - Results */}
      <AnimatePresence>
        {showRightPanel && (streamingCode || result) && (
          <>
            {/* Resize Handle */}
            <div
              className={`panel-resize-handle ${isResizing ? 'active' : ''}`}
              onMouseDown={startResize}
            >
              <div className="resize-grip">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <motion.aside
              className="genui-v2-panel"
              style={{ width: panelWidth }}
              initial={{ width: 0, opacity: 0 }}
              animate={isResizing ? undefined : { width: panelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Panel Tabs */}
              <div className="panel-tabs">
                {/* Mobile back button */}
                {isMobile && (
                  <button 
                    className="panel-back-btn"
                    onClick={() => setShowRightPanel(false)}
                    title="Back to chat"
                  >
                    ← Chat
                  </button>
                )}
                <button
                  className={rightPanelTab === 'code' ? 'active' : ''}
                  onClick={() => setRightPanelTab('code')}
                >
                  <IconCode /> Code
                  {loading && <span className="live-dot"></span>}
                </button>
                <button
                  className={rightPanelTab === 'agents' ? 'active' : ''}
                  onClick={() => setRightPanelTab('agents')}
                >
                  <IconCpu /> Agents
                  {agentMessages.length > 0 && <span className="count">{agentMessages.length}</span>}
                </button>
                <button
                  className={rightPanelTab === 'fixes' ? 'active' : ''}
                  onClick={() => setRightPanelTab('fixes')}
                >
                  <IconWrench /> Fixes
                  {totalFixes > 0 && <span className="count">{totalFixes}</span>}
                </button>
              </div>

              {/* Panel Content */}
              <div className="panel-content">
                {/* Code Tab */}
                {rightPanelTab === 'code' && (
                  <div className="code-panel">
                    <div className="code-header">
                      <div className="code-stats">
                        <span>{streamingStats.lines || result?.code?.split('\n').length || 0} lines</span>
                        {result?.code_was_fixed && (
                          <Badge variant="success" size="sm">✓ Fixed</Badge>
                        )}
                      </div>
                      <div className="code-actions">
                        {result?.original_code && (
                          <button onClick={() => setShowOriginal(!showOriginal)}>
                            {showOriginal ? 'Show Fixed' : 'Show Original'}
                          </button>
                        )}
                        <button onClick={() => {
                          const codeToCopy = showOriginal ? result?.original_code : (result?.code || streamingCode);
                          if (codeToCopy) {
                            navigator.clipboard.writeText(codeToCopy);
                            const btn = document.querySelector('.copy-code-btn');
                            if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '📋 Copy Code', 1500); }
                          }
                        }} className="copy-code-btn">📋 Copy Code</button>
                      </div>
                    </div>

                    <div className={`code-view ${loading ? 'streaming' : ''} ${showCompletion ? 'completion-flash' : ''}`}>
                      <TabbedCodeBlock
                        code={showOriginal ? result?.original_code : (result?.code || streamingCode)}
                        maxHeight="calc(100vh - 250px)"
                        projectName={projectName}
                        version={displayVersion}
                      />
                      {loading && <span className="streaming-cursor" />}
                    </div>

                    {loading && (
                      <div className="streaming-bar">
                        <span className="pulse">●</span>
                        <span>Streaming... {streamingStats.lines} lines</span>
                      </div>
                    )}

                    {showCompletion && (
                      <div className="completion-badge">
                        <svg className="checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        Generation Complete
                      </div>
                    )}
                  </div>
                )}

                {/* Agents Tab */}
                {rightPanelTab === 'agents' && (
                  <div className="agents-panel">
                    {/* Stats Row */}
                    {result && (
                      <div className="stats-row">
                        <div className="stat-item">
                          <span className="stat-value">{result.code?.split('\n').length || 0}</span>
                          <span className="stat-label">Lines</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{totalFixes}</span>
                          <span className="stat-label">Fixes</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">
                            {result.stats?.totalDuration ? `${result.stats.totalDuration}s` : '-'}
                          </span>
                          <span className="stat-label">Time</span>
                        </div>
                      </div>
                    )}

                    {/* Agent Feed - Deduplicated */}
                    <div className="agent-feed">
                      <AnimatePresence>
                        {(() => {
                          // Deduplicate agent messages by normalizing names and keeping latest
                          const seen = new Map();
                          const deduped = [];
                          for (const msg of agentMessages) {
                            const key = `${normalizeAgentName(msg.agent)}-${msg.type}`;
                            if (!seen.has(key) || msg.type === 'result') {
                              seen.set(key, deduped.length);
                              deduped.push({ ...msg, agent: normalizeAgentName(msg.agent) });
                            }
                          }
                          return deduped;
                        })().map((msg, i) => (
                          <motion.div
                            key={i}
                            className={`agent-item ${msg.type}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                          >
                            <span className="agent-icon">{getAgentIcon(msg.agent)}</span>
                            <div className="agent-info">
                              <span className="agent-name">{msg.agent}</span>
                              <span className="agent-msg">{msg.message}</span>
                            </div>
                            <span className="agent-time">{msg.time}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Agent Results */}
                    {result && (
                      <div className="agent-results">
                        <Tabs
                          tabs={[
                            {
                              id: 'validation',
                              label: 'Validator',
                              icon: '✓',
                              content: (
                                <div className="agent-detail">
                                  <p>
                                    {result.validation?.status === 'passed' ? '✅ Validation passed' :
                                     result.validation?.status === 'warnings' ? '⚠️ Passed with warnings' :
                                     result.validation?.status === 'failed' ? '❌ Validation failed' :
                                     '✅ Code validated'}
                                    {' — '}
                                    {result.validation?.issues?.length || 0} issues, {result.validation?.fixes_applied?.length || 0} fixes
                                  </p>
                                  {result.validation?.fixes_applied?.length > 0 && (
                                    <Badge variant="success">{result.validation.fixes_applied.length} fixes</Badge>
                                  )}
                                  {result.validation?.issues?.length > 0 && (
                                    <div className="agent-issues">
                                      {result.validation.issues.slice(0, 3).map((issue, idx) => (
                                        <p key={idx} className="agent-issue-item">• {issue}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            },
                            {
                              id: 'testing',
                              label: 'Testing',
                              icon: '🧪',
                              content: (
                                <div className="agent-detail">
                                  <p>
                                    {result.tests?.status === 'all_passed' ? '✅ All tests passed' :
                                     result.tests?.status === 'warnings' ? '⚠️ Warnings found' :
                                     result.tests?.status === 'failed' ? '❌ Tests failed' :
                                     '✅ Testing complete'}
                                    {result.tests?.fixes_applied?.length > 0 && ` — ${result.tests.fixes_applied.length} improvements`}
                                  </p>
                                  {result.tests?.testability_score && (
                                    <Badge variant="primary">Testability: {result.tests.testability_score}/100</Badge>
                                  )}
                                  {result.tests?.issues_found?.length > 0 && (
                                    <div className="agent-issues">
                                      {result.tests.issues_found.slice(0, 3).map((issue, idx) => (
                                        <p key={idx} className="agent-issue-item">• {issue}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            },
                            {
                              id: 'security',
                              label: 'Security',
                              icon: '🛡️',
                              content: (
                                <div className="agent-detail">
                                  <p>
                                    {result.security?.status === 'secure' ? '✅ No vulnerabilities found' :
                                     '⚠️ Vulnerabilities found'}
                                    {result.security?.risk_level && ` — Risk: ${result.security.risk_level}`}
                                    {result.security?.fixes_applied?.length > 0 && ` — ${result.security.fixes_applied.length} fixes`}
                                  </p>
                                  {result.security?.risk_level && (
                                    <Badge variant={
                                      result.security.risk_level === 'LOW' ? 'success' :
                                      result.security.risk_level === 'MEDIUM' ? 'warning' : 'danger'
                                    }>
                                      Risk: {result.security.risk_level}
                                    </Badge>
                                  )}
                                  {result.security?.vulnerabilities?.length > 0 && (
                                    <div className="agent-issues">
                                      {result.security.vulnerabilities.slice(0, 3).map((v, idx) => (
                                        <p key={idx} className="agent-issue-item">
                                          • [{v.severity}] {v.type}: {v.description}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Fixes Tab */}
                {rightPanelTab === 'fixes' && (
                  <div className="fixes-panel">
                    {result?.all_fixes && result.all_fixes.length > 0 ? (
                      <div className="fixes-list">
                        {deduplicateFixes(result.all_fixes).map((agentFix, i) => (
                          <Expandable
                            key={i}
                            title={`${agentFix.agent} (${agentFix.fixes?.length || 0})`}
                            icon={getAgentIcon(agentFix.agent)}
                            expanded={i === 0}
                          >
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
                          </Expandable>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <span>✓</span>
                        <p>No fixes needed - code generated cleanly!</p>
                      </div>
                    )}

                    {/* Code Diff */}
                    {result?.code_was_fixed && result?.original_code && (
                      <div className="diff-section">
                        <h4>Full Diff</h4>
                        <CodeDiff
                          before={result.original_code}
                          after={result.code}
                          title=""
                          expanded={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Usage Limit Modal for guests */}
      <UsageLimitModal
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        onSignInSuccess={() => {
          setShowUsageLimitModal(false);
          // User is now authenticated, they can continue
        }}
      />
    </div>
  );
};

export default GenUIChatPageV2;
