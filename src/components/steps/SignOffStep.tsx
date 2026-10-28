import React, { useRef, useState, useEffect } from 'react';
import { 
  Award, 
  Camera, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  PenTool, 
  Sparkles, 
  AlertTriangle, 
  RotateCcw, 
  Printer,
  ShieldCheck,
  CheckSquare,
  Square,
  Check,
  Clock,
  Gauge,
  QrCode
} from 'lucide-react';
import { ServiceUnit, MediaItem } from '../../types/process';
import { readFileAsDataUrl, createMediaItem, generateTechnicalSchematicSvg } from '../../utils/media';
import { WORKBENCH_DOC_INFO } from '../../constants/workbench';
import { WorkbenchSheetModal } from '../WorkbenchSheetModal';
import { StepSopViewer } from '../StepSopModal';

interface SignOffStepProps {
  unit: ServiceUnit;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onOpenCertificate: () => void;
  onPrevStep: () => void;
  onOpenScanner?: () => void;
}

export const SignOffStep: React.FC<SignOffStepProps> = ({
  unit,
  onUpdateUnit,
  onOpenCertificate,
  onPrevStep,
  onOpenScanner,
}) => {
  const signOff = unit.signOff;
  const [photoCaption, setPhotoCaption] = useState('');
  const [isWorkbenchModalOpen, setIsWorkbenchModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!signOff.signatureDataUrl);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (signOff.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = signOff.signatureDataUrl;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [signOff.signatureDataUrl]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = '#f59e0b'; // amber signature
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveSignatureToState();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);

    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        signatureDataUrl: undefined,
      },
    }), 'Cleared digital inspection signature');
  };

  const saveSignatureToState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        signatureDataUrl: dataUrl,
      },
    }), 'Saved digital inspection signature');
  };

  // Picture upload handler with multi-file batch support
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const newItem = createMediaItem(
          file.name,
          'image',
          dataUrl,
          'sign_off',
          photoCaption || `Final QA Acceptance Photo · ${file.name}`
        );
        newItems.push(newItem);
      } catch (err) {
        console.warn('Sign-off picture read error:', err);
      }
    }

    if (newItems.length > 0) {
      onUpdateUnit((prev) => ({
        ...prev,
        signOff: {
          ...prev.signOff,
          pictures: [...(prev.signOff?.pictures || []), ...newItems],
        },
      }), `Uploaded ${newItems.length} final sign-off inspection picture(s)`);
    }

    setPhotoCaption('');
    e.target.value = '';
  };

  const handleSimulatePicture = () => {
    const samples = [
      { title: 'Final Unit Assembly Complete', desc: 'Dust caps fitted · Ready for packing' },
      { title: 'Quality Acceptance Stamp', desc: 'Stamp #QA-402 applied to flange' },
      { title: 'Crated & Bagged with Desiccant', desc: 'Hermetic barrier pack verified' },
    ];
    const pick = samples[signOff.pictures.length % samples.length];
    const svgUrl = generateTechnicalSchematicSvg(pick.title, `${unit.serialNumber} · ${pick.desc}`, '#10b981');
    const item = createMediaItem(
      `Final_SignOff_${Date.now()}.svg`,
      'image',
      svgUrl,
      'sign_off',
      pick.title
    );

    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        pictures: [...prev.signOff.pictures, item],
      },
    }), `Attached final inspection photo: ${pick.title}`);
  };

  const finalizeSignOff = () => {
    const now = new Date().toISOString();
    onUpdateUnit((prev) => ({
      ...prev,
      overallStatus: prev.signOff.qaDisposition === 'APPROVED' ? 'completed' : 'quarantined',
      signOff: {
        ...prev.signOff,
        completedAt: now,
      },
    }), `FINAL SIGN-OFF GRANTED: ${signOff.qaDisposition} by ${signOff.inspectorName} (${signOff.inspectorId})`);
    onOpenCertificate();
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
              Stage 09
            </span>
            <span className="text-xs text-neutral-500">·</span>
            <span className="text-xs text-neutral-400 font-mono">Final Inspection & Conformance Stamp</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight mt-0.5">
            Final Quality Sign-Off & Photo Archival
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Capture final assembly pictures, provide QA inspector digital signature, and issue Certificate of Service Conformance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StepSopViewer stepId="sign_off" />
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
              title="Scan Unit QR / Station Traveler"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-400" />
              <span>Scan QR</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsWorkbenchModalOpen(true)}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-xs rounded-lg transition-colors border border-amber-500/30 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>View Bicester Sheet (QA-2026)</span>
          </button>
          <button
            onClick={onPrevStep}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg"
          >
            ← Previous
          </button>
          <button
            onClick={finalizeSignOff}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Complete Sign-Off & View Certificate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bicester OUT Quality Validation & Sign-off Photos */}
        <div className="lg:col-span-7 space-y-6">
          {/* BICESTER WORKBENCH QUALITY VALIDATION LOG (DOCUMENT: PS-WORKBENCH-QA-2026) - OUT SECTION */}
          <div className="bg-neutral-900 border-2 border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500/10 to-transparent w-48 h-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded uppercase tracking-wider">
                    {WORKBENCH_DOC_INFO.formCode} · {WORKBENCH_DOC_INFO.documentControlVersion}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded">
                    ISO 9001 &amp; ISO 14001 Registered
                  </span>
                </div>
                <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Bicester Dispatch Quality Validation Log (OUT-Sheet)</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Terminal post-bake inspection, inert gas purge, port sealing, and final clearance release.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsWorkbenchModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Full Sheet (16 Steps)</span>
              </button>
            </div>

            {/* Document Step 13: After Dry Quality Inspection */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2.5">
              <div>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400">Step 13:</span>
                  <span>After Dry Quality Inspection</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Secondary structural assessment and post-bake diagnostics verification loops (following 2hr @ 120°C dehydration).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                {/* Moisture Check */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Moisture Check:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, afterDryMoistureCheck: 'PASS' },
                        }), 'After dry moisture check: PASS');
                      }}
                      className={`flex-1 py-1 px-2 rounded border text-center font-bold text-[11px] cursor-pointer transition-colors ${
                        signOff.afterDryMoistureCheck !== 'FAIL'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      [✓] Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, afterDryMoistureCheck: 'FAIL' },
                        }), 'After dry moisture check: FAIL');
                      }}
                      className={`flex-1 py-1 px-2 rounded border text-center font-bold text-[11px] cursor-pointer transition-colors ${
                        signOff.afterDryMoistureCheck === 'FAIL'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      [✗] Fail
                    </button>
                  </div>
                </div>

                {/* Visual Damage Check */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Visual Damage Check:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, afterDryVisualDamageCheck: 'PASS' },
                        }), 'After dry visual damage check: PASS');
                      }}
                      className={`flex-1 py-1 px-2 rounded border text-center font-bold text-[11px] cursor-pointer transition-colors ${
                        signOff.afterDryVisualDamageCheck !== 'FAIL'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      [✓] Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, afterDryVisualDamageCheck: 'FAIL' },
                        }), 'After dry visual damage check: FAIL');
                      }}
                      className={`flex-1 py-1 px-2 rounded border text-center font-bold text-[11px] cursor-pointer transition-colors ${
                        signOff.afterDryVisualDamageCheck === 'FAIL'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      [✗] Fail
                    </button>
                  </div>
                </div>

                {/* Inspector Sign */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Inspector Sign / Initials:
                  </span>
                  <input
                    type="text"
                    value={signOff.afterDryInspectorSign ?? signOff.inspectorName ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        signOff: { ...prev.signOff, afterDryInspectorSign: val },
                      }));
                    }}
                    placeholder="e.g. NM"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Document Step 14: Component Purge & Terminal Port Sealing */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2.5">
              <div>
                <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="font-mono text-emerald-400">Step 14:</span>
                  <span>Component Purge &amp; Terminal Port Sealing</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Dry inert gas line purge immediately followed by secure port plugging.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* Sealing Status selector */}
                <div className="space-y-1.5">
                  <span className="text-neutral-400 block text-[11px]">
                    Sealing Status:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, sealingStatus: 'ORIGINAL_CAPS_REUSED' },
                        }), 'Sealing status: Original Caps Re-used');
                      }}
                      className={`p-2 rounded border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        signOff.sealingStatus === 'ORIGINAL_CAPS_REUSED'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {signOff.sealingStatus === 'ORIGINAL_CAPS_REUSED' ? (
                        <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                      <span>Original Caps Re-used</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: { ...prev.signOff, sealingStatus: 'NEW_PARTICLE_SCIENCE_BUNGS_USED' },
                        }), 'Sealing status: New Particle Science Bungs Used');
                      }}
                      className={`p-2 rounded border text-left font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                        signOff.sealingStatus !== 'ORIGINAL_CAPS_REUSED'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {signOff.sealingStatus !== 'ORIGINAL_CAPS_REUSED' ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                      <span>New Particle Science Bungs Used</span>
                    </button>
                  </div>
                </div>

                {/* Dry Inert Gas Purge verification */}
                <div className="space-y-2">
                  <span className="text-neutral-400 block text-[11px]">
                    Inert Gas Purge Verification:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit((prev) => ({
                        ...prev,
                        signOff: {
                          ...prev.signOff,
                          inertGasPurgeCompleted: !(prev.signOff.inertGasPurgeCompleted !== false),
                        },
                      }), 'Toggled dry inert gas purge verification');
                    }}
                    className={`p-3 rounded border text-left text-xs font-bold flex items-start gap-2.5 transition-colors cursor-pointer ${
                      signOff.inertGasPurgeCompleted !== false
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {signOff.inertGasPurgeCompleted !== false ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div>Dry N2 / Argon Inert Gas Line Purge Verified</div>
                      <div className="text-[10px] text-neutral-400 font-normal font-sans mt-0.5">
                        Moisture-free inert gas swept through internal core before terminal bung installation.
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Document Step 15: Manual Fin Straightening & Core Dressing Inspection */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="font-mono text-emerald-400">Step 15:</span>
                    <span>Manual Fin Straightening &amp; Core Dressing Inspection</span>
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    100% manual bench craftsmanship straightening of distorted array heat sink cooling fins (Zero jigs used).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Conforming (100% Hand Craft · Zero Jigs)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Document Step 16: Final Internal Sign-Off & Clearance Release */}
            <div className="bg-neutral-950/80 border border-emerald-500/30 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="font-mono text-emerald-400">Step 16:</span>
                    <span>Final Internal Sign-Off &amp; Clearance Release</span>
                  </span>
                  <p className="text-[11px] text-neutral-400">
                    Structural verification authorization matching process control requirements.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>ISO 9001 &amp; ISO 14001 CONFORMING</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Authorized Quality Sign:
                  </label>
                  <input
                    type="text"
                    value={signOff.authorizedQualitySign ?? signOff.inspectorName ?? 'Nicola Malgarotti (QA Lead)'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        signOff: { ...prev.signOff, authorizedQualitySign: val },
                      }));
                    }}
                    placeholder="e.g. Nicola Malgarotti (Lead QC)"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Date Approved:
                  </label>
                  <input
                    type="text"
                    value={signOff.dateApproved ?? new Date().toLocaleDateString('en-GB') ?? '02 / 10 / 2026'}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateUnit((prev) => ({
                        ...prev,
                        signOff: { ...prev.signOff, dateApproved: val },
                      }));
                    }}
                    placeholder="DD / MM / 2026"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Clearance Authorization Banner */}
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    Structural verification authorization confirmed. Unit cleared for packaging &amp; dispatch.
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400/80 hidden sm:inline">
                  {WORKBENCH_DOC_INFO.formCode}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="h-4 w-4 text-amber-400" />
                  Final Inspection Pictures ({signOff.pictures.length})
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Mandatory photographic evidence of completed unit, fitted port caps, and shipping labels.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSimulatePicture}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs text-amber-400 rounded-lg border border-neutral-700"
              >
                + QA Photo
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Caption for picture (e.g. 'Drive spline condition and protective yellow cap')"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-950/90 rounded-lg border border-neutral-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Auto-Resizing Active</span>
              </div>
              <span className="text-neutral-500 font-mono">Photos auto-compressed to max 1024px (~95% saved)</span>
            </div>

            <label className="flex items-center justify-center gap-2 p-3 bg-neutral-950/70 hover:bg-neutral-950 border border-dashed border-neutral-700 hover:border-amber-500 rounded-xl cursor-pointer transition-colors text-xs text-neutral-300">
              <Camera className="h-4 w-4 text-amber-400" />
              <span className="font-medium">Upload Final Sign-Off Pictures</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {signOff.pictures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {signOff.pictures.map((pic) => (
                  <div
                    key={pic.id}
                    className="group relative bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800"
                  >
                    <img
                      src={pic.url}
                      alt={pic.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-[11px] font-medium text-neutral-200 truncate">
                        {pic.caption || pic.name}
                      </p>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        {new Date(pic.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateUnit((prev) => ({
                          ...prev,
                          signOff: {
                            ...prev.signOff,
                            pictures: prev.signOff.pictures.filter((p) => p.id !== pic.id),
                          },
                        }), 'Removed sign-off picture');
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-neutral-900/90 text-neutral-400 hover:text-rose-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Final Inspector Comments */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-400" />
              Final QC Inspector Comments & Remarks
            </h3>
            <textarea
              rows={3}
              value={signOff.finalComments}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateUnit((prev) => ({
                  ...prev,
                  signOff: { ...prev.signOff, finalComments: val },
                }));
              }}
              placeholder="All tests conform to overhaul manual parameters. Unit packaged with silica desiccant bags and ready for dispatch shipping..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
        </div>

        {/* Right Column: Digital Signature & Disposition */}
        <div className="lg:col-span-5 space-y-6">
          {/* QA Disposition Selector */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase block">
              Quality Release Decision
            </span>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'APPROVED',
                  label: 'APPROVED FOR DISPATCH (CONFORMING)',
                  desc: 'All stages passed within OEM specifications.',
                  border: 'border-emerald-500 text-emerald-300',
                  bg: 'bg-emerald-500/10',
                },
                {
                  id: 'CONDITIONAL_APPROVAL',
                  label: 'CONDITIONAL PASS (MINOR DEVIATION)',
                  desc: 'Conforms with customer technical variance approval.',
                  border: 'border-amber-500 text-amber-300',
                  bg: 'bg-amber-500/10',
                },
                {
                  id: 'REJECTED',
                  label: 'REJECTED / QUARANTINED',
                  desc: 'Defect detected. Requires engineering disassembly.',
                  border: 'border-rose-500 text-rose-300',
                  bg: 'bg-rose-500/10',
                },
              ].map((disp) => (
                <button
                  key={disp.id}
                  type="button"
                  onClick={() => {
                    onUpdateUnit((prev) => ({
                      ...prev,
                      signOff: { ...prev.signOff, qaDisposition: disp.id as 'APPROVED' | 'CONDITIONAL_APPROVAL' | 'REJECTED' },
                    }), `Set QA disposition: ${disp.label}`);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    signOff.qaDisposition === disp.id
                      ? `${disp.bg} ${disp.border} ring-1 ring-neutral-600`
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="text-xs font-bold">{disp.label}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{disp.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Digital Signature Pad */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                <PenTool className="h-4 w-4 text-amber-400" />
                Digital Inspector Signature
              </h3>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-neutral-400 hover:text-rose-400 font-mono flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            </div>

            <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950">
              <canvas
                ref={canvasRef}
                width={360}
                height={130}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-32 touch-none cursor-crosshair"
              />
            </div>
            <p className="text-[10px] text-neutral-500 text-center font-mono">
              Sign above using mouse or touch screen stylus
            </p>

            {/* Inspector Identity Fields */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={signOff.inspectorName}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      signOff: { ...prev.signOff, inspectorName: val },
                    }));
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Inspector Stamp ID
                </label>
                <input
                  type="text"
                  value={signOff.inspectorId}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateUnit((prev) => ({
                      ...prev,
                      signOff: { ...prev.signOff, inspectorId: val },
                    }));
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-neutral-200 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Bicester Workbench QA Sheet Modal (PS-WORKBENCH-QA-2026) */}
      <WorkbenchSheetModal
        unit={unit}
        isOpen={isWorkbenchModalOpen}
        onClose={() => setIsWorkbenchModalOpen(false)}
        onUpdateUnit={onUpdateUnit}
      />
    </div>
  );
};
