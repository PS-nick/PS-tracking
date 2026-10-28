import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Download, 
  Layers, 
  Activity, 
  Truck, 
  Calendar, 
  ArrowUpRight, 
  LogOut, 
  Lock, 
  Sparkles, 
  Trophy, 
  Gauge, 
  Droplets, 
  Microscope, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  X,
  Mail,
  UserCheck,
  Wrench,
  Eye,
  EyeOff,
  BookOpen,
  FileSpreadsheet,
  Share2
} from 'lucide-react';
import { ServiceUnit, StepId } from '../types/process';
import { useAuth } from '../context/AuthContext';
import { 
  DEFAULT_CUSTOMER_ACCOUNTS, 
  DEFAULT_CUSTOMER_PASSCODE,
  getAllocatedUnitsForCustomer, 
  getCustomerInfoByEmail,
  isUnitAllocatedToCustomerEmail
} from '../utils/customerAllocation';
import { generateSampleRigTestPdf } from '../utils/cleanRigPdf';
import { getTeamMetadata } from '../constants/motorsport';
import { TeamLogo } from './TeamLogo';
import { CustomerProcessMapView } from './CustomerProcessMapView';
import { CustomerSopGuideModal } from './CustomerSopGuideModal';
import { MicrosoftShareModal } from './MicrosoftShareModal';

interface CustomerPortalViewProps {
  units: ServiceUnit[];
  onOpenCertificateModal?: (unit: ServiceUnit) => void;
  onOpenDeliveryModal?: (unit: ServiceUnit) => void;
  onPromptTechnicianLogin?: () => void;
  onBackToDepot?: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  units,
  onOpenCertificateModal,
  onOpenDeliveryModal,
  onPromptTechnicianLogin,
  onBackToDepot,
}) => {
  const { 
    profile, 
    customerEmail, 
    isCustomer, 
    signInAsCustomer, 
    signOut 
  } = useAuth();

  // Local state for email & passcode input when signing in
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(DEFAULT_CUSTOMER_PASSCODE);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<ServiceUnit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'dispatched'>('all');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<string | null>(null);
  const [activeTabStage, setActiveTabStage] = useState<'overview' | 'flow' | 'pressure' | 'cleanliness' | 'intake'>('overview');
  const [isSopGuideOpen, setIsSopGuideOpen] = useState(false);
  const [isMicrosoftModalOpen, setIsMicrosoftModalOpen] = useState(false);

  // Currently authenticated email
  const activeEmail = profile?.customerEmail || profile?.email || null;

  // Filter units allocated strictly to this customer email
  const allocatedUnits = useMemo(() => {
    if (!activeEmail) return [];
    return getAllocatedUnitsForCustomer(units, activeEmail);
  }, [units, activeEmail]);

  // Customer metadata
  const customerMeta = useMemo(() => {
    return getCustomerInfoByEmail(activeEmail);
  }, [activeEmail]);

  // Filtered allocated units based on search and status
  const displayedUnits = useMemo(() => {
    return allocatedUnits.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSerial = u.serialNumber.toLowerCase().includes(q);
        const matchesWo = u.workOrderNumber.toLowerCase().includes(q);
        const matchesPart = u.partNumber.toLowerCase().includes(q);
        const matchesModel = u.modelName.toLowerCase().includes(q);
        const matchesChassis = (u.chassisNumber || '').toLowerCase().includes(q);
        const matchesAsset = (u.customerUnitDesignation || '').toLowerCase().includes(q);
        if (!matchesSerial && !matchesWo && !matchesPart && !matchesModel && !matchesChassis && !matchesAsset) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'in_progress' && u.overallStatus !== 'in_progress') return false;
      if (statusFilter === 'completed' && u.overallStatus !== 'completed') return false;
      if (statusFilter === 'dispatched' && !(u.delivery?.dispatchStatus === 'dispatched' || u.delivery?.dispatchStatus === 'delivered')) return false;

      return true;
    });
  }, [allocatedUnits, searchQuery, statusFilter]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!emailInput.trim()) {
      setLoginError('Please enter your corporate email address.');
      return;
    }
    const result = signInAsCustomer(emailInput.trim(), passwordInput.trim());
    if (!result.success) {
      setLoginError(result.error || 'Authentication failed. Please verify credentials.');
    }
  };


  const handleDownloadMasterReport = (unit: ServiceUnit) => {
    if (onOpenCertificateModal) {
      onOpenCertificateModal(unit);
    }
  };

  const handleDownloadCleanRigReport = (unit: ServiceUnit) => {
    setIsDownloadingPdf(`clean-${unit.id}`);
    try {
      const pdf = generateSampleRigTestPdf(unit);
      const link = document.createElement('a');
      link.href = pdf.dataUrl;
      link.download = pdf.fileName;
      link.click();
    } catch (e) {
      console.error('Clean rig report generation failed:', e);
    } finally {
      setIsDownloadingPdf(null);
    }
  };

  // If NOT authenticated as a customer, render the Customer Login Page
  if (!activeEmail || !isCustomer) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-fadeIn">
        {/* Banner */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Motorsport &amp; Aerospace Customer Portal</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              Access Your Allocated Overhaul Fleet
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Enter your authorized constructor contact email and corporate passcode to access overhaul telemetry, flow bench calibration, particle cleanliness analysis, and dispatch tracking allocated strictly to your organization.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="mt-8 max-w-xl space-y-3.5">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-300 block font-mono font-bold uppercase tracking-wider">
                Corporate Email Address:
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. marco.rossi@scuderiaferrari.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 shadow-inner font-mono"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter access passcode"
                  className="w-full pl-10 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 shadow-inner font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>Authenticate &amp; Access Fleet</span>
              <ChevronRight className="h-4 w-4 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2 text-[11px] text-neutral-500 pt-1">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span>Strict Data Isolation: You will only see units allocated to your organization.</span>
            </div>
          </form>


          {/* Workshop Staff Notice */}
          <div className="mt-8 pt-4 border-t border-neutral-800/60 flex items-center justify-between flex-wrap gap-3 text-xs text-neutral-500">
            <span>Are you a workshop technician or lead engineer?</span>
            <button
              type="button"
              onClick={onPromptTechnicianLogin}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Prompt Service Technician Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED CUSTOMER VIEW
  const completedCount = allocatedUnits.filter((u) => u.overallStatus === 'completed').length;
  const inProgressCount = allocatedUnits.filter((u) => u.overallStatus === 'in_progress').length;
  const dispatchedCount = allocatedUnits.filter((u) => u.delivery?.dispatchStatus === 'dispatched' || u.delivery?.dispatchStatus === 'delivered').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Customer Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamLogo teamName={customerMeta.customerName} size="lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-neutral-100">
                  {customerMeta.customerName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {customerMeta.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Strictly Allocated Fleet
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Authorized Contact: <strong className="text-neutral-300">{activeEmail}</strong></span>
                {customerMeta.phone && (
                  <>
                    <span>·</span>
                    <span>{customerMeta.phone}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsMicrosoftModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs text-sky-300 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Export to Microsoft Excel, Teams Card & Outlook Email"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-sky-400" />
              <span>Microsoft 365 Suite</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSopGuideOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="View 11-Stage Simplified SOP Reference Guide"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Stage SOP Guide</span>
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign out of customer portal"
            >
              <LogOut className="h-3.5 w-3.5 text-neutral-400" />
              <span>Switch Email</span>
            </button>

            {onBackToDepot && (
              <button
                type="button"
                onClick={onBackToDepot}
                className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs text-amber-400 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Return to Workshop Technician View"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Technician Depot Mode</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Isolation Disclaimer */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>
              Secure Isolated View: Displaying only the <strong>{allocatedUnits.length} units</strong> registered to {customerMeta.customerName}.
            </span>
          </div>
          <span className="text-neutral-500">
            Internal workshop margins, gross quotas, and other constructors' coolers are strictly withheld.
          </span>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-neutral-400 font-medium">Allocated Fleet</div>
          <div className="text-2xl font-bold font-mono text-neutral-100">{allocatedUnits.length}</div>
          <div className="text-[10px] text-neutral-500">Active Work Orders</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-neutral-400 font-medium">In-Progress Overhaul</div>
          <div className="text-2xl font-bold font-mono text-amber-400">{inProgressCount}</div>
          <div className="text-[10px] text-neutral-500">Active Stages in Progress</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-neutral-400 font-medium">Certified &amp; Conforming</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{completedCount}</div>
          <div className="text-[10px] text-neutral-500">ISO QA Sign-off Complete</div>
        </div>

        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-1">
          <div className="text-xs text-neutral-400 font-medium">Dispatched / In Transit</div>
          <div className="text-2xl font-bold font-mono text-sky-400">{dispatchedCount}</div>
          <div className="text-[10px] text-neutral-500">Courier Tracking Available</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search serial, work order, model, or chassis..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-amber-500 text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800'
            }`}
          >
            All ({allocatedUnits.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === 'in_progress'
                ? 'bg-amber-500 text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800'
            }`}
          >
            In-Progress ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-amber-500 text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800'
            }`}
          >
            Certified ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('dispatched')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
              statusFilter === 'dispatched'
                ? 'bg-amber-500 text-neutral-950'
                : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800'
            }`}
          >
            Dispatched ({dispatchedCount})
          </button>
        </div>
      </div>

      {/* Units List */}
      {displayedUnits.length === 0 ? (
        <div className="py-16 text-center bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-3">
          <Layers className="h-10 w-10 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-neutral-200">No Allocated Units Found</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {allocatedUnits.length === 0
              ? `There are currently no active units registered under email address ${activeEmail}. Contact Particle Science depot management to link your work orders.`
              : 'No units match your current search query or filter selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedUnits.map((u) => {
            const isCompleted = u.overallStatus === 'completed';
            const isQuarantined = u.overallStatus === 'quarantined';
            const progressSteps: StepId[] = [
              'intake', 'degreasing', 'descaling', 'first_flush', 
              'flow_test', 'pressure_test', 'cleaning', 'final_flush', 
              'oven', 'gilling', 'sign_off'
            ];
            const currentIdx = progressSteps.indexOf(u.currentStepId);
            const progressPercent = isCompleted ? 100 : Math.round(((currentIdx + 1) / progressSteps.length) * 100);

            return (
              <div
                key={u.id}
                className={`bg-neutral-900 border rounded-2xl p-5 space-y-4 shadow-lg transition-all ${
                  isQuarantined 
                    ? 'border-rose-500/50 bg-gradient-to-b from-rose-950/20 via-neutral-900 to-neutral-900' 
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-100 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                        {u.serialNumber}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {u.workOrderNumber}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-100 leading-snug">
                      {u.modelName}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Part #: <span className="font-mono text-neutral-300">{u.partNumber}</span>
                      {u.chassisNumber && <span> · Chassis: {u.chassisNumber}</span>}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : isQuarantined
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isCompleted ? (
                      <span>Certified Conforming</span>
                    ) : isQuarantined ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-rose-400" />
                        <span>Quarantine / Non-Conforming</span>
                      </>
                    ) : (
                      <span>Stage {currentIdx + 1} of 11</span>
                    )}
                  </span>
                </div>

                {/* Quarantine Exception Banner if unit failed */}
                {isQuarantined && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-400 uppercase tracking-wider text-[10px] font-mono">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span>QA Conformance Exception - Immediate Quarantine</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-200">
                      {u.signOff?.finalComments || u.pressureTest?.notes || u.cleaning?.analysisResult?.analysisNotes || 'Unit failed QA inspection threshold and has been placed in depot quarantine for rework.'}
                    </p>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Current Stage: <strong className="text-neutral-200 capitalize">{u.currentStepId.replace(/_/g, ' ')}</strong></span>
                    <span className="font-mono text-[11px] font-bold text-amber-400">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Real-Time Unit Position in Process Map (No Process Specifications) */}
                <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${isCompleted ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                      <span>Unit Position:</span>
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isCompleted ? 'Stage 11: Final Release Approved ✓' : `Stage 0${currentIdx + 1}: ${u.currentStepId.replace(/_/g, ' ').toUpperCase()}`}
                    </span>
                  </div>

                  {/* 11-Stage Visual Process Map Progress Dots */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {progressSteps.map((step, sIdx) => {
                      const stepDone = isCompleted || sIdx < currentIdx;
                      const stepActive = !isCompleted && sIdx === currentIdx;
                      return (
                        <div key={step} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className={`h-2 w-full rounded-full transition-all ${
                            stepDone 
                              ? 'bg-emerald-500' 
                              : stepActive 
                              ? 'bg-amber-400 animate-pulse ring-2 ring-amber-400/40' 
                              : 'bg-neutral-800'
                          }`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-0.5">
                    <span>01: Intake</span>
                    <span className="text-neutral-400 font-bold">{isCompleted ? 'Release Complete' : 'Active Overhaul Queue'}</span>
                    <span>11: QA Release</span>
                  </div>
                </div>

                {/* SLA / Delivery Info */}
                <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Target Delivery: <strong className="text-neutral-300">{u.expectedDeliveryDate || 'Standard Workshop SLA'}</strong></span>
                  </div>
                  {(u.delivery?.dispatchStatus === 'dispatched' || u.delivery?.dispatchStatus === 'delivered') && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      <span>{u.delivery.dispatchStatus === 'delivered' ? 'Delivered' : 'Dispatched'}</span>
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedUnitForDetail(u)}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Layers className="h-3.5 w-3.5 text-amber-400" />
                    <span>Track Process Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadMasterReport(u)}
                    disabled={isDownloadingPdf === `cert-${u.id}`}
                    className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="View & Export Conformance Certificate PDF"
                  >
                    <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Certificate PDF</span>
                  </button>

                  {u.delivery && onOpenDeliveryModal && (
                    <button
                      type="button"
                      onClick={() => onOpenDeliveryModal(u)}
                      className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-sky-300 transition-colors cursor-pointer"
                      title="View Shipping & Courier Tracking"
                    >
                      <Truck className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Unit Process Map & Certificate Modal */}
      {selectedUnitForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn">
          <div className="relative max-w-5xl w-full max-h-[92vh] overflow-y-auto">
            <CustomerProcessMapView
              unit={selectedUnitForDetail}
              units={allocatedUnits}
              onSelectUnit={(id) => {
                const found = allocatedUnits.find((u) => u.id === id);
                if (found) setSelectedUnitForDetail(found);
              }}
              onOpenCertificate={handleDownloadMasterReport}
              onBackToDashboard={() => setSelectedUnitForDetail(null)}
            />
          </div>
        </div>
      )}

      {/* Standalone Customer SOP Guide Modal */}
      <CustomerSopGuideModal
        isOpen={isSopGuideOpen}
        onClose={() => setIsSopGuideOpen(false)}
      />

      {/* Microsoft 365 Ecosystem Export & Share Modal */}
      <MicrosoftShareModal
        isOpen={isMicrosoftModalOpen}
        onClose={() => setIsMicrosoftModalOpen(false)}
        units={allocatedUnits}
        activeUnit={selectedUnitForDetail}
        contextName={customerMeta.customerName}
      />
    </div>
  );
};
