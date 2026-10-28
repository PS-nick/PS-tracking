import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Video, 
  Upload, 
  CheckSquare, 
  Square, 
  FileText, 
  Settings2, 
  Sliders, 
  Info, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Sparkles, 
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  Flame,
  Gauge,
  QrCode,
  Printer,
  Download,
  Cpu,
  Compass,
  Eye,
  ZoomIn,
  Package,
  Lock,
  ArrowRight,
  Edit3,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { ServiceUnit, MediaItem, ProcessConfig, UnitPriority, ComponentType, StepId } from '../../types/process';
import { readFileAsDataUrl, createMediaItem, generateTechnicalSchematicSvg } from '../../utils/media';
import { downloadQrCodeImage } from '../../utils/qrCode';
import { CustomerSelector } from '../CustomerSelector';
import { getPriorityConfig, PRIORITY_CONFIGS } from '../../utils/priority';
import { BICESTER_COMPONENT_TYPES, WORKBENCH_DOC_INFO, getAllComponentTypes } from '../../constants/workbench';
import { MOTORSPORT_CATEGORIES, getTeamMetadata, RacingCategoryId } from '../../constants/motorsport';
import { WorkbenchSheetModal } from '../WorkbenchSheetModal';
import { StepSopViewer } from '../StepSopModal';
import { FlowDrawingModal } from '../FlowDrawingModal';
import { CustomCoolerModal } from '../CustomCoolerModal';
import { CameraSnapshotModal } from '../CameraSnapshotModal';
import { ShieldCheck, Layers, FileCheck } from 'lucide-react';
import { createDefaultCombiConfig, ensureCombiConfig, getSubUnitDefaultSpec } from '../../utils/storage';
import { getDefaultPressureForComponent } from '../../utils/pressure';

interface IntakeStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onOpenQrModal?: () => void;
  onOpenScanner?: () => void;
  onOpenWorkbenchSheet?: () => void;
  onDeleteUnit?: () => void;
}

export const IntakeStep: React.FC<IntakeStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onOpenQrModal,
  onOpenScanner,
  onOpenWorkbenchSheet,
  onDeleteUnit,
}) => {
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<MediaItem | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [customPhotoCaption, setCustomPhotoCaption] = useState('');
  const [customFlowDrawingCaption, setCustomFlowDrawingCaption] = useState('');
  const [isWorkbenchModalOpen, setIsWorkbenchModalOpen] = useState(false);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [isCustomCoolerModalOpen, setIsCustomCoolerModalOpen] = useState(false);
  const [customCoolerVersion, setCustomCoolerVersion] = useState(0);
  const [isLiveCameraModalOpen, setIsLiveCameraModalOpen] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  const intake = unit.intake;
  const config = unit.processConfig;
  const currentCompType = unit.componentType || intake.componentType || 'heat_exchanger';
  const isCombi = !!(unit.combiConfig?.isCombi || currentCompType === 'combi_2_unit' || currentCompType === 'combi_3_unit');
  const isIntercooler = currentCompType === 'intercooler';
  const isIntakeAccepted = Boolean(intake?.completedAt);

  // Flow drawing or picture upload handler
  const handleFlowDrawingUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const title = customFlowDrawingCaption.trim() || `${unit.customerName} - ${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')}`;
      const drawingNumber = unit.drawingNumber || intake.drawingNumber || `DWG-2026-${file.name.replace(/\.[^/.]+$/, '').toUpperCase()}`;
      const newItem = createMediaItem(
        file.name,
        'image',
        dataUrl,
        'intake',
        `Flow Drawing: ${title}`
      );

      onUpdateUnit((prev) => ({
        ...prev,
        drawingNumber,
        flowDrawingUrl: dataUrl,
        flowDrawingTitle: title,
        flowDrawings: [newItem, ...(prev.flowDrawings || [])],
        intake: {
          ...prev.intake,
          drawingNumber,
          flowDrawingUrl: dataUrl,
          flowDrawingTitle: title,
          flowDrawings: [newItem, ...(prev.intake.flowDrawings || [])],
          flowVectorDirectionVerified: true,
        },
      }), `Uploaded flow schematic / circuit drawing: ${file.name}`);
      setCustomFlowDrawingCaption('');
    } catch (err) {
      console.error('Flow drawing upload error:', err);
    }
    e.target.value = '';
  };

  // Standard CAD flow drawing generator
  const handleGenerateStandardFlowDrawing = () => {
    const title = `${unit.customerName} - ${unit.modelName} Flow Circuit Schematic`;
    const drawingNo = unit.drawingNumber || intake.drawingNumber || `DWG-BIC-${unit.serialNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
    const svgUrl = generateTechnicalSchematicSvg(title, `Drawing ${drawingNo} · Dual-Pass Flow Route`, '#0284c7');
    const newItem = createMediaItem(
      `${drawingNo}.svg`,
      'image',
      svgUrl,
      'intake',
      title
    );

    onUpdateUnit((prev) => ({
      ...prev,
      drawingNumber: drawingNo,
      flowDrawingUrl: svgUrl,
      flowDrawingTitle: title,
      flowDrawings: [newItem, ...(prev.flowDrawings || [])],
      intake: {
        ...prev.intake,
        drawingNumber: drawingNo,
        flowDrawingUrl: svgUrl,
        flowDrawingTitle: title,
        flowDrawings: [newItem, ...(prev.intake.flowDrawings || [])],
        flowVectorDirectionVerified: true,
      },
    }), `Generated standard engineering flow circuit drawing: ${drawingNo}`);
  };

  // Remove flow drawing
  const handleRemoveFlowDrawing = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      flowDrawingUrl: undefined,
      flowDrawingTitle: undefined,
      intake: {
        ...prev.intake,
        flowDrawingUrl: undefined,
        flowDrawingTitle: undefined,
      },
    }), `Removed intake flow drawing`);
  };

  // First service vs Repeat service selection
  const handleServiceTypeChange = (isFirst: boolean) => {
    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        isFirstService: isFirst,
        serviceType: isFirst ? 'first_time_assembly' : 'routine_overhaul',
      },
    }), `Assessed service cycle: ${isFirst ? 'FIRST SERVICE / INITIAL RUN' : 'REPEAT SERVICE / ROUTINE OVERHAUL'}`);
  };

  // Comments update
  const handleCommentsChange = (comments: string) => {
    onUpdateUnit((prev) => ({
      ...prev,
      intake: { ...prev.intake, comments },
    }));
  };

  const handleCommentsBlur = () => {
    onUpdateUnit((prev) => prev, `Updated intake inspection comments`);
  };

  // Checklist toggle
  const toggleChecklist = (id: string) => {
    onUpdateUnit((prev) => {
      const updatedList = prev.intake.checklist.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      const target = updatedList.find((i) => i.id === id);
      return {
        ...prev,
        intake: {
          ...prev.intake,
          checklist: updatedList,
        },
      };
    }, `Updated intake checklist item`);
  };

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const item = {
      id: `check-${Date.now()}`,
      label: newChecklistText.trim(),
      checked: true,
    };
    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        checklist: [...prev.intake.checklist, item],
      },
    }), `Added inspection verification check: "${newChecklistText.trim()}"`);
    setNewChecklistText('');
  };

  // Photo & Video file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isVideo: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: MediaItem[] = [];
    const newVideos: MediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newItem = createMediaItem(
          file.name,
          isVideo ? 'video' : 'image',
          dataUrl,
          'intake',
          customPhotoCaption || file.name
        );
        if (isVideo) {
          newVideos.push(newItem);
        } else {
          newPhotos.push(newItem);
        }
      } catch (err) {
        console.warn('File read error:', err);
      }
    }

    if (newPhotos.length > 0 || newVideos.length > 0) {
      onUpdateUnit((prev) => ({
        ...prev,
        intake: {
          ...prev.intake,
          photos: [...(prev.intake?.photos || []), ...newPhotos],
          videos: [...(prev.intake?.videos || []), ...newVideos],
        },
      }), `Uploaded ${newPhotos.length + newVideos.length} intake inspection item(s)`);
    }

    setCustomPhotoCaption('');
    e.target.value = '';
  };

  // Box & Packaging Photo Inspection handler
  const boxFileInputRef = useRef<HTMLInputElement>(null);

  const handleBoxPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newItem = createMediaItem(
          file.name,
          'image',
          dataUrl,
          'intake',
          `Intake Box Packaging Inspection · ${intake.boxInspection?.boxType || 'Cardboard'} condition evidence`
        );
        newPhotos.push(newItem);
      } catch (err) {
        console.error('Box photo read error:', err);
      }
    }

    if (newPhotos.length > 0) {
      onUpdateUnit((prev) => {
        const existingPhotos = prev.intake.boxInspection?.photos || [];
        const combined = [...existingPhotos, ...newPhotos];
        return {
          ...prev,
          intake: {
            ...prev.intake,
            boxInspection: {
              boxType: prev.intake.boxInspection?.boxType || 'cardboard',
              condition: prev.intake.boxInspection?.condition || 'intact',
              notes: prev.intake.boxInspection?.notes || '',
              photos: combined,
              photoTaken: combined.length > 0,
              inspectedAt: new Date().toISOString(),
              inspector: prev.intake.technician || 'NM',
            },
          },
        };
      }, `Logged ${newPhotos.length} box inspection photo(s)`);
    }
    e.target.value = '';
  };

  const handleGenerateMockBoxPhoto = () => {
    const boxLabel = (intake.boxInspection?.boxType || 'cardboard').toUpperCase();
    const mockSvgUrl = generateTechnicalSchematicSvg(
      `Intake Box Inspection (${boxLabel})`,
      `${unit.serialNumber} · Seals Intact · No transit puncture`,
      '#059669'
    );
    const mockItem = createMediaItem(
      `Box_Inspection_${boxLabel}_${Date.now()}.svg`,
      'image',
      mockSvgUrl,
      'intake',
      `Packaging Survey: ${boxLabel} received sealed and verified`
    );

    onUpdateUnit((prev) => {
      const existing = prev.intake.boxInspection?.photos || [];
      const combined = [...existing, mockItem];
      return {
        ...prev,
        intake: {
          ...prev.intake,
          boxInspection: {
            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
            condition: prev.intake.boxInspection?.condition || 'intact',
            notes: prev.intake.boxInspection?.notes || '',
            photos: combined,
            photoTaken: true,
            inspectedAt: new Date().toISOString(),
            inspector: prev.intake.technician || 'NM',
          },
        },
      };
    }, 'Captured box inspection verification schematic photo');
  };

  const incomingPressure = intake.incomingPressureTest || {
    performed: true,
    testPressureBar: getDefaultPressureForComponent(unit.componentType),
    heldDurationSeconds: 60,
    startPressureBar: getDefaultPressureForComponent(unit.componentType),
    endPressureBar: getDefaultPressureForComponent(unit.componentType),
    pressureDropBar: 0.0,
    medium: 'nitrogen' as const,
    result: 'PASS' as const,
    leakDetected: false,
    technician: intake.technician || 'Nicola Malgarotti',
    notes: '',
  };

  const updateIncomingPressureTest = (field: string, value: unknown) => {
    onUpdateUnit((prev) => {
      const defaultP = getDefaultPressureForComponent(prev.componentType);
      const existing = prev.intake.incomingPressureTest || {
        performed: true,
        testPressureBar: defaultP,
        heldDurationSeconds: 60,
        startPressureBar: defaultP,
        endPressureBar: defaultP,
        pressureDropBar: 0.0,
        medium: 'nitrogen',
        result: 'PASS',
        leakDetected: false,
        technician: prev.intake.technician || 'Nicola Malgarotti',
        notes: '',
      };

      const updated = {
        ...existing,
        [field]: value,
      };

      if (field === 'startPressureBar' || field === 'endPressureBar') {
        const start = field === 'startPressureBar' ? Number(value) : (updated.startPressureBar ?? updated.testPressureBar);
        const end = field === 'endPressureBar' ? Number(value) : (updated.endPressureBar ?? updated.testPressureBar);
        updated.pressureDropBar = Number(Math.max(0, start - end).toFixed(3));
        if (updated.pressureDropBar > 0.05) {
          updated.leakDetected = true;
          updated.result = 'FAIL';
        } else {
          updated.leakDetected = false;
          updated.result = 'PASS';
        }
      }

      return {
        ...prev,
        intake: {
          ...prev.intake,
          incomingPressureTest: updated,
        },
        pressureTest: {
          ...prev.pressureTest,
          testPressureBar: updated.testPressureBar,
          heldDurationSeconds: updated.heldDurationSeconds,
          testMedium: updated.medium === 'water' ? 'water' : 'gas',
          gasMedium: updated.medium === 'helium' ? 'helium' : updated.medium === 'nitrogen' ? 'nitrogen' : 'dry_air',
        },
      };
    }, `Updated intake pressure test: ${field}`);
  };

  const updateCoreIncomingPressure = (coreId: string, field: string, val: unknown) => {
    onUpdateUnit((prev) => {
      const existing = prev.intake.incomingPressureTest || {
        performed: true,
        testPressureBar: 4.0,
        heldDurationSeconds: 60,
        medium: 'nitrogen',
        result: 'PASS',
      };
      const coreTests = existing.coreTests || {};
      const corePrev = coreTests[coreId] || {
        testPressureBar: 4.0,
        heldDurationSeconds: 60,
        startPressureBar: 4.0,
        endPressureBar: 4.0,
        pressureDropBar: 0.0,
        result: 'PASS',
      };
      const updatedCore = { ...corePrev, [field]: val };
      if (field === 'startPressureBar' || field === 'endPressureBar') {
        const start = field === 'startPressureBar' ? Number(val) : (updatedCore.startPressureBar ?? updatedCore.testPressureBar);
        const end = field === 'endPressureBar' ? Number(val) : (updatedCore.endPressureBar ?? updatedCore.testPressureBar);
        updatedCore.pressureDropBar = Number(Math.max(0, start - end).toFixed(3));
        updatedCore.result = updatedCore.pressureDropBar > 0.05 ? 'FAIL' : 'PASS';
      }

      const updatedSubUnits = (prev.combiConfig?.subUnits || []).map((s) => {
        if (s.id !== coreId) return s;
        return {
          ...s,
          pressureTest: {
            ...s.pressureTest,
            testPressureBar: updatedCore.testPressureBar,
            testResult: updatedCore.result,
          },
        };
      });

      return {
        ...prev,
        combiConfig: prev.combiConfig ? {
          ...prev.combiConfig,
          subUnits: updatedSubUnits,
        } : undefined,
        intake: {
          ...prev.intake,
          incomingPressureTest: {
            ...existing,
            coreTests: {
              ...coreTests,
              [coreId]: updatedCore,
            },
          },
        },
      };
    }, `Updated core ${coreId} intake pressure test`);
  };

  // Quick workshop camera snapshot generator (simulate camera capture with realistic schematic)
  const handleSimulateCameraCapture = () => {
    const photoTypes = [
      { name: 'Intake_Body_Survey.svg', title: 'Unit Body Outer Casing', desc: 'Overview from Drive End · Clean ports' },
      { name: 'Inlet_Flange_Surface.svg', title: 'Inlet Port B Bore Condition', desc: 'No galling or seal face pitting' },
      { name: 'Electrical_Connector_Pins.svg', title: 'Solenoid Connector Harness', desc: 'Pins straight, gold plating intact' },
    ];
    const pick = photoTypes[intake.photos.length % photoTypes.length];
    const svgUrl = generateTechnicalSchematicSvg(pick.title, `${unit.serialNumber} · ${pick.desc}`, '#0284c7');
    const newItem = createMediaItem(pick.name, 'image', svgUrl, 'intake', pick.title);

    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        photos: [...prev.intake.photos, newItem],
      },
    }), `Captured workshop camera photo: ${pick.title}`);
  };

  // Quick video simulation
  const handleSimulateVideoUpload = () => {
    const newItem = createMediaItem(
      `Intake_Survey_${unit.serialNumber}.mp4`,
      'video',
      'sample-video',
      'intake',
      '360° Rotational intake condition video recording'
    );
    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        videos: [...prev.intake.videos, newItem],
      },
    }), `Attached 360° intake survey video recording`);
  };

  const removeMedia = (id: string, isVideo: boolean) => {
    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        photos: !isVideo ? prev.intake.photos.filter((p) => p.id !== id) : prev.intake.photos,
        videos: isVideo ? prev.intake.videos.filter((v) => v.id !== id) : prev.intake.videos,
      },
    }), `Removed intake media`);
  };

  // Update Process Configuration for the rest of the workflow
  const updateConfig = (key: keyof ProcessConfig, value: unknown) => {
    onUpdateUnit((prev) => ({
      ...prev,
      processConfig: {
        ...prev.processConfig,
        [key]: value,
      },
      // Keep cleaning mode in sync with cleaning step record
      cleaning: {
        ...prev.cleaning,
        mode: key === 'cleaningMode' ? (value as 'with_analysis' | 'without_analysis') : prev.cleaning.mode,
      },
    }), `Configured process parameter: ${String(key)} = ${String(value)}`);
  };

  const markIntakeCompleted = () => {
    if (!unit.customerName || unit.customerName.trim() === '' || unit.customerName === 'Unassigned') {
      alert('Please select a Customer / Motorsport Constructor before accepting intake. Customer assignment is strictly required during intake and will be permanently locked once accepted.');
      return;
    }

    let nextStep: StepId = 'degreasing';
    if (config.degreasingRequired === false) {
      if (config.cleaningRequired !== false && config.descalingRequired !== false && !unit.cleaning?.skipped) {
        nextStep = 'cleaning';
      } else if (config.firstFlushRequired !== false) {
        nextStep = 'first_flush';
      } else if (!isIntercooler && config.flowTestRequired !== false) {
        nextStep = 'flow_test';
      } else if (config.pressureTestRequired !== false) {
        nextStep = 'pressure_test';
      } else if (config.finalFlushRequired !== false) {
        nextStep = 'final_flush';
      } else if (config.ovenRequired !== false) {
        nextStep = 'oven';
      } else if (config.gillingRequired !== false) {
        nextStep = 'gilling';
      } else {
        nextStep = 'sign_off';
      }
    }

    onUpdateUnit((prev) => ({
      ...prev,
      intake: {
        ...prev.intake,
        completedAt: new Date().toISOString(),
      },
      currentStepId: nextStep,
    }), `Accepted In-Sheet Intake stage. Customer permanently locked (${unit.customerName}). Next required process: ${nextStep.toUpperCase()}`);
    (onNextStep as any)(nextStep, 'intake');
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Stage 01
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">Document IN-SHT-REV4</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Unit In-Sheet Assessment & Process Setup
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Determine whether this unit is at its initial first service, log visual/video condition, and configure the downstream overhaul parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Step SOP Viewer */}
          <StepSopViewer stepId="intake" />

          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-lg transition-colors border border-neutral-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>Scan QR</span>
            </button>
          )}

          {onDeleteUnit && (
            <button
              type="button"
              onClick={onDeleteUnit}
              className="px-2.5 py-2 bg-neutral-900 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 font-semibold text-xs rounded-lg transition-colors border border-neutral-800 hover:border-rose-800/60 flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Delete Unit (Incorrect Intake Entry)"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Delete Unit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenWorkbenchSheet ? onOpenWorkbenchSheet() : setIsWorkbenchModalOpen(true)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-xs rounded-lg transition-colors border border-amber-500/30 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>View Bicester Sheet (QA-2026)</span>
          </button>

          <button
            onClick={markIntakeCompleted}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>Confirm Intake & Advance</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: First Service Assessment & Media Upload */}
        <div className="lg:col-span-7 space-y-6">
          {/* Unit Asset Tag & Automatic QR Code Badge */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                  PARTICLE SCIENCE TRACKING SYSTEM
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                AUTO-GENERATED
              </span>
            </div>

            <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 bg-white rounded-lg border border-neutral-700 shrink-0 shadow-sm">
                {unit.qrCode?.dataUrl ? (
                  <img
                    src={unit.qrCode.dataUrl}
                    alt={`QR Code for ${unit.serialNumber}`}
                    className="w-24 h-24 object-contain block"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-slate-400 font-mono text-xs">
                    Loading QR...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono font-black text-white text-base">
                    {unit.serialNumber}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                    LIFE #{unit.lifeNumber ?? (unit.intake?.isFirstService ? 1 : 2)}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    WO #{unit.workOrderNumber}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    P/N: {unit.partNumber}
                  </span>
                  {(() => {
                    const p = getPriorityConfig(unit.priority);
                    return (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${p.badgeBg} ${p.badgeText} ${p.badgeBorder}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${p.dotColor} ${p.pulse ? 'animate-ping' : ''}`} />
                        <span>{p.label} PRIORITY</span>
                      </span>
                    );
                  })()}
                </div>

                {/* Delivery SLA Date */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
                    <span className="text-neutral-400 font-mono text-[10px] uppercase font-bold">Exp. Delivery (SLA):</span>
                    <input
                      type="date"
                      value={unit.expectedDeliveryDate || unit.intake?.expectedDeliveryDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateUnit((prev) => ({
                          ...prev,
                          expectedDeliveryDate: val,
                          intake: { ...prev.intake, expectedDeliveryDate: val },
                        }), `Updated expected delivery date to: ${val}`);
                      }}
                      className="bg-transparent text-sky-300 font-mono font-bold text-xs focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Priority Status Selector */}
                <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-neutral-400 font-mono">Priority:</span>
                  {(['emergency', 'high', 'medium', 'low'] as UnitPriority[]).map((pKey) => {
                    const cfg = PRIORITY_CONFIGS[pKey];
                    const isSelected = unit.priority === pKey;
                    return (
                      <button
                        key={pKey}
                        type="button"
                        onClick={() => {
                          onUpdateUnit((prev) => ({
                            ...prev,
                            priority: pKey,
                          }), `Updated priority status to: ${cfg.label}`);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-1 ${cfg.badgeBorder}`
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor} ${cfg.pulse && isSelected ? 'animate-ping' : ''}`} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Registered Constructor & Motorsport Customer Management */}
                <div className="pt-2">
                  {isIntakeAccepted ? (
                    <div className="p-3.5 bg-neutral-950/95 rounded-xl border border-emerald-500/30 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <Lock className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Customer Locked (Intake Accepted)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          LOCKED · IMMUTABLE
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Customer verified and locked upon intake acceptance. To ensure strict quality traceability, customer assignment cannot be changed during overhaul.
                      </p>
                    </div>
                  ) : isEditingCustomer ? (
                    <div className="p-3.5 bg-neutral-950/95 rounded-xl border border-amber-500/60 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                          <span>Select / Change Customer (Locks Upon Intake Acceptance)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingCustomer(false)}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>

                      <CustomerSelector
                        value={unit.customerName}
                        onChange={(val) => {
                          onUpdateUnit((prev) => ({
                            ...prev,
                            customerName: val,
                            supplierCompanyName: val,
                            intake: { ...prev.intake, supplierCompanyName: val },
                          }), `Updated customer to: ${val}`);
                        }}
                        onCategorySelect={(cat) => {
                          onUpdateUnit((prev) => ({
                            ...prev,
                            racingCategory: cat.id,
                          }), `Updated racing category to: ${cat.label}`);
                        }}
                        onContactDetails={(details) => {
                          onUpdateUnit((prev) => ({
                            ...prev,
                            supplierContactName: details.contactName || prev.supplierContactName,
                            intake: {
                              ...prev.intake,
                              supplierContactName: details.contactName || prev.intake.supplierContactName,
                            },
                          }), `Updated customer contact details`);
                        }}
                        label="Customer / Constructor (Change, Register or Delete Wrong Customer)"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-950/90 rounded-xl border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
                          <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                          <span>Registered Customer &amp; Category</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingCustomer(true)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/50 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          title="Change customer or delete wrong customer from database"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Change Customer</span>
                        </button>
                      </div>

                      {(() => {
                        const customerMeta = unit.customerName ? getTeamMetadata(unit.customerName) : null;
                        const catKey = (unit.racingCategory || customerMeta?.categoryId || 'formula1') as RacingCategoryId;
                        const catConfig = MOTORSPORT_CATEGORIES[catKey] || MOTORSPORT_CATEGORIES.formula1;
                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {/* Customer Team */}
                            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
                                  Constructor / Customer
                                </span>
                                <span className="font-bold text-white block truncate">
                                  {unit.customerName || 'Standard Client'}
                                </span>
                              </div>
                              {customerMeta && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${customerMeta.badgeBg} ${customerMeta.badgeText} ${customerMeta.badgeBorder}`}>
                                  {customerMeta.tierLabel.toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Racing Category */}
                            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-semibold">
                                  Homologation Category
                                </span>
                                <span className="font-bold text-neutral-200 block truncate">
                                  {catConfig?.label || unit.racingCategory || 'Formula 1'}
                                </span>
                              </div>
                              {catConfig && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border shrink-0 ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.badgeBorder}`}>
                                  {catConfig.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {onOpenQrModal && (
                    <button
                      type="button"
                      onClick={onOpenQrModal}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-3 w-3 text-amber-400" />
                      <span>Print Workshop Tag</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (unit.qrCode?.dataUrl) {
                        downloadQrCodeImage(unit.qrCode.dataUrl, unit.serialNumber);
                      }
                    }}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3 w-3 text-sky-400" />
                    <span>Download QR (JPG)</span>
                  </button>

                  {onOpenScanner && (
                    <button
                      type="button"
                      onClick={onOpenScanner}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="h-3 w-3 text-amber-400" />
                      <span>Scan QR for New Intake</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BICESTER WORKBENCH CHECK-IN SHEET (DOCUMENT: PS-WORKBENCH-QA-2026) - IN SECTION */}
          <div className="bg-neutral-900 border-2 border-amber-500/40 rounded-xl p-5 space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500/10 to-transparent w-48 h-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded uppercase tracking-wider">
                    {WORKBENCH_DOC_INFO.formCode} · {WORKBENCH_DOC_INFO.documentControlVersion}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded">
                    ISO 9001 &amp; ISO 14001 Registered
                  </span>
                </div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  <span>Bicester Workbench Check-In Log (IN-Sheet)</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Particle Science Ltd component cleanliness process intake specification &amp; inspection checks.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsWorkbenchModalOpen(true)}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                <span>Full Sheet (16 Steps)</span>
              </button>
            </div>

            {/* Component Cleanliness Type Selector (Document Header Checkboxes) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Component Cleanliness Classification</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomCoolerModalOpen(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Define custom cooler option and save for future use"
                  >
                    <Plus className="h-3 w-3" />
                    <span>+ Add Custom Cooler Option</span>
                  </button>
                  <span className="text-[10px] text-neutral-500 font-normal">Check-in Sheet Selection</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {getAllComponentTypes().map((ct) => {
                  const isSelected = currentCompType === ct.id;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => {
                        const isCombiTarget = ct.id === 'combi_2_unit' || ct.id === 'combi_3_unit';
                        const count = ct.id === 'combi_3_unit' ? 3 : 2;
                        onUpdateUnit((prev) => {
                          const newCombi = isCombiTarget 
                            ? (prev.combiConfig?.isCombi && prev.combiConfig.unitCount === count 
                                ? prev.combiConfig 
                                : createDefaultCombiConfig(count, prev.serialNumber, prev.workOrderNumber))
                            : prev.combiConfig;

                          return {
                            ...prev,
                            componentType: ct.id,
                            combiConfig: newCombi,
                            intake: {
                              ...prev.intake,
                              componentType: ct.id,
                            },
                          };
                        }, `Selected component category: ${ct.label}`);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-neutral-100 ring-1 ring-amber-500/40 shadow-sm'
                          : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-amber-200' : 'text-neutral-300'}`}>
                          {ct.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-neutral-400 font-mono">
                            {ct.code} Matrix
                          </span>
                          {ct.isCustom && (
                            <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Heat Exchanger Medium Configuration: Water to Oil, Oil to Oil, Water to Air */}
              {currentCompType === 'heat_exchanger' && (
                <div className="mt-3 p-3.5 bg-cyan-950/30 border border-cyan-800/50 rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="text-xs font-bold text-cyan-200 uppercase font-mono tracking-wider">
                        Heat Exchanger Medium Type Selection:
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 font-bold self-start sm:self-auto">
                      {(unit.heatExchangerMedium || intake.heatExchangerMedium || 'water_to_oil').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Specify the fluid-to-fluid or fluid-to-air medium exchange configuration for this thermal unit to calibrate test pressures and flow dynamics:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'water_to_oil', label: 'Water to Oil', desc: 'Liquid-to-Liquid Matrix', defaultP: 3.0 },
                      { id: 'oil_to_oil', label: 'Oil to Oil', desc: 'Dual-Oil Radiator Core', defaultP: 10.0 },
                      { id: 'water_to_air', label: 'Water to Air', desc: 'Liquid-to-Gas Matrix', defaultP: 2.0 },
                    ].map((opt) => {
                      const isMedSelected = (unit.heatExchangerMedium || intake.heatExchangerMedium || 'water_to_oil') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            onUpdateUnit((prev) => ({
                              ...prev,
                              heatExchangerMedium: opt.id as any,
                              intake: {
                                ...prev.intake,
                                heatExchangerMedium: opt.id as any,
                              },
                            }), `Selected heat exchanger medium: ${opt.label}`);
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isMedSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-white ring-1 ring-cyan-500/40 shadow-sm'
                              : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isMedSelected ? 'text-cyan-200' : 'text-neutral-200'}`}>
                              {opt.label}
                            </span>
                            {isMedSelected && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comby Unit 2 or 3 Multi-Core Architecture Configurator */}
              {(currentCompType === 'combi_2_unit' || currentCompType === 'combi_3_unit' || unit.combiConfig?.isCombi) && (
                <div className="mt-3 p-3.5 bg-purple-950/25 border border-purple-800/40 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-purple-200 uppercase font-mono tracking-wider">
                        Comby Unit Architecture Specification (2 or 3 Units)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60 font-bold self-start sm:self-auto">
                      {unit.combiConfig?.unitCount ?? (currentCompType === 'combi_3_unit' ? 3 : 2)} CORES CONFIGURED
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    This unit is registered as a multi-circuit Comby heat exchanger. Select whether it comprises <strong className="text-purple-300">2 Cores</strong> (Dual-Circuit) or <strong className="text-purple-300">3 Cores</strong> (Triple-Circuit). Each core possesses independent fluid circuits, pressure containment limits, and flow calibration curves.
                  </p>

                  {/* 2 vs 3 units selector toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          componentType: 'combi_2_unit',
                          combiConfig: createDefaultCombiConfig(2, prev.serialNumber, prev.workOrderNumber),
                          intake: { ...prev.intake, componentType: 'combi_2_unit' },
                        }), 'Converted Comby Unit to 2-Core Configuration');
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        (unit.combiConfig?.unitCount === 2 || currentCompType === 'combi_2_unit')
                          ? 'bg-purple-600/25 border-purple-400 text-purple-100 ring-1 ring-purple-400/40'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Comby 2-Unit Assembly</span>
                        {(unit.combiConfig?.unitCount === 2 || currentCompType === 'combi_2_unit') && (
                          <span className="text-[10px] font-mono text-purple-300 font-bold">[ACTIVE]</span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-300 mt-1.5 space-y-0.5 font-mono">
                        <div>• Core 1: Water Radiator (4.0 Bar)</div>
                        <div>• Core 2: Engine Oil Cooler (16.0 Bar)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          componentType: 'combi_3_unit',
                          combiConfig: createDefaultCombiConfig(3, prev.serialNumber, prev.workOrderNumber),
                          intake: { ...prev.intake, componentType: 'combi_3_unit' },
                        }), 'Converted Comby Unit to 3-Core Configuration');
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        (unit.combiConfig?.unitCount === 3 || currentCompType === 'combi_3_unit')
                          ? 'bg-purple-600/25 border-purple-400 text-purple-100 ring-1 ring-purple-400/40'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">Comby 3-Unit Assembly</span>
                        {(unit.combiConfig?.unitCount === 3 || currentCompType === 'combi_3_unit') && (
                          <span className="text-[10px] font-mono text-purple-300 font-bold">[ACTIVE]</span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-300 mt-1.5 space-y-0.5 font-mono">
                        <div>• Core 1: Water Radiator (4.0 Bar)</div>
                        <div>• Core 2: Engine Oil Cooler (16.0 Bar)</div>
                        <div>• Core 3: Gearbox / Intercooler (8.0 Bar)</div>
                      </div>
                    </button>
                  </div>

                  {/* Interactive Combi Core Type Selectors for each circuit */}
                  <div className="p-3 bg-neutral-900/90 rounded-xl border border-purple-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider block">
                        Configure Core Unit Types in Combi:
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {(unit.combiConfig?.subUnits || []).length} Circuits Configured
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {(unit.combiConfig?.subUnits || []).map((sub, idx) => (
                        <div
                          key={sub.id || idx}
                          className="p-3 bg-neutral-950 rounded-lg border border-purple-900/40 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-neutral-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-purple-400" />
                              <span className="font-bold text-xs text-neutral-200">
                                Core #{sub.unitIndex || idx + 1}: {sub.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">
                              Serial: {sub.serialNumber || `${unit.serialNumber}-U${idx + 1}`}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                                Core Unit Type:
                              </label>
                              <select
                                value={sub.componentType}
                                onChange={(e) => {
                                  const newType = e.target.value as ComponentType;
                                  onUpdateUnit((prev) => {
                                    const cfg = prev.combiConfig || createDefaultCombiConfig(2, prev.serialNumber, prev.workOrderNumber);
                                    const updatedSubs = cfg.subUnits.map((s, sIdx) => {
                                      if (sIdx === idx) {
                                        const newSpec = getSubUnitDefaultSpec(newType, idx + 1, prev.serialNumber);
                                        return {
                                          ...newSpec,
                                          name: s.name.startsWith('Unit') ? newSpec.name : s.name,
                                          serialNumber: s.serialNumber || newSpec.serialNumber,
                                        };
                                      }
                                      return s;
                                    });
                                    return {
                                      ...prev,
                                      combiConfig: {
                                        ...cfg,
                                        subUnits: updatedSubs,
                                      },
                                    };
                                  }, `Updated Combi Core #${idx + 1} type to ${newType}`);
                                }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-purple-400"
                              >
                                <option value="water_radiator">Water Radiator Core (~4.0 Bar)</option>
                                <option value="oil_cooler">Engine Oil Cooler Core (~16.0 Bar)</option>
                                <option value="intercooler">Intercooler / Charge Air Core (~8.0 Bar)</option>
                                <option value="heat_exchanger">Auxiliary Heat Exchanger (~6.0 Bar)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono text-neutral-400 block mb-1">
                                Circuit Designation / Name:
                              </label>
                              <input
                                type="text"
                                value={sub.name}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  onUpdateUnit((prev) => {
                                    const cfg = prev.combiConfig;
                                    if (!cfg) return prev;
                                    const updatedSubs = cfg.subUnits.map((s, sIdx) =>
                                      sIdx === idx ? { ...s, name: newName } : s
                                    );
                                    return {
                                      ...prev,
                                      combiConfig: { ...cfg, subUnits: updatedSubs },
                                    };
                                  });
                                }}
                                placeholder={`e.g. Unit ${idx + 1}: Left Radiator`}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-purple-400"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-900">
                            <span>
                              Test Fluid: <strong className="text-neutral-300">{sub.flowTest?.fluidType || 'Standard'}</strong>
                            </span>
                            <span>
                              Proof Pressure: <strong className="text-purple-300">{sub.pressureTest?.testPressureBar ?? (sub.componentType === 'oil_cooler' ? 16 : 4)} Bar</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Header Intake Data Log Fields */}
            <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg p-3.5 space-y-3">
              <span className="text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                Workbench Receipt Metadata &amp; Supplier Credentials
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Inspector Name / Initial
                  </label>
                  <input
                    type="text"
                    value={intake.inspectorNameOrInitial ?? intake.technician ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, inspectorNameOrInitial: val },
                      }));
                    }}
                    placeholder="e.g. N. Malgarotti / NM"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Date of Entry
                  </label>
                  <input
                    type="text"
                    value={intake.dateOfEntry ?? '02 / 10 / 2026'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, dateOfEntry: val },
                      }));
                    }}
                    placeholder="DD / MM / 2026"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Job / Order Number
                  </label>
                  <input
                    type="text"
                    value={unit.jobOrderNumber ?? intake.jobOrderNumber ?? unit.workOrderNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        jobOrderNumber: val,
                        intake: { ...prev.intake, jobOrderNumber: val },
                      }));
                    }}
                    placeholder="e.g. JB-2026-981"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Component Serial No
                  </label>
                  <input
                    type="text"
                    value={unit.serialNumber}
                    readOnly
                    className="w-full bg-neutral-900/60 border border-neutral-800/60 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  {isIntakeAccepted ? (
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400 block font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Customer / Constructor (Locked)</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          Intake Accepted · Locked
                        </span>
                      </label>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/80 border border-neutral-800">
                        <span className="font-bold text-white text-xs">{unit.customerName || 'Standard Client'}</span>
                        {unit.customerName && (() => {
                          const meta = getTeamMetadata(unit.customerName);
                          return meta ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                              {meta.tierLabel.toUpperCase()}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <CustomerSelector
                      value={unit.customerName}
                      onChange={(val) => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          customerName: val,
                          supplierCompanyName: val,
                          intake: { ...prev.intake, supplierCompanyName: val },
                        }), `Updated customer name: ${val}`);
                      }}
                      onCategorySelect={(cat) => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          racingCategory: cat.id,
                          racingType: cat.racingTypes[0] || prev.racingType,
                        }), `Updated racing category: ${cat.label}`);
                      }}
                      onContactDetails={(details) => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          supplierContactName: details.contactName || prev.supplierContactName,
                          intake: {
                            ...prev.intake,
                            supplierContactName: details.contactName || prev.intake.supplierContactName,
                          },
                        }), `Updated customer contact details`);
                      }}
                      label="Customer / Constructor (Homologated or Register New)"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Supplier Contact Name
                  </label>
                  <input
                    type="text"
                    value={unit.supplierContactName ?? intake.supplierContactName ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        supplierContactName: val,
                        intake: { ...prev.intake, supplierContactName: val },
                      }));
                    }}
                    placeholder="e.g. Marco Rossi (Chief Mech)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Document Step 1: Initial Inspection: General Damage Check */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">Step 1:</span>
                    <span>Initial Inspection: General Damage Check</span>
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Full visual and structural integrity check. Ensure no outer cracks or deformities.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, damageCheckStatus: 'PASS' },
                      }), 'Initial damage inspection: PASS');
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      intake.damageCheckStatus !== 'DAMAGE_FOUND'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, damageCheckStatus: 'DAMAGE_FOUND' },
                      }), 'Initial damage inspection: DAMAGE FOUND');
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      intake.damageCheckStatus === 'DAMAGE_FOUND'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-rose-300'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>Damage Found</span>
                  </button>
                </div>
              </div>

              {/* Red callout as explicitly mandated on the document: "*Report immediately if damage found!" */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span>*Report immediately if damage found!</span>
                </span>
                <span className="text-[10px] font-mono text-rose-300/80">Depot QA Protocol QA-2026</span>
              </div>

              {intake.damageCheckStatus === 'DAMAGE_FOUND' && (
                <div className="space-y-1 pt-1 animate-fadeIn">
                  <label className="text-[11px] font-medium text-rose-300 block">
                    Observed Structural Damage / Deformation Details:
                  </label>
                  <input
                    type="text"
                    value={intake.damageDetails ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, damageDetails: val },
                      }));
                    }}
                    placeholder="Describe bent brackets, cracked inlet necks, matrix puncture, or galling..."
                    className="w-full bg-neutral-900 border border-rose-500/40 rounded px-3 py-1.5 text-xs text-rose-200 placeholder:text-rose-900/60 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>

            {/* Box & Packaging Reception Inspection (With Mandatory Photos) */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider block">
                      Box &amp; Packaging Reception Inspection
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Record transport container type &amp; condition. Photographic proof required.
                    </p>
                  </div>
                </div>

                {/* Picture Evidence Requirement Status Banner */}
                {((intake.boxInspection?.photos?.length || 0) === 0) ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span>PICTURE MUST BE TAKEN</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <CheckSquare className="h-3 w-3 text-emerald-400" />
                    <span>PHOTO EVIDENCE SECURED ({intake.boxInspection?.photos?.length} PICS)</span>
                  </span>
                )}
              </div>

              {/* Box Type Selection Buttons */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 block text-[11px] font-medium">
                  Type of Box / Container:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'cardboard', label: 'Cardboard Box' },
                    { id: 'wooden_crate', label: 'Wooden Crate' },
                    { id: 'flight_case', label: 'Flight Case' },
                    { id: 'aluminium_case', label: 'Aluminium Case' },
                    { id: 'hard_case', label: 'Hard Pelicase' },
                    { id: 'soft_case', label: 'Soft Case / Bag' },
                    { id: 'bubble_wrap', label: 'Bubble Wrap' },
                    { id: 'dry_box', label: 'Dry Box' },
                    { id: 'wet_box', label: 'Wet Box' },
                  ].map((box) => {
                    const isSelected = (intake.boxInspection?.boxType || 'cardboard') === box.id;
                    return (
                      <button
                        key={box.id}
                        type="button"
                        onClick={() => {
                          const autoMoisture = box.id === 'wet_box' ? 'wet' : box.id === 'dry_box' ? 'dry' : intake.boxInspection?.moistureState || 'dry';
                          onUpdateUnit((prev) => ({
                            ...prev,
                            intake: {
                              ...prev.intake,
                              boxInspection: {
                                ...prev.intake.boxInspection,
                                boxType: box.id,
                                condition: autoMoisture === 'wet' ? 'wet' : (prev.intake.boxInspection?.condition || 'intact'),
                                moistureState: autoMoisture,
                                notes: prev.intake.boxInspection?.notes || '',
                                photos: prev.intake.boxInspection?.photos || [],
                                photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                                inspectedAt: new Date().toISOString(),
                                inspector: prev.intake.technician || 'Nicola Malgarotti',
                              },
                            },
                          }), `Updated box type to: ${box.label}`);
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-xs'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {box.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Box Moisture Condition: Wet Box vs Dry Box */}
              <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-300 block text-[11px] font-medium">
                    Box Moisture Condition (Wet or Dry Box):
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${
                    intake.boxInspection?.moistureState === 'wet' ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {intake.boxInspection?.moistureState === 'wet' ? '⚠ WET BOX (MOISTURE DETECTED)' : '✓ DRY BOX (CLEAN)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            ...prev.intake.boxInspection,
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            moistureState: 'dry',
                            condition: prev.intake.boxInspection?.condition === 'wet' ? 'intact' : (prev.intake.boxInspection?.condition || 'intact'),
                            notes: prev.intake.boxInspection?.notes || '',
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                            inspectedAt: new Date().toISOString(),
                            inspector: prev.intake.technician || 'Nicola Malgarotti',
                          },
                        },
                      }), 'Box verified as: Dry Box');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      (intake.boxInspection?.moistureState || 'dry') === 'dry'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40 shadow-xs'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>✓ Dry Box (Clean / No Moisture)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            ...prev.intake.boxInspection,
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            moistureState: 'wet',
                            condition: 'wet',
                            notes: prev.intake.boxInspection?.notes ? `${prev.intake.boxInspection.notes} (Wet container)` : 'Wet box received with moisture / fluid ingress',
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                            inspectedAt: new Date().toISOString(),
                            inspector: prev.intake.technician || 'Nicola Malgarotti',
                          },
                        },
                      }), 'Box flagged as: Wet Box (Moisture Ingress)');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      intake.boxInspection?.moistureState === 'wet'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500/40 shadow-xs'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-rose-300'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span>⚠ Wet Box (Moisture Ingress / Damp)</span>
                  </button>
                </div>

                {/* Wet Box Notice */}
                {intake.boxInspection?.moistureState === 'wet' && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[11px] flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">WET BOX DETECTED ON ARRIVAL:</strong>
                      Inspect core face, bungs, and fluid ports immediately for liquid or chemical ingress. Ensure packaging photos clearly show the damp or water-damaged container.
                    </div>
                  </div>
                )}
              </div>

              {/* Box Condition & Packaging State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1 border-t border-neutral-800/80">
                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Packaging Physical State:
                  </label>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                    {[
                      { id: 'intact', label: '✓ Intact / Dry' },
                      { id: 'wet', label: '⚠ Wet / Damp' },
                      { id: 'dented', label: '⚠ Dented / Crushed' },
                      { id: 'ripped', label: '⚠ Ripped / Torn' },
                    ].map((cond) => {
                      const isCondSel = (intake.boxInspection?.condition || 'intact') === cond.id;
                      return (
                        <button
                          key={cond.id}
                          type="button"
                          onClick={() => {
                            onUpdateUnit((prev) => ({
                              ...prev,
                              intake: {
                                ...prev.intake,
                                boxInspection: {
                                  boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                                  ...prev.intake.boxInspection,
                                  condition: cond.id as any,
                                  moistureState: cond.id === 'wet' ? 'wet' : (prev.intake.boxInspection?.moistureState || 'dry'),
                                  photos: prev.intake.boxInspection?.photos || [],
                                  photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                                  inspectedAt: new Date().toISOString(),
                                  inspector: prev.intake.technician || 'Nicola Malgarotti',
                                },
                              },
                            }));
                          }}
                          className={`py-1 px-1.5 rounded border text-left cursor-pointer transition-colors ${
                            isCondSel
                              ? cond.id === 'wet'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                                : 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {cond.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Security Seal Integrity:
                  </label>
                  <select
                    value={intake.boxInspection?.securitySealStatus || 'intact'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            securitySealStatus: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="intact">✓ Intact Security Tape / Seal</option>
                    <option value="tampered">⚠ Tampered / Cut Seal</option>
                    <option value="re_taped">⚠ Re-Taped by Courier</option>
                    <option value="standard_tape">Standard Packing Tape</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Internal Cushioning Material:
                  </label>
                  <select
                    value={intake.boxInspection?.internalPackaging || 'custom_foam'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            internalPackaging: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="custom_foam">Custom CNC Foam Insert</option>
                    <option value="bubble_wrap">Industrial Bubble Wrap</option>
                    <option value="molded_pulp">Molded Pulp Endcaps</option>
                    <option value="loose_fill">Loose Fill Packaging</option>
                    <option value="none">None / Direct Metal-on-Box</option>
                  </select>
                </div>
              </div>

              {/* Box Physical Dimensions, Weight & Carrier (No Tracking/Waybill on intake) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-neutral-800/80">
                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Box Dimensions (L × W × H cm):
                  </label>
                  <input
                    type="text"
                    value={intake.boxInspection?.boxDimensionsCm || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            boxDimensionsCm: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    placeholder="e.g. 62 × 38 × 16 cm"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Gross Box Weight (kg):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={intake.boxInspection?.grossWeightKg ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Number(e.target.value);
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            grossWeightKg: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    placeholder="e.g. 5.8 kg"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Transport Carrier / Courier:
                  </label>
                  <input
                    type="text"
                    value={intake.boxInspection?.carrierName || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            carrierName: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    placeholder="e.g. DHL Express / FedEx / Team Van"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Environmental Indicators & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-neutral-800/80">
                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Desiccant Pack State:
                  </label>
                  <select
                    value={intake.boxInspection?.desiccantStatus || 'active_dry'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            desiccantStatus: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="active_dry">✓ Active Dry Desiccant Present</option>
                    <option value="saturated">⚠ Saturated / Pink (Moisture)</option>
                    <option value="none">None Present</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Shock / Tip Indicator:
                  </label>
                  <select
                    value={intake.boxInspection?.shockIndicator || 'intact'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            shockIndicator: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="intact">✓ Intact (Zero Shock Event)</option>
                    <option value="tripped">⚠ Tripped (Impact Detected)</option>
                    <option value="none">No Indicator Fitted</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block text-[11px] mb-1 font-medium">
                    Packaging Notes / Transit Damage:
                  </label>
                  <input
                    type="text"
                    value={intake.boxInspection?.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          boxInspection: {
                            boxType: prev.intake.boxInspection?.boxType || 'cardboard',
                            ...prev.intake.boxInspection,
                            notes: val,
                            photos: prev.intake.boxInspection?.photos || [],
                            photoTaken: (prev.intake.boxInspection?.photos?.length || 0) > 0,
                          },
                        },
                      }));
                    }}
                    placeholder="e.g. Courier tape intact, minor corner crushing"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* Photo Evidence Capture Controls */}
              <div className="pt-1.5 border-t border-neutral-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-300 font-medium flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-amber-400" />
                    <span>Box Evidence Pictures (Mandatory):</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={boxFileInputRef}
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleBoxPhotoUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => boxFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Upload camera photo of arriving container"
                    >
                      <Camera className="h-3.5 w-3.5 text-amber-400" />
                      <span>Take / Upload Box Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateMockBoxPhoto}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Generate digital inspection schematic verification photo"
                    >
                      <Sparkles className="h-3 w-3 text-sky-400" />
                      <span>Log Schematic Photo</span>
                    </button>
                  </div>
                </div>

                {/* Box Photo Gallery Preview */}
                {(intake.boxInspection?.photos && intake.boxInspection.photos.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-fadeIn">
                    {intake.boxInspection.photos.map((ph, pIdx) => (
                      <div key={ph.id || pIdx} className="group relative rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
                        <img
                          src={ph.url}
                          alt={ph.name}
                          className="h-20 w-full object-cover"
                        />
                        <div className="p-1 bg-neutral-950/90 text-[9px] font-mono text-neutral-300 truncate">
                          {ph.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateUnit((prev) => {
                              const existing = prev.intake.boxInspection?.photos || [];
                              const updated = existing.filter((_, idx) => idx !== pIdx);
                              return {
                                ...prev,
                                intake: {
                                  ...prev.intake,
                                  boxInspection: {
                                    ...prev.intake.boxInspection!,
                                    photos: updated,
                                    photoTaken: updated.length > 0,
                                  },
                                },
                              };
                            }, 'Removed box inspection photo');
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Document Step 2: Core Protection Covers & Port Bungs */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2.5">
              <div>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-mono text-amber-400">Step 2:</span>
                  <span>Core Protection Covers &amp; Port Bungs</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Verify protection status upon arrival. Check all entrance and exit lines.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* Covers option */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Protection Covers Material:
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    {(['cardboard', 'metal', 'plastic', 'none', 'other'] as const).map((cov) => {
                      const isSel = (intake.protectionCovers || 'metal') === cov;
                      return (
                        <button
                          key={cov}
                          type="button"
                          onClick={() => {
                            onUpdateUnit((prev) => ({
                              ...prev,
                              intake: { ...prev.intake, protectionCovers: cov },
                            }), `Updated core protection covers to: ${cov}`);
                          }}
                          className={`py-1.5 px-1 rounded border text-center font-mono font-bold text-[10px] capitalize cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {cov}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bungs/Caps Supplied */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Bungs / Caps Supplied on Arrival:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          intake: {
                            ...prev.intake,
                            bungsCapsSupplied: true,
                            bungsCapsStatus: 'yes',
                          },
                        }), 'Bungs/Caps verified supplied: Yes Full');
                      }}
                      className={`py-1.5 px-1 rounded border text-center font-mono font-bold text-[10px] cursor-pointer transition-colors ${
                        (intake.bungsCapsStatus === 'yes' || (intake.bungsCapsSupplied === true && intake.bungsCapsStatus !== 'partial'))
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      [✓] Yes Full
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          intake: {
                            ...prev.intake,
                            bungsCapsSupplied: 'partial',
                            bungsCapsStatus: 'partial',
                          },
                        }), 'Bungs/Caps verified supplied: Partial Bungs');
                      }}
                      className={`py-1.5 px-1 rounded border text-center font-mono font-bold text-[10px] cursor-pointer transition-colors ${
                        (intake.bungsCapsStatus === 'partial' || intake.bungsCapsSupplied === 'partial')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      [~] Partial
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          intake: {
                            ...prev.intake,
                            bungsCapsSupplied: false,
                            bungsCapsStatus: 'no',
                          },
                        }), 'Bungs/Caps verified supplied: None / Missing');
                      }}
                      className={`py-1.5 px-1 rounded border text-center font-mono font-bold text-[10px] cursor-pointer transition-colors ${
                        (intake.bungsCapsStatus === 'no' || (intake.bungsCapsSupplied === false && intake.bungsCapsStatus !== 'partial'))
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      [✗] None
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Step 3 & Step 4: Interface O-Rings & Connection Fittings Inventory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Step 3 */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-mono text-amber-400">Step 3:</span>
                  <span>Interface O-Rings Verification</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Log unique identification configuration tags for fitting ends.
                </p>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    O-Ring ID No: <span className="text-neutral-500 font-mono">(Leave blank if not supplied)</span>
                  </label>
                  <input
                    type="text"
                    value={intake.oRingIdNo ?? 'OR-70-FKM-22'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, oRingIdNo: val },
                      }));
                    }}
                    placeholder="e.g. OR-70-FKM-22 or leave blank"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2">
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-mono text-amber-400">Step 4:</span>
                  <span>Connection Fittings Inventory Log</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Record structural interface connection pieces tracking codes.
                </p>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Inhouse Part No:
                  </label>
                  <input
                    type="text"
                    value={unit.inhousePartNo ?? intake.inhousePartNo ?? `PS-${currentCompType.toUpperCase().slice(0, 3)}-${unit.partNumber}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        inhousePartNo: val,
                        intake: { ...prev.intake, inhousePartNo: val },
                      }));
                    }}
                    placeholder="e.g. PS-HEX-940-A"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Document Step 8: Fluid Flow Routing & Vector Alignment Analysis */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">Step 8:</span>
                    <span>Fluid Flow Routing, Vector Alignment &amp; Flow Drawing</span>
                  </span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Upload CAD schematic, engineering blueprint, or photo of flow circuit taken on bench.
                  </p>
                </div>

                {intake.isFirstService === true && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> First Service Flow Record
                  </span>
                )}
              </div>

              {/* Uploaded Flow Drawing / Picture Preview Card or Upload Zone */}
              {unit.flowDrawingUrl || intake.flowDrawingUrl ? (
                <div className="bg-neutral-900 border border-neutral-700/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative group shrink-0">
                    <img
                      src={unit.flowDrawingUrl || intake.flowDrawingUrl}
                      alt={unit.flowDrawingTitle || intake.flowDrawingTitle || 'Flow Drawing'}
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg border border-neutral-700 bg-neutral-950 cursor-pointer group-hover:opacity-90 transition-opacity"
                      onClick={() => setIsDrawingModalOpen(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsDrawingModalOpen(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg transition-opacity cursor-pointer"
                      title="Enlarge Flow Drawing"
                    >
                      <ZoomIn className="h-5 w-5 text-amber-400" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Compass className="h-3 w-3" />
                        FLOW DRAWING ATTACHED
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveFlowDrawing}
                        className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Remove flow drawing"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-neutral-100 truncate">
                      {unit.flowDrawingTitle || intake.flowDrawingTitle || 'Engineering Flow Circuit Drawing'}
                    </h4>
                    <p className="text-[11px] font-mono text-neutral-400">
                      Drawing No: <span className="text-neutral-200">{unit.drawingNumber || intake.drawingNumber || 'DWG-2026-F1-08'}</span>
                    </p>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsDrawingModalOpen(true)}
                        className="px-2.5 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-200 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-400" />
                        <span>Inspect Full Blueprint</span>
                      </button>

                      <label className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border border-neutral-700">
                        <Upload className="h-3 w-3 text-neutral-400" />
                        <span>Replace</span>
                        <input
                          type="file"
                          accept="image/*,.svg,.pdf"
                          onChange={handleFlowDrawingUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-sky-500/30 bg-sky-950/10 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="h-9 w-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                        <Compass className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-sky-300">
                          Upload Flow Drawing or Picture of Flow
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Attach CAD schematic, engineering blueprint, or photo of flow ports taken on bench.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="flex-1 sm:flex-none px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm">
                        <Upload className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Upload Drawing / Picture</span>
                        <input
                          type="file"
                          accept="image/*,.svg,.pdf"
                          onChange={handleFlowDrawingUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleGenerateStandardFlowDrawing}
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Generate standard SVG schematic"
                      >
                        <Sparkles className="h-3 w-3 text-amber-400" />
                        <span>Standard CAD</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawing No & Flow Vector Verification Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center text-xs pt-1">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Blueprint Drawing No:
                  </label>
                  <input
                    type="text"
                    value={unit.drawingNumber ?? intake.drawingNumber ?? 'DWG-2026-F1-08'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        drawingNumber: val,
                        intake: { ...prev.intake, drawingNumber: val },
                      }));
                    }}
                    placeholder="e.g. DWG-2026-F1-08"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: {
                          ...prev.intake,
                          flowVectorDirectionVerified: !(prev.intake.flowVectorDirectionVerified !== false),
                        },
                      }), 'Toggled flow vector direction match verification');
                    }}
                    className={`w-full p-2 rounded-lg border flex items-center gap-2 transition-colors cursor-pointer text-left ${
                      intake.flowVectorDirectionVerified !== false
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {intake.flowVectorDirectionVerified !== false ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold leading-tight">
                      Flow Vector Direction Match Verified
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Document Step 5 (In-Sheet): Baseline Intake Pressure Test & Medium Specification */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Gauge className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="font-mono text-amber-400">Step 5 (In-Sheet):</span>
                      <span>Baseline Intake Pressure Test Specification</span>
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Specify the pressure test medium and target proof test pressure (Bar) for this intake.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Test Inputs Grid: Only Medium and Proof Test Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Test Medium */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-300 block">
                    Pressure Test Medium
                  </label>
                  <select
                    value={incomingPressure.medium || 'nitrogen'}
                    onChange={(e) => updateIncomingPressureTest('medium', e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                  >
                    <option value="nitrogen">Nitrogen (N₂) Immersion Gas</option>
                    <option value="helium">Helium (He) Mass Spec Gas</option>
                    <option value="dry_air">Clean Dry Air (Filtered)</option>
                    <option value="water">Hydrostatic Deionized Water</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 block">
                    Primary test fluid/gas injected into cavity for pressure containment.
                  </span>
                </div>

                {/* Proof Pressure Target (Bar) */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-300 block">
                    Proof Test Pressure (Bar)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={incomingPressure.testPressureBar ?? (unit.componentType === 'oil_cooler' ? 16.0 : 4.0)}
                      onChange={(e) => updateIncomingPressureTest('testPressureBar', Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 font-mono text-neutral-100 font-bold focus:outline-none focus:border-amber-500 text-xs"
                    />
                    <span className="absolute right-3 top-2 text-[11px] font-mono font-bold text-amber-400">
                      ≈ {Math.round((incomingPressure.testPressureBar || 4.0) * 14.5038)} PSI
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 block">
                    Target baseline holding pressure proof envelope.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: First Service Assessment Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
                  Service Cycle Assessment
                </h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Depot SOP § 3.1</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Identify whether this unit is undergoing its <strong>First Service</strong> (initial OEM commissioning / break-in service) or a <strong>Repeat Service</strong> (scheduled overhaul, mid-life rotation, or field warranty).
            </p>

            {/* Assessment Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleServiceTypeChange(true)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  intake.isFirstService === true
                    ? 'bg-amber-500/10 border-amber-500 text-neutral-100 ring-1 ring-amber-500/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase text-amber-400">
                    Cycle Option A
                  </span>
                  {intake.isFirstService === true && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
                <div className="text-sm font-bold text-neutral-100">
                  Initial / First Service
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Brand new assembly or initial runtime inspection. Baseline measurements logged for unit birth history.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleServiceTypeChange(false)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  intake.isFirstService === false
                    ? 'bg-sky-500/10 border-sky-500 text-neutral-100 ring-1 ring-sky-500/50'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold uppercase text-sky-400">
                    Cycle Option B
                  </span>
                  {intake.isFirstService === false && (
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                  )}
                </div>
                <div className="text-sm font-bold text-neutral-100">
                  Repeat / Scheduled Overhaul
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  Unit has prior operational hours. Full strip, chemical degrease, particle cleanliness check, and requalification.
                </div>
              </button>
            </div>

            {/* Assessment Details & Prior History Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Operational Run Hours
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={intake.hoursInOperation ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        intake: { ...prev.intake, hoursInOperation: val },
                      }));
                    }}
                    placeholder={intake.isFirstService ? '0 (New)' : 'e.g. 3450'}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-neutral-500 font-mono">
                    hours
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Previous Service Record Ref
                </label>
                <input
                  type="text"
                  value={intake.previousServiceRecordNumber ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      intake: { ...prev.intake, previousServiceRecordNumber: val },
                    }));
                  }}
                  placeholder={intake.isFirstService ? 'N/A (First Service)' : 'SR-2024-1189'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Visual Intake Media (Photos & Video) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="h-4 w-4 text-amber-400" />
                  Intake Media (Photos & Video)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Capture unboxing condition, port protective caps, serial nameplate, and any transit damage.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveCameraModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="Open Live Workshop Camera Viewfinder & Snapshot"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Cam Snapshot</span>
                </button>
              </div>
            </div>

            {/* Custom caption input before upload */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPhotoCaption}
                onChange={(e) => setCustomPhotoCaption(e.target.value)}
                placeholder="Optional tag/caption for next upload (e.g. 'Damage to mounting lug #2')"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Auto-Resizing space saver status */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/90 rounded-lg border border-neutral-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Auto-Resizing Active</span>
              </div>
              <span className="text-neutral-500 font-mono">Photos automatically resized &amp; compressed (~95% saved)</span>
            </div>

            {/* Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Photo Upload Input */}
              <label className="flex items-center justify-center gap-2 p-3 bg-neutral-950/70 hover:bg-neutral-950 border border-dashed border-neutral-700 hover:border-amber-500/70 rounded-xl cursor-pointer transition-colors text-xs text-neutral-300">
                <Camera className="h-4 w-4 text-amber-400" />
                <span className="font-medium">Upload Photos</span>
                <span className="text-[10px] text-neutral-500 font-mono">(PNG, JPG)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />
              </label>

              {/* Flow Drawing / Circuit Picture Upload Input */}
              <label className="flex items-center justify-center gap-2 p-3 bg-neutral-950/70 hover:bg-neutral-950 border border-dashed border-neutral-700 hover:border-sky-500/70 rounded-xl cursor-pointer transition-colors text-xs text-neutral-300">
                <Compass className="h-4 w-4 text-sky-400" />
                <span className="font-medium">Flow Drawing</span>
                <span className="text-[10px] text-neutral-500 font-mono">(CAD, Photo)</span>
                <input
                  type="file"
                  accept="image/*,.svg,.pdf"
                  onChange={handleFlowDrawingUpload}
                  className="hidden"
                />
              </label>

              {/* Video Upload Input */}
              <label className="flex items-center justify-center gap-2 p-3 bg-neutral-950/70 hover:bg-neutral-950 border border-dashed border-neutral-700 hover:border-purple-500/70 rounded-xl cursor-pointer transition-colors text-xs text-neutral-300">
                <Video className="h-4 w-4 text-purple-400" />
                <span className="font-medium">Upload Video</span>
                <span className="text-[10px] text-neutral-500 font-mono">(MP4, MOV)</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo Gallery Grid */}
            {intake.photos.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-neutral-400 block mb-2">
                  Inspection Photos ({intake.photos.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {intake.photos.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 hover:border-neutral-700"
                    >
                      <img
                        src={item.url}
                        alt={item.caption || item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-24 object-cover cursor-pointer"
                        onClick={() => setSelectedMediaPreview(item)}
                      />
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-neutral-200 truncate">
                          {item.caption || item.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono">
                          {new Date(item.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(item.id, false)}
                        className="absolute top-1.5 right-1.5 p-1 bg-neutral-900/80 hover:bg-rose-900 text-neutral-400 hover:text-rose-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete photo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video List */}
            {intake.videos.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-neutral-400 block mb-2">
                  Inspection Video Records ({intake.videos.length})
                </span>
                <div className="space-y-2">
                  {intake.videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="flex items-center justify-between p-3 bg-neutral-950 rounded-lg border border-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                          <Video className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-neutral-200">
                            {vid.caption || vid.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 font-mono">
                            Inspection Survey Video · {new Date(vid.uploadedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMediaPreview(vid)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Play
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMedia(vid.id, true)}
                          className="p-1 hover:text-rose-400 text-neutral-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Intake Comments & Observations */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              Intake Comments & Technician Observations
            </h3>
            <textarea
              rows={3}
              value={intake.comments}
              onChange={(e) => handleCommentsChange(e.target.value)}
              onBlur={handleCommentsBlur}
              placeholder="Record initial physical condition, packaging status, received-in leaks, carbon soot, or customer special notes..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span>Technician: {intake.technician}</span>
              <span>Auto-saved locally</span>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Checklist & Downstream Process Configuration */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 4: Process Workflow Planner ("allows me to set the rest of the process") */}
          <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-5 space-y-4">
            {/* Process Routing & Configuration Header */}
            <div className="flex items-center gap-2 pb-1 border-b border-neutral-800">
              <Settings2 className="h-4 w-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
                  Process Routing & Configuration
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Configure required stages for this unit. <strong className="text-amber-300">Stages marked 'Required' cannot be skipped during the overhaul process.</strong>
                </p>
              </div>
            </div>

            {/* Stage Routing Toggles List */}
            <div className="space-y-2 text-xs">
              {/* Stage 02: Degreasing */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 02: Degreasing</span>
                  <span className="text-[10.5px] text-neutral-400">Room-temp chemical solvent matrix flow-through</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('degreasingRequired', !config.degreasingRequired)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.degreasingRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.degreasingRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>

              {/* Stage 03: Descaling & Internal Core Passages Cleaning (In between Degreasing & First Flush) */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-200 block">Stage 03: Descaling</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-bold">
                      Optional Protocol
                    </span>
                  </div>
                  <span className="text-[10.5px] text-neutral-400 block mt-0.5">
                    Deep chemical descaling to dissolve internal matrix deposits · Select if needed or bypassed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextRequired = (config.cleaningRequired === false || config.descalingRequired === false) ? true : false;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      processConfig: {
                        ...prev.processConfig,
                        cleaningRequired: nextRequired,
                        descalingRequired: nextRequired,
                      },
                      cleaning: {
                        ...prev.cleaning,
                        skipped: !nextRequired,
                        completedAt: !nextRequired ? (prev.cleaning.completedAt || new Date().toISOString()) : undefined,
                      },
                    }), nextRequired ? 'Stage 03: Descaling marked REQUIRED' : 'Stage 03: Descaling marked NOT NEEDED (Bypassed)');
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.cleaningRequired !== false && config.descalingRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {config.cleaningRequired !== false && config.descalingRequired !== false ? 'Descaling Required' : 'Descaling Not Needed (Bypassed)'}
                </button>
              </div>

              {/* Config: Descaling Mode Selector (With or Without Analysis) */}
              {config.cleaningRequired !== false && config.descalingRequired !== false && (
                <div className="p-2.5 bg-neutral-950/80 rounded-lg border border-neutral-800/80 space-y-1.5 ml-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-300">
                      Descaling Analysis Specification
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      Stage 03 Spec
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig('cleaningMode', 'without_analysis')}
                      className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                        config.cleaningMode === 'without_analysis'
                          ? 'bg-neutral-800 border-neutral-600 text-neutral-100 font-semibold'
                          : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Without Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => updateConfig('cleaningMode', 'with_analysis')}
                      className={`py-1.5 px-2 text-[11px] font-medium rounded-lg border text-center transition-colors cursor-pointer ${
                        config.cleaningMode === 'with_analysis'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                          : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      With Apex 1.0 Analysis
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 04: First Flush */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 04: First Flush (55°C DI)</span>
                  <span className="text-[10.5px] text-neutral-400">Post-degrease &amp; descale neutralization flush</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('firstFlushRequired', config.firstFlushRequired === false ? true : false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.firstFlushRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.firstFlushRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>

              {/* Stage 05: Flow Testing */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 05: Flow Testing</span>
                  <span className="text-[10.5px] text-neutral-400">
                    {isIntercooler ? 'Exempt from liquid test (Air-to-Air Core)' : '5-Point frequency flow & delta P calibration curve'}
                  </span>
                </div>
                {isIntercooler ? (
                  <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                    Exempt
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateConfig('flowTestRequired', config.flowTestRequired === false ? true : false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                      config.flowTestRequired !== false
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {config.flowTestRequired !== false ? 'Required' : 'Skipped'}
                  </button>
                )}
              </div>

              {/* Stage 06: Proof Pressure Test */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 06: Pressure Proof Test</span>
                  <span className="text-[10.5px] text-neutral-400">Proof pressure hold & zero-leak bubble inspection</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('pressureTestRequired', config.pressureTestRequired === false ? true : false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.pressureTestRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.pressureTestRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>

              {/* Stage 07: Final Deionized Flush */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 07: Final DI Flush</span>
                  <span className="text-[10.5px] text-neutral-400">Timed 5-minute deionized rinse with audio timer alert</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('finalFlushRequired', config.finalFlushRequired === false ? true : false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.finalFlushRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.finalFlushRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>

              {/* Stage 08: Oven Bake */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 08: Thermal Oven Bake</span>
                  <span className="text-[10.5px] text-neutral-400">110°C thermal moisture dry out with audio completion alert</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('ovenRequired', config.ovenRequired === false ? true : false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.ovenRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.ovenRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>

              {/* Stage 09: Fin Straightening (Gilling) */}
              <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-neutral-200 block">Stage 09: Fin Straightening (Gilling)</span>
                  <span className="text-[10.5px] text-neutral-400">Manual hand fin rake work (no motorized jigs)</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateConfig('gillingRequired', config.gillingRequired === false ? true : false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                    config.gillingRequired !== false
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {config.gillingRequired !== false ? 'Required' : 'Skipped'}
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 5: Receipt Inspection Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                Physical Intake Checklist
              </h3>
              {(() => {
                const activeChecklist = intake.checklist.filter(
                  (item) => !item.label.toLowerCase().includes('shipping plug') && !item.label.toLowerCase().includes('port plug')
                );
                return (
                  <span className="text-xs font-mono text-neutral-400">
                    {activeChecklist.filter((c) => c.checked).length}/{activeChecklist.length} Verified
                  </span>
                );
              })()}
            </div>

            <div className="space-y-2">
              {intake.checklist
                .filter(
                  (item) => !item.label.toLowerCase().includes('shipping plug') && !item.label.toLowerCase().includes('port plug')
                )
                .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleChecklist(item.id)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                    item.checked
                      ? 'bg-neutral-950/80 border-emerald-900/40 text-neutral-200'
                      : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-neutral-300'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.checked ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-600" />
                    )}
                  </div>
                  <span className={`text-xs ${item.checked ? 'text-neutral-200' : 'text-neutral-400'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Add custom check item */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add custom verification item..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700"
                title="Add check"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stage Completion & Save Actions Bar */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase">
              Stage 01 Receiving &amp; Assessment Complete
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">
              Ready for Flow-Through Degreasing
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Serial Number: <strong className="text-white font-mono">{unit.serialNumber}</strong> · Work Order: <strong className="text-white font-mono">{unit.workOrderNumber}</strong> · Customer: <strong className="text-white">{unit.customerName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markIntakeCompleted}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            <span>Confirm Intake &amp; Advance to Degreasing</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Media Modal Preview */}
      {selectedMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 no-print">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-[94vw] lg:max-w-4xl xl:max-w-5xl max-h-[calc(100vh-2rem)] flex flex-col min-h-0 p-4 sm:p-5 space-y-3 shadow-2xl overflow-hidden my-auto">
            <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  {selectedMediaPreview.type}
                </span>
                <span className="text-sm font-semibold text-neutral-100 truncate">
                  {selectedMediaPreview.caption || selectedMediaPreview.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedMediaPreview(null)}
                className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden max-h-[70vh]">
              {selectedMediaPreview.type === 'video' ? (
                <div className="p-8 text-center space-y-3">
                  <Video className="h-12 w-12 text-purple-400 mx-auto" />
                  <p className="text-sm font-mono text-neutral-200">
                    Visual Inspection Video Recording
                  </p>
                  <p className="text-xs text-neutral-400">
                    Duration: 00:42 · 1080p 60fps · Captured at Intake
                  </p>
                  <div className="h-2 w-64 bg-neutral-800 rounded-full mx-auto overflow-hidden">
                    <div className="h-full bg-purple-500 w-1/3 animate-pulse" />
                  </div>
                </div>
              ) : (
                <img
                  src={selectedMediaPreview.url}
                  alt={selectedMediaPreview.name}
                  referrerPolicy="no-referrer"
                  className="max-h-[65vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono pt-1">
              <span>{selectedMediaPreview.name}</span>
              <span>{new Date(selectedMediaPreview.uploadedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Official Bicester Workbench Check-In Sheet Modal (PS-WORKBENCH-QA-2026) */}
      <WorkbenchSheetModal
        unit={unit}
        isOpen={isWorkbenchModalOpen}
        onClose={() => setIsWorkbenchModalOpen(false)}
        onUpdateUnit={onUpdateUnit}
      />

      {/* Engineering Flow Drawing & Blueprint Inspection Modal */}
      <FlowDrawingModal
        unit={unit}
        isOpen={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
      />

      {/* Custom Cooler Specification Modal */}
      <CustomCoolerModal
        isOpen={isCustomCoolerModalOpen}
        onClose={() => setIsCustomCoolerModalOpen(false)}
        onSave={(newCooler) => {
          setCustomCoolerVersion((v) => v + 1);
          onUpdateUnit((prev) => ({
            ...prev,
            componentType: newCooler.id as any,
            intake: {
              ...prev.intake,
              componentType: newCooler.id as any,
            },
            processConfig: {
              ...prev.processConfig,
              flowTargetMinLpm: newCooler.defaultFlowTargetMinLpm || prev.processConfig.flowTargetMinLpm,
              flowTargetMaxLpm: newCooler.defaultFlowTargetMaxLpm || prev.processConfig.flowTargetMaxLpm,
              pressureTargetBar: newCooler.defaultPressureTargetBar || prev.processConfig.pressureTargetBar,
              pressureHoldTimeSec: newCooler.defaultPressureHoldTimeSec || prev.processConfig.pressureHoldTimeSec,
            },
          }), `Registered and applied custom cooler type: ${newCooler.label}`);
        }}
      />

      {/* Live Workshop Camera Snapshot Modal */}
      <CameraSnapshotModal
        isOpen={isLiveCameraModalOpen}
        onClose={() => setIsLiveCameraModalOpen(false)}
        onCapture={(media) => {
          onUpdateUnit((prev) => ({
            ...prev,
            intake: {
              ...prev.intake,
              photos: [...prev.intake.photos, media],
            },
          }), `Captured intake inspection photo: ${media.caption || media.name}`);
        }}
        unitSerialNumber={unit.serialNumber}
        stage="intake"
        defaultCaption={customPhotoCaption.trim() || `Intake Visual Survey · ${unit.serialNumber}`}
      />
    </div>
  );
};
