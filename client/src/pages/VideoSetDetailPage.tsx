import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Plus, Minus, Video } from 'lucide-react';
import { format } from 'date-fns';
import { useVideoSetStore } from '../store/videoSetStore';
import { useVideoStore } from '../store/videoStore';
import Header from '../components/layout/Header';
import VideoCard from '../components/video/VideoCard';
import SentimentBadge from '../components/common/SentimentBadge';
import Loader from '../components/common/Loader';

export default function VideoSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videoSets, refreshSet, removeVideoFromSet } = useVideoSetStore();
  const { videos, fetchVideos } = useVideoStore();
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);

  const set = videoSets.find(s => s._id === id);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      await Promise.all([refreshSet(id), fetchVideos()]);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader size="lg" /></div>;
  if (!set) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-gray-500">Set not found</p>
      <button onClick={() => navigate('/videosets')} className="btn-secondary">Back</button>
    </div>
  );

  const setVideos = videos.filter(v => set.videoIDs.includes(v._id));
  const availableToAdd = videos.filter(v => !set.videoIDs.includes(v._id));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-mhmr-olive px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => navigate('/videosets')} className="text-white/80 hover:text-white" aria-label="Back to Video Sets">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold truncate">{set.name}</h1>
          <p className="text-white/60 text-xs">{setVideos.length} video{setVideos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate(`/analysis?setId=${set._id}`)}
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
        >
          <BarChart2 size={16} />
          Analyze
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Set summary */}
        {set.isSummaryGenerated && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="section-title mb-0">Video Set Summary</h2>
              {set.sentiment && <SentimentBadge sentiment={set.sentiment} size="md" />}
            </div>
            <p className="text-sm text-gray-600">{set.summaryAnalysisSentence}</p>
          </div>
        )}

        {/* Videos in set */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">Videos in Set</h2>
            <button
              onClick={() => setAddMode(!addMode)}
              className="text-xs text-mhmr-olive font-medium flex items-center gap-1 hover:underline"
            >
              <Plus size={14} />
              Add videos
            </button>
          </div>

          {setVideos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Video size={40} className="mx-auto mb-2" />
              <p className="text-sm">No videos in this set yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {setVideos.map(video => (
                <div key={video._id} className="relative">
                  <VideoCard video={video} />
                  <button
                    onClick={() => removeVideoFromSet(set._id, video._id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                    aria-label={`Remove ${video.title} from set`}
                  >
                    <Minus size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add videos mode */}
        {addMode && availableToAdd.length > 0 && (
          <div className="card border-2 border-dashed border-mhmr-olive/30">
            <h3 className="font-semibold text-gray-700 mb-3">Add Videos to Set</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableToAdd.map(video => (
                <VideoCard
                  key={video._id}
                  video={video}
                  selectable
                  onSelect={async (vid) => {
                    const { addVideosToSet } = useVideoSetStore.getState();
                    await addVideosToSet(set._id, [vid]);
                    await refreshSet(set._id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
