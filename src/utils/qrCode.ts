import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { ServiceUnit, UnitQrCodeInfo, ScannedUnitPayload, ComponentType } from '../types/process';

/**
 * Intelligently infers or normalizes the component unit type from QR payload data,
 * part numbers, model names, or serial identifiers.
 */
export function inferComponentType(input: {
  type?: string;
  model?: string;
  part?: string;
  serial?: string;
  text?: string;
}): ComponentType {
  const t = (input.type || '').toLowerCase().trim();
  if (t === 'water_radiator' || t === 'radiator' || t === 'water_rad' || t === 'water rad' || t === 'rad' || t === 'wr') return 'water_radiator';
  if (t === 'oil_cooler' || t === 'oil' || t === 'oilcooler' || t === 'oil cooler' || t === 'oc') return 'oil_cooler';
  if (t === 'intercooler' || t === 'cac' || t === 'charge_air' || t === 'charge air' || t === 'air-to-air' || t === 'ic' || t === 'charge cooler') return 'intercooler';
  if (t === 'combi_3_unit' || t === 'combi3' || t === 'combi_3' || t === 'triple_core' || t === 'combi triple' || t === 'triple' || t === '3-core') return 'combi_3_unit';
  if (t === 'combi_2_unit' || t === 'combi2' || t === 'combi_2' || t === 'dual_core' || t === 'combi dual' || t === 'dual' || t === '2-core' || t === 'combi') return 'combi_2_unit';
  if (t === 'heat_exchanger' || t === 'hex' || t === 'heat exchanger') return 'heat_exchanger';

  // Check prefix in serial and part number
  const snClean = (input.serial || '').toUpperCase().trim();
  const pnClean = (input.part || '').toUpperCase().trim();
  for (const s of [snClean, pnClean]) {
    if (s.startsWith('RAD-') || s.startsWith('RAD_') || s.startsWith('WR-') || s.startsWith('WR_')) return 'water_radiator';
    if (s.startsWith('OC-') || s.startsWith('OC_') || s.startsWith('OIL-') || s.startsWith('OIL_')) return 'oil_cooler';
    if (s.startsWith('IC-') || s.startsWith('IC_') || s.startsWith('CAC-') || s.startsWith('CAC_')) return 'intercooler';
    if (s.startsWith('CMB3-') || s.startsWith('COMBI3-') || s.startsWith('TRIPLE-')) return 'combi_3_unit';
    if (s.startsWith('CMB2-') || s.startsWith('COMBI2-') || s.startsWith('DUAL-') || s.startsWith('CMB-')) return 'combi_2_unit';
  }

  // Check model, part, serial, and raw text heuristics
  const combined = `${input.model || ''} ${input.part || ''} ${input.serial || ''} ${input.text || ''}`.toLowerCase();
  if (combined.includes('water rad') || combined.includes('radiator') || combined.includes('-rad-') || combined.includes('-rad') || combined.includes('_rad') || combined.includes('water-rad')) {
    return 'water_radiator';
  }
  if (combined.includes('oil cooler') || combined.includes('oil-cooler') || combined.includes('oil_cooler') || combined.includes('-oc-') || combined.includes('oil rad') || combined.includes('-oc') || combined.includes('_oc')) {
    return 'oil_cooler';
  }
  if (combined.includes('intercooler') || combined.includes('charge air') || combined.includes('charge-air') || combined.includes('cac-') || combined.includes('-cac') || combined.includes('_cac') || combined.includes('air-to-air') || combined.includes('charge cooler')) {
    return 'intercooler';
  }
  if (combined.includes('combi-3') || combined.includes('combi 3') || combined.includes('triple') || combined.includes('3-core') || combined.includes('3 core') || combined.includes('triple-circuit')) {
    return 'combi_3_unit';
  }
  if (combined.includes('combi-2') || combined.includes('combi 2') || combined.includes('dual') || combined.includes('2-core') || combined.includes('2 core') || combined.includes('dual-circuit') || combined.includes('combi')) {
    return 'combi_2_unit';
  }

  return 'heat_exchanger';
}

/**
 * Builds an ultra-compact JSON string payload for a service unit QR code.
 * Optimized specifically for 24 mm label tape scanning:
 * Keeps payload minimal (only essential unit serial & life number) so the QR matrix
 * drops down to low-density Version 1 / 2 (21x21 to 25x25 matrix).
 * This ensures individual dots are large, sharp, and instantly scanned on 24mm tape.
 */
export function generateUnitQrPayload(
  unit: Partial<ServiceUnit>,
  options?: { format?: 'json' | 'serial_only' }
): string {
  const unitId = unit.serialNumber || unit.id || 'UNIT';
  const life = unit.lifeNumber ?? (unit.intake?.lifeNumber ?? (unit.intake?.isFirstService ? 1 : 2));

  if (options?.format === 'serial_only') {
    return String(unitId).trim();
  }

  // Ultra-compact payload: only ~25-30 chars!
  return JSON.stringify({
    unit: String(unitId).trim(),
    life: Number(life) || 1,
  });
}

/**
 * Generates high-contrast Data URL image for a given unit or payload.
 * Uses crisp high-contrast black/white and Level L (Low error correction) for 24mm tape printers.
 * Level L produces the lowest matrix density (Version 1 / 2) with the largest physical dots.
 */
export async function generateQrCodeDataUrl(
  input: string | Partial<ServiceUnit>,
  options?: { width?: number; margin?: number; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; format?: 'json' | 'serial_only' }
): Promise<string> {
  const text = typeof input === 'string' ? input : generateUnitQrPayload(input, { format: options?.format });
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 360,
      margin: options?.margin ?? 1,
      errorCorrectionLevel: options?.errorCorrectionLevel || 'L',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

/**
 * Generates an SVG Data URL synchronously using QRCode.create and vector rects.
 * Ensures zero-delay instant rendering on unit creation and crisp 24mm tape printing.
 * Defaults to 'L' error correction level for minimum matrix complexity (largest dots).
 */
export function generateUnitQrCodeSvgSync(
  input: string | Partial<ServiceUnit>,
  options?: { margin?: number; darkColor?: string; lightColor?: string; errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; format?: 'json' | 'serial_only' }
): string {
  const text = typeof input === 'string' ? input : generateUnitQrPayload(input, { format: options?.format });
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: options?.errorCorrectionLevel || 'L' });
    const size = qr.modules.size;
    const margin = options?.margin ?? 1;
    const totalSize = size + margin * 2;
    const data = qr.modules.data;
    const dark = options?.darkColor || '#000000';
    const light = options?.lightColor || '#ffffff';

    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (data[r * size + c]) {
          rects += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1" fill="${dark}"/>`;
        }
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges"><rect width="${totalSize}" height="${totalSize}" fill="${light}"/>${rects}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch (err) {
    console.error('Failed to generate sync QR code SVG:', err);
    return '';
  }
}

/**
 * Synchronously builds UnitQrCodeInfo.
 */
export function generateUnitQrInfoSync(unit: Partial<ServiceUnit>, options?: { format?: 'json' | 'serial_only' }): UnitQrCodeInfo {
  const payload = generateUnitQrPayload(unit, options);
  const dataUrl = generateUnitQrCodeSvgSync(payload, { errorCorrectionLevel: 'L' });
  return {
    dataUrl,
    payload,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Automatically creates full UnitQrCodeInfo object for a unit.
 */
export async function generateUnitQrCodeInfo(unit: Partial<ServiceUnit>): Promise<UnitQrCodeInfo> {
  const payload = generateUnitQrPayload(unit);
  const dataUrl = await generateQrCodeDataUrl(payload);
  return {
    dataUrl,
    payload,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Robust parser for scanned QR code text.
 * Accepts structured Particle Science Tracking JSON, key-value text, URL params, or plain serial number.
 */
export function parseScannedQrText(raw: string): ScannedUnitPayload {
  const trimmed = raw.trim();

  // 1. Try JSON parsing
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      const unitIdentifier = parsed.unit || parsed.unitId || parsed.sn || parsed.serialNumber || parsed.serial || parsed.u || '';
      const lifeNumber = parsed.lifeNumber ?? parsed.life ?? parsed.l ?? parsed.lifeNo ?? parsed.cycle ?? undefined;
      const explicitType = parsed.componentType || parsed.unitType || parsed.type || parsed.compType;
      const pn = parsed.pn || parsed.partNumber || parsed.part;
      const model = parsed.model || parsed.modelName;
      if (unitIdentifier) {
        const snStr = String(unitIdentifier).trim();
        const life = lifeNumber !== undefined ? Number(lifeNumber) : undefined;
        const compType = inferComponentType({
          type: explicitType,
          model,
          part: pn,
          serial: snStr,
          text: trimmed,
        });

        return {
          format: parsed.format || 'UNIT_LIFE_V1',
          system: parsed.system,
          id: parsed.id,
          unit: snStr,
          serialNumber: snStr,
          lifeNumber: life,
          partNumber: pn,
          modelName: model,
          customerName: parsed.customer || parsed.customerName,
          workOrderNumber: parsed.wo || parsed.workOrderNumber || parsed.workOrder,
          componentType: compType,
          serviceType: parsed.serviceType,
          isFirstService: parsed.isFirstService ?? (life !== undefined ? life <= 1 : undefined),
          rawText: trimmed,
        };
      }
    }
  } catch {
    // Not JSON, continue to heuristics
  }

  // 2. Check for URL format (e.g. https://.../unit?sn=SN-8842-HP&pn=FMU-7204)
  if (trimmed.includes('?') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://depot.internal/${trimmed}`);
      const sn = url.searchParams.get('sn') || url.searchParams.get('serial') || url.searchParams.get('serialNumber');
      if (sn) {
        const pn = url.searchParams.get('pn') || url.searchParams.get('partNumber') || undefined;
        const model = url.searchParams.get('model') || undefined;
        const compType = inferComponentType({
          type: url.searchParams.get('type') || url.searchParams.get('componentType') || url.searchParams.get('unitType') || undefined,
          model,
          part: pn,
          serial: sn.trim(),
          text: trimmed,
        });

        return {
          serialNumber: sn.trim(),
          partNumber: pn,
          modelName: model,
          customerName: url.searchParams.get('customer') || undefined,
          workOrderNumber: url.searchParams.get('wo') || undefined,
          componentType: compType,
          rawText: trimmed,
        };
      }
    } catch {
      // URL parsing failed, fall through
    }
  }

  // 3. Check for multi-line or colon-separated tags: SN: SN-8842-HP / PN: FMU-7200
  const lines = trimmed.split(/[\r\n;,]+/);
  let sn = '';
  let life: number | undefined = undefined;
  let pn = '';
  let wo = '';
  let model = '';
  let customer = '';
  let parsedType = '';

  for (const line of lines) {
    const [k, ...vParts] = line.split(':');
    const val = vParts.join(':').trim();
    if (!val) continue;
    const key = k.trim().toUpperCase();
    if (key === 'UNIT' || key === 'SN' || key === 'SERIAL' || key === 'SERIAL NUMBER') sn = val;
    else if (key === 'LIFE' || key === 'LIFENUMBER' || key === 'LIFE NUMBER' || key === 'CYCLE') life = Number(val) || undefined;
    else if (key === 'PN' || key === 'PART' || key === 'PART NUMBER') pn = val;
    else if (key === 'WO' || key === 'WORK ORDER') wo = val;
    else if (key === 'MODEL') model = val;
    else if (key === 'CUSTOMER') customer = val;
    else if (key === 'TYPE' || key === 'UNIT TYPE' || key === 'COMPONENT' || key === 'COMPONENT TYPE') parsedType = val;
  }

  if (sn) {
    const compType = inferComponentType({
      type: parsedType || undefined,
      model,
      part: pn,
      serial: sn,
      text: trimmed,
    });

    return {
      serialNumber: sn,
      unit: sn,
      lifeNumber: life,
      partNumber: pn || undefined,
      workOrderNumber: wo || undefined,
      modelName: model || undefined,
      customerName: customer || undefined,
      componentType: compType,
      rawText: trimmed,
    };
  }

  // 4. Fallback: treat the entire string as Serial Number
  const compType = inferComponentType({
    serial: trimmed,
    text: trimmed,
  });

  return {
    serialNumber: trimmed,
    componentType: compType,
    rawText: trimmed,
  };
}

/**
 * Scans an ImageData buffer using jsQR.
 */
export function scanImageDataForQr(imageData: ImageData): string | null {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    return code ? code.data : null;
  } catch (err) {
    console.error('jsQR scanning error:', err);
    return null;
  }
}

/**
 * Reads an uploaded image File, renders to canvas, and runs jsQR scanner.
 */
export function scanImageFileForQr(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return resolve(null);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = scanImageDataForQr(imageData);
          resolve(result);
        } catch (err) {
          console.error('Failed to read image data:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a QR code data URL (SVG or PNG) to a high-resolution JPG data URL on a solid white background.
 */
export async function convertDataUrlToJpg(dataUrl: string, size = 600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      // Fill crisp white background so JPEG has no dark/black transparent artifacts
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw QR code with a neat quiet zone border
      const padding = 24;
      ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => {
      // Fallback to original dataUrl if image loading fails
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Downloads the QR code as a high-quality JPG file.
 */
export async function downloadQrCodeImage(dataUrl: string, serialNumber: string) {
  const jpgDataUrl = await convertDataUrlToJpg(dataUrl, 600);
  const a = document.createElement('a');
  a.href = jpgDataUrl;
  a.download = `QR_${serialNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Explicit alias to download QR code as JPG.
 */
export const downloadQrCodeAsJpg = downloadQrCodeImage;

