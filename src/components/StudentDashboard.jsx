import React, { useState, useEffect } from 'react';
import { 
  LogOut, User, Calendar, PlusCircle, ArrowRight, Activity, 
  Users, Shield, CheckCircle, XCircle, Star, Search, 
  MapPin, Link as LinkIcon, Briefcase, Globe, GitBranch, FileText
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function StudentDashboard({ session, profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Derived active tab from URL path
  const activeTab = location.pathname.split('/')[1] || 'events';

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

  // Find Member Form State
  const [listingTeamName, setListingTeamName] = useState('');
  const [hackathonName, setHackathonName] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [mode, setMode] = useState('Online');
  const [formLocation, setFormLocation] = useState('');
  const [rolesNeeded, setRolesNeeded] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minExperience, setMinExperience] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [isCreatingListing, setIsCreatingListing] = useState(false);

  // Listings State
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Discovery State
  const [externalHackathons, setExternalHackathons] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);

  // Profile Form State additions
  const [formDevRole, setFormDevRole] = useState(profile?.dev_role || '');
  const [formResume, setFormResume] = useState(profile?.resume_url || '');

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const triggerHaptic = (pattern = 10) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const tabs = ['events', 'discovery', 'find_member', 'activity', 'teams', 'profile'];


  const handleTabChange = (tab) => {
    navigate(`/${tab === 'events' ? '' : tab}`);
    triggerHaptic(15);
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
    if (activeTab === 'events') {
      fetchEvents();
      setSelectedEvent(null);
      setTeamAction(null);
    } else if (activeTab === 'discovery') {
      fetchDiscovery();
    } else if (activeTab === 'find_member') {
      fetchListings();
    } else if (activeTab === 'teams') {
      fetchMyTeams();
    } else if (activeTab === 'activity') {
      fetchActivity();
    } else if (activeTab === 'teams') {
      fetchMyJoinedTeams();
    }
  }, [activeTab, profile?.id]);

  const fetchDiscovery = async () => {
    if (!profile?.id) return;
    setLoadingDiscovery(true);
    const { data: hackathons } = await supabase.from('external_hackathons').select('*').order('created_at', { ascending: false });
    const { data: favs } = await supabase.from('favorites').select('hackathon_id').eq('user_id', profile.id);
    
    if (hackathons) setExternalHackathons(hackathons);
    if (favs) setFavorites(favs.map(f => f.hackathon_id));
    setLoadingDiscovery(false);
  };

  const fetchListings = async () => {
    setLoadingListings(true);
    const { data, error } = await supabase
      .from('team_listings')
      .select('*, profiles(full_name, dev_role, skills)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching listings:", error);
    } else {
      console.log("Fetched listings:", data);
      setListings(data || []);
    }
    setLoadingListings(false);
  };

  const toggleFavorite = async (hackathonId) => {
    if (favorites.includes(hackathonId)) {
      await supabase.from('favorites').delete().eq('user_id', profile.id).eq('hackathon_id', hackathonId);
      setFavorites(favorites.filter(id => id !== hackathonId));
    } else {
      await supabase.from('favorites').insert([{ user_id: profile.id, hackathon_id: hackathonId }]);
      setFavorites([...favorites, hackathonId]);
    }
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!profile?.id) {
      alert("Profile not loaded. Please refresh.");
      return;
    }
    
    setIsCreatingListing(true);
    try {
      const { error } = await supabase.from('team_listings').insert([{
        creator_id: profile.id,
        team_name: listingTeamName,
        hackathon_name: hackathonName,
        registration_link: registrationLink,
        mode,
        location: formLocation,
        roles_needed: rolesNeeded.split(',').map(r => r.trim()).filter(r => r),
        required_skills: requiredSkills.split(',').map(s => s.trim()).filter(s => s),
        min_experience: minExperience,
        description: listingDescription
      }]);

      if (!error) {
        alert("Post created successfully!");
        setListingTeamName('');
        setHackathonName('');
        setRegistrationLink('');
        setFormLocation('');
        setRolesNeeded('');
        setRequiredSkills('');
        setMinExperience('');
        setListingDescription('');
        fetchListings();
        setTeamAction(null);
      } else {
        alert(error.message);
      }
    } catch (err) {
      console.error("LISTING ERROR:", err);
      alert("System Error: " + err.message);
    } finally {
      setIsCreatingListing(false);
    }
  };

  const handleApplyToListing = async (listingId) => {
    const { error } = await supabase.from('join_requests').insert([
      { listing_id: listingId, applicant_id: profile.id, source: 'application' }
    ]);
    if (error) {
      if (error.code === '23505') alert("You have already applied to this team.");
      else alert(error.message);
    } else {
      alert("Application sent! The team lead will be notified.");
    }
  };


  const fetchEvents = async () => {
    setLoading(true);
    const now = new Date().toISOString();
    
    // Fetch Admin Events
    const { data: adminEvents } = await supabase
      .from('events')
      .select('*, votes(*)')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });
    
    // Fetch Student Listings
    const { data: studentListings, error: listError } = await supabase
      .from('team_listings')
      .select('*, profiles(full_name, dev_role, skills)')
      .order('created_at', { ascending: false });
    
    if (listError) console.error("Error fetching student listings for feed:", listError);

    // Combine and Sort
    const combined = [
      ...(adminEvents || []).map(e => ({ ...e, source_type: 'admin' })),
      ...(studentListings || []).map(l => ({ ...l, source_type: 'student', title: l.team_name, description: l.description, type: 'recruitment' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setEvents(combined);
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
        github_url: formGithub,
        dev_role: formDevRole,
        resume_url: formResume
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
    if (!profile?.id) return;
    // 1. Fetch requests I have sent (Requested Tab)
    const { data: myReqs } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams:teams!team_id(
          team_name,
          event_id,
          events:events!event_id(title),
          profiles:profiles!creator_id(whatsapp_no)
        ),
        team_listings:team_listings!listing_id(
          team_name,
          hackathon_name,
          profiles:profiles!creator_id(whatsapp_no)
        )
      `)
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
        .select(`
          *,
          teams:teams!team_id(
            team_name,
            event_id,
            events:events!event_id(title)
          ),
          profiles:profiles!applicant_id(full_name, skills, branch, email, github_url, linkedin_url, resume_url)
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending')
        .eq('source', 'application');
      if (incomingReqs) setIncomingRequests(incomingReqs);
    }

    // Also fetch requests for listings
    const { data: myListings } = await supabase.from('team_listings').select('id').eq('creator_id', profile.id);
    if (myListings && myListings.length > 0) {
        const listingIds = myListings.map(l => l.id);
        const { data: listingReqs } = await supabase
            .from('join_requests')
            .select('*, team_listings(team_name, hackathon_name), profiles!applicant_id(full_name, skills, branch, email, github_url, linkedin_url, resume_url)')
            .in('listing_id', listingIds)
            .eq('status', 'pending');
        if (listingReqs) {
            setIncomingRequests(prev => [...prev, ...listingReqs]);
        }
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
      .select(`
        *,
        teams:teams!team_id(
          team_name,
          event_id,
          events:events!event_id(title)
        ),
        profiles:profiles!applicant_id(full_name)
      `)
      .order('created_at', { ascending: false });
    if (allReqs) setAllRequests(allReqs);

    // 6. Fetch invitations received
    const { data: myInvs } = await supabase
      .from('join_requests')
      .select(`
        *,
        teams:teams!team_id(
          team_name,
          profiles:profiles!creator_id(full_name)
        )
      `)
      .eq('applicant_id', profile.id)
      .eq('source', 'invitation');
    if (myInvs) setMyInvitations(myInvs);
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
        profiles(full_name),
        join_requests(
          id,
          status,
          profiles(full_name)
        )
      `)
      .eq('event_id', selectedEvent.id);
    
    if (error) {
      console.error("Error loading existing teams:", error);
      alert("Failed to load teams. Check console for details.");
    } else {
      setExistingTeams(data || []);
    }
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

  const fetchMyTeams = async () => {
    setLoading(true);
    try {
      const { data: created } = await supabase.from('teams').select('*, events(*)').eq('creator_id', profile.id);
      const { data: joined } = await supabase.from('team_members').select('*, teams(*, events(*))').eq('user_id', profile.id);
      const combined = [...(created || []).map(t => ({ ...t, isLead: true })), ...(joined || []).map(j => ({ ...j.teams, isLead: false }))];
      const unique = Array.from(new Map((combined || []).filter(t=>t).map(t => [t.id, t])).values());
      setMyJoinedTeams(unique);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', profile.id);
    if (!error) fetchMyTeams();
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

    if (status === 'approved' && teamId) {
      // Also insert into team_members (only for on-campus events)
      await supabase.from('team_members').insert([
        { team_id: teamId, user_id: applicantId, role: 'member' }
      ]);
    }

    alert(`Request ${status}!`);
    fetchActivity(); // Refresh
  };

  return (
    <div 
      className="dashboard-root"
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
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 2rem' }}>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'var(--gradient-blue)', color: 'white', padding: '0.5rem', borderRadius: '14px', boxShadow: '0 8px 16px rgba(0, 122, 255, 0.3)' }}>
              <Users size={22} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Matchups</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.1em' }}>Student Console</span>
            </div>
          </div>
          
          <nav className="desktop-nav" style={{ display: 'flex', gap: '0.5rem' }}>
            {tabs.map(tab => (
              <div 
                key={tab} 
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
              </div>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div className="glass-panel" style={{ padding: '0.4rem 1rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '0.6rem', border: '1px solid var(--glass-border)' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34C759', boxShadow: '0 0 8px #34C759' }}></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Live</span>
             </div>
             <button className="btn" style={{ padding: '0.5rem', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', borderRadius: '12px' }} onClick={() => supabase.auth.signOut()}>
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        <div className={`mobile-nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => handleTabChange('events')}>
          <Calendar size={22} />
          <span>Events</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'discovery' ? 'active' : ''}`} onClick={() => handleTabChange('discovery')}>
          <Globe size={22} />
          <span>Discovery</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'find_member' ? 'active' : ''}`} onClick={() => handleTabChange('find_member')}>
          <PlusCircle size={22} />
          <span>Recruit</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => handleTabChange('activity')}>
          <Activity size={22} />
          <span>Activity</span>
        </div>
        <div className={`mobile-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
          <User size={22} />
          <span>Profile</span>
        </div>
      </div>

      <main className="container" style={{ flex: 1, padding: '3rem 2rem', maxWidth: '1000px' }}>
        
        {/* HOME / EVENTS TAB */}
        {activeTab === 'events' && !selectedEvent && (
          <div className="fade-in-up">
            <div style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span className="badge badge-blue">Welcome Back</span>
              </div>
              <h1 className="dashboard-title">Hi, {profile?.full_name?.split(' ')[0] || 'Builder'}</h1>
              <p className="subtitle">Ready to join your next dream team? Here's what's happening on campus.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Events</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{events.length}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>My Teams</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#AF52DE' }}>{myJoinedTeams.length}</span>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pending Requests</span>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: '#FF9500' }}>{incomingRequests.length}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>On-Campus Events</h2>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={fetchEvents}>Refresh</button>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[1,2,3].map(i => <div key={i} className="glass-panel skeleton" style={{ height: '180px' }}></div>)}
              </div>
            ) : events.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No active events found</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Check back later for new hackathons and workshops.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {events.map((event) => (
                  <div key={event.id} className="glass-panel fade-in-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', border: event.source_type === 'admin' ? '1px solid var(--glass-border)' : '1px solid var(--accent-light)' }}>
                    
                    {/* Source Banner */}
                    <div style={{ 
                      background: event.source_type === 'admin' ? 'var(--gradient-blue)' : 'var(--gradient-purple)',
                      color: 'white',
                      padding: '0.4rem 1.2rem',
                      borderRadius: '100px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      alignSelf: 'flex-start',
                      marginBottom: '-0.5rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {event.source_type === 'admin' ? 'Official Admin Post' : `Student Post: ${event.profiles?.full_name}`}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <span className={`badge ${event.type === 'poll' ? 'badge-purple' : event.type === 'recruitment' ? 'badge-green' : 'badge-blue'}`}>{event.type}</span>
                          {event.expires_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#FF3B30', fontWeight: 700 }}>
                              <Activity size={14} /> Ends {new Date(event.expires_at).toLocaleDateString()}
                            </div>
                          )}
                          {event.source_type === 'student' && (
                            <span className="badge badge-secondary">{event.mode}</span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{event.title}</h3>
                        {event.source_type === 'student' && (
                          <p style={{ color: 'var(--accent)', fontWeight: 700, marginTop: '0.2rem' }}>Target: {event.hackathon_name}</p>
                        )}
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1rem', lineHeight: '1.6' }}>{event.description}</p>
                      </div>
                    </div>

                    {event.source_type === 'student' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: 'var(--accent-light)', padding: '1rem', borderRadius: '14px' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Skills Needed</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {event.required_skills?.map((s, i) => <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700 }}>{s}</span>)}
                          </div>
                        </div>
                        <div style={{ background: 'rgba(175, 82, 222, 0.08)', padding: '1rem', borderRadius: '14px' }}>
                          <p style={{ fontSize: '0.65rem', color: '#AF52DE', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Open Roles</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {event.roles_needed?.map((r, i) => <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r}</span>)}
                          </div>
                        </div>
                      </div>
                    )}

                    {event.type === 'poll' && event.options && (
                      <div style={{ display: 'grid', gap: '0.8rem', background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '20px' }}>
                        {event.options.map((opt, i) => {
                          const voteCount = (event.votes || []).filter(v => v.option_text === opt).length;
                          const totalVotes = (event.votes || []).length;
                          const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                          const hasVoted = (event.votes || []).some(v => v.user_id === profile.id);
                          
                          return (
                            <button 
                              key={i} 
                              className="poll-option" 
                              style={{ 
                                padding: '1.2rem', textAlign: 'left', border: '1px solid var(--glass-border)', 
                                position: 'relative', overflow: 'hidden', cursor: hasVoted ? 'default' : 'pointer',
                                background: 'white', color: 'var(--text-primary)',
                                width: '100%', borderRadius: '16px', transition: 'all 0.3s ease',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              onClick={() => !hasVoted && handleVote(event.id, opt)}
                            >
                              <div style={{ 
                                position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, 
                                background: 'var(--accent-light)', transition: 'width 1s cubic-bezier(0.2, 0, 0, 1)' 
                              }}></div>
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', zIndex: 1 }}>
                                <span>{opt}</span>
                                <span style={{ color: 'var(--accent)' }}>{voteCount} ({Math.round(percent)}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {event.source_type === 'admin' ? (
                        <>
                          {event.know_more_url && (
                            <button className="btn btn-secondary" onClick={() => window.open(event.know_more_url, '_blank')}>
                              Details <ArrowRight size={18} />
                            </button>
                          )}
                          {event.is_team_joining_enabled && (
                            <button className="btn btn-primary" onClick={() => handleSelectEvent(event)}>
                              {myTeamForEvent?.event_id === event.id ? 'Manage Team' : 'Build a Team'}
                            </button>
                          )}
                        </>
                      ) : (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleApplyToListing(event.id)}>
                          Request to Join Team <Users size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DISCOVERY TAB */}
        {activeTab === 'discovery' && (
          <div className="fade-in-up">
            <h1 className="dashboard-title">Team Discovery</h1>
            <p className="subtitle">Curated hackathons and opportunities from around the web.</p>

            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Search size={20} color="var(--text-secondary)" />
              <input type="text" className="glass-input" style={{ border: 'none', background: 'transparent', backdropFilter: 'none', padding: '0.5rem' }} placeholder="Search global hackathons..." />
            </div>

            {loadingDiscovery ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[1,2,3,4].map(i => <div key={i} className="glass-panel skeleton" style={{ height: '350px' }}></div>)}
              </div>
            ) : externalHackathons.length === 0 ? (
               <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                 <Globe size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                 <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No Hackathons Found</h3>
                 <p style={{ color: 'var(--text-secondary)' }}>We couldn't find any external events. Make sure you've run the SQL setup script.</p>
               </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {externalHackathons.map((hack) => (
                  <div key={hack.id} className="glass-panel fade-in-up" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={hack.image_url || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000'} alt={hack.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <button 
                          className="btn" 
                          onClick={() => toggleFavorite(hack.id)}
                          style={{ 
                            width: '40px', height: '40px', padding: '0', borderRadius: '50%',
                            background: favorites.includes(hack.id) ? '#FF2D55' : 'rgba(255,255,255,0.8)',
                            color: favorites.includes(hack.id) ? 'white' : '#FF2D55',
                            backdropFilter: 'blur(10px)', border: 'none'
                          }}
                        >
                          <Star size={18} fill={favorites.includes(hack.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                        <span className="badge badge-blue" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>{hack.source || 'Hackathon'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{hack.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, lineHeight: '1.6' }}>{hack.description?.slice(0, 100)}...</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Calendar size={14} /> {hack.date}
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => window.open(hack.link, '_blank')}>
                        Visit Official Site <Globe size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIND MEMBER TAB */}
        {activeTab === 'find_member' && (
          <div className="fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
              <div>
                <h1 className="dashboard-title">My Recruitment Posts</h1>
                <p className="subtitle">Manage your listings or create a new one to find talent.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={fetchListings}>
                  <Activity size={18} /> Refresh
                </button>
                <button className="btn btn-primary" onClick={() => setTeamAction(teamAction === 'create_listing' ? null : 'create_listing')}>
                  {teamAction === 'create_listing' ? <><XCircle size={18} /> Close Form</> : <><PlusCircle size={18} /> New Listing</>}
                </button>
              </div>
            </div>

            {teamAction === 'create_listing' && (
              <div className="glass-panel fade-in-up" style={{ padding: '2.5rem', marginBottom: '4rem', border: '2px solid var(--accent)' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2rem' }}>Create a Recruitment Post</h2>
                <form onSubmit={handleCreateListing} style={{ display: 'grid', gap: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label className="input-label">Project / Team Name</label>
                      <input type="text" className="glass-input" placeholder="e.g. Nexus Core" value={listingTeamName} onChange={(e)=>setListingTeamName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Hackathon Target</label>
                      <input type="text" className="glass-input" placeholder="e.g. ETHIndia 2026" value={hackathonName} onChange={(e)=>setHackathonName(e.target.value)} required />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div className="input-group">
                      <label className="input-label">Mode</label>
                      <select className="glass-input" value={mode} onChange={(e)=>setMode(e.target.value)}>
                        <option value="Online">🌐 Remote / Online</option>
                        <option value="Offline">📍 In-Person / Offline</option>
                      </select>
                    </div>
                    {mode === 'Offline' && (
                      <div className="input-group">
                        <label className="input-label">Location / City</label>
                        <input type="text" className="glass-input" placeholder="e.g. Indore, MP" value={formLocation} onChange={(e)=>setFormLocation(e.target.value)} required={mode === 'Offline'} />
                      </div>
                    )}
                    <div className="input-group">
                      <label className="input-label">Roles Needed</label>
                      <input type="text" className="glass-input" placeholder="Frontend, UI Designer, etc." value={rolesNeeded} onChange={(e)=>setRolesNeeded(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Exp. Level</label>
                        <input type="text" className="glass-input" placeholder="Beginner, Pro, etc." value={minExperience} onChange={(e)=>setMinExperience(e.target.value)} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mission Statement</label>
                    <textarea className="glass-input" rows="4" placeholder="What are you building and why should people join you?" value={listingDescription} onChange={(e)=>setListingDescription(e.target.value)} required></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '1.2rem' }} disabled={isCreatingListing}>
                    {isCreatingListing ? 'Publishing...' : 'Publish to Feed'}
                  </button>
                </form>
              </div>
            )}

            {loadingListings ? (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[1,2].map(i => <div key={i} className="glass-panel skeleton" style={{ height: '300px' }}></div>)}
              </div>
            ) : listings.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>No listings yet</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Be the first to start a movement.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '2rem' }}>
                {listings.map((listing) => (
                  <div key={listing.id} className="glass-panel fade-in-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem' }}>
                          <span className={`badge ${listing.mode === 'Online' ? 'badge-blue' : 'badge-green'}`}>{listing.mode}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{listing.team_name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>
                           <Star size={18} fill="currentColor" /> {listing.hackathon_name}
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '1rem 2rem' }} onClick={() => handleApplyToListing(listing.id)}>Apply Now</button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'var(--accent-light)', padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(0,122,255,0.1)' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Required Expertise</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {listing.required_skills?.map((s, i) => <span key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s}</span>)}
                        </div>
                      </div>
                      <div style={{ background: 'rgba(175, 82, 222, 0.08)', padding: '1.2rem', borderRadius: '18px', border: '1px solid rgba(175, 82, 222, 0.1)' }}>
                        <p style={{ fontSize: '0.7rem', color: '#AF52DE', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Open Roles</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {listing.roles_needed?.map((r, i) => <span key={i} style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r}</span>)}
                        </div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7' }}>{listing.description}</p>
                    
                    <div style={{ marginTop: '0.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '16px', background: 'var(--gradient-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.2rem', boxShadow: 'var(--shadow-sm)' }}>
                          {listing.profiles?.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{listing.profiles?.full_name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{listing.profiles?.dev_role || 'Team Lead'}</p>
                        </div>
                      </div>
                      {listing.registration_link && (
                        <button className="btn btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }} onClick={() => window.open(listing.registration_link, '_blank')}>
                           Official Registration <LinkIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAM SELECTION VIEW (Within Events) */}
        {activeTab === 'events' && selectedEvent && !teamAction && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => { setSelectedEvent(null); setTeamAction(null); }}>
              ← All Events
            </button>
            <h1 className="dashboard-title" style={{ fontSize: '2.5rem' }}>{selectedEvent.title}</h1>
            <p className="subtitle">Choose how you want to participate in this event.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => setTeamAction('create')}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                   <Shield size={36} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>I'm a Team Lead</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6' }}>Create a team, define your project, and recruit specific roles from our student database.</p>
                <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }}>Create My Team</button>
              </div>
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', cursor: 'pointer' }} onClick={loadExistingTeams}>
                <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                   <Users size={36} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>I'm Looking to Join</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6' }}>Browse active teams created by other students and request to join their mission.</p>
                <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }}>Browse Teams</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / MANAGE TEAM FORM */}
        {activeTab === 'events' && selectedEvent && teamAction === 'create' && (
          <div className="fade-in-up">
            <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => setTeamAction(null)}>
              ← Change Role
            </button>
            <h1 className="dashboard-title">{myTeamForEvent ? 'Manage Your Team' : 'Establish Your Team'}</h1>
            <p className="subtitle">Set your mission and find the best peers to win.</p>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
              <form onSubmit={handleCreateTeam}>
                <div className="input-group">
                  <label className="input-label">Team Name</label>
                  <input type="text" className="glass-input" value={teamName} onChange={(e)=>setTeamName(e.target.value)} placeholder="e.g. Cyber Knights" required />
                </div>
                <div className="input-group">
                  <label className="input-label">What roles do you need?</label>
                  <textarea className="glass-input" rows="3" value={teamRequirements} onChange={(e)=>setTeamRequirements(e.target.value)} placeholder="e.g. Looking for 1 Backend Dev and 1 Designer..." required></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1.2rem' }}>
                  {myTeamForEvent ? 'Update Team Details' : 'Initialize Team & Start Recruiting'}
                </button>
              </form>

              {myTeamForEvent && (
                <div style={{ marginTop: '4rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Invite Talent</h3>
                  <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <Search size={20} color="var(--text-secondary)" />
                    <input type="text" className="glass-input" style={{ border: 'none', background: 'transparent' }} placeholder="Search students by skill or name..." value={studentSearch} onChange={(e)=>setStudentSearch(e.target.value)} />
                  </div>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {availableStudents.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.skills?.some(sk => sk.toLowerCase().includes(studentSearch.toLowerCase()))).map(student => (
                      <div key={student.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontWeight: 800 }}>{student.full_name}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.dev_role} • {student.skills?.slice(0, 3).join(', ')}</p>
                          </div>
                        </div>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                          onClick={() => handleInviteStudent(student.id)}
                          disabled={invitingId === student.id || sentInvitations.includes(student.id)}
                        >
                          {invitingId === student.id ? 'Sending...' : sentInvitations.includes(student.id) ? 'Invited' : 'Invite'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROWSE / JOIN TEAMS LIST */}
        {activeTab === 'events' && selectedEvent && teamAction === 'join' && (
          <div className="fade-in-up">
             <button className="btn btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => setTeamAction(null)}>
              ← Change Role
            </button>
            <h1 className="dashboard-title">Active Missions</h1>
            <p className="subtitle">Browse teams looking for members for {selectedEvent.title}.</p>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {existingTeams.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                  <Users size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No teams have been formed yet. Why not lead one?</p>
                </div>
              ) : existingTeams.map(team => (
                <div key={team.id} className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{team.icon_url} {team.team_name}</h3>
                      <p style={{ color: 'var(--accent)', fontWeight: 700 }}>Lead: {team.profiles?.full_name}</p>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleRequestJoin(team.id)}
                      disabled={team.join_requests?.some(r => r.applicant_id === profile.id)}
                    >
                      {team.join_requests?.some(r => r.applicant_id === profile.id) ? 'Request Sent' : 'Request to Join'}
                    </button>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '18px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Team Requirements</p>
                    <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>{team.requirements}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
              <div>
                <h1 className="dashboard-title">Platform Activity</h1>
                <p className="subtitle">Manage your connections and collaboration requests.</p>
              </div>
              <button className="btn btn-secondary" onClick={fetchActivity}>
                 Sync Data <Activity size={16} />
              </button>
            </div>
            
            <div className="tab-bar">
              <button className={`tab-btn ${activityTab === 'requested' ? 'active' : ''}`} onClick={() => setActivityTab('requested')}>
                Sent ({myRequests.length})
              </button>
              <button className={`tab-btn ${activityTab === 'invitations' ? 'active' : ''}`} onClick={() => setActivityTab('invitations')}>
                Invites ({(myInvitations || []).filter(i=>i.status==='pending').length})
              </button>
              <button className={`tab-btn ${activityTab === 'approve' ? 'active' : ''}`} onClick={() => setActivityTab('approve')}>
                Approvals ({incomingRequests.length})
              </button>
              <button className={`tab-btn ${activityTab === 'global' ? 'active' : ''}`} onClick={() => setActivityTab('global')}>
                System Log
              </button>
            </div>

            <div style={{ marginTop: '2rem' }}>
                {activityTab === 'requested' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {myRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No sent requests yet.</div>
                    ) : myRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{req.teams?.team_name || req.team_listings?.team_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{req.teams?.events?.title || req.team_listings?.hackathon_name}</p>
                          {req.status === 'approved' && (
                             <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Contact Lead: {req.teams?.profiles?.whatsapp_no || req.team_listings?.profiles?.whatsapp_no || 'Check Profile'}</span>
                             </div>
                          )}
                        </div>
                        <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'invitations' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {(myInvitations || []).filter(inv => inv.status === 'pending').length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No pending invitations.</div>
                    ) : myInvitations.filter(inv => inv.status === 'pending').map(inv => (
                      <div key={inv.id} className="glass-panel fade-in-up" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{inv.teams?.team_name}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Invited by {inv.teams?.profiles?.full_name}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => handleRequestResponse(inv.id, 'approved', profile.id, inv.team_id)}>Accept</button>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', color: '#FF3B30' }} onClick={() => handleRequestResponse(inv.id, 'rejected', profile.id, inv.team_id)}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'approve' && (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {incomingRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No pending approvals.</div>
                    ) : incomingRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'var(--gradient-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.5rem' }}>
                                    {req.profiles?.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{req.profiles?.full_name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Applying for: {req.teams?.team_name || req.team_listings?.team_name}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-primary" style={{ background: '#34C759', boxShadow: '0 8px 16px rgba(52, 199, 89, 0.3)' }} onClick={() => handleRequestResponse(req.id, 'approved', req.applicant_id, req.team_id)}>Approve</button>
                                <button className="btn btn-secondary" style={{ color: '#FF3B30' }} onClick={() => handleRequestResponse(req.id, 'rejected', req.applicant_id, req.team_id)}>Reject</button>
                            </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
                            <div style={{ background: 'var(--accent-light)', padding: '1.2rem', borderRadius: '20px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>Tech Stack</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {req.profiles?.skills?.map((s, i) => <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{s}</span>)}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.2rem', borderRadius: '20px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.8rem' }}>Professional Links</p>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {req.profiles?.github_url && <a href={req.profiles.github_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><GitBranch size={18} /></a>}
                                    {req.profiles?.linkedin_url && <a href={req.profiles.linkedin_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><Globe size={18} /></a>}
                                    {req.profiles?.resume_url && <a href={req.profiles.resume_url} target="_blank" rel="noreferrer" className="nav-item" style={{ padding: '0.4rem' }}><FileText size={18} /></a>}
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activityTab === 'global' && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {allRequests.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No platform activity yet.</div>
                    ) : allRequests.map(req => (
                      <div key={req.id} className="glass-panel fade-in-up" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={16} />
                           </div>
                           <div>
                              <p style={{ fontSize: '0.9rem', fontWeight: 700 }}><span style={{ color: 'var(--accent)' }}>{req.profiles?.full_name}</span> requested to join <span style={{ color: 'var(--text-primary)' }}>{req.teams?.team_name || 'a team'}</span></p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(req.created_at).toLocaleString()}</p>
                           </div>
                        </div>
                        <span className={`badge ${req.status === 'approved' ? 'badge-green' : req.status === 'rejected' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                          {req.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
        {/* TEAMS TAB */}
        {activeTab === 'teams' && (
          <div className="fade-in-up">
            <h1 className="dashboard-title">My Collaborative Missions</h1>
            <p className="subtitle">View and manage teams you've built or joined.</p>

            <div style={{ display: 'grid', gap: '2rem', marginTop: '2rem' }}>
              {myJoinedTeams.length === 0 ? (
                <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                   <Users size={64} color="var(--text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>No Active Teams</h3>
                   <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>You haven't joined any teams yet. Explore events or recruitment posts to find your mission.</p>
                   <button className="btn btn-primary" onClick={() => handleTabChange('events')}>Explore Events</button>
                </div>
              ) : myJoinedTeams.map(team => (
                <div key={team.id} className="glass-panel fade-in-up" style={{ padding: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                        <span className={`badge ${team.isLead ? 'badge-purple' : 'badge-blue'}`}>{team.isLead ? 'Team Lead' : 'Member'}</span>
                        <span className="badge badge-green">{team.events?.title || 'External Project'}</span>
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{team.team_name}</h2>
                    </div>
                    {!team.isLead && (
                      <button className="btn btn-secondary" style={{ color: 'var(--status-red)', borderColor: 'rgba(255,59,48,0.2)' }} onClick={() => handleLeaveTeam(team.id)}>
                        Leave Team
                      </button>
                    )}
                  </div>
                  
                  <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '24px' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>Mission Statement / Requirements</p>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{team.requirements}</p>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', marginLeft: '0.5rem' }}>
                           {[1,2,3].map(i => (
                             <div key={i} style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', border: '2px solid white', marginLeft: '-10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>
                                {i}
                             </div>
                           ))}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Collaboration</span>
                     </div>
                     <button className="btn btn-secondary" onClick={() => handleTabChange('activity')}>
                       View Approvals <ArrowRight size={16} />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="fade-in-up">
            <h1 className="title">My Profile</h1>
            <p className="subtitle">Manage your professional identity and public bio.</p>
            
            <div className="glass-panel" style={{ padding: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2rem' }}>
                 <div style={{ width: '100px', height: '100px', borderRadius: '32px', background: 'var(--gradient-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, boxShadow: 'var(--shadow-md)' }}>
                   {profile?.full_name?.charAt(0)}
                 </div>
                 <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{profile?.full_name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{profile?.dev_role || 'Mechatronics Engineer'}</p>
                    <div className="badge badge-green" style={{ marginTop: '0.5rem' }}>Verified Account</div>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="glass-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">WhatsApp Number</label>
                  <input type="tel" className="glass-input" value={formWhatsapp} onChange={(e)=>setFormWhatsapp(e.target.value)} placeholder="+91..." />
                </div>
                <div className="input-group">
                  <label className="input-label">Dev Role (e.g. Fullstack Developer)</label>
                  <input type="text" className="glass-input" value={formDevRole} onChange={(e)=>setFormDevRole(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Technical Skills (comma separated)</label>
                  <input type="text" className="glass-input" value={formSkills} onChange={(e)=>setFormSkills(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">LinkedIn Profile</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formLinkedin} onChange={(e)=>setFormLinkedin(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">GitHub Profile</label>
                  <div style={{ position: 'relative' }}>
                    <GitBranch size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formGithub} onChange={(e)=>setFormGithub(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Resume Link (PDF / G-Drive)</label>
                  <div style={{ position: 'relative' }}>
                    <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input type="url" className="glass-input" style={{ paddingLeft: '3rem' }} value={formResume} onChange={(e)=>setFormResume(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1.2rem' }} onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Syncing Profile...' : 'Save Professional Profile'}
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="container" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem', fontWeight: 600 }}>
        &copy; 2026 DevMatchups Platform. Built for Excellence.
      </footer>
    </div>
  );
}

export default StudentDashboard;
