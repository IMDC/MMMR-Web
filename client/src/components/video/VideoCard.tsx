import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, CheckSquare, Square, AlertTriangle, Loader2, Tag, Layers, Play, Plus, X, Check } from 'lucide-react';
import { Video } from '../../types';
import { useVideoStore } from '../../store/videoStore';
import { useVideoSetStore } from '../../store/videoSetStore';
import SentimentBadge from '../common/SentimentBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import { videosApi } from '../../api/videos';

interface Props {
  video: Video;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  inSet?: boolean;
}

export default function VideoCard({ video, selectable, selected, onSelect, inSet }: Props) {
  const navigate = useNavigate();
  const { deleteVideo } = useVideoStore();
  const { videoSets, fetchSets, addVideosToSet, createSet } = useVideoSetStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Thumbnail ref (for poster frame only)
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // Add to set modal
  const [showSetModal, setShowSetModal] = useState(false);
  const [setModalTab, setSetModalTab] = useState<'existing' | 'new'>('existing');
  const [newSetName, setNewSetName] = useState('');
  const [addingToSet, setAddingToSet] = useState(false);
  const [addedToSetId, setAddedToSetId] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteVideo(video._id);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenPlayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
  };

  const openSetModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchSets();
    setAddedToSetId(null);
    setNewSetName('');
    setSetModalTab('existing');
    setShowSetModal(true);
  };

  const handleAddToExistingSet = async (setId: string) => {
    setAddingToSet(true);
    try {
      await addVideosToSet(setId, [video._id]);
      setAddedToSetId(setId);
    } finally {
      setAddingToSet(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newSetName.trim()) return;
    setAddingToSet(true);
    try {
      const newSet = await createSet(newSetName.trim());
      await addVideosToSet(newSet._id, [video._id]);
      setAddedToSetId(newSet._id);
    } finally {
      setAddingToSet(false);
    }
  };

  const parsedKeywords = video.keywords
    .map(k => { try { return JSON.parse(k); } catch { return null; } })
    .filter(Boolean);

  const streamUrl = videosApi.streamUrl(video.filename);

  return (
    <>
      <div
        className={`card hover:shadow-md transition-shadow relative overflow-hidden
          ${selected ? 'ring-2 ring-mhmr-olive' : ''}
          ${video.flagged_for_harm ? 'border-red-200' : ''}`}
        onClick={() => selectable ? onSelect?.(video._id, !selected) : undefined}
      >
        {/* Selection checkbox */}
        {selectable && (
          <div className="absolute top-3 right-3 z-10">
            {selected
              ? <CheckSquare className="text-mhmr-olive" size={22} />
              : <Square className="text-gray-300" size={22} />
            }
          </div>
        )}

        {/* Video thumbnail */}
        <div className="relative bg-black rounded-xl overflow-hidden mb-3 aspect-video">
          <video
            ref={videoPreviewRef}
            src={streamUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            playsInline
          />
          {/* Play overlay */}
          <button
            onClick={handleOpenPlayer}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
            aria-label={`Play ${video.title}`}
          >
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <Play size={22} className="text-mhmr-olive ml-0.5" fill="currentColor" />
            </div>
          </button>
          {/* Crisis flag */}
          {video.flagged_for_harm && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              Crisis flagged
            </div>
          )}
        </div>

        {/* Title & date */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{video.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(video.datetimeRecorded), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>

        {/* Duration & transcription & set status */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="text-xs text-gray-500">
            {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${video.isTranscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {video.isTranscribed ? 'Transcribed' : 'Not transcribed'}
          </span>
          {inSet !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${inSet ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-600'}`}>
              {inSet ? 'In a set' : 'Not in a set'}
            </span>
          )}
          {video.sentiment && <SentimentBadge sentiment={video.sentiment} />}
        </div>

        {/* Keywords */}
        {parsedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {parsedKeywords.slice(0, 3).map((k: any, i: number) => (
              k?.title !== 'None' && (
                <span key={i} className="tag-pill text-xs py-0.5">{k.title}</span>
              )
            ))}
          </div>
        )}

        {/* Actions row */}
        {!selectable && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Annotate */}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/videos/${video._id}`); }}
              className="flex items-center gap-1.5 text-xs text-mhmr-olive font-medium hover:underline"
            >
              <Tag size={13} />
              Markup
            </button>

            <div className="flex items-center gap-3">
              {/* Add to set */}
              <button
                onClick={openSetModal}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-mhmr-olive transition-colors font-medium"
              >
                <Plus size={13} aria-hidden="true" />
                Add to set
              </button>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                disabled={deleting}
                className="text-gray-400 hover:text-red-400 transition-colors"
                aria-label="Delete video"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen video player modal */}
      {showPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleClosePlayer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Video player: ${video.title}`}
            className="relative w-full max-w-3xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClosePlayer}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
              aria-label="Close video player"
            >
              <X size={22} aria-hidden="true" />
            </button>

            {/* Title */}
            <p className="absolute -top-10 left-0 text-white/80 text-sm font-medium truncate max-w-[80%]">
              {video.title}
            </p>

            {/* Video */}
            <video
              src={streamUrl}
              className="w-full rounded-2xl shadow-2xl"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Video"
          message={`Are you sure you want to delete "${video.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
        />
      )}

      {/* Add to Set modal */}
      {showSetModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSetModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="videocard-addset-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 id="videocard-addset-title" className="font-bold text-gray-800">Add to Video Set</h2>
              <button onClick={() => setShowSetModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Tabs */}
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
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {videoSets.map(s => {
                      const alreadyIn = s.videoIDs.includes(video._id);
                      const justAdded = addedToSetId === s._id;
                      return (
                        <button
                          key={s._id}
                          onClick={() => !alreadyIn && !justAdded && handleAddToExistingSet(s._id)}
                          disabled={alreadyIn || justAdded || addingToSet}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors
                            ${alreadyIn || justAdded
                              ? 'border-mhmr-olive/30 bg-mhmr-olive/5 cursor-default'
                              : 'border-gray-200 hover:border-mhmr-olive hover:bg-mhmr-olive/5'
                            }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.videoIDs.length} video{s.videoIDs.length !== 1 ? 's' : ''}</p>
                          </div>
                          {(alreadyIn || justAdded) && (
                            <Check size={16} className="text-mhmr-olive shrink-0" />
                          )}
                          {!alreadyIn && !justAdded && addingToSet && (
                            <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
                          )}
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
                      Set created and video added!
                    </div>
                  )}
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={!newSetName.trim() || addingToSet || !!addedToSetId}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {addingToSet ? (
                      <><Loader2 size={15} className="animate-spin" /> Creating...</>
                    ) : (
                      <><Plus size={15} /> Create & Add</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
