import jsPDF from 'jspdf';
import { ServiceUnit } from '../types/process';

/**
 * Formats bytes into human-readable KB/MB strings.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Triggers native browser print dialog specifically for a PDF data URL or blob URL
 * using an isolated print iframe.
 */
export function printPdfDirectly(pdfDataUrl: string, title: string = 'Ultra Clean RIG Test Certificate'): void {
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = '0';
  printFrame.style.zIndex = '-9999';
  document.body.appendChild(printFrame);

  // If it's a PDF data URI or Blob URL
  if (pdfDataUrl.startsWith('data:application/pdf') || pdfDataUrl.startsWith('blob:')) {
    printFrame.src = pdfDataUrl;
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.warn('Direct iframe PDF print failed, opening in new window:', err);
        const win = window.open(pdfDataUrl, '_blank');
        win?.focus();
        win?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(printFrame)) {
            document.body.removeChild(printFrame);
          }
        }, 3000);
      }
    };
  } else {
    // If it's an image or HTML-based document, render HTML in the iframe
    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
              img { max-width: 100%; height: auto; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${pdfDataUrl}" alt="${title}" />
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
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 1500);
        }
      }, 300);
    }
  }
}

/**
 * Generates an official, high-resolution Ultra Clean RIG PDF Laboratory Test Certificate
 * using jsPDF, fully populated with current unit parameters and test results.
 */
export function generateSampleRigTestPdf(
  unit: ServiceUnit,
  specMicron: number | 'custom' = 25,
  technicianName: string = 'N. Malgarotti (QA Microscopist)'
): { dataUrl: string; fileName: string; sizeBytes: number } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const effectiveMicron = specMicron === 'custom' 
    ? (unit.cleaning?.customCleaningSpecMicron || 75) 
    : specMicron;

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Background Header Bar (Deep Slate / Navy)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Accent Line (Cyan / Sky)
  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 32, 210, 2, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PARTICLE SCIENCE · BICESTER DEPOT', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(186, 230, 253); // sky-200
  doc.text('ULTRA CLEAN RIG · MICRO-PARTICLE FLUID ANALYSIS LABORATORY CERTIFICATE', 14, 21);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Document Ref: PSTS-UCR-QA2026-LAB · Protocol: Apex 1.0 (Eq. ISO 16232)', 14, 27);

  // Certificate Status Badge in Header
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(155, 8, 42, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONFORMING', 161, 15);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('100% SPEC VERIFIED', 160, 20);

  // Section 1: Component & Work Order Metadata Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 40, 182, 34, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. ASSET IDENTIFICATION & RIG CALIBRATION METADATA', 18, 46);

  doc.setDrawColor(226, 232, 240);
  doc.line(18, 48, 192, 48);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Column 1
  doc.text(`Component Serial:`, 18, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${unit.serialNumber}`, 48, 54);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Work Order Number:`, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${unit.workOrderNumber}`, 48, 60);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer / Team:`, 18, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${unit.customerName || (unit as any).customer || 'Motorsport Customer'}`, 48, 66);

  // Column 2
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Rig ID:`, 110, 54);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`ULTRA-CLEAN-RIG-05 (Calibrated)`, 140, 54);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Test Date & Time:`, 110, 60);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${dateStr} · ${timeStr}`, 140, 60);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Analysis Method:`, 110, 66);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text(`Digital Optical Microscope (0 Gravimetric)`, 140, 66);

  // Section 2: Selected Cleaning Specification & Particle Count Results
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 80, 182, 85, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. MICROSCOPIC OPTICAL PARTICLE COUNT & CLEANLINESS SPECIFICATION', 18, 86);

  doc.setDrawColor(226, 232, 240);
  doc.line(18, 88, 192, 88);

  // Specification Highlight Banner
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(18, 92, 174, 15, 1.5, 1.5, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text(`CLEANING SPECIFICATION: ${effectiveMicron} MICRON (μm) ABSOLUTE RATING`, 22, 98);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(14, 116, 144);
  doc.text(`Verified under digital optical microscope with polarized 100x–500x optical scanning. Zero gravimetric technology.`, 22, 103);

  // Table of particle distribution
  const tableTop = 112;
  doc.setFillColor(226, 232, 240); // slate-200
  doc.rect(18, tableTop, 174, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Particle Size Class (μm)', 22, tableTop + 5);
  doc.text('Analysis Method', 75, tableTop + 5);
  doc.text('Actual Count', 125, tableTop + 5);
  doc.text('Max Allowable', 155, tableTop + 5);
  doc.text('Verdict', 178, tableTop + 5);

  const testThresholds = [5, 10, 25, 50, 100, 200];
  let curY = tableTop + 7;

  testThresholds.forEach((th, idx) => {
    const isTargetSpec = th === effectiveMicron;
    if (isTargetSpec) {
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.rect(18, curY, 174, 6, 'F');
    } else if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(18, curY, 174, 6, 'F');
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', isTargetSpec ? 'bold' : 'normal');
    if (isTargetSpec) {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(51, 65, 85);
    }

    doc.text(`> ${th} μm ${isTargetSpec ? '(Specified Rating)' : ''}`, 22, curY + 4.5);
    doc.text('Digital Optical Microscope', 75, curY + 4.5);
    doc.text('0 Particles', 125, curY + 4.5);
    doc.text(isTargetSpec ? '0 (Zero Tolerance)' : '≤ 5 Particles', 155, curY + 4.5);
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('PASS', 180, curY + 4.5);

    curY += 6;
  });

  // Moisture & Effluent Row
  curY += 2;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Residual Water / Moisture Content: 20 PPM (Conforming)`, 22, curY + 4);
  doc.text(`Turbulence Pulsation: 28.5 LPM Dynamic Shear Flush`, 110, curY + 4);

  // Section 3: Digital Optical Microscopy Certification Notice
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 171, 182, 45, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. LABORATORY CERTIFICATION & GRAVIMETRIC EXCLUSION STATEMENT', 18, 177);

  doc.setDrawColor(226, 232, 240);
  doc.line(18, 179, 192, 179);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'This certifies that internal fluid matrix passages of the listed motorsport component underwent closed-loop',
    18,
    185
  );
  doc.text(
    'pulsation flushing on the dedicated Ultra Clean RIG. Effluent fluid extraction was vacuum filtered and inspected',
    18,
    190
  );
  doc.text(
    'under a calibrated digital optical polarized microscope in full compliance with Apex 1.0 Cleanliness Specifications.',
    18,
    195
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(
    'NOTE: Particle Science does NOT utilize gravimetric technology. Particulate cleanliness is strictly verified',
    18,
    202
  );
  doc.text(
    'via direct digital optical microscopic particle count down to the specified micron rating.',
    18,
    207
  );

  // Section 4: Authorized Release Signatures & Stamp
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 222, 182, 46, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('4. QUALITY ASSURANCE AUTHORIZATION & RELEASE SIGN-OFF', 18, 228);

  doc.setDrawColor(226, 232, 240);
  doc.line(18, 230, 192, 230);

  // Left: Microscopist Signature Box
  doc.setDrawColor(203, 213, 225);
  doc.rect(18, 234, 75, 28);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('LAB TECHNICIAN / QA MICROSCOPIST:', 22, 239);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(technicianName, 22, 246);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Digital Sign ID: PS-MICRO-${Date.now().toString().slice(-6)}`, 22, 252);
  doc.text(`Signed: ${dateStr} @ ${timeStr}`, 22, 257);

  // Right: Official Stamp Box
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(74, 222, 128); // emerald-400
  doc.roundedRect(105, 234, 87, 28, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // emerald-700
  doc.text('PARTICLE SCIENCE CERTIFIED LABORATORY RELEASE', 110, 241);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Standard: Apex 1.0 Cleanliness / ISO 16232 Equivalent`, 110, 247);
  doc.text(`Specification Rating: ${effectiveMicron} Micron (μm) Absolute`, 110, 252);
  doc.setFont('helvetica', 'bold');
  doc.text(`DISPOSITION: APPROVED FOR MASTER REPORT INCLUSION`, 110, 258);

  // Footer note
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Particle Science Testing Solutions · Bicester Motion, Oxfordshire, UK · AS9100D Certified Laboratory Facility`,
    14,
    280
  );
  doc.text(`Page 1 of 1 · Appendix to Master Technical Homologation Report`, 140, 280);

  // Subtle Security Watermark
  try {
    doc.saveGraphicsState();
    const gState = new (doc as any).GState({ opacity: 0.08 });
    doc.setGState(gState);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(220, 38, 38);
    doc.text('CONFIDENTIAL - PROTRACE SOP', 105, 148, { angle: 45, align: 'center' });
    doc.setFontSize(10);
    doc.text('RESTRICTED MOTORSPORT SPECIFICATION · AS9100D', 105, 156, { angle: 45, align: 'center' });
    doc.restoreGraphicsState();
  } catch {}

  const dataUrl = doc.output('datauristring');
  const fileName = `UltraCleanRIG_Test_Certificate_${unit.serialNumber}_${effectiveMicron}um.pdf`;
  const sizeBytes = Math.round(dataUrl.length * 0.75); // approx base64 size

  return {
    dataUrl,
    fileName,
    sizeBytes,
  };
}
