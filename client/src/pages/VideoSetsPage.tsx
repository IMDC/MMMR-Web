import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Layers, ChevronRight, Trash2, Video } from 'lucide-react';
import { useVideoSetStore } from '../store/videoSetStore';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';
import SentimentBadge from '../components/common/SentimentBadge';

export default function VideoSetsPage() {
  const navigate = useNavigate();
  const { videoSets, fetchSets, createSet, deleteSet, isLoading } = useVideoSetStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => { fetchSets(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const set = await createSet(newName.trim());
      setShowCreate(false);
      setNewName('');
      navigate(`/videosets/${set._id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Video Sets"
        subtitle={`${videoSets.length} set${videoSets.length !== 1 ? 's' : ''}`}
        actions={
          <button onClick={() => setShowCreate(true)} className="text-white/80 hover:text-white">
            <Plus size={22} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader /></div>
        ) : videoSets.length === 0 ? (
          <div className="text-center py-16">
            <Layers size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No video sets yet</p>
            <p className="text-sm text-gray-400 mb-5">Create a set to group related videos for analysis</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Create Video Set</button>
          </div>
        ) : (
          <div className="space-y-3">
            {videoSets.map(set => (
              <div
                key={set._id}
                onClick={() => navigate(`/videosets/${set._id}`)}
                className="card cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-mhmr-olive/10 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="text-mhmr-olive" size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-800 truncate">{set.name}</h3>
                      {set.isCurrent && (
                        <span className="text-xs bg-mhmr-olive/10 text-mhmr-olive px-2 py-0.5 rounded-full font-medium shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Video size={11} />
                        {set.videoIDs.length} video{set.videoIDs.length !== 1 ? 's' : ''}
                      </span>
                      <span>{format(new Date(set.datetime), 'MMM d, yyyy')}</span>
                    </div>
                    {set.sentiment && (
                      <div className="mt-1.5">
                        <SentimentBadge sentiment={set.sentiment} />
                      </div>
                    )}
                    {set.isSummaryGenerated && (
                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{set.summaryAnalysisSentence}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(set._id); }}
                      className="text-gray-200 hover:text-red-400 transition-colors"
                      aria-label={`Delete set ${set.name}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-set-title"
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
          >
            <h2 id="create-set-title" className="font-bold text-gray-800 text-lg mb-4">New Video Set</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Set name (e.g. Week 1, January 2025)"
              className="form-input mb-4"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              aria-label="Video set name"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating} className="btn-primary flex-1">
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Video Set"
          message="This will delete the set but not the videos inside it."
          confirmLabel="Delete Set"
          onConfirm={() => { deleteSet(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
          danger
        />
      )}
    </div>
  );
}
