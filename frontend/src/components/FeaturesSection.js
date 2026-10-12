import React from 'react';
import { Terminal, CheckCircle, FlaskConical, ShieldAlert } from 'lucide-react';
import ScrollReveal, { StaggerContainer, StaggerItem } from './ScrollReveal';
import TiltCard from './TiltCard';
import './FeaturesSection.css';

const FeaturesSection = () => {
  return (
    <section id="features" className="features-section">
      <ScrollReveal direction="fadeUp">
        <div className="fs-header">
          <h2 className="fs-title">Powered by Specialized Intelligence</h2>
          <p className="fs-subtitle">Four distinct AI agents orchestrating your codebase with surgical precision and ethereal efficiency.</p>
        </div>
      </ScrollReveal>

      <StaggerContainer staggerDelay={0.15} className="fs-grid">
        
        {/* Agent 1: Code Generator */}
        <StaggerItem direction="fadeUp" className="fs-span-8">
          <TiltCard scale={1.02} rotateAmplitude={5}>
            <div className="fs-card fs-neon-blue h-full">
              <div className="fs-ambient-blue"></div>
              <div className="fs-card-content">
                <div className="fs-icon-box fs-icon-blue">
                  <Terminal size={24} />
                </div>
                <h3 className="fs-card-title">Code Generator</h3>
                <p className="fs-card-desc">
                  Synthesize complex logic patterns from natural language intent with zero-latency inference.
                </p>
                
                <div className="fs-tags">
                  <span className="fs-tag-primary">Neural-Synthesis</span>
                  <span className="fs-tag-secondary">v4.2</span>
                </div>
              </div>
            </div>
          </TiltCard>
        </StaggerItem>

        {/* Agent 2: Validator Agent */}
        <StaggerItem direction="fadeLeft" className="fs-span-4">
          <TiltCard scale={1.02} rotateAmplitude={5}>
            <div className="fs-card fs-neon-green h-full">
              <div className="fs-card-content">
                <div className="fs-icon-box fs-icon-green">
                  <CheckCircle size={24} />
                </div>
                <h3 className="fs-card-title">Validator Agent</h3>
                <p className="fs-card-desc">
                  Semantic check for PEP-8 compliance and deep logic flow consistency.
                </p>
                
                <div className="fs-detail">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></span>
                  <span>Logic Pure</span>
                </div>
              </div>
            </div>
          </TiltCard>
        </StaggerItem>

        {/* Agent 3: Testing Agent */}
        <StaggerItem direction="fadeRight" className="fs-span-5">
          <TiltCard scale={1.02} rotateAmplitude={5}>
            <div className="fs-card fs-neon-purple h-full">
              <div className="fs-card-content">
                <div className="fs-icon-box fs-icon-purple">
                  <FlaskConical size={24} />
                </div>
                <h3 className="fs-card-title">Testing Agent</h3>
                <p className="fs-card-desc">
                  Automated PyTest suite generation with 100% edge-case coverage.
                </p>
              </div>
            </div>
          </TiltCard>
        </StaggerItem>

        {/* Agent 4: Security Agent */}
        <StaggerItem direction="fadeUp" className="fs-span-7">
          <TiltCard scale={1.02} rotateAmplitude={5}>
            <div className="fs-card fs-neon-orange h-full">
              <div className="fs-ambient-orange"></div>
              <div className="fs-card-content" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div className="fs-icon-box fs-icon-orange" style={{ width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0 }}>
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h3 className="fs-card-title">Security Agent</h3>
                  <p className="fs-card-desc">
                    Real-time scanning for CVEs and advanced vulnerability patterns within your dependencies.
                  </p>
                  
                  <div className="fs-sec-grid">
                    <div className="fs-sec-item">
                      <span className="fs-sec-label">Status</span>
                      <span className="fs-sec-val">Shield Active</span>
                    </div>
                    <div className="fs-sec-item">
                      <span className="fs-sec-label">Threat Level</span>
                      <span className="fs-sec-val" style={{ color: '#4ade80' }}>Zero Detected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
        </StaggerItem>

      </StaggerContainer>
    </section>
  );
};

export default FeaturesSection;
