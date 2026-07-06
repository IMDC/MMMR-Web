import { useUIStore } from '../../store/uiStore';
import Loader from './Loader';

export default function GlobalLoader() {
  const { isLoading, loadingMessage } = useUIStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4 min-w-[200px]">
        <Loader size="lg" />
        {loadingMessage && <p className="text-gray-600 text-sm text-center">{loadingMessage}</p>}
      </div>
    </div>
  );
}
