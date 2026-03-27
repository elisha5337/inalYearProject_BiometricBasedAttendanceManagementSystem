import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  FileText, 
  History, 
  UserCircle, 
  Users, 
  Clock, 
  ClipboardList, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  Fingerprint, 
  Cpu, 
  GitBranch,
  Bell, 
  Link2, 
  Calendar, 
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle
} from 'lucide-react';
import { User, Role } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  user: User;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ user, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  const menuItems: Record<string, { label: string; icon: any; path: string }[]> = {
    employee: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/employee/dashboard' },
      { label: 'My Attendance', icon: CalendarCheck, path: '/employee/attendance' },
      { label: 'Submit Leave', icon: FileText, path: '/employee/leave/submit' },
      { label: 'Leave History', icon: History, path: '/employee/leave/history' },
      { label: 'My Profile', icon: UserCircle, path: '/employee/profile' },
      { label: 'Help Center', icon: HelpCircle, path: '/employee/help' },
    ],
    hr: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/hr/dashboard' },
      { label: 'Employees', icon: Users, path: '/hr/employees' },
      { label: 'Attendance', icon: CalendarCheck, path: '/hr/attendance' },
      { label: 'Leave Requests', icon: ClipboardList, path: '/hr/leave' },
      { label: 'Manage Shifts', icon: Clock, path: '/hr/shifts' },
      { label: 'Reports', icon: BarChart3, path: '/hr/reports' },
      { label: 'My Profile', icon: UserCircle, path: '/hr/profile' },
      { label: 'Help Center', icon: HelpCircle, path: '/hr/help' },
    ],
    admin: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Manage Users', icon: ShieldCheck, path: '/admin/users' },
      { label: 'Audit Log', icon: History, path: '/admin/audit' },
      { label: 'Policies', icon: Settings, path: '/admin/policies' },
      { label: 'Enroll Biometrics', icon: Fingerprint, path: '/admin/enroll' },
      { label: 'Devices', icon: Cpu, path: '/admin/devices' },
      { label: 'Workflows', icon: GitBranch, path: '/admin/workflows' },
      { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
      { label: 'Integrations', icon: Link2, path: '/admin/integrations' },
      { label: 'Leave Oversight', icon: Calendar, path: '/admin/leave' },
      { label: 'System Oversight', icon: Eye, path: '/admin/oversight' },
      { label: 'My Profile', icon: UserCircle, path: '/admin/profile' },
      { label: 'Help Center', icon: HelpCircle, path: '/admin/help' },
    ],
    public: []
  };

  const items = menuItems[user.role] || [];

  return (
    <aside className="h-full bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 w-full">
      <div className={cn(
        "p-6 flex items-center justify-between",
        isCollapsed && "lg:px-4 lg:justify-center"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Fingerprint className="text-white w-6 h-6" />
          </div>
          <div className={cn(
            "transition-all duration-300",
            isCollapsed && "lg:opacity-0 lg:w-0"
          )}>
            <h1 className="text-white font-bold text-lg leading-none whitespace-nowrap">HU-IOT</h1>
            <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">Attendance System</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white lg:hidden"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Desktop Toggle Button */}
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            title={isCollapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              isCollapsed && "lg:justify-center lg:px-0",
              location.pathname === item.path 
                ? "bg-blue-600 text-white" 
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className={cn(
              "truncate transition-all duration-300",
              isCollapsed && "lg:opacity-0 lg:w-0"
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className={cn(
        "p-4 border-t border-slate-800",
        isCollapsed && "lg:flex lg:justify-center"
      )}>
        <div className={cn(
          "flex items-center gap-3 px-3 py-2",
          isCollapsed && "lg:px-0"
        )}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              (user.name || user.username).charAt(0)
            )}
          </div>
          <div className={cn(
            "flex-1 min-w-0 transition-all duration-300",
            isCollapsed && "lg:opacity-0 lg:w-0"
          )}>
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate uppercase">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
