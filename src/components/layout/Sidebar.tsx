import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Bell,
  BarChart3,
  Users,
  Building2,
  BookOpen,
  Settings,
  ClipboardCheck,
  FolderArchive,
  Info,
  History,
} from 'lucide-react';
import rcmsLogo from '@/assets/rcms-logo.png';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Documents', icon: FileText, href: '/documents' },
  { label: 'Upload Document', icon: Upload, href: '/upload', adminOnly: true },
  { label: 'Regulatory Frameworks', icon: BookOpen, href: '/regulatory' },
  { label: 'Compliance Status', icon: ClipboardCheck, href: '/compliance' },
  { label: 'Data Collection', icon: Building2, href: '/data-collection' },
  { label: 'Activity Log', icon: History, href: '/activity-log' },
  { label: 'Notifications', icon: Bell, href: '/notifications' },
  { label: 'Reports', icon: BarChart3, href: '/reports' },
  { label: 'Archive', icon: FolderArchive, href: '/archive', adminOnly: true },
  { label: 'User Management', icon: Users, href: '/users', adminOnly: true },
  { label: 'Information', icon: Info, href: '/information' },
];

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col border-r border-sidebar-border z-50">
      {/* Logo Section */}
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex flex-col items-center gap-2 group">
          <img 
            src={rcmsLogo} 
            alt="RCMS Logo" 
            className="w-14 h-14 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="text-center">
            <h1 className="text-xs font-bold text-sidebar-foreground leading-tight">Regulatory Compliance Monitoring System</h1>
            <p className="text-xs text-sidebar-foreground/60 mt-1">SSN College of Engineering</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform",
                    !isActive && "group-hover:scale-110"
                  )} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
            location.pathname === '/settings'
              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
          )}
        >
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
          <span>Settings</span>
        </Link>
        <div className="mt-4 px-3 text-xs text-sidebar-foreground/50">
          <p className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Secured by JWT Auth
          </p>
          <p className="mt-1">v1.0.0 • 2024</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
