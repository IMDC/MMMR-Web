import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Video, Layers, BarChart2, Share2, HelpCircle, X, LogOut } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/videos', icon: Video, label: 'Manage Videos' },
  { to: '/videosets', icon: Layers, label: 'Video Sets' },
  { to: '/analysis', icon: BarChart2, label: 'Data Analysis' },
  { to: '/sharing', icon: Share2, label: 'Sharing' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const handleLogout = async () => {
    toggleSidebar();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={toggleSidebar}
          onKeyDown={e => e.key === 'Escape' && toggleSidebar()}
          role="presentation"
        />
      )}

      {/* Drawer — always an overlay, never static */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-white shadow-xl
          w-64 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-mhmr-olive shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/roundLogo.png" alt="MHMR Logo" className="h-9 w-9 object-contain shrink-0" />
            <span className="text-white font-bold text-sm leading-tight">
              MyMissionMyRecord
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="text-white/70 hover:text-white shrink-0 p-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={toggleSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-mhmr-olive/10 text-mhmr-olive border-r-[3px] border-mhmr-olive'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-mhmr-olive'
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Help + account */}
        <div className="border-t border-gray-100 p-3 space-y-1">
          <NavLink
            to="/help"
            onClick={toggleSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
              ${isActive ? 'text-mhmr-olive bg-mhmr-olive/10' : 'text-gray-500 hover:text-mhmr-olive hover:bg-gray-50'}`
            }
          >
            <HelpCircle size={19} />
            Help
          </NavLink>

          {user && (
            <>
              <div className="px-3 pt-2 pb-1">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold text-gray-700 truncate">
                  {user.displayName || user.username}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={19} />
                Log Out
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
