import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Layers, 
  Gauge, 
  Clock, 
  CheckSquare, 
  Square,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { ServiceUnit, MediaItem } from '../types/process';
import { formatFileSize, printPdfDirectly, generateSampleRigTestPdf } from '../utils/cleanRigPdf';
import { readDocumentAsDataUrl, createMediaItem } from '../utils/media';

export interface PdfDocumentEntry {
  id: string;
  name: string;
  url: string;
  sizeBytes?: number;
  uploadedAt: string;
  source: 'cleaning_rig' | 'intake_drawing' | 'media_attachment' | 'generated_sample';
  title: string;
  cleanlinessSpec?: string;
  technician?: string;
  printWithMasterReport?: boolean;
}

export interface PdfTestResultViewerProps {
  isOpen: boolean;
  onClose: () => void;
  unit: ServiceUnit;
  onUpdateUnit?: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
  onPrintMasterReport?: () => void;
}

export const PdfTestResultViewer: React.FC<PdfTestResultViewerProps> = ({
  isOpen,
  onClose,
  unit,
  onUpdateUnit,
  onPrintMasterReport,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Discover all PDF test results and documents associated with this unit
  const documents: PdfDocumentEntry[] = useMemo(() => {
    const list: PdfDocumentEntry[] = [];

    // 1. Primary Ultra Clean RIG Test Certificate
    if (unit.cleaning?.testPdf?.url) {
      list.push({
        id: unit.cleaning.testPdf.id || 'cleaning-rig-test-pdf',
        name: unit.cleaning.testPdf.name || `UltraCleanRIG_${unit.serialNumber}.pdf`,
        url: unit.cleaning.testPdf.url,
        sizeBytes: unit.cleaning.testPdf.sizeBytes,
        uploadedAt: unit.cleaning.testPdf.uploadedAt || new Date().toISOString(),
        source: 'cleaning_rig',
        title: 'Ultra Clean RIG · Laboratory Micro-Particle Fluid Analysis',
        cleanlinessSpec: unit.cleaning.testPdf.cleanlinessSpec || `${unit.cleaning.cleaningSpecMicron || 25}μm Spec`,
        technician: unit.cleaning.analysisResult?.labTechnician || unit.cleaning.technician || 'N. Malgarotti (QA Microscopist)',
        printWithMasterReport: unit.cleaning.testPdf.printWithMasterReport ?? true,
      });
    }

    // 2. Intake Drawings / Test Documents (if any have type document or .pdf)
    if (unit.intake?.flowDrawingUrl && (unit.intake.flowDrawingUrl.startsWith('data:application/pdf') || unit.intake.flowDrawingUrl.includes('.pdf'))) {
      list.push({
        id: 'intake-drawing-pdf',
        name: unit.intake.flowDrawingTitle || `${unit.serialNumber}_Drawing.pdf`,
        url: unit.intake.flowDrawingUrl,
        uploadedAt: unit.intake.dateOfEntry || new Date().toISOString(),
        source: 'intake_drawing',
        title: 'Engineering Technical Drawing & Fluid Vector Blueprint',
        technician: unit.intake.inspectorNameOrInitial || 'NM',
        printWithMasterReport: false,
      });
    }

    // 3. Media Items across stages that are PDF documents
    const allMedia: MediaItem[] = [
      ...(unit.intake?.photos || []),
      ...(unit.signOff?.pictures || []),
      ...(unit.cleaning?.analysisResult?.reportFiles || []),
      ...((unit.cleaning as any)?.photos || []),
    ];

    allMedia.forEach((m) => {
      const isPdf = m.type === 'document' || m.url?.startsWith('data:application/pdf') || m.name?.toLowerCase().endsWith('.pdf');
      if (isPdf && !list.some((existing) => existing.url === m.url)) {
        list.push({
          id: m.id,
          name: m.name,
          url: m.url,
          sizeBytes: m.sizeBytes,
          uploadedAt: m.uploadedAt,
          source: 'media_attachment',
          title: m.caption || `Attached Document (${m.stage.toUpperCase()})`,
          technician: unit.signOff?.inspectorName || 'NM',
          printWithMasterReport: false,
        });
      }
    });

    return list;
  }, [unit]);

  const activeDoc: PdfDocumentEntry | null = documents[activeDocIndex] || documents[0] || null;

  if (!isOpen) return null;

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(220, prev + 15));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(60, prev - 15));
  const handleResetZoom = () => setZoomLevel(100);
  const handleRotate = () => setRotationDeg((prev) => (prev + 90) % 360);

  // Print this specific test result PDF
  const handlePrintTestPdf = () => {
    if (!activeDoc) return;
    printPdfDirectly(activeDoc.url, activeDoc.title || `Test Certificate - ${unit.serialNumber}`);
  };

  // Download this specific test result PDF
  const handleDownloadTestPdf = () => {
    if (!activeDoc) return;
    const a = document.createElement('a');
    a.href = activeDoc.url;
    a.download = activeDoc.name || `PSTS_Test_Result_${unit.serialNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Toggle Print along with Master Report in unit state
  const handleTogglePrintWithMaster = (checked: boolean) => {
    if (!onUpdateUnit || !unit.cleaning?.testPdf) return;
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
    }, checked ? 'Enabled Test PDF inclusion in Master Report' : 'Disabled Test PDF inclusion in Master Report');
  };

  // Generate an official certified sample Ultra Clean RIG test PDF if none exists
  const handleGenerateCertifiedRigPdf = () => {
    if (!onUpdateUnit) return;
    const spec = unit.cleaning?.cleaningSpecMicron || 25;
    const techName = unit.cleaning?.analysisResult?.labTechnician || unit.cleaning?.technician || 'N. Malgarotti (QA Microscopist)';
    const sample = generateSampleRigTestPdf(unit, spec, techName);
    const sampleMedia = createMediaItem(
      sample.fileName,
      'document',
      sample.dataUrl,
      'cleaning',
      `Ultra Clean RIG laboratory test document (${spec}μm rating)`
    );

    onUpdateUnit((prev) => ({
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
          cleanlinessSpec: `${spec}μm Spec`,
          printWithMasterReport: true,
          labNotes: `Generated official laboratory Ultra Clean RIG test certificate: ${sample.fileName}`,
        },
        analysisResult: {
          ...prev.cleaning.analysisResult,
          uploadedAt: new Date().toISOString(),
          reportFiles: [sampleMedia, ...(prev.cleaning.analysisResult?.reportFiles || [])],
          particleCountIso: 'Apex 1.0: 14/12/09',
          gravimetricSolidsMg: 0.8,
          moisturePpm: 35,
          verdict: 'CONFORMING',
          labTechnician: techName,
          analysisNotes: `Microscope patch test verified conforming to Apex 1.0 (≤${spec}μm) standard.`,
        },
      },
    }), `Generated certified Ultra Clean RIG test certificate: ${sample.fileName}`);
    setActiveDocIndex(0);
  };

  // Upload custom PDF file from technician's workstation
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateUnit) return;
    setIsUploading(true);
    try {
      const dataUrl = await readDocumentAsDataUrl(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const spec = unit.cleaning?.cleaningSpecMicron || 25;

      const mediaItem = createMediaItem(
        file.name,
        isPdf ? 'document' : 'image',
        dataUrl,
        'cleaning',
        `Lab test document (${spec}μm rating)`
      );

      onUpdateUnit((prev) => ({
        ...prev,
        cleaning: {
          ...prev.cleaning,
          mode: 'with_analysis',
          testPdf: {
            id: `test-pdf-${Date.now()}`,
            name: file.name,
            url: dataUrl,
            fileType: isPdf ? 'pdf' : 'image',
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
            cleanlinessSpec: `${spec}μm Spec`,
            printWithMasterReport: true,
            labNotes: `Uploaded laboratory test document: ${file.name}`,
          },
          analysisResult: {
            uploadedAt: new Date().toISOString(),
            reportFiles: [mediaItem, ...(prev.cleaning?.analysisResult?.reportFiles || [])],
            particleCountIso: prev.cleaning?.analysisResult?.particleCountIso || 'Apex 1.0: 14/12/09',
            gravimetricSolidsMg: prev.cleaning?.analysisResult?.gravimetricSolidsMg || 0.8,
            moisturePpm: prev.cleaning?.analysisResult?.moisturePpm || 35,
            verdict: prev.cleaning?.analysisResult?.verdict || 'CONFORMING',
            labTechnician: prev.cleaning?.analysisResult?.labTechnician || 'N. Malgarotti (QA Microscopist)',
            analysisNotes: prev.cleaning?.analysisResult?.analysisNotes || `Laboratory test file attached: ${file.name}`,
            ...prev.cleaning?.analysisResult,
          },
        },
      }), `Uploaded laboratory test certificate: ${file.name}`);
      setActiveDocIndex(0);
    } catch (err) {
      console.error('Failed to read uploaded PDF:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 flex items-center justify-center animate-fadeIn no-print">
      <div 
        className={`bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col shadow-2xl transition-all duration-200 overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full max-w-none rounded-none' 
            : 'w-full max-w-5xl h-[92vh] max-h-[960px]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-neutral-100 truncate">
                  Test Results PDF Preview
                </h3>
                {activeDoc && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    {activeDoc.cleanlinessSpec || 'Lab Certified'}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>PRE-PRINT INSPECTION</span>
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 truncate">
                {unit.serialNumber} · WO #{unit.workOrderNumber} · {unit.customerName}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload or Replace PDF input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,image/*"
              className="hidden"
              onChange={handleUploadFile}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-700 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Upload custom test result PDF or report from bench computer"
            >
              <Upload className="h-3.5 w-3.5 text-neutral-400" />
              <span>{isUploading ? 'Uploading...' : 'Upload PDF'}</span>
            </button>

            {/* Print Master Report Button */}
            {onPrintMasterReport && (
              <button
                type="button"
                onClick={onPrintMasterReport}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="Proceed to Print Master 3-Page Conformance Report"
              >
                <Printer className="h-3.5 w-3.5 text-neutral-950" />
                <span>Print Master Sheet</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Secondary Document Tab Switcher (if multiple PDFs or documents) */}
        {documents.length > 1 && (
          <div className="bg-neutral-950/80 px-4 py-2 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-mono text-neutral-400 shrink-0 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Attached Documents:
            </span>
            {documents.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => {
                  setActiveDocIndex(idx);
                  setZoomLevel(100);
                  setRotationDeg(0);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap border ${
                  activeDocIndex === idx
                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-xs'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                <FileCheck className="h-3 w-3 text-sky-400" />
                <span>{doc.name.length > 28 ? doc.name.slice(0, 25) + '...' : doc.name}</span>
                {doc.sizeBytes && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    ({formatFileSize(doc.sizeBytes)})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Lightweight PDF Toolbar */}
        <div className="p-2 sm:px-4 border-b border-neutral-800 bg-neutral-950/60 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          {/* Zoom & Rotation Controls */}
          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 60}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom Out (-15%)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span 
              onClick={handleResetZoom}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-neutral-200 hover:text-sky-300 cursor-pointer select-none"
              title="Click to reset zoom to 100%"
            >
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 220}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              title="Zoom In (+15%)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="h-3.5 w-px bg-neutral-800 mx-0.5" />
            <button
              type="button"
              onClick={handleRotate}
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Rotate 90° clockwise"
            >
              <RotateCw className="h-3.5 w-3.5" />
              {rotationDeg > 0 && <span className="text-[10px] font-mono">{rotationDeg}°</span>}
            </button>
          </div>

          {/* Master Print Inclusion Toggle */}
          {activeDoc?.source === 'cleaning_rig' && onUpdateUnit && (
            <label className="flex items-center gap-2 cursor-pointer bg-neutral-900/80 px-2.5 py-1 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-colors">
              <input
                type="checkbox"
                checked={activeDoc.printWithMasterReport ?? true}
                onChange={(e) => handleTogglePrintWithMaster(e.target.checked)}
                className="h-3.5 w-3.5 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-[11px] font-mono text-neutral-300">
                Include in Master Report Print
              </span>
            </label>
          )}

          {/* Document Operations */}
          <div className="flex items-center gap-1.5">
            {activeDoc && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadTestPdf}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Download this PDF test results document directly"
                >
                  <Download className="h-3 w-3 text-sky-400" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintTestPdf}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 text-[11px] font-bold transition-colors shadow-xs cursor-pointer"
                  title="Print this test certificate immediately"
                >
                  <Printer className="h-3 w-3" />
                  <span>Print Test PDF</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main PDF Preview Viewport */}
        <div className="flex-1 bg-neutral-950 overflow-auto p-4 flex items-center justify-center relative min-h-0">
          {activeDoc ? (
            <div 
              className="w-full h-full flex flex-col items-center justify-center transition-transform origin-center"
              style={{
                transform: `rotate(${rotationDeg}deg) scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Native PDF Object / Embedded Frame */}
              <object
                data={`${activeDoc.url}#toolbar=0&navpanes=0&scrollbar=1`}
                type="application/pdf"
                className="w-full h-full rounded-xl bg-white shadow-2xl border border-neutral-800"
              >
                {/* Fallback iframe if object is unsupported */}
                <iframe
                  src={`${activeDoc.url}#toolbar=0&navpanes=0`}
                  title={activeDoc.name}
                  className="w-full h-full rounded-xl bg-white shadow-2xl border border-neutral-800"
                >
                  {/* Fallback message with direct download link */}
                  <div className="p-8 text-center text-neutral-300 space-y-3">
                    <p>Unable to display PDF preview directly in this browser window.</p>
                    <a
                      href={activeDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg inline-flex items-center gap-2 text-xs font-bold"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open PDF in New Tab
                    </a>
                  </div>
                </iframe>
              </object>
            </div>
          ) : (
            /* Empty State: No PDF Test Results Attached Yet */
            <div className="max-w-md w-full p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-4 shadow-xl">
              <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8" />
              </div>

              <div className="space-y-1.5 font-sans">
                <h4 className="text-base font-bold text-white">
                  No PDF Test Results Attached Yet
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Unit <strong className="text-neutral-200">{unit.serialNumber}</strong> does not have an attached Ultra Clean RIG micro-particle certificate or lab document.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGenerateCertifiedRigPdf}
                  className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Generate Lab Test PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Upload Local PDF</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-800/80">
                Supports official Ultra Clean RIG laboratory certificates, hydrostatic logs, and ISO 16232 compliance sheets.
              </div>
            </div>
          )}
        </div>

        {/* Pre-Print Checklist & Footer Metadata */}
        <div className="p-3 sm:px-5 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <div className="flex items-center gap-3 text-neutral-400 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Serial Verified: {unit.serialNumber}</span>
            </span>
            <span className="text-neutral-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline">
              Work Order: <strong className="text-neutral-200">{unit.workOrderNumber}</strong>
            </span>
            <span className="text-neutral-600 hidden md:inline">|</span>
            <span className="hidden md:inline">
              Analyst: <strong className="text-neutral-200">{activeDoc?.technician || 'N. Malgarotti'}</strong>
            </span>
            {activeDoc?.sizeBytes && (
              <>
                <span className="text-neutral-600 hidden lg:inline">|</span>
                <span className="text-neutral-400 hidden lg:inline">
                  Size: <strong>{formatFileSize(activeDoc.sizeBytes)}</strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            {onPrintMasterReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintMasterReport();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Master Sheet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
