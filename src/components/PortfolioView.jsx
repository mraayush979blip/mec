import React from 'react';
import { 
  Mail, Globe, MapPin, 
  ExternalLink, Download, ArrowLeft, Award, 
  Briefcase, GraduationCap, Code, User, GitBranch, Phone
} from 'lucide-react';

export default function PortfolioView({ profile, onClose, showTechlinkBranding }) {
  const handlePrint = () => {
    window.print();
  };

  if (!profile) return null;

  const cleanText = (text) => {
    if (!text) return '';
    let cleaned = text.trim();
    if (!cleaned) return '';

    // 1. Capitalize first letter of every sentence
    // Splits by . ? or ! followed by space
    cleaned = cleaned.replace(/(^|[.?!]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());

    // 2. Ensure it ends with a full stop if it's a paragraph
    if (cleaned.length > 0 && !/[.?!]$/.test(cleaned)) {
      cleaned += '.';
    }

    // 3. Common fixes (i -> I, mechatronics -> Mechatronics)
    cleaned = cleaned.replace(/\b(i)\b/g, 'I');
    cleaned = cleaned.replace(/\bmechatronics\b/gi, 'Mechatronics');
    
    return cleaned;
  };


  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 20000,
      background: '#0a0a0c', overflowY: 'auto',
      animation: 'fadeIn 0.4s ease-out',
      fontFamily: "'Inter', system-ui, sans-serif"
    }} className="portfolio-viewer">
      
      {/* PREMIUM TOOLBAR (Hidden on Print) */}
      <div style={{
        position: 'sticky', top: 0, padding: '1rem 2rem',
        background: 'rgba(10,10,12,0.9)', backdropFilter: 'blur(15px)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 100
      }} className="no-print">
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
          padding: '0.6rem 1.2rem', borderRadius: '14px',
          cursor: 'pointer', fontWeight: 600, transition: '0.2s'
        }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handlePrint} style={{
             background: 'var(--gradient-blue)', color: 'white', border: 'none',
             padding: '0.7rem 1.5rem', borderRadius: '14px', fontWeight: 700,
             display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
             boxShadow: '0 8px 20px rgba(0, 122, 255, 0.3)'
          }}>
            <Download size={18} /> Download / Print PDF
          </button>
        </div>
      </div>

      {/* RESUME CONTAINER */}
      <div style={{
        maxWidth: '1000px', margin: '3rem auto', 
        background: '#fff', color: '#1a1a1a',
        boxShadow: '0 50px 100px rgba(0,0,0,0.4)',
        display: 'flex',
        position: 'relative'
      }} className="resume-sheet">

        
        {/* LEFT SIDEBAR (Contact & Skills) */}
        <div style={{
          width: '320px', background: '#f8f9fb', padding: '3rem 2rem',
          borderRight: '1px solid #eef0f2', display: 'flex', flexDirection: 'column', gap: '2.5rem'
        }} className="resume-sidebar">
          
          {/* PROFILE IMAGE */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '140px', height: '140px', borderRadius: '35px',
              background: '#007AFF', margin: '0 auto 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3.5rem', fontWeight: 800, color: 'white',
              boxShadow: '0 15px 35px rgba(0, 122, 255, 0.2)',
              overflow: 'hidden'
            }}>
              {profile.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : profile.full_name?.charAt(0)}
            </div>
          </div>

          {/* CONTACT INFO */}
          <section>
             <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#007AFF', marginBottom: '1.2rem' }}>Contact</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                  <Mail size={16} color="#666" /> <span style={{ wordBreak: 'break-all' }}>{profile.email}</span>
                </div>
                {profile.whatsapp_no && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <Phone size={16} color="#666" /> <span>{profile.whatsapp_no}</span>
                  </div>
                )}
                {profile.github_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <GitBranch size={16} color="#666" /> <span>GitHub / {profile.full_name?.split(' ')[0].toLowerCase()}</span>
                  </div>
                )}
                {profile.linkedin_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <Globe size={16} color="#666" /> <span>LinkedIn / {profile.full_name?.split(' ')[0].toLowerCase()}</span>
                  </div>
                )}
                {profile.branch && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                    <MapPin size={16} color="#666" /> <span>{profile.branch}</span>
                  </div>
                )}
             </div>
          </section>

          {/* SKILLS */}
          {profile.skills?.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#007AFF', marginBottom: '1.2rem' }}>Expertise</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile.skills.map((skill, i) => (
                  <span key={i} style={{
                    padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#334155'
                  }}>{skill}</span>
                ))}
              </div>
            </section>
          )}

          {/* EDUCATION (Sidebar version) */}
          {profile.education && (
            <section>
               <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#007AFF', marginBottom: '1.2rem' }}>Education</h3>
               <div style={{ fontSize: '0.85rem', color: '#4a5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{cleanText(profile.education)}</div>
            </section>
          )}
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: '4rem' }}>
          
          {/* HEADER */}
          <header style={{ marginBottom: '3.5rem' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{profile.full_name}</h1>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{profile.dev_role || 'Engineer'}</p>
          </header>

          {/* SUMMARY */}
          {profile.bio && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <User size={18} color="#007AFF" /> Professional Summary
              </h2>
              <p style={{ color: '#475569', lineHeight: '1.7', fontSize: '0.95rem' }}>{cleanText(profile.bio)}</p>
            </section>
          )}

          {/* EXPERIENCE */}
          {profile.experience && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Briefcase size={18} color="#007AFF" /> Experience
              </h2>
              <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{cleanText(profile.experience)}</div>
            </section>
          )}

          {/* PROJECTS */}
          {profile.projects_json?.length > 0 && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={18} color="#007AFF" /> Key Projects
              </h2>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {profile.projects_json.map((p, i) => (
                  <div key={i} style={{ borderLeft: '3px solid #e2e8f0', paddingLeft: '1.2rem' }}>
                    <h4 style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '0.3rem' }}>{cleanText(p.name)}</h4>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>{cleanText(p.description)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ACHIEVEMENTS */}
          {profile.achievements && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={18} color="#34C759" /> Achievements
              </h2>
              <div style={{ color: '#475569', lineHeight: '1.7', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{cleanText(profile.achievements)}</div>
            </section>
          )}

          {/* FOOTER BRANDING */}
          <footer style={{ marginTop: 'auto', paddingTop: '4rem', textAlign: 'center', opacity: 0.4, fontSize: '0.75rem', color: '#94a3b8' }}>
             {showTechlinkBranding ? (
               <p>Developed by <strong style={{ color: '#007AFF' }}>Techlink</strong></p>
             ) : (
               <p>Developed by <a href="https://aayush-sharma-beige.vercel.app/" target="_blank" rel="noreferrer" style={{ color: '#007AFF', textDecoration: 'none', fontWeight: 600 }}>Aayush Sharma</a></p>
             )}
             <p style={{ marginTop: '0.3rem' }}>Mechatronian Hub Platform &bull; Professional Portfolio Builder</p>
          </footer>

        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media print {
          /* Hide EVERYTHING by default */
          body * { visibility: hidden; }
          
          /* Only show the resume sheet and its children */
          .resume-sheet, .resume-sheet * { visibility: visible; }
          
          /* Position the resume sheet at the very top left */
          .resume-sheet { 
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          /* Hide UI elements */
          .no-print, .portfolio-viewer { background: white !important; }
          .portfolio-viewer { position: absolute !important; inset: 0 !important; overflow: visible !important; }

          /* Reset page margins */
          @page {
            margin: 0;
            size: auto;
          }
          
          body { background: white !important; margin: 0; padding: 0; }
        }
      `}</style>

    </div>
  );
}
