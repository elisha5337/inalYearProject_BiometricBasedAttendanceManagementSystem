import { useNavigate, useLocation } from 'react-router-dom';
import { Fingerprint, Home, Cpu, MapPin, HelpCircle, Scan, LogIn, Info, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useTheme();
  const isHomePage = location.pathname === '/';

  const navItems = [
    { label: 'Home', path: '/', icon: Home, isAnchor: false },
    { label: 'Technology', path: '/#technology', icon: Cpu, isAnchor: true },
    { label: 'Terminals', path: '/#locations', icon: MapPin, isAnchor: true },
    { label: 'Help', path: '/#faq', icon: HelpCircle, isAnchor: true },
    { label: 'About', path: '/about', icon: Info, isAnchor: false }, // Use direct route for About
  ];

  const handleNavClick = (path: string, isAnchor: boolean) => {
    if (isAnchor && isHomePage) {
      const id = path.split('#')[1];
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (isAnchor && !isHomePage) {
      navigate('/');
      setTimeout(() => {
        const id = path.split('#')[1];
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-[100] px-4 md:px-8 py-4 bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between shadow-lg transition-all duration-300">
      {/* Brand */}
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 bg-[#4F46E5] rounded-[16px] flex items-center justify-center shadow-lg shadow-indigo-900/50 group-hover:scale-105 transition-transform text-white">
          <Fingerprint className="w-6 h-6" />
        </div>
        <div className="hidden sm:block">
          <span className="font-black text-lg tracking-tighter uppercase italic block leading-none text-white">BBE AMS</span>
          <span className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.4em] ml-0.5">Secure Core</span>
        </div>
      </div>

      {/* Center Navigation */}
      <div className="hidden lg:flex items-center gap-8">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => handleNavClick(item.path, item.isAnchor)}
            className={cn(
              "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
              location.pathname === item.path
                ? "text-indigo-400"
                : "text-slate-300 hover:text-indigo-400"
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Theme Toggle Button - VISIBLE AND CONSISTENT */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 rounded-[16px] bg-slate-800 border border-slate-700 text-amber-500 hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        <button 
          onClick={() => navigate('/terminal')}
          className={cn(
            "flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] transition-all border",
            location.pathname === '/terminal'
              ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-lg shadow-indigo-900/40"
              : "bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800"
          )}
        >
          <Scan className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mark Attendance</span>
        </button>

        <button 
          onClick={() => navigate('/login')}
          className={cn(
            "flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-[16px] text-[9px] font-black uppercase tracking-[0.2em] transition-all",
            location.pathname === '/login'
              ? "bg-[#4F46E5] text-white shadow-lg shadow-indigo-900/40"
              : "bg-[#4F46E5] text-white hover:bg-indigo-500 shadow-xl shadow-indigo-900/30"
          )}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Login</span>
        </button>
      </div>
    </nav>
  );
}
