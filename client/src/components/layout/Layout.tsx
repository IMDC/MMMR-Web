import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUIStore } from '../../store/uiStore';
import CrisisWarningModal from '../common/CrisisWarningModal';
import SentimentConflictModal from '../common/SentimentConflictModal';
import GlobalLoader from '../common/GlobalLoader';

export default function Layout() {
  const { toggleSidebar } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-mhmr-bg">
      <Sidebar />

      {/* Hamburger button — always visible, fixed top-left */}
      <button
        onClick={toggleSidebar}
        className="fixed top-3 left-3 z-30 p-2 rounded-lg bg-mhmr-olive text-white shadow-md hover:bg-mhmr-olive-dark transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Main content — always full width */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <CrisisWarningModal />
      <SentimentConflictModal />
      <GlobalLoader />
    </div>
  );
}
