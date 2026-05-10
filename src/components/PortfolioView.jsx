import React from 'react';
import { 
  Mail, Github, Linkedin, Globe, MapPin, 
  ExternalLink, Download, ArrowLeft, Award, 
  Briefcase, GraduationCap, Code, User
} from 'lucide-react';

export default function PortfolioView({ profile, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  if (!profile) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: 'var(--bg-primary)', overflowY: 'auto',
      animation: 'fadeIn 0.4s ease-out'
    }} className="portfolio-viewer">
      
      {/* TOOLBAR (Hidden on Print) */}
      <div style={{
        position: 'sticky', top: 0, padding: '1rem 2rem',
        background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid var(--glass-border)', zIndex: 10
      }} className="no-print">
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', fontWeight: 600
        }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '900px', margin: '2rem auto', padding: '4rem',
        background: 'var(--bg-secondary)', borderRadius: '32px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }} className="print-reset">
        
        {/* DESIGN ACCENTS */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'var(--gradient-blue)', opacity: 0.1, filter: 'blur(100px)', pointerEvents: 'none' }} />
        
        {/* HEADER SECTION */}
        <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '40px',
            background: 'var(--gradient-purple)', margin: '0 auto 2rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '3rem', fontWeight: 800, color: 'white',
            boxShadow: '0 20px 40px rgba(175, 82, 222, 0.3)'
          }}>
            {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} alt="" /> : profile.full_name?.charAt(0)}
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '0.5rem' }}>{profile.full_name}</h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>{profile.dev_role || 'Mechatronics Engineer'}</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <Mail size={16} /> {profile.email}
            </div>
            {profile.branch && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <MapPin size={16} /> {profile.branch}
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              {profile.github_url && <a href={profile.github_url} target="_blank" style={{ color: 'var(--text-primary)' }}><Github size={20} /></a>}
              {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" style={{ color: 'var(--text-primary)' }}><Linkedin size={20} /></a>}
            </div>
          </div>
        </header>

        {/* BIO SECTION */}
        {profile.bio && (
          <section style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(0,122,255,0.1)', borderRadius: '12px', color: 'var(--accent)' }}><User size={20} /></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>About Me</h2>
            </div>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-secondary)', textAlign: 'justify' }}>{profile.bio}</p>
          </section>
        )}

        {/* SKILLS SECTION */}
        {profile.skills?.length > 0 && (
          <section style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', color: '#34C759' }}><Code size={20} /></div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Core Expertise</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
              {profile.skills.map((skill, i) => (
                <span key={i} style={{
                  padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                  fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)'
                }}>{skill}</span>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          {/* EDUCATION & EXPERIENCE */}
          <div>
            {profile.education && (
              <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.6rem', background: 'rgba(255, 149, 0, 0.1)', borderRadius: '12px', color: '#FF9500' }}><GraduationCap size={20} /></div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Education</h2>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{profile.education}</div>
              </section>
            )}

            {profile.experience && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.6rem', background: 'rgba(175, 82, 222, 0.1)', borderRadius: '12px', color: '#AF52DE' }}><Briefcase size={20} /></div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Experience</h2>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{profile.experience}</div>
              </section>
            )}
          </div>

          {/* PROJECTS & ACHIEVEMENTS */}
          <div>
             {profile.projects_json?.length > 0 && (
               <section style={{ marginBottom: '3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.6rem', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', color: '#FF3B30' }}><Globe size={20} /></div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notable Projects</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {profile.projects_json.map((p, i) => (
                      <div key={i} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem' }}>{p.name}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{p.description}</p>
                        {p.link && <a href={p.link} target="_blank" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>View Live <ExternalLink size={12} /></a>}
                      </div>
                    ))}
                  </div>
               </section>
             )}

             {profile.achievements && (
               <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '0.6rem', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', color: '#34C759' }}><Award size={20} /></div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Achievements</h2>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{profile.achievements}</div>
               </section>
             )}
          </div>
        </div>

        <footer style={{ marginTop: '5rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem', opacity: 0.5, fontSize: '0.8rem' }}>
          Portfolio generated via Mechatronian Hub &copy; 2026. All rights reserved.
        </footer>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .portfolio-viewer { position: static !important; overflow: visible !important; }
          .print-reset { 
            margin: 0 !important; 
            padding: 20mm !important; 
            box-shadow: none !important; 
            border: none !important; 
            background: white !important;
            color: black !important;
            max-width: none !important;
            width: 100% !important;
          }
          .print-reset * { color: black !important; }
          .badge, span { border: 1px solid #ccc !important; }
        }
      `}</style>
    </div>
  );
}
