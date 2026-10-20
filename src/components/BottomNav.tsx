import React from 'react';
import { Home, Users, MessageSquare, Vote, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, unreadCount = 0 }) => {
  const { isLoggedIn } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'discussions', label: 'Polls', icon: Vote },
    ...(isLoggedIn ? [{ id: 'admin', label: 'Manage', icon: Shield }] : [{ id: 'profile', label: 'Profile', icon: User }]),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-header)] backdrop-blur-md border-t border-[var(--border-default)] shadow-lg pb-safe transition-colors duration-200">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                isActive
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-red-600 rounded-full">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 bg-red-600 dark:bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
