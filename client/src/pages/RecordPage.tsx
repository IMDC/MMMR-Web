import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, MicOff, Square, Circle, CheckCircle, Loader2, Video, Tag, ListVideo, X, Zap, ZapOff } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import { videosApi } from '../api/videos';
import Header from '../components/layout/Header';
import ProgressBar from '../components/common/ProgressBar';

type RecordingState = 'idle' | 'preview' | 'recording' | 'recorded' | 'uploading' | 'saved';

export default function RecordPage() {
  const navigate = useNavigate();
  const { uploadVideo } = useVideoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<RecordingState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null);
  const [showTranscribePrompt, setShowTranscribePrompt] = useState(false);
  const [autoTranscribeStarted, setAutoTranscribeStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startPreview = async () => {
    setError('');
    try {
      const isPortrait = window.innerHeight > window.innerWidth;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isPortrait
          ? { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: audioEnabled,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      setState('preview');
    } catch {
      setError('Camera/microphone access denied. Please allow access and try again.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const recordedBlob = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlob(recordedBlob);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(recordedBlob);
        videoRef.current.muted = false;
        // Don't auto-play — leave paused so user can review before saving
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      setState('recorded');
    };

    recorder.start(100);
    setState('recording');

    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const discard = () => {
    setBlob(null);
    setTitle('');
    setState('idle');
    setElapsed(0);
    if (videoRef.current) videoRef.current.src = '';
  };

  const save = async () => {
    if (!blob) return;
    setState('uploading');
    try {
      const filename = `recording_${Date.now()}.webm`;
      const file = new File([blob], filename, { type: 'video/webm' });
      const video = await uploadVideo(file, title || new Date().toLocaleString(), pct => setUploadProgress(pct));
      setSavedVideoId(video._id);

      const pref = localStorage.getItem('mhmr_autotranscribe');
      if (pref === null) {
        // First time — show preference prompt before post-save modal
        setShowTranscribePrompt(true);
      } else if (pref === 'true') {
        // Auto-transcribe: fire and forget
        videosApi.transcribe(video._id).catch(() => {});
        setAutoTranscribeStarted(true);
      }

      setState('saved');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setState('recorded');
    }
  };

  const handleTranscribePref = (enabled: boolean) => {
    localStorage.setItem('mhmr_autotranscribe', String(enabled));
    setShowTranscribePrompt(false);
    if (enabled && savedVideoId) {
      videosApi.transcribe(savedVideoId).catch(() => {});
      setAutoTranscribeStarted(true);
    }
  };

  const recordAnother = () => {
    setBlob(null);
    setTitle('');
    setSavedVideoId(null);
    setElapsed(0);
    setAutoTranscribeStarted(false);
    setShowTranscribePrompt(false);
    if (videoRef.current) videoRef.current.src = '';
    setState('idle');
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full">
      <Header title="Record Video" subtitle="Record a health journal entry" />

      {/* ── Responsive wrapper ──
          Default (phone):        scrollable column, small portrait camera
          md + portrait (iPad ↕): full-height column, camera fills space, controls pinned bottom
          md + landscape (iPad ↔) and lg+ (laptop): scrollable, wide landscape camera
      */}
      <div className={state === 'recorded'
        ? 'flex-1 flex flex-col overflow-hidden p-4 gap-4'
        : 'flex-1 portrait:overflow-hidden portrait:p-0 portrait:space-y-0 portrait:flex portrait:flex-col landscape:overflow-y-auto landscape:p-5 landscape:space-y-5'
      }>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 portrait:m-4 portrait:mb-0">
            {error}
          </div>
        )}

        {/* Video preview / recording area */}
        <div className={state === 'recorded'
          ? 'relative bg-black flex-1 min-h-0 w-full rounded-2xl overflow-hidden'
          : [
              'relative bg-black overflow-hidden mx-auto',
              'portrait:flex-1 portrait:w-full portrait:max-w-none portrait:rounded-none portrait:aspect-auto',
              'landscape:aspect-video landscape:rounded-2xl landscape:max-w-sm',
              'sm:landscape:max-w-md md:landscape:max-w-lg lg:landscape:max-w-3xl xl:landscape:max-w-2xl',
            ].join(' ')
        }>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            controls={state === 'recorded'}
          />

          {state === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm opacity-60">Camera preview will appear here</p>
              </div>
            </div>
          )}

          {state === 'recording' && (
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1" role="status" aria-live="polite">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">REC</span>
              <span className="text-white text-sm font-mono">{formatTime(elapsed)}</span>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {state === 'uploading' && (
          <div className="card portrait:mx-4">
            <ProgressBar progress={uploadProgress} message="Uploading video..." />
          </div>
        )}

        {/* Title input */}
        {(state === 'recorded' || state === 'uploading') && (
          <div className={state === 'recorded' ? 'shrink-0' : 'portrait:px-4 portrait:pt-3'}>
            <label htmlFor="video-title" className="text-sm font-medium text-gray-700 mb-1 block">Video Title</label>
            <input
              id="video-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={new Date().toLocaleString()}
              className="form-input"
            />
          </div>
        )}

        {/* Controls — pinned to bottom on iPad portrait */}
        <div className={state === 'recorded'
          ? 'flex gap-3 shrink-0'
          : 'flex gap-3 portrait:shrink-0 portrait:p-4 portrait:border-t portrait:border-gray-100 portrait:bg-white'
        }>
          {state === 'idle' && (
            <button onClick={startPreview} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Camera size={18} />
              Start Camera
            </button>
          )}

          {state === 'preview' && (
            <>
              {/* <button
                onClick={() => setAudioEnabled(a => !a)}
                className={`p-3 rounded-lg border-2 transition-colors ${audioEnabled ? 'border-mhmr-olive text-mhmr-olive' : 'border-gray-200 text-gray-400'}`}
              >
                {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button> */}
              <button onClick={startRecording} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Circle size={18} className="fill-current" />
                Start Recording
              </button>
            </>
          )}

          {state === 'recording' && (
            <button onClick={stopRecording} className="btn-danger flex-1 flex items-center justify-center gap-2">
              <Square size={18} className="fill-current" />
              Stop Recording
            </button>
          )}

          {state === 'recorded' && (
            <>
              <button onClick={discard} className="btn-secondary flex-1">
                Discard
              </button>
              <button onClick={save} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <CheckCircle size={18} />
                Save Video
              </button>
            </>
          )}

          {state === 'uploading' && (
            <button disabled className="btn-primary flex-1 flex items-center justify-center gap-2 opacity-70">
              <Loader2 size={18} className="animate-spin" />
              Uploading...
            </button>
          )}
        </div>

        {/* {state === 'idle' && (
          <div className="text-center">
            <p className="text-sm text-gray-500">Or</p>
            <label className="btn-secondary mt-2 inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setState('uploading');
                  try {
                    const video = await uploadVideo(file, file.name.replace(/\.[^/.]+$/, ''), pct => setUploadProgress(pct));
                    setSavedVideoId(video._id);
                    const pref = localStorage.getItem('mhmr_autotranscribe');
                    if (pref === null) {
                      setShowTranscribePrompt(true);
                    } else if (pref === 'true') {
                      videosApi.transcribe(video._id).catch(() => {});
                      setAutoTranscribeStarted(true);
                    }
                    setState('saved');
                  } catch (err: any) {
                    setError(err.message);
                    setState('idle');
                  }
                }}
              />
              Upload existing video
            </label>
          </div>
        )} */}
      </div>

      {/* First-time auto-transcription prompt */}
      {state === 'saved' && showTranscribePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="autotranscribe-title"
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-5"
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Zap size={32} className="text-blue-500" />
            </div>
            <div className="text-center">
              <h2 id="autotranscribe-title" className="text-xl font-bold text-gray-900">Auto-Transcription</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Would you like videos to be automatically transcribed after saving? Transcription enables
                keyword analysis, sentiment tracking, and AI summaries.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => handleTranscribePref(true)}
                className="flex items-center gap-3 p-4 rounded-2xl border-2 border-mhmr-olive bg-mhmr-olive/5 hover:bg-mhmr-olive/10 transition-colors text-left"
              >
                <Zap size={20} className="text-mhmr-olive shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Enable Auto-Transcription</p>
                  <p className="text-xs text-gray-400">Transcribe every video automatically after saving</p>
                </div>
              </button>
              <button
                onClick={() => handleTranscribePref(false)}
                className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-300 transition-colors text-left"
              >
                <ZapOff size={20} className="text-gray-400 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Keep Manual</p>
                  <p className="text-xs text-gray-400">Transcribe videos manually when needed</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">You can change this in settings at any time.</p>
          </div>
        </div>
      )}

      {/* Post-save modal overlay */}
      {state === 'saved' && !showTranscribePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="postsave-title"
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 flex flex-col items-center gap-6 relative"
          >
            {/* Close button */}
            <button
              onClick={recordAnother}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Success indicator */}
            <div className="w-16 h-16 rounded-full bg-mhmr-olive/10 flex items-center justify-center">
              <CheckCircle size={34} className="text-mhmr-olive" />
            </div>
            <div className="text-center">
              <h2 id="postsave-title" className="text-xl font-bold text-gray-900">Video Saved!</h2>
              {autoTranscribeStarted ? (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <Loader2 size={13} className="text-blue-500 animate-spin" />
                  <p className="text-sm text-blue-500 font-medium">Transcription started in background</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-1">What would you like to do next?</p>
              )}
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={recordAnother}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-mhmr-olive hover:bg-mhmr-olive/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-mhmr-olive/10 flex items-center justify-center shrink-0">
                  <Video size={20} className="text-mhmr-olive" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Record Another</p>
                  <p className="text-xs text-gray-400">Start a new recording</p>
                </div>
              </button>

              <button
                onClick={() => savedVideoId && navigate(`/videos/${savedVideoId}`)}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-mhmr-olive hover:bg-mhmr-olive/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Tag size={20} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Add Markups</p>
                  <p className="text-xs text-gray-400">Add keywords, emotions, pain scale & more</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/videos')}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-mhmr-olive hover:bg-mhmr-olive/5 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <ListVideo size={20} className="text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Manage Videos</p>
                  <p className="text-xs text-gray-400">View and manage all your recordings</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
