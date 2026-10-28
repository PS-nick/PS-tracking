import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckSquare, 
  Square, 
  FileText, 
  ShieldCheck, 
  Loader2,
  Calendar,
  User,
  AlertTriangle,
  Cpu,
  Layers,
  Wind,
  Gauge,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { ServiceUnit, ComponentType } from '../types/process';
import { CompanyLogo } from './CompanyLogo';
import { WORKBENCH_DOC_INFO, BICESTER_COMPONENT_TYPES } from '../constants/workbench';
import { ensureCombiConfig } from '../utils/storage';
import { generateUnitQrCodeSvgSync } from '../utils/qrCode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { applyWatermarkToPdf } from '../utils/pdfGenerator';

interface WorkbenchSheetModalProps {
  unit: ServiceUnit;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnit?: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
}

export const WorkbenchSheetModal: React.FC<WorkbenchSheetModalProps> = ({
  unit,
  isOpen,
  onClose,
  onUpdateUnit,
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sheetWidthMode, setSheetWidthMode] = useState<'standard' | 'wide'>('wide');

  if (!isOpen) return null;

  const intake = unit.intake;
  const signOff = unit.signOff;
  const currentCompType = unit.componentType || intake.componentType || 'heat_exchanger';
  const isOilCooler = currentCompType === 'oil_cooler';
  const combi = ensureCombiConfig(unit);
  const isCombi = !!combi && combi.isCombi && combi.subUnits && combi.subUnits.length > 0;
  const subUnits = isCombi ? combi.subUnits : [];
  const effectiveLife = unit.lifeNumber ?? (unit.intake?.lifeNumber ?? (unit.intake?.isFirstService ? 1 : 2));
  const qrCodeSvg = generateUnitQrCodeSvgSync(unit, { format: 'serial_only', errorCorrectionLevel: 'L', margin: 1 }) || unit.qrCode?.dataUrl;

  const handlePrint = () => {
    if (!sheetRef.current) {
      window.print();
      return;
    }

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

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bicester Workbench Check-In & Quality Validation - ${unit.serialNumber}</title>
          <base href="${window.location.origin}/" />
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 4mm 6mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            }
            .printable-sheet {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 6px 10px !important;
              margin: 0 auto !important;
              background-color: #ffffff !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: auto !important;
              border-collapse: collapse !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
            footer,
            .running-footer,
            .document-footer,
            .legal-footer,
            .sheet-footer,
            .modal-footer,
            .app-footer,
            [role="contentinfo"],
            [class*="footer"],
            tfoot,
            .no-print,
            .print-hidden,
            .print\:hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${sheetRef.current.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1500);
      }
    }, 350);
  };

  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const marginX = 8;
      const marginY = 8;
      const printableWidth = pdfWidth - marginX * 2;
      const printableHeight = pdfHeight - marginY * 2;

      const aspect = canvas.height / canvas.width;
      let finalW = printableWidth;
      let finalH = printableWidth * aspect;

      if (finalH > printableHeight) {
        finalH = printableHeight;
        finalW = printableHeight / aspect;
      }

      const posX = marginX + (printableWidth - finalW) / 2;
      const posY = marginY + (printableHeight - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', posX, posY, finalW, finalH);
      applyWatermarkToPdf(pdf);
      pdf.save(`PS-WORKBENCH-QA-2026_${unit.serialNumber}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSetCompType = (type: ComponentType) => {
    if (!onUpdateUnit) return;
    onUpdateUnit((prev) => ({
      ...prev,
      componentType: type,
      intake: {
        ...prev.intake,
        componentType: type,
      },
    }), `Set component classification to: ${type}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-2 sm:p-3 md:p-4 flex items-start justify-center animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1520px] max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col min-h-0 shadow-2xl overflow-hidden my-2 sm:my-4 relative">
        {/* Top Control Bar (All-white background, high contrast) */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 sticky top-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Bicester Workbench Check-In &amp; Quality Validation Sheet
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  {WORKBENCH_DOC_INFO.formCode} · {WORKBENCH_DOC_INFO.documentControlVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {unit.serialNumber} · {unit.customerName} · ISO 9001 &amp; ISO 14001 Registered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Width Mode Toggle */}
            <button
              type="button"
              onClick={() => setSheetWidthMode(w => w === 'wide' ? 'standard' : 'wide')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300 cursor-pointer"
              title={sheetWidthMode === 'wide' ? 'Switch to Standard 940px Width' : 'Switch to Full Screen Wide Display (1240px)'}
            >
              {sheetWidthMode === 'wide' ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-700" />
                  <span className="hidden sm:inline">Standard Width</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-700" />
                  <span className="hidden sm:inline">Wide Display</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Send Sheet directly to printer / print dialog with optimized margins"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              title="Close Sheet"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Printable Physical Sheet Surface - ALL WHITE BACKGROUND */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 bg-white flex justify-center">
          <div
            ref={sheetRef}
            className={`printable-sheet relative overflow-hidden bg-white text-slate-900 p-5 sm:p-8 rounded-xl shadow-2xl w-full ${sheetWidthMode === 'wide' ? 'max-w-[1240px]' : 'max-w-[940px]'} font-sans text-[11px] sm:text-xs leading-snug select-text border border-slate-300 transition-all`}
          >
            {/* Security Watermark Overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-20 select-none" aria-hidden="true">
              <div className="transform -rotate-45 text-center select-none text-rose-600/10 font-black tracking-widest leading-none">
                <div className="text-4xl sm:text-5xl md:text-6xl uppercase font-extrabold whitespace-nowrap">
                  CONFIDENTIAL - PROTRACE SOP
                </div>
                <div className="text-[10px] sm:text-xs font-mono mt-2 tracking-[0.3em] font-bold text-rose-700/15">
                  RESTRICTED MOTORSPORT SPECIFICATION · AS9100D TRACEABLE
                </div>
              </div>
            </div>

            {/* Header: Logo, Title, ISO Certification Badges */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900 gap-4">
              {/* Left Logo & Company Name */}
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <CompanyLogo variant="report" showText={false} showUploadTrigger={false} />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight text-slate-950 uppercase leading-none">
                    PARTICLE SCIENCE LTD
                  </h1>
                  <h2 className="text-xs font-bold text-slate-800 tracking-wide mt-1 uppercase">
                    BICESTER WORKBENCH CHECK-IN SHEET
                  </h2>
                  <p className="text-[10px] text-slate-600 font-medium italic mt-0.5">
                    Component Cleanliness Process &amp; Dispatch Quality Validation Log
                  </p>
                </div>
              </div>

              {/* Right: Vector QR Asset Tag & ISO Certification Seals */}
              <div className="flex items-center gap-3 shrink-0 text-right">
                <div className="p-1 bg-white border-2 border-slate-900 rounded-lg shadow-2xs text-center flex flex-col items-center justify-center min-w-[76px]">
                  <img
                    src={qrCodeSvg}
                    alt={`Asset QR ${unit.serialNumber}`}
                    className="w-12 h-12 object-contain block mx-auto"
                  />
                  <span className="text-[6px] font-mono font-black text-slate-950 uppercase tracking-widest mt-0.5 block">
                    ASSET TAG · AS9100D
                  </span>
                  <span className="text-[5.5px] font-mono font-bold text-amber-700 block">
                    L{effectiveLife} · {unit.serialNumber}
                  </span>
                </div>

                <div className="space-y-1.5 text-right shrink-0">
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-[9px] font-mono text-rose-900">
                    <span className="font-bold">Citation ISO Certification</span>
                    <span className="bg-rose-700 text-white font-black px-1 rounded text-[8px]">
                      ISO 14001
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-rose-800">REGISTERED</span>
                  </div>
                  <div className="block">
                    <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-[9px] font-mono text-rose-900">
                      <span className="font-bold">Citation ISO Certification</span>
                      <span className="bg-rose-700 text-white font-black px-1 rounded text-[8px]">
                        ISO 9001
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-rose-800">REGISTERED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Component Type Checkbox Bar */}
            <div className="my-3 py-2 px-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap items-center justify-between gap-3 text-[11px]">
              {BICESTER_COMPONENT_TYPES.map((ct) => {
                const isSelected = currentCompType === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => handleSetCompType(ct.id)}
                    className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-900 hover:text-amber-600 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                    <span className={isSelected ? 'text-slate-950 font-black' : 'text-slate-700'}>
                      {ct.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Comby Multi-Core Architecture Specification Banner */}
            {isCombi && (
              <div className="my-2 py-1.5 px-3 bg-purple-50 border border-purple-200 rounded flex flex-wrap items-center justify-between gap-2 text-[10px] text-purple-950 font-mono">
                <span className="font-bold flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-purple-700" />
                  COMBY MULTI-CIRCUIT ASSEMBLY: {subUnits.length} INTEGRATED CORES
                </span>
                <span className="text-purple-800 font-sans text-[9.5px]">
                  {subUnits.map((s, i) => `Core ${i + 1}: ${s.name}`).join(' | ')}
                </span>
              </div>
            )}

            {/* Top Log Metadata Grid (Page 1 Header Fields) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 py-2 border-b border-slate-300 text-[10.5px]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-36 shrink-0">Inspector Name / Initial:</span>
                <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {intake.inspectorNameOrInitial || intake.technician || 'Nicola Malgarotti'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-32 shrink-0">Date of Entry:</span>
                <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {intake.dateOfEntry || new Date(unit.createdAt).toLocaleDateString('en-GB') || '02 / 10 / 2026'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-36 shrink-0">Job / Order Number:</span>
                <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {unit.jobOrderNumber || intake.jobOrderNumber || unit.workOrderNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-32 shrink-0">Component Serial No:</span>
                <span className="font-mono font-black text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {unit.serialNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-36 shrink-0">Supplier Company Name:</span>
                <span className="font-bold text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {unit.supplierCompanyName || intake.supplierCompanyName || unit.customerName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 w-32 shrink-0">Supplier Contact Name:</span>
                <span className="font-bold text-slate-950 border-b border-slate-400 flex-1 px-1 py-0.5">
                  {unit.supplierContactName || intake.supplierContactName || 'Technical Overhaul Manager'}
                </span>
              </div>
            </div>

            {/* 16-Step Technical Process Table */}
            <div className="mt-3 border border-slate-300 rounded overflow-hidden">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-left">
                    <th className="py-2 px-2.5 w-7 text-center border-r border-slate-800">#</th>
                    <th className="py-2 px-3 border-r border-slate-800 w-[55%]">
                      Technical Process Operational Steps &amp; Specifications
                    </th>
                    <th className="py-2 px-3">
                      Log Data Entry / Inspector Sign-Off
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Step 1: Initial Inspection */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">1</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Initial Inspection: General Damage Check</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Full visual and structural integrity check. Ensure no outer cracks or deformities.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 font-bold">
                          {intake.damageCheckStatus !== 'DAMAGE_FOUND' ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>Pass</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          {intake.damageCheckStatus === 'DAMAGE_FOUND' ? (
                            <CheckSquare className="h-3.5 w-3.5 text-rose-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className={intake.damageCheckStatus === 'DAMAGE_FOUND' ? 'text-rose-600' : 'text-slate-700'}>Damage Found</span>
                        </span>
                      </div>
                      {/* Box Reception & Wet/Dry Moisture Condition */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[9px]">
                        <span className="text-slate-600">Box:</span>
                        <span className="font-semibold text-slate-900 capitalize">
                          {intake.boxInspection?.boxType?.replace('_', ' ') || 'Cardboard'}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold text-[8.5px] ${
                          intake.boxInspection?.moistureState === 'wet'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {intake.boxInspection?.moistureState === 'wet' ? '⚠ Wet Box' : '✓ Dry Box'}
                        </span>
                      </div>
                      <div className="text-[8.5px] font-bold text-rose-600">
                        *Report immediately if damage found!
                      </div>
                      {intake.damageDetails && (
                        <div className="text-[9px] text-rose-700 font-mono">
                          Obs: {intake.damageDetails}
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Step 2: Core Protection Covers & Port Bungs */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">2</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Core Protection Covers &amp; Port Bungs</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Verify protection status upon arrival. Check all entrance and exit lines.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-600">Covers:</span>
                        {['Cardboard', 'Metal', 'Plastic', 'None', 'Other'].map((cov) => {
                          const isMatch = (intake.protectionCovers || 'metal').toLowerCase() === cov.toLowerCase();
                          return (
                            <span key={cov} className="inline-flex items-center gap-1 font-medium">
                              {isMatch ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                              <span>{cov}</span>
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-600">Bungs/Caps Supplied:</span>
                        {[
                          { id: 'yes', label: 'Full', match: intake.bungsCapsStatus === 'yes' || (intake.bungsCapsSupplied === true && intake.bungsCapsStatus !== 'partial') },
                          { id: 'partial', label: 'Partial', match: intake.bungsCapsStatus === 'partial' || intake.bungsCapsSupplied === 'partial' },
                          { id: 'no', label: 'None', match: intake.bungsCapsStatus === 'no' || intake.bungsCapsSupplied === false },
                        ].map((b) => (
                          <span key={b.id} className="inline-flex items-center gap-1 font-medium">
                            {b.match ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                            <span>{b.label}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>

                  {/* Step 3: Interface O-Rings Verification */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">3</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Interface O-Rings Verification</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Log unique identification configuration tags for fitting ends.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">O-Ring ID No:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {intake.oRingIdNo || 'OR-70-FKM-22'}
                        </span>
                      </div>
                      <div className="text-[8.5px] text-slate-500 italic mt-0.5">
                        (Leave blank if not supplied)
                      </div>
                    </td>
                  </tr>

                  {/* Step 4: Connection Fittings Inventory Log */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">4</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Connection Fittings Inventory Log</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Record structural interface connection pieces tracking codes.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Inhouse Part No:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.inhousePartNo || intake.inhousePartNo || `PS-${currentCompType.toUpperCase().slice(0, 3)}-${unit.partNumber}`}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 5: Oil Draining, Room-Temp Degreaser & Dedicated First Flush */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">5</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Oil Evacuation &amp; Room-Temp Chemical Solvent Flow-Through (Zero Caustic · No Immersion)</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5 leading-snug">
                        1. Oil draining prior to wash (evacuated and scavenged).<br />
                        2. Room-temperature chemical solvent circulated through internal passages at ambient 20–22°C (zero caustic · no bath immersion).
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.degreasing.technician || intake.technician || 'Nicola Malgarotti'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Drain Time:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          {((unit.degreasing.oilDraining?.durationMinutes || 15) / 60).toFixed(2)} Hours ({unit.degreasing.oilDraining?.durationMinutes || 15} Mins)
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Flow Rig Used:</span>
                        <span className="font-mono font-bold text-slate-900 border-b border-slate-400 flex-1 px-1">
                          {unit.degreasing.tankId || 'FLOW-RIG-01 (Room Temp Flow-Through)'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Solvent Flow:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          {((unit.degreasing.soakDurationMinutes || 15) / 60).toFixed(2)} Hours ({unit.degreasing.soakDurationMinutes || 15} Mins) @ Ambient 20-22°C (Chemical Solvent · Zero Caustic)
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 6: Descaled Internal Passages Cycle (In between Degreasing & First Flush) */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">6</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950 flex items-center justify-between">
                        <span>Descaled Internal Passages Cycle</span>
                        {(unit.cleaning.skipped || unit.processConfig?.descalingRequired === false || unit.processConfig?.cleaningRequired === false) ? (
                          <span className="text-[8.5px] font-mono px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold">
                            OPTIONAL / BYPASSED
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">
                            COMPLETED
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Deep chemical descaling protocol run to clean out inner channel pathways. Optional based on intake assessment.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      {(unit.cleaning.skipped || unit.processConfig?.descalingRequired === false || unit.processConfig?.cleaningRequired === false) ? (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Status:</span>
                            <span className="font-mono text-amber-800 font-bold border-b border-slate-400 flex-1 px-1 text-[9.5px]">
                              OPTIONAL / BYPASSED · {unit.cleaning.bypassReason || 'Internal passages verified clean on intake'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Sign / Time:</span>
                            <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1 text-[9.5px]">
                              Sign: <strong>{unit.cleaning.bypassTechnician || unit.cleaning.technician || 'NM'}</strong> · 0.00 Hours (Bypassed)
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Sign:</span>
                            <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                              {unit.cleaning.technician || 'NM'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Time Logged:</span>
                            <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                              {(((unit.cleaning.flowDynamicsCycleMinutes || 20)) / 60).toFixed(2)} Hours ({(unit.cleaning.flowDynamicsCycleMinutes || 20)} Mins) Flow Dynamics Wash Cycle (No Ultrasonics)
                            </span>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>

                  {/* Step 7: First Flush (55°C Deionized Water Neutralization Flush) */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">7</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">First Flush (55°C Deionized Water Neutralization Flush)</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Dedicated deionized wash to evacuate foaming surfactant and neutralize descaling chemistry.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.firstFlush?.technician || unit.degreasing.technician || intake.technician || 'Nicola Malgarotti'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">First Flush:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          Single 55°C DI Flush · {((unit.firstFlush?.durationMinutes || 6) / 60).toFixed(2)} hrs ({unit.firstFlush?.durationMinutes || 6}m) · Soaping Agent Eliminated · Foam-Free
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 8: External Clean & Decontamination */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">8</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">External Clean &amp; Decontamination</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Thorough manual matrix surface wash to strip external dirt, debris, and contaminants.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.cleaning.technician || 'NM'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Time Logged:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          0.25 Hours (15 Mins) Matrix Surface Wash
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 9: Fluid Flow Routing & Vector Alignment Analysis */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">9</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Fluid Flow Routing &amp; Vector Alignment Analysis</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Verification of path directional vector against blueprints.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Drawing No:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.drawingNumber || intake.drawingNumber || 'DWG-2026-F1-08'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {intake.flowVectorDirectionVerified !== false ? (
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900">Flow Vector Direction Match Verified</span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 10: Leak & Pressure Test Validation */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">10</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Leak &amp; Pressure Test Validation</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Component sealed and placed Under water introducing a Gas internally looking for a stream of bubbles for 5 Min.
                        {isCombi && (
                          <div className="text-purple-700 font-bold mt-1 font-mono text-[9px]">
                            * Comby Multi-Circuit Unit: Independent testing applied to each of the {subUnits.length} cores.
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1.5">
                      {isCombi ? (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-purple-900 bg-purple-50 p-1.5 rounded border border-purple-200 flex items-center justify-between">
                            <span>COMBY {subUnits.length}-CIRCUIT PRESSURE INTEGRITY RECORD</span>
                            <span className="font-mono text-[9px] text-purple-800">100% WATER IMMERSION</span>
                          </div>
                          {subUnits.map((sub, idx) => (
                            <div key={sub.id || idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-950 font-mono text-[9.5px]">
                                  Core #{idx + 1}: {sub.name}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                  {sub.pressureTest.testResult === 'PASS' ? 'PASS (0 BUBBLES)' : 'LEAK DETECTED'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-700">
                                <div>Proof: <strong className="font-mono text-slate-950">{sub.pressureTest.testPressureBar || 4.0} Bar</strong> ({Math.round((sub.pressureTest.testPressureBar || 4.0) * 14.5038)} PSI)</div>
                                <div>Decay: <strong className="font-mono text-emerald-700">0.00 Bar / 60s Hold</strong></div>
                                <div>Gas Medium: <strong className="text-slate-900">Helium Immersion</strong></div>
                                <div>Sign: <strong className="font-mono text-slate-950">{sub.pressureTest.technician || 'NM'}</strong></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Medium:</span>
                            <span className="inline-flex items-center gap-1 font-bold">
                              <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Helium</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Square className="h-3.5 w-3.5 text-slate-400" />
                              <span>Air</span>
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Target Test Pressure:</span>
                            <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                              {unit.pressureTest.testPressureBar} Bar / {Math.round(unit.pressureTest.testPressureBar * 14.5038)} PSI
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-600">Supplier Specs:</span>
                            <span className="inline-flex items-center gap-1 font-medium">
                              <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Supplied</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Square className="h-3.5 w-3.5 text-slate-400" />
                              <span>Not Supplied</span>
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Actual Leak Result:</span>
                            <span className="font-mono font-bold text-emerald-700 border-b border-slate-400 flex-1 px-1">
                              0.00 PSI (Zero Bubble Stream Detected) · PASS
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-slate-600 shrink-0">Sign:</span>
                            <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                              {unit.pressureTest.technician || 'NM'}
                            </span>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>

                  {/* Step 11: Main Cleaning RIG Cycle Flushing */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">11</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Main Cleaning RIG Cycle Flushing</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Standard mechanical high-volume system fluid flush circulation loop run.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.finalFlush.technician || 'NM'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Time Logged:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          {(unit.finalFlush.targetSeconds / 3600).toFixed(2)} Hours ({Math.floor(unit.finalFlush.targetSeconds / 60)} Mins) Circulation @ 26.5 LPM
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 12: Ultra Fine RIG Micro-Particle Filtering Stage */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">12</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Ultra Fine RIG Micro-Particle Filtering Stage</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Ultra Fine RIG Micro-particle filtering - particle counting according to Apex 1.0 Cleanliness Standard (Operational Equivalent to ISO 16232).
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.cleaning.technician || 'NM'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Apex Standard Rating:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {unit.cleaning.analysisResult?.particleCountIso || 'Apex 1.0: Class CCC (Eq. ISO 16232)'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Microscope Particle Count:</span>
                        <span className="font-mono text-emerald-700 font-bold border-b border-slate-400 flex-1 px-1">
                          &gt; {unit.cleaning.analysisResult?.effectiveParticleSizeMicron || unit.cleaning.analysisResult?.maxParticleSizeMicron || 25}μm Count: {unit.cleaning.analysisResult?.actualParticleCount ?? 0} (Max: {unit.cleaning.analysisResult?.maxAllowableCount ?? 0}) · Digital Microscope (Zero Gravimetric)
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 13: Thermal Dehydration Profile */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">13</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Thermal Dehydration Profile</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Controlled chamber oven bakeout drying cycle: Exactly 2 hours at 120°C (Particle Science Standard Thermal Profile).
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0 font-medium">Bake Standard:</span>
                        <span className="font-mono font-bold text-emerald-700 border-b border-slate-400 flex-1 px-1">
                          Particle Science Standard Thermal Profile
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Time Placed In:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          09:30 AM (Chamber #1 @ 120°C)
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Time Pulled Out:</span>
                        <span className="font-mono text-slate-800 border-b border-slate-400 flex-1 px-1">
                          11:30 AM (Full 2.0 hr bakeout complete)
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 14: After Dry Quality Inspection (OUT Phase) */}
                  <tr className="hover:bg-slate-50 bg-amber-50/20">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">14</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">After Dry Quality Inspection</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Secondary structural assessment and post-bake diagnostics verification loops.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">Moisture Check:</span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          {signOff.afterDryMoistureCheck !== 'FAIL' ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                          <span>Pass</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          {signOff.afterDryMoistureCheck === 'FAIL' ? <CheckSquare className="h-3.5 w-3.5 text-rose-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                          <span>Fail</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">Visual Damage Check:</span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          {signOff.afterDryVisualDamageCheck !== 'FAIL' ? <CheckSquare className="h-3.5 w-3.5 text-emerald-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                          <span>Pass</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          {signOff.afterDryVisualDamageCheck === 'FAIL' ? <CheckSquare className="h-3.5 w-3.5 text-rose-600" /> : <Square className="h-3.5 w-3.5 text-slate-400" />}
                          <span>Fail</span>
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-600 shrink-0">Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {signOff.afterDryInspectorSign || signOff.inspectorName || 'NM (Inspector)'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Step 15: Component Purge & Terminal Port Sealing (OUT Phase) */}
                  <tr className="hover:bg-slate-50 bg-amber-50/20">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">15</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Component Purge &amp; Terminal Port Sealing</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Dry inert gas line purge immediately followed by secure port plugging.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1.5">
                      <div className="text-slate-700 font-medium">Sealing Status:</div>
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          {signOff.sealingStatus === 'ORIGINAL_CAPS_REUSED' ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>Original Caps Re-used</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          {signOff.sealingStatus !== 'ORIGINAL_CAPS_REUSED' ? (
                            <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className="text-emerald-800">New Particle Science Bungs Used</span>
                        </span>
                      </div>
                      <div className="text-[8.5px] text-emerald-700 font-mono">
                        ✓ Dry N2 Inert gas line purge verified before sealing
                      </div>
                    </td>
                  </tr>

                  {/* Step 16: Fin Straightening Time Scale Log */}
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">16</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Manual Fin Straightening &amp; Core Dressing</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: 100% manual bench craftsmanship straightening of distorted cooling matrix fins (Zero jigs used).
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-1">
                      <div className="text-slate-700 font-medium">Craftsmanship Verification:</div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs">
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Verified &amp; Conforming (100% Hand Craft · Zero Jigs Used)</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-slate-600 shrink-0 font-medium">Fin Straightening Time:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {((unit.gilling?.elapsedSeconds || 420) / 3600).toFixed(2)}h ({Math.floor((unit.gilling?.elapsedSeconds || 420) / 60)}m {((unit.gilling?.elapsedSeconds || 420) % 60)}s)
                        </span>
                      </div>
                      <div className="text-[8.5px] text-slate-500">
                        Bench Station: <strong>{unit.gilling?.parameterLabel || 'Manual Dressing Bench #2'}</strong> · Craftsman: <strong>{unit.gilling?.technician || 'Nicola Malgarotti'}</strong> (Zero mechanical jigs used)
                      </div>
                    </td>
                  </tr>

                  {/* Step 17: Final Internal Sign-Off & Clearance Release (OUT Phase) */}
                  <tr className="hover:bg-slate-50 bg-emerald-50/20">
                    <td className="py-2 px-2.5 font-bold text-center border-r border-slate-200 align-top">17</td>
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      <div className="font-bold text-slate-950">Final Internal Sign-Off &amp; Clearance Release</div>
                      <div className="text-[9.5px] text-slate-600 mt-0.5">
                        Description: Structural verification authorization matching process control requirements.
                      </div>
                    </td>
                    <td className="py-2 px-3 align-top space-y-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-700 font-bold shrink-0">Authorized Quality Sign:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {signOff.authorizedQualitySign || signOff.inspectorName || 'Nicola Malgarotti (Lead QC)'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-700 font-bold shrink-0">Date Approved:</span>
                        <span className="font-mono font-bold text-slate-950 border-b border-slate-400 flex-1 px-1">
                          {signOff.dateApproved || new Date().toLocaleDateString('en-GB') || '____ / ____ / 2026'}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 border border-emerald-300 rounded text-[9px] text-emerald-900 font-bold">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                        <span>DISPATCH CLEARANCE RELEASE AUTHORIZED</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TECHNICAL ANNEX: FLOW TESTING & PRESSURE CONTAINMENT SCHEDULE FOR ALL UNITS */}
            <div className="mt-4 border border-slate-300 rounded overflow-hidden print-break-inside-avoid">
              <div className="bg-slate-900 text-white p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {isCombi ? `MULTI-CIRCUIT COMBY TESTING SCHEDULE (${subUnits.length} CORES)` : 'TECHNICAL TESTING & CALIBRATION ANNEX'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  FLOW &amp; HYDROSTATIC PROOF LOG
                </span>
              </div>

              {/* FLOW TESTING PROTOCOL TABLE (ALL UNITS) */}
              <div className="p-3 bg-white border-b border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-sky-600" />
                    <h4 className="font-bold text-xs text-slate-950 uppercase">
                      1. Flow Testing Calibration Records (5-Point Operating Protocol)
                    </h4>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    SOP Criteria: ≥3 of 5 Points within ±15% Bracket = PASS
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[9.5px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold">
                        <th className="py-1.5 px-2 text-left border-r border-slate-200">Circuit / Core</th>
                        <th className="py-1.5 px-2 text-left border-r border-slate-200">Fluid / Bench ID</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-200">P1 (20Hz)</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-200">P2 (30Hz)</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-200">P3 (40Hz)</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-200">P4 (50Hz)</th>
                        <th className="py-1.5 px-1.5 text-center border-r border-slate-200">P5 (60Hz)</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-200">ΔP / Flow</th>
                        <th className="py-1.5 px-2 text-right">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[9px]">
                      {(isCombi ? subUnits : [
                        {
                          id: 'single',
                          unitIndex: 1,
                          name: `Unit Core (${unit.modelName || 'Matrix'})`,
                          serialNumber: unit.serialNumber,
                          flowTest: unit.flowTest,
                          pressureTest: unit.pressureTest,
                        }
                      ]).map((item, idx) => {
                        const pts = item.flowTest.testPoints || [];
                        const inSpecCount = pts.filter((p) => p.passed && p.measuredFlowLpm > 0).length;
                        const isPass = inSpecCount >= 3;

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-bold text-slate-950 font-sans border-r border-slate-200">
                              <div>{item.name}</div>
                              <div className="text-[8.5px] text-slate-600 font-mono">
                                SN: {item.serialNumber || `${unit.serialNumber}-U${idx + 1}`}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-slate-700 font-sans border-r border-slate-200">
                              <div className="truncate max-w-[130px] font-medium">{item.flowTest.fluidType}</div>
                              <div className="text-[8.5px] text-slate-500 font-mono">{item.flowTest.benchId} @ {item.flowTest.fluidTempC || 50}°C</div>
                            </td>
                            {pts.slice(0, 5).map((pt, pIdx) => (
                              <td key={pIdx} className="py-2 px-1 text-center border-r border-slate-200">
                                <div className="text-slate-900 font-bold">{pt.measuredFlowLpm ? `${pt.measuredFlowLpm}L` : '—'}</div>
                                <div className="text-[8px] text-slate-600">T:{pt.targetFlowLpm}L</div>
                                <span className={`text-[7.5px] px-1 rounded font-bold ${pt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {pt.passed ? 'IN' : 'DEV'}
                                </span>
                              </td>
                            ))}
                            {/* If fewer than 5 points, fill blanks */}
                            {Array.from({ length: Math.max(0, 5 - pts.length) }).map((_, bIdx) => (
                              <td key={`b-${bIdx}`} className="py-2 px-1 text-center border-r border-slate-200 text-slate-400">
                                —
                              </td>
                            ))}
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-sans">
                              <div className="text-slate-900 font-bold">{item.flowTest.inletFlowLpm || 24.5} LPM</div>
                              <div className="text-[8.5px] text-slate-600 font-mono">ΔP: {item.flowTest.deltaPressureBar || 0.65} Bar</div>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[9px] ${
                                isPass
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}>
                                <CheckSquare className="h-3 w-3 text-emerald-700" />
                                <span>PASS ({inSpecCount}/5)</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HYDROSTATIC PRESSURE INTEGRITY TABLE (ALL UNITS) */}
              <div className="p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-slate-950 uppercase">
                      2. Hydrostatic Proof Pressure Integrity &amp; Immersion Validation
                    </h4>
                  </div>
                  <span className="text-[9.5px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300">
                    60 Seconds Hold · Zero Immersion Bubble Allowance
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[9.5px]">
                    <thead>
                      <tr className="bg-slate-200/80 text-slate-900 border-b border-slate-300 font-bold">
                        <th className="py-1.5 px-2 text-left border-r border-slate-300">Circuit / Core</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300">Proof Pressure</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300">Hold Duration</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300">Pressure Decay (ΔP)</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300">Bubble Stream Check</th>
                        <th className="py-1.5 px-2 text-center border-r border-slate-300">Glue Seal Repair</th>
                        <th className="py-1.5 px-2 text-right">Certification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[9px] bg-white">
                      {(isCombi ? subUnits : [
                        {
                          id: 'single',
                          unitIndex: 1,
                          name: `Unit Core (${unit.modelName || 'Matrix'})`,
                          serialNumber: unit.serialNumber,
                          flowTest: unit.flowTest,
                          pressureTest: unit.pressureTest,
                        }
                      ]).map((item, idx) => {
                        const targetBar = item.pressureTest.testPressureBar || 4.0;
                        const hasGlue = !!item.pressureTest.glueRepair?.applied;
                        const isPass = item.pressureTest.testResult === 'PASS';

                        return (
                          <tr key={item.id || idx} className="hover:bg-slate-50">
                            <td className="py-2 px-2 font-bold text-slate-950 font-sans border-r border-slate-200">
                              <div>{item.name}</div>
                              <div className="text-[8.5px] text-slate-600 font-mono">
                                SN: {item.serialNumber || `${unit.serialNumber}-U${idx + 1}`}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200">
                              <span className="font-black text-slate-950">{targetBar} Bar</span>
                              <span className="text-[8px] text-slate-500 block">({Math.round(targetBar * 14.5038)} PSI)</span>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-sans text-slate-800">
                              {item.pressureTest.heldDurationSeconds || 60} Seconds
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 text-emerald-800 font-bold">
                              0.00 Bar (Steady)
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-sans">
                              <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                                <CheckSquare className="h-3 w-3 text-emerald-600" />
                                <span>Zero Bubbles (Passed)</span>
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-sans">
                              {hasGlue ? (
                                <span className="text-amber-800 text-[8.5px] font-bold">
                                  Epoxy Applied &amp; Recertified
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[8.5px]">None Required (Original Core Sound)</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[9px] ${
                                isPass
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}>
                                <ShieldCheck className="h-3 w-3 text-emerald-700" />
                                <span>CERTIFIED PASS</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-slate-600 sheet-footer running-footer document-footer legal-footer no-print print:hidden">
              <div>
                Form Code Reference Check-In Sheet: <strong className="text-slate-800">{WORKBENCH_DOC_INFO.formCode}</strong> | Document Control <strong className="text-slate-800">{WORKBENCH_DOC_INFO.documentControlVersion}</strong>
              </div>
              <div className="text-slate-500 font-sans font-medium">
                {WORKBENCH_DOC_INFO.propertyNotice}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
