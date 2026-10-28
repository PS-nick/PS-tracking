import React, { useState, useMemo } from 'react';
import { ServiceUnit, StepId } from '../types/process';
import { CompanyLogo } from './CompanyLogo';
import { 
  Plus, 
  FileText, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Sliders, 
  Layers, 
  TrendingUp, 
  Award, 
  Droplets, 
  Gauge, 
  Sparkles, 
  Microscope, 
  Beaker,
  ArrowRight, 
  Filter, 
  CheckSquare, 
  QrCode, 
  Building2, 
  Truck, 
  AlertOctagon, 
  PackageCheck, 
  Flame, 
  LayoutGrid, 
  List, 
  Trophy, 
  Flag, 
  BarChart3,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  ArrowUpDown,
  User,
  Calendar,
  SearchX,
  Timer,
  Columns2,
  Archive,
  ArchiveRestore,
  Trash2,
  Database,
  UserCheck,
  Lock,
  Download,
  FileSpreadsheet,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadFleetCsv } from '../utils/exportCsv';
import { TeamLogo } from './TeamLogo';
import { FlowSplitComparisonView } from './FlowSplitComparisonView';
import { DeliveryTrackingModal } from './DeliveryTrackingModal';
import { TechnicianProfileSection } from './TechnicianProfileSection';
import { DashboardTimersConsole } from './DashboardTimersConsole';
import { UnitHistoricalSummary } from './UnitHistoricalSummary';
import { getUnitDeliveryStatus, calculateFleetOnTimeRate } from '../utils/delivery';
import { getPriorityConfig, PRIORITY_CONFIGS } from '../utils/priority';
import { UnitPriority } from '../types/process';
import { 
  MOTORSPORT_CATEGORIES, 
  ALL_RACING_CATEGORIES, 
  RacingCategoryId,
  getTeamMetadata,
  TEAM_TIERS,
  CAR_ALLOCATION_OPTIONS,
  getCarAllocationFromChassis,
  TeamTier,
  isCustomerDeleted
} from '../constants/motorsport';

interface DashboardProps {
  units: ServiceUnit[];
  activeUnit?: ServiceUnit | null;
  onSelectUnit: (id: string) => void;
  onOpenUnitWorkflow: (unitId: string, stepId?: StepId) => void;
  onOpenNewUnitModal: () => void;
  onOpenCertificate: (unit: ServiceUnit) => void;
  onOpenQrScanner: () => void;
  onOpenUnitQrModal: (unit: ServiceUnit) => void;
  onUpdateUnit?: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string, targetUnitId?: string) => void;
  onOpenAnalytics?: () => void;
  onOpenQuota?: () => void;
  onDeleteUnit?: (unit: ServiceUnit) => void;
  onRefreshFleet?: () => void;
  initialViewMode?: 'cards' | 'table' | 'compare' | 'technician_profile';
}

export type DashboardSortOption = 
  | 'date_desc' 
  | 'date_asc' 
  | 'technician_asc' 
  | 'technician_desc' 
  | 'status' 
  | 'stage' 
  | 'priority' 
  | 'serial' 
  | 'customer';

export const Dashboard: React.FC<DashboardProps> = ({
  units,
  activeUnit,
  onSelectUnit,
  onOpenUnitWorkflow,
  onOpenNewUnitModal,
  onOpenCertificate,
  onOpenQrScanner,
  onOpenUnitQrModal,
  onUpdateUnit,
  onOpenAnalytics,
  onOpenQuota,
  onDeleteUnit,
  onRefreshFleet,
  initialViewMode,
}) => {
  const { isAssignedPerson, isCustomer, profile } = useAuth();
  const [csvDownloadToast, setCsvDownloadToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<DashboardSortOption>('date_desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'on_time' | 'overdue' | 'due_today' | 'on_track' | 'delivered'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | UnitPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [teamTierFilter, setTeamTierFilter] = useState<'all' | TeamTier>('all');
  const [carAllocationFilter, setCarAllocationFilter] = useState<'all' | 'car_1' | 'car_2' | 'spare_rig'>('all');
  const [racingTypeFilter, setRacingTypeFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'compare' | 'technician_profile'>(initialViewMode || 'cards');
  const [compareUnitAId, setCompareUnitAId] = useState<string>('');
  const [compareUnitBId, setCompareUnitBId] = useState<string>('');
  const [trackingModalUnit, setTrackingModalUnit] = useState<ServiceUnit | null>(null);

  React.useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Compute Depot Telemetry & Archival Counts
  const totalUnits = units.length;
  const initialRuns = units.filter((u) => u.intake?.isFirstService).length;
  const repeatOverhauls = totalUnits - initialRuns;
  const archivedUnitsCount = useMemo(() => units.filter((u) => u.isArchived || u.delivery?.dispatchStatus === 'delivered').length, [units]);
  const activeUnitsCount = useMemo(() => units.filter((u) => !u.isArchived && u.delivery?.dispatchStatus !== 'delivered').length, [units]);

  const handleToggleUnitArchive = (unitToToggle: ServiceUnit, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateUnit) return;
    const willArchive = !unitToToggle.isArchived;
    onUpdateUnit((prev) => {
      if (prev.id !== unitToToggle.id) return prev;
      return {
        ...prev,
        isArchived: willArchive,
        archivedAt: willArchive ? (prev.archivedAt || new Date().toISOString()) : undefined,
      };
    }, willArchive ? `Archived unit ${unitToToggle.serialNumber} to past historical records` : `Restored unit ${unitToToggle.serialNumber} to active depot`);
  };

  // Available teams for the active category (or all depot teams)
  const availableCategoryTeams = useMemo(() => {
    const teamsInUnits = Array.from(new Set(units.map((u) => u.customerName).filter(Boolean)));
    if (isCustomer) {
      return teamsInUnits;
    }
    if (categoryFilter === 'all') {
      return teamsInUnits;
    }
    const catCfg = MOTORSPORT_CATEGORIES[categoryFilter as RacingCategoryId];
    return catCfg ? catCfg.teams.filter((t) => teamsInUnits.includes(t)) : teamsInUnits;
  }, [categoryFilter, units, isCustomer]);

  // Available racing types for program sub-filter
  const availableRacingTypes = useMemo(() => {
    if (categoryFilter === 'all') {
      return Array.from(new Set(units.map((u) => u.racingType).filter(Boolean))) as string[];
    }
    const catCfg = MOTORSPORT_CATEGORIES[categoryFilter as RacingCategoryId];
    return catCfg ? catCfg.racingTypes : [];
  }, [categoryFilter, units]);

  // Sub-category counts across fleet
  const worksUnitsCount = useMemo(() => {
    return units.filter((u) => {
      const catMatch = categoryFilter === 'all' || u.racingCategory === categoryFilter;
      const tier = u.teamTier || getTeamMetadata(u.customerName).tier;
      return catMatch && tier === 'works';
    }).length;
  }, [units, categoryFilter]);

  const customerUnitsCount = useMemo(() => {
    return units.filter((u) => {
      const catMatch = categoryFilter === 'all' || u.racingCategory === categoryFilter;
      const tier = u.teamTier || getTeamMetadata(u.customerName).tier;
      return catMatch && tier === 'customer';
    }).length;
  }, [units, categoryFilter]);

  const car1UnitsCount = useMemo(() => {
    return units.filter((u) => {
      const catMatch = categoryFilter === 'all' || u.racingCategory === categoryFilter;
      const alloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
      return catMatch && alloc === 'car_1';
    }).length;
  }, [units, categoryFilter]);

  const car2UnitsCount = useMemo(() => {
    return units.filter((u) => {
      const catMatch = categoryFilter === 'all' || u.racingCategory === categoryFilter;
      const alloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
      return catMatch && alloc === 'car_2';
    }).length;
  }, [units, categoryFilter]);

  const spareUnitsCount = useMemo(() => {
    return units.filter((u) => {
      const catMatch = categoryFilter === 'all' || u.racingCategory === categoryFilter;
      const alloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
      return catMatch && alloc === 'spare_rig';
    }).length;
  }, [units, categoryFilter]);

  const hasActiveTeamSubFilters = 
    customerFilter !== 'all' || 
    teamTierFilter !== 'all' || 
    carAllocationFilter !== 'all' || 
    racingTypeFilter !== 'all';

  const resetTeamSubFilters = () => {
    setCustomerFilter('all');
    setTeamTierFilter('all');
    setCarAllocationFilter('all');
    setRacingTypeFilter('all');
  };

  const hasAnyActiveFilter = 
    searchTerm.trim() !== '' ||
    stageFilter !== 'all' ||
    customerFilter !== 'all' ||
    deliveryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    teamTierFilter !== 'all' ||
    carAllocationFilter !== 'all' ||
    racingTypeFilter !== 'all' ||
    sortBy !== 'date_desc';

  const resetAllFilters = () => {
    setSearchTerm('');
    setStageFilter('all');
    setCustomerFilter('all');
    setDeliveryFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setTeamTierFilter('all');
    setCarAllocationFilter('all');
    setRacingTypeFilter('all');
    setSortBy('date_desc');
  };

  const getSortLabel = (opt: DashboardSortOption): string => {
    switch (opt) {
      case 'date_desc': return 'Date (Newest First)';
      case 'date_asc': return 'Date (Oldest First)';
      case 'technician_asc': return 'Technician (A → Z)';
      case 'technician_desc': return 'Technician (Z → A)';
      case 'status': return 'Status & Disposition';
      case 'stage': return 'Active Stage (Intake → QA)';
      case 'priority': return 'Priority (Emergency First)';
      case 'serial': return 'Serial / Work Order';
      case 'customer': return 'Team / Constructor';
      default: return 'Sort';
    }
  };

  // On-Time Delivery (OTD) and logistics telemetry
  const otdMetrics = calculateFleetOnTimeRate(units);

  // Priority status telemetry
  const emergencyUnits = units.filter((u) => u.priority === 'emergency');
  const highUnits = units.filter((u) => u.priority === 'high');
  const mediumUnits = units.filter((u) => u.priority === 'medium');
  const lowUnits = units.filter((u) => u.priority === 'low');

  // Delivery & Overdue status computation
  const unitsWithDelivery = units.map((u) => ({
    unit: u,
    delivery: getUnitDeliveryStatus(u),
  }));

  const onTimeUnits = unitsWithDelivery.filter((u) => u.delivery.isOnTime);
  const overdueUnits = unitsWithDelivery.filter((u) => u.delivery.isOverdue);
  const dueTodayUnits = unitsWithDelivery.filter((u) => u.delivery.isDueSoon);
  const inTransitUnits = unitsWithDelivery.filter((u) => u.delivery.status === 'in_transit');
  const deliveredUnits = unitsWithDelivery.filter((u) => u.delivery.status === 'delivered');
  const onTrackUnits = unitsWithDelivery.filter((u) => u.delivery.status === 'on_track');

  // Unique customers present in depot units (excluding any marked as deleted)
  const availableCustomers = useMemo(() => {
    if (isCustomer) {
      return Array.from(new Set(units.map((u) => u.customerName).filter(Boolean)));
    }
    return Array.from(new Set(units.map((u) => u.customerName).filter(Boolean)))
      .filter((c) => !isCustomerDeleted(c));
  }, [units, isCustomer]);

  // CSV Export Fleet Handler
  const handleDownloadCsv = () => {
    const unitsToExport = displayUnits.length > 0 ? displayUnits : units;
    const teamSlug = isCustomer && profile?.customerName ? profile.customerName : 'fleet';
    downloadFleetCsv(unitsToExport, teamSlug);
    setCsvDownloadToast(`Exported ${unitsToExport.length} unit records to CSV`);
    setTimeout(() => {
      setCsvDownloadToast((curr) => (curr && curr.includes(String(unitsToExport.length)) ? null : curr));
    }, 3800);
  };

  // Flow Calibration Pass Rate
  const flowTestedUnits = units.filter((u) => (u.flowTest?.testPoints || []).some((p) => p.measuredFlowLpm > 0));
  const flowPassedUnits = flowTestedUnits.filter((u) => {
    const passedPts = (u.flowTest?.testPoints || []).filter((p) => p.passed && p.measuredFlowLpm > 0).length;
    return passedPts >= 3;
  });
  const flowPassRate = flowTestedUnits.length > 0
    ? Math.round((flowPassedUnits.length / flowTestedUnits.length) * 100)
    : 100;

  // Particle Science & Cleaning Stats
  const particleAnalyzedUnits = units.filter((u) => u.cleaning?.mode === 'with_analysis');
  const particlePassedUnits = particleAnalyzedUnits.filter((u) => u.cleaning?.analysisResult?.verdict === 'CONFORMING');

  // QA Disposition
  const approvedUnits = units.filter((u) => u.signOff?.qaDisposition === 'APPROVED').length;
  const inProgressUnits = totalUnits - approvedUnits;

  // Stages definition
  const stages: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'intake', label: 'Intake Sheet', icon: Layers },
    { id: 'degreasing', label: 'Degreasing', icon: Droplets },
    { id: 'descaling', label: 'Descaling', icon: Beaker },
    { id: 'first_flush', label: 'First Flush', icon: Droplets },
    { id: 'flow_test', label: 'Flow Test (5-Pt)', icon: Gauge },
    { id: 'pressure_test', label: 'Pressure Test', icon: Activity },
    { id: 'cleaning', label: 'Ultra Fine RIG', icon: Microscope },
    { id: 'final_flush', label: 'Precision Flush', icon: Droplets },
    { id: 'oven', label: 'Oven Bake', icon: Clock },
    { id: 'gilling', label: 'Fin Straightening (Manual, No Jig)', icon: Clock },
    { id: 'sign_off', label: 'QA Sign-Off', icon: Award },
  ];

  // Helper to extract stage position and active timer metrics for any unit
  const getUnitStageTimerInfo = (u: ServiceUnit) => {
    const stepId = u.currentStepId;

    if (stepId === 'oven' || u.oven?.isRunning || u.oven?.timerCompleted) {
      const isRunning = !!u.oven?.isRunning;
      const isCompleted = !!u.oven?.timerCompleted;
      const rem = u.oven?.remainingSeconds ?? 7200;
      const target = u.oven?.targetSeconds || 7200;
      const h = Math.floor(rem / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const formattedHours = (rem / 3600).toFixed(2);
      const targetHours = (target / 3600).toFixed(2);
      return {
        stageId: 'oven' as StepId,
        stageName: 'Oven Bake (2h Dry)',
        stagePosition: 7,
        isRunning,
        isCompleted,
        remainingSeconds: rem,
        targetSeconds: target,
        formattedTime,
        formattedHours,
        targetHours,
        timerLabel: isRunning ? `Oven Soak: ${formattedTime} remaining` : isCompleted ? '2.00h Bake Complete' : '2.00h Chamber Target',
        color: isRunning ? 'rose' : isCompleted ? 'emerald' : 'orange',
      };
    }

    if (stepId === 'degreasing' || u.degreasing?.oilDraining?.isRunning || u.degreasing?.preFlush?.isRunning) {
      const isDrainRunning = !!u.degreasing?.oilDraining?.isRunning;
      const isPreFlushRunning = !!u.degreasing?.preFlush?.isRunning;
      const isRunning = isDrainRunning || isPreFlushRunning;
      const isCompleted = !!u.degreasing?.completedAt;
      const isWithoutDegrease = u.degreasing?.skipped || u.degreasing?.degreasingMode === 'without_degreasing';
      const rem = isDrainRunning
        ? (u.degreasing?.oilDraining?.remainingSeconds ?? 900)
        : (u.degreasing?.preFlush?.remainingSeconds ?? 360);
      const target = isDrainRunning ? 900 : 360;
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const formattedHours = (rem / 3600).toFixed(2);
      const targetHours = (target / 3600).toFixed(2);
      return {
        stageId: 'degreasing' as StepId,
        stageName: isWithoutDegrease ? 'Without Degreasing (Direct Bypass)' : 'Room-Temp Flow Degreaser',
        stagePosition: 2,
        isRunning,
        isCompleted,
        remainingSeconds: rem,
        targetSeconds: target,
        formattedTime,
        formattedHours,
        targetHours,
        timerLabel: isRunning ? `Degrease Flow: ${formattedTime}` : isCompleted ? 'Degrease Complete' : '0.25h Target',
        color: isRunning ? 'amber' : isCompleted ? 'emerald' : 'amber',
      };
    }

    if (stepId === 'first_flush' || u.firstFlush?.isRunning || u.firstFlush?.timerCompleted) {
      const isRunning = !!u.firstFlush?.isRunning;
      const isCompleted = !!u.firstFlush?.timerCompleted;
      const rem = u.firstFlush?.remainingSeconds ?? 360;
      const target = u.firstFlush?.targetDurationSeconds || 360;
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const formattedHours = (rem / 3600).toFixed(2);
      const targetHours = (target / 3600).toFixed(2);
      return {
        stageId: 'first_flush' as StepId,
        stageName: 'First Flush (55°C Deionized Water)',
        stagePosition: 3,
        isRunning,
        isCompleted,
        remainingSeconds: rem,
        targetSeconds: target,
        formattedTime,
        formattedHours,
        targetHours,
        timerLabel: isRunning ? `55°C Flush: ${formattedTime} left` : isCompleted ? '55°C Flush Complete' : '0.10h Target',
        color: isRunning ? 'teal' : isCompleted ? 'emerald' : 'teal',
      };
    }

    if (stepId === 'final_flush' || u.finalFlush?.isRunning || u.finalFlush?.timerCompleted) {
      const isRunning = !!u.finalFlush?.isRunning;
      const isCompleted = !!u.finalFlush?.timerCompleted;
      const rem = u.finalFlush?.remainingSeconds ?? 300;
      const target = u.finalFlush?.targetSeconds || 300;
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const formattedTime = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const formattedHours = (rem / 3600).toFixed(2);
      const targetHours = (target / 3600).toFixed(2);
      return {
        stageId: 'final_flush' as StepId,
        stageName: 'Precision Micron Flush',
        stagePosition: 6,
        isRunning,
        isCompleted,
        remainingSeconds: rem,
        targetSeconds: target,
        formattedTime,
        formattedHours,
        targetHours,
        timerLabel: isRunning ? `Flush: ${formattedTime} left` : isCompleted ? 'Flush Complete' : '0.08h Target',
        color: isRunning ? 'sky' : isCompleted ? 'emerald' : 'cyan',
      };
    }

    if (stepId === 'gilling' || u.gilling?.isRunning || u.gilling?.timerCompleted) {
      const isRunning = !!u.gilling?.isRunning;
      const isCompleted = !!u.gilling?.timerCompleted;
      const elapsed = u.gilling?.elapsedSeconds ?? 0;
      const target = u.gilling?.targetSeconds || 3600;
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      const formattedHours = (elapsed / 3600).toFixed(2);
      const targetHours = (target / 3600).toFixed(2);
      return {
        stageId: 'gilling' as StepId,
        stageName: 'Manual Fin Straightening',
        stagePosition: 8,
        isRunning,
        isCompleted,
        remainingSeconds: Math.max(0, target - elapsed),
        targetSeconds: target,
        formattedTime,
        formattedHours,
        targetHours,
        timerLabel: isCompleted ? 'Fin Straightening Certified (No Jigs)' : 'Manual Hand Craft (No Jigs)',
        color: isRunning ? 'cyan' : isCompleted ? 'emerald' : 'neutral',
      };
    }

    const stageMap: Record<StepId, { name: string; pos: number; targetH: string }> = {
      intake: { name: 'Intake Sheet Assessment', pos: 1, targetH: '0.25' },
      degreasing: { name: 'Room-Temp Flow Degreaser', pos: 2, targetH: '0.25' },
      descaling: { name: 'Descaled Internal Passages Cycle', pos: 3, targetH: '0.25' },
      first_flush: { name: 'First Flush (55°C DI)', pos: 4, targetH: '0.10' },
      flow_test: { name: '5-Pt Flow Calibration', pos: 5, targetH: '0.50' },
      pressure_test: { name: 'Hydrostatic Pressure Test', pos: 6, targetH: '0.33' },
      cleaning: { name: 'Ultra Fine RIG Cleaning & Filtration (5-200μm)', pos: 7, targetH: '0.50' },
      final_flush: { name: 'Precision Final Flush', pos: 8, targetH: '0.08' },
      oven: { name: 'Oven Bakeout (2h Dry)', pos: 9, targetH: '2.00' },
      gilling: { name: 'Manual Fin Straightening (No Jigs)', pos: 10, targetH: '1.00' },
      sign_off: { name: 'QA Conformance Sign-Off', pos: 11, targetH: '0.25' },
    };

    const info = stageMap[stepId] || { name: 'Workshop Stage', pos: 1, targetH: '0.25' };
    return {
      stageId: stepId,
      stageName: info.name,
      stagePosition: info.pos,
      isRunning: false,
      isCompleted: false,
      remainingSeconds: 0,
      targetSeconds: 0,
      formattedTime: '00:00',
      formattedHours: '0.00',
      targetHours: info.targetH,
      timerLabel: `Stage Target: ${info.targetH} hrs`,
      color: 'neutral',
    };
  };

  // Units currently with actively running timers
  const activeTimerUnits = useMemo(() => {
    return units
      .map((u) => ({ unit: u, timer: getUnitStageTimerInfo(u) }))
      .filter((item) => item.timer.isRunning);
  }, [units]);

  // Filtered units
  const filteredUnits = units.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    
    // Gather all technicians for this unit across steps
    const technicians = [
      u.intake?.technician,
      u.degreasing?.technician,
      u.flowTest?.technician,
      u.pressureTest?.technician,
      u.pressureTest?.glueRepair?.technician,
      u.cleaning?.technician,
      u.cleaning?.analysisResult?.labTechnician,
      u.finalFlush?.technician,
      u.oven?.technician,
      u.gilling?.technician,
      u.signOff?.inspectorName,
      u.signOff?.authorizedQualitySign,
      u.supplierContactName,
    ].filter(Boolean).join(' ').toLowerCase();
    
    const stageObj = stages.find((s) => s.id === u.currentStepId);
    const stageLabel = (stageObj?.label || u.currentStepId || '').toLowerCase();
    const statusText = (
      u.overallStatus === 'completed'
        ? 'completed approved signed released done pass'
        : u.overallStatus === 'quarantined'
        ? 'quarantined defect fail rejected hold'
        : 'in progress in-progress active pending running'
    ).toLowerCase();

    const dateFormatted = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase();
    const entryDate = (u.intake?.dateOfEntry || '').toLowerCase();

    // Check partial numbers in work order (e.g. searching "0941" or "941")
    const wo = (u.workOrderNumber || '').toLowerCase();
    const cleanWo = wo.replace(/[^0-9]/g, '');
    const cleanTerm = term.replace(/[^0-9]/g, '');
    const woMatches = wo.includes(term) || (cleanTerm.length >= 3 && cleanWo.includes(cleanTerm));

    const matchesSearch = !term || (
      (u.serialNumber || '').toLowerCase().includes(term) ||
      (u.partNumber || '').toLowerCase().includes(term) ||
      (u.modelName || '').toLowerCase().includes(term) ||
      (u.customerName || '').toLowerCase().includes(term) ||
      woMatches ||
      technicians.includes(term) ||
      stageLabel.includes(term) ||
      statusText.includes(term) ||
      dateFormatted.includes(term) ||
      entryDate.includes(term) ||
      (u.priority || '').toLowerCase().includes(term) ||
      (u.racingCategory || '').toLowerCase().includes(term) ||
      (u.racingType || '').toLowerCase().includes(term) ||
      (u.customerUnitDesignation || u.intake?.customerUnitDesignation || '').toLowerCase().includes(term) ||
      (u.expectedDeliveryDate || u.intake?.expectedDeliveryDate || '').toLowerCase().includes(term) ||
      (u.chassisNumber || '').toLowerCase().includes(term) ||
      (u.delivery?.carrier || '').toLowerCase().includes(term) ||
      (u.delivery?.trackingNumber || '').toLowerCase().includes(term) ||
      (u.delivery?.destinationCity || '').toLowerCase().includes(term)
    );

    const matchesStage = stageFilter === 'all' || u.currentStepId === stageFilter;
    const matchesCustomer = customerFilter === 'all' || u.customerName === customerFilter;
    const matchesCategory = categoryFilter === 'all' || u.racingCategory === categoryFilter;

    // Sub-category filters for teams:
    const unitTier = u.teamTier || getTeamMetadata(u.customerName).tier;
    const matchesTeamTier = teamTierFilter === 'all' || unitTier === teamTierFilter;

    const unitAlloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
    const matchesCarAllocation = carAllocationFilter === 'all' || unitAlloc === carAllocationFilter;

    const matchesRacingType = racingTypeFilter === 'all' || u.racingType === racingTypeFilter;

    const deliveryStatus = getUnitDeliveryStatus(u);
    const isUnitArchived = !!u.isArchived || deliveryStatus.status === 'delivered';

    let matchesArchive = true;
    if (archiveFilter === 'active') {
      matchesArchive = !isUnitArchived;
    } else if (archiveFilter === 'archived') {
      matchesArchive = isUnitArchived;
    }

    let matchesDelivery = true;
    if (deliveryFilter === 'on_time') matchesDelivery = deliveryStatus.isOnTime;
    else if (deliveryFilter === 'overdue') matchesDelivery = deliveryStatus.isOverdue;
    else if (deliveryFilter === 'due_today') matchesDelivery = deliveryStatus.isDueSoon;
    else if (deliveryFilter === 'on_track') matchesDelivery = deliveryStatus.status === 'on_track';
    else if (deliveryFilter === 'delivered') matchesDelivery = deliveryStatus.status === 'delivered' || deliveryStatus.status === 'in_transit' || isUnitArchived;

    const matchesPriority = priorityFilter === 'all' || u.priority === priorityFilter;

    return (
      matchesSearch && 
      matchesStage && 
      matchesCustomer && 
      matchesCategory && 
      matchesTeamTier && 
      matchesCarAllocation && 
      matchesRacingType && 
      matchesArchive &&
      matchesDelivery && 
      matchesPriority
    );
  });

  // Sorted units for display based on selected sorting dropdown
  const displayUnits = useMemo(() => {
    return [...filteredUnits].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        }
        case 'date_asc': {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeA - timeB;
        }
        case 'technician_asc': {
          const techA = (a.intake?.technician || a.pressureTest?.glueRepair?.technician || a.signOff?.inspectorName || 'Unassigned').toLowerCase();
          const techB = (b.intake?.technician || b.pressureTest?.glueRepair?.technician || b.signOff?.inspectorName || 'Unassigned').toLowerCase();
          return techA.localeCompare(techB);
        }
        case 'technician_desc': {
          const techA = (a.intake?.technician || a.pressureTest?.glueRepair?.technician || a.signOff?.inspectorName || 'Unassigned').toLowerCase();
          const techB = (b.intake?.technician || b.pressureTest?.glueRepair?.technician || b.signOff?.inspectorName || 'Unassigned').toLowerCase();
          return techB.localeCompare(techA);
        }
        case 'status': {
          const statusOrder: Record<string, number> = { quarantined: 1, in_progress: 2, completed: 3 };
          const orderA = statusOrder[a.overallStatus] || 2;
          const orderB = statusOrder[b.overallStatus] || 2;
          if (orderA !== orderB) return orderA - orderB;
          const stageIdxA = stages.findIndex((s) => s.id === a.currentStepId);
          const stageIdxB = stages.findIndex((s) => s.id === b.currentStepId);
          return stageIdxA - stageIdxB;
        }
        case 'stage': {
          const stageIdxA = stages.findIndex((s) => s.id === a.currentStepId);
          const stageIdxB = stages.findIndex((s) => s.id === b.currentStepId);
          return stageIdxA - stageIdxB;
        }
        case 'priority': {
          const pOrder: Record<string, number> = { emergency: 4, high: 3, medium: 2, low: 1 };
          return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
        }
        case 'serial': {
          return (a.serialNumber || '').localeCompare(b.serialNumber || '');
        }
        case 'customer': {
          return (a.customerName || '').localeCompare(b.customerName || '');
        }
        default:
          return 0;
      }
    });
  }, [filteredUnits, sortBy, stages]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12 font-sans">
      {/* Top Banner: Particle Science Tracking System & Options Underneath */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-4">
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
          PARTICLE SCIENCE TRACKING SYSTEM
        </h1>

        {/* Options underneath */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onOpenQrScanner}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <QrCode className="h-4 w-4 stroke-[2.5]" />
            <span>Scan QR Intake</span>
          </button>

          <button
            onClick={onOpenNewUnitModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Unit Intake</span>
          </button>

          {activeUnit && (
            <>
              <button
                onClick={() => onOpenUnitWorkflow(activeUnit.id, activeUnit.currentStepId)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors border border-neutral-700 cursor-pointer shadow-sm"
              >
                <Activity className="h-4 w-4 text-sky-400" />
                <span>Resume Active Unit ({activeUnit.serialNumber})</span>
                {(() => {
                  const p = getPriorityConfig(activeUnit.priority);
                  return (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dotColor} ${p.pulse ? 'animate-ping' : ''}`} />
                      <span>{p.label}</span>
                    </span>
                  );
                })()}
              </button>

              <button
                onClick={() => onOpenCertificate(activeUnit)}
                className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors border border-neutral-800 cursor-pointer shadow-sm"
              >
                <FileText className="h-4 w-4 text-amber-400" />
                <span>Master Service Report</span>
              </button>
            </>
          )}

          {!isCustomer && onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-2 transition-all border border-amber-500/30 hover:border-amber-400 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title={isAssignedPerson ? "View Workshop Service Analytics" : "Service Analytics (Restricted: Assigned Technicians Only)"}
            >
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <span>Service Analytics</span>
              {!isAssignedPerson && <Lock className="h-3 w-3 text-amber-400/80" />}
            </button>
          )}

          {!isCustomer && onOpenQuota && (
            <button
              onClick={onOpenQuota}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-sky-400 font-bold text-xs rounded-xl flex items-center gap-2 transition-all border border-sky-500/30 hover:border-sky-400 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title={isAssignedPerson ? "Inspect Cloud Firestore Daily Quota, Limits & Circuit-Breaker Status" : "Daily Quota (Restricted: Assigned Technicians Only)"}
            >
              <Database className="h-4 w-4 text-sky-400" />
              <span>Daily Quota &amp; Cloud Status</span>
              {!isAssignedPerson && <Lock className="h-3 w-3 text-sky-400/80" />}
            </button>
          )}

          {!isCustomer && (
            <button
              type="button"
              onClick={() => setViewMode('technician_profile')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] border ${
                viewMode === 'technician_profile'
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:border-amber-400'
              }`}
              title="Inspect Logged-in Technician Profile, Completed Units & Performance Stats"
            >
              <UserCheck className="h-4 w-4 text-amber-400" />
              <span>Technician Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-2 transition-all border border-emerald-500/30 hover:border-emerald-400 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Download fleet unit records to an RFC 4180 CSV spreadsheet"
          >
            <Download className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
            <span>Download CSV ({displayUnits.length})</span>
          </button>
        </div>
      </div>

      {/* Strict Customer Isolation Banner (AS9100D Sec 8.1 compliance) */}
      {isCustomer && (
        <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-amber-500/5 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <TeamLogo teamName={profile?.customerName} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Exclusive Constructor Fleet Access
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  <span>Strict Isolation Active</span>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {profile?.customerName || 'Racing Team'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                AS9100D Sec 8.1 data isolation enforced: You are viewing solely the units, telemetry, and test reports allocated to your team.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-1.5 text-right">
              <div className="text-[10px] font-mono text-neutral-400">Fleet Units</div>
              <div className="text-sm font-black font-mono text-amber-400">{units.length} Allocated</div>
            </div>
            <button
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Download team fleet data to CSV"
            >
              <Download className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Export Team CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Workshop Process Timers & Alerts Console (Technicians only) */}
      {!isCustomer && (
        <DashboardTimersConsole
          units={units}
          onOpenUnitWorkflow={(unitId, stepId) => {
            onSelectUnit(unitId);
            onOpenUnitWorkflow(unitId, stepId);
          }}
          onUpdateUnit={onUpdateUnit}
        />
      )}

      {/* Key Historical Performance Metrics Summary for the Current Unit (Technicians only - contains technical specs) */}
      {!isCustomer && (() => {
        const targetUnit = activeUnit || units.find((u) => !u.isArchived) || units[0];
        if (!targetUnit) return null;
        return (
          <UnitHistoricalSummary
            currentUnit={targetUnit}
            allUnits={units.filter((u) => !u.isArchived)}
            onSelectUnit={onSelectUnit}
            onOpenWorkflow={(unitId, stepId) => {
              onSelectUnit(unitId);
              onOpenUnitWorkflow(unitId, stepId);
            }}
            onOpenCertificate={onOpenCertificate}
          />
        );
      })()}

      {/* Particle Cleanliness & Stage Pipeline Summary */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <span>9-Stage Overhaul &amp; Calibration Pipeline Distribution</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select any stage below to filter active units currently undergoing processing.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">Filter Stage:</span>
            <button
              onClick={() => setStageFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                stageFilter === 'all'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              All Stages ({totalUnits})
            </button>
          </div>
        </div>

        {/* Stages Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {stages.map((stage, idx) => {
            const count = units.filter((u) => u.currentStepId === stage.id).length;
            const isSelected = stageFilter === stage.id;
            const Icon = stage.icon;

            return (
              <button
                key={stage.id}
                onClick={() => setStageFilter(isSelected ? 'all' : stage.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[74px] ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-500/50'
                    : 'bg-neutral-950/70 border-neutral-800/80 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono text-neutral-500 font-bold">
                    0{idx + 1}
                  </span>
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                </div>
                <div>
                  <div className="text-[11px] font-bold truncate leading-tight mt-1">
                    {stage.label}
                  </div>
                  <div className="text-[11px] font-mono text-amber-400 font-semibold mt-0.5">
                    {count} {count === 1 ? 'unit' : 'units'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Master Depot Units Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Table Toolbar */}
        <div className="border-b border-neutral-800 bg-neutral-950 divide-y divide-neutral-800/80">
          {/* Row 1: Primary Controls - Matrix Title, Search Bar, Sorting Dropdown & View Mode */}
          <div className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-sky-400 shrink-0" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Depot Units Execution Matrix
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-neutral-800 text-neutral-300 rounded border border-neutral-700">
                {displayUnits.length} of {totalUnits} Units
              </span>

              {/* Active Search & Sort Pills */}
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40">
                  <span>Search: &ldquo;{searchTerm}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="hover:text-white cursor-pointer"
                    title="Clear search query"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}

              {sortBy !== 'date_desc' && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <span>Sorted: {getSortLabel(sortBy)}</span>
                  <button
                    type="button"
                    onClick={() => setSortBy('date_desc')}
                    className="hover:text-white cursor-pointer"
                    title="Reset sort to newest date"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
            </div>

            {/* Controls Right: Search Bar, Sorting Dropdown, View Toggle */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Search Bar with Clear Option */}
              <div className="relative flex-1 sm:w-80 md:w-96 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/90 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search serial, WO#, team, technician, status..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-16 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans shadow-inner"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {searchTerm && (
                    <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
                      {displayUnits.length} found
                    </span>
                  )}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="p-0.5 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorting Dropdown (by Date, Technician, Status, Priority) */}
              <div className="relative min-w-[190px]">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as DashboardSortOption)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors font-sans cursor-pointer appearance-none shadow-inner"
                  title="Sort unit list by date, technician, status, priority, or work order"
                >
                  <optgroup label="Date &amp; Intake">
                    <option value="date_desc">Date: Newest First</option>
                    <option value="date_asc">Date: Oldest First</option>
                  </optgroup>
                  <optgroup label="Assigned Technician">
                    <option value="technician_asc">Technician: A to Z</option>
                    <option value="technician_desc">Technician: Z to A</option>
                  </optgroup>
                  <optgroup label="Workflow &amp; Status">
                    <option value="status">Status: Execution Disposition</option>
                    <option value="stage">Workflow Step: Step 1 → 9</option>
                  </optgroup>
                  <optgroup label="Priority &amp; Identification">
                    <option value="priority">Priority: Emergency First</option>
                    <option value="serial">Work Order / Serial (A to Z)</option>
                    <option value="customer">Team / Constructor (A to Z)</option>
                  </optgroup>
                </select>
                <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400" />
              </div>

              {/* Active Pipeline vs Archived Past Deliveries Toggle */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setArchiveFilter('active')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    archiveFilter === 'active'
                      ? 'bg-neutral-800 text-teal-400 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Show active units currently in depot"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Active ({activeUnitsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter('archived')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    archiveFilter === 'archived'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Show past records archived upon delivery"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archived Past ({archivedUnitsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    archiveFilter === 'all'
                      ? 'bg-neutral-800 text-amber-400 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Show all fleet records"
                >
                  <span>All ({units.length})</span>
                </button>
              </div>

              {/* View Mode Toggle: Cards vs Table vs Split Compare vs Technician Profile */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 shrink-0 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-neutral-800 text-amber-400 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Unit Cards View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-neutral-800 text-amber-400 shadow-sm font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Table Matrix View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                {!isCustomer && (
                  <button
                    type="button"
                    onClick={() => setViewMode('compare')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'compare'
                        ? 'bg-neutral-800 text-amber-400 shadow-sm font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Split-Screen Side-by-Side Flow Test & Pressure Comparison"
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Compare</span>
                  </button>
                )}
                {!isCustomer && (
                  <button
                    type="button"
                    onClick={() => setViewMode('technician_profile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'technician_profile'
                        ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                        : 'text-neutral-300 hover:text-amber-400'
                    }`}
                    title="Technician Profile: Completed Units & Performance Stats"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Technician Profile</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 border-l border-neutral-800 ml-1 pl-2"
                  title={`Download ${displayUnits.length} fleet units to CSV spreadsheet`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
                {onRefreshFleet && (
                  <button
                    type="button"
                    onClick={onRefreshFleet}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors cursor-pointer border-l border-neutral-800 ml-1 pl-2"
                    title="Refresh Fleet Work Orders"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Secondary Quick Filter Dropdowns & Reset */}
          <div className="px-4 py-2.5 bg-neutral-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-mono text-neutral-400 uppercase font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3 text-neutral-500" />
                <span>Quick Filters:</span>
              </span>

              {/* Delivery & SLA Filter Dropdown */}
              <div className="relative">
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 transition-colors font-sans cursor-pointer appearance-none"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="on_time">On-Time SLA Compliant ({otdMetrics.onTimeCount})</option>
                  <option value="overdue">Overdue SLA ({overdueUnits.length})</option>
                  <option value="due_today">Due Today (24h) ({dueTodayUnits.length})</option>
                  <option value="on_track">On Track ({onTrackUnits.length})</option>
                  <option value="delivered">Delivered / In Transit ({deliveredUnits.length + inTransitUnits.length})</option>
                </select>
                <Truck className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              </div>

              {/* Customer / Team Filter Dropdown */}
              <div className="relative">
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 transition-colors font-sans cursor-pointer appearance-none"
                >
                  <option value="all">All Teams / Constructors ({availableCustomers.length})</option>
                  {ALL_RACING_CATEGORIES.map((cat) => {
                    const catTeams = availableCustomers.filter((c) => cat.teams.includes(c));
                    if (catTeams.length === 0) return null;
                    return (
                      <optgroup key={cat.id} label={`${cat.badge}: ${cat.label}`}>
                        {catTeams.map((cust) => {
                          const m = getTeamMetadata(cust);
                          return (
                            <option key={cust} value={cust}>
                              {cust} [{m.tier === 'works' ? 'Works' : 'Customer'}]
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                  {(() => {
                    const otherTeams = availableCustomers.filter(
                      (c) => !ALL_RACING_CATEGORIES.some((cat) => cat.teams.includes(c))
                    );
                    if (otherTeams.length === 0) return null;
                    return (
                      <optgroup label="Custom / Registered Clients">
                        {otherTeams.map((cust) => (
                          <option key={cust} value={cust}>
                            {cust}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })()}
                </select>
                <Building2 className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              </div>

              {/* Team Tier Sub-Category Dropdown */}
              <div className="relative">
                <select
                  value={teamTierFilter}
                  onChange={(e) => setTeamTierFilter(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 transition-colors font-sans cursor-pointer appearance-none"
                >
                  <option value="all">All Team Tiers ({units.length})</option>
                  <option value="works">Factory Works Teams ({worksUnitsCount})</option>
                  <option value="customer">Customer / Privateer ({customerUnitsCount})</option>
                </select>
                <ShieldCheck className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              </div>

              {/* Chassis Allocation Sub-Category Dropdown */}
              <div className="relative">
                <select
                  value={carAllocationFilter}
                  onChange={(e) => setCarAllocationFilter(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 transition-colors font-sans cursor-pointer appearance-none"
                >
                  <option value="all">All Chassis ({units.length})</option>
                  <option value="car_1">Car #1 (Lead) ({car1UnitsCount})</option>
                  <option value="car_2">Car #2 (Sister) ({car2UnitsCount})</option>
                  <option value="spare_rig">T-Car / Spare Rig ({spareUnitsCount})</option>
                </select>
                <Flag className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
              </div>
            </div>

            {/* Quick Reset All if any filter or search is active */}
            {hasAnyActiveFilter && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer shrink-0"
                title="Reset search query, sorting, and all filters"
              >
                <RotateCcw className="h-3 w-3 text-amber-400" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Primary Motorsport Racing Category Filter Strip */}
        <div className="px-4 py-2 bg-neutral-950/90 border-b border-neutral-800/80 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold shrink-0 flex items-center gap-1 mr-1">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>Racing Class:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            All Categories ({units.length})
          </button>
          {ALL_RACING_CATEGORIES.map((cat) => {
            const count = units.filter((u) => u.racingCategory === cat.id).length;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryFilter(isSelected ? 'all' : cat.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-1 ring-current`
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cat.dotColor}`} />
                <span>{cat.shortLabel}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 2. Sub-Category Filter: Teams & Constructors within Category Strip */}
        <div className="px-4 py-2 bg-neutral-950/80 border-b border-neutral-800/60 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-neutral-400 font-bold shrink-0 flex items-center gap-1 mr-1">
            <Building2 className="h-3.5 w-3.5 text-sky-400" />
            <span>Teams:</span>
          </span>
          <button
            type="button"
            onClick={() => setCustomerFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 border cursor-pointer ${
              customerFilter === 'all'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-xs font-bold'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            All Teams ({availableCategoryTeams.length})
          </button>
          {availableCategoryTeams.map((teamName) => {
            const isSelected = customerFilter === teamName;
            const meta = getTeamMetadata(teamName);
            const teamUnitsCount = units.filter((u) => u.customerName === teamName).length;
            return (
              <button
                key={teamName}
                type="button"
                onClick={() => setCustomerFilter(isSelected ? 'all' : teamName)}
                className={`px-2 py-1 rounded-lg text-xs font-sans transition-all shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/25 text-amber-200 border-amber-500 font-semibold shadow-xs'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
                }`}
                title={`${teamName} (${meta.subCategory})`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${meta.tier === 'works' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                <span className="font-medium">{meta.shortName}</span>
                <span className={`px-1 py-0.2 rounded text-[8.5px] font-mono uppercase ${meta.badgeBg} ${meta.badgeText}`}>
                  {meta.tier === 'works' ? 'W' : 'C'}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">({teamUnitsCount})</span>
              </button>
            );
          })}
        </div>

        {/* 3. Team Sub-Category Dimensions Bar (Tier, Chassis Allocation, Program & Quick Reset) */}
        <div className="px-4 py-2 bg-neutral-950/60 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sub-Category: Team Constructor Tier */}
            <div className="flex items-center gap-1 bg-neutral-900/90 p-0.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400 px-2 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-amber-400" />
                <span>Tier:</span>
              </span>
              <button
                type="button"
                onClick={() => setTeamTierFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  teamTierFilter === 'all'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All ({units.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamTierFilter(teamTierFilter === 'works' ? 'all' : 'works')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                  teamTierFilter === 'works'
                    ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Factory Works constructor squads"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Works ({worksUnitsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTeamTierFilter(teamTierFilter === 'customer' ? 'all' : 'customer')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                  teamTierFilter === 'customer'
                    ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Customer satellite & privateer racing teams"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span>Customer ({customerUnitsCount})</span>
              </button>
            </div>

            {/* Sub-Category: Chassis Allocation */}
            <div className="flex items-center gap-1 bg-neutral-900/90 p-0.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] font-mono uppercase text-neutral-400 px-2 font-bold flex items-center gap-1">
                <Flag className="h-3 w-3 text-cyan-400" />
                <span>Chassis:</span>
              </span>
              <button
                type="button"
                onClick={() => setCarAllocationFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  carAllocationFilter === 'all'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCarAllocationFilter(carAllocationFilter === 'car_1' ? 'all' : 'car_1')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  carAllocationFilter === 'car_1'
                    ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Car #1 Lead entry"
              >
                Car #1 ({car1UnitsCount})
              </button>
              <button
                type="button"
                onClick={() => setCarAllocationFilter(carAllocationFilter === 'car_2' ? 'all' : 'car_2')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  carAllocationFilter === 'car_2'
                    ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Car #2 Sister entry"
              >
                Car #2 ({car2UnitsCount})
              </button>
              <button
                type="button"
                onClick={() => setCarAllocationFilter(carAllocationFilter === 'spare_rig' ? 'all' : 'spare_rig')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  carAllocationFilter === 'spare_rig'
                    ? 'bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Spare T-Car or bench rig"
              >
                Spare Rig ({spareUnitsCount})
              </button>
            </div>

            {/* Sub-Category: Racing Program / Type */}
            {availableRacingTypes.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Program:</span>
                <select
                  value={racingTypeFilter}
                  onChange={(e) => setRacingTypeFilter(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[11px] text-neutral-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="all">All Programs ({availableRacingTypes.length})</option>
                  {availableRacingTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Sub-Filters Summary & Quick Clear */}
          {hasActiveTeamSubFilters && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400/90 font-bold">
                Filtered: {filteredUnits.length} units
              </span>
              <button
                type="button"
                onClick={resetTeamSubFilters}
                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg text-[10px] font-mono flex items-center gap-1 border border-neutral-800 transition-colors cursor-pointer"
                title="Reset all team sub-category filters"
              >
                <RotateCcw className="h-3 w-3 text-amber-400" />
                <span>Reset Team Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Units View: Cards, Table, Split-Screen Flow Comparison, or Technician Profile */}
        {viewMode === 'technician_profile' ? (
          <div className="p-4 md:p-6 bg-neutral-900/40">
            <TechnicianProfileSection
              units={units}
              onSelectUnit={onSelectUnit}
              onOpenUnitWorkflow={(unit) => onOpenUnitWorkflow(unit.id)}
              onOpenCertificate={onOpenCertificate}
              onOpenUnitQrModal={onOpenUnitQrModal}
              onBackToFleet={() => setViewMode('cards')}
            />
          </div>
        ) : viewMode === 'compare' ? (
          <div className="p-4 md:p-6 bg-neutral-900/40">
            <FlowSplitComparisonView
              units={units}
              initialUnitAId={compareUnitAId}
              initialUnitBId={compareUnitBId}
              onOpenUnitWorkflow={onOpenUnitWorkflow}
              onClose={() => setViewMode('cards')}
            />
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-4 md:p-6 bg-neutral-900/40">
            {displayUnits.length === 0 ? (
              <div className="py-16 px-4 text-center max-w-lg mx-auto space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 shadow-md">
                  <SearchX className="h-7 w-7" />
                </div>
                <div className="space-y-1.5 font-sans">
                  <h4 className="text-base font-bold text-white">No work orders matched your criteria</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {searchTerm 
                      ? `No units found matching "${searchTerm}". Try searching by Work Order number (e.g. 0941), Serial (SN-8842), Technician (e.g. Malgarotti, Vettel), or Team name.`
                      : 'No units match the currently selected filter parameters.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Clear Search Query
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                  >
                    Reset All Filters &amp; Sort
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayUnits.map((u) => {
                  const isCurrent = activeUnit ? u.id === activeUnit.id : false;
                  const passingFlowPts = (u.flowTest?.testPoints || []).filter((p) => p.passed && p.measuredFlowLpm > 0).length;
                  const hasFlowData = (u.flowTest?.testPoints || []).some((p) => p.measuredFlowLpm > 0);
                  const isFlowPass = passingFlowPts >= 4;
                  const isQAApproved = u.signOff?.qaDisposition === 'APPROVED';
                  const del = getUnitDeliveryStatus(u);
                  const priorityCfg = getPriorityConfig(u.priority);
                  const catKey = (u.racingCategory || 'formula1') as RacingCategoryId;
                  const catCfg = MOTORSPORT_CATEGORIES[catKey] || MOTORSPORT_CATEGORIES.formula1;
                  const stageIndex = stages.findIndex((s) => s.id === u.currentStepId) + 1;
                  const stageObj = stages.find((s) => s.id === u.currentStepId);
                  const StageIcon = stageObj ? stageObj.icon : Layers;

                  return (
                    <div
                      key={u.id}
                      className={`bg-neutral-950/90 border rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                        isCurrent
                          ? 'border-amber-500/70 ring-1 ring-amber-500/50 shadow-lg bg-neutral-950'
                          : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950 shadow-sm'
                      }`}
                    >
                      {/* Top Header: Serial, WO, and Priority Indicator Badge */}
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isCurrent && (
                              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" title="Active Selection" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-white text-base">
                                  {u.serialNumber}
                                </span>
                                {(u.componentType === 'combi_2_unit' || u.componentType === 'combi_3_unit' || u.combiConfig?.isCombi) && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    {u.componentType === 'combi_3_unit' || u.combiConfig?.unitCount === 3 ? 'COMBY 3-UNIT' : 'COMBY 2-UNIT'}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] text-neutral-400 font-mono">
                                  WO #{u.workOrderNumber}
                                </span>
                                {(u.customerUnitDesignation || u.intake?.customerUnitDesignation) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Unit: {u.customerUnitDesignation || u.intake?.customerUnitDesignation}
                                  </span>
                                )}
                                {(u.expectedDeliveryDate || u.intake?.expectedDeliveryDate) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                                    Due: {u.expectedDeliveryDate || u.intake?.expectedDeliveryDate}
                                  </span>
                                )}
                                {u.intake?.boxInspection?.moistureState === 'wet' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    ⚠ WET BOX
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Priority Status Indicator Badge on Card */}
                          <div className="flex flex-col items-end">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border flex items-center gap-1.5 shadow-sm ${priorityCfg.badgeBg} ${priorityCfg.badgeText} ${priorityCfg.badgeBorder}`}>
                              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityCfg.dotColor} ${priorityCfg.pulse ? 'animate-ping' : ''}`} />
                              <span>{priorityCfg.label}</span>
                            </span>
                            <span className="text-[9px] text-neutral-400 font-sans mt-0.5">
                              {u.priority === 'emergency' ? 'AOG Critical' : u.priority === 'high' ? 'Accelerated Queue' : u.priority === 'medium' ? 'Standard Queue' : 'Routine Maintenance'}
                            </span>
                          </div>
                        </div>

                        {/* Customer & Part # */}
                        <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-neutral-200 min-w-0">
                              <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{u.customerName}</span>
                              {(() => {
                                const meta = getTeamMetadata(u.customerName);
                                return (
                                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold shrink-0 border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                                    {meta.tier === 'works' ? 'WORKS' : 'CUSTOMER'}
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                              P/N: {u.partNumber}
                            </span>
                          </div>

                          {/* Motorsport Category & Racing Type */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-neutral-800/80 text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border flex items-center gap-1 ${catCfg.badgeBg} ${catCfg.badgeText} ${catCfg.badgeBorder}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${catCfg.dotColor}`} />
                                <span>{catCfg.badge}</span>
                              </span>
                              <span className="text-amber-300/90 font-sans font-medium truncate max-w-[190px]">
                                {u.racingType || catCfg.racingTypes[0]}
                              </span>
                            </div>
                            {u.chassisNumber && (
                              <div className="flex items-center gap-1 font-mono text-neutral-400 text-[9px]">
                                <Flag className="h-2.5 w-2.5 text-neutral-500" />
                                <span>{u.chassisNumber}</span>
                                {(() => {
                                  const alloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
                                  const badge = alloc === 'car_1' ? 'Car #1' : alloc === 'car_2' ? 'Car #2' : 'Spare Rig';
                                  return (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                                      {badge}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-neutral-800 text-neutral-400">
                            <span className="font-sans">Cycle:</span>
                            {u.intake?.isFirstService ? (
                              <span className="text-sky-400 font-mono font-semibold">
                                INITIAL OEM RUN (Life #{u.lifeNumber ?? 1})
                              </span>
                            ) : (
                              <span className="text-amber-300 font-mono font-semibold">
                                REPEAT OVERHAUL ({u.intake?.hoursInOperation || 0} hrs)
                              </span>
                            )}
                          </div>

                          {/* Technician & Intake Date Row */}
                          <div className="flex items-center justify-between text-[10.5px] pt-1.5 border-t border-neutral-800/80 text-neutral-400 font-sans">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <User className="h-3 w-3 text-amber-400 shrink-0" />
                              <span className="truncate">
                                Tech: <strong className="text-neutral-200">{u.intake?.technician || u.pressureTest?.glueRepair?.technician || 'N. Malgarotti'}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-[9.5px] text-neutral-400 shrink-0">
                              <Calendar className="h-3 w-3 text-neutral-500" />
                              <span>{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery SLA Status & Target */}
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-neutral-900/50 rounded-xl border border-neutral-800 text-xs font-sans">
                          <div className="flex items-center gap-1.5">
                            <Truck className="h-3.5 w-3.5 text-neutral-400" />
                            <span className="text-[11px] text-neutral-400">Delivery SLA:</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${del.onTimeBadgeBg} ${del.onTimeBadgeText} ${del.onTimeBadgeBorder}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${del.onTimeDotColor} ${del.isOverdue ? 'animate-ping' : ''}`} />
                              <span>{del.isOnTime ? 'ON-TIME' : 'OVERDUE'}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${del.badgeBg} ${del.badgeText} ${del.badgeBorder}`}>
                              <span>{del.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* Active Pipeline Stage Position & Live Timer Telemetry */}
                        {(() => {
                          const stageTimer = getUnitStageTimerInfo(u);
                          return (
                            <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <StageIcon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span className="font-bold text-neutral-200 truncate">
                                    Stage 0{stageIndex}/09 · {stageTimer.stageName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-bold shrink-0">
                                  Pos 0{stageIndex}
                                </span>
                              </div>

                              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-sky-400 rounded-full transition-all"
                                  style={{ width: `${(stageIndex / 9) * 100}%` }}
                                />
                              </div>

                              {/* Live Timer Pill on Card */}
                              <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                                <span className="text-neutral-400 flex items-center gap-1">
                                  <Timer className="h-3 w-3 text-neutral-500" />
                                  <span>Stage Timer:</span>
                                </span>

                                {stageTimer.isRunning ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5 animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                                    <span>⏳ {stageTimer.formattedTime} ({stageTimer.formattedHours}h rem)</span>
                                  </span>
                                ) : stageTimer.isCompleted ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                    <span>{stageTimer.timerLabel}</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                                    <span>Target: {stageTimer.targetHours}h</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Calibration & Inspection Pills */}
                        <div className={`grid ${isCustomer ? 'grid-cols-1' : 'grid-cols-2'} gap-2 text-[10px] font-mono pt-1`}>
                          {!isCustomer && (
                            <div className="p-2 bg-neutral-900/60 rounded-lg border border-neutral-800/80">
                              <span className="text-neutral-400 block text-[9px] uppercase font-sans">6-Pt Flow (±15%)</span>
                              {hasFlowData ? (
                                <span className={`font-bold flex items-center gap-1 mt-0.5 ${isFlowPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  <span>{passingFlowPts}/6 pts</span>
                                  <span>&middot;</span>
                                  <span>{isFlowPass ? 'PASS (≥4)' : 'FAIL'}</span>
                                </span>
                              ) : (
                                <span className="text-neutral-500 mt-0.5 block">Pending Bench</span>
                              )}
                            </div>
                          )}

                          <div className="p-2 bg-neutral-900/60 rounded-lg border border-neutral-800/80">
                            <span className="text-neutral-400 block text-[9px] uppercase font-sans">QA Disposition</span>
                            <span className={`font-bold mt-0.5 block ${isQAApproved ? 'text-emerald-400' : 'text-neutral-400'}`}>
                              {u.signOff?.qaDisposition || 'IN PROGRESS'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        {isCustomer ? (
                          <>
                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                onOpenUnitWorkflow(u.id, u.currentStepId);
                              }}
                              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.01]"
                              title="Track Unit Position in Process Map"
                            >
                              <span>Track Process Map</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                onOpenCertificate(u);
                              }}
                              className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/50 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="View & Export Official Certificate of Conformance"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Certificate</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                onOpenUnitWorkflow(u.id, u.currentStepId);
                              }}
                              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.01]"
                            >
                              <span>Open Workflow</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                setTrackingModalUnit(u);
                              }}
                              className="p-2 text-neutral-400 hover:text-sky-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                              title="Manage Delivery Tracking & SLA"
                            >
                              <Truck className="h-4 w-4 text-sky-400" />
                            </button>

                            <button
                              onClick={() => {
                                setCompareUnitAId(u.id);
                                setViewMode('compare');
                              }}
                              className="p-2 text-neutral-400 hover:text-amber-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                              title="Compare Flow Test & Pressure in Split-Screen"
                            >
                              <Columns2 className="h-4 w-4 text-amber-400" />
                            </button>

                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                onOpenUnitQrModal(u);
                              }}
                              className="p-2 text-neutral-400 hover:text-amber-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                              title="View & Print Unit QR Asset Tag"
                            >
                              <QrCode className="h-4 w-4 text-amber-400" />
                            </button>

                            <button
                              onClick={(e) => handleToggleUnitArchive(u, e)}
                              className={`p-2 border rounded-xl transition-colors cursor-pointer ${
                                u.isArchived || u.delivery?.dispatchStatus === 'delivered'
                                  ? 'text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50 border-emerald-800/80'
                                  : 'text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800'
                              }`}
                              title={u.isArchived ? 'Unarchive / Restore Unit to Active Depot' : 'Archive Unit into Past Records'}
                            >
                              {u.isArchived ? (
                                <ArchiveRestore className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Archive className="h-4 w-4 text-neutral-400" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                onSelectUnit(u.id);
                                onOpenCertificate(u);
                              }}
                              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                              title="View Technical Service Report"
                            >
                              <FileText className="h-4 w-4 text-neutral-300" />
                            </button>

                            {onDeleteUnit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteUnit(u);
                                }}
                                className="p-2 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-rose-950/40 border border-neutral-800 hover:border-rose-700/60 rounded-xl transition-colors cursor-pointer"
                                title="Delete Unit (Incorrect Intake Entry)"
                              >
                                <Trash2 className="h-4 w-4 text-rose-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Units Table Matrix View */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950/80 text-neutral-400 text-[10px] font-mono uppercase tracking-wider border-b border-neutral-800">
                  <th 
                    onClick={() => setSortBy(sortBy === 'serial' ? 'date_desc' : 'serial')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Serial / Work Order Number"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Serial / WO</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === 'serial' ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => setSortBy(sortBy === 'priority' ? 'date_desc' : 'priority')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Priority Rank"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Priority</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === 'priority' ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  <th className="py-3 px-4">Racing Class &amp; Event</th>
                  <th 
                    onClick={() => setSortBy(sortBy === 'customer' ? 'date_desc' : 'customer')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Team / Constructor"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Constructor &amp; Team</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === 'customer' ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => setSortBy(sortBy === 'technician_asc' ? 'technician_desc' : 'technician_asc')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Assigned Technician"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Technician</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy.startsWith('technician') ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  <th 
                    onClick={() => setSortBy(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Intake Date"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Intake Date</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy.startsWith('date') ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  <th className="py-3 px-4">Delivery &amp; SLA Due</th>
                  <th 
                    onClick={() => setSortBy(sortBy === 'status' ? 'date_desc' : 'status')}
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors select-none"
                    title="Sort by Workflow Status &amp; Stage"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{isCustomer ? 'Process Map Position' : 'Stage Position & Active Timer'}</span>
                      <ArrowUpDown className={`h-3 w-3 ${sortBy === 'status' || sortBy === 'stage' ? 'text-amber-400' : 'text-neutral-600'}`} />
                    </div>
                  </th>
                  {!isCustomer && <th className="py-3 px-4">6-Point Flow (±15%)</th>}
                  {!isCustomer && <th className="py-3 px-4">Particle Cleanliness</th>}
                  <th className="py-3 px-4">QA Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                {displayUnits.length === 0 ? (
                  <tr>
                    <td colSpan={isCustomer ? 10 : 12} className="py-16 px-4 text-center">
                      <div className="max-w-md mx-auto space-y-3 font-sans">
                        <div className="h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400 shadow-md">
                          <SearchX className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">No work orders matched your criteria</div>
                          <p className="text-xs text-neutral-400 mt-1">
                            {searchTerm 
                              ? `No work order results for "${searchTerm}".`
                              : 'No overhaul units match the active filters.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-all cursor-pointer"
                            >
                              Clear Search
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={resetAllFilters}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
                          >
                            Reset All Filters
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayUnits.map((u) => {
                    const isCurrent = activeUnit ? u.id === activeUnit.id : false;
                    const passingFlowPts = (u.flowTest?.testPoints || []).filter((p) => p.passed && p.measuredFlowLpm > 0).length;
                    const hasFlowData = (u.flowTest?.testPoints || []).some((p) => p.measuredFlowLpm > 0);
                    const isFlowPass = passingFlowPts >= 4;
                    const isQAApproved = u.signOff?.qaDisposition === 'APPROVED';
                    const del = getUnitDeliveryStatus(u);
                    const priorityCfg = getPriorityConfig(u.priority);
                    const catKey = (u.racingCategory || 'formula1') as RacingCategoryId;
                    const catCfg = MOTORSPORT_CATEGORIES[catKey] || MOTORSPORT_CATEGORIES.formula1;

                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors hover:bg-neutral-800/50 ${
                          isCurrent ? 'bg-amber-500/5' : 'bg-transparent'
                        }`}
                      >
                        {/* Serial Number & WO */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isCurrent && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-xs block">
                                  {u.serialNumber}
                                </span>
                                {(u.combiConfig?.isCombi || u.componentType === 'combi_2_unit' || u.componentType === 'combi_3_unit') && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    COMBY {u.combiConfig?.unitCount || (u.componentType === 'combi_3_unit' ? 3 : 2)}U
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-neutral-300 font-mono">
                                  WO #{u.workOrderNumber}
                                </span>
                                {(u.customerUnitDesignation || u.intake?.customerUnitDesignation) && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    {u.customerUnitDesignation || u.intake?.customerUnitDesignation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Priority Status Indicator Column */}
                        <td className="py-3 px-4 font-sans">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${priorityCfg.badgeBg} ${priorityCfg.badgeText} ${priorityCfg.badgeBorder} shadow-sm`}>
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityCfg.dotColor} ${priorityCfg.pulse ? 'animate-ping' : ''}`} />
                            <span>{priorityCfg.label}</span>
                          </span>
                        </td>

                        {/* Racing Class & Event */}
                        <td className="py-3 px-4 font-sans">
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${catCfg.badgeBg} ${catCfg.badgeText} ${catCfg.badgeBorder}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${catCfg.dotColor}`} />
                              <span>{catCfg.badge}</span>
                            </span>
                            <div className="text-[10px] text-neutral-300 font-medium truncate mt-0.5 max-w-[160px]">
                              {u.racingType || catCfg.racingTypes[0]}
                            </div>
                            {u.chassisNumber && (
                              <div className="text-[9px] text-neutral-500 font-mono truncate">
                                {u.chassisNumber}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Customer & Client */}
                        <td className="py-3 px-4 font-sans">
                          <div className="font-semibold text-neutral-100 flex items-center gap-1.5 flex-wrap">
                            <Building2 className="h-3 w-3 text-amber-400 shrink-0" />
                            <span className="truncate">{u.customerName}</span>
                            {(() => {
                              const meta = getTeamMetadata(u.customerName);
                              return (
                                <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold shrink-0 border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                                  {meta.tier === 'works' ? 'WORKS' : 'CUSTOMER'}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>P/N: {u.partNumber}</span>
                            {(() => {
                              const alloc = u.carAllocation || getCarAllocationFromChassis(u.chassisNumber);
                              const badge = alloc === 'car_1' ? 'Car #1' : alloc === 'car_2' ? 'Car #2' : 'Spare Rig';
                              return (
                                <span className="px-1 py-0.2 rounded text-[8px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                                  {badge}
                                </span>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Assigned Technician */}
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-1.5 text-neutral-200 font-medium">
                            <User className="h-3 w-3 text-amber-400 shrink-0" />
                            <span className="truncate">{u.intake?.technician || u.pressureTest?.glueRepair?.technician || 'N. Malgarotti'}</span>
                          </div>
                        </td>

                        {/* Intake Date */}
                        <td className="py-3 px-4 font-mono text-[10.5px] text-neutral-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-neutral-500 shrink-0" />
                            <span>{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </td>

                        {/* Delivery & SLA Status */}
                        <td className="py-3 px-4 font-sans">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${del.onTimeBadgeBg} ${del.onTimeBadgeText} ${del.onTimeBadgeBorder}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${del.onTimeDotColor} ${del.isOverdue ? 'animate-ping' : ''}`} />
                                <span>{del.isOnTime ? 'ON-TIME' : 'OVERDUE'}</span>
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center gap-1 ${del.badgeBg} ${del.badgeText} ${del.badgeBorder}`}>
                                <span>{del.label}</span>
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              {del.status === 'delivered' ? (
                                <span className="text-emerald-400/90 font-sans">{del.carrier} &middot; POD Ok</span>
                              ) : del.status === 'in_transit' ? (
                                <span className="text-sky-300 font-sans">{del.carrier}</span>
                              ) : (
                                <span>Due: {del.targetFormatted}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Active Stage Position & Live Timer */}
                        <td className="py-3 px-4 font-mono">
                          {(() => {
                            const uTimer = getUnitStageTimerInfo(u);
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700">
                                    Stage 0{uTimer.stagePosition}: {uTimer.stageName}
                                  </span>
                                </div>
                                <div>
                                  {uTimer.isRunning ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
                                      <span>⏳ {uTimer.formattedTime} ({uTimer.formattedHours}h rem)</span>
                                    </span>
                                  ) : uTimer.isCompleted ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      <span>✓ {uTimer.targetHours}h Done</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9.5px] text-neutral-500">
                                      Target: {uTimer.targetHours}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* 6-Point Flow Results */}
                        {!isCustomer && (
                          <td className="py-3 px-4">
                            {hasFlowData ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isFlowPass
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}>
                                {passingFlowPts}/6 IN SPEC &rarr; {isFlowPass ? 'PASS (≥4)' : 'FAIL'}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-[10px]">
                                Pending Flow Bench
                              </span>
                            )}
                          </td>
                        )}

                        {/* Particle Cleanliness */}
                        {!isCustomer && (
                          <td className="py-3 px-4">
                            {u.cleaning?.mode === 'with_analysis' && u.cleaning.analysisResult ? (
                              <div className="flex items-center gap-1.5">
                                <Microscope className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="text-[10px] text-cyan-300 font-bold">
                                  {u.cleaning.analysisResult.particleCountIso}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[10px]">
                                Standard Wash
                              </span>
                            )}
                          </td>
                        )}

                        {/* QA Status */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isQAApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                          }`}>
                            {u.signOff?.qaDisposition || 'IN PROGRESS'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isCustomer ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  onOpenUnitWorkflow(u.id, u.currentStepId);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Track Unit Position in Process Map"
                              >
                                <span>Track Map</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  onOpenCertificate(u);
                                }}
                                className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="View & Export Official Certificate of Conformance"
                              >
                                <FileText className="h-3 w-3 text-amber-400" />
                                <span>Certificate</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  onOpenUnitWorkflow(u.id, u.currentStepId);
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Open interactive step workflow"
                              >
                                <span>Workflow</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  setTrackingModalUnit(u);
                                }}
                                className="p-1 text-neutral-400 hover:text-sky-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Manage Delivery Tracking & Carrier Logistics"
                              >
                                <Truck className="h-4 w-4 text-sky-400 hover:scale-110 transition-transform" />
                              </button>

                              <button
                                onClick={() => {
                                  setCompareUnitAId(u.id);
                                  setViewMode('compare');
                                }}
                                className="p-1 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="Compare Flow Test & Pressure Chart Side-by-Side"
                              >
                                <Columns2 className="h-4 w-4 text-amber-400 hover:scale-110 transition-transform" />
                              </button>

                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  onOpenUnitQrModal(u);
                                }}
                                className="p-1 text-neutral-400 hover:text-amber-400 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="View & Print Unit QR Asset Tag"
                              >
                                <QrCode className="h-4 w-4 text-sky-400 hover:text-amber-400" />
                              </button>

                              <button
                                onClick={(e) => handleToggleUnitArchive(u, e)}
                                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title={u.isArchived ? "Unarchive / Restore Unit to Active Depot" : "Archive Unit into Past Records"}
                              >
                                {u.isArchived ? (
                                  <ArchiveRestore className="h-4 w-4 text-emerald-400 hover:scale-110 transition-transform" />
                                ) : (
                                  <Archive className="h-4 w-4 text-neutral-400 hover:text-amber-400 hover:scale-110 transition-transform" />
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  onSelectUnit(u.id);
                                  onOpenCertificate(u);
                                }}
                                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                                title="View Technical Service Report & Full Graph"
                              >
                                <FileText className="h-4 w-4 text-amber-400" />
                              </button>

                              {onDeleteUnit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteUnit(u);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Delete Unit (Incorrect Intake Entry)"
                                >
                                  <Trash2 className="h-4 w-4 text-rose-400 hover:scale-110 transition-transform" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery Tracking & Logistics Modal */}
      {trackingModalUnit && (
        <DeliveryTrackingModal
          unit={trackingModalUnit}
          isOpen={true}
          onClose={() => setTrackingModalUnit(null)}
          onUpdateUnit={onUpdateUnit || (() => {})}
        />
      )}

      {/* CSV Export Success Toast */}
      {csvDownloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-slideUp">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCheck className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-emerald-100">{csvDownloadToast}</div>
            <div className="text-[10px] text-emerald-300/80">RFC 4180 spreadsheet downloaded to your computer</div>
          </div>
        </div>
      )}
    </div>
  );
};
