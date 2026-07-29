import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Plus, Minus, Video, X } from 'lucide-react';
import { format } from 'date-fns';
import { useVideoSetStore } from '../store/videoSetStore';
import { useVideoStore } from '../store/videoStore';
import VideoCard from '../components/video/VideoCard';
import SentimentBadge from '../components/common/SentimentBadge';
import Loader from '../components/common/Loader';
import { videosApi } from '../api/videos';

export default function VideoSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videoSets, refreshSet, removeVideoFromSet, addVideosToSet } = useVideoSetStore();
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

  // Dynamic grid columns for available videos based on count
  // Dynamic grid columns for videos already in set (normal view)
  const setGridCols =
    setVideos.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
    setVideos.length <= 6 ? 'grid-cols-2 sm:grid-cols-3' :
    'grid-cols-3 sm:grid-cols-4';

  // Dynamic thumbnail size for selected strip based on count
  const selCount = setVideos.length;
  const thumbW = selCount <= 2 ? 'w-40' : selCount <= 5 ? 'w-28' : selCount <= 9 ? 'w-20' : 'w-14';
  const thumbH = selCount <= 2 ? 'h-24' : selCount <= 5 ? 'h-16' : selCount <= 9 ? 'h-12' : 'h-9';

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

      {addMode ? (
        /* ── Add mode: fixed split layout, no outer scroll ── */
        <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">

          {/* Selected videos — compact horizontal strip */}
          <div className="shrink-0 bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                In Set ({setVideos.length})
              </span>
              <button
                onClick={() => setAddMode(false)}
                className="text-sm text-mhmr-olive font-semibold hover:underline"
              >
                Done
              </button>
            </div>

            {setVideos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No videos in this set yet — tap below to add</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pt-2 pb-1 px-1">
                {setVideos.map(v => (
                  <div key={v._id} className={`relative shrink-0 ${thumbW}`}>
                    <div className="relative">
                      <video
                        src={videosApi.streamUrl(v.filename)}
                        className={`${thumbW} ${thumbH} object-cover rounded-lg bg-black`}
                        preload="metadata"
                      />
                      <button
                        onClick={() => removeVideoFromSet(set._id, v._id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md z-10"
                        aria-label={`Remove ${v.title} from set`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-1 leading-tight">{v.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available videos — VideoCard style, read-only */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {availableToAdd.length === 0 ? (
              <p className="text-center text-sm text-gray-400 mt-8">All videos are already in this set</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">Tap a video to add it to the set</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableToAdd.map(v => (
                    <button
                      key={v._id}
                      onClick={async () => {
                        await addVideosToSet(set._id, [v._id]);
                        await refreshSet(set._id);
                      }}
                      className="text-left hover:ring-2 hover:ring-mhmr-olive rounded-2xl transition-all active:scale-[0.98]"
                    >
                      <VideoCard video={v} readOnly />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── Normal mode: scrollable ── */
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
                onClick={() => setAddMode(true)}
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
              <div className={`grid ${setGridCols} gap-3`}>
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
        </div>
      )}
    </div>
  );
}
