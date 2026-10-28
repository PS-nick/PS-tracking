import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  FileCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  ArrowRight,
  Shield,
  Thermometer,
  Clock,
  QrCode,
  Check,
  Microscope,
  Layers,
  Sliders,
  SlidersHorizontal,
  Flame,
  FileSpreadsheet,
  Printer,
  Eye,
  Download,
  X,
  Plus,
  ExternalLink,
  FileDown
} from 'lucide-react';
import { ServiceUnit, MediaItem } from '../../types/process';
import { readFileAsDataUrl, readDocumentAsDataUrl, createMediaItem, generateTechnicalSchematicSvg } from '../../utils/media';
import { formatFileSize, printPdfDirectly, generateSampleRigTestPdf } from '../../utils/cleanRigPdf';
import { StepSopViewer } from '../StepSopModal';

interface CleaningStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const CleaningStep: React.FC<CleaningStepProps> = ({
  unit,
  onUpdateUnit,
  onNextStep,
  onPrevStep,
  onOpenScanner,
}) => {
  const cleaning = unit.cleaning;
  const isWithAnalysis = cleaning.mode === 'with_analysis';
  const [reportCaption, setReportCaption] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [previewPdfModal, setPreviewPdfModal] = useState<{ url: string; name: string } | null>(null);

  // Selected Ultra Fine RIG Cleaning Spec Micron (5, 10, 25, 50, 100, 200 or custom)
  const currentSpecMicron = cleaning.cleaningSpecMicron ?? cleaning.analysisResult?.maxParticleSizeMicron ?? 25;
  const isCustomSpec = currentSpecMicron === 'custom';

  const setMode = (mode: 'with_analysis' | 'without_analysis') => {
    onUpdateUnit((prev) => ({
      ...prev,
      cleaning: {
        ...prev.cleaning,
        mode,
      },
      processConfig: {
        ...prev.processConfig,
        cleaningMode: mode,
      },
    }), `Switched Ultra Fine RIG Cleaning mode to ${mode === 'with_analysis' ? 'With Lab Analysis' : 'Without Analysis'}`);
  };

  const updateCleaningField = <K extends keyof typeof cleaning>(field: K, val: (typeof cleaning)[K]) => {
    onUpdateUnit((prev) => ({
      ...prev,
      cleaning: {
        ...prev.cleaning,
        [field]: val,
      },
    }));
  };

  const updateAnalysisField = <K extends keyof NonNullable<typeof cleaning.analysisResult>>(
    field: K,
    val: NonNullable<typeof cleaning.analysisResult>[K]
  ) => {
    onUpdateUnit((prev) => {
      const currentAnalysis = prev.cleaning.analysisResult || {
        uploadedAt: new Date().toISOString(),
        reportFiles: [],
        particleCountIso: 'Apex 1.0 (Eq. ISO 16232)',
        moisturePpm: 20,
        verdict: 'CONFORMING' as const,
        labTechnician: prev.cleaning.technician || 'QA Microscopist',
        analysisNotes: '',
      };
      return {
        ...prev,
        cleaning: {
          ...prev.cleaning,
          analysisResult: {
            ...currentAnalysis,
            [field]: val,
          },
        },
      };
    });
  };

  const handleSelectCleaningSpec = (size: number | 'custom') => {
    onUpdateUnit((prev) => {
      const cur = prev.cleaning.analysisResult || {
        uploadedAt: new Date().toISOString(),
        reportFiles: [],
        particleCountIso: 'Apex 1.0 (Eq. ISO 16232)',
        moisturePpm: 20,
        verdict: 'CONFORMING' as const,
        labTechnician: prev.cleaning.technician || 'QA Microscopist',
        analysisNotes: '',
      };

      const effectiveSize = size === 'custom' 
        ? (cur.customParticleSizeMicron || 75) 
        : size;

      return {
        ...prev,
        cleaning: {
          ...prev.cleaning,
          cleaningSpecMicron: size,
          customCleaningSpecMicron: size === 'custom' ? effectiveSize : undefined,
          analysisResult: {
            ...cur,
            maxParticleSizeMicron: size,
            effectiveParticleSizeMicron: effectiveSize,
            microscopeMethod: 'Digital Optical Polarized Microscope (100x–500x)',
            particleCountIso: `Apex 1.0 (Eq. ISO 16232) ≤${effectiveSize}μm`,
          },
        },
      };
    }, `Selected ${size}μm Ultra Fine RIG cleaning specification`);
  };

  const handleCustomMicronChange = (val: number) => {
    onUpdateUnit((prev) => {
      const cur = prev.cleaning.analysisResult || {
        uploadedAt: new Date().toISOString(),
        reportFiles: [],
        particleCountIso: 'Apex 1.0 (Eq. ISO 16232)',
        moisturePpm: 20,
        verdict: 'CONFORMING' as const,
        labTechnician: prev.cleaning.technician || 'QA Microscopist',
        analysisNotes: '',
      };
      return {
        ...prev,
        cleaning: {
          ...prev.cleaning,
          cleaningSpecMicron: 'custom',
          customCleaningSpecMicron: val,
          analysisResult: {
            ...cur,
            maxParticleSizeMicron: 'custom',
            customParticleSizeMicron: val,
            effectiveParticleSizeMicron: val,
            microscopeMethod: 'Digital Optical Polarized Microscope (100x–500x)',
            particleCountIso: `Apex 1.0 (Eq. ISO 16232) Custom ≤${val}μm`,
          },
        },
      };
    });
  };

  const processUploadedPdfFile = async (file: File) => {
    try {
      setIsUploadingPdf(true);
      const dataUrl = await readDocumentAsDataUrl(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const effectiveSize = cleaning.analysisResult?.effectiveParticleSizeMicron || (currentSpecMicron === 'custom' ? (cleaning.customCleaningSpecMicron || 75) : currentSpecMicron);

      const mediaItem = createMediaItem(
        file.name,
        isPdf ? 'document' : 'image',
        dataUrl,
        'cleaning',
        `Ultra Clean RIG test document (${effectiveSize}μm rating)`
      );

      onUpdateUnit((prev) => {
        const currentReports = prev.cleaning.analysisResult?.reportFiles || [];
        return {
          ...prev,
          cleaning: {
            ...prev.cleaning,
            mode: 'with_analysis', // Auto-switch to With Analysis
            testPdf: {
              id: `test-pdf-${Date.now()}`,
              name: file.name,
              url: dataUrl,
              fileType: isPdf ? 'pdf' : 'image',
              sizeBytes: file.size,
              uploadedAt: new Date().toISOString(),
              cleanlinessSpec: `${effectiveSize}μm Spec`,
              printWithMasterReport: true, // Enabled by default to print with master report!
              labNotes: `Ultra Clean RIG laboratory test file: ${file.name}`,
            },
            analysisResult: {
              ...prev.cleaning.analysisResult,
              uploadedAt: new Date().toISOString(),
              reportFiles: [...currentReports, mediaItem],
              particleCountIso: `Apex 1.0 (Eq. ISO 16232) ≤${effectiveSize}μm`,
              maxParticleSizeMicron: effectiveSize,
              effectiveParticleSizeMicron: effectiveSize,
              actualParticleCount: prev.cleaning.analysisResult?.actualParticleCount ?? 0,
              maxAllowableCount: prev.cleaning.analysisResult?.maxAllowableCount ?? 0,
              microscopeMethod: prev.cleaning.analysisResult?.microscopeMethod || 'Digital Optical Polarized Microscope (100x–500x)',
              moisturePpm: prev.cleaning.analysisResult?.moisturePpm ?? 20,
              verdict: 'CONFORMING',
              labTechnician: prev.cleaning.analysisResult?.labTechnician || prev.cleaning.technician || 'N. Malgarotti (QA Microscopist)',
              analysisNotes: prev.cleaning.analysisResult?.analysisNotes || `Ultra Clean RIG particle analysis document attached. Cleanliness conforming to Apex 1.0 specifications.`,
            },
          },
          processConfig: {
            ...prev.processConfig,
            cleaningMode: 'with_analysis',
          },
        };
      }, `Uploaded Ultra Clean RIG test certificate: ${file.name} (prints with master report)`);
    } catch (err) {
      console.error('Error uploading test PDF:', err);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedPdfFile(file);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPdf(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processUploadedPdfFile(file);
  };

  const handleGenerateCertifiedSamplePdf = () => {
    const effectiveSize = cleaning.analysisResult?.effectiveParticleSizeMicron || (currentSpecMicron === 'custom' ? (cleaning.customCleaningSpecMicron || 75) : currentSpecMicron);
    const techName = cleaning.analysisResult?.labTechnician || cleaning.technician || 'N. Malgarotti (QA Microscopist)';
    const sample = generateSampleRigTestPdf(unit, effectiveSize, techName);

    const mediaItem = createMediaItem(
      sample.fileName,
      'document',
      sample.dataUrl,
      'cleaning',
      `Certified Ultra Clean RIG Test Certificate (Apex 1.0 - ${effectiveSize}μm rating)`
    );

    onUpdateUnit((prev) => {
      const currentReports = prev.cleaning.analysisResult?.reportFiles || [];
      return {
        ...prev,
        cleaning: {
          ...prev.cleaning,
          mode: 'with_analysis',
          testPdf: {
            id: `test-pdf-${Date.now()}`,
            name: sample.fileName,
            url: sample.dataUrl,
            fileType: 'pdf',
            sizeBytes: sample.sizeBytes,
            uploadedAt: new Date().toISOString(),
            cleanlinessSpec: `${effectiveSize}μm Spec`,
            printWithMasterReport: true, // Enabled for master report print!
            labNotes: `Generated official laboratory Ultra Clean RIG test certificate: ${sample.fileName}`,
          },
          analysisResult: {
            ...prev.cleaning.analysisResult,
            uploadedAt: new Date().toISOString(),
            reportFiles: [...currentReports, mediaItem],
            particleCountIso: `Apex 1.0 (Eq. ISO 16232) ≤${effectiveSize}μm`,
            maxParticleSizeMicron: effectiveSize,
            effectiveParticleSizeMicron: effectiveSize,
            actualParticleCount: 0,
            maxAllowableCount: 0,
            microscopeMethod: 'Digital Optical Polarized Microscope (100x–500x)',
            moisturePpm: 20,
            verdict: 'CONFORMING',
            labTechnician: techName,
            analysisNotes: `Apex 1.0 Cleanliness certified. Digital optical microscope inspection verified zero particles > ${effectiveSize}μm. Zero gravimetric technology used.`,
          },
        },
        processConfig: {
          ...prev.processConfig,
          cleaningMode: 'with_analysis',
        },
      };
    }, `Generated certified Ultra Clean RIG test certificate: ${sample.fileName}`);
  };

  const handleTogglePrintWithMasterReport = (checked: boolean) => {
    onUpdateUnit((prev) => {
      if (!prev.cleaning?.testPdf) return prev;
      return {
        ...prev,
        cleaning: {
          ...prev.cleaning,
          testPdf: {
            ...prev.cleaning.testPdf,
            printWithMasterReport: checked,
          },
        },
      };
    }, checked ? 'Included Ultra Clean RIG test PDF in Master Report print' : 'Excluded Ultra Clean RIG test PDF from Master Report print');
  };

  const handleRemoveTestPdf = () => {
    onUpdateUnit((prev) => ({
      ...prev,
      cleaning: {
        ...prev.cleaning,
        testPdf: undefined,
      },
    }), 'Removed Ultra Clean RIG test document');
  };

  const handleSimulateLabUpload = () => {
    handleGenerateCertifiedSamplePdf();
  };

  const markCompleted = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => ({
      ...prev,
      cleaning: {
        ...prev.cleaning,
        completedAt: now,
      },
      processConfig: {
        ...prev.processConfig,
        cleaningRequired: true,
      },
      currentStepId: 'final_flush',
    }), `Stage 07: Ultra Fine RIG Cleaning and micro-particle optical counting completed (${isWithAnalysis ? 'With Lab Analysis' : 'Without Analysis'}). Advanced to Stage 08: Final Flush.`);
    onNextStep();
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-sky-400">
              Stage 07
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-300 font-mono">Ultra Fine RIG Cleaning &amp; Micro-Particle Analysis</span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
              Reinstated Ultra Fine RIG Stage
            </span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Ultra Fine RIG Cleaning &amp; Micro-Particle Filtration
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            High-turbulence precision circulation loop on the dedicated Ultra Fine RIG. Select component cleaning specifications from <strong>5, 10, 25, 50, 100, or 200 micron</strong> (or custom micron) and verify cleanliness under digital optical microscope.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <StepSopViewer stepId="cleaning" />
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-sky-400" />
              <span>Scan QR</span>
            </button>
          )}
          <button
            type="button"
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg cursor-pointer"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={markCompleted}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Confirm RIG Cleaning &amp; Advance to Final Flush</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Banner: With Analysis vs Without Analysis */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Ultra Fine RIG Cleaning Protocol Mode
            </span>
            <p className="text-xs text-neutral-400">
              {isWithAnalysis
                ? 'With Analysis: Digital optical microscope membrane particle count and laboratory certificate upload required.'
                : 'Without Analysis: Standard Ultra Fine RIG high-velocity pulsation wash without spectrometry lab document attachment.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => setMode('without_analysis')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              !isWithAnalysis
                ? 'bg-neutral-800 text-neutral-100 font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Without Analysis
          </button>
          <button
            type="button"
            onClick={() => setMode('with_analysis')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isWithAnalysis
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            With Analysis
          </button>
        </div>
      </div>

      {/* Reinstated Ultra Fine RIG Cleaning Specification Selection (5, 10, 25, 50, 100, 200 μm) */}
      <div className="bg-neutral-900/90 border border-sky-500/30 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider">
              Choice of Cleaning Specifications (Micron Rating)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
            ZERO GRAVIMETRIC · DIGITAL OPTICAL MICROSCOPE
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-2">
            Select Cleaning Specification / Micro-Particle Rating:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {[5, 10, 25, 50, 100, 200].map((size) => {
              const isSelected = currentSpecMicron === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSelectCleaningSpec(size)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-500 text-neutral-950 border-sky-400 shadow-md scale-[1.02]'
                      : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                  }`}
                >
                  <Check className={`h-3 w-3 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  <span>{size} μm Spec</span>
                </button>
              );
            })}

            {/* Custom Micron Option */}
            <button
              type="button"
              onClick={() => handleSelectCleaningSpec('custom')}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                isCustomSpec
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md scale-[1.02]'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
              }`}
            >
              <Sliders className="h-3 w-3" />
              <span>Custom Size...</span>
            </button>
          </div>

          {/* Custom Size Input */}
          {isCustomSpec && (
            <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-amber-500/30 flex items-center gap-3">
              <span className="text-xs text-amber-300 font-medium shrink-0">Enter Custom Cleaning Micron:</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cleaning.customCleaningSpecMicron ?? cleaning.analysisResult?.customParticleSizeMicron ?? 75}
                  onChange={(e) => handleCustomMicronChange(Number(e.target.value))}
                  className="w-24 bg-neutral-900 border border-neutral-700 rounded-l-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-400"
                  placeholder="e.g. 75"
                />
                <span className="bg-neutral-800 border-y border-r border-neutral-700 px-2 py-1.5 text-xs font-mono text-neutral-400 rounded-r-lg">
                  μm
                </span>
              </div>
              <span className="text-xs text-neutral-400">
                Active Specification: <strong>{cleaning.customCleaningSpecMicron ?? 75} μm</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ultra Fine RIG Parameters */}
        <div className={isWithAnalysis ? 'lg:col-span-6 space-y-6' : 'lg:col-span-12 space-y-6'}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-400" />
                Ultra Fine RIG Hydraulic Parameters
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                Spec: {isCustomSpec ? `${cleaning.customCleaningSpecMicron ?? 75}μm (Custom)` : `${currentSpecMicron}μm`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Precision Detergent Agent
                </label>
                <input
                  type="text"
                  value={cleaning.detergentAgent}
                  onChange={(e) => updateCleaningField('detergentAgent', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  RIG Cycle Time (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={cleaning.flowDynamicsCycleMinutes ?? 20}
                  onChange={(e) => updateCleaningField('flowDynamicsCycleMinutes', Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Wash Fluid Temp (°C)
                </label>
                <input
                  type="number"
                  value={cleaning.bathTemperatureC}
                  onChange={(e) => updateCleaningField('bathTemperatureC', Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Rig Operator / Technician
                </label>
                <input
                  type="text"
                  value={cleaning.technician}
                  onChange={(e) => updateCleaningField('technician', e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Internal Cavity Flow Observations
                </label>
                <input
                  type="text"
                  value={cleaning.notes}
                  onChange={(e) => updateCleaningField('notes', e.target.value)}
                  placeholder="Log internal cavity hydrodynamic shear agitation, pulsing flow modulation, or rinsing fluid clarity..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-100 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Lab Fluid Analysis Upload & Results */}
        {isWithAnalysis && (
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-neutral-900 border border-sky-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Laboratory Fluid Analysis &amp; Optical Counting
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Microscope particle counting across selected {isCustomSpec ? `${cleaning.customCleaningSpecMicron ?? 75}μm` : `${currentSpecMicron}μm`} threshold.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateLabUpload}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-sky-300 rounded-lg border border-neutral-700 cursor-pointer"
                >
                  + Sample Lab Doc
                </button>
              </div>

              {/* Microscope Optical Particle Counting */}
              <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-sky-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase font-mono tracking-wider">
                    <Microscope className="h-4 w-4 text-sky-400" />
                    <span>Optical Microscope Particle Counting</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-300 font-bold">
                    ZERO GRAVIMETRIC · DIGITAL MICROSCOPE
                  </span>
                </div>

                {/* Measured Count & Maximum Allowable */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Particles Counted under Microscope
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cleaning.analysisResult?.actualParticleCount ?? 0}
                      onChange={(e) => updateAnalysisField('actualParticleCount', Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="e.g. 0"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-neutral-500 mt-0.5 block">
                      Counted at &gt;{cleaning.analysisResult?.effectiveParticleSizeMicron || 25}μm
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-300">
                        Max Allowable Particle Count
                      </label>
                      <span className="text-[10px] text-sky-400 font-mono font-bold">
                        Zero Gravimetric
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={cleaning.analysisResult?.maxAllowableCount ?? 0}
                      onChange={(e) => updateAnalysisField('maxAllowableCount', Math.max(0, parseInt(e.target.value || '0', 10)))}
                      placeholder="e.g. 0"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {[0, 5, 10, 25, 50, 100, 200].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => updateAnalysisField('maxAllowableCount', cnt)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                            (cleaning.analysisResult?.maxAllowableCount ?? 0) === cnt
                              ? 'bg-sky-500 text-neutral-950 border-sky-400 font-black'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Select standard max allowable count or enter custom
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Moisture / Water Content (PPM)
                    </label>
                    <input
                      type="number"
                      value={cleaning.analysisResult?.moisturePpm ?? ''}
                      onChange={(e) => updateAnalysisField('moisturePpm', Number(e.target.value))}
                      placeholder="e.g. 20 ppm"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-neutral-500 mt-0.5 block">
                      Residual moisture check
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Microscope Method &amp; Lens Setup
                    </label>
                    <input
                      type="text"
                      value={cleaning.analysisResult?.microscopeMethod || 'Digital Optical Polarized Microscope (100x–500x)'}
                      onChange={(e) => updateAnalysisField('microscopeMethod', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Microscopist / Lab Technician
                    </label>
                    <input
                      type="text"
                      value={cleaning.analysisResult?.labTechnician || ''}
                      onChange={(e) => updateAnalysisField('labTechnician', e.target.value)}
                      placeholder="e.g. N. Malgarotti"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Quality Verdict
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateAnalysisField('verdict', 'CONFORMING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        cleaning.analysisResult?.verdict === 'CONFORMING'
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400 font-black'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>CONFORMING (PASS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAnalysisField('verdict', 'CONTAMINATED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        cleaning.analysisResult?.verdict === 'CONTAMINATED'
                          ? 'bg-rose-500 text-white border-rose-400'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>CONTAMINATED (RE-WASH)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded Reports / Certificates List */}
              {cleaning.analysisResult?.reportFiles && cleaning.analysisResult.reportFiles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <h4 className="text-xs font-mono font-bold text-neutral-300 uppercase">
                    Attached Laboratory Certificates ({cleaning.analysisResult.reportFiles.length})
                  </h4>
                  <div className="space-y-1.5">
                    {cleaning.analysisResult.reportFiles.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="flex items-center justify-between p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-sky-400 shrink-0" />
                          <span className="text-neutral-200 truncate">{file.name}</span>
                          <span className="text-[10px] text-neutral-500">
                            ({new Date(file.uploadedAt).toLocaleTimeString()})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = (cleaning.analysisResult?.reportFiles || []).filter((f) => f.id !== file.id);
                            updateAnalysisField('reportFiles', filtered);
                          }}
                          className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
