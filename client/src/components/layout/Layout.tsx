import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import CrisisWarningModal from '../common/CrisisWarningModal';
import SentimentConflictModal from '../common/SentimentConflictModal';
import GlobalLoader from '../common/GlobalLoader';
import OnboardingModal from '../common/OnboardingModal';

// Pages that render their own back-arrow header — hamburger would overlap it
const BACK_ARROW_PATTERN = /^\/(videos|videosets)\/.+|\/analysis\/.+\/(bar|line|cloud|report)/;

export default function Layout() {
  const { toggleSidebar } = useUIStore();
  const { pathname } = useLocation();
  const hasBackArrow = BACK_ARROW_PATTERN.test(pathname);
  const user = useAuthStore(s => s.user);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!localStorage.getItem(`mhmr_displayname_${user.id}`)) {
      setShowOnboarding(true);
    }
  }, [user?.id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-mhmr-bg">
      {/* Top nav — large screens only */}
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — small/medium screens only */}
        <Sidebar />

        {/* Hamburger — hidden on large screens and on pages with a back arrow */}
        {!hasBackArrow && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-mhmr-olive text-white shadow-md hover:bg-mhmr-olive-dark transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <CrisisWarningModal />
      <SentimentConflictModal />
      <GlobalLoader />
      {showOnboarding && user && (
        <OnboardingModal userId={user.id} onComplete={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
