import React, { useState, useEffect } from 'react';
import { LogOut, User, Calendar, PlusCircle, ArrowRight, Activity, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

function StudentDashboard({ session, profile }) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('student_active_tab') || 'events'); // events, activity, teams, profile
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-views for events
  const [selectedEvent, setSelectedEvent] = useState(null); // When an event is clicked for "Join Team"
  const [teamAction, setTeamAction] = useState(null); // 'create' or 'join'
  
  // Create Team state
  const [teamName, setTeamName] = useState('');
  const [teamRequirements, setTeamRequirements] = useState('');
  
  // Join Team state
  const [existingTeams, setExistingTeams] = useState([]);
  
  // Recruitment state
  const [myTeamForEvent, setMyTeamForEvent] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [invitingId, setInvitingId] = useState(null);
  
  const [activityTab, setActivityTab] = useState('requested'); // 'requested', 'approve', 'invitations', 'global'
  const [myRequests, setMyRequests] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  
  // My Teams State
  const [myJoinedTeams, setMyJoinedTeams] = useState([]);

  // Profile Form State
  const [formName, setFormName] = useState(profile?.full_name || '');
  const [formSkills, setFormSkills] = useState(profile?.skills?.join(', ') || '');
  const [formWhatsapp, setFormWhatsapp] = useState(profile?.whatsapp_no || '');
  const [formLinkedin, setFormLinkedin] = useState(profile?.linkedin_url || '');
  const [formGithub, setFormGithub] = useState(profile?.github_url || '');
  const [saving, setSaving] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const triggerHaptic = (pattern = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const tabs = ['events', 'activity', 'teams', 'profile'];

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    triggerHaptic(15);
    setActiveTab(tab);
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

  useEffect(() => {
    localStorage.setItem('student_active_tab', activeTab);
    if (activeTab === 'events') {
      fetchEvents();
      setSelectedEvent(null);
      setTeamAction(null);
    } else if (activeTab === 'activity') {
      fetchActivity();
    } else if (activeTab === 'teams') {
      fetchMyJoinedTeams();
    }
  }, [activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('events')
      .select('*, votes(*)')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    
    if (data) setEvents(data);
    setLoading(false);
  };

  const handleVote = async (eventId, option) => {
    const { error } = await supabase
      .from('votes')
      .insert([{ event_id: eventId, user_id: profile.id, option_text: option }]);
    
    if (error) {
      if (error.code === '23505') alert("You have already voted in this poll!");
      else alert(error.message);
    } else {
      alert("Vote cast successfully!");
      fetchEvents();
    }
  };

  const fetchMyJoinedTeams = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('teams(*, events(title), profiles!teams_creator_id_fkey(full_name, whatsapp_no), team_members(profiles(full_name, email, whatsapp_no, linkedin_url, github_url)))')
      .eq('user_id', profile.id);
    if (data) setMyJoinedTeams(data.map(tm => tm.teams));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formName,
        skills: formSkills.split(',').map(s => s.trim()).filter(s => s),
        whatsapp_no: formWhatsapp,
        linkedin_url: formLinkedin,
        github_url: formGithub
      })
      .eq('id', profile.id);
    
    if (!error) {
      alert("Profile updated successfully!");
      window.location.reload(); // Refresh to update global profile state
    } else {
      alert("Error updating profile: " + error.message);
    }
    setSaving(false);
  };

  const fetchActivity = async () => {
    // 1. Fetch requests I have sent (Requested Tab)
    const { data: myReqs } = await supabase
      .from('join_requests')
      .select('*, teams(team_name, event_id, events(title))')
      .eq('applicant_id', profile.id)
      .eq('source', 'application')
      .order('created_at', { ascending: false });
    if (myReqs) setMyRequests(myReqs);

    // 2. Fetch invitations sent to me (Invitations Tab)
    const { data: myInvites, error: inviteError } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams (
          team_name,
          creator_id,
          events (title),
          profiles:creator_id (full_name)
        )
      `)
      .eq('applicant_id', profile.id)
      .eq('source', 'invitation')
      .order('created_at', { ascending: false });
    
    if (inviteError) {
      console.error("INVITE ERROR:", inviteError);
    }
    if (myInvites) setMyInvitations(myInvites);

    // 3. Fetch requests sent to my teams (Approve Request Tab)
    const { data: myTeams } = await supabase
      .from('teams')
      .select('id')
      .eq('creator_id', profile.id);

    if (myTeams && myTeams.length > 0) {
      const teamIds = myTeams.map(t => t.id);
      const { data: incomingReqs } = await supabase
        .from('join_requests')
        .select('*, teams(team_name, event_id, events(title)), profiles(full_name, skills, branch, email)')
        .in('team_id', teamIds)
        .eq('status', 'pending')
        .eq('source', 'application');
      if (incomingReqs) setIncomingRequests(incomingReqs);
    }

    // 4. Fetch invitations I have sent (Recruitment check)
    const { data: sentInvites } = await supabase
      .from('join_requests')
      .select('applicant_id')
      .eq('source', 'invitation');
    if (sentInvites) setSentInvitations(sentInvites.map(i => i.applicant_id));

    // 5. Fetch all requests globally
    const { data: allReqs } = await supabase
      .from('join_requests')
      .select('*, teams(team_name, event_id, events(title)), profiles(full_name)')
      .order('created_at', { ascending: false });
    if (allReqs) setAllRequests(allReqs);
  };

  const handleSelectEvent = async (event) => {
    setSelectedEvent(event);
    setLoading(true);
    // Check if I already have a team for this event
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('event_id', event.id)
      .eq('creator_id', profile.id)
      .maybeSingle();
    
    if (data) {
      setMyTeamForEvent(data);
      setTeamAction('create'); // Use create view for management
      setTeamName(data.team_name);
      setTeamRequirements(data.requirements);
      fetchAvailableStudents(event.id);
    } else {
      setMyTeamForEvent(null);
    }
    setLoading(false);
  };

  // Clear fresh login flag after first load
  useEffect(() => {
    if (localStorage.getItem('fresh_login') === 'true') {
      setActiveTab('events');
      localStorage.removeItem('fresh_login');
    }
  }, []);

  const fetchAvailableStudents = async (eventId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .neq('id', profile.id)
      .limit(20); // Limit to 20 for performance
    if (data) setAvailableStudents(data);
  };

  const handleInviteStudent = async (studentId) => {
    if (!myTeamForEvent) return;
    setInvitingId(studentId);
    const { error } = await supabase.from('join_requests').insert([
      { 
        team_id: myTeamForEvent.id, 
        applicant_id: studentId, 
        source: 'invitation',
        status: 'pending' 
      }
    ]);

    if (!error) {
      alert("Invitation sent!");
    } else {
      if (error.code === '23505') alert("Invitation already sent to this student.");
      else alert(error.message);
    }
    setInvitingId(null);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (myTeamForEvent) {
      // Update existing team
      const { error } = await supabase
        .from('teams')
        .update({ team_name: teamName, requirements: teamRequirements })
        .eq('id', myTeamForEvent.id);
      if (!error) alert("Team details updated!");
      else alert(error.message);
      return;
    }

    const { data, error } = await supabase.from('teams').insert([
      { 
        event_id: selectedEvent.id, 
        creator_id: profile.id, 
        team_name: teamName, 
        requirements: teamRequirements,
        icon_url: '🚀'
      }
    ]);

    if (error) {
      if (error.code === '23505') alert("You can only create one team per event!");
      else alert(error.message);
    } else {
      alert("Team created successfully! Now you can invite students.");
      // Refresh to show management view
      handleSelectEvent(selectedEvent);
    }
  };

  const loadExistingTeams = async () => {
    setTeamAction('join');
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles!teams_creator_id_fkey(full_name),
        join_requests(
          id,
          status,
          profiles!join_requests_applicant_id_fkey(full_name)
        )
      `)
      .eq('event_id', selectedEvent.id);
    if (data) setExistingTeams(data);
  };

  const handleRequestJoin = async (teamId) => {
    const { error } = await supabase.from('join_requests').insert([
      { team_id: teamId, applicant_id: profile.id }
    ]);
    if (error) {
      if (error.code === '23505') alert("You have already requested to join this team.");
      else alert(error.message);
    } else {
      alert("Request sent successfully!");
    }
  };

  const handleRequestResponse = async (requestId, status, applicantId, teamId) => {
    // status can be 'approved' or 'rejected'
    const { error } = await supabase
      .from('join_requests')
      .update({ status })
      .eq('id', requestId);
    
    if (error) {
      alert(error.message);
      return;
    }

    if (status === 'approved') {
      // Also insert into team_members
      await supabase.from('team_members').insert([
        { team_id: teamId, user_id: applicantId, role: 'member' }
      ]);
    }

    alert(`Request ${status}!`);
    fetchActivity(); // Refresh
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
        <div className="blob blob-2"></div>
      </div>

      <header className="glass-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'var(--accent)', color: 'white', padding: '0.4rem', borderRadius: '12px' }}>
              <Users size={20} />
            </div>
            Mechatronics <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>Student</span>
          </div>
          
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${activeTab === 'events' ? 'btn-secondary' : ''}`} 
              style={{ background: activeTab === 'events' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
            <button 
              className={`btn ${activeTab === 'activity' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'activity' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
            <button 
              className={`btn ${activeTab === 'teams' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'teams' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => setActiveTab('teams')}
            >
              My Teams
            </button>
            <button 
              className={`btn ${activeTab === 'profile' ? 'btn-secondary' : ''}`}
              style={{ background: activeTab === 'profile' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', padding: '0.5rem 1rem' }}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </nav>

          <button className="btn" style={{ padding: '0.5rem', background: 'transparent' }} onClick={() => supabase.auth.signOut()}>
            <LogOut size={20} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        <div className={`mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
          <Calendar size={20} />
          <span>Events</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <Activity size={20} />
          <span>Activity</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          <Users size={20} />
          <span>My Teams</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={20} />
          <span>Profile</span>
        </div>
      </div>

      <main className="container fade-in-up" style={{ flex: 1, padding: '3rem 2rem', maxWidth: '900px' }}>
        
        {/* EVENTS TAB */}
        {activeTab === 'events' && !selectedEvent && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Active Events</h1>
            <p className="subtitle">Discover upcoming events, vote on polls, and build your dream team.</p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading events...</div>
            ) : events.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No active events</h3>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {events.map((event) => (
                  <div key={event.id} className="glass-panel fade-in-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                          <span style={{ 
                            fontSize: '0.65rem', padding: '0.1rem 0.6rem', borderRadius: '100px', fontWeight: 700, textTransform: 'uppercase',
                            background: event.type === 'poll' ? 'rgba(175, 82, 222, 0.1)' : event.type === 'message' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 113, 227, 0.1)',
                            color: event.type === 'poll' ? '#AF52DE' : event.type === 'message' ? '#34C759' : 'var(--accent)'
                          }}>
                            {event.type}
                          </span>
                          {event.expires_at && (
                            <span style={{ fontSize: '0.65rem', color: '#ff3b30', fontWeight: 600 }}>Expires: {new Date(event.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{event.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>{event.description}</p>
                      </div>
                    </div>

                    {/* POLL UI */}
                    {event.type === 'poll' && event.options && (
                      <div style={{ display: 'grid', gap: '0.8rem', marginTop: '0.5rem' }}>
                        {event.options.map((opt, i) => {
                          const voteCount = (event.votes || []).filter(v => v.option_text === opt).length;
                          const totalVotes = (event.votes || []).length;
                          const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                          const hasVoted = (event.votes || []).some(v => v.user_id === profile.id);
                          
                          return (
                            <button 
                              key={i} 
                              className="glass-panel" 
                              style={{ 
                                padding: '1rem', textAlign: 'left', border: '1px solid var(--glass-border)', 
                                position: 'relative', overflow: 'hidden', cursor: hasVoted ? 'default' : 'pointer',
                                background: 'rgba(255, 255, 255, 0.8)', color: '#1d1d1f',
                                width: '100%', border: 'none', borderRadius: '12px'
                              }}
                              onClick={() => !hasVoted && handleVote(event.id, opt)}
                            >
                              <div style={{ 
                                position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, 
                                background: 'rgba(0, 113, 227, 0.15)', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }}></div>
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', zIndex: 1 }}>
                                <span>{opt}</span>
                                <span style={{ color: 'var(--accent)' }}>{voteCount} votes ({Math.round(percent)}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {event.know_more_url && (
                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => window.open(event.know_more_url, '_blank')}>
                          Learn More
                        </button>
                      )}
                      {event.is_team_joining_enabled && (
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => handleSelectEvent(event)}>
                          {myTeamForEvent?.event_id === event.id ? 'Manage Team' : 'Join a Team'} <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAM MATCHMAKING (Level 1: Select Option) */}
        {activeTab === 'events' && selectedEvent && !teamAction && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '1rem' }} onClick={() => setSelectedEvent(null)}>
              ← Back to Events
            </button>
            <h1 className="title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{selectedEvent.title} Teams</h1>
            <p className="subtitle">Would you like to create your own team and invite members, or join an existing one?</p>
            
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div className="glass-panel" style={{ flex: 1, padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => setTeamAction('create')}>
                <Shield size={40} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Make a New Team</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Define your requirements and recruit specific roles.</p>
              </div>
              <div className="glass-panel" style={{ flex: 1, padding: '2rem', textAlign: 'center', cursor: 'pointer' }} onClick={loadExistingTeams}>
                <Users size={40} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Join Existing Team</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Browse active teams and request to join them.</p>
              </div>
            </div>
          </div>
        )}

        {/* TEAM MATCHMAKING (Level 2: Create Team / Manage Team) */}
        {activeTab === 'events' && selectedEvent && teamAction === 'create' && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '1.5rem' }} onClick={() => setTeamAction(null)}>
              ← Back Options
            </button>
            
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>{myTeamForEvent ? 'Edit Team Details' : 'Make a New Team'}</h2>
              <form onSubmit={handleCreateTeam}>
                <div className="input-group">
                  <label className="input-label">Team Name</label>
                  <input type="text" className="glass-input" required value={teamName} onChange={(e)=>setTeamName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Requirements (e.g., Need 1 Frontend, Female member preferred)</label>
                  <textarea className="glass-input" rows="4" required value={teamRequirements} onChange={(e)=>setTeamRequirements(e.target.value)}></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{myTeamForEvent ? 'Update Team Details' : 'Create Team & Publish Request'}</button>
              </form>
            </div>

            {myTeamForEvent && (
              <div className="fade-in-up">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Recruit Students</h2>
                <p className="subtitle" style={{ marginBottom: '1.5rem' }}>Invite students to join your team. They will see your request in their activity tab.</p>
                
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="🔍 Search students by name or skills..." 
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  {availableStudents
                    .filter(s => 
                      !studentSearch || 
                      s.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
                      s.skills?.some(skill => skill.toLowerCase().includes(studentSearch.toLowerCase()))
                    )
                    .map(student => {
                      const alreadyInvited = sentInvitations.includes(student.id);
                      return (
                        <div key={student.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{student.full_name}</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.branch}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.6rem' }}>
                              {student.skills?.slice(0, 3).map((skill, idx) => (
                                <span key={idx} style={{ fontSize: '0.6rem', padding: '0.1rem 0.5rem', background: 'rgba(0,113,227,0.1)', color: 'var(--accent)', borderRadius: '100px', fontWeight: 600 }}>{skill}</span>
                              ))}
                            </div>
                          </div>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', marginLeft: '1rem' }}
                            onClick={() => handleInviteStudent(student.id)}
                            disabled={invitingId === student.id || alreadyInvited}
                          >
                            {invitingId === student.id ? '...' : alreadyInvited ? 'Sent' : 'Invite'}
                          </button>
                        </div>
                      );
                    })}
                </div>
                {availableStudents.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No other students found.</p>}
              </div>
            )}
          </div>
        )}

        {/* TEAM MATCHMAKING (Level 2: Join Existing) */}
        {activeTab === 'events' && selectedEvent && teamAction === 'join' && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginBottom: '1.5rem' }} onClick={() => setTeamAction(null)}>
              ← Back Options
            </button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Existing Teams</h2>
            
            {/* Search Bar for Teams */}
            <div className="input-group" style={{ marginBottom: '2rem' }}>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="🔍 Search by skill or requirement (e.g. React, Kotlin)..." 
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />
            </div>
            
            {existingTeams.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No teams created yet for this event.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {existingTeams
                  .filter(team => 
                    !skillSearch || 
                    team.requirements?.toLowerCase().includes(skillSearch.toLowerCase()) ||
                    team.team_name.toLowerCase().includes(skillSearch.toLowerCase())
                  )
                  .map(team => {
                    const hasRequested = myRequests.some(r => r.team_id === team.id && r.status === 'pending');
                    return (
                      <div key={team.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{team.icon_url || '🚀'}</span> {team.team_name}
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.2rem' }}>
                              Created by: {team.profiles?.full_name || 'Anonymous'}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(0,113,227,0.1)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '100px' }}>
                              {team.team_members?.length || 0} MEMBERS
                            </span>
                          </div>
                        </div>

                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Looking For</p>
                          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{team.requirements}</p>
                        </div>

                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', marginTop: '0.5rem' }} 
                          onClick={() => handleRequestJoin(team.id)}
                          disabled={hasRequested}
                        >
                          {hasRequested ? 'Request Sent' : 'Request to Join'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
              <div>
                <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>My Activity</h1>
                <p className="subtitle" style={{ marginBottom: 0 }}>Manage your sent requests and approve incoming ones.</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={fetchActivity}>
                Refresh List
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${activityTab === 'requested' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setActivityTab('requested')}
              >
                Applications ({myRequests.length})
              </button>
              <button 
                className={`btn ${activityTab === 'invitations' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setActivityTab('invitations')}
              >
                Invitations ({(myInvitations || []).filter(i=>i.status==='pending').length})
              </button>
              <button 
                className={`btn ${activityTab === 'approve' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setActivityTab('approve')}
              >
                Team Requests ({incomingRequests.length})
              </button>
              <button 
                className={`btn ${activityTab === 'global' ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setActivityTab('global')}
              >
                Global
              </button>
            </div>
            {activityTab === 'invitations' && (
              <div className="fade-in-up">
                {myInvitations.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No invitations received yet.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {myInvitations.map(invite => (
                      <div key={invite.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>TEAM INVITATION</p>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{invite.teams?.team_name}</h3>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Leader: {invite.teams?.profiles?.full_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Event: {invite.teams?.events?.title}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                          {invite.status === 'pending' ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', background: '#34C759' }} onClick={() => handleRequestResponse(invite.id, 'approved', profile.id, invite.team_id)}>Accept</button>
                              <button className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', color: '#ff3b30' }} onClick={() => handleRequestResponse(invite.id, 'rejected', profile.id, invite.team_id)}>Decline</button>
                            </>
                          ) : (
                            <span style={{ color: invite.status === 'approved' ? '#34C759' : '#ff3b30', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem' }}>{invite.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activityTab === 'global' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {allRequests.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No activity on the platform yet.</p> : null}
                {allRequests.map(req => (
                  <div key={req.id} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{req.profiles?.full_name || 'Anonymous'} applied to {req.teams?.team_name}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Event: {req.teams?.events?.title}</p>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                        background: req.status === 'approved' ? 'rgba(52, 199, 89, 0.2)' : req.status === 'rejected' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 149, 0, 0.2)',
                        color: req.status === 'approved' ? '#34C759' : req.status === 'rejected' ? '#ff3b30' : '#ff9500'
                      }}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activityTab === 'requested' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {myRequests.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>You haven't requested to join any teams yet.</p> : null}
                {myRequests.map(req => (
                  <div key={req.id} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{req.teams?.team_name}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Event: {req.teams?.events?.title}</p>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                        background: req.status === 'approved' ? 'rgba(52, 199, 89, 0.2)' : req.status === 'rejected' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 149, 0, 0.2)',
                        color: req.status === 'approved' ? '#34C759' : req.status === 'rejected' ? '#ff3b30' : '#ff9500'
                      }}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activityTab === 'approve' && (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {incomingRequests.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No pending requests for your teams.</p> : null}
                {incomingRequests.map(req => (
                  <div key={req.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.8rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>{req.teams?.team_name}</p>
                      <p style={{ fontWeight: 600, fontSize: '1.2rem', marginTop: '0.2rem' }}>{req.profiles?.full_name}</p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{req.profiles?.email}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9rem' }}><strong>Branch/Skills:</strong> {req.profiles?.skills?.join(', ') || req.profiles?.branch || 'Not specified'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', flex: 1, background: '#34C759', boxShadow: '0 4px 14px rgba(52, 199, 89, 0.4)' }} onClick={() => handleRequestResponse(req.id, 'approved', req.applicant_id, req.team_id)}>
                        <CheckCircle size={18} /> Approve
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', flex: 1, color: '#ff3b30' }} onClick={() => handleRequestResponse(req.id, 'rejected', req.applicant_id, req.team_id)}>
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>My Teams</h1>
            <p className="subtitle">View your current teams and connect with your teammates.</p>
            
            {myJoinedTeams.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>You haven't joined any teams yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {myJoinedTeams.map(team => (
                  <div key={team.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {team.icon_url} {team.team_name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', marginTop: '0.2rem' }}>Event: {team.events?.title}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Created by: {team.profiles?.full_name}</p>
                    
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Teammates</p>
                      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                        {team.team_members?.map((member, idx) => (
                          <div key={idx} className="glass-panel" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: 'var(--accent)' }}></div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {member.profiles?.full_name} 
                              {member.profiles?.id === team.creator_id && (
                                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', background: '#ff9500', color: 'white', borderRadius: '4px', fontWeight: 800 }}>LEADER</span>
                              )}
                              {member.profiles?.id === profile.id && <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>(You)</span>}
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>{member.profiles?.email}</p>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                              {member.profiles?.skills?.map((skill, sIdx) => (
                                <span key={sIdx} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(0,113,227,0.1)', color: 'var(--accent)', borderRadius: '100px', fontWeight: 600 }}>
                                  {skill}
                                </span>
                              ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.8rem' }}>
                              {member.profiles?.whatsapp_no && (
                                <a href={`https://wa.me/${member.profiles.whatsapp_no.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" title="WhatsApp" style={{ color: '#34C759', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                                  <Activity size={14} /> WhatsApp
                                </a>
                              )}
                              {member.profiles?.github_url && (
                                <a href={member.profiles.github_url} target="_blank" rel="noreferrer" title="GitHub" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                                  <PlusCircle size={14} /> GitHub
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="fade-in-up">
            <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>My Profile</h1>
            <p className="subtitle">Manage your personal details and skills.</p>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="glass-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">WhatsApp Number</label>
                  <input type="tel" className="glass-input" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} placeholder="+91..." />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input type="text" className="glass-input" disabled value={session.user.email} style={{ opacity: 0.7 }} />
              </div>
              <div className="input-group">
                <label className="input-label">Branch & Skills (Comma separated)</label>
                <input type="text" className="glass-input" placeholder="e.g. Computer Science, React, UI/UX" value={formSkills} onChange={(e) => setFormSkills(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="input-group">
                  <label className="input-label">LinkedIn URL</label>
                  <input type="url" className="glass-input" value={formLinkedin} onChange={(e) => setFormLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="input-group">
                  <label className="input-label">GitHub URL</label>
                  <input type="url" className="glass-input" value={formGithub} onChange={(e) => setFormGithub(e.target.value)} placeholder="https://github.com/..." />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default StudentDashboard;
