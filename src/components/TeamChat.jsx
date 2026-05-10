import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TeamChat({ teamId, listingId, teamName, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const chatKey = teamId ? { team_id: teamId } : { listing_id: listingId };
  const filterKey = teamId ? 'team_id' : 'listing_id';
  const filterId = teamId || listingId;

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds when chat is open — no Realtime connections used
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [teamId, listingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('team_messages')
      .select('*')
      .eq(filterKey, filterId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic update
    const optimistic = {
      id: 'temp-' + Date.now(),
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      content,
      created_at: new Date().toISOString(),
      ...chatKey
    };
    setMessages(prev => [...prev, optimistic]);

    const { error } = await supabase.from('team_messages').insert([{
      ...chatKey,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      content
    }]);

    if (!error) {
      notifyTeam(content);
    } else {
      console.error('Send error:', error);
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(content);
    }
    setSending(false);
  };

  const notifyTeam = async (content) => {
    try {
      let recipientIds = [];
      
      if (teamId) {
        const { data } = await supabase.from('team_members').select('user_id').eq('team_id', teamId);
        recipientIds = data?.map(m => m.user_id) || [];
      } else if (listingId) {
        const { data: listing } = await supabase.from('team_listings').select('creator_id').eq('id', listingId).single();
        const { data: approved } = await supabase.from('join_requests').select('applicant_id').eq('listing_id', listingId).eq('status', 'approved');
        recipientIds = [listing?.creator_id, ...(approved?.map(r => r.applicant_id) || [])];
      }

      const others = recipientIds.filter(id => id && id !== currentUser.id);
      if (others.length === 0) return;

      // 1. In-app notifications
      const notifications = others.map(uid => ({
        user_id: uid,
        title: `New message in ${teamName}`,
        body: `${currentUser.full_name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        type: 'chat',
        link: '/dashboard/teams'
      }));
      await supabase.from('in_app_notifications').insert(notifications);

      // 2. Push notifications (OneSignal)
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: others,
          title: teamName,
          message: `${currentUser.full_name}: ${content.substring(0, 100)}`
        })
      }).catch(e => console.error('Push error:', e));

    } catch (err) {
      console.error('Notify error:', err);
    }
  };


  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const groupedMessages = messages.reduce((groups, msg) => {
    const day = new Date(msg.created_at).toLocaleDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(msg);
    return groups;
  }, {});

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 0 0'
    }}>
      <div style={{
        width: '100%', maxWidth: '600px', height: '80vh',
        background: 'rgba(12,12,16,0.98)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '28px 28px 0 0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        animation: 'slideUp 0.3s cubic-bezier(0.23,1,0.32,1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '1rem'
        }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '14px',
            background: 'linear-gradient(135deg,#007AFF,#AF52DE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Users size={20} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1px' }}>{teamName}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Team Chat · messages auto-delete after 30 days</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none',
            color: 'var(--text-secondary)', width: '36px', height: '36px',
            borderRadius: '10px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 2rem' }}>
              <MessageCircle size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 700 }}>No messages yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Be the first to say something to your team!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([day, dayMsgs]) => (
              <React.Fragment key={day}>
                <div style={{ textAlign: 'center', margin: '0.8rem 0' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.8rem', borderRadius: '100px' }}>{day}</span>
                </div>
                {dayMsgs.map((msg, i) => {
                  const isMine = msg.sender_id === currentUser.id;
                  const isConsecutive = i > 0 && dayMsgs[i-1].sender_id === msg.sender_id;
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
                      gap: '0.6rem', alignItems: 'flex-end',
                      marginTop: isConsecutive ? '0.15rem' : '0.8rem'
                    }}>
                      {!isMine && !isConsecutive && (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                          background: 'linear-gradient(135deg,#007AFF,#AF52DE)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.65rem', fontWeight: 800
                        }}>
                          {msg.sender_name?.charAt(0)}
                        </div>
                      )}
                      {!isMine && isConsecutive && <div style={{ width: '28px' }} />}
                      <div style={{ maxWidth: '72%' }}>
                        {!isMine && !isConsecutive && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.2rem', paddingLeft: '0.4rem' }}>{msg.sender_name}</p>
                        )}
                        <div style={{
                          padding: '0.6rem 0.9rem',
                          background: isMine ? 'var(--accent)' : 'rgba(255,255,255,0.07)',
                          borderRadius: isMine
                            ? isConsecutive ? '18px 6px 6px 18px' : '18px 6px 18px 18px'
                            : isConsecutive ? '6px 18px 18px 6px' : '6px 18px 18px 18px',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          fontSize: '0.9rem', lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}>
                          {msg.content}
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.5, marginTop: '0.2rem', textAlign: isMine ? 'right' : 'left', paddingLeft: isMine ? 0 : '0.4rem' }}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '0.8rem', alignItems: 'center'
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '0.8rem 1.2rem', color: 'var(--text-primary)',
              fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none'
            }}
          />
          <button type="submit" disabled={!input.trim() || sending} style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: input.trim() ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: input.trim() ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.2s', flexShrink: 0
          }}>
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
