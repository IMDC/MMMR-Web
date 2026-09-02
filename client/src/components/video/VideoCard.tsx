import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Trash2, CheckSquare, Square, AlertTriangle, Loader2, Tag, Clapperboard, Play, Plus, X, Check, Pencil, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Video } from '../../types';
import { useVideoStore } from '../../store/videoStore';
import { emotionOptions } from '../../constants/referenceData';
import { useVideoSetStore } from '../../store/videoSetStore';
import { useAuthStore } from '../../store/authStore';
import SentimentBadge from '../common/SentimentBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import { videosApi } from '../../api/videos';

interface Props {
  video: Video;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  inSet?: boolean;
  readOnly?: boolean;
}

export default function VideoCard({ video, selectable, selected, onSelect, inSet, readOnly }: Props) {
  const navigate = useNavigate();
  const { deleteVideo, updateVideo, transcriptionJobs } = useVideoStore();
  const { videoSets, fetchSets, addVideosToSet, createSet } = useVideoSetStore();
  const isTranscribing = transcriptionJobs.has(video._id);
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);

  const [summaryEnabled, setSummaryEnabled] = useState(() => user?.aiConsent === 'agreed');
  const [summaryFormat, setSummaryFormat] = useState<'sentence' | 'chips' | 'both'>(() => user?.summaryFormat ?? 'both');
  const [showSummaryPicker, setShowSummaryPicker] = useState(false);
  const [pickerFormat, setPickerFormat] = useState<'sentence' | 'chips' | 'both'>('both');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Rename
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(video.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === video.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      await updateVideo(video._id, { title: trimmed });
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  };

  const cancelEdit = () => {
    setEditingTitle(false);
    setTitleDraft('');
  };

  const parsedKeywords = video.keywords
    .map(k => { try { return JSON.parse(k); } catch { return null; } })
    .filter(Boolean);

  // Emotions
  const selectedEmotions = video.emotionStickers
    .map(e => { try { return JSON.parse(e).sentiment as string; } catch { return null; } })
    .filter(Boolean) as string[];
  const emotionEmojis = emotionOptions.filter(o => selectedEmotions.includes(o.sentiment));

  // Pain scale
  const painLevel = video.numericPainScale ?? 0;
  const painCategory = painLevel === 0
    ? null
    : painLevel <= 3
    ? { label: 'Mild',     style: 'bg-blue-50 text-blue-600'     }
    : painLevel <= 6
    ? { label: 'Moderate', style: 'bg-orange-50 text-orange-600' }
    : { label: 'Severe',   style: 'bg-red-50 text-red-600'       };

  const hasMarkups = emotionEmojis.length > 0 || painCategory !== null;

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
              ? <CheckSquare className="text-mhmr-olive drop-shadow" size={26} strokeWidth={2.5} />
              : <Square className="text-gray-500 drop-shadow" size={26} strokeWidth={2.5} />
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
          {!readOnly && (
            <button
              onClick={handleOpenPlayer}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              aria-label={`Play ${video.title}`}
            >
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play size={22} className="text-mhmr-olive ml-0.5" fill="currentColor" />
              </div>
            </button>
          )}
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
          {editingTitle ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') cancelEdit(); }}
                onBlur={commitTitle}
                className="flex-1 text-sm font-semibold text-gray-800 border-b border-mhmr-olive outline-none bg-transparent min-w-0"
                autoFocus
                disabled={savingTitle}
              />
              {savingTitle && <Loader2 size={13} className="animate-spin text-mhmr-olive shrink-0" />}
            </div>
          ) : (
            <div className="flex items-start gap-1">
              <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 flex-1">{video.title}</h3>
              {!selectable && !readOnly && (
                <button
                  onClick={startEditing}
                  className="shrink-0 mt-0.5 text-mhmr-olive hover:text-mhmr-olive-dark transition-colors p-1"
                  aria-label="Rename video"
                >
                  <Pencil size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {format(new Date(video.datetimeRecorded), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>

        {/* AI Summary */}
        {summaryEnabled && (video.videoSummary || video.videoTopics?.length > 0) && (
          readOnly ? (
            <div className="mb-3 px-2 py-1.5">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles size={10} className="text-gray-400" aria-hidden="true" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AI Summary</span>
              </div>
              {(summaryFormat === 'sentence' || summaryFormat === 'both') && video.videoSummary && (
                <p className="text-xs text-gray-500 italic leading-relaxed">{video.videoSummary}</p>
              )}
              {(summaryFormat === 'chips' || summaryFormat === 'both') && video.videoTopics?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {video.videoTopics.map((topic, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">{topic}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setPickerFormat(summaryFormat); setShowSummaryPicker(true); }}
              aria-label="Customize AI summary display format"
              className="w-full text-left mb-3 px-2 py-2 rounded-xl border border-transparent hover:border-mhmr-olive/30 hover:bg-mhmr-olive/5 transition-colors group/summary"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-mhmr-olive" aria-hidden="true" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Summary</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 group-hover/summary:text-mhmr-olive transition-colors">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  <span className="text-[11px]">Edit</span>
                </div>
              </div>
              {(summaryFormat === 'sentence' || summaryFormat === 'both') && video.videoSummary && (
                <p className="text-xs text-gray-500 italic leading-relaxed">{video.videoSummary}</p>
              )}
              {(summaryFormat === 'chips' || summaryFormat === 'both') && video.videoTopics?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {video.videoTopics.map((topic, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">{topic}</span>
                  ))}
                </div>
              )}
            </button>
          )
        )}

        {/* Duration & transcription & set status */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="text-xs text-gray-500">
              {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, '0')}
            </span>
            {isTranscribing ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                Transcribing…
              </span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${video.isTranscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {video.isTranscribed ? 'Transcribed' : 'Not transcribed'}
              </span>
            )}
            {inSet !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${inSet ? 'bg-purple-100 text-purple-700' : 'bg-orange-50 text-orange-600'}`}>
                {inSet ? 'In a set' : 'Not in a set'}
              </span>
            )}
            {video.sentiment && <SentimentBadge sentiment={video.sentiment} />}
          </div>
        )}

        {/* Keywords */}
        {!readOnly && parsedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {parsedKeywords.slice(0, 3).map((k: any, i: number) => (
              k?.title !== 'None' && (
                <span key={i} className="tag-pill text-xs py-0.5">{k.title}</span>
              )
            ))}
          </div>
        )}

        {/* Markups: emotions + pain scale */}
        {!readOnly && hasMarkups && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 pt-2 border-t border-gray-100">
            {emotionEmojis.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-50 rounded-full px-2 py-0.5">
                {emotionEmojis.map(({ sentiment, emoji, label }) => (
                  <span key={sentiment} title={label} className="text-base leading-none">{emoji}</span>
                ))}
              </div>
            )}
            {painCategory && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${painCategory.style}`}>
                Pain {painLevel} · {painCategory.label}
              </span>
            )}
          </div>
        )}

        {/* Actions row */}
        {!selectable && !readOnly && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Annotate */}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/videos/${video._id}`); }}
              className="flex items-center gap-1.5 text-sm text-mhmr-olive font-semibold hover:underline"
            >
              <Tag size={15} />
              Markup
            </button>

            <div className="flex items-center gap-3">
              {/* Add to set */}
              <button
                onClick={openSetModal}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-mhmr-olive transition-colors font-semibold"
              >
                <Plus size={15} aria-hidden="true" />
                Add to set
              </button>

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                disabled={deleting}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                aria-label="Delete video"
              >
                {deleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
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

      {/* Summary Format Picker modal */}
      {showSummaryPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setShowSummaryPicker(false)}
          onKeyDown={e => e.key === 'Escape' && setShowSummaryPicker(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-picker-title"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 id="summary-picker-title" className="font-bold text-gray-800">AI Summary Display</h2>
              <button onClick={() => setShowSummaryPicker(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Choose how AI summaries appear on video cards:</p>

              {(['sentence', 'chips', 'both'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setPickerFormat(fmt)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                    pickerFormat === fmt ? 'border-mhmr-olive bg-mhmr-olive/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-pressed={pickerFormat === fmt}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800">
                      {fmt === 'sentence' ? 'Sentence' : fmt === 'chips' ? 'Keywords' : 'Both'}
                    </span>
                    {pickerFormat === fmt && <Check size={14} className="text-mhmr-olive" aria-hidden="true" />}
                  </div>
                  {/* Mini preview */}
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles size={8} className="text-gray-400" aria-hidden="true" />
                      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">AI Summary</span>
                    </div>
                    {(fmt === 'sentence' || fmt === 'both') && (
                      <p className="text-[11px] text-gray-500 italic mb-1 leading-relaxed">
                        Discussed lower back pain after exercise, poor sleep, and low energy.
                      </p>
                    )}
                    {(fmt === 'chips' || fmt === 'both') && (
                      <div className="flex flex-wrap gap-1">
                        {['back pain', 'sleep', 'fatigue'].map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-white">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    setSummaryEnabled(false);
                    setShowSummaryPicker(false);
                    updatePreferences({ aiConsent: 'disagreed' });
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Turn off AI summaries
                </button>
                <button
                  onClick={() => {
                    setSummaryFormat(pickerFormat);
                    setShowSummaryPicker(false);
                    updatePreferences({ summaryFormat: pickerFormat });
                  }}
                  className="btn-primary text-sm px-4 py-1.5"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
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
                    <Clapperboard size={32} className="mx-auto mb-2 opacity-40" />
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
