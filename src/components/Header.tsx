import React, { useState } from 'react';
import { 
  Plus, 
  FileText, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  LayoutDashboard,
  Activity,
  QrCode,
  BarChart3,
  Volume2,
  VolumeX,
  Bell,
  History,
  Trash2,
  RotateCcw,
  Database,
  Cloud,
  RefreshCw,
  HardDrive,
  Lock,
  Wrench,
  Building2,
  Users
} from 'lucide-react';
import { ServiceUnit } from '../types/process';
import { CompanyLogo } from './CompanyLogo';
import { TeamLogo } from './TeamLogo';
import { UserAuthButton } from './UserAuthButton';
import { getPriorityConfig } from '../utils/priority';
import { audioAlert } from '../utils/audioAlert';
import { useAuth } from '../context/AuthContext';

export type CloudSyncStatus = 'offline_mode' | 'syncing' | 'cloud_synced';

interface HeaderProps {
  unit?: ServiceUnit | null;
  units: ServiceUnit[];
  onSelectUnit: (id: string) => void;
  onOpenNewUnitModal: () => void;
  onOpenActivityLog?: () => void;
  onOpenCertificate: () => void;
  onOpenQrScanner?: () => void;
  onOpenStageQrModal?: () => void;
  onOpenUnitQrModal?: (unit: ServiceUnit) => void;
  onOpenWorkbenchSheet?: () => void;
  onOpenAuthModal?: () => void;
  onDeleteUnit?: (unit: ServiceUnit) => void;
  onRefreshFleet?: () => void;
  unreadLogCount?: number;
  currentView?: 'dashboard' | 'analytics' | 'workflow' | 'quota' | 'customer_portal';
  onViewChange?: (view: 'dashboard' | 'analytics' | 'workflow' | 'quota' | 'customer_portal') => void;
  onPromptTechnicianLogin?: (reason?: string) => void;
  onOpenWelcomeScreen?: () => void;
  soundOn?: boolean;
  toggleSound?: () => void;
  syncStatus?: CloudSyncStatus;
  isAutoSaving?: boolean;
  lastAutoSaveTime?: Date;
  onManualSave?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unit,
  units,
  onSelectUnit,
  onOpenNewUnitModal,
  onOpenActivityLog,
  onOpenCertificate,
  onOpenQrScanner,
  onOpenStageQrModal,
  onOpenUnitQrModal,
  onOpenWorkbenchSheet,
  onOpenAuthModal,
  onDeleteUnit,
  onRefreshFleet,
  unreadLogCount = 0,
  currentView = 'dashboard',
  onViewChange,
  onPromptTechnicianLogin,
  onOpenWelcomeScreen,
  soundOn = true,
  toggleSound,
  syncStatus = 'cloud_synced',
  isAutoSaving = false,
  lastAutoSaveTime,
  onManualSave,
}) => {
  const { isAssignedPerson, isCustomer, profile } = useAuth();
  const [testingSound, setTestingSound] = useState(false);

  const handleTestChime = () => {
    if (!soundOn || testingSound) return;
    setTestingSound(true);
    audioAlert.playTimerCompleteAlert();
    setTimeout(() => setTestingSound(false), 1200);
  };

  const handleAnalyticsClick = () => {
    if (!isAssignedPerson) {
      onPromptTechnicianLogin?.('Service Analytics is restricted to assigned workshop technicians and lead engineers. Please sign in to authenticate.');
      return;
    }
    onViewChange?.('analytics');
  };

  const handleQuotaClick = () => {
    if (!isAssignedPerson) {
      onPromptTechnicianLogin?.('Daily Quota metrics and Cloud Firestore telemetry are restricted to assigned service technicians. Please sign in to authenticate.');
      return;
    }
    onViewChange?.('quota');
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        {/* Zone 1: Wordmark & Core Branding & View Switcher */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 flex-wrap">
          <div 
            onClick={() => onViewChange?.('dashboard')}
            className="cursor-pointer transition-transform hover:scale-[1.01]"
            title="Particle Science Tracking System - Depot Dashboard"
          >
            <CompanyLogo variant="header" showUploadTrigger={false} />
          </div>

          {/* Isolated Customer Team Badge with Authentic Team Logo */}
          {isCustomer && profile?.customerName && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-mono font-bold shrink-0 shadow-xs">
              <TeamLogo teamName={profile.customerName} size="xs" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{profile.customerName}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-200">ISOLATED</span>
            </div>
          )}

          {/* Welcome Screen Gateway Button */}
          {onOpenWelcomeScreen && (
            <button
              type="button"
              onClick={onOpenWelcomeScreen}
              className="px-2.5 py-1 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Return to Welcome Screen &amp; Constructor Login"
            >
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden xl:inline">Welcome / Switch User</span>
              <span className="xl:hidden">Welcome</span>
            </button>
          )}

          {/* Primary View Switcher: Dashboard vs Service Analytics vs Unit Workflow vs Customer Portal vs Quota */}
          {onViewChange && (
            <div className="flex items-center bg-neutral-950 p-0.5 sm:p-1 rounded-xl border border-neutral-800 shadow-inner flex-wrap">
              <button
                type="button"
                onClick={() => onViewChange('dashboard')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </button>

              {/* Process Map for customers vs Unit Workflow for technicians */}
              <button
                type="button"
                onClick={() => onViewChange('workflow')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'workflow'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={isCustomer ? "Track Unit Position in Process Map" : "Open Step-by-Step Unit Workflow"}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>{isCustomer ? 'Process Map' : 'Unit Workflow'}</span>
              </button>

              {/* Technician Only Views: Service Analytics & Daily Quota */}
              {!isCustomer && (
                <>
                  <button
                    type="button"
                    onClick={handleAnalyticsClick}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentView === 'analytics'
                        ? 'bg-amber-500 text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={isAssignedPerson ? "Workshop Service Analytics" : "Service Analytics (Restricted: Assigned Technicians Only)"}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>Service Analytics</span>
                    {!isAssignedPerson && (
                      <Lock className="h-3 w-3 text-amber-400/90 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuotaClick}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentView === 'quota'
                        ? 'bg-amber-500 text-neutral-950 shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={isAssignedPerson ? "Inspect Cloud Firestore Daily Quota, Limits & Circuit-Breaker" : "Daily Quota (Restricted: Assigned Technicians Only)"}
                  >
                    <Database className="h-3.5 w-3.5" />
                    <span>Daily Quota</span>
                    {!isAssignedPerson && (
                      <Lock className="h-3 w-3 text-amber-400/90 ml-0.5" />
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => onViewChange('customer_portal')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'customer_portal'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Customer Portal: Access allocated units strictly based on corporate email"
              >
                <Building2 className="h-3.5 w-3.5 text-sky-400" />
                <span>Customer Portal</span>
                {isCustomer && (
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 inline-block animate-pulse" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Zone 2: Active Unit Selector & Live Context - Content-based dynamic sizing */}
        <div className="flex items-center gap-2 sm:gap-3 bg-neutral-950/70 border border-neutral-800 rounded-lg px-2.5 sm:px-3 py-1.5 flex-nowrap w-fit max-w-full inline-flex shrink-0 self-start md:self-auto">
          <Layers className="h-4 w-4 text-neutral-400 shrink-0" />
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0 w-fit">
            <span className="text-neutral-400 font-medium">Unit:</span>
            {unit ? (
              <>
                <select
                  value={unit.id}
                  onChange={(e) => onSelectUnit(e.target.value)}
                  className="bg-transparent text-neutral-100 font-mono font-semibold focus:outline-none cursor-pointer border-b border-neutral-700 hover:border-amber-400 transition-colors py-0.5 text-xs max-w-[170px] sm:max-w-[220px] truncate"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id} className="bg-neutral-900 text-neutral-100">
                      {u.serialNumber || 'Unit'} ({(u.customerName || 'Client').slice(0, 16)})
                    </option>
                  ))}
                </select>
                {onDeleteUnit && (
                  <button
                    type="button"
                    onClick={() => onDeleteUnit(unit)}
                    className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-md transition-colors cursor-pointer"
                    title={`Delete ${unit.serialNumber} (Input Error / Purge Record)`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : (
              <span className="text-neutral-500 font-mono text-[11px] italic">No units in fleet</span>
            )}
            {onRefreshFleet && (
              <button
                type="button"
                onClick={onRefreshFleet}
                className="p-1 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/15 rounded-md transition-colors cursor-pointer"
                title="Refresh Fleet Units & Storage"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {unit && (
              <>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400 font-mono text-[11px] hidden sm:inline">{unit.workOrderNumber}</span>
                <span className="text-neutral-600 hidden sm:inline">|</span>
                {(() => {
                  const p = getPriorityConfig(unit.priority);
                  return (
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold border flex items-center gap-1 shrink-0 ${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dotColor} ${p.pulse ? 'animate-ping' : ''}`} />
                      <span>{p.label}</span>
                    </span>
                  );
                })()}
                <span className="text-neutral-600 hidden md:inline">|</span>
                <span className="hidden md:inline">
                  {unit.overallStatus === 'completed' ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </span>
                  ) : unit.overallStatus === 'quarantined' ? (
                    <span className="text-rose-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Quarantined
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">
                      In Progress
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Zone 3: Primary Actions & Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-wrap w-full md:w-auto">
          {/* Workshop Utility Controls: Audio, Auto-Save & Audit Stream */}
          <div className="flex items-center gap-1 bg-neutral-950/80 p-0.5 sm:p-1 rounded-xl border border-neutral-800">
            {/* Visual Indicator: Offline Mode vs Syncing vs Cloud Synced */}
            <div 
              onClick={onManualSave}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer select-none ${
                syncStatus === 'syncing'
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 animate-pulse'
                  : syncStatus === 'cloud_synced'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                  : 'bg-neutral-900 border-amber-500/50 text-amber-300 hover:border-amber-400'
              }`}
              title={
                syncStatus === 'syncing'
                  ? 'Syncing state with Cloud Firestore...'
                  : syncStatus === 'cloud_synced'
                  ? 'Cloud Synced: Firebase connection active · Click to force save/sync'
                  : 'Offline Mode: Local Storage is primary source of truth · Click to attempt Cloud Sync'
              }
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-sky-400 shrink-0" />
                  <span className="whitespace-nowrap font-bold text-sky-300">Syncing</span>
                </>
              ) : syncStatus === 'cloud_synced' ? (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Cloud className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap font-bold text-emerald-300">Cloud Synced</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                  <HardDrive className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap font-bold text-amber-300">Offline Mode</span>
                </>
              )}
            </div>

            {/* Manual Save Button */}
            {onManualSave && (
              <button
                type="button"
                onClick={onManualSave}
                title="Click to manually save state and trigger cloud sync."
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 hover:border-amber-500/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${isAutoSaving ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-[11px] hidden sm:inline text-neutral-300">
                  {isAutoSaving ? 'Saving...' : lastAutoSaveTime ? `Saved ${lastAutoSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Save'}
                </span>
                <span className="sm:hidden text-[10px] text-neutral-300">
                  {isAutoSaving ? 'Saving' : 'Save'}
                </span>
              </button>
            )}

            {/* Audio Mute/Unmute */}
            {toggleSound && (
              <button
                type="button"
                onClick={toggleSound}
                title={soundOn ? 'Mute Workshop Sound Alarm' : 'Unmute Workshop Sound Alarm'}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                  soundOn
                    ? 'bg-neutral-900 text-amber-400 border-amber-500/30 hover:border-amber-400'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
                }`}
              >
                {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
            )}

            {/* Test Audio Chime */}
            {soundOn && (
              <button
                type="button"
                onClick={handleTestChime}
                disabled={testingSound}
                title="Test Workshop Alarm Speaker"
                className="px-2 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <Bell className={`h-3 w-3 ${testingSound ? 'text-amber-400 animate-spin' : 'text-neutral-400'}`} />
                <span className="hidden xl:inline">{testingSound ? 'Testing...' : 'Test Audio'}</span>
                <span className="xl:hidden">Test</span>
              </button>
            )}

            {/* Audit Stream Trigger */}
            {onOpenActivityLog && (
              <button
                type="button"
                onClick={onOpenActivityLog}
                className="relative px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Open Real-time Activity Audit Stream"
              >
                <History className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline font-semibold">Audit</span>
                {unreadLogCount !== undefined && unreadLogCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-neutral-950 font-mono font-bold text-[9px] rounded-full">
                    {unreadLogCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-neutral-800 hidden sm:block mx-0.5" />

          {/* Scan QR Button for New Intake */}
          {onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-xs font-semibold text-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Scan QR Code for New Unit Intake or Process Stage Check-in"
            >
              <QrCode className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          {/* Stage Station QR Placards Button */}
          {onOpenStageQrModal && (
            <button
              onClick={onOpenStageQrModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="View and print Stage Station QR Placards (ST-01 to ST-11)"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden md:inline">Station QRs</span>
            </button>
          )}

          {/* Unit QR Tag Modal */}
          {onOpenUnitQrModal && unit && (
            <button
              onClick={() => onOpenUnitQrModal(unit)}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
              title={`View ${unit.serialNumber} QR Tag`}
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Unified Master Service Report & Conformance Certificate */}
          {unit && (
            <button
              onClick={onOpenCertificate}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Open Complete Master Technical Service & Conformance Report (All-in-One)"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Master Service Report</span>
              <span className="sm:hidden">Report</span>
            </button>
          )}

          {/* Prompt Service Technician Login */}
          {!isAssignedPerson && onPromptTechnicianLogin && (
            <button
              type="button"
              onClick={() => onPromptTechnicianLogin()}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Prompt Service Technician Login"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Technician Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

          {/* Authentication & User Profile Trigger */}
          {onOpenAuthModal && (
            <UserAuthButton 
              onOpenAuthModal={onOpenAuthModal} 
              onPromptTechnicianLogin={onPromptTechnicianLogin}
            />
          )}

          {/* New Unit Intake Button */}
          <button
            onClick={onOpenNewUnitModal}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">New Intake</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
