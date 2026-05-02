import React, { useState, useEffect } from 'react';
import { LogOut, Calendar, PlusCircle, Activity, Users, Settings, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

function AdminDashboard({ session, profile }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('admin_active_tab') || 'overview'); // overview, events, create
  const [stats, setStats] = useState({ students: 0, teams: 0, requests: 0, events: 0 });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const triggerHaptic = (pattern = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const tabs = ['overview', 'events', 'discovery', 'create'];

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    triggerHaptic(15);
    setActiveTab(tab);
    setViewingTeamsFor(null);
    setEditingHackathon(null);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 70;
    const isRightSwipe = distance < -70;

    const currentIndex = tabs.indexOf(activeTab);

    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      handleTabChange(tabs[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      handleTabChange(tabs[currentIndex - 1]);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Form states for creating event
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('event'); // event, poll, message
  const [isTeamJoiningEnabled, setIsTeamJoiningEnabled] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [pollOptions, setPollOptions] = useState(''); // comma separated
  const [minTeamSize, setMinTeamSize] = useState(4);
  const [maxTeamSize, setMaxTeamSize] = useState(6);

  // States for viewing teams
  const [viewingTeamsFor, setViewingTeamsFor] = useState(null);
  const [eventTeams, setEventTeams] = useState([]);

  // Discovery Management State
  const [externalHackathons, setExternalHackathons] = useState([]);
  const [editingHackathon, setEditingHackathon] = useState(null);
  const [hackTitle, setHackTitle] = useState('');
  const [hackDesc, setHackDesc] = useState('');
  const [hackDate, setHackDate] = useState('');
  const [hackLink, setHackLink] = useState('');
  const [hackImage, setHackImage] = useState('');
  const [hackSource, setHackSource] = useState('');

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
    if (activeTab === 'overview' || activeTab === 'events') {
       fetchEvents();
       fetchStats();
    } else if (activeTab === 'discovery') {
       fetchExternalHackathons();
    }
  }, [activeTab]);

  const fetchExternalHackathons = async () => {
    setLoading(true);
    const { data } = await supabase.from('external_hackathons').select('*').order('created_at', { ascending: false });
    if (data) setExternalHackathons(data);
    setLoading(false);
  };

  const handleCreateHackathon = async (e) => {
    e.preventDefault();
    const hackData = {
        title: hackTitle,
        description: hackDesc,
        date: hackDate,
        link: hackLink,
        image_url: hackImage,
        source: hackSource
    };

    let error;
    if (editingHackathon) {
        const { error: updateError } = await supabase.from('external_hackathons').update(hackData).eq('id', editingHackathon.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('external_hackathons').insert([hackData]);
        error = insertError;
    }

    if (!error) {
        alert("Discovery item updated!");
        setEditingHackathon(null);
        setHackTitle(''); setHackDesc(''); setHackDate(''); setHackLink(''); setHackImage(''); setHackSource('');
        fetchExternalHackathons();
    } else {
        alert(error.message);
    }
  };

  const handleDeleteHackathon = async (id) => {
      if (!window.confirm("Delete this discovery item?")) return;
      const { error } = await supabase.from('external_hackathons').delete().eq('id', id);
      if (!error) fetchExternalHackathons();
  };

  const fetchStats = async () => {
    const { count: students } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: teams } = await supabase.from('teams').select('*', { count: 'exact', head: true });
    const { count: requests } = await supabase.from('join_requests').select('*', { count: 'exact', head: true });
    const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
    setStats({ students, teams, requests, events: eventsCount });
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setEvents(data);
    setLoading(false);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title) return;
    
    const eventData = { 
      admin_id: profile.id, 
      title, 
      description, 
      know_more_url: url,
      type,
      is_team_joining_enabled: isTeamJoiningEnabled,
      expires_at: expiresAt || null,
      options: type === 'poll' ? pollOptions.split(',').map(o => o.trim()).filter(o => o) : null,
      min_team_size: minTeamSize,
      max_team_size: maxTeamSize
    };

    let error;
    if (editingEvent) {
      const { error: updateError } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('events').insert([eventData]);
      error = insertError;
    }

    if (!error) {
      resetForm();
      handleTabChange('events');
      fetchEvents();
      alert(editingEvent ? "Event updated successfully!" : "Event created successfully!");
    } else {
      alert("Error: " + error.message);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setType('event');
    setIsTeamJoiningEnabled(true);
    setExpiresAt('');
    setPollOptions('');
    setMinTeamSize(4);
    setMaxTeamSize(6);
    setEditingEvent(null);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setUrl(event.know_more_url || '');
    setType(event.type || 'event');
    setIsTeamJoiningEnabled(event.is_team_joining_enabled);
    setExpiresAt(event.expires_at ? new Date(event.expires_at).toISOString().slice(0, 16) : '');
    setPollOptions(event.options ? event.options.join(', ') : '');
    setMinTeamSize(event.min_team_size || 4);
    setMaxTeamSize(event.max_team_size || 6);
    handleTabChange('create'); // Go to form
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event? This will also delete all associated teams and requests.")) return;
    triggerHaptic([30, 50, 30]); // Distinct vibration for delete
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) alert("Error deleting event: " + error.message);
    else fetchEvents();
  };



  const handleViewTeams = async (event) => {
    setViewingTeamsFor(event);
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles:profiles!creator_id(full_name),
        team_members(profiles:profiles!user_id(full_name))
      `)
      .eq('event_id', event.id);
    if (data) setEventTeams(data);
  };

  return (
    <div 
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2" style={{ background: 'radial-gradient(circle, rgba(255,59,48,0.2) 0%, rgba(255,59,48,0) 70%)' }}></div>
      </div>

      <header className="glass-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#34C759', color: 'white', padding: '0.4rem', borderRadius: '12px' }}>
              <Settings size={20} />
            </div>
            Mechatronics <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>Admin</span>
          </div>
          
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${activeTab === 'overview' ? 'btn-secondary' : ''}`} 
              style={{ background: activeTab === 'overview' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => handleTabChange('overview')}
            >
              Overview
            </button>
            <button 
              className={`btn ${activeTab === 'events' ? 'btn-secondary' : ''}`} 
              style={{ background: activeTab === 'events' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => handleTabChange('events')}
            >
              Events
            </button>
            <button 
              className={`btn ${activeTab === 'discovery' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'discovery' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => handleTabChange('discovery')}
            >
              Discovery
            </button>
            <button 
              className={`btn ${activeTab === 'create' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'create' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => handleTabChange('create')}
            >
              Create New
            </button>
          </nav>

          <button className="btn" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => supabase.auth.signOut()}>
            <LogOut size={20} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        <div className={`mobile-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => handleTabChange('overview')}>
          <Activity size={20} />
          <span>Overview</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => handleTabChange('events')}>
          <Calendar size={20} />
          <span>Events</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'discovery' ? 'active' : ''}`} onClick={() => handleTabChange('discovery')}>
          <Globe size={20} />
          <span>Discovery</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => handleTabChange('create')}>
          <PlusCircle size={20} />
          <span>Create</span>
        </div>
      </div>

      <main className="container fade-in-up" style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1000px' }}>
        
        {activeTab === 'overview' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Platform Analytics</h1>
            <p className="subtitle">Real-time overview of student engagement and team formation.</p>
            
            <div className="admin-stats-grid">
              <div className="glass-panel stat-card">
                <Users size={32} color="var(--accent)" />
                <h2>{stats.students}</h2>
                <p>Students</p>
              </div>
              <div className="glass-panel stat-card">
                <Activity size={32} color="#34C759" />
                <h2>{stats.teams}</h2>
                <p>Teams</p>
              </div>
              <div className="glass-panel stat-card">
                <Calendar size={32} color="#ff9500" />
                <h2>{stats.events}</h2>
                <p>Events</p>
              </div>
              <div className="glass-panel stat-card">
                <Activity size={32} color="#AF52DE" />
                <h2>{stats.requests}</h2>
                <p>Requests</p>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'discovery' && (
           <div className="fade-in-up">
              <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Global Discovery</h1>
              <p className="subtitle">Manage external hackathons displayed to all students.</p>

              <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>{editingHackathon ? 'Edit Item' : 'Add New Hackathon'}</h3>
                  <form onSubmit={handleCreateHackathon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <input className="glass-input" placeholder="Title" value={hackTitle} onChange={e=>setHackTitle(e.target.value)} required />
                      <input className="glass-input" placeholder="Source (e.g. Devfolio)" value={hackSource} onChange={e=>setHackSource(e.target.value)} />
                      <input className="glass-input" placeholder="Date" value={hackDate} onChange={e=>setHackDate(e.target.value)} />
                      <input className="glass-input" placeholder="External Link" value={hackLink} onChange={e=>setHackLink(e.target.value)} required />
                      <input className="glass-input" placeholder="Image URL" value={hackImage} onChange={e=>setHackImage(e.target.value)} />
                      <input className="glass-input" placeholder="Short Description" value={hackDesc} onChange={e=>setHackDesc(e.target.value)} />
                      <button type="submit" className="btn btn-primary" style={{ gridColumn: 'span 2' }}>{editingHackathon ? 'Update' : 'Add to Discovery'}</button>
                  </form>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                  {externalHackathons.map(hack => (
                      <div key={hack.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                              <p style={{ fontWeight: 800 }}>{hack.title}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{hack.source} • {hack.date}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-secondary" onClick={() => {
                                  setEditingHackathon(hack);
                                  setHackTitle(hack.title); setHackDesc(hack.description); setHackDate(hack.date); setHackLink(hack.link); setHackImage(hack.image_url); setHackSource(hack.source);
                              }}>Edit</button>
                              <button className="btn btn-secondary" style={{ color: '#FF3B30' }} onClick={() => handleDeleteHackathon(hack.id)}>Delete</button>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {activeTab === 'events' && !viewingTeamsFor && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
            <p className="subtitle">Manage all active events and monitor student participation.</p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading events...</div>
            ) : events.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No events created</h3>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('create')}>
                  Create your first Event
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {events.map((event) => (
                  <div key={event.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{event.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{event.description}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleViewTeams(event)}>
                        <Users size={16} /> View Teams
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleEditEvent(event)}>
                        Edit Event
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#ff3b30' }} onClick={() => handleDeleteEvent(event.id)}>
                        Delete Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && viewingTeamsFor && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '1.5rem' }} onClick={() => setViewingTeamsFor(null)}>
              ← Back to Events
            </button>
            <h1 className="title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Teams: {viewingTeamsFor.title}</h1>
            
            {eventTeams.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No teams have been formed for this event yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {eventTeams.map((team) => (
                  <div key={team.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {team.icon_url} {team.team_name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.2rem' }}>Created by: {team.profiles?.full_name}</p>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.8rem', fontSize: '0.95rem' }}><strong>Requirements:</strong> {team.requirements}</p>
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Members ({team.team_members?.length || 0})</p>
                      <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                        {team.team_members?.map((member, idx) => (
                          <li key={idx} style={{ marginBottom: '0.3rem' }}>{member.profiles?.full_name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="fade-in-up glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>{editingEvent ? 'Edit Content' : 'Create Content'}</h2>
              {editingEvent && (
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleCreateEvent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label className="input-label">Content Type</label>
                  <select className="glass-input" value={type} onChange={(e)=>setType(e.target.value)}>
                    <option value="event">Team Event (Hackathons, etc)</option>
                    <option value="poll">Poll (Voting)</option>
                    <option value="message">Standard Message/Announcement</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Expiry Date (Optional)</label>
                  <input type="datetime-local" className="glass-input" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Title</label>
                <input type="text" className="glass-input" placeholder="e.g. Hackathon 2026" value={title} onChange={(e)=>setTitle(e.target.value)} required />
              </div>
              
              <div className="input-group">
                <label className="input-label">Description / Message Body</label>
                <textarea className="glass-input" rows="3" placeholder="Describe the content..." value={description} onChange={(e)=>setDescription(e.target.value)} required></textarea>
              </div>

              {type === 'poll' && (
                <div className="input-group fade-in-up">
                  <label className="input-label">Poll Options (Comma separated)</label>
                  <input type="text" className="glass-input" placeholder="Option A, Option B, Option C" value={pollOptions} onChange={(e)=>setPollOptions(e.target.value)} required />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
                <input type="checkbox" id="joining" checked={isTeamJoiningEnabled} onChange={(e)=>setIsTeamJoiningEnabled(e.target.checked)} />
                <label htmlFor="joining" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Enable Team Joining for this post</label>
              </div>

              {isTeamJoiningEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label className="input-label">Min Team Size</label>
                    <input type="number" className="glass-input" value={minTeamSize} onChange={(e)=>setMinTeamSize(parseInt(e.target.value))} min="1" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Max Team Size</label>
                    <input type="number" className="glass-input" value={maxTeamSize} onChange={(e)=>setMaxTeamSize(parseInt(e.target.value))} min="1" />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">"Know More" Link (Optional)</label>
                <input type="url" className="glass-input" placeholder="https://..." value={url} onChange={(e)=>setUrl(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {editingEvent ? 'Update Content' : 'Publish to Platform'}
              </button>
            </form>
          </div>
        )}



      </main>
    </div>
  );
}

export default AdminDashboard;
