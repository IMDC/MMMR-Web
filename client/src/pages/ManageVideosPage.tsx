import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Layers, X, Check, Loader2, Camera } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import { useVideoSetStore } from '../store/videoSetStore';
import Header from '../components/layout/Header';
import VideoCard from '../components/video/VideoCard';
import Loader from '../components/common/Loader';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function ManageVideosPage() {
  const navigate = useNavigate();
  const { videos, fetchVideos, isLoading } = useVideoStore();
  const { videoSets, createSet, addVideosToSet, fetchSets } = useVideoSetStore();

  const [search, setSearch] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSetModal, setShowSetModal] = useState(false);
  const [setModalTab, setSetModalTab] = useState<'existing' | 'new'>('existing');
  const [newSetName, setNewSetName] = useState('');
  const [addingToSet, setAddingToSet] = useState(false);
  const [addedToSetId, setAddedToSetId] = useState<string | null>(null);
  const [filterTranscribed, setFilterTranscribed] = useState<boolean | null>(null);
  const [filterInSet, setFilterInSet] = useState<boolean | null>(null);

  useEffect(() => { fetchVideos(); fetchSets(); }, []);

  const videoIdsInSets = new Set(videoSets.flatMap(s => s.videoIDs));

  const filteredVideos = videos.filter(v => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTranscribed !== null && v.isTranscribed !== filterTranscribed) return false;
    if (filterInSet !== null && videoIdsInSets.has(v._id) !== filterInSet) return false;
    return true;
  });

  const handleSelect = useCallback((id: string, sel: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      sel ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const openSetModal = () => {
    fetchSets();
    setAddedToSetId(null);
    setNewSetName('');
    setSetModalTab('existing');
    setShowSetModal(true);
  };

  const closeSetModal = () => {
    setShowSetModal(false);
    // If something was added, exit select mode
    if (addedToSetId) {
      setSelectMode(false);
      setSelected(new Set());
    }
  };

  const handleAddToExistingSet = async (setId: string) => {
    setAddingToSet(true);
    try {
      await addVideosToSet(setId, Array.from(selected));
      await fetchSets();
      setAddedToSetId(setId);
    } finally {
      setAddingToSet(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newSetName.trim() || selected.size === 0) return;
    setAddingToSet(true);
    try {
      const newSet = await createSet(newSetName.trim());
      await addVideosToSet(newSet._id, Array.from(selected));
      await fetchSets();
      setAddedToSetId(newSet._id);
    } finally {
      setAddingToSet(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Manage Videos"
        subtitle={`${videos.length} video${videos.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <span className="text-white/70 text-sm">{selected.size} selected</span>
                <button
                  onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                  className="text-white/70 hover:text-white"
                  aria-label="Cancel selection"
                >
                  <X size={18} aria-hidden="true" />
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={openSetModal}
                    className="bg-white text-mhmr-olive text-sm font-semibold px-3 py-1 rounded-lg"
                  >
                    Add to Set
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add to set
                </button>
                <span className="w-0.5 h-5 bg-white/50" aria-hidden="true" />
                <button
                  onClick={() => navigate('/record')}
                  className="flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium"
                  aria-label="Record new video"
                >
                  <Camera size={20} aria-hidden="true" />
                  Record
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {/* Search & filter bar */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search videos..."
              className="form-input pl-9"
              aria-label="Search videos"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterTranscribed(filterTranscribed === true ? null : true)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors
                ${filterTranscribed === true ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              Transcribed
            </button>
            <button
              onClick={() => setFilterTranscribed(filterTranscribed === false ? null : false)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors
                ${filterTranscribed === false ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              Not transcribed
            </button>
            <button
              onClick={() => setFilterInSet(filterInSet === true ? null : true)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors
                ${filterInSet === true ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              In a set
            </button>
            <button
              onClick={() => setFilterInSet(filterInSet === false ? null : false)}
              className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors
                ${filterInSet === false ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200'}`}
            >
              Not in a set
            </button>
          </div>
        </div>

        {/* Video grid */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader message="Loading videos..." /></div>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📹</div>
              <p className="text-gray-500">
                {search ? 'No videos match your search' : 'No videos yet. Record your first one!'}
              </p>
              {!search && (
                <button onClick={() => navigate('/record')} className="btn-primary mt-4">
                  Record Video
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredVideos.map(video => (
                <VideoCard
                  key={video._id}
                  video={video}
                  selectable={selectMode}
                  selected={selected.has(video._id)}
                  onSelect={handleSelect}
                  inSet={videoIdsInSets.has(video._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add to set modal */}
      {showSetModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeSetModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-addset-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 id="manage-addset-title" className="font-bold text-gray-800">Add to Video Set</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selected.size} video{selected.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <button onClick={closeSetModal} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setSetModalTab('existing')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors
                  ${setModalTab === 'existing' ? 'text-mhmr-olive border-b-2 border-mhmr-olive' : 'text-gray-500'}`}
              >
                Existing Set
              </button>
              <button
                onClick={() => setSetModalTab('new')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors
                  ${setModalTab === 'new' ? 'text-mhmr-olive border-b-2 border-mhmr-olive' : 'text-gray-500'}`}
              >
                New Set
              </button>
            </div>

            <div className="p-5">
              {setModalTab === 'existing' ? (
                videoSets.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Layers size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No video sets yet.</p>
                    <button
                      onClick={() => setSetModalTab('new')}
                      className="text-mhmr-olive text-sm font-medium mt-2 hover:underline"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {videoSets.map(s => {
                      const justAdded = addedToSetId === s._id;
                      return (
                        <button
                          key={s._id}
                          onClick={() => !justAdded && handleAddToExistingSet(s._id)}
                          disabled={justAdded || addingToSet}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors
                            ${justAdded
                              ? 'border-mhmr-olive/30 bg-mhmr-olive/5 cursor-default'
                              : 'border-gray-200 hover:border-mhmr-olive hover:bg-mhmr-olive/5'
                            }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.videoIDs.length} video{s.videoIDs.length !== 1 ? 's' : ''}</p>
                          </div>
                          {justAdded && <Check size={16} className="text-mhmr-olive shrink-0" />}
                          {!justAdded && addingToSet && <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    placeholder="Set name (e.g. Week 1, January 2025)"
                    className="form-input"
                    onKeyDown={e => e.key === 'Enter' && handleCreateAndAdd()}
                    autoFocus
                    aria-label="New set name"
                  />
                  {addedToSetId && (
                    <div className="flex items-center gap-2 text-sm text-mhmr-olive font-medium">
                      <Check size={15} />
                      Set created and videos added!
                    </div>
                  )}
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={!newSetName.trim() || addingToSet || !!addedToSetId}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {addingToSet
                      ? <><Loader2 size={15} className="animate-spin" /> Creating...</>
                      : <><Plus size={15} /> Create & Add</>
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
