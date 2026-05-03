import React from 'react';

const Logo = ({ size = 42, color = 'var(--accent)', stylized = true }) => {
  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      userSelect: 'none'
    }}>
      {/* Background Geometric Base */}
      <div style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        border: `3px solid ${color}`, 
        borderRadius: '12px',
        transform: 'rotate(45deg)',
        opacity: 0.2
      }} />
      
      {/* Main Stylized "M" Structure */}
      <svg 
        width={size * 0.7} 
        height={size * 0.7} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        style={{ position: 'relative', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
      >
        {/* Left Leg */}
        <path d="M4 20V8" />
        {/* Connection 1 */}
        <path d="M4 8L12 16" />
        {/* Connection 2 */}
        <path d="M12 16L20 8" />
        {/* Right Leg */}
        <path d="M20 8V20" />
        
        {/* Bottom Bar - Making it more "Tech" */}
        <circle cx="12" cy="16" r="1" fill={color} stroke="none" />
        <circle cx="4" cy="8" r="1" fill={color} stroke="none" />
        <circle cx="20" cy="8" r="1" fill={color} stroke="none" />
      </svg>
    </div>
  );
};

export default Logo;
