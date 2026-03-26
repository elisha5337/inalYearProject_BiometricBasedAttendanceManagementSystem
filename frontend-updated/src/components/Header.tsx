import { LogOut, Bell, Search, Menu, History, Settings } from 'lucide-react';
import { User } from '../types';
import { Link } from 'react-router-dom';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick: () => void;
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2">
          <Link 
            to={user.role === 'admin' ? "/admin/audit" : "/hr/reports"}
            title="System Logs"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <History className="w-5 h-5" />
          </Link>
          <Link 
            to={user.role === 'admin' ? "/admin/policies" : "/hr/dashboard"}
            title="Global Settings"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        <div className="hidden md:block h-8 w-px bg-slate-200 mx-1"></div>

        <Link 
          to={`/${user.role}/notifications`}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </Link>
        
        <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2"></div>

        <Link 
          to={`/${user.role}/profile`}
          className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-100 rounded-full transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{user.role}</p>
          </div>
        </Link>

        <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1"></div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
