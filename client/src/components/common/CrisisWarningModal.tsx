import { AlertTriangle, Phone, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const CRISIS_RESOURCES = [
  { name: 'Talk Suicide Canada', phone: '1-833-456-4566', text: 'Text: 45645', available: '24/7' },
  { name: 'Mental Health Helpline (Ontario)', phone: '1-866-531-2600', available: '24/7' },
  { name: "Kids Help Phone", phone: '1-800-668-6868', text: 'Text: 686868', available: '24/7 under 20' },
  { name: 'Veterans Affairs Canada', phone: '1-800-268-7708', available: '24/7 for Veterans' },
  { name: 'Gerstein Crisis Centre (Toronto)', phone: '416-929-5200', available: '24/7 adults' },
  { name: 'Emergency Services', phone: '911', available: 'Immediate emergency' },
];

export default function CrisisWarningModal() {
  const { crisisAlerts, dismissCrisisAlert } = useUIStore();
  const alert = crisisAlerts[0];
  if (!alert) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crisis-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-red-500 rounded-t-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="text-white shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h2 id="crisis-modal-title" className="text-white font-bold text-lg">Crisis Content Detected</h2>
            <p className="text-red-100 text-sm mt-1">
              This recording may contain content indicating distress. Please consider reaching out for support.
            </p>
          </div>
          <button onClick={() => dismissCrisisAlert(alert.videoId)} className="text-white/70 hover:text-white" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-4">
            In video: <span className="font-medium text-gray-800">{alert.videoTitle}</span>
          </p>

          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Phone size={16} className="text-mhmr-olive" />
            Crisis Resources (Free & Confidential)
          </h3>

          <div className="space-y-3">
            {CRISIS_RESOURCES.map(r => (
              <div key={r.name} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="font-medium text-gray-800 text-sm">{r.name}</div>
                <div className="text-mhmr-olive font-semibold">{r.phone}</div>
                {r.text && <div className="text-gray-500 text-xs">{r.text}</div>}
                <div className="text-gray-400 text-xs">{r.available}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => dismissCrisisAlert(alert.videoId)}
            className="btn-primary w-full mt-5"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
