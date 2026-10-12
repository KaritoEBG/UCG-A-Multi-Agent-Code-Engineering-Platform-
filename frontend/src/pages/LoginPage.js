import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { UCGLogo } from './LandingPage';
import './LoginPage.css';

// Inline SVG icons for login features
const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconSave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconWarning = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { showWelcome } = useToast();
  const [error, setError] = useState('');
  
  // Check if user came from signup link
  const isSignup = searchParams.get('mode') === 'signup';

  // Get the page they tried to visit
  const from = location.state?.from?.pathname || '/chat';

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSuccess = (user) => {
    console.log('Login successful:', user);
    showWelcome(user.name);
    navigate(from, { replace: true });
  };

  const handleError = (errorMsg) => {
    setError(errorMsg);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="login-logo">
            <UCGLogo size={32} />
            <span className="logo-text">Uber Code Generator</span>
          </Link>
        </div>

        <div className="login-card">
          <h1>{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="login-subtitle">
            {isSignup 
              ? 'Sign up to start generating code and save your projects'
              : 'Sign in to access the code generator and your chat history'
            }
          </p>

          {error && (
            <div className="login-error">
              <span><IconWarning /></span> {error}
            </div>
          )}

          <div className="login-google">
            <GoogleSignInButton 
              onSuccess={handleSuccess}
              onError={handleError}
              text={isSignup ? 'signup_with' : 'signin_with'}
            />
          </div>

          <div className="login-divider">
            <span>{isSignup ? 'Quick & secure signup' : 'Secure login with Google'}</span>
          </div>

          <div className="login-features">
            <div className="feature-item">
              <span className="feature-icon"><IconLock /></span>
              <span>Your data is secure</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><IconSave /></span>
              <span>Save your chat history</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><IconZap /></span>
              <span>Access your sessions anywhere</span>
            </div>
          </div>

          <div className="login-switch">
            {isSignup ? (
              <p>Already have an account? <Link to="/login">Sign In</Link></p>
            ) : (
              <p>New here? <Link to="/login?mode=signup">Create Account</Link></p>
            )}
          </div>
        </div>

        <p className="login-footer">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
