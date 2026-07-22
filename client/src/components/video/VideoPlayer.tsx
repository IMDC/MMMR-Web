import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack } from 'lucide-react';
import { videosApi } from '../../api/videos';

interface Props {
  filename: string;
  className?: string;
  autoPlay?: boolean;
  knownDuration?: number;
}

export default function VideoPlayer({ filename, className = '', autoPlay = false, knownDuration }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(knownDuration ?? 0);
  const [currentTime, setCurrentTime] = useState(0);

  const streamUrl = videosApi.streamUrl(filename);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => {
      const d = isFinite(v.duration) ? v.duration : (knownDuration ?? 0);
      setCurrentTime(v.currentTime);
      setProgress(d ? (v.currentTime / d) * 100 : 0);
    };
    const onLoadedMetadata = () => {
      setDuration(isFinite(v.duration) ? v.duration : (knownDuration ?? 0));
    };
    const onDurationChange = () => {
      if (isFinite(v.duration)) setDuration(v.duration);
    };
    const onEnded = () => setPlaying(false);

    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('durationchange', onDurationChange);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('durationchange', onDurationChange);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const fullscreen = () => videoRef.current?.requestFullscreen();

  const restart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setPlaying(true);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className={`bg-black rounded-xl overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full aspect-video object-contain"
        preload="metadata"
        autoPlay={autoPlay}
        onClick={togglePlay}
      />

      {/* Custom controls */}
      <div className="bg-gray-900 px-4 py-2 flex items-center gap-3">
        <button onClick={restart} className="text-white/60 hover:text-white">
          <SkipBack size={16} />
        </button>

        <button onClick={togglePlay} className="text-white hover:text-mhmr-olive-light transition-colors">
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 bg-white/20 h-1.5 rounded-full cursor-pointer hover:h-2 transition-all"
          onClick={seek}
        >
          <div
            className="bg-mhmr-olive h-full rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-white/60 text-xs whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button onClick={toggleMute} className="text-white/60 hover:text-white">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <button onClick={fullscreen} className="text-white/60 hover:text-white">
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
}
