import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart2, ChevronDown, Clapperboard, HelpCircle,
  Home, LogOut, Settings, Share2, User, Video,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/videos', icon: Video, label: 'Manage Videos' },
  { to: '/videosets', icon: Clapperboard, label: 'Video Sets' },
  { to: '/analysis', icon: BarChart2, label: 'Data Analysis' },
  // { to: '/sharing', icon: Share2, label: 'Sharing' },
];

export default function TopNav() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setUserOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const localDisplayName = user ? localStorage.getItem(`mhmr_displayname_${user.id}`) : null;
  const displayLabel = localDisplayName || user?.displayName || user?.username;

  return (
    <nav className="hidden lg:flex items-center h-14 bg-mhmr-olive px-5 gap-1 shrink-0 shadow-sm z-20">
      {/* Logo — left */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img src="/roundLogo.png" alt="MHMR Logo" className="h-8 w-8 object-contain" />
        <span className="text-white font-bold text-sm whitespace-nowrap">MyMissionMyRecord</span>
      </div>

      {/* Nav links — centered */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </NavLink>
        ))}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-haspopup="true"
            aria-expanded={moreOpen}
          >
            More
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
          </button>

          {moreOpen && (
            <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
              <NavLink
                to="/settings"
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? 'text-mhmr-olive bg-mhmr-olive/5' : 'text-gray-700 hover:bg-gray-50'}`
                }
              >
                <Settings size={15} aria-hidden="true" />
                Settings
              </NavLink>
              <NavLink
                to="/help"
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? 'text-mhmr-olive bg-mhmr-olive/5' : 'text-gray-700 hover:bg-gray-50'}`
                }
              >
                <HelpCircle size={15} aria-hidden="true" />
                Help
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* User section */}
      {user && (
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-haspopup="true"
            aria-expanded={userOpen}
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User size={14} className="text-white" aria-hidden="true" />
            </div>
            <span className="max-w-[120px] truncate">{displayLabel}</span>
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{displayLabel}</p>
                <p className="text-xs text-gray-400 truncate">{user.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} aria-hidden="true" />
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
