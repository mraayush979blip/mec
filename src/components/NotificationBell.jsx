import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, MessageCircle, Calendar, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  event: <Calendar size={16} color="#007AFF" />,
  message: <MessageCircle size={16} color="#AF52DE" />,
  join_request: <Users size={16} color="#FF9500" />,
  approval: <CheckCheck size={16} color="#34C759" />,
  general: <Bell size={16} color="var(--text-secondary)" />
};

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Polling — every 15 seconds (safe, no Realtime connection used)
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const clearAll = async () => {
    await supabase.from('in_app_notifications').delete().eq('user_id', userId);
    setNotifications([]);
  };

  const timeAgo = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={unreadCount > 0 ? 'bell-pulse' : ''}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          transition: 'all 0.2s'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#FF3B30',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.65rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-primary)',
            animation: 'pulse-red 2s infinite'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          width: '340px',
          maxWidth: '95vw',
          background: 'rgba(15,15,18,0.95)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'fadeInUp 0.2s ease'
        }}>
          {/* Header */}
          <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: '1rem' }}>Notifications</p>
              {unreadCount > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>{unreadCount} unread</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                <p style={{ fontSize: '0.9rem' }}>All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: n.link ? 'pointer' : 'default',
                    background: n.is_read ? 'transparent' : 'rgba(0,122,255,0.05)',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {TYPE_ICONS[n.type] || TYPE_ICONS.general}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{n.title}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.body}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem', opacity: 0.6 }}>{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,59,48,0.5); }
          50% { box-shadow: 0 0 0 4px rgba(255,59,48,0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
        }
        .bell-pulse {
          animation: pulse-ring 2s infinite;
        }
      `}</style>
    </div>
  );
}
