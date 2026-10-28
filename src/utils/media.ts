import { MediaItem, StepId } from '../types/process';

export type ImageResizeProfile = 'compact' | 'standard' | 'high' | 'logo';

export interface ImageResizeOptions {
  maxDimension?: number;
  quality?: number;
  targetMaxBytes?: number;
  profile?: ImageResizeProfile;
}

export interface ImageCompressionResult {
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedPercent: number;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  mimeType: string;
}

const STORAGE_PROFILE_KEY = 'psts_image_resize_profile';

export function getImageResizeProfile(): ImageResizeProfile {
  if (typeof localStorage === 'undefined') return 'standard';
  const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
  if (saved === 'compact' || saved === 'standard' || saved === 'high' || saved === 'logo') {
    return saved;
  }
  return 'standard';
}

export function setImageResizeProfile(profile: ImageResizeProfile) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_PROFILE_KEY, profile);
    window.dispatchEvent(new CustomEvent('image-profile-changed', { detail: { profile } }));
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resizes and compresses an image automatically to save storage space.
 * Shrinks heavy 5-20MB smartphone photos to ~35-75KB while preserving critical inspection detail (serial tags, fins, welds).
 */
export async function resizeImageForUpload(
  fileOrBlob: File | Blob,
  options?: ImageResizeOptions
): Promise<ImageCompressionResult> {
  const isFile = fileOrBlob instanceof File;
  const originalBytes = fileOrBlob.size || 0;
  const fileName = isFile ? fileOrBlob.name : 'image.jpg';

  // If not a standard bitmap image (e.g. svg, pdf, video), read as-is without canvas rasterization
  if (!fileOrBlob.type.startsWith('image/') || fileOrBlob.type === 'image/svg+xml') {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(fileOrBlob);
    });

    return {
      dataUrl: rawDataUrl,
      originalBytes,
      compressedBytes: originalBytes,
      savedBytes: 0,
      savedPercent: 0,
      originalWidth: 0,
      originalHeight: 0,
      resizedWidth: 0,
      resizedHeight: 0,
      mimeType: fileOrBlob.type,
    };
  }

  // Determine profile settings
  const activeProfile = options?.profile || getImageResizeProfile();
  let maxDimension = options?.maxDimension;
  let quality = options?.quality;
  let targetMaxBytes = options?.targetMaxBytes;

  if (!maxDimension) {
    switch (activeProfile) {
      case 'compact':
        maxDimension = 800;
        quality = quality ?? 0.68;
        targetMaxBytes = targetMaxBytes ?? 50 * 1024; // 50KB target
        break;
      case 'high':
        maxDimension = 1280;
        quality = quality ?? 0.82;
        targetMaxBytes = targetMaxBytes ?? 140 * 1024; // 140KB target
        break;
      case 'logo':
        maxDimension = 400;
        quality = quality ?? 0.85;
        targetMaxBytes = targetMaxBytes ?? 35 * 1024; // 35KB target
        break;
      case 'standard':
      default:
        maxDimension = 1024;
        quality = quality ?? 0.75;
        targetMaxBytes = targetMaxBytes ?? 85 * 1024; // 85KB target
        break;
    }
  } else {
    quality = quality ?? 0.75;
    targetMaxBytes = targetMaxBytes ?? 90 * 1024;
  }

  // Load image with orientation handling
  let imgWidth = 0;
  let imgHeight = 0;
  let drawableSource: CanvasImageSource;

  try {
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      // Modern browsers handle EXIF camera rotation natively with imageOrientation: 'from-image'
      const bmp = await (createImageBitmap as any)(fileOrBlob, { imageOrientation: 'from-image' });
      imgWidth = bmp.width;
      imgHeight = bmp.height;
      drawableSource = bmp;
    } else {
      throw new Error('createImageBitmap unavailable');
    }
  } catch {
    // Fallback via standard Image element
    const rawUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(fileOrBlob);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image for resizing'));
      image.src = rawUrl;
    });

    imgWidth = img.naturalWidth || img.width;
    imgHeight = img.naturalHeight || img.height;
    drawableSource = img;
  }

  const originalWidth = imgWidth;
  const originalHeight = imgHeight;

  // Compute proportional resized dimensions
  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
      targetWidth = maxDimension;
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
      targetHeight = maxDimension;
    }
  }

  // Render to canvas with high quality smoothing
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Failed to obtain canvas 2D context for image compression');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawableSource, 0, 0, targetWidth, targetHeight);

  // Close bitmap if applicable
  if ('close' in drawableSource && typeof (drawableSource as any).close === 'function') {
    (drawableSource as any).close();
  }

  // Compress to JPEG
  let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
  let estBytes = Math.round((compressedDataUrl.length - 23) * 0.75);

  // If still above target threshold and quality can be tuned down, run adaptive refinement
  if (estBytes > targetMaxBytes && quality > 0.58) {
    const refinedQuality = Math.max(0.55, quality - 0.16);
    const secondPass = canvas.toDataURL('image/jpeg', refinedQuality);
    if (secondPass.length < compressedDataUrl.length) {
      compressedDataUrl = secondPass;
      estBytes = Math.round((compressedDataUrl.length - 23) * 0.75);
    }
  }

  const compressedBytes = estBytes;
  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const savedPercent = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

  const result: ImageCompressionResult = {
    dataUrl: compressedDataUrl,
    originalBytes,
    compressedBytes,
    savedBytes,
    savedPercent,
    originalWidth,
    originalHeight,
    resizedWidth: targetWidth,
    resizedHeight: targetHeight,
    mimeType: 'image/jpeg',
  };

  // Broadcast optimization telemetry so UI toasts / status indicators can reassure the user
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('image-optimized', {
        detail: {
          name: fileName,
          ...result,
          originalFormatted: formatBytes(originalBytes),
          compressedFormatted: formatBytes(compressedBytes),
        },
      })
    );
  }

  return result;
}

/**
 * Universal wrapper maintaining 100% backward compatibility for all existing call sites.
 * Automatically downscales and compresses uploaded pictures to save local & cloud quota.
 */
export async function readFileAsDataUrl(file: File, options?: ImageResizeOptions): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return readDocumentAsDataUrl(file);
  }
  const res = await resizeImageForUpload(file, options);
  return res.dataUrl;
}

/**
 * Reads any raw document or binary file (such as PDF) directly into a base64 Data URL.
 */
export function readDocumentAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Generate realistic SVG image placeholders when user wants to simulate real camera capture
export function generateTechnicalSchematicSvg(label: string, subtext: string, color: string = '#38bdf8'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" fill="#0f172a"/>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
    </pattern>
    <rect width="600" height="400" fill="url(#grid)" />
    <!-- Technical border -->
    <rect x="20" y="20" width="560" height="360" rx="8" stroke="${color}" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="6 4"/>
    <!-- Center crosshair / blueprint motif -->
    <circle cx="300" cy="180" r="70" stroke="${color}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="300" cy="180" r="100" stroke="${color}" stroke-opacity="0.25" stroke-width="1"/>
    <path d="M 180 180 L 420 180" stroke="${color}" stroke-opacity="0.4" stroke-width="1"/>
    <path d="M 300 60 L 300 300" stroke="${color}" stroke-opacity="0.4" stroke-width="1"/>
    <!-- Technical Unit Silhouette -->
    <rect x="250" y="140" width="100" height="80" rx="4" fill="#1e293b" stroke="${color}" stroke-width="2"/>
    <circle cx="275" cy="180" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <circle cx="325" cy="180" r="12" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <rect x="230" y="165" width="20" height="30" rx="2" fill="${color}" fill-opacity="0.6"/>
    <rect x="350" y="165" width="20" height="30" rx="2" fill="${color}" fill-opacity="0.6"/>
    <text x="300" y="310" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">${label}</text>
    <text x="300" y="335" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="12" text-anchor="middle">${subtext}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generate realistic video sample representation
export function generateVideoPlaceholder(label: string): string {
  // Return an HTML5 canvas-friendly representation or sample preview
  return generateTechnicalSchematicSvg(label, 'HD Visual Inspection Recording (00:42) · 1080p 60fps', '#a855f7');
}

export function createMediaItem(
  name: string,
  type: 'image' | 'video' | 'document',
  url: string,
  stage: StepId,
  caption?: string
): MediaItem {
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    type,
    url,
    uploadedAt: new Date().toISOString(),
    caption: caption || name,
    stage,
  };
}
