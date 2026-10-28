import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Building2, 
  QrCode, 
  Camera, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Lock, 
  Sparkles, 
  Layers, 
  Flame, 
  Wind, 
  Gauge, 
  Microscope, 
  RotateCw, 
  SlidersHorizontal, 
  Award,
  ChevronRight,
  User,
  Mail,
  AlertTriangle,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { TeamLogo } from './TeamLogo';
import { useAuth } from '../context/AuthContext';
import { 
  DEFAULT_CUSTOMER_ACCOUNTS, 
  PRESET_TECHNICIANS, 
  TechnicianPreset, 
  CustomerDirectoryEntry,
  getAllocatedUnitsForCustomer 
} from '../utils/customerAllocation';
import { ServiceUnit, StepId } from '../types/process';
import { ORDERED_STAGES, parseStageQrPayload, generateStageQrPayload } from '../utils/stageQr';
import { scanImageDataForQr, scanImageFileForQr, parseScannedQrText } from '../utils/qrCode';
import { audioAlert } from '../utils/audioAlert';

interface LoginScreenProps {
  units: ServiceUnit[];
  onLoginSuccess: (params?: { targetStep?: StepId; targetUnitId?: string }) => void;
  onOpenStageQrModal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  units,
  onLoginSuccess,
  onOpenStageQrModal,
}) => {
  const { 
    signInWithGoogle, 
    signInDemo, 
    signInAsTechnician, 
    signInAsCustomer, 
    error, 
    clearError 
  } = useAuth();

  const [activePortalTab, setActivePortalTab] = useState<'technician' | 'customer' | 'scan_qr'>('technician');

  // Technician Portal State
  const [selectedTech, setSelectedTech] = useState<TechnicianPreset>(PRESET_TECHNICIANS[0]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [customTechName, setCustomTechName] = useState('');
  const [customTechEmail, setCustomTechEmail] = useState('');
  const [showCustomTechForm, setShowCustomTechForm] = useState(false);

  // Customer Portal State
  const [selectedCustomerAccount, setSelectedCustomerAccount] = useState<CustomerDirectoryEntry>(DEFAULT_CUSTOMER_ACCOUNTS[0]);
  const [customCustomerEmail, setCustomCustomerEmail] = useState('');
  const [showCustomCustomerInput, setShowCustomCustomerInput] = useState(false);

  // QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Local Time in Bicester
  const [bicesterTime, setBicesterTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setBicesterTime(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup camera on unmount or tab switch
  useEffect(() => {
    if (activePortalTab === 'scan_qr') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activePortalTab]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanLoop();
      }
    } catch (err) {
      console.warn('Camera failed:', err);
      setCameraError('Camera access unavailable. You can use the Quick Simulate buttons below or upload a photo of the QR code.');
      setIsCameraActive(false);
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
    setIsCameraActive(false);
  };

  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrText = scanImageDataForQr(imgData);
        if (qrText) {
          handleScannedQrResult(qrText);
          return;
        }
      } catch (e) {
        console.error('Frame decode:', e);
      }
    }
    animFrameRef.current = requestAnimationFrame(scanLoop);
  };

  // Handle Scanned QR text
  const handleScannedQrResult = (rawText: string) => {
    audioAlert.playClick();
    stopCamera();

    // 1. Check if it's a stage QR code
    const stageMatch = parseStageQrPayload(rawText);
    if (stageMatch) {
      setScannedFeedback(`Identified Stage: ${stageMatch.stageInfo.title} (${stageMatch.stageInfo.stageCode})`);
      // Log in as default technician and jump straight to that stage
      signInAsTechnician({
        name: selectedTech.name,
        email: selectedTech.email,
        role: selectedTech.role,
      });
      setTimeout(() => {
        onLoginSuccess({ targetStep: stageMatch.stepId });
      }, 400);
      return;
    }

    // 2. Check if it's a unit QR code
    const parsedUnit = parseScannedQrText(rawText);
    if (parsedUnit.serialNumber || parsedUnit.id) {
      const found = units.find(
        (u) =>
          u.serialNumber.toLowerCase() === (parsedUnit.serialNumber || '').toLowerCase() ||
          (parsedUnit.id && u.id === parsedUnit.id)
      );

      setScannedFeedback(`Identified Unit: ${parsedUnit.serialNumber || parsedUnit.id}`);
      signInAsTechnician({
        name: selectedTech.name,
        email: selectedTech.email,
        role: selectedTech.role,
      });
      setTimeout(() => {
        onLoginSuccess({ 
          targetUnitId: found?.id, 
          targetStep: found?.currentStepId || 'intake' 
        });
      }, 400);
      return;
    }

    // 3. Fallback: Technician Badge or custom text
    setScannedFeedback(`Scanned Payload: ${rawText}`);
    signInAsTechnician({
      name: selectedTech.name,
      email: selectedTech.email,
      role: selectedTech.role,
    });
    setTimeout(() => {
      onLoginSuccess();
    }, 400);
  };

  // Handle Image Upload for QR Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await scanImageFileForQr(file);
    if (text) {
      handleScannedQrResult(text);
    } else {
      alert('No valid QR code was detected in the uploaded image.');
    }
    e.target.value = '';
  };

  // Handle Technician Login Submit
  const handleTechnicianLogin = async (targetStep?: StepId) => {
    clearError();
    setIsLoggingIn(true);
    try {
      if (showCustomTechForm && customTechName.trim()) {
        signInAsTechnician({
          name: customTechName.trim(),
          email: customTechEmail.trim() || `${customTechName.toLowerCase().replace(/\s+/g, '.')}@particle-science.com`,
          role: 'technician',
        });
      } else {
        signInAsTechnician({
          name: selectedTech.name,
          email: selectedTech.email,
          role: selectedTech.role,
        });
      }
      audioAlert.playClick();
      onLoginSuccess({ targetStep });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    clearError();
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
      audioAlert.playClick();
      onLoginSuccess();
    } catch (err) {
      console.warn('Google sign in error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Customer Team Login
  const handleCustomerLogin = (account: CustomerDirectoryEntry) => {
    clearError();
    audioAlert.playClick();
    signInAsCustomer(account.email, account.customerName);
    onLoginSuccess();
  };

  const handleCustomCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCustomerEmail.trim()) return;
    audioAlert.playClick();
    signInAsCustomer(customCustomerEmail.trim());
    onLoginSuccess();
  };

  // Count units currently allocated to a customer account
  const getUnitCountForAccount = (account: CustomerDirectoryEntry) => {
    const allocated = getAllocatedUnitsForCustomer(units, account.email);
    // Also include any unit directly matching team name
    const teamNameLower = account.customerName.toLowerCase();
    const direct = units.filter(
      (u) => (u.customerName || '').toLowerCase().includes(teamNameLower.split(' ')[0])
    );
    const set = new Set([...allocated.map((u) => u.id), ...direct.map((u) => u.id)]);
    return set.size;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950 relative overflow-hidden">
      {/* Background Ambience: Subtle Motorsport Carbon Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-3xl pointer-events-none" />

      {/* Top Status Header */}
      <header className="relative z-10 border-b border-neutral-800/80 bg-neutral-950/60 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CompanyLogo variant="header" showUploadTrigger={false} />
          <div className="hidden sm:block h-5 w-px bg-neutral-800" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-neutral-400">
              AS9100D &amp; ISO 9001 DEPOT
            </span>
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Bicester: <strong className="text-neutral-200">{bicesterTime || '09:00:00'}</strong></span>
          </div>

          {onOpenStageQrModal && (
            <button
              type="button"
              onClick={onOpenStageQrModal}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View and print stage station QR code placards"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Station Placards</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleTechnicianLogin()}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
            title="Fast bypass for testing"
          >
            Bypass / Guest Demo
          </button>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8">
        <div className="max-w-4xl w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">
          {/* Card Top Banner: Title & Portal Switcher */}
          <div className="p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-black tracking-widest text-amber-400 uppercase block">
                  PROTRACE MOTORSPORT OVERHAUL OS
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                  Depot Gateway &amp; Authentication Portal
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Select your authorization level: Workshop Technician, Constructor Team Portal, or Scan Station QR Code.
                </p>
              </div>

              {/* Portal Mode Tabs */}
              <div className="inline-flex rounded-xl bg-neutral-900 border border-neutral-800 p-1 text-xs font-bold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => { setActivePortalTab('technician'); clearError(); }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePortalTab === 'technician'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Workshop Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActivePortalTab('customer'); clearError(); }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePortalTab === 'customer'
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Racing Team</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActivePortalTab('scan_qr'); clearError(); }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activePortalTab === 'scan_qr'
                      ? 'bg-emerald-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan QR</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Card Body: Depends on selected tab */}
          <div className="p-5 sm:p-7 flex-1 overflow-y-auto">
            {/* ============================================================== */}
            {/* TAB 1: WORKSHOP TECHNICIAN ACCESS                              */}
            {/* ============================================================== */}
            {activePortalTab === 'technician' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-400 flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-amber-400" />
                      <span>Select Authorized Technician</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomTechForm(!showCustomTechForm)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
                    >
                      {showCustomTechForm ? 'Select From Presets' : '+ Custom Sign-In'}
                    </button>
                  </div>

                  {!showCustomTechForm ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PRESET_TECHNICIANS.map((tech) => {
                        const isSelected = selectedTech.email === tech.email;
                        return (
                          <div
                            key={tech.email}
                            onClick={() => setSelectedTech(tech)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/60 shadow-md'
                                : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40'
                            }`}
                          >
                            <div className={`h-11 w-11 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${tech.badgeColor}`}>
                              {tech.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white truncate">
                                  {tech.name}
                                </span>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-amber-400/90 block truncate">
                                {tech.roleLabel}
                              </span>
                              <span className="text-[10px] text-neutral-400 block truncate mt-0.5">
                                {tech.specialty}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Technician Full Name</label>
                        <input
                          type="text"
                          value={customTechName}
                          onChange={(e) => setCustomTechName(e.target.value)}
                          placeholder="e.g. Lewis Badoer"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Work Email (Optional)</label>
                        <input
                          type="email"
                          value={customTechEmail}
                          onChange={(e) => setCustomTechEmail(e.target.value)}
                          placeholder="l.badoer@particle-science.com"
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleTechnicianLogin()}
                    disabled={isLoggingIn}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    <span>Authenticate as {showCustomTechForm && customTechName ? customTechName : selectedTech.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    title="Sign in using corporate Google Workspace account"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                    </svg>
                    <span>Google Sign-In</span>
                  </button>
                </div>

                {/* Direct Stage Station Logins */}
                <div className="pt-4 border-t border-neutral-800/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-amber-400" />
                      <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-300">
                        Log In Directly to a Workshop Stage Station
                      </h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">1-Click Station Route</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">
                    Click any station below to immediately check in and open that stage workflow for the active component:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {ORDERED_STAGES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleTechnicianLogin(st.id)}
                        className="p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800/50 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-black text-amber-400 group-hover:text-amber-300">
                            {st.stageCode}
                          </span>
                          <span className="text-[9px] font-mono text-neutral-500 group-hover:text-neutral-400">
                            #{st.stageNumber}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 truncate leading-snug">
                          {st.title.split('&')[0]}
                        </div>
                        <div className="text-[9.5px] text-neutral-400 truncate mt-0.5">
                          {st.stationName.split('·')[0]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: RACING CONSTRUCTOR / CUSTOMER ACCESS                    */}
            {/* ============================================================== */}
            {activePortalTab === 'customer' && (
              <div className="space-y-6">
                {/* Strict Team Isolation Guarantee Notice */}
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-sky-200 leading-relaxed">
                    <strong className="text-sky-300 uppercase tracking-wide block font-mono">
                      AS9100D Strict Constructor Data Isolation Active:
                    </strong>
                    Customers have strictly isolated access. Logging in as your racing constructor grants visibility
                    <strong> ONLY into units and test telemetry registered to your team</strong>. All other constructor data is strictly hidden and protected.
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-400 flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5 text-sky-400" />
                      <span>Select Racing Constructor / Customer Team</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCustomCustomerInput(!showCustomCustomerInput)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer"
                    >
                      {showCustomCustomerInput ? 'Pick From Team Directory' : '+ Enter Team Email'}
                    </button>
                  </div>

                  {!showCustomCustomerInput ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {DEFAULT_CUSTOMER_ACCOUNTS.map((acc) => {
                        const count = getUnitCountForAccount(acc);
                        return (
                          <div
                            key={acc.email}
                            onClick={() => handleCustomerLogin(acc)}
                            className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 hover:border-sky-500/50 hover:bg-neutral-800/40 transition-all cursor-pointer flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <TeamLogo teamName={acc.customerName} size="md" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-black text-white group-hover:text-sky-300 transition-colors truncate">
                                      {acc.customerName}
                                    </h4>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-neutral-900 border border-neutral-800 text-neutral-300 shrink-0">
                                      {acc.category}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-sky-400/90 block truncate mt-0.5">
                                    {acc.email}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-neutral-400 truncate pl-0.5">
                                Contact: {acc.contactPerson}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px]">
                              <span className="font-mono text-neutral-400">
                                {count > 0 ? (
                                  <strong className="text-emerald-400">{count} Active Units</strong>
                                ) : (
                                  <span>0 Units in Queue</span>
                                )}
                              </span>
                              <span className="text-sky-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>1-Click Log In</span>
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <form onSubmit={handleCustomCustomerSubmit} className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 space-y-3">
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">Constructor Corporate Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                          <input
                            type="email"
                            required
                            value={customCustomerEmail}
                            onChange={(e) => setCustomCustomerEmail(e.target.value)}
                            placeholder="engineer@mclaren.com or team@astonmartinf1.com"
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1">
                          Our system automatically extracts your team name from the domain and strictly isolates your units.
                        </p>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <span>Access Isolated Team Portal</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: SCAN QR CODE TO LOG IN DIRECTLY                         */}
            {/* ============================================================== */}
            {activePortalTab === 'scan_qr' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Hold any <strong>Stage Station QR Placard</strong>, <strong>Technician Badge</strong>, or <strong>Unit Asset Tag</strong> in front of your camera to instantly authenticate.
                  </span>
                </div>

                {/* Camera Viewport */}
                <div className="relative bg-black rounded-2xl border-2 border-neutral-800 overflow-hidden flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover max-h-[340px]"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Target Scanner Overlay Reticle */}
                  {isCameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                        <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-neutral-950/90 p-4 flex flex-col items-center justify-center text-center space-y-2">
                      <Camera className="h-8 w-8 text-neutral-600" />
                      <p className="text-xs text-neutral-400 max-w-sm">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-bold"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}

                  {scannedFeedback && (
                    <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono text-center shadow-lg animate-fadeIn">
                      {scannedFeedback}
                    </div>
                  )}
                </div>

                {/* Upload Image Option */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <label className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-neutral-700">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload QR Image</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  <span className="text-[11px] text-neutral-500">
                    Supports 24mm Brother tape tags &amp; A4 stage placards
                  </span>
                </div>

                {/* Quick Simulation Buttons for Testing Without Physical Camera */}
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                    Quick Simulated Station Scans (Click to Test):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ORDERED_STAGES.slice(0, 6).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleScannedQrResult(generateStageQrPayload(st.id))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-amber-300 text-[11px] font-mono transition-colors cursor-pointer"
                      >
                        Simulate {st.stageCode} ({st.title.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card Footer: Security & Legal Sign-off */}
          <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Particle Science Testing Solutions · AS9100D Aerospace &amp; Defense Standard</span>
            </div>
            <span>Building 105, Bicester Motion, Oxfordshire, UK</span>
          </div>
        </div>
      </main>

      {/* Footer System Credits */}
      <footer className="relative z-10 py-3 text-center text-[10px] text-neutral-600 font-mono border-t border-neutral-900">
        PROTRACE TELEMETRY &amp; OVERHAUL CONTROL · ZERO COMPROMISE MOTORSPORT ENGINEERING
      </footer>
    </div>
  );
};
