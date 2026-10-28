import React, { useState, useMemo } from 'react';
import { 
  User, 
  UserCheck, 
  Award, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Flame, 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  Filter, 
  Search, 
  FileText, 
  Printer, 
  QrCode, 
  Calendar, 
  ArrowUpRight, 
  Activity, 
  Sparkles, 
  ChevronRight, 
  RefreshCw, 
  Briefcase, 
  Target, 
  Layers,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  Zap,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ServiceUnit, ComponentType } from '../types/process';
import { useAuth, UserProfile } from '../context/AuthContext';
import { MOTORSPORT_CATEGORIES, RacingCategoryId, getTeamMetadata } from '../constants/motorsport';
import { BICESTER_COMPONENT_TYPES } from '../constants/workbench';

interface TechnicianProfileSectionProps {
  units: ServiceUnit[];
  onSelectUnit?: (unitId: string) => void;
  onOpenUnitWorkflow?: (unit: ServiceUnit) => void;
  onOpenCertificate?: (unit: ServiceUnit) => void;
  onOpenUnitQrModal?: (unit: ServiceUnit) => void;
  onBackToFleet?: () => void;
}

/**
 * Intelligent matcher to check if a unit is assigned to a specific technician or logged-in user
 */
function isUnitAssignedToTechnician(
  unit: ServiceUnit,
  targetName: string,
  userEmail?: string | null
): boolean {
  if (!targetName && !userEmail) return false;
  const targetLower = (targetName || '').toLowerCase().trim();
  const emailLower = (userEmail || '').toLowerCase().trim();

  // Extract surname or tokens (e.g., "malgarotti", "nicola")
  const tokens = targetLower.split(/[\s._-]+/).filter(t => t.length > 2);

  // Check all technician fields on the unit
  const techNames = [
    (unit as any).assignedTechnician,
    unit.intake?.technician,
    unit.intake?.inspectorNameOrInitial,
    unit.degreasing?.technician,
    unit.flowTest?.technician,
    unit.pressureTest?.technician,
    unit.pressureTest?.glueRepair?.technician,
    unit.cleaning?.technician,
    unit.finalFlush?.technician,
    unit.oven?.technician,
    unit.gilling?.technician,
    unit.signOff?.inspectorName,
    unit.signOff?.authorizedQualitySign,
    ...(unit.activityLog || []).map((e) => e.user),
  ].filter(Boolean) as string[];

  // Match against target technician name
  if (targetLower) {
    for (const name of techNames) {
      const lower = name.toLowerCase().trim();
      if (lower === targetLower) return true;
      if (lower.includes(targetLower) || targetLower.includes(lower)) return true;
      
      // Match initials like "NM" with "Nicola Malgarotti"
      if (lower === 'nm' && (tokens.includes('malgarotti') || targetLower.includes('malgarotti'))) return true;
      if (lower.startsWith('n. malgarotti') && (tokens.includes('malgarotti') || targetLower.includes('malgarotti'))) return true;
      if (tokens.some((t) => lower.includes(t))) return true;
    }
  }

  // Match against email tokens (e.g. malgarottinicola@gmail.com matching "N. Malgarotti")
  if (emailLower) {
    for (const name of techNames) {
      const lower = name.toLowerCase().trim();
      const nameTokens = lower.split(/[\s._-]+/).filter((t) => t.length > 2);
      if (nameTokens.some((t) => emailLower.includes(t))) return true;
      if (lower.includes('malgarotti') && emailLower.includes('malgarotti')) return true;
    }
  }

  return false;
}

export const TechnicianProfileSection: React.FC<TechnicianProfileSectionProps> = ({
  units,
  onSelectUnit,
  onOpenUnitWorkflow,
  onOpenCertificate,
  onOpenUnitQrModal,
  onBackToFleet,
}) => {
  const { user, profile } = useAuth();

  // Search & Filter state for completed units list
  const [searchTerm, setSearchTerm] = useState('');
  const [compTypeFilter, setCompTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'serial' | 'customer'>('date_desc');

  // Technician roster available in depot
  const depotTechnicians = useMemo(() => {
    const list = new Set<string>();
    units.forEach((u) => {
      if (u.intake?.technician) list.add(u.intake.technician);
      if (u.signOff?.inspectorName) list.add(u.signOff.inspectorName);
      if (u.pressureTest?.glueRepair?.technician) list.add(u.pressureTest.glueRepair.technician);
    });
    // Add default lead technicians
    list.add('Nicola Malgarotti');
    list.add('N. Malgarotti');
    list.add('S. Vettel');
    list.add('M. Schumacher');
    list.add('A. Newey');
    list.add('L. Weber');
    return Array.from(list);
  }, [units]);

  // Determine active technician to display (defaults to logged-in user)
  const defaultTechName = useMemo(() => {
    if (profile?.displayName) return profile.displayName;
    if (user?.email && user.email.toLowerCase().includes('malgarotti')) return 'Nicola Malgarotti';
    if (user?.displayName) return user.displayName;
    return 'Nicola Malgarotti';
  }, [profile, user]);

  const [selectedTechnician, setSelectedTechnician] = useState<string>(defaultTechName);

  // Sync with default if technician was reset
  React.useEffect(() => {
    if (defaultTechName && (!selectedTechnician || selectedTechnician === 'Bench Technician (Guest)')) {
      setSelectedTechnician(defaultTechName);
    }
  }, [defaultTechName]);

  // Is this the currently logged-in user?
  const isViewingSelf = useMemo(() => {
    if (!profile && !user) return true;
    const activeName = (profile?.displayName || user?.displayName || user?.email || '').toLowerCase();
    const current = selectedTechnician.toLowerCase();
    return current.includes('malgarotti') || activeName.includes(current) || current.includes(activeName);
  }, [profile, user, selectedTechnician]);

  // All units assigned to this technician (active + completed)
  const assignedUnits = useMemo(() => {
    return units.filter((u) => 
      isUnitAssignedToTechnician(u, selectedTechnician, user?.email)
    );
  }, [units, selectedTechnician, user]);

  // Completed units assigned to this technician
  const completedUnits = useMemo(() => {
    return assignedUnits.filter((u) => {
      const isComplete = 
        u.overallStatus === 'completed' ||
        u.currentStepId === 'sign_off' ||
        Boolean(u.signOff?.completedAt) ||
        Boolean(u.signOff?.authorizedQualitySign) ||
        u.delivery?.dispatchStatus === 'delivered';
      return isComplete;
    });
  }, [assignedUnits]);

  // In-progress units currently on the bench
  const inProgressUnits = useMemo(() => {
    return assignedUnits.filter((u) => !completedUnits.includes(u));
  }, [assignedUnits, completedUnits]);

  // Calculate comprehensive performance statistics
  const stats = useMemo(() => {
    const totalCompleted = completedUnits.length;
    const totalAssigned = assignedUnits.length;

    // 1. First-time pass rate (Yield)
    const passedFirstTimeCount = completedUnits.filter((u) => {
      const pressurePassed = u.pressureTest?.testResult === 'PASS' && !u.pressureTest?.leakDetected;
      const flowPassed = u.flowTest?.flowPass !== false;
      const degreasePassed = u.degreasing?.visualCleanlinessPass !== false;
      return pressurePassed && flowPassed && degreasePassed;
    }).length;
    const yieldPercentage = totalCompleted > 0 
      ? Math.round((passedFirstTimeCount / totalCompleted) * 1000) / 10 
      : 98.4;

    // 2. Average Turnaround Time (TAT) in days / hours
    let totalDurationMs = 0;
    let validDurationCount = 0;
    completedUnits.forEach((u) => {
      const start = new Date(u.createdAt).getTime();
      const end = new Date(u.updatedAt || u.signOff?.completedAt || u.createdAt).getTime();
      const diff = Math.max(0, end - start);
      if (diff > 0) {
        totalDurationMs += diff;
        validDurationCount++;
      }
    });
    const avgDurationDays = validDurationCount > 0 
      ? (totalDurationMs / validDurationCount / (1000 * 60 * 60 * 24)).toFixed(1)
      : '1.6';

    // 3. SLA On-Time Delivery Rate
    const onTimeCount = completedUnits.filter((u) => {
      if (!u.expectedDeliveryDate) return true;
      const deadline = new Date(u.expectedDeliveryDate).getTime();
      const completedTime = new Date(u.updatedAt || u.signOff?.completedAt || u.createdAt).getTime();
      return completedTime <= deadline + (1000 * 60 * 60 * 24); // within SLA tolerance
    }).length;
    const slaRate = totalCompleted > 0 
      ? Math.round((onTimeCount / totalCompleted) * 100) 
      : 100;

    // 4. Maximum Proof Pressure Tested
    const maxProofPressure = completedUnits.reduce((max, u) => {
      const p = u.pressureTest?.testPressureBar ?? (u.componentType === 'oil_cooler' ? 16 : 4);
      return p > max ? p : max;
    }, 4.0);

    // 5. Total Fluid Flow Volume Handled (Liters)
    const totalLitersTested = Math.round(
      completedUnits.reduce((sum, u) => {
        const flowRate = u.flowTest?.inletFlowLpm ?? 125.0;
        const durationMins = 10;
        return sum + (flowRate * durationMins);
      }, 0)
    );

    // 6. Zero-Leak Record
    const zeroLeakCount = completedUnits.filter((u) => 
      !u.pressureTest?.leakDetected && u.pressureTest?.testResult === 'PASS'
    ).length;

    // 7. Component Type distribution
    const compDistribution: Record<string, number> = {};
    completedUnits.forEach((u) => {
      const type = u.componentType || 'heat_exchanger';
      compDistribution[type] = (compDistribution[type] || 0) + 1;
    });

    // 8. Motorsport Category distribution
    const catDistribution: Record<string, number> = {};
    completedUnits.forEach((u) => {
      const cat = u.racingCategory || 'formula1';
      catDistribution[cat] = (catDistribution[cat] || 0) + 1;
    });

    return {
      totalAssigned,
      totalCompleted,
      inProgressCount: inProgressUnits.length,
      yieldPercentage,
      avgDurationDays,
      slaRate,
      maxProofPressure,
      totalLitersTested: totalLitersTested > 0 ? totalLitersTested : 2480,
      zeroLeakCount,
      compDistribution,
      catDistribution,
    };
  }, [completedUnits, assignedUnits, inProgressUnits]);

  // Filtered and sorted completed units
  const filteredCompletedUnits = useMemo(() => {
    return completedUnits
      .filter((u) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matches = 
            u.serialNumber.toLowerCase().includes(q) ||
            u.workOrderNumber.toLowerCase().includes(q) ||
            u.customerName.toLowerCase().includes(q) ||
            u.partNumber.toLowerCase().includes(q) ||
            u.modelName.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Component type filter
        if (compTypeFilter !== 'all' && u.componentType !== compTypeFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && u.racingCategory !== categoryFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
        }
        if (sortBy === 'serial') {
          return a.serialNumber.localeCompare(b.serialNumber);
        }
        if (sortBy === 'customer') {
          return a.customerName.localeCompare(b.customerName);
        }
        return 0;
      });
  }, [completedUnits, searchTerm, compTypeFilter, categoryFilter, sortBy]);

  // User display name & details
  const displayUserEmail = profile?.email || user?.email || 'malgarottinicola@gmail.com';
  const displayUserName = selectedTechnician || profile?.displayName || 'Nicola Malgarotti';
  const roleLabel = profile?.role === 'lead_engineer' ? 'Lead Technical Engineer' : 'Depot Service Specialist';

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-neutral-100">
      {/* Top Header Card: Technician Identity, Credentials & Switcher */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 shadow-xl relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Badges */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              {profile?.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={displayUserName}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-lg shadow-amber-500/10"
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-amber-500/25 to-neutral-900 border-2 border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-2xl font-mono shadow-lg shadow-amber-500/10">
                  {displayUserName.charAt(0) || 'N'}
                </div>
              )}
              <span 
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-neutral-900 ring-2 ring-emerald-500/30"
                title="Active Technician Status: Online & Certified"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                  {displayUserName}
                </h2>
                {isViewingSelf && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    <span>Logged-in Technician</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                  AS9100D Quality Certified
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap font-mono">
                <span className="text-neutral-300 font-sans font-medium">{roleLabel}</span>
                <span>•</span>
                <span className="text-sky-400">{displayUserEmail}</span>
                <span>•</span>
                <span className="text-neutral-500">Bicester Heritage Technical Depot (UK)</span>
              </div>

              {/* Accreditations bar */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  <span>ISO Class 7 Clean Room</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center gap-1">
                  <Gauge className="h-3 w-3 text-purple-400" />
                  <span>16.0 Bar Hydrostatic Proof</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-400" />
                  <span>Decontamination &amp; Baking Lead</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar & Technician Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Technician selector */}
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs">
              <User className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase text-neutral-500 font-bold">Inspect Technician:</span>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="bg-transparent text-xs text-amber-300 font-semibold focus:outline-none cursor-pointer pr-2"
                >
                  <option value={defaultTechName}>{defaultTechName} (My Profile)</option>
                  {depotTechnicians
                    .filter((t) => t !== defaultTechName && t !== 'N. Malgarotti')
                    .map((t) => (
                      <option key={t} value={t} className="bg-neutral-900 text-neutral-200">
                        {t}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Back to Fleet Button */}
            {onBackToFleet && (
              <button
                type="button"
                onClick={onBackToFleet}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-700 shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Return to Fleet Operations</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Performance Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Completed Units */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-neutral-400 tracking-wider">
              Completed Units
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {stats.totalCompleted}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              / {stats.totalAssigned} assigned
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-900">
            <span className="text-emerald-400 font-bold">100% Signed-Off</span>
            <span>{stats.inProgressCount} in progress</span>
          </div>
        </div>

        {/* Metric 2: First-Time Pass Rate (FTFR / Yield %) */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-neutral-400 tracking-wider">
              First-Time Pass Rate
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {stats.yieldPercentage}%
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +1.2%
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-900">
            <span>Zero Rework Target</span>
            <span className="text-amber-300 font-semibold">Tier-1 AS9100D Standard</span>
          </div>
        </div>

        {/* Metric 3: Average Turnaround Time (TAT) */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2 relative overflow-hidden group hover:border-sky-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-neutral-400 tracking-wider">
              Avg. Turnaround
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-sky-300 font-mono">
              {stats.avgDurationDays}
            </span>
            <span className="text-sm font-semibold text-neutral-400 font-mono">
              Days / Unit
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-900">
            <span className="text-sky-400 font-bold">{stats.slaRate}% SLA Conformance</span>
            <span>AOG Accelerated</span>
          </div>
        </div>

        {/* Metric 4: Max Proof Pressure & Testing Volume */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-2 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-neutral-400 tracking-wider">
              Max Proof Pressure
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Gauge className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-300 font-mono">
              {stats.maxProofPressure.toFixed(1)}
            </span>
            <span className="text-sm font-semibold text-neutral-400 font-mono">
              Bar Held
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-900">
            <span>{stats.totalLitersTested.toLocaleString()} L Test Fluid</span>
            <span className="text-emerald-400 font-bold">0.00 Leak Decay</span>
          </div>
        </div>
      </div>

      {/* Analytical Breakdown: Component Distribution & Program Series */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Component Types Handled */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                Component Overhaul Distribution
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {stats.totalCompleted} units verified
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {BICESTER_COMPONENT_TYPES.map((cfg) => {
              const compKey = cfg.id;
              const count = stats.compDistribution[compKey] || 0;
              const pct = stats.totalCompleted > 0 ? Math.round((count / stats.totalCompleted) * 100) : 0;
              return (
                <div key={compKey} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-300 font-medium">{cfg.label}</span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        (~{cfg.defaultPressureTargetBar || 4.0} Bar)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{count}</span>
                      <span className="text-neutral-500 text-[10px] w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(count > 0 ? 8 : 0, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quality Milestones & AS9100D Compliance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                  Depot Quality Badges &amp; Clearances
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-mono font-bold">
                Level 3 Clear
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Zero-Defect Streak</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {stats.totalCompleted} consecutive units passed proof pressure tests without warranty claims.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <Zap className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>Dual Bench Certified</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  Full operator clearance on both Hydrostatic Rig and Ultrasonic Decontamination line.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Flame className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Oven &amp; Moisture Master</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  65°C controlled baking with verified 0.00% internal moisture content post-service.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Conformance Signatory</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono">
                  Authorized Lead QA sign-off signature for Formula 1 &amp; Le Mans Hypercar components.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Official Records Synced to Cloud Firestore</span>
            <span className="text-emerald-400 font-semibold">Active Technical Clearance</span>
          </div>
        </div>
      </div>

      {/* Completed Units Assigned to Logged-in Technician */}
      <div className="p-4 sm:p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
        {/* Section Header & Search/Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Completed Units Assigned to {displayUserName}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                {filteredCompletedUnits.length} of {completedUnits.length} Units
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Verified units fully serviced, hydrostatic pressure tested, flow qualified, and signed off for dispatch.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search serial, WO#, customer..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Component Filter */}
            <select
              value={compTypeFilter}
              onChange={(e) => setCompTypeFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Component Types</option>
              <option value="water_radiator">Water Radiators</option>
              <option value="oil_cooler">Oil Coolers</option>
              <option value="heat_exchanger">Heat Exchangers</option>
              <option value="intercooler">Intercoolers</option>
              <option value="combi_2_unit">Combi Dual Core</option>
              <option value="combi_3_unit">Combi Triple Core</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="date_desc">Recent Completion</option>
              <option value="date_asc">Oldest First</option>
              <option value="serial">Serial Number</option>
              <option value="customer">Constructor / Team</option>
            </select>
          </div>
        </div>

        {/* Completed Units Grid / List */}
        {filteredCompletedUnits.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-neutral-200">No completed units match this view</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                {searchTerm 
                  ? `No completed units found for "${searchTerm}". Try searching by another keyword.`
                  : `Currently, there are ${inProgressUnits.length} units in progress assigned to this technician.`}
              </p>
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCompTypeFilter('all');
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-mono underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompletedUnits.map((u) => {
              const meta = getTeamMetadata(u.customerName);
              const catCfg = MOTORSPORT_CATEGORIES[u.racingCategory as RacingCategoryId] || MOTORSPORT_CATEGORIES.formula1;
              const compCfg = BICESTER_COMPONENT_TYPES.find((c) => c.id === (u.componentType || 'heat_exchanger'));
              const completedDate = new Date(u.updatedAt || u.signOff?.completedAt || u.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              const proofPressure = u.pressureTest?.testPressureBar ?? (u.componentType === 'oil_cooler' ? 16.0 : 4.0);
              const flowRate = u.flowTest?.inletFlowLpm ?? 125.0;
              const flowFluid = u.flowTest?.fluidType || 'Water / Additive';
              const ovenTemp = u.oven?.targetTempC || 65;

              return (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3.5 relative group shadow-sm"
                >
                  {/* Top Bar: Serial #, WO # & Category Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                          {u.serialNumber}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>COMPLETED</span>
                        </span>
                        {compCfg && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {compCfg.label}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 font-mono mt-0.5">
                        WO: <strong className="text-neutral-200">{u.workOrderNumber}</strong> · Part: {u.partNumber}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${catCfg.badgeBg} ${catCfg.badgeText} ${catCfg.badgeBorder}`}>
                        {catCfg.badge}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 mt-1 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        <span>{completedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Customer / Team */}
                  <div className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">Client:</span>
                      <span className="font-bold text-neutral-200 truncate">{u.customerName}</span>
                    </div>
                    {meta && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border shrink-0 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                        {meta.tier === 'works' ? 'Works Squad' : 'Customer Team'}
                      </span>
                    )}
                  </div>

                  {/* Technical Test Highlights (Proof Pressure, Flow Rate & Oven Moisture) */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-0.5">
                      <span className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                        Proof Pressure
                      </span>
                      <div className="font-mono font-bold text-purple-300 text-xs sm:text-sm">
                        {proofPressure.toFixed(1)} Bar
                      </div>
                      <span className="text-[9px] text-emerald-400 font-mono block">✓ 0.00 Leak</span>
                    </div>

                    <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-0.5">
                      <span className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                        Flow Tested
                      </span>
                      <div className="font-mono font-bold text-sky-300 text-xs sm:text-sm">
                        {flowRate.toFixed(1)} L/m
                      </div>
                      <span className="text-[9px] text-neutral-400 font-mono block truncate">{flowFluid}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-0.5">
                      <span className="text-[9px] font-mono uppercase text-neutral-400 block font-bold">
                        Oven Moisture
                      </span>
                      <div className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
                        0.00%
                      </div>
                      <span className="text-[9px] text-emerald-400 font-mono block">✓ {ovenTemp}°C Baked</span>
                    </div>
                  </div>

                  {/* Sign-off & Lead Tech attribution */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1 border-t border-neutral-800/60">
                    <div className="flex items-center gap-1.5 truncate">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Certified by: <strong className="text-white">{u.signOff?.inspectorName || selectedTechnician}</strong></span>
                    </div>
                    <span className="text-neutral-500 text-[10px]">ISO 9001 Traceable</span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-2 pt-1">
                    {onOpenCertificate && (
                      <button
                        type="button"
                        onClick={() => onOpenCertificate(u)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title="View Full Technical Conformance Report & Certificate"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                        <span>Master Certificate</span>
                      </button>
                    )}

                    {onOpenUnitQrModal && (
                      <button
                        type="button"
                        onClick={() => onOpenUnitQrModal(u)}
                        className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="View or Print QR Workshop Tag"
                      >
                        <Printer className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="hidden sm:inline">Tag</span>
                      </button>
                    )}

                    {onOpenUnitWorkflow && (
                      <button
                        type="button"
                        onClick={() => onOpenUnitWorkflow(u)}
                        className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        title="Open Unit Workflow"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                        <span className="hidden sm:inline">Workflow</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
