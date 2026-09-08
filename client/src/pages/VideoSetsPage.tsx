import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, ChevronRight, Trash2, Video, Clapperboard, Info, Pencil } from 'lucide-react';
import { useVideoSetStore } from '../store/videoSetStore';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function VideoSetsPage() {
  const navigate = useNavigate();
  const { videoSets, fetchSets, createSet, deleteSet, updateSet, isLoading } = useVideoSetStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);

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

  const openRename = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditTarget(id);
    setEditName(currentName);
  };

  const handleRename = async () => {
    if (!editTarget || !editName.trim()) return;
    setRenaming(true);
    try {
      await updateSet(editTarget, { name: editName.trim() });
      setEditTarget(null);
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Video Sets"
        subtitle={`${videoSets.length} set${videoSets.length !== 1 ? 's' : ''}`}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
          <p>Organize your videos into sets around common themes. Video sets are required to generate reports and AI analysis.</p>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 btn-primary"
          >
            
            New Video Set
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader /></div>
        ) : videoSets.length === 0 ? (
          <div className="text-center py-10">
            <Clapperboard size={40} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No video sets yet — create one above.</p>
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
                    <Clapperboard className="text-mhmr-olive" size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-800 truncate">{set.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Video size={11} />
                        {set.videoIDs.length} video{set.videoIDs.length !== 1 ? 's' : ''}
                      </span>
                      <span>{format(new Date(set.datetime), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={e => openRename(e, set._id, set.name)}
                      className="text-gray-400 hover:text-mhmr-olive transition-colors p-1"
                      aria-label={`Rename set ${set.name}`}
                    >
                      <Pencil size={22} aria-hidden="true" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(set._id); }}
                      className="text-gray-400 hover:text-red-400 transition-colors p-1"
                      aria-label={`Delete set ${set.name}`}
                    >
                      <Trash2 size={22} aria-hidden="true" />
                    </button>
                    <ChevronRight size={20} className="text-gray-300" />
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

      {/* Rename modal */}
      {editTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          role="presentation"
          onKeyDown={e => e.key === 'Escape' && setEditTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-set-title"
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
          >
            <h2 id="rename-set-title" className="font-bold text-gray-800 text-lg mb-4">Rename Video Set</h2>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="form-input mb-4"
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              autoFocus
              aria-label="New set name"
            />
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRename} disabled={!editName.trim() || renaming} className="btn-primary flex-1">
                {renaming ? 'Saving...' : 'Save'}
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
