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
  Trophy, 
  User, 
  Mail, 
  AlertTriangle, 
  ChevronRight, 
  Activity,
  Flame,
  Check,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { TeamLogo } from './TeamLogo';
import { useAuth } from '../context/AuthContext';
import { 
  DEFAULT_CUSTOMER_ACCOUNTS, 
  DEFAULT_CUSTOMER_PASSCODE,
  PRESET_TECHNICIANS, 
  TechnicianPreset, 
  CustomerDirectoryEntry,
  getAllocatedUnitsForCustomer 
} from '../utils/customerAllocation';
import { ServiceUnit, StepId } from '../types/process';
import { ORDERED_STAGES, parseStageQrPayload, generateStageQrPayload } from '../utils/stageQr';
import { scanImageDataForQr, scanImageFileForQr, parseScannedQrText } from '../utils/qrCode';
import { audioAlert } from '../utils/audioAlert';

interface WelcomeScreenProps {
  units: ServiceUnit[];
  onEnterApp: (params?: { targetStep?: StepId; targetUnitId?: string }) => void;
  onOpenStageQrModal?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  units,
  onEnterApp,
  onOpenStageQrModal,
}) => {
  const { 
    signInWithGoogle, 
    signInAsTechnician, 
    signInAsCustomer, 
    signInAsGuest,
    error, 
    clearError 
  } = useAuth();

  const [welcomeTab, setWelcomeTab] = useState<'teams' | 'technicians' | 'qr_scan'>('teams');

  // Technician Form State (Email-Only)
  const [techEmailInput, setTechEmailInput] = useState('n.malgarotti@particle-science.com');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Customer Form State (Email + Password)
  const [customCustomerEmail, setCustomCustomerEmail] = useState('');
  const [customerPasscode, setCustomerPasscode] = useState(DEFAULT_CUSTOMER_PASSCODE);
  const [showCustomerPasscode, setShowCustomerPasscode] = useState(false);
  const [customerLoginError, setCustomerLoginError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');

  // QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Local Time in Bicester Motion
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

  // Camera Management
  useEffect(() => {
    if (welcomeTab === 'qr_scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [welcomeTab]);

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
      setCameraError('Camera access unavailable. You can use the Quick Simulate buttons below or upload a QR image.');
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

  const handleScannedQrResult = (rawText: string) => {
    audioAlert.playClick();
    stopCamera();

    const stageMatch = parseStageQrPayload(rawText);
    if (stageMatch) {
      setScannedFeedback(`Identified Stage: ${stageMatch.stageInfo.title} (${stageMatch.stageInfo.stageCode})`);
      signInAsTechnician(techEmailInput.trim() || 'n.malgarotti@particle-science.com');
      setTimeout(() => {
        onEnterApp({ targetStep: stageMatch.stepId });
      }, 400);
      return;
    }

    const parsedUnit = parseScannedQrText(rawText);
    if (parsedUnit.serialNumber || parsedUnit.id) {
      const found = units.find(
        (u) =>
          u.serialNumber.toLowerCase() === (parsedUnit.serialNumber || '').toLowerCase() ||
          (parsedUnit.id && u.id === parsedUnit.id)
      );

      setScannedFeedback(`Identified Unit: ${parsedUnit.serialNumber || parsedUnit.id}`);
      signInAsTechnician(techEmailInput.trim() || 'n.malgarotti@particle-science.com');
      setTimeout(() => {
        onEnterApp({ 
          targetUnitId: found?.id, 
          targetStep: found?.currentStepId || 'intake' 
        });
      }, 400);
      return;
    }

    setScannedFeedback(`Scanned Payload: ${rawText}`);
    signInAsTechnician(techEmailInput.trim() || 'n.malgarotti@particle-science.com');
    setTimeout(() => {
      onEnterApp();
    }, 400);
  };

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

  // Guest Demo Login
  const handleGuestDemoLogin = () => {
    clearError();
    setCustomerLoginError(null);
    audioAlert.playClick();
    signInAsGuest();
    onEnterApp();
  };

  // Custom Customer Email + Passcode Submit
  const handleCustomCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setCustomerLoginError(null);
    if (!customCustomerEmail.trim()) {
      setCustomerLoginError('Please enter your corporate email address.');
      return;
    }
    audioAlert.playClick();
    const result = signInAsCustomer(customCustomerEmail.trim(), customerPasscode.trim());
    if (result.success) {
      onEnterApp();
    } else {
      setCustomerLoginError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  // Technician Login (Email-Only)
  const handleTechnicianLogin = (targetStep?: StepId) => {
    clearError();
    const email = techEmailInput.trim();
    if (!email) return;
    setIsLoggingIn(true);
    try {
      signInAsTechnician(email);
      audioAlert.playClick();
      onEnterApp({ targetStep });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Login
  const handleGoogleSignIn = async () => {
    clearError();
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
      audioAlert.playClick();
      onEnterApp();
    } catch (err) {
      console.warn('Google sign in error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Count units for account
  const getUnitCountForAccount = (account: CustomerDirectoryEntry) => {
    const allocated = getAllocatedUnitsForCustomer(units, account.email);
    const teamNameLower = account.customerName.toLowerCase();
    const direct = units.filter(
      (u) => (u.customerName || '').toLowerCase().includes(teamNameLower.split(' ')[0])
    );
    const set = new Set([...allocated.map((u) => u.id), ...direct.map((u) => u.id)]);
    return set.size;
  };

  // Filtered teams list based on search
  const filteredTeams = DEFAULT_CUSTOMER_ACCOUNTS.filter((acc) => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return (
      acc.customerName.toLowerCase().includes(q) ||
      acc.category.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950 relative overflow-x-hidden">
      {/* Background Visual Effects: Carbon Grid & Ambient Orange Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,158,11,0.18),rgba(0,0,0,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-3xl pointer-events-none" />

      {/* Top Banner Navigation */}
      <header className="relative z-10 border-b border-neutral-800/80 bg-neutral-950/70 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CompanyLogo variant="header" showUploadTrigger={false} />
          <div className="hidden sm:block h-5 w-px bg-neutral-800" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-400">
              BICESTER MOTION DEPOT
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Depot Time: <strong className="text-neutral-200">{bicesterTime || '09:00:00'}</strong></span>
          </div>

          {onOpenStageQrModal && (
            <button
              type="button"
              onClick={onOpenStageQrModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Station Placards</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGuestDemoLogin}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold transition-all hover:text-white cursor-pointer"
            title="Explore Customer Portal with dedicated demo sample unit"
          >
            Guest Demo Bypass →
          </button>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Title & Identity */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AS9100D &amp; ISO 9001 Registered Facility</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            Welcome to Particle Science
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            Motorsport Thermal Matrix Overhaul OS &amp; Deposition Testing Facility.
            <br />
            Select your racing constructor below to log in directly, or authenticate as workshop technical staff.
          </p>

          {/* Quick Tab Selector */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-bold shadow-lg">
              <button
                type="button"
                onClick={() => { setWelcomeTab('teams'); clearError(); }}
                className={`px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  welcomeTab === 'teams'
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                    : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Customer Portal Login</span>
              </button>

              <button
                type="button"
                onClick={() => { setWelcomeTab('technicians'); clearError(); }}
                className={`px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  welcomeTab === 'technicians'
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                    : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                <Wrench className="h-4 w-4" />
                <span>Workshop Technician Login</span>
              </button>

              <button
                type="button"
                onClick={() => { setWelcomeTab('qr_scan'); clearError(); }}
                className={`px-4 sm:px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  welcomeTab === 'qr_scan'
                    ? 'bg-amber-500 text-neutral-950 font-black shadow-md'
                    : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>Scan QR Login</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 max-w-lg mx-auto">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: CUSTOMER PORTAL EMAIL & PASSCODE LOGIN                  */}
        {/* ============================================================== */}
        {welcomeTab === 'teams' && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Customer Fleet Portal Access
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Strict constructor isolation: enter your corporate email &amp; passcode to access allocated fleet
                  </p>
                </div>
              </div>

              {customerLoginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{customerLoginError}</span>
                </div>
              )}

              {/* Direct Email + Passcode Form */}
              <form onSubmit={handleCustomCustomerSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 block font-mono font-bold uppercase tracking-wider">
                    Constructor Corporate Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={customCustomerEmail}
                      onChange={(e) => setCustomCustomerEmail(e.target.value)}
                      placeholder="e.g. marco.rossi@scuderiaferrari.com or aero@mclaren.com"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-300 block font-mono font-bold uppercase tracking-wider">
                      Corporate Access Passcode:
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Default: {DEFAULT_CUSTOMER_PASSCODE}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                    <input
                      type={showCustomerPasscode ? 'text' : 'password'}
                      required
                      value={customerPasscode}
                      onChange={(e) => setCustomerPasscode(e.target.value)}
                      placeholder="Enter corporate access passcode"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-11 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomerPasscode(!showCustomerPasscode)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title={showCustomerPasscode ? 'Hide passcode' : 'Show passcode'}
                    >
                      {showCustomerPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.01]"
                >
                  <span>Authenticate &amp; Access Allocated Fleet</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </button>
              </form>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2 text-[11px] text-neutral-400">
                <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Zero Cross-Team Visibility: Customers only have access to their own constructor's process map and certificates.</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: WORKSHOP TECHNICIAN STAFF LOGIN (EMAIL ONLY)            */}
        {/* ============================================================== */}
        {welcomeTab === 'technicians' && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Workshop Service Technician Access
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Authorized lead overhaul engineers, bench technicians, and ISO inspectors
                  </p>
                </div>
              </div>

              {/* Email-Only Login Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleTechnicianLogin(); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 block font-mono font-bold uppercase tracking-wider">
                    Technician Corporate Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={techEmailInput}
                      onChange={(e) => setTechEmailInput(e.target.value)}
                      placeholder="e.g. n.malgarotti@particle-science.com"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                    />
                  </div>
                </div>

                {/* Quick 1-Click Fill Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono block">
                    Quick Staff Logins:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { email: 'n.malgarotti@particle-science.com', label: 'Nicola Malgarotti (Lead Tech)' },
                      { email: 'qa.inspector@particle-science.com', label: 'QA / ISO Inspector' },
                      { email: 'tech.lead@particle-science.com', label: 'Senior Thermal Tech' },
                    ].map((item) => (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() => setTechEmailInput(item.email)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          techEmailInput === item.email
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-[1.01]"
                  >
                    <span>Authenticate Technician Session</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    title="Sign in with Google"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                      <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                      <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                    </svg>
                    <span>Google</span>
                  </button>
                </div>
              </form>

              {/* Direct Stage Logins */}
              <div className="pt-4 border-t border-neutral-800 space-y-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Direct Stage Station Login (1-Click Route):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ORDERED_STAGES.slice(0, 8).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleTechnicianLogin(st.id)}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[9.5px] font-mono font-bold text-amber-400 block">
                        {st.stageCode}
                      </span>
                      <span className="text-[11px] font-bold text-white group-hover:text-amber-300 truncate block">
                        {st.title.split('&')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SCAN QR CODE TO LOG IN DIRECTLY                         */}
        {/* ============================================================== */}
        {welcomeTab === 'qr_scan' && (
          <div className="max-w-2xl mx-auto w-full space-y-5">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    Scan Station QR or Unit Tag to Log In
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">Live Camera</span>
              </div>

              {/* Camera Viewport */}
              <div className="relative bg-black rounded-2xl border-2 border-neutral-800 overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover max-h-[320px]"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400" />
                      <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-neutral-950/95 p-4 flex flex-col items-center justify-center text-center space-y-2">
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

              {/* Image Upload Option */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <label className="px-3.5 py-2 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-neutral-700">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload QR Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <span className="text-[11px] text-neutral-500">
                  Scans unit serial labels &amp; stage placards
                </span>
              </div>

              {/* Quick Simulation Buttons */}
              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  Simulate QR Station Scan:
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
          </div>
        )}
      </main>

      {/* Persistent Depot Footer */}
      <footer className="relative z-10 py-4 px-4 sm:px-8 border-t border-neutral-900 bg-neutral-950/80 text-[11px] font-mono text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Particle Science Testing Solutions · Building 105, Bicester Motion, Oxfordshire, UK</span>
        </div>
        <div className="text-neutral-600">
          PROTRACE OS · WATER 3 BAR · OIL 10 BAR · INTERCOOLER 2 BAR
        </div>
      </footer>
    </div>
  );
};
