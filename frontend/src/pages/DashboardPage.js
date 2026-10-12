import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import ConfirmModal from '../components/ConfirmModal';
import ScrollReveal, { StaggerContainer, StaggerItem } from '../components/ScrollReveal';
import AnimatedCounter from '../components/AnimatedCounter';
import ParticleNetwork from '../components/ParticleNetwork';
import SpotlightCard from '../components/SpotlightCard';
import { UCGLogo } from './LandingPage';
import './DashboardPage.css';

const IconSunDash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconMoonDash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// --- Custom SVG Dashboard Icons ---
const IconBarChart = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

const IconChatBubble = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h8" /><path d="M8 14h4" />
  </svg>
);

const IconSparkles = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
  </svg>
);

const IconAgents = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" />
    <path d="M9 15h6" />
  </svg>
);

const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

const IconFlask = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6" /><path d="M10 3v6.5L4 19a1 1 0 0 0 .85 1.5h14.3A1 1 0 0 0 20 19l-6-9.5V3" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
  </svg>
);

const IconPen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const IconSelect = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12l2 2 4-4" />
  </svg>
);

const IconBroom = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2 7h-4l2-7z" /><path d="M8 9h8l1 13H7L8 9z" /><path d="M10 13v5" /><path d="M14 13v5" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const IconSession = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14,2 14,8 20,8" /><path d="M8 13h8" /><path d="M8 17h5" />
  </svg>
);

const DashboardPage = () => {
  const { authAxios, user, isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState(new Set());

  // Theme state — synced with landing page and chat via localStorage
  const [theme, setTheme] = useState(() => localStorage.getItem('ucg-theme') || 'dark');
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ucg-theme', next);
      return next;
    });
  }, []);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'danger'
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const fetchSessions = useCallback(async () => {
    try {
      const response = await authAxios.get('/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchSessions]);

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedSessions(new Set());
  };

  const toggleSessionSelection = (sessionId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const selectAll = () => {
    if (selectedSessions.size === sessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(sessions.map(s => s.session_id)));
    }
  };

  const deleteSelectedSessions = () => {
    if (selectedSessions.size === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Sessions',
      message: `Are you sure you want to delete ${selectedSessions.size} selected session(s)? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await authAxios.post('/sessions/bulk-delete', {
            session_ids: Array.from(selectedSessions)
          });
          setSessions(prev => prev.filter(s => !selectedSessions.has(s.session_id)));
          setSelectedSessions(new Set());
          setSelectMode(false);
        } catch (error) {
          console.error('Error deleting sessions:', error);
        }
      }
    });
  };

  const cleanupEmptySessions = () => {
    const emptySessions = sessions.filter(s => s.message_count === 0);
    if (emptySessions.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'No Empty Sessions',
        message: 'There are no empty sessions to clean up.',
        variant: 'info',
        onConfirm: () => { }
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Clean Up Empty Sessions',
      message: `Are you sure you want to delete ${emptySessions.length} empty session(s)? This action cannot be undone.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          await authAxios.post('/sessions/cleanup-empty');
          setSessions(prev => prev.filter(s => s.message_count > 0));
        } catch (error) {
          console.error('Error cleaning up sessions:', error);
        }
      }
    });
  };

  const deleteSession = (sessionId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const session = sessions.find(s => s.session_id === sessionId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Session',
      message: `Are you sure you want to delete "${session?.title || 'New Chat'}"? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await authAxios.delete(`/sessions/${sessionId}`);
          setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        } catch (error) {
          console.error('Error deleting session:', error);
        }
      }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) {
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return days === 1 ? 'Yesterday' : `${days} days ago`;
    }

    return date.toLocaleDateString();
  };

  const agents = [
    { name: 'Code Generator', icon: <IconBolt />, status: 'active', description: 'Generates code from natural language' },
    { name: 'Validator', icon: <IconCheckCircle />, status: 'active', description: 'Checks code quality and style' },
    { name: 'Testing Agent', icon: <IconFlask />, status: 'active', description: 'Runs automated tests' },
    { name: 'Security Agent', icon: <IconShield />, status: 'active', description: 'Scans for vulnerabilities' }
  ];

  return (
    <div className={`dashboard-page ${theme === 'light' ? 'dashboard-light' : ''}`}>
      <ParticleNetwork />
      {/* Header */}
      <header className="dashboard-header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <UCGLogo size={28} />
            <span>Uber Code Generator</span>
          </Link>
          <nav className="nav">
            <button className="theme-toggle-dash" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <IconSunDash /> : <IconMoonDash />}
            </button>
            <Link to="/chat" className="btn btn-primary">New Generation</Link>
            {user && <UserMenu />}
          </nav>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="container">
          {/* Stats Section */}
          <section className="stats-section">
            <ScrollReveal direction="fadeUp">
              <h1>Dashboard</h1>
            </ScrollReveal>
            <StaggerContainer staggerDelay={0.1} className="stats-grid">
              <StaggerItem direction="fadeUp">
                <SpotlightCard className="stat-card" spotlightColor="rgba(249, 115, 22, 0.15)">
                  <div className="stat-icon"><IconBarChart /></div>
                  <div className="stat-info">
                    {loading ? (
                      <span className="stat-value"><span className="stat-skeleton" /></span>
                    ) : (
                      <span className="stat-value"><AnimatedCounter value={sessions.length} duration={800} /></span>
                    )}
                    <span className="stat-label">Total Sessions</span>
                  </div>
                </SpotlightCard>
              </StaggerItem>
              <StaggerItem direction="fadeUp">
                <SpotlightCard className="stat-card" spotlightColor="rgba(249, 115, 22, 0.15)">
                  <div className="stat-icon"><IconChatBubble /></div>
                  <div className="stat-info">
                    {loading ? (
                      <span className="stat-value"><span className="stat-skeleton" /></span>
                    ) : (
                      <span className="stat-value"><AnimatedCounter value={sessions.filter(s => s.message_count > 0).length} duration={800} /></span>
                    )}
                    <span className="stat-label">Active Chats</span>
                  </div>
                </SpotlightCard>
              </StaggerItem>
              <StaggerItem direction="fadeUp">
                <SpotlightCard className="stat-card" spotlightColor="rgba(249, 115, 22, 0.15)">
                  <div className="stat-icon"><IconSparkles /></div>
                  <div className="stat-info">
                    {loading ? (
                      <span className="stat-value"><span className="stat-skeleton" /></span>
                    ) : (
                      <span className="stat-value"><AnimatedCounter value={sessions.reduce((acc, s) => acc + (s.message_count || 0), 0)} duration={1200} /></span>
                    )}
                    <span className="stat-label">Total Messages</span>
                  </div>
                </SpotlightCard>
              </StaggerItem>
              <StaggerItem direction="fadeUp">
                <SpotlightCard className="stat-card" spotlightColor="rgba(249, 115, 22, 0.15)">
                  <div className="stat-icon"><IconAgents /></div>
                  <div className="stat-info">
                    <span className="stat-value"><AnimatedCounter value={4} duration={600} /></span>
                    <span className="stat-label">Active Agents</span>
                  </div>
                </SpotlightCard>
              </StaggerItem>
            </StaggerContainer>
          </section>

          {/* Agents Section */}
          <section className="agents-section">
            <ScrollReveal direction="fadeUp">
              <h2>Agent Status</h2>
            </ScrollReveal>
            <StaggerContainer staggerDelay={0.12} className="agents-grid">
              {agents.map((agent, index) => (
                <StaggerItem key={index} direction="fadeUp">
                  <SpotlightCard className="agent-card" spotlightColor="rgba(249, 115, 22, 0.1)">
                    <div className="agent-icon">{agent.icon}</div>
                    <div className="agent-info">
                      <h3>{agent.name}</h3>
                      <p>{agent.description}</p>
                    </div>
                    <div className={`agent-status ${agent.status}`}>
                      <span className="status-dot"></span>
                      {agent.status}
                    </div>
                  </SpotlightCard>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>

          {/* Workflow Diagram */}
          <section className="workflow-section">
            <ScrollReveal direction="fadeUp">
              <h2>Agent Orchestration Flow</h2>
            </ScrollReveal>
            <ScrollReveal direction="scaleIn" delay={0.2}>
              <div className="workflow-diagram">
                <div className="workflow-node start">
                  <span><IconPen /></span>
                  <label>User Prompt</label>
                </div>
                <div className="workflow-arrow"><IconArrowRight /></div>
                <div className="workflow-node">
                  <span><IconBolt /></span>
                  <label>Code Gen</label>
                </div>
                <div className="workflow-arrow"><IconArrowRight /></div>
                <div className="workflow-node">
                  <span><IconCheckCircle /></span>
                  <label>Validate</label>
                </div>
                <div className="workflow-arrow"><IconArrowRight /></div>
                <div className="workflow-node">
                  <span><IconFlask /></span>
                  <label>Test</label>
                </div>
                <div className="workflow-arrow"><IconArrowRight /></div>
                <div className="workflow-node">
                  <span><IconShield /></span>
                  <label>Secure</label>
                </div>
                <div className="workflow-arrow"><IconArrowRight /></div>
                <div className="workflow-node end">
                  <span><IconPackage /></span>
                  <label>Output</label>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* Sessions Section */}
          <section className="sessions-section">
            <div className="sessions-header">
              <h2>Recent Sessions</h2>
              {isAuthenticated && sessions.length > 0 && (
                <div className="sessions-actions">
                  {selectMode ? (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={selectAll}>
                        {selectedSessions.size === sessions.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={deleteSelectedSessions}
                        disabled={selectedSessions.size === 0}
                      >
                        <IconTrash /> Delete ({selectedSessions.size})
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={toggleSelectMode}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-secondary" onClick={toggleSelectMode}>
                        <IconSelect /> Select
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={cleanupEmptySessions}>
                        <IconBroom /> Clean Empty
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {!isAuthenticated ? (
              <div className="empty-state">
                <p>Sign in to view your chat history</p>
                <Link to="/login" className="btn btn-primary">Sign In</Link>
              </div>
            ) : loading ? (
              <div className="loading">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="empty-state">
                <p>No sessions yet. Start generating code!</p>
                <Link to="/chat" className="btn btn-primary">Start Now</Link>
              </div>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`session-card ${selectMode ? 'select-mode' : ''} ${selectedSessions.has(session.session_id) ? 'selected' : ''} ${session.message_count === 0 ? 'empty-session' : ''}`}
                    onClick={selectMode ? (e) => toggleSessionSelection(session.session_id, e) : undefined}
                  >
                    {selectMode && (
                      <div className="session-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedSessions.has(session.session_id)}
                          onChange={(e) => toggleSessionSelection(session.session_id, e)}
                        />
                      </div>
                    )}
                    {!selectMode ? (
                      <Link to={`/chat/${session.session_id}`} className="session-link">
                        <div className="session-icon"><IconSession /></div>
                        <div className="session-info">
                          <span className="session-title">{session.title || 'New Chat'}</span>
                          <span className="session-date">
                            {formatDate(session.updated_at || session.created_at)}
                          </span>
                        </div>
                        <div className="session-meta">
                          <span className={`message-count ${session.message_count === 0 ? 'empty' : ''}`}>
                            {session.message_count === 0 ? 'Empty' : `${session.message_count} messages`}
                          </span>
                          <button
                            className="delete-session-btn"
                            onClick={(e) => deleteSession(session.session_id, e)}
                            title="Delete session"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className="session-icon"><IconSession /></div>
                        <div className="session-info">
                          <span className="session-title">{session.title || 'New Chat'}</span>
                          <span className="session-date">
                            {formatDate(session.updated_at || session.created_at)}
                          </span>
                        </div>
                        <div className="session-meta">
                          <span className={`message-count ${session.message_count === 0 ? 'empty' : ''}`}>
                            {session.message_count === 0 ? 'Empty' : `${session.message_count} messages`}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        confirmText={confirmModal.variant === 'info' ? 'OK' : 'Delete'}
        cancelText={confirmModal.variant === 'info' ? 'Close' : 'Cancel'}
      />
    </div>
  );
};

export default DashboardPage;
