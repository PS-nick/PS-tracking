import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  ArrowRight, 
  Layers, 
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Keyboard
} from 'lucide-react';
import { ServiceUnit, ScannedUnitPayload, StepId, ComponentType } from '../types/process';
import { parseScannedQrText, scanImageDataForQr, scanImageFileForQr } from '../utils/qrCode';
import { parseStageQrPayload, StageDefinition, ORDERED_STAGES, generateStageQrPayload } from '../utils/stageQr';
import { ALL_RACING_CATEGORIES } from '../constants/motorsport';
import { audioAlert } from '../utils/audioAlert';

const POPULAR_CONSTRUCTORS = [
  'Scuderia Ferrari HP',
  'Oracle Red Bull Racing',
  'Mercedes-AMG PETRONAS F1',
  'McLaren F1 Team',
  'Aston Martin Aramco',
  'Alpine F1 Team',
  'Williams Racing',
  'Porsche Penske Motorsport',
  'Toyota Gazoo Racing',
  'Ferrari AF Corse',
];

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: ServiceUnit[];
  currentStepId?: StepId;
  activeUnitId?: string;
  onConfirmNewIntake: (scannedData: ScannedUnitPayload, existingUnit?: ServiceUnit) => void;
  onSelectExistingUnit?: (unitId: string, targetStep?: StepId) => void;
  onUpdateActiveUnitType?: (unitId: string, newType: ComponentType) => void;
  onSelectStage?: (stepId: StepId) => void;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  units,
  currentStepId,
  activeUnitId,
  onConfirmNewIntake,
  onSelectExistingUnit,
  onUpdateActiveUnitType,
  onSelectStage,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'simulate' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanned result state
  const [scannedResult, setScannedResult] = useState<ScannedUnitPayload | null>(null);
  const [detectedStage, setDetectedStage] = useState<StageDefinition | null>(null);
  const [matchedUnit, setMatchedUnit] = useState<ServiceUnit | null>(null);
  const [selectedUnitType, setSelectedUnitType] = useState<ComponentType>('heat_exchanger');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('Scuderia Ferrari HP');
  const [customCustomerInput, setCustomCustomerInput] = useState<string>('');
  const [manualInputText, setManualInputText] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setScannedResult(null);
      setDetectedStage(null);
      setMatchedUnit(null);
      setCameraError(null);
      if (activeTab === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  // Start Camera
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrameLoop();
      }
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      const errMsg = err instanceof Error ? err.message : 'Unable to access camera device.';
      setCameraError(
        errMsg.includes('Permission') || errMsg.includes('NotAllowed')
          ? 'Camera permission was denied. Please allow camera access in browser settings, or use the "Upload Photo" or "Workshop Units" tabs.'
          : 'Could not initialize video camera. You can upload a photo of the QR code or select an existing unit to simulate a scan.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Video scanning frame loop
  const scanFrameLoop = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrText = scanImageDataForQr(imageData);

        if (qrText) {
          handleSuccessfulDecode(qrText);
          return; // Stop scanning loop on success
        }
      } catch (err) {
        console.error('Frame decode error:', err);
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrameLoop);
  };

  // When a QR code is successfully decoded from camera, file upload, or simulation
  const handleSuccessfulDecode = (rawText: string) => {
    audioAlert.playClick();
    stopCamera();

    // Check if this is a stage login QR code
    const stageMatch = parseStageQrPayload(rawText);
    if (stageMatch) {
      setDetectedStage(stageMatch.stageInfo);
      setScannedResult(null);
      return;
    }

    const parsed = parseScannedQrText(rawText);
    setScannedResult(parsed);

    // Look for matching unit in the depot fleet
    const found = units.find(
      (u) =>
        (u.serialNumber || '').toLowerCase() === (parsed.serialNumber || '').toLowerCase() ||
        (parsed.id && u.id === parsed.id)
    );
    setMatchedUnit(found || null);

    // Auto-update unit type from QR code reading
    const autoUnitType = parsed.componentType || found?.componentType || 'heat_exchanger';
    setSelectedUnitType(autoUnitType);

    // If unit is NOT in database, prompt customer selection on screen
    if (!found) {
      const defaultCust = parsed.customerName || 'Scuderia Ferrari HP';
      setSelectedCustomer(defaultCust);
      setCustomCustomerInput('');
    } else {
      setSelectedCustomer(found.customerName || parsed.customerName || 'Scuderia Ferrari HP');
      setCustomCustomerInput('');
    }
  };

  // Handle image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const qrText = await scanImageFileForQr(file);
    if (qrText) {
      handleSuccessfulDecode(qrText);
    } else {
      alert('No valid QR code was detected in the uploaded image. Please ensure the QR code is clearly visible and illuminated.');
    }
    e.target.value = '';
  };

  // Handle Quick Simulate scan of an existing unit
  const handleSimulateScan = (unit: ServiceUnit) => {
    const payload = unit.qrCode?.payload || JSON.stringify({
      format: 'PARTICLE_SCIENCE_TRACKING_V1',
      id: unit.id,
      sn: unit.serialNumber,
      pn: unit.partNumber,
      model: unit.modelName,
      customer: unit.customerName,
      wo: unit.workOrderNumber,
      componentType: unit.componentType,
    });
    handleSuccessfulDecode(payload);
  };

  // Confirm and proceed with New Intake
  const handleProceedNewIntake = () => {
    if (!scannedResult) return;

    const finalCustomer = (!matchedUnit && selectedCustomer === '__custom__' && customCustomerInput.trim())
      ? customCustomerInput.trim()
      : (selectedCustomer || scannedResult.customerName || 'Scuderia Ferrari HP');

    const finalizedPayload: ScannedUnitPayload = {
      ...scannedResult,
      customerName: finalCustomer,
      componentType: selectedUnitType,
    };

    onConfirmNewIntake(finalizedPayload, matchedUnit || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 flex items-center justify-center animate-fadeIn no-print">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-[94vw] sm:max-w-2xl lg:max-w-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[calc(100vh-2rem)] flex flex-col min-h-0 overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>Scan Unit QR Code</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  NEW INTAKE
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Scan physical asset tag or service paperwork to initiate new intake
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* If a Stage QR was scanned */}
        {detectedStage ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-500 text-neutral-950">
                        {detectedStage.stageCode}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {detectedStage.sopCode}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white mt-1">
                      Process Stage Station QR Detected: {detectedStage.title}
                    </h4>
                    <p className="text-xs text-neutral-300 mt-0.5 font-medium">
                      {detectedStage.stationName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300 leading-relaxed space-y-1">
                <div className="font-bold text-neutral-200">Equipment &amp; Action:</div>
                <div className="text-neutral-400 font-mono text-[11px]">{detectedStage.equipment}</div>
                <div className="text-amber-300 font-medium pt-1">{detectedStage.description}</div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                {onSelectStage && (
                  <button
                    type="button"
                    onClick={() => {
                      audioAlert.playClick();
                      onSelectStage(detectedStage.id);
                      onClose();
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01]"
                  >
                    <span>Log In &amp; Open Stage {detectedStage.stageCode} Workflow</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDetectedStage(null);
                    if (activeTab === 'camera') startCamera();
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Rescan / Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : !scannedResult ? (
          <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('upload');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('simulate');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'simulate'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Depot Units</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab('manual');
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Keyboard className="h-3.5 w-3.5" />
                <span>Manual / Code</span>
              </button>
            </div>

            {/* TAB 1: LIVE CAMERA */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                <div className="relative aspect-video w-full bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center">
                  {cameraError ? (
                    <div className="p-6 text-center space-y-3 max-w-sm">
                      <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
                      <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                        {cameraError}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry Camera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('simulate')}
                          className="px-3 py-1.5 bg-amber-500 text-neutral-950 font-bold text-xs rounded-lg transition-colors"
                        >
                          Select Unit to Scan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                      />
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Aiming Reticle Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-56 h-56 border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center">
                          {/* Corner Markers */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400" />
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400" />

                          {/* Sweeping Laser Line Animation */}
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse absolute" />

                          <span className="text-[10px] font-mono text-amber-300 font-bold bg-neutral-950/80 px-2 py-0.5 rounded-full absolute -bottom-7 border border-amber-500/30">
                            Align Unit QR Inside Frame
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Camera controls */}
                {!cameraError && (
                  <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Camera Feed Active
                    </span>

                    <button
                      type="button"
                      onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>Switch Camera ({facingMode === 'environment' ? 'Back' : 'Front'})</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: UPLOAD IMAGE */}
            {activeTab === 'upload' && (
              <div className="p-8 border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl bg-neutral-950/60 text-center space-y-3 transition-colors">
                <div className="h-12 w-12 rounded-full bg-neutral-800 text-amber-400 mx-auto flex items-center justify-center">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-200">
                    Upload QR Code Photo or Screenshot
                  </h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                    Select a photo taken on a mobile device or a downloaded asset tag label.
                  </p>
                </div>
                <div className="pt-2">
                  <label className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Choose QR Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: SIMULATE FLEET SCAN */}
            {activeTab === 'simulate' && (
              <div className="space-y-3">
                <div className="text-xs text-neutral-400">
                  Select any unit from your depot fleet to simulate scanning its physical QR code tag:
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {units.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSimulateScan(u)}
                      className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/50 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 p-1 bg-white rounded-lg shrink-0 border border-neutral-700">
                          {u.qrCode?.dataUrl ? (
                            <img
                              src={u.qrCode.dataUrl}
                              alt="QR"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <QrCode className="w-full h-full text-neutral-900" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-neutral-100 group-hover:text-amber-400 transition-colors">
                              {u.serialNumber}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                              WO #{u.workOrderNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            P/N: {u.partNumber} · {u.customerName}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1 bg-neutral-800 group-hover:bg-amber-500 group-hover:text-neutral-950 text-neutral-200 text-xs font-bold rounded-lg transition-colors shrink-0 ml-2"
                      >
                        Simulate Scan
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: MANUAL INPUT / 2D SCANNER WEDGE */}
            {activeTab === 'manual' && (
              <div className="space-y-4 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <Keyboard className="h-4 w-4 text-amber-400" />
                    <span>Direct Code Input / 2D Scanner Wedge</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Type or paste a QR code string, or connect a handheld USB / Bluetooth barcode wand.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={manualInputText}
                      onChange={(e) => setManualInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && manualInputText.trim()) {
                          handleSuccessfulDecode(manualInputText.trim());
                        }
                      }}
                      placeholder="Paste QR payload or Serial (e.g. RAD-2026-F1, OC-MCL-770, CAC-990)..."
                      className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualInputText.trim()) {
                          handleSuccessfulDecode(manualInputText.trim());
                        }
                      }}
                      disabled={!manualInputText.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shrink-0"
                    >
                      Process QR
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-bold">
                    Test With Unregistered QR Codes (Auto-Updates Unit Type &amp; Prompts Customer Selection):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { code: 'RAD-NEW-2026-F1', label: 'Water Radiator (Unregistered)' },
                      { code: 'OC-NEW-MCL-880', label: 'Oil Cooler (Unregistered)' },
                      { code: 'CAC-NEW-AM-990', label: 'Intercooler (Unregistered)' },
                      { code: 'CMB2-NEW-RB-102', label: 'Combi Dual Core (Unregistered)' },
                      { code: 'CMB3-NEW-FER-305', label: 'Combi Triple Core (Unregistered)' },
                      { code: 'HEX-NEW-CAD-55', label: 'Heat Exchanger (Unregistered)' },
                    ].map((testItem) => (
                      <button
                        key={testItem.code}
                        type="button"
                        onClick={() => {
                          setManualInputText(testItem.code);
                          handleSuccessfulDecode(testItem.code);
                        }}
                        className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-700 hover:border-amber-400/80 text-left transition-colors cursor-pointer group"
                      >
                        <span className="font-mono text-amber-300 font-bold text-[11px] block group-hover:text-amber-200">
                          {testItem.code}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {testItem.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulate Process Stage Station Placard Scan */}
                <div className="pt-2 border-t border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block font-bold flex items-center justify-between">
                    <span>Simulate Process Stage Station QR Codes (Click to Log Into Stage):</span>
                    <span className="text-amber-400">11 Stages</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                    {ORDERED_STAGES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          const payload = generateStageQrPayload(st.id);
                          setManualInputText(payload);
                          handleSuccessfulDecode(payload);
                        }}
                        className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-700 hover:border-amber-400 text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-400 font-bold text-[10px] block">
                            {st.stageCode}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-500">#{st.stageNumber}</span>
                        </div>
                        <span className="text-[10px] text-white truncate block font-bold">
                          {st.title.split('&')[0]}
                        </span>
                        <span className="text-[9px] text-neutral-400 truncate block">
                          {st.stationName.split('·')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* RESULT CARD AFTER SCAN */
          <div className="space-y-4 animate-fadeIn">
            {/* Decoded Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">
                  QR Code Successfully Scanned &amp; Verified
                </h4>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Unit type auto-detected from QR code: <strong className="text-white font-mono uppercase">{selectedUnitType.replace(/_/g, ' ')}</strong>
                </p>
              </div>
            </div>

            {/* PROMPT CUSTOMER SELECTION ON SCREEN (WHEN QR NOT IN DATABASE) */}
            {!matchedUnit && (
              <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>Unit Not Found in Depot Database</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono font-bold">
                        CUSTOMER SELECTION REQUIRED
                      </span>
                    </h4>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                      This QR asset tag (<strong className="font-mono text-white">{scannedResult.serialNumber}</strong>) is not in the database. Please select or enter the customer/constructor below to register this intake:
                    </p>
                  </div>
                </div>

                {/* 1-Click Popular Constructors */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-amber-300 uppercase font-bold block">
                    Quick Select Customer Constructor:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_CONSTRUCTORS.map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(team);
                          setCustomCustomerInput('');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer border ${
                          selectedCustomer === team
                            ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md scale-105'
                            : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-400 hover:text-white'
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Racing Series Dropdown */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-neutral-200 block flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span>Or Select from Complete Motorsport Directory:</span>
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCustomer(val);
                      if (val !== '__custom__') {
                        setCustomCustomerInput('');
                      }
                    }}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-100 font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {ALL_RACING_CATEGORIES.map((cat) => (
                      <optgroup key={cat.id} label={`${cat.badge}: ${cat.label}`}>
                        {cat.teams.map((teamName) => (
                          <option key={teamName} value={teamName}>
                            {teamName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">-- Other / Enter Custom Constructor Name --</option>
                  </select>

                  {selectedCustomer === '__custom__' && (
                    <div className="pt-1.5">
                      <input
                        type="text"
                        placeholder="Type custom customer or team constructor name..."
                        value={customCustomerInput}
                        onChange={(e) => setCustomCustomerInput(e.target.value)}
                        className="w-full bg-neutral-900 border border-amber-500/60 rounded-lg px-3 py-2 text-xs text-neutral-100 font-medium focus:outline-none focus:border-amber-400"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auto-Updated Unit Type Selection */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Auto-Updated Unit Type (from QR Code):</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{selectedUnitType.replace(/_/g, ' ').toUpperCase()}</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Unit type was automatically determined based on QR code reading. You can override below if necessary:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'heat_exchanger', label: 'Heat Exchanger' },
                  { id: 'water_radiator', label: 'Water Radiator' },
                  { id: 'oil_cooler', label: 'Oil Cooler' },
                  { id: 'intercooler', label: 'Intercooler / CAC' },
                  { id: 'combi_2_unit', label: 'Combi Dual (2-Core)' },
                  { id: 'combi_3_unit', label: 'Combi Triple (3-Core)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedUnitType(t.id as ComponentType)}
                    className={`p-2 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                      selectedUnitType === t.id
                        ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-sm'
                        : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* If user is viewing an active unit and wants to update its type */}
              {activeUnitId && onUpdateActiveUnitType && (
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-neutral-400">
                    Apply this unit type to active unit ({activeUnitId})?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateActiveUnitType(activeUnitId, selectedUnitType);
                      audioAlert.playConfirmBeep();
                      onClose();
                    }}
                    className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Update Active Unit Type
                  </button>
                </div>
              )}
            </div>

            {/* Identification Specifications Card */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                  Scanned Asset Specifications
                </span>
                {matchedUnit ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                    KNOWN DEPOT UNIT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    NEW REGISTERING UNIT
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 text-[11px] block">Unit Identifier:</span>
                  <span className="font-mono font-bold text-neutral-100 text-sm">
                    {scannedResult.serialNumber}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 text-[11px] block">Life Number:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      Life #{scannedResult.lifeNumber ?? matchedUnit?.lifeNumber ?? 1}
                    </span>
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 text-[11px] block">Part Number:</span>
                  <span className="font-mono font-semibold text-neutral-200">
                    {scannedResult.partNumber || matchedUnit?.partNumber || (selectedUnitType === 'oil_cooler' ? 'FMU-7204-OC' : selectedUnitType === 'water_radiator' ? 'RAD-2026-F1' : selectedUnitType === 'intercooler' ? 'CAC-990-HP' : 'FMU-7200-SER')}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-400 text-[11px] block">Assigned Customer:</span>
                  <span className="font-medium text-neutral-200 truncate block">
                    {matchedUnit 
                      ? (scannedResult.customerName || matchedUnit.customerName)
                      : selectedCustomer === '__custom__' && customCustomerInput
                      ? customCustomerInput
                      : selectedCustomer || scannedResult.customerName || 'Motorsport Works Constructor'}
                  </span>
                </div>
              </div>

              {matchedUnit && (
                <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>
                    Current Depot Stage: <strong className="text-amber-300 font-mono uppercase">{matchedUnit.currentStepId}</strong>
                  </span>
                  <span>
                    Prior Status: <strong className="text-neutral-200">{matchedUnit.overallStatus}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Actions for Step Station Verification & Navigation */}
            <div className="space-y-2 pt-2">
              {/* Case 1: Scanned unit matches the active unit currently at this step */}
              {matchedUnit && activeUnitId && matchedUnit.id === activeUnitId && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Station Traveler Verified: {matchedUnit.serialNumber}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300">
                    Physical asset tag confirmed at Stage {currentStepId?.toUpperCase() || 'Depot'}. Operator identity and station check-in recorded.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      audioAlert.playConfirmBeep();
                      onClose();
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm Station Check-In &amp; Continue Work</span>
                  </button>
                </div>
              )}

              {/* Case 2: Scanned unit is another unit from fleet and currentStepId is active */}
              {matchedUnit && (!activeUnitId || matchedUnit.id !== activeUnitId) && currentStepId && onSelectExistingUnit && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectExistingUnit(matchedUnit.id, currentStepId);
                    onClose();
                  }}
                  className="w-full px-4 py-3 bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.01]"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Load {matchedUnit.serialNumber} at Current Stage ({currentStepId.toUpperCase()})</span>
                </button>
              )}

              {/* Standard Resume Record */}
              {matchedUnit && onSelectExistingUnit && (!activeUnitId || matchedUnit.id !== activeUnitId) && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectExistingUnit(matchedUnit.id, matchedUnit.currentStepId);
                    onClose();
                  }}
                  className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-sky-400" />
                  <span>Open {matchedUnit.serialNumber} at its Active Stage ({matchedUnit.currentStepId.toUpperCase()})</span>
                </button>
              )}

              {/* Action to Start New Intake */}
              <button
                type="button"
                onClick={handleProceedNewIntake}
                className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.01]"
              >
                <Layers className="h-4 w-4 stroke-[2.5]" />
                <span>
                  {matchedUnit
                    ? `Register New Life Cycle for ${scannedResult.serialNumber} (New Intake)`
                    : `Create New Unit Intake for ${scannedResult.serialNumber}`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setScannedResult(null);
                  setMatchedUnit(null);
                  if (activeTab === 'camera') {
                    startCamera();
                  }
                }}
                className="w-full py-1.5 text-neutral-400 hover:text-neutral-200 text-xs font-medium text-center transition-colors cursor-pointer"
              >
                Scan Another QR Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
