import React, { useRef, useState } from 'react';
import { X, Printer, Download, QrCode, Copy, Check, ArrowRight, Tag, SlidersHorizontal } from 'lucide-react';
import { ServiceUnit } from '../types/process';
import { downloadQrCodeImage, generateUnitQrCodeSvgSync } from '../utils/qrCode';

interface UnitQrLabelModalProps {
  unit: ServiceUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onScanForNewIntake?: (unit: ServiceUnit) => void;
}

export const UnitQrLabelModal: React.FC<UnitQrLabelModalProps> = ({
  unit,
  isOpen,
  onClose,
  onScanForNewIntake,
}) => {
  const [copied, setCopied] = useState(false);
  const [labelFormat, setLabelFormat] = useState<'tape_24mm' | 'standard'>('tape_24mm');
  const [qrFormat, setQrFormat] = useState<'serial_only' | 'json'>('serial_only');
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !unit) return null;

  // Use crisp SVG QR code with simplified low-density payload (Level L error correction for largest possible dots)
  const qrSvgUrl = generateUnitQrCodeSvgSync(unit, {
    format: qrFormat,
    errorCorrectionLevel: 'L',
    margin: 1,
  });
  const qrDataUrl = qrSvgUrl || unit.qrCode?.dataUrl;
  const life = unit.lifeNumber ?? (unit.intake?.lifeNumber ?? (unit.intake?.isFirstService ? 1 : 2));
  const compType = (unit.componentType || unit.intake?.componentType || 'HEAT_EXCHANGER').replace('_', ' ');

  const currentPayloadText = qrFormat === 'serial_only' 
    ? String(unit.serialNumber || unit.id).trim() 
    : JSON.stringify({ unit: String(unit.serialNumber || unit.id).trim(), life: Number(life) || 1 });

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(currentPayloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
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

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>24mm Tape Label - ${unit.serialNumber}</title>
          <style>
            @page {
              size: 80mm 24mm landscape;
              margin: 0;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 1.5mm 2.5mm;
              width: 80mm;
              height: 24mm;
              max-height: 24mm;
              background: #ffffff;
              color: #000000;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              display: flex;
              align-items: center;
              justify-content: space-between;
              overflow: hidden;
            }
            .qr-col {
              width: 21mm;
              height: 21mm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .qr-col img {
              width: 21mm;
              height: 21mm;
              image-rendering: pixelated;
              display: block;
            }
            .info-col {
              flex: 1;
              min-width: 0;
              height: 21mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding-left: 2.5mm;
              line-height: 1.1;
            }
            .brand {
              font-size: 6.5pt;
              font-weight: 900;
              letter-spacing: 0.5px;
              color: #475569;
            }
            .serial {
              font-size: 11pt;
              font-weight: 900;
              color: #000000;
              letter-spacing: -0.3px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .badge-row {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .life-pill {
              background: #000000;
              color: #ffffff;
              font-size: 6.5pt;
              font-weight: 900;
              padding: 0.5px 3px;
              border-radius: 2px;
            }
            .type {
              font-size: 6.5pt;
              font-weight: 800;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .meta {
              font-size: 6.5pt;
              font-weight: 700;
              color: #1e293b;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body>
          <div class="qr-col">
            <img src="${qrDataUrl}" alt="QR" />
          </div>
          <div class="info-col">
            <div>
              <div class="brand">PARTICLE SCIENCE · 24MM</div>
              <div class="serial">${unit.serialNumber}</div>
            </div>
            <div class="badge-row">
              <span class="life-pill">LIFE #${life}</span>
              <span class="type">${compType}</span>
            </div>
            <div class="meta">WO #${unit.workOrderNumber || 'N/A'} · PN: ${unit.partNumber || '—'}</div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
  };

  const handleDownload = () => {
    if (qrDataUrl) {
      downloadQrCodeImage(qrDataUrl, `${unit.serialNumber}_24mm_Tape_QR`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-tight">
                Traceable Asset QR Tag
              </h3>
              <p className="text-[11px] text-neutral-400">
                Optimized for 24 mm industrial continuous label tape
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR Density / Simplicity Selector for 24mm tape */}
        <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-neutral-300 flex items-center gap-1.5 font-bold">
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
              <span>QR Dot Pitch (24mm Tape Readability):</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQrFormat('serial_only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qrFormat === 'serial_only'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                }`}
                title="Only serial number in QR payload. Result: Version 1 matrix (21x21 modules) with maximal physical dot size for instantaneous barcode gun read"
              >
                Simple (Largest Dots)
              </button>
              <button
                type="button"
                onClick={() => setQrFormat('json')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  qrFormat === 'json'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                }`}
                title="Serial and life cycle in compact JSON"
              >
                Asset JSON (Unit + Life)
              </button>
            </div>
          </div>
        </div>

        {/* 24mm Tape Notification Callout */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
          <Tag className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-200">24 mm Tape Ready:</strong> {qrFormat === 'serial_only' ? 'Simple low-density 21x21 matrix' : 'Compact 25x25 matrix'} with Level L Error Correction. Guaranteed 100% instant optical capture on Brother P-touch, Dymo, Zebra, and mobile cameras.
          </div>
        </div>

        {/* Printable Physical Asset Label Container */}
        <div 
          ref={printRef}
          className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-center items-center overflow-x-auto"
        >
          {labelFormat === 'tape_24mm' ? (
            /* 24 mm Tape Strip Representation (Exact proportions for 24mm height tape) */
            <div className="w-[340px] h-[92px] bg-white text-black p-2 rounded-sm border-2 border-black flex items-center justify-between gap-3 font-mono shadow-md select-none print:shadow-none print:m-0 print:border-black">
              {/* QR Code Column */}
              <div className="shrink-0 flex items-center justify-center bg-white">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`24mm QR for ${unit.serialNumber}`}
                    className="w-[74px] h-[74px] object-contain block image-rendering-pixelated"
                  />
                ) : (
                  <div className="w-[74px] h-[74px] border border-black flex items-center justify-center text-[9px]">
                    NO QR
                  </div>
                )}
              </div>

              {/* High-Contrast Thermal Text Output */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-[74px] py-0.5 text-left leading-tight">
                <div>
                  <div className="text-[7.5px] uppercase font-bold text-slate-600 tracking-wider">
                    PARTICLE SCIENCE · 24MM
                  </div>
                  <div className="text-sm font-black text-black tracking-tight truncate">
                    {unit.serialNumber}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1 py-0.2 bg-black text-white text-[8px] font-black rounded-xs">
                    LIFE #{life}
                  </span>
                  <span className="text-[8px] font-bold text-black uppercase truncate">
                    {compType}
                  </span>
                </div>

                <div className="text-[8px] font-bold text-slate-800 truncate">
                  WO #{unit.workOrderNumber || 'N/A'} · PN: {unit.partNumber || '—'}
                </div>
              </div>
            </div>
          ) : (
            /* Standard Card Tag Representation */
            <div className="w-full max-w-sm bg-white text-slate-900 rounded-xl p-4 border-2 border-slate-300 shadow-md space-y-2.5 font-sans print:border-black">
              <div className="border-b-2 border-slate-900 pb-1.5 text-center">
                <div className="text-xs font-black tracking-tight text-slate-900 uppercase">
                  PARTICLE SCIENCE TRACKING SYSTEM
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white rounded border-2 border-slate-900 shrink-0">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${unit.serialNumber}`}
                      className="w-24 h-24 object-contain block image-rendering-pixelated"
                    />
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0 text-left font-mono">
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase block font-semibold">Serial Number:</span>
                    <span className="text-sm font-black text-slate-950 tracking-tight block truncate">
                      {unit.serialNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase block font-semibold">Part Number:</span>
                    <span className="text-[11px] font-bold text-slate-800 block truncate">
                      {unit.partNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      LIFE #{life}
                    </span>
                    <span className="text-[8px] text-slate-600 truncate">
                      WO #{unit.workOrderNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-amber-400" />
            <span>Print {labelFormat === 'tape_24mm' ? '24 mm Tape' : 'Label'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-sky-400" />
            <span>Download QR SVG</span>
          </button>
        </div>

        {/* Scan as New Intake action button */}
        {onScanForNewIntake && (
          <div className="pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => {
                onScanForNewIntake(unit);
                onClose();
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <QrCode className="h-4 w-4 stroke-[2.5]" />
              <span>Initiate New Intake with this QR Code</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Payload Copy footer */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'QR Payload Copied' : 'Copy Compact Payload'}</span>
          </button>
          <span className="font-mono text-[10px] text-neutral-500">
            24 mm Tape Standard · Version 2 Matrix
          </span>
        </div>
      </div>
    </div>
  );
};
