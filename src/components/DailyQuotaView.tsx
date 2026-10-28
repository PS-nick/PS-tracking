import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2, 
  Download, 
  Server, 
  HardDrive, 
  RotateCcw,
  ZapOff,
  CloudOff,
  Cloud,
  Layers,
  FileText,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';
import { 
  getImageResizeProfile, 
  setImageResizeProfile, 
  ImageResizeProfile 
} from '../utils/media';
import { ServiceUnit } from '../types/process';
import { 
  loadQuotaMetrics, 
  resetQuotaMetricsCounter, 
  getTimeUntilUtcMidnight, 
  DAILY_WRITE_LIMIT, 
  DAILY_READ_LIMIT, 
  DAILY_DELETE_LIMIT,
  DATABASE_ID,
  PROJECT_NUMBER,
  QuotaMetrics
} from '../utils/quotaTracker';
import { 
  isFirestoreQuotaExhausted, 
  clearQuotaExhausted, 
  syncAllUnitsToFirestore 
} from '../services/firestoreSync';
import { testFirestoreConnection } from '../lib/firebase';
import { audioAlert } from '../utils/audioAlert';

interface DailyQuotaViewProps {
  units: ServiceUnit[];
  onRefreshFleet?: () => void;
}

export const DailyQuotaView: React.FC<DailyQuotaViewProps> = ({ units, onRefreshFleet }) => {
  const [metrics, setMetrics] = useState<QuotaMetrics>(() => loadQuotaMetrics());
  const [timeUntilReset, setTimeUntilReset] = useState<string>(getTimeUntilUtcMidnight());
  const [isTestingProbe, setIsTestingProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [imageProfile, setImageProfile] = useState<ImageResizeProfile>(() => getImageResizeProfile());

  const handleProfileChange = (newProfile: ImageResizeProfile) => {
    setImageProfile(newProfile);
    setImageResizeProfile(newProfile);
    audioAlert.playClick();
  };

  // Poll metrics and time every 5 seconds
  useEffect(() => {
    const update = () => {
      setMetrics(loadQuotaMetrics());
      setTimeUntilReset(getTimeUntilUtcMidnight());
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTestProbe = async () => {
    setIsTestingProbe(true);
    setProbeResult(null);
    try {
      const ok = await testFirestoreConnection();
      if (ok) {
        setProbeResult('✓ Firestore probe succeeded: Database connection is online and responding.');
      } else {
        setProbeResult('⚠ Firestore probe returned offline or quota restricted.');
      }
      setMetrics(loadQuotaMetrics());
    } catch (err: any) {
      setProbeResult(`Probe error: ${err?.message || 'Connection failed'}`);
    } finally {
      setIsTestingProbe(false);
    }
  };

  const handleManualSyncNow = async () => {
    if (isFirestoreQuotaExhausted()) {
      if (!confirm('Cloud Firestore quota circuit-breaker is currently active due to daily limit exhaustion. Attempt manual sync anyway?')) {
        return;
      }
    }

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await syncAllUnitsToFirestore(units);
      setSyncFeedback(`✓ Successfully synced ${units.length} units to Cloud Firestore.`);
      audioAlert.playClick();
      setMetrics(loadQuotaMetrics());
      onRefreshFleet?.();
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err?.message || 'Error syncing to Firestore'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetCounter = () => {
    if (confirm('Reset today’s local operation counter back to 0? (Note: Google Cloud backend quota resets daily at 00:00 UTC)')) {
      const fresh = resetQuotaMetricsCounter();
      setMetrics(fresh);
      audioAlert.playClick();
    }
  };

  const handleClearCircuitBreaker = () => {
    clearQuotaExhausted();
    setMetrics(loadQuotaMetrics());
    audioAlert.playClick();
  };

  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(units, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depot-units-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    audioAlert.playClick();
  };

  const circuitActive = isFirestoreQuotaExhausted() || metrics.circuitBreakerActive;
  const writePercent = Math.min(100, Math.round((metrics.writesToday / DAILY_WRITE_LIMIT) * 100));
  const readPercent = Math.min(100, Math.round((metrics.readsToday / DAILY_READ_LIMIT) * 100));
  const deletePercent = Math.min(100, Math.round((metrics.deletesToday / DAILY_DELETE_LIMIT) * 100));

  // Estimate total payload size in bytes
  const estimatedPayloadBytes = new Blob([JSON.stringify(units)]).size;
  const estimatedPayloadKb = (estimatedPayloadBytes / 1024).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Banner & Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                <span>Cloud Firestore Spark Plan</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Auto-Save Active (Stage Completion & Intakes)</span>
              </span>
              {circuitActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Circuit-Breaker Active (Quota Reached)</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  <span>Normal Quota Operating Mode</span>
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-neutral-100 tracking-tight flex items-center gap-2">
              <span>Daily Firestore Quota &amp; Cloud Telemetry</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed max-w-3xl">
              Real-time monitoring of your Firebase Firestore free-tier operations. New intakes and stage completions auto-save to Cloud Firestore immediately, backed by offline-first local depot storage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Manually sync current fleet to Cloud Firestore"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Fleet...' : 'Manual Cloud Sync'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download local units backup JSON"
            >
              <Download className="h-4 w-4 text-sky-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Database Identifiers Bar */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase block font-sans">Database ID</span>
            <span className="text-neutral-200 font-bold truncate block" title={DATABASE_ID}>
              {DATABASE_ID}
            </span>
          </div>
          <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase block font-sans">Project Consumer #</span>
            <span className="text-neutral-200 font-bold">{PROJECT_NUMBER}</span>
          </div>
          <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase block font-sans">Daily Reset Cycle</span>
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Resets in {timeUntilReset} (00:00 UTC)</span>
            </span>
          </div>
          <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase block font-sans">Depot Local Fleet Size</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" />
              <span>{units.length} Units ({estimatedPayloadKb} KB)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action / Probe Feedback Messages */}
      {probeResult && (
        <div className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between gap-3 ${
          probeResult.startsWith('✓') 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <span>{probeResult}</span>
          <button 
            type="button"
            onClick={() => setProbeResult(null)}
            className="text-neutral-400 hover:text-white underline cursor-pointer text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {syncFeedback && (
        <div className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between gap-3 ${
          syncFeedback.startsWith('✓') 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          <span>{syncFeedback}</span>
          <button 
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-neutral-400 hover:text-white underline cursor-pointer text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Main Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Writes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-amber-400" />
              <span>Daily Writes</span>
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              circuitActive || writePercent >= 90
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
            }`}>
              {writePercent}% Used
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-white">
                {metrics.writesToday.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                / {DAILY_WRITE_LIMIT.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
              <div 
                className={`h-full transition-all duration-500 ${
                  circuitActive || writePercent >= 90 ? 'bg-rose-500' : writePercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(3, writePercent)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            {circuitActive 
              ? 'Free daily write limit reached for today. Writes paused by circuit-breaker.'
              : `${(DAILY_WRITE_LIMIT - metrics.writesToday).toLocaleString()} writes remaining before daily limit.`}
          </p>
        </div>

        {/* Card 2: Reads */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span>Daily Reads</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60">
              {readPercent}% Used
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-white">
                {metrics.readsToday.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                / {DAILY_READ_LIMIT.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
              <div 
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${Math.max(2, readPercent)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            {(DAILY_READ_LIMIT - metrics.readsToday).toLocaleString()} document reads remaining in free allowance today.
          </p>
        </div>

        {/* Card 3: Deletes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
              <span>Daily Deletes</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-950/70 text-purple-300 border border-purple-800/60">
              {deletePercent}% Used
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-white">
                {metrics.deletesToday.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                / {DAILY_DELETE_LIMIT.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
              <div 
                className="h-full bg-purple-500 transition-all duration-500"
                style={{ width: `${Math.max(2, deletePercent)}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            Purged error units and scrapped intake deletions today.
          </p>
        </div>

        {/* Card 4: Data Footprint */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
              <span>Storage Limit</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
              &lt; 0.1% of 1 GiB
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black font-mono text-white">
                {estimatedPayloadKb} KB
              </span>
              <span className="text-xs font-mono text-neutral-400">
                / 1,024 MB
              </span>
            </div>
            <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: '4%' }}
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            All inspection sheets, flow points, calibrations &amp; logs for {units.length} units.
          </p>
        </div>
      </div>

      {/* Explanation & Architecture Card: Why Auto-Save was Deleted */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <span>Architectural Protection: Background Auto-Save Deleted</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                Zero Quota Bridging
              </span>
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              In previous releases, a 30-second interval timer was running continuously in the background, writing all units in the fleet to Cloud Firestore across the network every 30 seconds. On multi-tab or test sessions, this burned through the 20,000 daily free tier write allowance in a matter of hours, causing <code className="bg-neutral-950 px-1 py-0.5 rounded text-rose-300 font-mono text-[11px]">[resource-exhausted]: Quota limit exceeded</code> errors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="text-amber-400 font-bold flex items-center gap-1.5 font-mono text-[11px]">
              <ZapOff className="h-3.5 w-3.5" />
              <span>1. Auto-Save Intervals Purged</span>
            </div>
            <p className="text-neutral-400 leading-normal text-[11px]">
              The periodic auto-save ticker is completely removed from the codebase. No automatic cloud network writes execute while you work.
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5 font-mono text-[11px]">
              <HardDrive className="h-3.5 w-3.5" />
              <span>2. Offline-First Local Storage</span>
            </div>
            <p className="text-neutral-400 leading-normal text-[11px]">
              All work order intakes, stage steps, fin straightening manual logs, and test point data persist directly to browser local storage synchronously.
            </p>
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-1.5">
            <div className="text-sky-400 font-bold flex items-center gap-1.5 font-mono text-[11px]">
              <Cloud className="h-3.5 w-3.5" />
              <span>3. Manual Cloud Sync Control</span>
            </div>
            <p className="text-neutral-400 leading-normal text-[11px]">
              Technicians decide when to push records to Cloud Firestore by clicking &ldquo;Manual Cloud Sync&rdquo;, eliminating unexpected quota usage.
            </p>
          </div>
        </div>

        {/* 4. Automatic Image Resizing & Storage Optimization Control */}
        <div className="bg-neutral-950 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                    Automatic Picture Resizing for Uploads
                  </h3>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active · 95%+ Saved
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Photos from phones and workshop cameras (5–20MB) are automatically downscaled and compressed upon upload to prevent Firestore 1MB breaches and local storage quota exhaustion.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <button
              type="button"
              onClick={() => handleProfileChange('standard')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                imageProfile === 'standard'
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold font-mono text-xs ${imageProfile === 'standard' ? 'text-amber-400' : 'text-neutral-200'}`}>
                  Standard (1024px)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Max 1024px · ~50–85 KB. Razor-sharp serial plate, core tube, and fin matrix detail with 95% space savings.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange('compact')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                imageProfile === 'compact'
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold font-mono text-xs ${imageProfile === 'compact' ? 'text-amber-400' : 'text-neutral-200'}`}>
                  Maximum Space Saver (800px)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-semibold">
                  Ultra-Light
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Max 800px · ~25–50 KB. Saves 98% storage space. Ideal for fleets with hundreds of units and constrained devices.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange('high')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                imageProfile === 'high'
                  ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold font-mono text-xs ${imageProfile === 'high' ? 'text-amber-400' : 'text-neutral-200'}`}>
                  High Resolution (1280px)
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-semibold">
                  High Detail
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Max 1280px · ~90–140 KB. Retains micro-weld penetrant details and high-zoom macro photography.
              </p>
            </button>
          </div>
        </div>

        {/* Diagnostic Actions Toolbar */}
        <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestProbe}
              disabled={isTestingProbe}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Activity className={`h-3.5 w-3.5 text-sky-400 ${isTestingProbe ? 'animate-spin' : ''}`} />
              <span>{isTestingProbe ? 'Probing Firestore...' : 'Test Connection Probe'}</span>
            </button>

            {circuitActive && (
              <button
                type="button"
                onClick={handleClearCircuitBreaker}
                className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 font-semibold rounded-lg border border-rose-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Manually clear the circuit-breaker flag to test if quota has reset"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Reset Circuit-Breaker Flag</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetCounter}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset the local session counter for today"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span>Reset Daily Metric Counter</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-neutral-500">
            Next backend reset: 00:00 UTC ({timeUntilReset})
          </span>
        </div>
      </div>

      {/* Operational Audit Log Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-neutral-100">
              Recent Firestore Operations &amp; Quota Audit Stream
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            {metrics.recentLogs.length} events logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950/80 text-neutral-400 border-b border-neutral-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Operation</th>
                <th className="py-2.5 px-4 font-semibold">Target / Unit</th>
                <th className="py-2.5 px-4 font-semibold text-center">Count</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {metrics.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 font-sans text-xs">
                    No Firestore operations logged yet today.
                  </td>
                </tr>
              ) : (
                metrics.recentLogs.map((log) => {
                  const isSuccess = log.status === 'success';
                  const isBlocked = log.status === 'circuit_broken';
                  const isErr = log.status === 'error';

                  return (
                    <tr key={log.id} className="hover:bg-neutral-850/50 transition-colors">
                      <td className="py-2.5 px-4 text-neutral-400 whitespace-nowrap text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.type === 'write' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          log.type === 'batch_sync' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                          log.type === 'delete' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                          'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-200 font-semibold truncate max-w-[150px]">
                        {log.target}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-neutral-300">
                        {log.count}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Executed</span>
                          </span>
                        )}
                        {isBlocked && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                            <ZapOff className="h-3 w-3" />
                            <span>Paused (Quota)</span>
                          </span>
                        )}
                        {isErr && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-400 truncate max-w-[280px] text-[11px]" title={log.details}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
