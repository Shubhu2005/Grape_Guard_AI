import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Inbox, Leaf, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';

const Header = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications(user);

    const formatTime = (value) => {
      if (!value) return '';
      try {
        return formatDistanceToNow(new Date(value), { addSuffix: true });
      } catch {
        return '';
      }
    };

    const handleNotificationClick = async (notification) => {
      await markRead(notification.id);

      const type = notification?.type || notification?.data?.type;
      if (type === 'REVIEW_RESULT') {
        sessionStorage.setItem('farmer_active_tab', 'history');
        navigate('/farmer-dashboard?tab=history');
        return;
      }
      if (type === 'NEW_REVIEW_REQUEST') {
        sessionStorage.setItem('expert_active_tab', 'pending');
        navigate('/expert-dashboard?tab=pending');
      }
    };

    return (<header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground"/>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-accent">
                Grape Guard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Identify grape leaf diseases & get safe pesticide options
              </p>
            </div>
          </div>

          {user && (<div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notifications">
                    <Bell className="w-5 h-5 text-muted-foreground"/>
                    {unreadCount > 0 && (<span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center ring-2 ring-card">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>)}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="notification-popover w-[min(92vw,360px)] p-0 overflow-hidden">
                  <div className="notification-popover-header flex items-center justify-between gap-3 px-4 py-3 border-b">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
                      <p className="text-xs text-muted-foreground">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </p>
                    </div>
                    {unreadCount > 0 && (<button onClick={markAllRead} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Mark all as read">
                        <CheckCheck className="w-4 h-4 text-muted-foreground"/>
                      </button>)}
                  </div>

                  <ScrollArea className="notification-scroll h-[min(420px,70vh)]">
                    {notifications.length > 0 ? (<div className="divide-y">
                        {notifications.map((notification) => {
                          const unread = !notification.read_at;
                          return (<button
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification)}
                              className={`notification-item w-full text-left px-4 py-3 transition-colors ${unread ? 'notification-item-unread' : 'bg-transparent'}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${unread ? 'bg-primary' : 'bg-transparent'}`}/>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground line-clamp-1">
                                    {notification.title || 'Notification'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {notification.body || 'You have a new update.'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground mt-2">
                                    {formatTime(notification.created_at)}
                                  </p>
                                </div>
                              </div>
                            </button>);
                        })}
                      </div>) : (<div className="px-4 py-10 text-center">
                        <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3"/>
                        <p className="text-sm font-medium text-foreground">
                          {isLoading ? 'Loading notifications...' : 'No notifications yet'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          New farmer requests and expert results will appear here.
                        </p>
                      </div>)}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
                <User className="w-4 h-4 text-secondary-foreground"/>
                <span className="text-sm font-medium text-secondary-foreground capitalize">
                  {user.name} ({user.role})
                </span>
              </div>
              <button onClick={onLogout} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Logout">
                <LogOut className="w-5 h-5 text-muted-foreground"/>
              </button>
            </div>)}
        </div>
      </div>
    </header>);
};
export default Header;
