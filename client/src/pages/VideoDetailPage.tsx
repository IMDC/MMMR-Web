import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Tag, MapPin, Heart, Activity, MessageSquare, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useVideoStore } from '../store/videoStore';
import { useUIStore } from '../store/uiStore';
import { videosApi } from '../api/videos';
import { Video } from '../types';
import VideoPlayer from '../components/video/VideoPlayer';
import SentimentBadge from '../components/common/SentimentBadge';
import ProgressBar from '../components/common/ProgressBar';
import KeywordTagger from '../components/annotation/KeywordTagger';
import LocationPicker from '../components/annotation/LocationPicker';
import EmotionPicker from '../components/annotation/EmotionPicker';
import PainScalePicker from '../components/annotation/PainScalePicker';
import TextCommentsBox from '../components/annotation/TextCommentsBox';
import Loader from '../components/common/Loader';

type AnnotationTab = 'keywords' | 'locations' | 'emotions' | 'pain' | 'comments';

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo, refreshVideo } = useVideoStore();
  const { addCrisisAlert } = useUIStore();

  const [video, setVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState<AnnotationTab>('keywords');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionMessage, setTranscriptionMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    const found = videos.find(v => v._id === id);
    if (found) {
      setVideo(found);
      setLoading(false);
    } else {
      videosApi.get(id).then(v => { setVideo(v); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [id, videos]);

  const saveAnnotations = useCallback((updates: Partial<Video>) => {
    if (!id) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setVideo(prev => prev ? { ...prev, ...updates } : prev);
    saveTimeout.current = setTimeout(async () => {
      await updateVideo(id, updates);
    }, 500);
  }, [id, updateVideo]);

  const handleTranscribe = async () => {
    if (!id || !video) return;
    setTranscribing(true);
    setTranscriptionProgress(0);
    setTranscriptionMessage('Starting...');

    const evtSource = new EventSource(`/api/videos/${id}/transcription-status`);

    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setTranscriptionProgress(data.progress);
      setTranscriptionMessage(data.message);

      if (data.stage === 'complete') {
        evtSource.close();
        setTranscribing(false);
        refreshVideo(id).then(() => {
          const updated = videos.find(v => v._id === id);
          if (updated?.flagged_for_harm) {
            addCrisisAlert({ videoId: id, videoTitle: video.title, detectedPhrases: data.data?.detectedPhrases || [] });
          }
        });
      } else if (data.stage === 'error') {
        evtSource.close();
        setTranscribing(false);
        setTranscriptionMessage(`Error: ${data.message}`);
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      setTranscribing(false);
    };
  };

  const tabs: { id: AnnotationTab; label: string; icon: any }[] = [
    { id: 'keywords', label: 'Keywords', icon: Tag },
    { id: 'locations', label: 'Location', icon: MapPin },
    { id: 'emotions', label: 'Emotions', icon: Heart },
    { id: 'pain', label: 'Pain Scale', icon: Activity },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader size="lg" /></div>;
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-gray-500">Video not found</p>
        <button onClick={() => navigate('/videos')} className="btn-secondary">Back to Videos</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:h-full">
      {/* Header */}
      <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => navigate('/videos')} className="text-white/80 hover:text-white" aria-label="Back to Manage Videos">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold truncate">{video.title}</h1>
          <p className="text-white/60 text-xs">{format(new Date(video.datetimeRecorded), 'MMM d, yyyy • h:mm a')}</p>
        </div>
        {video.sentiment && <SentimentBadge sentiment={video.sentiment} />}
      </div>

      {/* Body — stacked on mobile, side-by-side on md+ */}
      <div className="flex-1 md:overflow-hidden md:flex md:flex-row">

        {/* Left: video player */}
        <div className="p-4 md:w-[55%] md:shrink-0 md:flex md:flex-col md:justify-start md:overflow-hidden">
          <VideoPlayer filename={video.filename} />

          {video.flagged_for_harm && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <AlertTriangle className="text-red-500 shrink-0" size={18} />
              <p className="text-red-700 text-sm font-medium">
                This recording has been flagged for potentially concerning content.
              </p>
            </div>
          )}
        </div>

        {/* Right: transcript + annotations */}
        <div className="p-4 space-y-4 md:flex-1 md:overflow-y-auto md:border-l md:border-gray-200">
          {/* Transcription section */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <Mic size={16} />
                Transcript
              </h2>
              <div className="flex items-center gap-2">
                {!video.isTranscribed && (
                  <button
                    onClick={handleTranscribe}
                    disabled={transcribing}
                    className="text-xs bg-mhmr-olive text-white px-3 py-1 rounded-full font-medium hover:bg-mhmr-olive-dark transition-colors flex items-center gap-1"
                  >
                    {transcribing ? <><Loader2 size={12} className="animate-spin" /> Transcribing...</> : 'Transcribe'}
                  </button>
                )}
              </div>
            </div>

            {transcribing && (
              <div className="mb-3">
                <ProgressBar progress={transcriptionProgress} message={transcriptionMessage} />
              </div>
            )}

            {video.transcript ? (
              <p className="text-sm text-gray-600 leading-relaxed">{video.transcript}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No transcript yet. Click "Transcribe" to generate one.</p>
            )}
          </div>

          {/* Annotations */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">Annotations</h2>

            {/* Tab navigation — 3-col grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {tabs.map(({ id: tabId, label, icon: Icon }) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-colors
                    ${activeTab === tabId
                      ? 'bg-mhmr-olive text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'keywords' && (
              <KeywordTagger
                value={video.keywords}
                onChange={keywords => saveAnnotations({ keywords })}
              />
            )}
            {activeTab === 'locations' && (
              <LocationPicker
                value={video.locations}
                onChange={locations => saveAnnotations({ locations })}
              />
            )}
            {activeTab === 'emotions' && (
              <EmotionPicker
                value={video.emotionStickers}
                onChange={emotionStickers => saveAnnotations({ emotionStickers })}
              />
            )}
            {activeTab === 'pain' && (
              <PainScalePicker
                value={video.painScale}
                numericScale={video.numericScale}
                onChange={(painScale, numericScale) => saveAnnotations({ painScale, numericScale })}
              />
            )}
            {activeTab === 'comments' && (
              <TextCommentsBox
                value={video.textComments}
                onChange={textComments => saveAnnotations({ textComments })}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
