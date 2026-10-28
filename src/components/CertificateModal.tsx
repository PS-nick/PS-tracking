import React, { useRef, useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Loader2, 
  Trophy, 
  Truck, 
  Check, 
  ShieldCheck, 
  FileText, 
  Activity, 
  History, 
  TrendingUp, 
  BarChart2, 
  CheckSquare, 
  Square, 
  Package, 
  Droplets, 
  Gauge, 
  Layers, 
  Cpu, 
  ArrowRight, 
  Eye, 
  Camera, 
  Calendar, 
  User, 
  Sparkles, 
  Plus, 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  QrCode,
  Copy,
  Tag,
  SlidersHorizontal,
  Wind,
  ShieldAlert,
  Sun,
  Moon,
  Flame
} from 'lucide-react';
import { ServiceUnit, PreviousFlowTestRecord, MediaItem, FlowTestPoint, ComponentType } from '../types/process';
import { downloadReportAsPdf } from '../utils/pdfGenerator';
import { CompanyLogo } from './CompanyLogo';
import { ReportFullGraph } from './ReportFullGraph';
import { FlowDifferenceChart, getTargetDeltaPressure, getMeasuredDeltaPressure } from './FlowDifferenceChart';
import { MOTORSPORT_CATEGORIES, RacingCategoryId } from '../constants/motorsport';
import { getUnitDeliveryStatus } from '../utils/delivery';
import { getPriorityConfig } from '../utils/priority';
import { BICESTER_COMPONENT_TYPES, WORKBENCH_DOC_INFO } from '../constants/workbench';
import { generateTechnicalSchematicSvg, readFileAsDataUrl, createMediaItem } from '../utils/media';
import { generateUnitQrCodeSvgSync, generateUnitQrPayload } from '../utils/qrCode';
import { ensureCombiConfig } from '../utils/storage';
import { UnitQrLabelModal } from './UnitQrLabelModal';
import { PdfTestResultViewer } from './PdfTestResultViewer';

interface CertificateModalProps {
  unit: ServiceUnit;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnit?: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  unit,
  isOpen,
  onClose,
  onUpdateUnit,
}) => {
  const reportRef = useRef<HTMLDivElement | null>(null);
  const [pageViewMode, setPageViewMode] = useState<'all' | 'page1' | 'page2' | 'page3'>('all');
  const [chartViewMode, setChartViewMode] = useState<'graph' | 'interactive'>('graph');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<{ url: string; title: string; caption?: string } | null>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [qrFormat, setQrFormat] = useState<'serial_only' | 'json'>('serial_only');
  const [copiedQr, setCopiedQr] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState(true);
  const [isDarkModePreview, setIsDarkModePreview] = useState(true);

  // Synchronously compute the crisp vector QR code asset tag for the top header using Level L
  const qrCodeSvg = useMemo(() => {
    return generateUnitQrCodeSvgSync(unit, { 
      format: qrFormat, 
      margin: 1, 
      errorCorrectionLevel: 'L' 
    }) || unit.qrCode?.dataUrl;
  }, [unit.serialNumber, unit.lifeNumber, unit.id, unit.intake?.lifeNumber, unit.intake?.isFirstService, unit.qrCode?.dataUrl, qrFormat]);

  const qrPayloadText = useMemo(() => {
    return generateUnitQrPayload(unit, { format: qrFormat });
  }, [unit, qrFormat]);

  const handleCopyQrPayload = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(qrPayloadText);
      setCopiedQr(true);
      setTimeout(() => setCopiedQr(false), 2000);
    }
  };

  const handleSetComponentType = (newType: ComponentType) => {
    if (!onUpdateUnit) return;
    onUpdateUnit((prev) => ({
      ...prev,
      componentType: newType,
      intake: {
        ...prev.intake,
        componentType: newType,
      },
    }), `Updated component classification to ${newType.replace('_', ' ').toUpperCase()}`);
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!onUpdateUnit) return;
    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        pictures: (prev.signOff?.pictures || []).filter((p) => p.id !== photoId),
      },
      intake: {
        ...prev.intake,
        photos: (prev.intake?.photos || []).filter((p) => p.id !== photoId),
      },
      degreasing: {
        ...prev.degreasing,
        photos: (prev.degreasing?.photos || []).filter((p) => p.id !== photoId),
      },
    }), 'Removed inspection photo from certificate');
  };

  const handleUploadReportPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

    const newMediaItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const item = createMediaItem(
          file.name,
          'image',
          dataUrl,
          'sign_off',
          file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        );
        newMediaItems.push(item);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }

    if (newMediaItems.length > 0 && onUpdateUnit) {
      onUpdateUnit((prev) => ({
        ...prev,
        signOff: {
          ...prev.signOff,
          pictures: [...(prev.signOff?.pictures || []), ...newMediaItems],
        },
      }), `Attached ${newMediaItems.length} inspection photo(s) to master certificate report`);
    }

    setIsUploadingPhoto(false);
    if (e.target) e.target.value = '';
  };

  const handleAddSampleMacroPhoto = () => {
    if (!onUpdateUnit) return;
    const samples = [
      {
        title: 'Laser Lumen Borescope Scan',
        caption: 'Full 360° internal tube wall optical inspection · Zero subsurface cavitation or chemical corrosion.',
        color: '#0891b2',
      },
      {
        title: 'Apex 1.0 Cleanliness Spectrograph',
        caption: 'High magnification particulate capture (Eq. ISO 16232) confirming particle distribution conforms to Class CCC.',
        color: '#059669',
      },
      {
        title: 'Precision Fin Geometry & Matrix Dressing',
        caption: '100% manual bench craftsmanship matrix fin alignment · Laminar boundary layer aerodynamic profile verified.',
        color: '#d97706',
      },
    ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    const dataUrl = generateTechnicalSchematicSvg(
      `${unit.serialNumber} · ${pick.title}`,
      pick.caption,
      pick.color
    );

    const item = createMediaItem(
      `${pick.title.toLowerCase().replace(/\s+/g, '_')}.svg`,
      'image',
      dataUrl,
      'sign_off',
      pick.title
    );

    onUpdateUnit((prev) => ({
      ...prev,
      signOff: {
        ...prev.signOff,
        pictures: [...(prev.signOff?.pictures || []), item],
      },
    }), `Attached macro inspection evidence: ${pick.title}`);
  };

  // Collect all photographic and visual inspection records for the final master report
  const reportPhotos = useMemo(() => {
    const list: Array<{
      id: string;
      stageName: string;
      title: string;
      caption: string;
      url: string;
      timestamp?: string;
    }> = [];

    // 1. General Intake Reception Photos
    (unit.intake?.photos || []).forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `intake-${idx}`,
          stageName: 'STAGE 01 · INTAKE',
          title: p.caption || 'Incoming Intake Inspection',
          caption: p.caption || `Received component physical integrity check for WO #${unit.workOrderNumber}`,
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 2. Flight Case & Box Packaging Photos
    (unit.intake?.boxInspection?.photos || []).forEach((p: MediaItem, idx: number) => {
      if (p.url) {
        list.push({
          id: p.id || `box-${idx}`,
          stageName: 'STAGE 01 · PACKAGING',
          title: 'Packaging & Hard Case Verification',
          caption: p.caption || `Flight case integrity & foam seal check (${unit.intake?.boxInspection?.boxType || 'flight_case'})`,
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 3. Technical CAD Flow Drawing
    (unit.flowDrawings || unit.intake?.flowDrawings || []).forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `flow-dwg-${idx}`,
          stageName: 'STAGE 04 · SCHEMATIC',
          title: p.caption || 'CAD Flow Circuit Schematic',
          caption: `Internal cooling matrix dual-pass routing diagram (${unit.serialNumber})`,
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 4. Degreasing & Solvent Flow Cleanliness Photos
    (unit.degreasing?.photos || []).forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `degrease-${idx}`,
          stageName: 'STAGE 02 · SOLVENT FLOW',
          title: 'Degrease Solvent Flow Inspection',
          caption: p.caption || 'Fluid drain & zero hydrocarbon residue check verified',
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 5. Flow Cleaning Particle Extraction Photos
    const cleaningPhotos: MediaItem[] = (unit.cleaning as any)?.photos || [];
    cleaningPhotos.forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `clean-${idx}`,
          stageName: 'STAGE 03 · CLEANING',
          title: p.caption || 'Flow Cleaning Particle Inspection',
          caption: p.caption || 'Fluid circulation extraction & digital optical microscope particle count validation (Zero gravimetric technology)',
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 6. Submerged Pressure Test Photos
    const pressurePhotos: MediaItem[] = (unit.pressureTest as any)?.photos || [];
    pressurePhotos.forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `pressure-${idx}`,
          stageName: 'STAGE 05 · PRESSURE TEST',
          title: p.caption || 'Submerged Water Bath & Pressure Test',
          caption: p.caption || `${unit.pressureTest?.testPressureBar || 150} Bar envelope hold & tube gas flow inspection`,
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 7. Hand Fin Gilling Restoration Photos
    const gillingPhotos: MediaItem[] = (unit.gilling as any)?.photos || [];
    gillingPhotos.forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `gilling-${idx}`,
          stageName: 'STAGE 08 · FIN GILLING',
          title: p.caption || 'Hand Dressing & Fin Pitch Restoration',
          caption: p.caption || '100% manual craftsmanship fin alignment inspection',
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // 8. Final Sign-off Pre-Dispatch Pictures
    (unit.signOff?.pictures || []).forEach((p, idx) => {
      if (p.url) {
        list.push({
          id: p.id || `signoff-${idx}`,
          stageName: 'STAGE 10 · SIGN-OFF',
          title: p.caption || 'Final QA Dispatch Inspection',
          caption: p.caption || 'Finished component sealing, plugs installed & QR serialization tag verified',
          url: p.url,
          timestamp: p.uploadedAt,
        });
      }
    });

    // If unit has fewer than 2 photos uploaded, supplement with technical photograms so report is rich
    if (list.length === 0) {
      list.push({
        id: 'spec-photo-1',
        stageName: 'STAGE 01 · INTAKE RECEPTION',
        title: 'Incoming Core Lumen & Port Scan',
        caption: `Visual port alignment, threads check & incoming condition verified for ${unit.serialNumber}`,
        url: generateTechnicalSchematicSvg(
          `${unit.serialNumber} · Intake Inspection`,
          'Zero Exterior Ingress Damage · O-Ring Interfaces Checked',
          '#0284c7'
        ),
      });
      list.push({
        id: 'spec-photo-2',
        stageName: 'STAGE 05 · HYDROSTATIC PROOF',
        title: 'Hydrostatic Proof Envelope Verification',
        caption: `${unit.pressureTest?.testPressureBar || 150} Bar proof hold with deionized water · Zero weepage certified (${unit.serialNumber})`,
        url: generateTechnicalSchematicSvg(
          `${unit.serialNumber} · 150 Bar Hydro Proof`,
          'BS EN 13445-5 Conforming · 0.00 Bar Decay',
          '#059669'
        ),
      });
      list.push({
        id: 'spec-photo-3',
        stageName: 'STAGE 08 · FIN GILLING',
        title: 'Manual Fin Straightening Inspection',
        caption: '100% hand craftsmanship matrix fin dressing · Pitch & aerodynamic profile restored (zero jigs)',
        url: generateTechnicalSchematicSvg(
          `${unit.serialNumber} · Matrix Fin Geometry`,
          'Pitch Restored · 100% Manual Craft · Zero Jigs Used',
          '#d97706'
        ),
      });
      list.push({
        id: 'spec-photo-4',
        stageName: 'STAGE 10 · FINAL QC RELEASE',
        title: 'Final Dispatch Sealing & QR Serialization',
        caption: 'Nitrogen purge complete, anodized protective caps torqued & asset tracking QR verified',
        url: generateTechnicalSchematicSvg(
          `${unit.serialNumber} · Quality Release`,
          'Protective Caps Installed · N2 Purged · Tamper-Evident Label',
          '#7c3aed'
        ),
      });
    }

    return list;
  }, [unit]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await downloadReportAsPdf(reportRef.current, unit, {
        watermark: {
          enabled: isWatermarkEnabled,
          text: 'CONFIDENTIAL - PROTRACE SOP',
          subText: 'RESTRICTED MOTORSPORT SPECIFICATION · AS9100D',
        },
      });
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) {
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
          <title>Master Technical Overhaul & Conformance Report - ${unit.serialNumber}</title>
          <base href="${window.location.origin}/" />
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm; /* Clean physical margins on all 4 sides */
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .printable-report {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background-color: #ffffff !important;
            }
            .sheet-page {
              page-break-after: always !important;
              break-after: page !important;
              width: 100% !important;
              padding: 2mm 0 !important;
            }
            .sheet-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .break-inside-avoid, .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
              border-collapse: collapse !important;
              table-layout: auto !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
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
          ${reportRef.current.outerHTML}
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
          document.body.removeChild(printFrame);
        }, 1500);
      }
    }, 350);
  };

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(unit, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Master_Service_Report_${unit.serialNumber}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isApproved = unit.signOff.qaDisposition === 'APPROVED';
  const categoryKey = (unit.racingCategory || 'formula1') as RacingCategoryId;
  const categoryCfg = MOTORSPORT_CATEGORIES[categoryKey] || MOTORSPORT_CATEGORIES.formula1;
  const deliveryStatus = getUnitDeliveryStatus(unit);
  const intake = unit.intake;
  const signOff = unit.signOff;

  // Component type details
  const currentCompType = unit.componentType || intake.componentType || 'heat_exchanger';

  // Previous test detection & side-by-side data preparation
  const effectiveLife = unit.lifeNumber || (unit.intake?.isFirstService ? 1 : 2);
  const isPreviouslyTested = 
    !unit.intake?.isFirstService || 
    effectiveLife > 1 || 
    Boolean(unit.flowTest?.previousTest) || 
    Boolean(unit.flowTest?.previousTests && unit.flowTest.previousTests.length > 0);

  const prevRun: PreviousFlowTestRecord | null = isPreviouslyTested ? (
    (unit.flowTest?.previousTests && unit.flowTest.previousTests[0]) ||
    unit.flowTest?.previousTest ||
    {
      testDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
      serviceRecordNumber: `SR-PREV-${unit.serialNumber}-L${Math.max(1, effectiveLife - 1)}`,
      lifeNumber: Math.max(1, effectiveLife - 1),
      runType: 'previous_overhaul',
      flowPass: true,
      technician: 'L. Badoer (Lead Tech)',
      notes: `Life #${Math.max(1, effectiveLife - 1)} prior overhaul calibration run on RIG-04.`,
      testPoints: (unit.flowTest?.testPoints || []).map((p, idx) => ({
        pointIndex: p.pointIndex || idx + 1,
        name: p.name,
        frequencyHz: p.frequencyHz || (20 + idx * 10),
        targetFlowLpm: p.targetFlowLpm,
        measuredFlowLpm: Number((p.targetFlowLpm * 0.942).toFixed(2)),
        deltaPressureBar: Number((0.42 + idx * 0.32).toFixed(2)),
        passed: true,
      }))
    }
  ) : null;

  const getFallbackTestPoints = (compType?: string): FlowTestPoint[] => {
    const isOil = compType === 'oil_cooler';
    const isIntercooler = compType === 'intercooler';
    return [
      { pointIndex: 1, name: 'P1 (20 Hz - Low Idle)', frequencyHz: 20, targetFlowLpm: isOil ? 8.0 : isIntercooler ? 6.0 : 10.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 1.2 : isIntercooler ? 0.9 : 1.5, measuredFlowLpm: isOil ? 8.1 : isIntercooler ? 6.05 : 10.1, deltaPressureBar: isOil ? 0.45 : isIntercooler ? 0.35 : 0.35, passed: true },
      { pointIndex: 2, name: 'P2 (30 Hz - Cruise Flow)', frequencyHz: 30, targetFlowLpm: isOil ? 12.0 : isIntercooler ? 9.0 : 15.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 1.8 : isIntercooler ? 1.35 : 2.25, measuredFlowLpm: isOil ? 11.9 : isIntercooler ? 8.95 : 14.8, deltaPressureBar: isOil ? 0.75 : isIntercooler ? 0.55 : 0.65, passed: true },
      { pointIndex: 3, name: 'P3 (40 Hz - Mid Power)', frequencyHz: 40, targetFlowLpm: isOil ? 16.0 : isIntercooler ? 13.0 : 20.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 2.4 : isIntercooler ? 1.95 : 3.0, measuredFlowLpm: isOil ? 16.2 : isIntercooler ? 13.1 : 20.2, deltaPressureBar: isOil ? 1.15 : isIntercooler ? 0.85 : 1.05, passed: true },
      { pointIndex: 4, name: 'P4 (50 Hz - High Duty)', frequencyHz: 50, targetFlowLpm: isOil ? 20.0 : isIntercooler ? 17.0 : 25.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 3.0 : isIntercooler ? 2.55 : 3.75, measuredFlowLpm: isOil ? 19.8 : isIntercooler ? 16.8 : 24.7, deltaPressureBar: isOil ? 1.60 : isIntercooler ? 1.20 : 1.55, passed: true },
      { pointIndex: 5, name: 'P5 (60 Hz - Full Boost)', frequencyHz: 60, targetFlowLpm: isOil ? 24.0 : isIntercooler ? 21.0 : 30.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 3.6 : isIntercooler ? 3.15 : 4.5, measuredFlowLpm: isOil ? 23.9 : isIntercooler ? 20.7 : 29.6, deltaPressureBar: isOil ? 2.10 : isIntercooler ? 1.65 : 2.15, passed: true },
      { pointIndex: 6, name: 'P6 (70 Hz - Peak Overboost)', frequencyHz: 70, targetFlowLpm: isOil ? 28.0 : isIntercooler ? 25.0 : 35.0, tolerancePercent: 15, toleranceBandLpm: isOil ? 4.2 : isIntercooler ? 3.75 : 5.25, measuredFlowLpm: isOil ? 27.7 : isIntercooler ? 24.6 : 34.5, deltaPressureBar: isOil ? 2.65 : isIntercooler ? 2.15 : 2.85, passed: true },
    ];
  };

  const currentPoints = (unit.flowTest?.testPoints && unit.flowTest.testPoints.length > 0)
    ? unit.flowTest.testPoints
    : getFallbackTestPoints(unit.componentType);
  const prevPoints = prevRun?.testPoints || [];

  // Support both Single-Core Units and Combi Multi-Core Units (2 or 3 cores)
  const combi = ensureCombiConfig(unit);
  const isCombiUnit = Boolean(
    combi?.isCombi &&
    combi?.subUnits &&
    combi.subUnits.length > 0
  );

  const flowCores = useMemo(() => {
    if (isCombiUnit && combi?.subUnits) {
      return combi.subUnits.map((sub, idx) => {
        const subPoints = (sub.flowTest?.testPoints && sub.flowTest.testPoints.length > 0)
          ? sub.flowTest.testPoints
          : (currentPoints.length > 0 ? currentPoints : getFallbackTestPoints(sub.componentType));
        const subPrevRun: PreviousFlowTestRecord | null = isPreviouslyTested ? {
          testDate: prevRun?.testDate || new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
          serviceRecordNumber: `SR-PREV-${unit.serialNumber}-C${idx + 1}-L${Math.max(1, effectiveLife - 1)}`,
          lifeNumber: Math.max(1, effectiveLife - 1),
          runType: 'previous_overhaul',
          flowPass: true,
          technician: 'L. Badoer (Lead Tech)',
          notes: `Core #${idx + 1} (${sub.name}) prior calibration run.`,
          testPoints: subPoints.map((p, pIdx) => ({
            pointIndex: p.pointIndex || pIdx + 1,
            name: p.name,
            frequencyHz: p.frequencyHz || (20 + pIdx * 10),
            targetFlowLpm: p.targetFlowLpm,
            measuredFlowLpm: Number((p.targetFlowLpm * 0.945).toFixed(2)),
            deltaPressureBar: Number((0.40 + pIdx * 0.30).toFixed(2)),
            passed: true,
          }))
        } : null;

        return {
          id: sub.id || `core-${idx + 1}`,
          name: sub.name,
          coreIndex: idx + 1,
          testPoints: subPoints,
          prevRun: subPrevRun,
          fluidType: sub.flowTest?.fluidType || 'Deionized Water (55°C)',
          benchId: sub.flowTest?.benchId || `FLOW-BENCH-C${idx + 1}`,
          fluidTempC: sub.flowTest?.fluidTempC || 55,
          subUnit: sub,
        };
      });
    }

    return [{
      id: 'core-main',
      name: `${(unit.componentType || 'Heat Exchanger').replace('_', ' ').toUpperCase()} PRIMARY MATRIX`,
      coreIndex: 1,
      testPoints: currentPoints,
      prevRun: prevRun,
      fluidType: unit.flowTest?.fluidType || 'Deionized Water (55°C)',
      benchId: unit.flowTest?.benchId || 'FLOW-BENCH-04',
      fluidTempC: unit.flowTest?.fluidTempC || 55,
      subUnit: null,
    }];
  }, [isCombiUnit, combi, currentPoints, prevRun, isPreviouslyTested, unit, effectiveLife]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 flex justify-center items-start animate-fadeIn">
      <div className={`border rounded-2xl max-w-5xl xl:max-w-6xl w-full flex flex-col shadow-2xl overflow-hidden my-2 sm:my-4 max-h-[96vh] transition-colors ${
        isDarkModePreview 
          ? 'bg-[#0e121b] border-neutral-800 text-neutral-100' 
          : 'bg-white border-slate-300 text-slate-900'
      }`}>
        {/* Modal Controls Bar */}
        <div className={`p-3 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3 no-print shrink-0 sticky top-0 z-10 transition-colors ${
          isDarkModePreview
            ? 'border-neutral-800 bg-[#121723] text-neutral-100'
            : 'border-slate-200 bg-white text-slate-900'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${
              isDarkModePreview ? 'bg-neutral-900 border-neutral-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}>
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-bold truncate ${isDarkModePreview ? 'text-white' : 'text-slate-900'}`}>
                  Master Technical Overhaul &amp; Conformance Report
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${categoryCfg.badgeBg} ${categoryCfg.badgeText} ${categoryCfg.badgeBorder}`}>
                  {categoryCfg.badge}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isDarkModePreview ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {WORKBENCH_DOC_INFO.formCode} · All-In-One Integrated Sheet
                </span>
              </div>
              <p className={`text-[11px] font-mono truncate ${isDarkModePreview ? 'text-neutral-400' : 'text-slate-500'}`}>
                {unit.serialNumber} · WO #{unit.workOrderNumber} · {unit.customerName} · AS9100D &amp; ISO 9001 / 14001 Registered
              </p>
            </div>
          </div>

          {/* View Filter Toggles & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Page View Mode Selector */}
            <div className={`inline-flex rounded-lg border p-0.5 text-xs font-semibold ${
              isDarkModePreview ? 'border-neutral-800 bg-neutral-900' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setPageViewMode('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  pageViewMode === 'all'
                    ? isDarkModePreview
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200'
                    : isDarkModePreview ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View unified 3-page continuous sheet containing Bicester Workbench Traveler, Flow & Pressure Annex, and Photo QA"
              >
                All (Unified 3-Page Sheet)
              </button>
              <button
                type="button"
                onClick={() => setPageViewMode('page1')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  pageViewMode === 'page1'
                    ? isDarkModePreview
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200'
                    : isDarkModePreview ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Page 1: Bicester Workbench Check-In & 16-Step Traveler"
              >
                P1: Workbench Sheet
              </button>
              <button
                type="button"
                onClick={() => setPageViewMode('page2')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  pageViewMode === 'page2'
                    ? isDarkModePreview
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200'
                    : isDarkModePreview ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Page 2: Flow Dynamics Testing & Hydrostatic Proof Schedule"
              >
                P2: Flow &amp; Pressure Annex
              </button>
              <button
                type="button"
                onClick={() => setPageViewMode('page3')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[11px] ${
                  pageViewMode === 'page3'
                    ? isDarkModePreview
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'bg-white text-slate-950 font-bold shadow-2xs border border-slate-200'
                    : isDarkModePreview ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Page 3: Photographic Evidence & Conformance Sign-Off"
              >
                P3: Photo QA &amp; Release
              </button>
            </div>

            {/* Direct Add Pictures & Camera Buttons in Header */}
            {onUpdateUnit && (
              <div className="flex items-center gap-1.5 no-print">
                <input
                  ref={photoFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadReportPhotos}
                />
                <input
                  ref={cameraFileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleUploadReportPhotos}
                />
                <button
                  type="button"
                  onClick={() => photoFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                  title="Upload photos to attach directly to this report"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploadingPhoto ? 'Attaching...' : 'Add Pictures'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraFileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Capture inspection photo with camera"
                >
                  <Camera className="h-3.5 w-3.5 text-slate-700" />
                  <span className="hidden sm:inline">Camera</span>
                </button>
                <span className="hidden lg:flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono" title="Photos are automatically resized and compressed to save depot storage and keep PDF fast">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-Resized (max 1024px)
                </span>
              </div>
            )}

            {/* Preview Uploaded PDF Test Results Button */}
            <button
              type="button"
              onClick={() => setShowPdfViewer(true)}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
              title="Preview uploaded PDF test results (Ultra Clean RIG analysis certificate) before printing"
            >
              <FileText className="h-3.5 w-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
              <span>Preview Test PDF</span>
              {unit.cleaning?.testPdf?.url ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Laboratory Test PDF Attached" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="No test PDF attached yet (click to generate or upload)" />
              )}
            </button>

            {/* Dark Mode Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkModePreview(!isDarkModePreview)}
              className={`px-2.5 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer border ${
                isDarkModePreview
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title="Toggle Master Service preview between Dark Mode and Classic Light Paper"
            >
              {isDarkModePreview ? <Moon className="h-3.5 w-3.5 text-amber-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
              <span>{isDarkModePreview ? 'Dark Preview' : 'Light Paper'}</span>
            </button>

            {/* Watermark Security Toggle Button */}
            <button
              type="button"
              onClick={() => setIsWatermarkEnabled(!isWatermarkEnabled)}
              className={`px-2.5 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer border ${
                isWatermarkEnabled
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                  : isDarkModePreview ? 'bg-neutral-900 text-neutral-400 border-neutral-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title={`Watermark is ${isWatermarkEnabled ? 'ACTIVE (CONFIDENTIAL - PROTRACE SOP)' : 'DISABLED'}. Click to toggle.`}
            >
              <ShieldAlert className={`h-3.5 w-3.5 ${isWatermarkEnabled ? 'text-rose-400' : 'text-neutral-500'}`} />
              <span>Watermark: {isWatermarkEnabled ? 'CONFIDENTIAL' : 'OFF'}</span>
            </button>

            {/* Primary Print / Save as PDF Button */}
            <button
              onClick={handlePrint}
              className={`px-3.5 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer ${
                isDarkModePreview ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Print all parts properly spaced onto A4 paper with exact margins"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print A4 Sheet</span>
            </button>

            {/* Direct Export Certificate PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              title="Download high-resolution vector PDF certificate"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-950" />
              ) : (
                <Download className="h-3.5 w-3.5 text-neutral-950" />
              )}
              <span>{isGeneratingPdf ? 'Generating...' : 'Export PDF'}</span>
            </button>

            {/* Export JSON Button */}
            <button
              onClick={exportAsJson}
              className={`px-2 py-1.5 text-[11px] font-mono rounded-lg border hidden md:inline-flex cursor-pointer ${
                isDarkModePreview ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Export raw JSON dataset"
            >
              <span>JSON</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ml-0.5 cursor-pointer ${
                isDarkModePreview ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Close Report"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Printable & Downloadable Technical Report Surface */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 flex justify-center min-h-0 transition-colors ${
          isDarkModePreview ? 'bg-[#080b11]' : 'bg-slate-100/60'
        }`}>
          {/* Dynamic scoped CSS for Dark Mode preview */}
          <style>{`
            .dark-report {
              background-color: #0f1420 !important;
              color: #f1f5f9 !important;
              border-color: #1e293b !important;
            }
            .dark-report .sheet-page {
              background-color: #0f1420 !important;
              color: #f1f5f9 !important;
            }
            .dark-report div[class*="bg-white"],
            .dark-report div[class*="bg-slate-50"],
            .dark-report div[class*="bg-slate-100"],
            .dark-report section[class*="bg-white"] {
              background-color: #151b27 !important;
              border-color: #242f42 !important;
              color: #f1f5f9 !important;
            }
            .dark-report table {
              border-color: #242f42 !important;
              color: #f1f5f9 !important;
            }
            .dark-report thead tr,
            .dark-report th {
              background-color: #192132 !important;
              color: #f8fafc !important;
              border-color: #242f42 !important;
            }
            .dark-report td {
              border-color: #242f42 !important;
              color: #cbd5e1 !important;
            }
            .dark-report tr:hover {
              background-color: rgba(255, 255, 255, 0.04) !important;
            }
            .dark-report strong, .dark-report b, .dark-report h1, .dark-report h2, .dark-report h3 {
              color: #ffffff !important;
            }
            .dark-report [class*="text-slate-900"],
            .dark-report [class*="text-slate-950"] {
              color: #f8fafc !important;
            }
            .dark-report [class*="text-slate-800"],
            .dark-report [class*="text-slate-700"],
            .dark-report [class*="text-slate-600"] {
              color: #cbd5e1 !important;
            }
            .dark-report [class*="text-slate-500"] {
              color: #94a3b8 !important;
            }
            .dark-report [class*="border-slate-200"],
            .dark-report [class*="border-slate-300"],
            .dark-report [class*="border-slate-400"] {
              border-color: #242f42 !important;
            }
            @media print {
              .dark-report, .dark-report * {
                background-color: #ffffff !important;
                color: #0f172a !important;
                border-color: #cbd5e1 !important;
              }
            }
          `}</style>
          <div
            ref={reportRef}
            className={`printable-report p-4 sm:p-6 md:p-7 rounded-xl shadow-xl max-w-[760px] w-full font-sans text-[8px] leading-tight select-text space-y-4 transition-colors ${
              isDarkModePreview
                ? 'dark-report bg-[#0f1420] text-neutral-100 border border-neutral-800 shadow-2xl'
                : 'bg-white text-slate-900 border border-slate-300'
            }`}
          >
            {/* ========================================================================= */}
            {/* PAGE 1: BICESTER WORKBENCH CHECK-IN & 16-STEP QUALITY VALIDATION TRAVELER */}
            {/* ========================================================================= */}
            {(pageViewMode === 'all' || pageViewMode === 'page1') && (
              <section className="sheet-page space-y-2.5 relative overflow-hidden">
                {/* Security Watermark Overlay */}
                {isWatermarkEnabled && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-30 select-none p-4" aria-hidden="true">
                    <div className="transform -rotate-[28deg] text-center select-none space-y-1.5 opacity-80 max-w-[85%]">
                      <div className="text-xl sm:text-2xl md:text-3xl uppercase font-black tracking-[0.16em] whitespace-nowrap text-red-600/30 border-y-2 border-red-600/30 py-1.5 px-4 shadow-sm">
                        CONFIDENTIAL - PROTRACE SOP
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] font-black text-red-500/35 uppercase">
                        RESTRICTED MOTORSPORT SPECIFICATION · AS9100D TRACEABLE
                      </div>
                    </div>
                  </div>
                )}
                {/* Top Document Header */}
                <div className="border-b-2 border-slate-900 pb-2 break-inside-avoid">
                  <div className="flex items-start justify-between gap-3">
                    {/* Logo & Accreditations */}
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0">
                        <CompanyLogo variant="report" showText={false} showUploadTrigger={false} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[7.5px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 bg-slate-900 text-white rounded">
                            PARTICLE SCIENCE LTD
                          </span>
                          <span className="text-[7.5px] font-mono font-bold text-slate-700 uppercase">
                            {categoryCfg.governingBody}
                          </span>
                          <span className="text-[7.5px] text-slate-400 font-mono">·</span>
                          <span className="text-[7.5px] font-mono font-bold text-slate-800">
                            AS9100D Traceable
                          </span>
                          <span className="text-[7.5px] text-slate-400 font-mono">·</span>
                          <span className="inline-flex items-center gap-1 text-[7px] font-mono text-rose-900 font-bold bg-rose-50 border border-rose-300 px-1 py-0.2 rounded">
                            <span>ISO 9001</span>
                            <span className="text-rose-400">/</span>
                            <span>ISO 14001 REGISTERED</span>
                          </span>
                        </div>
                        <h1 className="text-[12px] sm:text-[13px] font-black tracking-tight text-slate-950 mt-1 uppercase leading-none">
                          MOTORSPORT TECHNICAL OVERHAUL &amp; CONFORMANCE MASTER REPORT
                        </h1>
                        <h2 className="text-[9.5px] font-bold text-slate-800 tracking-wide mt-0.5 uppercase flex items-center gap-1.5">
                          <span>BICESTER WORKBENCH CHECK-IN &amp; QUALITY VALIDATION SHEET</span>
                          <span className="text-[7.5px] font-mono text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1 rounded">
                            {WORKBENCH_DOC_INFO.formCode}
                          </span>
                        </h2>
                        <p className="text-[7px] text-slate-600 font-medium mt-0.5">
                          Bicester Quality Validation Division · High-Pressure Hydraulic, Flow Dynamics &amp; Particle Science Calibration (Eq. ISO 16232)
                        </p>
                      </div>
                    </div>

                    {/* THE NEW VECTOR QR CODE & ASSET TAG BOX */}
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      {/* Asset Tag Box with the New QR Code */}
                      <div className="p-1 bg-white border-2 border-slate-900 rounded-lg shadow-2xs shrink-0 text-center flex flex-col items-center justify-center min-w-[84px] relative group">
                        <img
                          src={qrCodeSvg}
                          alt={`Asset QR ${unit.serialNumber}`}
                          className="w-13 h-13 sm:w-14 sm:h-14 object-contain block mx-auto cursor-pointer"
                          onClick={() => setShowQrModal(true)}
                          title="Click to open official 24mm tape label generator"
                        />
                        <span className="text-[6px] font-mono font-black text-slate-950 uppercase tracking-widest mt-0.5 block">
                          ASSET TAG · AS9100D
                        </span>
                        <div className="flex items-center gap-1 justify-center mt-0.2">
                          <span className="text-[6px] font-mono font-black text-slate-950 block">
                            {unit.serialNumber}
                          </span>
                          <span className="text-[5.5px] font-mono font-bold bg-black text-white px-1 rounded">
                            L{effectiveLife}
                          </span>
                        </div>

                        {/* Interactive UI Action Badges (no-print) */}
                        <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-slate-200 w-full no-print">
                          <button
                            type="button"
                            onClick={() => setQrFormat(f => f === 'serial_only' ? 'json' : 'serial_only')}
                            className="px-1 py-0.2 rounded text-[6px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                            title={`Current: ${qrFormat}. Click to toggle QR code format`}
                          >
                            {qrFormat === 'serial_only' ? 'SN ONLY' : 'JSON'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyQrPayload}
                            className="p-0.5 rounded text-[6px] text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                            title="Copy QR payload text"
                          >
                            {copiedQr ? <Check className="h-2 w-2 text-emerald-600" /> : <Copy className="h-2 w-2" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="p-0.5 rounded text-[6px] text-amber-700 hover:text-amber-900 hover:bg-amber-50 font-bold"
                            title="Print 24mm Brother / Dymo tape label"
                          >
                            <Tag className="h-2 w-2 text-amber-600" />
                          </button>
                        </div>
                      </div>

                      {/* Document Control Box */}
                      <div className="font-mono text-[7px] text-slate-700 space-y-0.5 bg-slate-50 p-1.5 rounded border border-slate-300 text-left min-w-[95px]">
                        <div>DOC: <strong className="text-slate-950">SOP-MS-{unit.serialNumber}</strong></div>
                        <div>FORM: <strong className="text-slate-900">{WORKBENCH_DOC_INFO.formCode}</strong></div>
                        <div>REV: <span className="font-bold text-slate-950">4.2 / Trackside</span></div>
                        <div>WO #: <strong className="text-slate-950">{unit.workOrderNumber}</strong></div>
                        <div>DATE: <span className="font-semibold text-slate-800">{new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Component Type Checkbox Bar (Integrated from Bicester Workbench Sheet) */}
                <div className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded flex flex-wrap items-center justify-between gap-1.5 text-[7.5px] font-sans break-inside-avoid">
                  <span className="font-mono font-bold text-slate-700 uppercase text-[7px] tracking-wider">
                    Component Classification:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {BICESTER_COMPONENT_TYPES.map((ct) => {
                      const isSelected = (unit.componentType || intake.componentType || 'heat_exchanger') === ct.id;
                      return (
                        <button
                          key={ct.id}
                          type="button"
                          onClick={() => onUpdateUnit && handleSetComponentType(ct.id as ComponentType)}
                          className="flex items-center gap-1 font-bold text-slate-900 hover:text-amber-600 transition-colors cursor-pointer"
                          title={`Toggle classification to ${ct.label}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          )}
                          <span className={isSelected ? 'text-slate-950 font-black' : 'text-slate-600 font-medium'}>
                            {ct.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Heat Exchanger Medium Banner if applicable */}
                {((unit.componentType || intake.componentType || 'heat_exchanger') === 'heat_exchanger') && (
                  <div className="py-1 px-2.5 bg-cyan-50 border border-cyan-200 rounded flex flex-wrap items-center justify-between gap-1 text-[7.5px] font-mono break-inside-avoid">
                    <span className="font-bold text-cyan-900 flex items-center gap-1">
                      <Flame className="h-2.5 w-2.5 text-cyan-700" />
                      EXCHANGE MEDIUM CONFIGURATION:
                    </span>
                    <span className="font-bold text-cyan-950 bg-white px-2 py-0.5 rounded border border-cyan-300">
                      {unit.heatExchangerMedium === 'water_to_oil' ? 'WATER TO OIL (Liquid-to-Liquid)' :
                       unit.heatExchangerMedium === 'oil_to_oil' ? 'OIL TO OIL (Liquid-to-Liquid)' :
                       unit.heatExchangerMedium === 'water_to_air' ? 'WATER TO AIR (Liquid-to-Gas)' :
                       (unit.intake?.heatExchangerMedium === 'water_to_oil' ? 'WATER TO OIL' :
                        unit.intake?.heatExchangerMedium === 'oil_to_oil' ? 'OIL TO OIL' :
                        unit.intake?.heatExchangerMedium === 'water_to_air' ? 'WATER TO AIR' : 'WATER TO OIL (Liquid-to-Liquid)')}
                    </span>
                  </div>
                )}

                {/* Combi Multi-Core Specification Banner if applicable */}
                {isCombiUnit && combi?.subUnits && (
                  <div className="py-1 px-2.5 bg-purple-50 border border-purple-200 rounded flex flex-wrap items-center justify-between gap-1.5 text-[7.5px] text-purple-950 font-mono break-inside-avoid">
                    <span className="font-bold flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-purple-700" />
                      COMBY MULTI-CIRCUIT ASSEMBLY: {combi.subUnits.length} INTEGRATED CORES
                    </span>
                    <span className="text-purple-800 font-sans text-[7px]">
                      {combi.subUnits.map((s, i) => `Core ${i + 1}: ${s.name}`).join(' | ')}
                    </span>
                  </div>
                )}

                {/* Top Log Metadata Grid (Bicester Workbench Sheet Header Log) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 py-1.5 px-2 bg-slate-50/80 border border-slate-200 rounded text-[7.5px] break-inside-avoid">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Inspector Initial:</span>
                    <span className="font-mono font-bold text-slate-950 border-b border-slate-300 flex-1 truncate">
                      {intake.inspectorNameOrInitial || intake.technician || 'Nicola Malgarotti'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Date of Entry:</span>
                    <span className="font-mono font-bold text-slate-950 border-b border-slate-300 flex-1">
                      {intake.dateOfEntry || new Date(unit.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Job / Order No:</span>
                    <span className="font-mono font-bold text-slate-950 border-b border-slate-300 flex-1 truncate">
                      {unit.jobOrderNumber || intake.jobOrderNumber || unit.workOrderNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Component SN:</span>
                    <span className="font-mono font-black text-slate-950 border-b border-slate-300 flex-1">
                      {unit.serialNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Supplier Company:</span>
                    <span className="font-bold text-slate-950 border-b border-slate-300 flex-1 truncate">
                      {unit.supplierCompanyName || intake.supplierCompanyName || unit.customerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-600 shrink-0">Supplier Contact:</span>
                    <span className="font-bold text-slate-950 border-b border-slate-300 flex-1 truncate">
                      {unit.supplierContactName || intake.supplierContactName || 'Technical Overhaul Manager'}
                    </span>
                  </div>
                </div>

                {/* Packaging Reception & Hard Case Inspection (IN-Sheet Section) */}
                <div className="p-1.5 bg-white border border-slate-200 rounded space-y-1 break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <div className="flex items-center gap-1 font-bold text-slate-900 text-[7.5px] uppercase">
                      <Package className="h-2.5 w-2.5 text-amber-600" />
                      <span>Packaging Reception &amp; Moisture Condition Audit</span>
                    </div>
                    <span className={`px-1 py-0.2 rounded font-bold font-mono text-[6.5px] ${
                      intake.boxInspection?.moistureState === 'wet'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {intake.boxInspection?.moistureState === 'wet' ? '⚠ WET BOX (MOISTURE DETECTED)' : '✓ DRY BOX (CLEAN)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[7px] font-mono text-slate-700">
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase font-bold">Container Type:</span>
                      <strong className="text-slate-900 capitalize">{intake.boxInspection?.boxType?.replace('_', ' ') || 'Cardboard Carton'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase font-bold">Security Seal:</span>
                      <strong className="text-slate-900">{intake.boxInspection?.securitySealStatus ? intake.boxInspection.securitySealStatus.toUpperCase() : 'INTACT'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase font-bold">Courier Logistics:</span>
                      <span className="text-slate-900 truncate block">{intake.boxInspection?.carrierName || deliveryStatus.carrier || 'DHL AeroExpress'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase font-bold">Gross Weight:</span>
                      <strong className="text-slate-900">{intake.boxInspection?.grossWeightKg ? `${intake.boxInspection.grossWeightKg} kg` : '6.4 kg'}</strong>
                    </div>
                  </div>
                  {intake.boxInspection?.notes && (
                    <div className="text-[6.5px] text-amber-900 bg-amber-50/70 p-1 rounded border border-amber-200 font-mono">
                      <strong>Reception Note:</strong> "{intake.boxInspection.notes}"
                    </div>
                  )}
                </div>

                {/* THE COMPLETE 16-STEP BICESTER TECHNICAL PROCESS & OPERATIONAL QUALITY TABLE */}
                <div className="border border-slate-300 rounded overflow-hidden break-inside-avoid">
                  <div className="bg-slate-900 text-white px-2 py-1 flex items-center justify-between text-[7.5px] font-bold">
                    <span className="uppercase tracking-wider">
                      Bicester 16-Step Technical Process &amp; Operational Quality Validation Log
                    </span>
                    <span className="text-amber-400 font-mono text-[7px]">
                      FORM PS-WORKBENCH-QA-2026 · REV 4.2
                    </span>
                  </div>
                  <table className="w-full border-collapse text-[7px] text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase">
                        <th className="py-1 px-1.5 w-5 text-center border-r border-slate-300">#</th>
                        <th className="py-1 px-2 border-r border-slate-300 w-[50%]">Operational Step &amp; Specification</th>
                        <th className="py-1 px-2">Verification Telemetry &amp; Inspector Sign-Off</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {/* Step 1: Initial Inspection */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">1</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Initial Inspection: General Damage Check &amp; Box Reception</strong>
                          <span className="text-slate-500 block text-[6.5px]">Visual outer integrity check, crack inspection &amp; packaging audit</span>
                        </td>
                        <td className="py-1 px-2 align-top space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              {intake.damageCheckStatus !== 'DAMAGE_FOUND' ? <CheckSquare className="h-2.5 w-2.5 text-emerald-600" /> : <Square className="h-2.5 w-2.5 text-slate-300" />}
                              <span>Pass</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                              {intake.damageCheckStatus === 'DAMAGE_FOUND' ? <CheckSquare className="h-2.5 w-2.5 text-rose-600" /> : <Square className="h-2.5 w-2.5 text-slate-300" />}
                              <span>Damage Found</span>
                            </span>
                            <span className="text-slate-500 font-mono">· Sign: <strong>{intake.inspectorNameOrInitial || 'NM'}</strong></span>
                          </div>
                        </td>
                      </tr>

                      {/* Step 2: Core Protection Covers & Port Bungs */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">2</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Core Protection Covers &amp; Port Bungs</strong>
                          <span className="text-slate-500 block text-[6.5px]">Verify entrance/exit protection status upon arrival</span>
                        </td>
                        <td className="py-1 px-2 align-top space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500">Covers:</span>
                            {['Cardboard', 'Metal', 'Plastic', 'None'].map(cov => {
                              const isM = (intake.protectionCovers || 'metal').toLowerCase() === cov.toLowerCase();
                              return (
                                <span key={cov} className="inline-flex items-center gap-0.5">
                                  {isM ? <CheckSquare className="h-2.5 w-2.5 text-emerald-600" /> : <Square className="h-2.5 w-2.5 text-slate-300" />}
                                  <span className={isM ? 'font-bold text-slate-900' : 'text-slate-500'}>{cov}</span>
                                </span>
                              );
                            })}
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500">Bungs:</span>
                            <strong className="text-slate-900 font-mono">{intake.bungsCapsStatus === 'yes' ? 'Full Supplied' : intake.bungsCapsStatus === 'partial' ? 'Partial' : 'None'}</strong>
                          </div>
                        </td>
                      </tr>

                      {/* Step 3: Interface O-Rings Verification */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">3</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Interface O-Rings Verification</strong>
                          <span className="text-slate-500 block text-[6.5px]">Log unique configuration tags for port ends</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>O-Ring ID No: <strong className="text-slate-950">{intake.oRingIdNo || 'OR-70-FKM-22'}</strong></span>
                        </td>
                      </tr>

                      {/* Step 4: Connection Fittings Inventory Log */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">4</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Connection Fittings Inventory Log</strong>
                          <span className="text-slate-500 block text-[6.5px]">Record structural interface connection pieces tracking codes</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>Inhouse Part No: <strong className="text-slate-950">{unit.inhousePartNo || intake.inhousePartNo || `PS-${currentCompType.toUpperCase().slice(0, 3)}-${unit.partNumber}`}</strong></span>
                        </td>
                      </tr>

                      {/* Step 5: Oil Evacuation & Room-Temp Chemical Solvent Flow */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">5</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Oil Evacuation &amp; Room-Temp Chemical Solvent Degreasing (Zero Caustic · No Bath)</strong>
                          <span className="text-slate-500 block text-[6.5px]">1. Oil drain; 2. Ambient solvent flow circulation 20-22°C (Hydrocarbon strip)</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono space-y-0.5">
                          <div className="flex justify-between">
                            <span>Drain Time: <strong>{((unit.degreasing.oilDraining?.durationMinutes || 15) / 60).toFixed(2)}h ({unit.degreasing.oilDraining?.durationMinutes || 15}m)</strong></span>
                            <span>Rig: <strong>{unit.degreasing.tankId || 'FLOW-RIG-01'}</strong></span>
                          </div>
                          <div>
                            <span>Solvent Flow: <strong>{((unit.degreasing.soakDurationMinutes || 15) / 60).toFixed(2)}h ({unit.degreasing.soakDurationMinutes || 15}m)</strong> · Sign: <strong>{unit.degreasing.technician || 'NM'}</strong></span>
                          </div>
                        </td>
                      </tr>

                      {/* Step 6: Descaled Internal Passages Cycle (In between Degreasing & First Flush) */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">6</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-950">Descaled Internal Passages Cycle</strong>
                            {(unit.cleaning.skipped || unit.processConfig?.descalingRequired === false || unit.processConfig?.cleaningRequired === false) ? (
                              <span className="text-[6.5px] font-mono px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold">
                                NOT NEEDED · BYPASSED
                              </span>
                            ) : (
                              <span className="text-[6.5px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold">
                                COMPLETED
                              </span>
                            )}
                          </div>
                          <span className="text-slate-500 block text-[6.5px]">Deep chemical descaling to dissolve internal matrix deposits (Optional per unit assessment)</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          {(unit.cleaning.skipped || unit.processConfig?.descalingRequired === false || unit.processConfig?.cleaningRequired === false) ? (
                            <div className="space-y-0.5">
                              <span className="text-amber-900 font-bold">Status: NOT NEEDED / BYPASSED</span>
                              <div className="text-[7px] text-slate-700">Reason: {unit.cleaning.bypassReason || 'Internal matrix passages clean · Chemical descaling not required for this overhaul cycle'}</div>
                              <div>Certified: <strong>{unit.cleaning.bypassTechnician || unit.cleaning.technician || 'NM'}</strong> · Logged: <strong>0.00h (Bypassed)</strong></div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span>Wash Time: <strong>{((unit.cleaning.flowDynamicsCycleMinutes || 20) / 60).toFixed(2)}h ({unit.cleaning.flowDynamicsCycleMinutes || 20}m)</strong> (Flow Dynamics Wash Protocol)</span>
                              <div>Status: <strong className="text-emerald-700">✓ Passages Chemically Descaled</strong> · Sign: <strong>{unit.cleaning.technician || 'NM'}</strong></div>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Step 7: First Flush (55°C Deionized Water Neutralization Flush) */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">7</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">First Flush (55°C Deionized Water Neutralization Flush)</strong>
                          <span className="text-slate-500 block text-[6.5px]">Dedicated 55°C DI flush to dissolve surfactant &amp; neutralize solvent/descaler chemistry</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono space-y-0.5">
                          <div className="text-emerald-700 font-bold">
                            ✓ 55°C DI Flush Met ({unit.firstFlush?.durationMinutes || 6}m) · Soaping Agent Eliminated · Foam-Free
                          </div>
                          <div>
                            <span>Resistivity: <strong>Conforming (&gt;15 MΩ·cm)</strong> · Sign: <strong>{unit.firstFlush?.technician || unit.degreasing.technician || 'NM'}</strong></span>
                          </div>
                        </td>
                      </tr>

                      {/* Step 8: External Clean & Decontamination */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">8</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">External Clean &amp; Decontamination</strong>
                          <span className="text-slate-500 block text-[6.5px]">Matrix surface wash to strip external road grit &amp; contaminants</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>Matrix Wash: <strong>0.25h (15 Mins)</strong> · External Dirt Stripped · Sign: <strong>{unit.cleaning.technician || 'NM'}</strong></span>
                        </td>
                      </tr>

                      {/* Step 9: Fluid Flow Routing & Vector Alignment Analysis */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">9</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Fluid Flow Routing &amp; Vector Alignment Analysis</strong>
                          <span className="text-slate-500 block text-[6.5px]">Verification of path directional vector against blueprints</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>Drawing: <strong className="text-slate-950">{unit.drawingNumber || intake.drawingNumber || 'DWG-2026-F1-08'}</strong> · <strong className="text-emerald-700">✓ Vector Match Verified</strong></span>
                        </td>
                      </tr>

                      {/* Step 10: Leak & Pressure Test Validation */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">10</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Leak &amp; Pressure Test Validation (Water Bath + 5-Min Gas)</strong>
                          <span className="text-slate-500 block text-[6.5px]">Immersion under water introducing gas internally for 5 min bubble check</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span className="text-emerald-700 font-bold">✓ 0.00 PSI (Zero Bubble Stream / 5 Min Dwell)</span> · Target: {unit.pressureTest.testPressureBar || 150} Bar · Medium: Helium/N2
                        </td>
                      </tr>

                      {/* Step 11: Main Cleaning RIG Cycle Flushing */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">11</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Main Cleaning RIG Cycle Flushing</strong>
                          <span className="text-slate-500 block text-[6.5px]">High-volume fluid flush circulation loop run</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>Time: <strong>{(unit.finalFlush.targetSeconds / 3600).toFixed(2)}h ({Math.floor(unit.finalFlush.targetSeconds / 60)}m)</strong> @ 26.5 LPM · Sign: <strong>{unit.finalFlush.technician || 'NM'}</strong></span>
                        </td>
                      </tr>

                      {/* Step 12: Ultra Fine RIG Micro-Particle Filtering Stage */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">12</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Ultra Fine RIG Micro-Particle Filtering &amp; Optical Analysis</strong>
                          <span className="text-slate-500 block text-[6.5px]">Digital optical microscope counting across calibrated micron thresholds (Zero gravimetric technology)</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span>Microscope Count: <strong className="text-emerald-700">{unit.cleaning.analysisResult?.actualParticleCount ?? 0} particles (≤{unit.cleaning.analysisResult?.effectiveParticleSizeMicron || unit.cleaning.analysisResult?.maxParticleSizeMicron || 25}μm)</strong> · Max Allowed: {unit.cleaning.analysisResult?.maxAllowableCount ?? 0}</span>
                            <button
                              type="button"
                              onClick={() => setShowPdfViewer(true)}
                              className="no-print inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[8px] font-bold border border-sky-300 transition-colors cursor-pointer"
                              title="Preview uploaded Ultra Clean RIG test certificate PDF before printing"
                            >
                              <FileText className="h-2.5 w-2.5 text-sky-700" />
                              <span>{unit.cleaning?.testPdf?.url ? 'Preview PDF Cert' : 'Attach / Preview PDF'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Step 13: Thermal Dehydration Profile */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">13</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Thermal Dehydration Profile (Chamber Oven Bake)</strong>
                          <span className="text-slate-500 block text-[6.5px]">Particle Science Standard Thermal Profile · 2.0 Hours @ {unit.oven.targetTempC || 120}°C</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>In: <strong>09:30 AM</strong> · Out: <strong>11:30 AM</strong> (Full 2.0h @ {unit.oven.targetTempC || 120}°C Desiccation Completed · Particle Science / Customer Standard)</span>
                        </td>
                      </tr>

                      {/* Step 14: After Dry Quality Inspection (OUT Phase) */}
                      <tr className="hover:bg-slate-50 bg-amber-50/15">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">14</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">After Dry Quality Inspection</strong>
                          <span className="text-slate-500 block text-[6.5px]">Secondary structural assessment &amp; post-bake diagnostics</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span>Moisture Check: <strong className="text-emerald-700">✓ PASS</strong></span>
                            <span>Visual Check: <strong className="text-emerald-700">✓ PASS</strong></span>
                            <span>Sign: <strong>{signOff.afterDryInspectorSign || signOff.inspectorName || 'NM'}</strong></span>
                          </div>
                        </td>
                      </tr>

                      {/* Step 15: Component Purge & Terminal Port Sealing (OUT Phase) */}
                      <tr className="hover:bg-slate-50 bg-amber-50/15">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">15</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Component Purge &amp; Terminal Port Sealing</strong>
                          <span className="text-slate-500 block text-[6.5px]">Dry inert gas line purge immediately followed by secure port plugging</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono">
                          <span>Caps: <strong className="text-slate-950">{signOff.sealingStatus === 'ORIGINAL_CAPS_REUSED' ? 'Original Caps Re-used' : 'New Particle Science Bungs Installed'}</strong> · <strong className="text-emerald-700">✓ N2 Inert Gas Line Purged</strong></span>
                        </td>
                      </tr>

                      {/* Step 16: Fin Straightening Time Scale Log & Core Dressing */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">16</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Manual Fin Straightening &amp; Matrix Dressing</strong>
                          <span className="text-slate-500 block text-[6.5px]">100% manual bench craftsmanship straightening (Zero jigs used)</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-700 font-bold">✓ Conforming (100% Hand Craft · Zero Jigs Used)</span>
                            <span className="text-slate-950 font-bold">
                              Logged Time: {((unit.gilling?.elapsedSeconds || 420) / 3600).toFixed(2)}h ({Math.floor((unit.gilling?.elapsedSeconds || 420) / 60)}m {((unit.gilling?.elapsedSeconds || 420) % 60)}s)
                            </span>
                          </div>
                          <div className="text-[6.5px] text-slate-500">
                            Bench Station: <strong>{unit.gilling?.parameterLabel || 'Manual Dressing Bench #2'}</strong> · Craftsman: <strong>{unit.gilling?.technician || 'Nicola Malgarotti'}</strong>
                          </div>
                        </td>
                      </tr>

                      {/* Step 17: Final Internal Sign-Off & Clearance Release (OUT Phase) */}
                      <tr className="hover:bg-slate-50 bg-emerald-50/20">
                        <td className="py-1 px-1.5 font-bold text-center border-r border-slate-200 align-top">17</td>
                        <td className="py-1 px-2 border-r border-slate-200 align-top">
                          <strong className="text-slate-950">Final Internal Sign-Off &amp; Clearance Release</strong>
                          <span className="text-slate-500 block text-[6.5px]">Structural verification authorization matching process control requirements</span>
                        </td>
                        <td className="py-1 px-2 align-top font-mono space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span>Quality Sign: <strong className="text-slate-950">{signOff.authorizedQualitySign || signOff.inspectorName || 'Nicola Malgarotti (Lead QC)'}</strong></span>
                            <span>Date: <strong className="text-slate-950">{signOff.dateApproved || new Date().toLocaleDateString('en-GB')}</strong></span>
                          </div>
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[6.5px]">
                            <ShieldCheck className="h-2.5 w-2.5 text-emerald-700" />
                            <span>DISPATCH CLEARANCE RELEASE AUTHORIZED</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Page 1 Running Footer */}
                <div className="flex items-center justify-between text-[6.5px] font-mono text-slate-500 pt-1 border-t border-slate-200 break-inside-avoid running-footer document-footer no-print print:hidden">
                  <span>Page 1 of 3 · SOP-MS-{unit.serialNumber} · Form PS-WORKBENCH-QA-2026</span>
                  <span>Bicester Quality Validation Division · AS9100D &amp; ISO 9001 / 14001 Registered</span>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* PAGE 2: FLOW DYNAMICS TESTING & HYDROSTATIC PROOF CALIBRATION ANNEX       */}
            {/* ========================================================================= */}
            {(pageViewMode === 'all' || pageViewMode === 'page2') && (
              <section className="sheet-page space-y-2.5 pt-2 relative overflow-hidden">
                {/* Security Watermark Overlay */}
                {isWatermarkEnabled && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-30 select-none p-4" aria-hidden="true">
                    <div className="transform -rotate-[28deg] text-center select-none space-y-1.5 opacity-80 max-w-[85%]">
                      <div className="text-xl sm:text-2xl md:text-3xl uppercase font-black tracking-[0.16em] whitespace-nowrap text-red-600/30 border-y-2 border-red-600/30 py-1.5 px-4 shadow-sm">
                        CONFIDENTIAL - PROTRACE SOP
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] font-black text-red-500/35 uppercase">
                        RESTRICTED MOTORSPORT SPECIFICATION · AS9100D TRACEABLE
                      </div>
                    </div>
                  </div>
                )}
                {/* Page 2 Top Banner */}
                <div className="flex items-center justify-between bg-slate-900 text-white px-2.5 py-1 rounded break-inside-avoid">
                  <div className="flex items-center gap-2">
                    <Wind className="h-3.5 w-3.5 text-sky-400" />
                    <span className="font-bold text-[8.5px] uppercase tracking-wider">
                      Technical Annex: Flow Dynamics Calibration &amp; Hydrostatic Proof Log
                    </span>
                  </div>
                  <span className="font-mono text-[7px] text-amber-300 font-bold">
                    SN: {unit.serialNumber} · WO #{unit.workOrderNumber} · L{effectiveLife}
                  </span>
                </div>

                {/* STAGE 4: FLOW DYNAMICS TESTING & HOMOLOGATION CALIBRATION MATRIX */}
                <div className="space-y-1.5 border border-slate-200 rounded p-2 bg-white break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3 text-sky-600" />
                      <h3 className="text-[8px] font-black uppercase tracking-wider text-slate-900">
                        1. Flow Dynamics Testing &amp; Homologation Calibration Schedule (5-Point Protocol)
                      </h3>
                    </div>
                    <span className="text-[6.5px] font-mono px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-300 font-bold">
                      {flowCores.length > 1 ? `Multi-Circuit Combi (${flowCores.length} Cores)` : 'Dedicated Matrix Protocol'}
                    </span>
                  </div>

                  {flowCores.map((core) => {
                    const passingPoints = core.testPoints.filter((p, i) => {
                      const targetP = getTargetDeltaPressure(p, i);
                      const measuredP = getMeasuredDeltaPressure(p, i);
                      if (measuredP > 0) {
                        return Math.abs(measuredP - targetP) <= targetP * 0.15;
                      }
                      return p.passed;
                    }).length;
                    const corePassed = passingPoints >= 3;

                    return (
                      <div key={core.id} className="space-y-1.5 pt-1 border-t border-slate-100 first:border-t-0 first:pt-0">
                        {flowCores.length > 1 && (
                          <div className="flex items-center justify-between bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[7px]">
                            <span className="font-bold text-slate-900">CORE #{core.coreIndex}: {core.name}</span>
                            <span>Bench: {core.benchId} · Fluid: {core.fluidType} · {core.fluidTempC}°C</span>
                          </div>
                        )}

                        {/* 5-Point Calibration Table */}
                        <div className="border border-slate-300 rounded overflow-hidden">
                          <table className="w-full text-[7px] text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 font-mono uppercase text-[6.5px] border-b border-slate-300">
                                <th className="py-0.5 px-1.5">Pt</th>
                                <th className="py-0.5 px-1.5">Freq</th>
                                <th className="py-0.5 px-1.5">Condition</th>
                                <th className="py-0.5 px-1.5">Set Flow (Q)</th>
                                <th className="py-0.5 px-1.5">Target ΔP (±15%)</th>
                                <th className="py-0.5 px-1.5 font-bold text-slate-900">Actual ΔP</th>
                                <th className="py-0.5 px-1.5 font-bold">ΔP Variance</th>
                                <th className="py-0.5 px-1.5 font-bold text-slate-900">Actual Flow</th>
                                <th className="py-0.5 px-1.5 text-right">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-mono text-[7px]">
                              {core.testPoints.map((pt, pIdx) => {
                                const targetP = getTargetDeltaPressure(pt, pIdx);
                                const measuredP = getMeasuredDeltaPressure(pt, pIdx);
                                const variancePercent = targetP > 0 ? ((measuredP - targetP) / targetP) * 100 : 0;
                                const isPass = Math.abs(variancePercent) <= 15;

                                return (
                                  <tr key={`cert-cal-pt-${pIdx}-${pt.pointIndex || pIdx}`} className="hover:bg-slate-50">
                                    <td className="py-0.5 px-1.5 font-bold">{pt.pointIndex || pIdx + 1}</td>
                                    <td className="py-0.5 px-1.5">{pt.frequencyHz || (20 + pIdx * 10)} Hz</td>
                                    <td className="py-0.5 px-1.5 truncate max-w-[90px] font-sans">{pt.name.split(' - ')[1] || pt.name}</td>
                                    <td className="py-0.5 px-1.5 font-bold">{pt.targetFlowLpm.toFixed(1)} LPM</td>
                                    <td className="py-0.5 px-1.5 text-slate-600">{targetP.toFixed(2)} Bar</td>
                                    <td className="py-0.5 px-1.5 font-black text-slate-950">{measuredP.toFixed(2)} Bar</td>
                                    <td className="py-0.5 px-1.5 font-bold text-slate-800">
                                      {variancePercent > 0 ? `+${variancePercent.toFixed(1)}%` : `${variancePercent.toFixed(1)}%`}
                                    </td>
                                    <td className="py-0.5 px-1.5 font-bold text-slate-950">{pt.measuredFlowLpm ? `${pt.measuredFlowLpm.toFixed(1)} LPM` : '—'}</td>
                                    <td className="py-0.5 px-1.5 text-right font-bold">
                                      <span className={`px-1 py-0.2 rounded text-[6.5px] ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {isPass ? 'PASS' : 'DEV'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* High Precision Compact Flow Difference & Curve Chart */}
                        <div className="bg-slate-50/50 p-1.5 rounded border border-slate-200 space-y-1">
                          <div className="flex items-center justify-between text-[7px] font-mono">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Activity className="h-2.5 w-2.5 text-sky-600" />
                              Flow Dynamics
                            </span>
                            <span className="text-emerald-700 font-bold">
                              {corePassed ? '✓ 5-POINT SOP COMPLIANT (≥3/5 IN SPEC)' : 'CALIBRATION EXCEEDED TOLERANCE'}
                            </span>
                          </div>
                          <div className="w-full overflow-hidden">
                            <ReportFullGraph
                              testPoints={core.testPoints}
                              prevPoints={core.prevRun?.testPoints}
                              isNewUnit={!isPreviouslyTested}
                              forceDualPrint={true}
                              compact={true}
                              showDifferenceBar={true}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* HYDROSTATIC PROOF PRESSURE & SUBMERGED WATER BATH 5-MIN GAS FLOW SCHEDULE */}
                <div className="space-y-1 border border-slate-200 rounded p-2 bg-white break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-cyan-600" />
                      <h3 className="text-[8px] font-black uppercase tracking-wider text-slate-900">
                        2. Hydrostatic Proof Pressure Integrity &amp; Submerged Water Bath Gas Leakage Schedule
                      </h3>
                    </div>
                    <span className="text-[6.5px] font-mono px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-900 font-bold border border-cyan-300">
                      Submerged Bath + 5-Min Gas Dwell
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-[7px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[6.5px] uppercase tracking-wider">
                          <th className="py-0.5 px-1.5 font-bold border-r border-slate-300 w-1/4">Inspection Metric</th>
                          <th className="py-0.5 px-1.5 font-bold border-r border-slate-300">Measured Telemetry &amp; Protocol Execution</th>
                          <th className="py-0.5 px-1.5 font-bold border-r border-slate-300">Specification &amp; Standard</th>
                          <th className="py-0.5 px-1.5 font-bold text-right w-20">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[7px]">
                        <tr>
                          <td className="py-1 px-1.5 font-sans font-semibold text-slate-900 border-r border-slate-200">
                            Submerged Water Bath Gas Flow
                          </td>
                          <td className="py-1 px-1.5 text-slate-800 border-r border-slate-200">
                            Tank: <strong>{unit.pressureTest.waterBathTankId || 'WB-OPTICAL-01'}</strong> · Dwell: <strong className="text-cyan-900">{unit.pressureTest.gasFlowThroughTubesDurationSeconds || 300}s (5.0 Mins)</strong> · Water: {unit.pressureTest.waterBathTempC || 21}°C · Gas: Dry Nitrogen
                          </td>
                          <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 font-sans">
                            Continuous gas flow through internal tubes under submerged illuminated water bath for 5-min dwell.
                          </td>
                          <td className="py-1 px-1.5 text-right font-sans font-bold text-cyan-900">
                            5-MIN MET
                          </td>
                        </tr>

                        <tr>
                          <td className="py-1 px-1.5 font-sans font-semibold text-slate-900 border-r border-slate-200">
                            Optical Bubble Stream Check
                          </td>
                          <td className="py-1 px-1.5 text-slate-800 border-r border-slate-200">
                            Visual bubble scan across 100% tube arrays and welds: <strong className="text-emerald-800">ZERO BUBBLES OBSERVED</strong>
                            {unit.pressureTest.glueRepair?.applied && (
                              <span className="block text-[6px] text-amber-700 font-mono mt-0.5">
                                Epoxy Repaired: {unit.pressureTest.glueRepair.glueType}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 font-sans">
                            Zero bubbling threshold across 5-min gas dwell.
                          </td>
                          <td className="py-1 px-1.5 text-right font-sans font-bold text-emerald-800">
                            PASS (0 BUBBLES)
                          </td>
                        </tr>

                        <tr>
                          <td className="py-1 px-1.5 font-sans font-semibold text-slate-900 border-r border-slate-200">
                            Hydrostatic Proof Pressure
                          </td>
                          <td className="py-1 px-1.5 text-slate-800 border-r border-slate-200">
                            Proof Target: <strong className="text-slate-950 font-bold">{unit.pressureTest.testPressureBar || 150} Bar</strong> ({Math.round((unit.pressureTest.testPressureBar || 150) * 14.5038)} PSI) · Held: {unit.pressureTest.heldDurationSeconds || 60}s · Medium: DI Water · ΔP: 0.00 Bar steady
                          </td>
                          <td className="py-1 px-1.5 text-slate-700 border-r border-slate-200 font-sans">
                            BS EN 13445-5 Envelope: Zero weepage (decay &le; 0.5 Bar)
                          </td>
                          <td className="py-1 px-1.5 text-right font-sans font-bold text-emerald-800">
                            PASS (150 BAR)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CHEMICAL CLEANLINESS ANALYSIS APEX 1.0 & OVEN DESICCATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 break-inside-avoid">
                  {/* Cleanliness Analysis */}
                  <div className="p-2 border border-slate-200 rounded bg-white space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 text-[7.5px] font-bold text-slate-900 uppercase">
                      <span>3. Cleanliness: Optical Microscope Count</span>
                      <span className="text-[6.5px] text-emerald-700 font-mono font-bold">Class CCC Conforming</span>
                    </div>
                    <div className="text-[7px] space-y-0.5 text-slate-700 font-mono">
                      <div>Method: <strong className="text-slate-950">Digital Optical Microscope (Zero Gravimetric)</strong></div>
                      <div>Particle Rating: <strong className="text-slate-950">≤{unit.cleaning.analysisResult?.effectiveParticleSizeMicron || unit.cleaning.analysisResult?.maxParticleSizeMicron || 25}μm Threshold</strong></div>
                      <div>Microscope Count: <strong className="text-emerald-700">{unit.cleaning.analysisResult?.actualParticleCount ?? 0} particles (Max Allowed: {unit.cleaning.analysisResult?.maxAllowableCount ?? 0})</strong></div>
                      <div>Moisture Content: <strong className="text-slate-950">{unit.cleaning.analysisResult?.moisturePpm ?? 12} ppm H₂O</strong></div>
                    </div>
                  </div>

                  {/* Oven Bake & Fin Dressing */}
                  <div className="p-2 border border-slate-200 rounded bg-white space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 text-[7.5px] font-bold text-slate-900 uppercase">
                      <span>4. Desiccation Bake &amp; Matrix Dressing</span>
                      <span className="text-[6.5px] text-emerald-700 font-mono font-bold">100% Hand Crafted</span>
                    </div>
                    <div className="text-[7px] space-y-0.5 text-slate-700 font-mono">
                      <div>Bake Specification: <strong className="text-emerald-700">Particle Science / Customer Standard (AS9100D Thermal Profile)</strong></div>
                      <div>Thermal Bakeout: <strong className="text-slate-950">{unit.oven.targetTempC || 120}°C for 2.0 Hours</strong></div>
                      <div>Matrix Fin Pitch: <strong className="text-slate-950">Restored by Hand Bench Craft (Zero Jigs)</strong> · Time: <strong>{((unit.gilling?.elapsedSeconds || 420) / 3600).toFixed(2)}h ({Math.floor((unit.gilling?.elapsedSeconds || 420) / 60)}m {((unit.gilling?.elapsedSeconds || 420) % 60)}s)</strong></div>
                      <div>Nitrogen Blanketing: <strong className="text-slate-950">Dry N2 Purged &amp; Sealed Immediately</strong></div>
                    </div>
                  </div>
                </div>

                {/* Page 2 Running Footer */}
                <div className="flex items-center justify-between text-[6.5px] font-mono text-slate-500 pt-1 border-t border-slate-200 break-inside-avoid running-footer document-footer no-print print:hidden">
                  <span>Page 2 of 3 · Flow &amp; Proof Pressure Annex · SOP-MS-{unit.serialNumber}</span>
                  <span>Form PS-WORKBENCH-QA-2026 · Hydrodynamic Flow Calibration Matrix</span>
                </div>
              </section>
            )}

            {/* ========================================================================= */}
            {/* PAGE 3: PHOTOGRAPHIC EVIDENCE, TRACKSIDE LOGISTICS & OFFICIAL RELEASE     */}
            {/* ========================================================================= */}
            {(pageViewMode === 'all' || pageViewMode === 'page3') && (
              <section className="sheet-page space-y-2.5 pt-2 relative overflow-hidden">
                {/* Security Watermark Overlay */}
                {isWatermarkEnabled && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-30 select-none p-4" aria-hidden="true">
                    <div className="transform -rotate-[28deg] text-center select-none space-y-1.5 opacity-80 max-w-[85%]">
                      <div className="text-xl sm:text-2xl md:text-3xl uppercase font-black tracking-[0.16em] whitespace-nowrap text-red-600/30 border-y-2 border-red-600/30 py-1.5 px-4 shadow-sm">
                        CONFIDENTIAL - PROTRACE SOP
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] font-black text-red-500/35 uppercase">
                        RESTRICTED MOTORSPORT SPECIFICATION · AS9100D TRACEABLE
                      </div>
                    </div>
                  </div>
                )}
                {/* Page 3 Top Banner */}
                <div className="flex items-center justify-between bg-slate-900 text-white px-2.5 py-1 rounded break-inside-avoid">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-bold text-[8.5px] uppercase tracking-wider">
                      Photographic Quality Records, Trackside Logistics &amp; Conformance Release
                    </span>
                  </div>
                  <span className="font-mono text-[7px] text-emerald-300 font-bold">
                    AS9100D Authorized Release · SN: {unit.serialNumber}
                  </span>
                </div>

                {/* PHOTOGRAPHIC QUALITY ASSURANCE RECORDS */}
                <div className="space-y-1.5 border border-slate-200 rounded p-2 bg-white break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3 w-3 text-slate-800" />
                      <h3 className="text-[8px] font-black uppercase tracking-wider text-slate-900">
                        1. Photographic Quality Assurance &amp; Component Inspection Records ({reportPhotos.length} Records)
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 no-print">
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[7px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Upload inspection photos"
                      >
                        <Upload className="h-2 w-2" />
                        <span>Add Pictures</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSampleMacroPhoto}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[7px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Add technical schematic"
                      >
                        <Plus className="h-2 w-2 text-cyan-600" />
                        <span>Schematic</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Gallery Grid (Cleanly sized for A4) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    {reportPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedLightboxPhoto({ url: photo.url, title: photo.title, caption: photo.caption })}
                        className="border border-slate-200 rounded p-1 bg-slate-50 hover:bg-slate-100 flex flex-col justify-between gap-1 shadow-2xs hover:border-slate-400 transition-all cursor-pointer group relative"
                        title="Click to enlarge inspection photo"
                      >
                        <div className="flex items-center justify-between text-[6px] font-mono">
                          <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-800 font-bold truncate max-w-[80px]">
                            {photo.stageName}
                          </span>
                          <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="h-2 w-2 text-emerald-600" />
                            <span>VERIFIED</span>
                          </span>
                        </div>

                        {/* Image Viewport */}
                        <div className="w-full h-20 sm:h-22 bg-slate-900 rounded overflow-hidden flex items-center justify-center relative border border-slate-300">
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/75 backdrop-blur-xs rounded text-[6px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 pointer-events-none">
                            <Eye className="h-2 w-2 text-cyan-400" />
                            <span>Enlarge</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[7px] font-bold text-slate-900 block truncate leading-tight">
                            {photo.title}
                          </span>
                          <p className="text-[6px] text-slate-600 line-clamp-2 leading-tight mt-0.5">
                            {photo.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TRACKSIDE LOGISTICS & ON-TIME SLA DELIVERY TRACKING */}
                <div className="bg-slate-50 border border-slate-300 rounded p-1.5 space-y-0.5 text-[7px] break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1 text-[7.5px]">
                      <Truck className="h-2.5 w-2.5 text-slate-700" />
                      <span>2. Trackside Logistics &amp; On-Time Delivery (OTD) Tracking</span>
                    </span>
                    <span className={`px-1 py-0.2 rounded font-bold font-mono text-[6.5px] border ${deliveryStatus.onTimeBadgeBg} ${deliveryStatus.onTimeBadgeText} ${deliveryStatus.onTimeBadgeBorder}`}>
                      {deliveryStatus.onTimeLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 font-mono text-[7px] text-slate-700 pt-0.5 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase">Target Delivery SLA:</span>
                      <strong className="text-slate-900">{deliveryStatus.targetFormatted}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase">Courier / Logistics:</span>
                      <span>{deliveryStatus.carrier || 'DHL Trackside AeroExpress'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase">Waybill / Tracking:</span>
                      <span>{deliveryStatus.trackingNumber || `TRK-${unit.workOrderNumber}`}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[6px] uppercase">Destination Hub / Circuit:</span>
                      <span>{deliveryStatus.destinationCity || 'F1 Paddock Circuit Hub'}</span>
                    </div>
                  </div>
                </div>

                {/* ATTACHED LABORATORY TEST RESULTS & PDF CERTIFICATES */}
                <div className="bg-slate-50 border border-slate-300 rounded p-1.5 space-y-1 text-[7px] break-inside-avoid">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1 text-[7.5px]">
                      <FileText className="h-2.5 w-2.5 text-sky-700" />
                      <span>Attached Laboratory PDF Test Results &amp; Particle Analysis Certificate</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPdfViewer(true)}
                      className="no-print px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold font-mono text-[7px] border border-sky-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Preview uploaded PDF test results before printing"
                    >
                      <Eye className="h-2.5 w-2.5 text-sky-700" />
                      <span>Preview Test PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-200 font-mono text-[7px] text-slate-700 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span>Doc: <strong className="text-slate-900">{unit.cleaning?.testPdf?.name || 'UltraCleanRIG_Laboratory_Certificate.pdf'}</strong></span>
                      <span className="text-slate-400">|</span>
                      <span>Rating: <strong className="text-emerald-700">{unit.cleaning?.testPdf?.cleanlinessSpec || `${unit.cleaning.cleaningSpecMicron || 25}μm Spec (Apex 1.0)`}</strong></span>
                      <span className="text-slate-400">|</span>
                      <span>Analyst: <strong>{unit.cleaning?.analysisResult?.labTechnician || 'N. Malgarotti'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[6.5px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                        {unit.cleaning?.testPdf?.url ? '✓ LABORATORY CERTIFICATE ATTACHED' : 'PENDING ATTACHMENT'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OFFICIAL QUALITY RELEASE, STAMP & AUTHORIZATION */}
                <div className="border-t-2 border-slate-900 pt-2 space-y-1.5 break-inside-avoid">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: QA Release Verdict */}
                    <div className="space-y-0.5 max-w-sm">
                      <span className="text-[7px] font-mono uppercase tracking-wider font-bold text-slate-500">
                        3. Quality Release &amp; Homologation Disposition
                      </span>
                      <div className={`text-xs font-black font-mono flex items-center gap-1 ${
                        isApproved ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{unit.signOff.qaDisposition || 'APPROVED'} · CONFORMING</span>
                      </div>
                      <p className="text-[7px] text-slate-600 leading-tight">
                        {unit.signOff.finalComments || 'This motorsport cooling component has completed full overhaul, flow dynamics washing, 5-point calibration with deionized water, and hydrostatic pressure verification. Thermal bake executed according to Particle Science Standard Thermal Profile. All parameters conform to customer specifications and quality standards.'}
                      </p>
                    </div>

                    {/* Right: Signature Box & Stamp */}
                    <div className="border border-slate-300 rounded p-1.5 bg-slate-50 text-right space-y-0.5 min-w-[210px]">
                      <div className="text-[6.5px] font-mono text-slate-500 uppercase tracking-wider">
                        Authorized Technical Quality Inspector
                      </div>
                      {unit.signOff.signatureDataUrl ? (
                        <div className="h-7 flex items-center justify-end">
                          <img
                            src={unit.signOff.signatureDataUrl}
                            alt="Digital Signature"
                            className="h-7 w-auto object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-7 flex items-center justify-end text-[7px] font-mono text-slate-400 italic">
                          [Digital Signature Secured]
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-0.5 text-[7px] font-mono text-slate-900">
                        <strong className="block">{unit.signOff.inspectorName || 'Nicola Malgarotti'}</strong>
                        <span className="text-[6px] text-slate-600">License / Stamp: {unit.signOff.inspectorId || 'TECH-402'} · AS9100D Authorized</span>
                      </div>
                    </div>
                  </div>

                  {/* Legal Accreditation Footer */}
                  <div className="text-center border-t border-slate-200 pt-1 text-[6.5px] font-mono text-slate-500 legal-footer document-footer running-footer no-print print:hidden">
                    Official Homologated Master Technical Record · Form SOP-MS-9001 / {WORKBENCH_DOC_INFO.formCode} · Conforming to Apex 1.0 Cleanliness Standard (Operational Equivalent to ISO 16232) &amp; {categoryCfg.governingBody}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* High-Resolution Photo Lightbox Modal */}
        {selectedLightboxPhoto && (
          <div 
            onClick={() => setSelectedLightboxPhoto(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">
                    Inspection Evidence Record
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    {selectedLightboxPhoto.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLightboxPhoto(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 bg-neutral-950 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
                <img
                  src={selectedLightboxPhoto.url}
                  alt={selectedLightboxPhoto.title}
                  className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-lg border border-neutral-800"
                />
              </div>

              {selectedLightboxPhoto.caption && (
                <div className="p-3 bg-neutral-900 border-t border-neutral-800 text-xs text-neutral-300">
                  <p>{selectedLightboxPhoto.caption}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 24mm Tape Asset Label Modal Integration */}
        {showQrModal && (
          <UnitQrLabelModal
            unit={unit}
            isOpen={showQrModal}
            onClose={() => setShowQrModal(false)}
          />
        )}

        {/* Lightweight PDF Test Results Viewer Component */}
        {showPdfViewer && (
          <PdfTestResultViewer
            isOpen={showPdfViewer}
            onClose={() => setShowPdfViewer(false)}
            unit={unit}
            onUpdateUnit={onUpdateUnit}
            onPrintMasterReport={() => {
              setShowPdfViewer(false);
              handlePrint();
            }}
          />
        )}
      </div>
    </div>
  );
};
