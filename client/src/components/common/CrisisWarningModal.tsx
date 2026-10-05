import { LifeBuoy, Phone, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useVideoStore } from '../../store/videoStore';

// Mirrors getCrisisResourcesText() in the Android app (src/components/
// crisisDetection.tsx) — same services, same numbers, same grouping. Kept as
// structured data rather than one pre-formatted string so the numbers can be
// tel: links and the groups can be read out as headings.
const RESOURCE_GROUPS = [
  {
    heading: 'Veterans',
    note: 'Available 24/7 for Veterans, Canadian Armed Forces members, RCMP, and their families. Confidential and bilingual mental health support.',
    lines: [
      { name: 'Veterans Affairs Canada Assistance Service', phone: '1-800-268-7708' },
      { name: 'TTY', phone: '1-800-567-5803' },
    ],
  },
  {
    heading: 'City of Toronto',
    note: '24/7 crisis line for adults in the City of Toronto. Mobile crisis teams available for in-person support.',
    lines: [{ name: 'Gerstein Crisis Centre', phone: '416-929-5200' }],
  },
  {
    heading: 'Ontario-Wide',
    note: 'Available 24/7 for anyone in emotional distress. Free, confidential, and available across Ontario.',
    lines: [
      { name: 'Talk Suicide Canada', phone: '1-833-456-4566', text: 'Text 45645' },
      { name: 'Mental Health Helpline (Ontario)', phone: '1-866-531-2600' },
    ],
  },
];

// tel: needs the digits only.
const telHref = (phone: string) => `tel:${phone.replace(/[^\d]/g, '')}`;

export default function CrisisWarningModal() {
  const { crisisAlerts, dismissCrisisAlert } = useUIStore();
  const updateVideo = useVideoStore(s => s.updateVideo);
  const alert = crisisAlerts[0];
  if (!alert) return null;

  const close = () => dismissCrisisAlert(alert.videoId);

  // Hides every trace of the flag on this video, for good. Deliberately only
  // sets harmFlagDismissed — the detection result stays on the record.
  const ignore = async () => {
    dismissCrisisAlert(alert.videoId);
    try {
      await updateVideo(alert.videoId, { harmFlagDismissed: true });
    } catch {
      // Non-fatal: the modal is already closed for this session either way.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="presentation"
      onKeyDown={e => { if (e.key === 'Escape') close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crisis-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Coral rather than a full alarm red: this is an offer of support.
            rose-900 on rose-50 is ~11:1, well clear of the 4.5:1 floor. */}
        <div className="bg-rose-50 border-b border-rose-200 rounded-t-2xl p-5 flex items-start gap-3">
          <LifeBuoy className="text-rose-600 shrink-0 mt-0.5" size={24} aria-hidden="true" />
          <div className="flex-1">
            <h2 id="crisis-modal-title" className="text-rose-900 font-bold text-lg">Support resources</h2>
            {/* Describes what the detector did, rather than telling the person
                how they feel — the previous wording inferred a state of mind
                from a keyword match. */}
            <p className="text-rose-900/80 text-sm mt-1">
              This recording matched a word we attach support resources to. It may not
              apply to you. If you would like to talk to someone, these services are
              free, confidential, and available 24/7.
            </p>
          </div>
          <button onClick={close} className="text-rose-900/60 hover:text-rose-900" aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-600">
            In video: <span className="font-medium text-gray-800">{alert.videoTitle}</span>
          </p>

          {alert.detectedPhrases.length > 0 && (
            <div className="mt-3 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-rose-900 uppercase tracking-wide">
                Words that prompted this
              </p>
              <p className="text-sm text-rose-900 mt-1">{alert.detectedPhrases.join(', ')}</p>
              <p className="text-xs text-rose-900/70 mt-2">
                This isn't always right. If it picked up something you didn't mean that
                way, you can ignore it below.
              </p>
            </div>
          )}

          <h3 className="font-semibold text-gray-700 mt-5 mb-1 flex items-center gap-2">
            <Phone size={16} className="text-mhmr-olive" aria-hidden="true" />
            Someone you can talk to
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            All of these are free, confidential, and open 24/7.
          </p>

          <div className="space-y-3">
            {RESOURCE_GROUPS.map(group => (
              <div key={group.heading} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{group.heading}</h4>
                {group.lines.map(line => (
                  <div key={line.phone} className="mb-1.5 last:mb-0">
                    <div className="text-gray-800 text-sm">{line.name}</div>
                    <a
                      href={telHref(line.phone)}
                      className="text-mhmr-olive font-semibold hover:underline"
                    >
                      {line.phone}
                    </a>
                    {line.text && <span className="text-gray-500 text-xs ml-2">{line.text}</span>}
                  </div>
                ))}
                <p className="text-gray-500 text-xs mt-2 leading-relaxed">{group.note}</p>
              </div>
            ))}

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-gray-800 text-sm">Emergency Services</div>
              <a href="tel:911" className="text-mhmr-olive font-semibold hover:underline">911</a>
              <p className="text-gray-500 text-xs mt-1">Call 911 for immediate emergency assistance.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button onClick={close} className="btn-primary flex-1">Close</button>
            <button onClick={ignore} className="btn-secondary flex-1">
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
