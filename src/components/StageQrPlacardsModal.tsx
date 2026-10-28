import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  Sparkles, 
  Check, 
  Copy, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Wrench,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { StepId } from '../types/process';
import { ORDERED_STAGES, StageDefinition, generateStageQrCodeSvg, generateStageQrPayload } from '../utils/stageQr';
import { audioAlert } from '../utils/audioAlert';

interface StageQrPlacardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStep?: StepId;
  onSelectStage?: (stepId: StepId) => void;
}

export const StageQrPlacardsModal: React.FC<StageQrPlacardsModalProps> = ({
  isOpen,
  onClose,
  activeStep,
  onSelectStage,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<StepId>(activeStep || 'intake');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const selectedStage = useMemo(() => {
    return ORDERED_STAGES.find((s) => s.id === selectedStageId) || ORDERED_STAGES[0];
  }, [selectedStageId]);

  const filteredStages = useMemo(() => {
    if (!filterQuery.trim()) return ORDERED_STAGES;
    const q = filterQuery.toLowerCase();
    return ORDERED_STAGES.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.stationName.toLowerCase().includes(q) ||
        s.stageCode.toLowerCase().includes(q) ||
        s.sopCode.toLowerCase().includes(q)
    );
  }, [filterQuery]);

  if (!isOpen) return null;

  const handleCopyPayload = (stepId: StepId) => {
    const payload = generateStageQrPayload(stepId);
    navigator.clipboard?.writeText(payload);
    setCopiedId(stepId);
    audioAlert.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectAndGo = (stepId: StepId) => {
    audioAlert.playClick();
    onSelectStage?.(stepId);
    onClose();
  };

  const handlePrintAll = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const cardsHtml = ORDERED_STAGES.map((stage) => {
      const qrSvg = generateStageQrCodeSvg(stage.id, { margin: 1, errorCorrectionLevel: 'M' });
      return `
        <div class="placard">
          <div class="placard-header">
            <div class="depot-tag">PARTICLE SCIENCE · AS9100D DEPOT</div>
            <div class="code-badge">${stage.stageCode}</div>
          </div>
          <div class="station-title">${stage.title}</div>
          <div class="station-sub">${stage.stationName}</div>
          <div class="qr-box">
            <img src="${qrSvg}" alt="QR ${stage.title}" />
          </div>
          <div class="payload-text">${generateStageQrPayload(stage.id)}</div>
          <div class="sop-badge">MANDATORY SOP: ${stage.sopCode}</div>
          <div class="scan-instructions">Scan with mobile terminal camera or ProTrace scanner to log directly into this stage.</div>
        </div>
      `;
    }).join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Particle Science - Process Stage Station QR Placards</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            .grid-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12mm;
            }
            .placard {
              border: 2px solid #0f172a;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              page-break-inside: avoid;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .placard-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              border-bottom: 1.5px solid #0f172a;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            .depot-tag {
              font-size: 8px;
              font-weight: 900;
              letter-spacing: 0.1em;
              color: #475569;
            }
            .code-badge {
              font-size: 11px;
              font-weight: 900;
              background: #0f172a;
              color: #fff;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .station-title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              margin-top: 4px;
              line-height: 1.2;
            }
            .station-sub {
              font-size: 9px;
              color: #334155;
              font-weight: 600;
              margin-top: 2px;
            }
            .qr-box {
              margin: 8px 0;
              border: 1px solid #cbd5e1;
              padding: 6px;
              border-radius: 6px;
              background: #fff;
            }
            .qr-box img {
              width: 120px;
              height: 120px;
              display: block;
            }
            .payload-text {
              font-family: monospace;
              font-size: 8px;
              font-weight: 700;
              color: #0f172a;
              background: #f1f5f9;
              padding: 2px 8px;
              border-radius: 3px;
              letter-spacing: 0.05em;
            }
            .sop-badge {
              font-size: 8px;
              font-weight: 800;
              color: #b45309;
              margin-top: 6px;
            }
            .scan-instructions {
              font-size: 7.5px;
              color: #64748b;
              margin-top: 4px;
              line-height: 1.2;
            }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 8mm; border-bottom: 2px solid #0f172a; padding-bottom: 4mm; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h1 style="margin: 0; font-size: 16px; text-transform: uppercase;">PARTICLE SCIENCE · WORKSHOP STAGE PLACARDS</h1>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569;">Bicester Motion Depot · AS9100D Authorized Station Access QR Codes (Stages 01 - 11)</p>
            </div>
            <div style="font-size: 8px; font-weight: bold; color: #475569;">PRINT DATE: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <div class="grid-container">
            ${cardsHtml}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 1500);
      }
    }, 400);
  };

  const selectedQrSvg = generateStageQrCodeSvg(selectedStage.id, { margin: 1, errorCorrectionLevel: 'M' });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-center animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden my-4 max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Process Stage QR Station Placards
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  11 Stages
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Scan any station QR code to instantly authenticate and log into that overhaul stage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAll}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Print all 11 Station Placards on A4 paper for workshop bench mounting"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print All 11 Placards</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content: Split Pane */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Column: Stage Selector List */}
          <div className="md:col-span-5 border-r border-neutral-800 p-3 sm:p-4 space-y-2 overflow-y-auto bg-neutral-950/40">
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search stages or station names..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="space-y-1.5">
              {filteredStages.map((stage) => {
                const isSelected = stage.id === selectedStageId;
                const isCurrentActive = stage.id === activeStep;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-amber-500/50 shadow-xs'
                        : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-amber-400 shrink-0">
                        {stage.stageCode}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{stage.title}</span>
                          {isCurrentActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block shrink-0" title="Active unit is at this stage" />
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {stage.stationName}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Stage Placard & Action Card */}
          <div className="md:col-span-7 p-4 sm:p-6 flex flex-col justify-between bg-neutral-900 space-y-4">
            <div className="space-y-4">
              {/* Placard Preview Box (High Contrast Print Style) */}
              <div className="bg-white rounded-xl p-5 border-2 border-slate-900 text-slate-950 shadow-md">
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-3">
                  <div>
                    <span className="text-[9px] font-mono font-black text-slate-600 uppercase tracking-widest block">
                      PARTICLE SCIENCE · AS9100D STATION TAG
                    </span>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-950 mt-0.5">
                      {selectedStage.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-700">
                      {selectedStage.stationName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-950 text-white font-mono font-black text-xs">
                      {selectedStage.stageCode}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-amber-700 block mt-1">
                      {selectedStage.sopCode}
                    </span>
                  </div>
                </div>

                {/* Center QR Code Display */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
                  <div className="p-2 border-2 border-slate-900 rounded-lg bg-white shrink-0 shadow-xs">
                    <img
                      src={selectedQrSvg}
                      alt={`QR Code for ${selectedStage.title}`}
                      className="w-32 h-32 sm:w-36 sm:h-36 block"
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-left text-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Scan Target Payload:</span>
                      <code className="px-2 py-1 rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-950 border border-slate-300 inline-block mt-0.5">
                        {generateStageQrPayload(selectedStage.id)}
                      </code>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Station Equipment:</span>
                      <span className="text-[11px] text-slate-700 font-medium block">
                        {selectedStage.equipment}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Instant QR Stage Login Enabled</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 mt-2 text-[9px] text-slate-500 text-center font-mono">
                  Depot Location: Building 105, Bicester Motion, Oxfordshire · Precision Motorsport Overhaul
                </div>
              </div>

              {/* Stage Overview Description */}
              <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-1.5">
                <div className="text-xs font-bold text-neutral-200 uppercase tracking-wide flex items-center justify-between">
                  <span>Stage Workflow Summary</span>
                  <span className="text-[10px] font-mono text-amber-400">Step #{selectedStage.stageNumber} of 11</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {selectedStage.description}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPayload(selectedStage.id)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                >
                  {copiedId === selectedStage.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Payload</span>
                    </>
                  )}
                </button>

                <a
                  href={selectedQrSvg}
                  download={`Stage_${selectedStage.stageCode}_${selectedStage.id}_QR.svg`}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>

              {onSelectStage && (
                <button
                  type="button"
                  onClick={() => handleSelectAndGo(selectedStage.id)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                >
                  <span>Log Into {selectedStage.stageCode} Workflow</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
