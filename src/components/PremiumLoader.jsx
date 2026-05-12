import React from 'react';
import { Activity } from 'lucide-react';

const PremiumLoader = ({ message = "Preparing your experience...", fullScreen = false }) => {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2rem',
    width: '100%',
    height: fullScreen ? '100vh' : 'auto',
    background: fullScreen ? 'var(--bg-primary)' : 'transparent',
    zIndex: fullScreen ? 10000 : 1,
    fontFamily: 'var(--font-main)'
  };

  return (
    <div style={containerStyle}>
      <div className="splash-content" style={{ animation: 'none' }}>
        <div className="splash-logo-container" style={{ width: '80px', height: '80px' }}>
          <div className="splash-logo-bg"></div>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 2 }}>
            <path d="M4 18V6L12 14L20 6V18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="14" r="1" fill="white" />
            <circle cx="4" cy="6" r="1" fill="white" />
            <circle cx="20" cy="6" r="1" fill="white" />
            <circle cx="4" cy="18" r="1" fill="white" />
            <circle cx="20" cy="18" r="1" fill="white" />
          </svg>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <h1 className="splash-title" style={{ fontSize: '2rem' }}>Mechatronian</h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '0.6rem',
            opacity: 0.7,
            fontWeight: 500,
            letterSpacing: '0.05em'
          }}>
            {message}
          </p>
        </div>

        <div className="splash-loader" style={{ width: '60px' }}>
          <div className="splash-loader-bar"></div>
        </div>
      </div>
    </div>
  );
};

export default PremiumLoader;
