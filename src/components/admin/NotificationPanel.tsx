import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, User, Settings, Check, CheckCheck, Trash2, Filter,
  Moon, Volume2, VolumeX, ChevronDown, AlertCircle, FileText,
  MessageSquare, Target, ShoppingBag, UserCheck, Mail
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../contexts/OrganizationContext';

type Notification = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  link_type: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

type NotificationPreference = {
  type: string;
  email_enabled: boolean;
  push_enabled: boolean;
  do_not_disturb: boolean;
  dnd_start_time: string | null;
  dnd_end_time: string | null;
};

export function NotificationPanel() {
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && selectedOrganization) {
      fetchNotifications();
      fetchPreferences();
      setupRealtimeSubscription();
    }
  }, [user, selectedOrganization]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowPanel(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          handleNewNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const isWithinDND = (): boolean => {
    const now = new Date();
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  
    const dndPref = preferences.find(p => p.do_not_disturb);
    if (dndPref && dndPref.dnd_start_time && dndPref.dnd_end_time) {
      const [startH, startM] = dndPref.dnd_start_time.split(':').map(Number);
      const [endH, endM] = dndPref.dnd_end_time.split(':').map(Number);
  
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
  
      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // DND spans over midnight
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    }
  
    return false;
  };


  const handleNewNotification = (notification: Notification) => {
    if (isWithinDND()) {
      // Optionally log or silently skip
      return;
    }
  
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    playNotificationSound();
  };


  const playNotificationSound = () => {
    // Only play sound if not in DND mode
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    const preference = preferences.find(p => p.do_not_disturb);
    if (preference) {
      const startTime = preference.dnd_start_time ? new Date(`1970-01-01T${preference.dnd_start_time}Z`) : null;
      const endTime = preference.dnd_end_time ? new Date(`1970-01-01T${preference.dnd_end_time}Z`) : null;

      if (startTime && endTime) {
        const currentTimeObj = new Date(`1970-01-01T${currentHour}:${currentMinute}:00Z`);
        if (currentTimeObj >= startTime && currentTimeObj <= endTime) {
          return;
        }
      }
    }

    const audio = new Audio('/notification.mp3');
    audio.play().catch(console.error);
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('organization_id', selectedOrganization?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .eq('organization_id', selectedOrganization?.id);

      if (error) throw error;
      setPreferences(data || []);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const clearAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const updatePreference = async (type: string, updates: Partial<NotificationPreference>) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user?.id)
        .eq('type', type)
        .eq('organization_id', selectedOrganization?.id);

      if (error) throw error;

      setPreferences(prev =>
        prev.map(p =>
          p.type === type ? { ...p, ...updates } : p
        )
      );
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'case_assigned':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'lead_assigned':
        return <UserCheck className="w-5 h-5 text-green-500" />;
      case 'opportunity_assigned':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'quote_approved':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'order_created':
        return <ShoppingBag className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (!notification.link_type || !notification.link_id) return null;

    const baseUrl = '/admin/';
    switch (notification.link_type) {
      case 'case':
        return `${baseUrl}cases/${notification.link_id}`;
      case 'lead':
        return `${baseUrl}leads/${notification.link_id}`;
      case 'opportunity':
        return `${baseUrl}opportunities/${notification.link_id}`;
      case 'quote':
        return `${baseUrl}quotes/${notification.link_id}`;
      case 'order':
        return `${baseUrl}orders/${notification.link_id}`;
      default:
        return null;
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || (filter === 'unread' && !n.is_read)
  );

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={markAllAsRead}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  >
                    <CheckCheck className="w-5 h-5" />
                  </button>
                  <button
                    onClick={clearAll}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                </select>
                <span className="text-sm text-gray-500">
                  {unreadCount} unread
                </span>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-gray-200"
                >
                  <div className="p-4 space-y-4">
                    <h4 className="font-medium">Notification Settings</h4>
                    {preferences.map(pref => (
                      <div key={pref.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{pref.type.replace(/_/g, ' ')}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updatePreference(pref.type, { 
                                email_enabled: !pref.email_enabled 
                              })}
                              className={cn(
                                "p-1 rounded-full",
                                pref.email_enabled ? "text-primary-600" : "text-gray-400"
                              )}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updatePreference(pref.type, { 
                                push_enabled: !pref.push_enabled 
                              })}
                              className={cn(
                                "p-1 rounded-full",
                                pref.push_enabled ? "text-primary-600" : "text-gray-400"
                              )}
                            >
                              {pref.push_enabled ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <VolumeX className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">Do Not Disturb</span>
                        <button
                          onClick={() => {
                            const pref = preferences[0];
                            if (pref) {
                              updatePreference(pref.type, {
                                do_not_disturb: !pref.do_not_disturb,
                                dnd_start_time: !pref.do_not_disturb ? '22:00:00' : null,
                                dnd_end_time: !pref.do_not_disturb ? '08:00:00' : null
                              });
                            }
                          }}
                          className={cn(
                            "p-1 rounded-full",
                            preferences[0]?.do_not_disturb ? "text-primary-600" : "text-gray-400"
                          )}
                        >
                          <Moon className="w-4 h-4" />
                        </button>
                      </label>
                      {preferences[0]?.do_not_disturb && (
                        <div className="mt-2 flex items-center space-x-2">
                          <input
                            type="time"
                            value={preferences[0]?.dnd_start_time?.slice(0, 5) || '22:00'}
                            onChange={(e) => {
                              const pref = preferences[0];
                              if (pref) {
                                updatePreference(pref.type, {
                                  dnd_start_time: `${e.target.value}:00`
                                });
                              }
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          />
                          <span className="text-sm text-gray-500">to</span>
                          <input
                            type="time"
                            value={preferences[0]?.dnd_end_time?.slice(0, 5) || '08:00'}
                            onChange={(e) => {
                              const pref = preferences[0];
                              if (pref) {
                                updatePreference(pref.type, {
                                  dnd_end_time: `${e.target.value}:00`
                                });
                              }
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Notifications List */
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredNotifications.map(notification => {
                        const link = getNotificationLink(notification);
                        const NotificationContent = () => (
                          <div className={cn(
                            "p-4 hover:bg-gray-50 transition-colors",
                            !notification.is_read && "bg-blue-50"
                          )}>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                {notification.description && (
                                  <p className="text-sm text-gray-500 line-clamp-2">
                                    {notification.description}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className={cn(
                                    "p-1 rounded-full transition-colors",
                                    notification.is_read 
                                      ? "text-gray-400 hover:text-gray-600"
                                      : "text-primary-600 hover:text-primary-700"
                                  )}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );

                        return link ? (
                          <Link key={notification.id} to={link}>
                            <NotificationContent />
                          </Link>
                        ) : (
                          <div key={notification.id}>
                            <NotificationContent />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}