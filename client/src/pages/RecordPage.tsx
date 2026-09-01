import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, Circle, CheckCircle, Loader2, Video, Tag, ListVideo, X, Zap, ZapOff, AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import { useAuthStore } from '../store/authStore';
import { videosApi } from '../api/videos';
import ProgressBar from '../components/common/ProgressBar';

type RecordingState = 'idle' | 'preview' | 'recording' | 'recorded' | 'uploading' | 'saved';
interface Devices { cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[]; speakers: MediaDeviceInfo[]; }

export default function RecordPage() {
  const navigate = useNavigate();
  const { uploadVideo } = useVideoStore();
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micFrameRef = useRef<number | null>(null);

  const [state, setState] = useState<RecordingState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null);
  const [showTranscribePrompt, setShowTranscribePrompt] = useState(false);
  const [autoTranscribeStarted, setAutoTranscribeStarted] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<'running' | 'done' | 'error'>('running');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [devices, setDevices] = useState<Devices>({ cameras: [], mics: [], speakers: [] });
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedMicId, setSelectedMicId] = useState('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const stopMicMonitor = () => {
    if (micFrameRef.current) cancelAnimationFrame(micFrameRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setMicLevel(0);
  };

  const startMicMonitor = (stream: MediaStream) => {
    stopMicMonitor();
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, avg * 2.5));
        micFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
  };

  const runTranscription = (id: string) => {
    setAutoTranscribeStarted(true);
    setTranscribeStatus('running');
    videosApi.transcribe(id)
      .then(() => setTranscribeStatus('done'))
      .catch(() => setTranscribeStatus('error'));
  };

  useEffect(() => {
    startPreview();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      stopMicMonitor();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startPreview = async (cameraId = selectedCameraId, micId = selectedMicId) => {
    setError('');
    streamRef.current?.getTracks().forEach(t => t.stop());
    stopMicMonitor();

    const isPortrait = window.innerHeight > window.innerWidth;
    const videoConstraints: MediaTrackConstraints = cameraId
      ? { deviceId: { exact: cameraId } }
      : isPortrait ? { facingMode: 'user' } : { width: { ideal: 1280 }, height: { ideal: 720 } };

    let videoTracks: MediaStreamTrack[] = [];
    let audioTracks: MediaStreamTrack[] = [];
    const errs: string[] = [];

    try {
      const vs = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      videoTracks = vs.getVideoTracks();
    } catch {
      errs.push('Camera');
    }

    try {
      const as = await navigator.mediaDevices.getUserMedia({ audio: micId ? { deviceId: { exact: micId } } : true });
      audioTracks = as.getAudioTracks();
    } catch {
      errs.push('Microphone');
    }

    if (errs.length === 2) { setError('Camera and Microphone not detected'); return; }
    if (errs.length === 1) setError(`${errs[0]} not detected`);

    const stream = new MediaStream([...videoTracks, ...audioTracks]);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.play();
    }

    if (audioTracks.length > 0) startMicMonitor(new MediaStream(audioTracks));

    // Enumerate devices now that permission is granted (labels are populated after first getUserMedia)
    const all = await navigator.mediaDevices.enumerateDevices();
    const cameras = all.filter(d => d.kind === 'videoinput');
    const mics = all.filter(d => d.kind === 'audioinput');
    const speakers = all.filter(d => d.kind === 'audiooutput');
    setDevices({ cameras, mics, speakers });
    if (!cameraId && cameras.length) setSelectedCameraId(c => c || cameras[0].deviceId);
    if (!micId && mics.length) setSelectedMicId(m => m || mics[0].deviceId);
    if (speakers.length) setSelectedSpeakerId(s => s || speakers[0].deviceId);

    if (videoTracks.length > 0) setState('preview');
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

      if (user?.autoTranscribe === null || user?.autoTranscribe === undefined) {
        // First time — show preference prompt before post-save modal
        setShowTranscribePrompt(true);
      } else if (user?.autoTranscribe === true) {
        // Auto-transcribe
        runTranscription(video._id);
      }

      setState('saved');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setState('recorded');
    }
  };

  const handleTranscribePref = (enabled: boolean) => {
    updatePreferences({ autoTranscribe: enabled });
    setShowTranscribePrompt(false);
    if (enabled && savedVideoId) {
      runTranscription(savedVideoId);
    }
  };

  const handleCameraChange = (id: string) => {
    setSelectedCameraId(id);
    if (state === 'preview') startPreview(id, selectedMicId);
  };

  const handleMicChange = (id: string) => {
    setSelectedMicId(id);
    if (state === 'preview') startPreview(selectedCameraId, id);
  };

  const handleSpeakerChange = async (id: string) => {
    setSelectedSpeakerId(id);
    if (videoRef.current && 'setSinkId' in videoRef.current) {
      await (videoRef.current as any).setSinkId(id);
    }
  };

  const recordAnother = () => {
    setBlob(null);
    setTitle('');
    setSavedVideoId(null);
    setElapsed(0);
    setAutoTranscribeStarted(false);
    setTranscribeStatus('running');
    setShowTranscribePrompt(false);
    if (videoRef.current) videoRef.current.src = '';
    setState('idle');
    startPreview();
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col gap-3 px-8 pt-12 pb-4 lg:pt-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 shrink-0">
            {error}
          </div>
        )}

        {/* Video area — 9:16 on mobile, fills remaining height on desktop */}
        <div className="relative bg-black rounded-2xl overflow-hidden w-full aspect-[9/16] md:aspect-auto md:flex-1 md:min-h-0 md:max-h-[62vh] lg:max-h-none">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={state !== 'idle' ? { transform: 'scaleX(-1)' } : undefined}
              playsInline
              controls={state === 'recorded'}
            />

            {state === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Circle size={48} className="mx-auto mb-3 opacity-50" />
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

        {/* Controls — centered, fixed width */}
        <div className="shrink-0 w-full max-w-2xl mx-auto flex flex-col gap-3">

          {/* Upload progress */}
          {state === 'uploading' && (
            <div className="card">
              <ProgressBar progress={uploadProgress} message="Uploading video..." />
            </div>
          )}

          {/* Title input */}
          {(state === 'recorded' || state === 'uploading') && (
            <div>
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

          {/* Device settings — shown during preview only */}
          {state === 'preview' && (
            <div>
              <button
                onClick={() => setShowDeviceSettings(s => !s)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Settings size={15} aria-hidden="true" />
                Device Settings
                {showDeviceSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDeviceSettings && (
                <div className="card mt-2 space-y-3">
                  {/* Camera */}
                  {devices.cameras.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Camera</label>
                      <select
                        value={selectedCameraId}
                        onChange={e => handleCameraChange(e.target.value)}
                        className="form-input text-sm"
                      >
                        {devices.cameras.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Microphone + level */}
                  {devices.mics.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Microphone</label>
                      <select
                        value={selectedMicId}
                        onChange={e => handleMicChange(e.target.value)}
                        className="form-input text-sm"
                      >
                        {devices.mics.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                      </select>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">Level</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-75"
                            style={{ width: `${micLevel}%`, backgroundColor: micLevel > 80 ? '#e65100' : micLevel > 40 ? '#2e7d32' : '#616161' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Speaker */}
                  {'setSinkId' in HTMLMediaElement.prototype && devices.speakers.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Speaker</label>
                      <select
                        value={selectedSpeakerId}
                        onChange={e => handleSpeakerChange(e.target.value)}
                        className="form-input text-sm"
                      >
                        {devices.speakers.map(d => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 6)}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {(state === 'idle' || state === 'preview') && (
              <button
                onClick={startRecording}
                disabled={state === 'idle'}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Circle size={18} className="fill-current" />
                Start Recording
              </button>
            )}

            {state === 'recording' && (
              <button onClick={stopRecording} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Square size={18} className="fill-current" />
                Stop Recording
              </button>
            )}

            {state === 'recorded' && (
              <>
                <button onClick={discard} className="btn-secondary flex-1">Discard</button>
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
        </div>

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
                transcribeStatus === 'running' ? (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <Loader2 size={13} className="text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-500 font-medium">Transcribing… this can take a minute</p>
                  </div>
                ) : transcribeStatus === 'done' ? (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <CheckCircle size={13} className="text-mhmr-olive" />
                    <p className="text-sm text-mhmr-olive font-medium">Transcription complete</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <AlertCircle size={13} className="text-red-500" />
                    <p className="text-sm text-red-500 font-medium">Transcription failed — you can retry from the video page</p>
                  </div>
                )
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
