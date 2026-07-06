import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { isToday } from 'date-fns';
import { useVideoStore } from '../store/videoStore';
// import { ChevronRight } from 'lucide-react';
// import { format } from 'date-fns';
// import SentimentBadge from '../components/common/SentimentBadge';

const DAILY_GOAL = 2;

export default function HomePage() {
  const navigate = useNavigate();
  const { videos, fetchVideos } = useVideoStore();

  useEffect(() => {
    fetchVideos();
  }, []);

  const todayVideos = videos.filter(v => isToday(new Date(v.datetimeRecorded)));
  const dailyProgress = Math.min(100, (todayVideos.length / DAILY_GOAL) * 100);
  const goalReached = todayVideos.length >= DAILY_GOAL;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-mhmr-olive h-14 pl-14 pr-6 flex items-center shrink-0">
        <h1 className="text-white font-bold text-base">Home</h1>
      </div>

      {/* Main content — centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-evenly px-8 py-6">

        {/* Title + Logo */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-light text-gray-900 tracking-wide text-center">
            MyMissionMyRecord
          </h1>
          <img
            src="/roundLogo.png"
            alt="MHMR Logo"
            className="w-36 h-36 object-contain"
          />
        </div>

        {/* Record button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => navigate('/record')}
            className="w-24 h-24 rounded-full bg-mhmr-olive flex items-center justify-center shadow-lg hover:bg-mhmr-olive-dark active:scale-95 transition-all"
          >
            <Video size={38} className="text-white" />
          </button>
          <p className="text-gray-700 font-medium text-xl">Record a video</p>
        </div>

        {/* Daily Achievement Badge */}
        <div className="w-full max-w-sm">
          <div className={`rounded-2xl p-5 ${goalReached ? 'bg-mhmr-olive' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={`font-semibold text-base ${goalReached ? 'text-white' : 'text-gray-800'}`}>
                  Daily Achievement
                </p>
                <p className={`text-sm mt-0.5 ${goalReached ? 'text-white/70' : 'text-gray-500'}`}>
                  {todayVideos.length} of {DAILY_GOAL} videos today
                </p>
              </div>
              <span className="text-3xl">
                {goalReached ? '🏆' : todayVideos.length > 0 ? '📹' : '🎯'}
              </span>
            </div>
            <div className={`rounded-full h-2.5 ${goalReached ? 'bg-white/20' : 'bg-gray-200'}`}>
              <div
                className={`rounded-full h-2.5 transition-all duration-700 ${goalReached ? 'bg-white' : 'bg-mhmr-olive'}`}
                style={{ width: `${dailyProgress}%` }}
              />
            </div>
            <p className={`text-xs mt-2 ${goalReached ? 'text-white/70' : 'text-gray-400'}`}>
              {goalReached
                ? "Amazing! You've reached your daily goal!"
                : `${DAILY_GOAL - todayVideos.length} more video${DAILY_GOAL - todayVideos.length !== 1 ? 's' : ''} to reach your goal`}
            </p>
          </div>
        </div>

      </div>

      {/* Recent videos — commented out for now */}
      {/*
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Recent Videos</h2>
          <button
            onClick={() => navigate('/videos')}
            className="text-sm text-mhmr-olive flex items-center gap-0.5 hover:underline"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {videos.slice(0, 5).map(video => (
            <button
              key={video._id}
              onClick={() => navigate(`/videos/${video._id}`)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-mhmr-olive/10 rounded-lg flex items-center justify-center shrink-0">
                <Video className="text-mhmr-olive" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{video.title}</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(video.datetimeRecorded), 'MMM d, yyyy · h:mm a')}
                </p>
              </div>
              {video.sentiment && <SentimentBadge sentiment={video.sentiment} />}
              <ChevronRight size={15} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
      */}
    </div>
  );
}
