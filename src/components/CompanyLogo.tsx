import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { resizeImageForUpload } from '../utils/media';

interface CompanyLogoProps {
  variant?: 'header' | 'report' | 'modal';
  showUploadTrigger?: boolean;
  showText?: boolean;
  className?: string;
}

const STORAGE_KEY = 'protrace_company_logo';

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  variant = 'report',
  showUploadTrigger = false,
  showText = true,
  className = '',
}) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '/LOGO.png';
    } catch {
      return '/LOGO.png';
    }
  });
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load custom logo from localStorage or fallback to /LOGO.png
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setLogoSrc(saved);
      setImgError(false);
    } else {
      // Check if /LOGO.png exists, fallback to /logo.svg if needed
      const testImg = new Image();
      testImg.src = '/LOGO.png';
      testImg.onload = () => {
        setLogoSrc('/LOGO.png');
        setImgError(false);
      };
      testImg.onerror = () => {
        const svgImg = new Image();
        svgImg.src = '/logo.svg';
        svgImg.onload = () => {
          setLogoSrc('/logo.svg');
          setImgError(false);
        };
        svgImg.onerror = () => {
          setImgError(true);
        };
      };
    }

    // Listen for storage updates across tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLogoSrc(e.newValue);
        setImgError(!e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    setIsUploading(true);
    try {
      const result = await resizeImageForUpload(file, {
        profile: 'logo',
        maxDimension: 400,
        quality: 0.85,
      });

      if (result.dataUrl) {
        localStorage.setItem(STORAGE_KEY, result.dataUrl);
        setLogoSrc(result.dataUrl);
        setImgError(false);
      }
    } catch (err) {
      console.warn('Failed to resize and save company logo:', err);
      alert('Failed to process image file. Please try another image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Reset to default company logo?')) {
      localStorage.removeItem(STORAGE_KEY);
      setLogoSrc('/LOGO.png');
      setImgError(false);
    }
  };

  // Render Vector SVG Fallback Logo
  const renderVectorLogo = () => {
    if (variant === 'header') {
      return (
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm shadow-sm relative overflow-hidden group">
            <svg viewBox="0 0 40 40" className="w-6 h-6">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="20" cy="20" r="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <path d="M 12 20 Q 16 14 20 20 T 28 20" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="20" r="2.5" fill="#f59e0b" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white uppercase block">
              PARTICLE SCIENCE TRACKING SYSTEM
            </span>
          </div>
        </div>
      );
    }

    // Default Report Vector Logo (White background friendly)
    if (!showText) {
      return (
        <div className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-sm shrink-0">
          <svg viewBox="0 0 50 50" className="w-7 h-7">
            <rect x="4" y="4" width="42" height="42" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="25" cy="25" r="14" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
            <path d="M 15 25 Q 20 18 25 25 T 35 25" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="25" cy="25" r="3" fill="#f59e0b" />
          </svg>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-sm shrink-0">
          <svg viewBox="0 0 50 50" className="w-8 h-8">
            <rect x="4" y="4" width="42" height="42" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="25" cy="25" r="14" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
            <path d="M 15 25 Q 20 18 25 25 T 35 25" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="25" cy="25" r="3" fill="#f59e0b" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-slate-900 font-sans">
              PARTICLE SCIENCE TRACKING SYSTEM
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-300">
              ISO 9001 / Apex 1.0
            </span>
          </div>
          <p className="text-[11px] font-bold text-sky-800 tracking-wide uppercase">
            Fluid Cleanliness, Flow Calibration &amp; Overhaul Depot
          </p>
          <p className="text-[9.5px] font-mono text-slate-500">
            AS9100D Quality Assurance Calibration Facility
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Hidden File Input for Custom Logo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
      />

      {/* Render Logo Image or Vector Fallback */}
      {logoSrc && !imgError ? (
        <div className="flex items-center gap-2">
          <img
            src={logoSrc}
            alt="Company Logo"
            onError={() => setImgError(true)}
            className={`object-contain transition-all ${
              variant === 'header'
                ? 'max-h-9 max-w-[160px]'
                : 'max-h-14 max-w-[220px]'
            }`}
          />
        </div>
      ) : (
        renderVectorLogo()
      )}

      {/* Upload & Reset Controls (Visible if showUploadTrigger is true or in print-hidden toolbar) */}
      {showUploadTrigger && (
        <div className="no-print flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload your logo file (PNG, JPG, SVG)"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium border border-slate-200"
          >
            <Upload className="h-3 w-3 text-sky-600" />
            <span className="hidden sm:inline">Upload Logo</span>
          </button>

          {logoSrc && (
            <button
              type="button"
              onClick={handleResetLogo}
              title="Reset to default logo"
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
