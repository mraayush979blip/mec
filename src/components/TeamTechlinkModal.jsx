import React from 'react';
import { Phone, Mail, X, Users, Info, MessageSquare, ShieldAlert } from 'lucide-react';

export default function TeamTechlinkModal({ onClose }) {
  // Prevent clicks inside the card from closing the modal
  const handleCardClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'techlinkFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(20, 20, 25, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '28px',
          padding: '2.5rem',
          color: '#ffffff',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          transform: 'translateY(20px)',
          animation: 'techlinkSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }} 
        onClick={handleCardClick}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#a0a0ab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)';
            e.currentTarget.style.color = '#ff453a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#a0a0ab';
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{
            alignSelf: 'flex-start',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            background: 'rgba(0, 122, 255, 0.15)',
            border: '1px solid rgba(0, 122, 255, 0.25)',
            color: '#0a84ff',
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Platform Hub Info
          </div>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            margin: 0,
            background: 'linear-gradient(135deg, #ffffff 30%, #a0a0ab 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Team Techlink
          </h2>
        </div>

        {/* App Purpose Intro */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '1.2rem',
          borderRadius: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(0, 122, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a84ff',
            flexShrink: 0
          }}>
            <Info size={20} />
          </div>
          <p style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: '#d1d1d6',
            margin: 0,
            fontWeight: 400
          }}>
            Tech Link App serves as the central platform for event updates, registrations, announcements, and participant coordination, ensuring a smooth and organized experience for everyone.
          </p>
        </div>

        {/* Registration Support Details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(52, 199, 89, 0.04)',
          border: '1px solid rgba(52, 199, 89, 0.12)',
          padding: '1.5rem',
          borderRadius: '22px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#30d158',
              margin: 0
            }}>
              For Event Registration & Queries
            </h3>
            <p style={{
              fontSize: '0.85rem',
              color: '#a0a0ab',
              lineHeight: '1.4',
              margin: 0
            }}>
              Contact <strong style={{ color: '#ffffff' }}>Yash Rai (Admin)</strong> for registrations, participation details, and event-related assistance.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginTop: '0.25rem'
          }}>
            {/* Phone (WhatsApp Link) */}
            <a 
              href="https://wa.me/917000251074" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'rgba(48, 209, 88, 0.1)',
                border: '1px solid rgba(48, 209, 88, 0.2)',
                borderRadius: '14px',
                padding: '0.75rem',
                color: '#30d158',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(48, 209, 88, 0.18)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(48, 209, 88, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Phone size={16} /> 7000251074
            </a>

            {/* Email Link */}
            <a 
              href="mailto:yashrai0932@gmail.com" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: 'rgba(0, 122, 255, 0.1)',
                border: '1px solid rgba(0, 122, 255, 0.2)',
                borderRadius: '14px',
                padding: '0.75rem',
                color: '#0a84ff',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 122, 255, 0.18)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Mail size={16} /> Email Admin
            </a>
          </div>
        </div>

        {/* Team Members List (CyberSphere) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem'
        }}>
          <h3 style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Users size={16} color="#bf5af2" /> Created by CyberSphere
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem'
          }}>
            {[
              'Isheeka Soni',
              'Zunera Khan',
              'Shubham Rathore',
              'Yash Rai'
            ].map((member, i) => (
              <div 
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  padding: '0.6rem 0.9rem',
                  borderRadius: '12px'
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--gradient-purple, #bf5af2)'
                }} />
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#e5e5ea'
                }}>
                  {member}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedded Dynamic CSS for Micro-animations */}
      <style>{`
        @keyframes techlinkFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes techlinkSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
