import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Camera, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  Trash2, 
  ShieldCheck, 
  Maximize2 
} from 'lucide-react';
import { MediaItem, StepId } from '../types/process';
import { createMediaItem, generateTechnicalSchematicSvg, readFileAsDataUrl } from '../utils/media';
import { audioAlert } from '../utils/audioAlert';

interface CameraSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (mediaItem: MediaItem) => void;
  unitSerialNumber: string;
  stage?: StepId;
  defaultCaption?: string;
}

export const CameraSnapshotModal: React.FC<CameraSnapshotModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  unitSerialNumber,
  stage = 'intake',
  defaultCaption = 'Workshop Camera Snapshot',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [customCaption, setCustomCaption] = useState<string>(defaultCaption);
  const [recentPhotos, setRecentPhotos] = useState<MediaItem[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop current stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start live webcam stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopStream();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API (getUserMedia) is not supported by this browser. Use direct device camera capture below.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Live camera stream error:', err);
      // Try fallback without strict resolution or facing mode
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        const msg = fallbackErr?.name === 'NotAllowedError'
          ? 'Camera access permission was denied. Please allow camera permissions in browser settings or use the Direct Device Camera button.'
          : 'Unable to start camera feed. Please use the Direct Device Camera upload button below.';
        setCameraError(msg);
      }
    }
  }, [stopStream]);

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setCustomCaption(defaultCaption);
      startCamera(facingMode);
    } else {
      stopStream();
      setRecentPhotos([]);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  // Keep video source object attached
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Take snapshot from live video element
  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    const maxDim = 1024;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash effect & audio click
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);
    audioAlert.playClick();

    // High quality bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Overlay date & serial number watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(16, height - 56, 360, 40);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`${unitSerialNumber} · PSTS DEPOT`, 26, height - 34);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(new Date().toLocaleString('en-GB'), 26, height - 20);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const fileName = `Snapshot_${unitSerialNumber}_${Date.now()}.jpg`;
    const caption = customCaption.trim() || `Workshop Camera Snapshot · ${unitSerialNumber}`;

    const newMedia = createMediaItem(
      fileName,
      'image',
      dataUrl,
      stage,
      caption
    );

    setRecentPhotos((prev) => [newMedia, ...prev]);
    onCapture(newMedia);
  };

  // Direct device camera input handler (native camera app on mobile/tablet or local file)
  const handleDeviceCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const caption = customCaption.trim() || `Device Camera Photo · ${file.name}`;
        const newMedia = createMediaItem(
          file.name,
          'image',
          dataUrl,
          stage,
          caption
        );
        setRecentPhotos((prev) => [newMedia, ...prev]);
        onCapture(newMedia);
        audioAlert.playClick();
      } catch (err) {
        console.warn('Device camera capture read error:', err);
      }
    }
    e.target.value = '';
  };

  // Schematic fallback if no camera hardware is available
  const handleGenerateFallbackSchematic = () => {
    const titles = [
      'Intake Visual Survey',
      'Port B Condition Inspection',
      'Mounting Flange & Weld Inspection',
      'Fin Louver Matrix Face',
    ];
    const pick = titles[recentPhotos.length % titles.length];
    const svgUrl = generateTechnicalSchematicSvg(pick, `${unitSerialNumber} · ${pick}`, '#0284c7');
    const newMedia = createMediaItem(
      `${pick.replace(/\s+/g, '_')}_${unitSerialNumber}.svg`,
      'image',
      svgUrl,
      stage,
      customCaption.trim() || pick
    );
    setRecentPhotos((prev) => [newMedia, ...prev]);
    onCapture(newMedia);
    audioAlert.playClick();
  };

  const handleToggleFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-5 flex items-center justify-center animate-fadeIn no-print">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <span>Workshop Live Camera Snapshot</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {unitSerialNumber}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Capture high-resolution inspection photos directly from webcam or tablet camera
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close camera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Canvas Area */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[420px] max-h-[520px] flex items-center justify-center overflow-hidden">
          {/* Flash animation */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-ping opacity-90" />
          )}

          {/* Hidden Canvas for Frame Grab */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Video Stream Element */}
          {stream && !cameraError ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full max-h-[500px] object-contain"
              />

              {/* Viewfinder Overlay Crosshairs & Reticle */}
              <div className="absolute inset-4 sm:inset-8 border border-white/20 rounded-xl pointer-events-none">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE FEED ({facingMode.toUpperCase()})</span>
                </div>
                <div className="absolute top-2 right-2 text-[10px] font-mono text-neutral-400 bg-black/60 px-2 py-0.5 rounded">
                  {unitSerialNumber}
                </div>

                {/* Center crosshair */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 pointer-events-none opacity-40">
                  <div className="absolute top-0 left-1/2 w-px h-12 bg-white -translate-x-1/2" />
                  <div className="absolute top-1/2 left-0 h-px w-12 bg-white -translate-y-1/2" />
                  <div className="absolute inset-2 border border-white rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center max-w-md space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400">
                <Camera className="h-8 w-8" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-200">
                  {cameraError ? 'Camera Stream Notice' : 'Connecting to Camera...'}
                </h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {cameraError || 'Requesting video hardware access from browser...'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 rounded-lg border border-neutral-700 font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => deviceFileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-xs text-neutral-950 font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Device Camera App</span>
                </button>
              </div>
            </div>
          )}

          {/* Flip Camera Switch Button (Top Right of viewfinder) */}
          {stream && (
            <button
              type="button"
              onClick={handleToggleFacing}
              className="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-neutral-300 hover:text-white text-xs font-mono border border-white/20 backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
              title="Switch between front and back camera"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Flip ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
            </button>
          )}
        </div>

        {/* Caption & Controls Toolbar */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400 shrink-0">Photo Tag:</span>
            <input
              type="text"
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="e.g. Unboxing condition / Serial tag / Fitting scratch..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Secondary actions: Device Camera & Fallback */}
            <div className="flex items-center gap-2">
              <input
                ref={deviceFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleDeviceCameraCapture}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => deviceFileInputRef.current?.click()}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-medium border border-neutral-800 flex items-center gap-1.5 cursor-pointer"
                title="Launch native device camera app"
              >
                <Camera className="h-3.5 w-3.5 text-amber-400" />
                <span>Device Camera App</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateFallbackSchematic}
                className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-medium border border-neutral-800 flex items-center gap-1.5 cursor-pointer"
                title="Simulate high-resolution technical inspection schematic"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                <span>Schematic</span>
              </button>
            </div>

            {/* Primary Action: Capture Snapshot */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (stream) {
                    handleTakeSnapshot();
                  } else if (deviceFileInputRef.current) {
                    deviceFileInputRef.current.click();
                  } else {
                    handleGenerateFallbackSchematic();
                  }
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 ring-2 ring-amber-400/40"
                title={stream ? "Capture live camera snapshot" : "Open device camera / select photo"}
              >
                <Camera className="h-4 w-4" />
                <span>{stream ? 'Capture Snapshot' : 'Take / Upload Photo'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Done ({recentPhotos.length})
              </button>
            </div>
          </div>

          {/* Captured Photos Strip */}
          {recentPhotos.length > 0 && (
            <div className="pt-2 border-t border-neutral-800/80">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="h-3 w-3" />
                  <span>Captured this session ({recentPhotos.length}):</span>
                </span>
                <span>Saved to intake inspection record</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {recentPhotos.map((photo, pIdx) => (
                  <div
                    key={photo.id || pIdx}
                    className="relative group shrink-0 h-14 w-20 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[9px] text-white p-1 text-center font-mono">
                      {photo.caption || photo.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
