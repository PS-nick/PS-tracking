import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Printer, 
  Download, 
  Eye, 
  Compass, 
  Cpu, 
  Wind, 
  FileText,
  CheckCircle2,
  Info
} from 'lucide-react';
import { ServiceUnit, ComponentType } from '../types/process';
import { ensureCombiConfig } from '../utils/storage';

interface FlowDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: ServiceUnit;
}

export const FlowDrawingModal: React.FC<FlowDrawingModalProps> = ({
  isOpen,
  onClose,
  unit,
}) => {
  const uploadedUrl = unit.flowDrawingUrl || unit.intake?.flowDrawingUrl;
  const [sourceType, setSourceType] = useState<'uploaded' | 'cad'>(uploadedUrl ? 'uploaded' : 'cad');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showPorts, setShowPorts] = useState<boolean>(true);
  const [activeCircuit, setActiveCircuit] = useState<'all' | 'c1' | 'c2' | 'c3'>('all');

  if (!isOpen) return null;

  const combi = ensureCombiConfig(unit);
  const isCombi = !!combi && combi.isCombi && combi.subUnits && combi.subUnits.length > 0;
  const unitCount = isCombi ? combi.unitCount : 1;
  const drawingNo = unit.drawingNumber || `DWG-BIC-2026-${unit.serialNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, z + 0.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.7, z - 0.2));
  const handleResetZoom = () => setZoomLevel(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md p-2 sm:p-3 md:p-4 flex items-center justify-center animate-fadeIn no-print">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1520px] flex flex-col min-h-0 max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] shadow-2xl overflow-hidden my-auto">
        {/* Drawing Header */}
        <div className="bg-neutral-950 border-b border-neutral-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800/60">
                  {drawingNo}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">Rev D (2026)</span>
                <span className="text-neutral-600">·</span>
                <span className="text-xs text-neutral-300 font-medium">
                  {unit.customerName} · {unit.modelName}
                </span>
                {isCombi && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    COMBY ({unitCount} CORES)
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Technical Blueprint Drawing &amp; Flow Circuit Schematic
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono text-neutral-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Print Blueprint"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Drawing"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawing Toolbar */}
        <div className="bg-neutral-950/80 border-b border-neutral-800/80 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Source Switcher: Uploaded Flow Drawing / Picture vs CAD Vector Blueprint */}
          {uploadedUrl && (
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setSourceType('uploaded')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  sourceType === 'uploaded'
                    ? 'bg-sky-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Uploaded Drawing / Photo
              </button>
              <button
                type="button"
                onClick={() => setSourceType('cad')}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  sourceType === 'cad'
                    ? 'bg-sky-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                CAD Vector Blueprint
              </button>
            </div>
          )}

          {/* Layer toggles (only relevant for CAD blueprint) */}
          {sourceType === 'cad' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold mr-1">
                Layers:
              </span>
              <button
                type="button"
                onClick={() => setShowVectors(!showVectors)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  showVectors
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                Flow Vectors
              </button>
              <button
                type="button"
                onClick={() => setShowDimensions(!showDimensions)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  showDimensions
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                Dimensions
              </button>
              <button
                type="button"
                onClick={() => setShowPorts(!showPorts)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  showPorts
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                Ports &amp; Taps
              </button>
            </div>
          )}

          {/* Circuit Filter for Combi */}
          {isCombi && (
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveCircuit('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  activeCircuit === 'all'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All Circuits
              </button>
              <button
                type="button"
                onClick={() => setActiveCircuit('c1')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  activeCircuit === 'c1'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                C1: Water
              </button>
              <button
                type="button"
                onClick={() => setActiveCircuit('c2')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  activeCircuit === 'c2'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                C2: Oil
              </button>
              {unitCount === 3 && (
                <button
                  type="button"
                  onClick={() => setActiveCircuit('c3')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                    activeCircuit === 'c3'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  C3: Gearbox
                </button>
              )}
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-xs text-neutral-300 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Blueprint or Uploaded Flow Drawing Viewport */}
        {sourceType === 'uploaded' && uploadedUrl ? (
          <div className="flex-1 overflow-auto p-4 bg-[#080c14] flex flex-col items-center justify-center min-h-[460px] relative select-none">
            <div 
              className="transition-transform duration-150 origin-center max-w-full flex items-center justify-center p-2"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={uploadedUrl}
                alt={unit.flowDrawingTitle || 'Uploaded Flow Circuit Drawing'}
                className="max-h-[70vh] max-w-full rounded-xl border border-sky-500/40 shadow-2xl object-contain bg-neutral-950"
              />
            </div>
            <div className="absolute bottom-3 left-4 bg-neutral-950/90 border border-neutral-800 px-3 py-1.5 rounded-lg backdrop-blur text-xs flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-neutral-200">
                {unit.flowDrawingTitle || unit.intake?.flowDrawingTitle || 'Intake Flow Circuit'}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="font-mono text-neutral-400">{drawingNo}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-emerald-400 text-[11px] font-mono font-bold">Uploaded at Intake</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 bg-[#0a0f1d] flex items-center justify-center min-h-[460px]">
            <div 
              className="transition-transform duration-150 origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* SVG Engineering Blueprint */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 900 580" 
                className="w-[840px] h-[540px] drop-shadow-2xl select-none"
              >
              <defs>
                {/* Blueprint Grid pattern */}
                <pattern id="bp-small-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#172554" strokeWidth="0.5" strokeOpacity="0.6"/>
                </pattern>
                <pattern id="bp-large-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="url(#bp-small-grid)"/>
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeOpacity="0.5"/>
                </pattern>

                {/* Arrow markers for flow vectors */}
                <marker id="flow-arrow-sky" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8"/>
                </marker>
                <marker id="flow-arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#fbbf24"/>
                </marker>
                <marker id="flow-arrow-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#34d399"/>
                </marker>
              </defs>

              {/* Background with Grid */}
              <rect width="900" height="580" fill="#0b1329"/>
              <rect width="900" height="580" fill="url(#bp-large-grid)"/>

              {/* Blueprint Outer Border */}
              <rect x="15" y="15" width="870" height="550" rx="4" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.7"/>
              <rect x="22" y="22" width="856" height="536" rx="2" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeOpacity="0.4"/>

              {/* Title Block (Bottom Right) */}
              <g transform="translate(560, 435)">
                <rect width="310" height="120" fill="#070c18" stroke="#3b82f6" strokeWidth="1.5" opacity="0.95"/>
                <line x1="0" y1="30" x2="310" y2="30" stroke="#1d4ed8" strokeWidth="1"/>
                <line x1="0" y1="60" x2="310" y2="60" stroke="#1d4ed8" strokeWidth="1"/>
                <line x1="0" y1="90" x2="310" y2="90" stroke="#1d4ed8" strokeWidth="1"/>
                <line x1="155" y1="0" x2="155" y2="90" stroke="#1d4ed8" strokeWidth="1"/>
                
                <text x="8" y="18" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">CUSTOMER / OEM</text>
                <text x="8" y="27" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="bold">{(unit.customerName || 'Customer').slice(0, 22)}</text>
                
                <text x="163" y="18" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">DRAWING NUMBER</text>
                <text x="163" y="27" fill="#facc15" fontSize="10" fontFamily="monospace" fontWeight="bold">{drawingNo}</text>
                
                <text x="8" y="48" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">ASSEMBLY TYPE</text>
                <text x="8" y="57" fill="#ffffff" fontSize="10" fontFamily="sans-serif">
                  {isCombi ? `Combi ${unitCount}-Unit Assembly` : 'Single Circuit Cooler'}
                </text>
                
                <text x="163" y="48" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">SERIAL NUMBER</text>
                <text x="163" y="57" fill="#ffffff" fontSize="10" fontFamily="monospace">{unit.serialNumber}</text>
                
                <text x="8" y="78" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">TOLERANCE BRACKET</text>
                <text x="8" y="87" fill="#4ade80" fontSize="10" fontFamily="monospace">±15% Target LPM</text>
                
                <text x="163" y="78" fill="#60a5fa" fontSize="9" fontFamily="monospace" fontWeight="bold">BENCH RIG TEST</text>
                <text x="163" y="87" fill="#ffffff" fontSize="10" fontFamily="monospace">20, 30, 40, 50, 60 Hz</text>

                <text x="8" y="108" fill="#93c5fd" fontSize="9" fontFamily="monospace">APPROVED: Particle Science Bicester Dep QA</text>
                <text x="260" y="108" fill="#facc15" fontSize="9" fontFamily="monospace" fontWeight="bold">REV D</text>
              </g>

              {/* CORE RENDERING: SINGLE VS COMBI 2 VS COMBI 3 */}
              {!isCombi ? (
                /* SINGLE CORE MATRIX SCHEMATIC */
                <g transform="translate(140, 80)">
                  {/* End Tanks */}
                  <rect x="60" y="50" width="40" height="260" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2"/>
                  <rect x="420" y="50" width="40" height="260" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2"/>

                  {/* Core Matrix Body */}
                  <rect x="100" y="60" width="320" height="240" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5"/>
                  
                  {/* Louvred Tubes */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((idx) => (
                    <line 
                      key={idx} 
                      x1="100" 
                      y1={75 + idx * 19} 
                      x2="420" 
                      y2={75 + idx * 19} 
                      stroke="#334155" 
                      strokeWidth="3" 
                      strokeDasharray="4 2"
                    />
                  ))}

                  {/* Inlet Port (Top Left) */}
                  <rect x="10" y="70" width="50" height="28" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5"/>
                  <circle cx="15" cy="84" r="8" fill="#0369a1" stroke="#bae6fd" strokeWidth="1"/>
                  <text x="35" y="88" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">IN</text>

                  {/* Outlet Port (Bottom Right) */}
                  <rect x="460" y="260" width="50" height="28" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5"/>
                  <circle cx="505" cy="274" r="8" fill="#0369a1" stroke="#bae6fd" strokeWidth="1"/>
                  <text x="475" y="278" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">OUT</text>

                  {/* Pressure Sensor Tap Points */}
                  {showPorts && (
                    <>
                      <circle cx="80" cy="115" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5"/>
                      <text x="45" y="132" fill="#fbbf24" fontSize="9" fontFamily="monospace">TAP P1 (IN)</text>

                      <circle cx="440" cy="245" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5"/>
                      <text x="445" y="240" fill="#fbbf24" fontSize="9" fontFamily="monospace">TAP P2 (OUT)</text>
                    </>
                  )}

                  {/* Flow Vector Arrows */}
                  {showVectors && (
                    <g>
                      <line x1="-5" y1="84" x2="60" y2="84" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#flow-arrow-sky)"/>
                      <path d="M 120 90 Q 260 90 400 90" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#flow-arrow-sky)"/>
                      <path d="M 400 150 Q 260 150 120 150" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#flow-arrow-sky)"/>
                      <path d="M 120 210 Q 260 210 400 210" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#flow-arrow-sky)"/>
                      <path d="M 120 270 Q 260 270 400 270" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" markerEnd="url(#flow-arrow-sky)"/>
                      <line x1="460" y1="274" x2="525" y2="274" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#flow-arrow-sky)"/>
                    </g>
                  )}

                  {/* Dimension Callouts */}
                  {showDimensions && (
                    <g>
                      {/* Width Dimension */}
                      <line x1="100" y1="40" x2="420" y2="40" stroke="#facc15" strokeWidth="1"/>
                      <line x1="100" y1="35" x2="100" y2="45" stroke="#facc15" strokeWidth="1"/>
                      <line x1="420" y1="35" x2="420" y2="45" stroke="#facc15" strokeWidth="1"/>
                      <text x="260" y="35" fill="#facc15" fontSize="10" fontFamily="monospace" textAnchor="middle">CORE L = 380 mm ±0.5</text>

                      {/* Height Dimension */}
                      <line x1="530" y1="60" x2="530" y2="300" stroke="#facc15" strokeWidth="1"/>
                      <line x1="525" y1="60" x2="535" y2="60" stroke="#facc15" strokeWidth="1"/>
                      <line x1="525" y1="300" x2="535" y2="300" stroke="#facc15" strokeWidth="1"/>
                      <text x="540" y="185" fill="#facc15" fontSize="10" fontFamily="monospace" transform="rotate(90, 540, 185)" textAnchor="middle">H = 260 mm</text>
                    </g>
                  )}

                  {/* Core specification badges */}
                  <text x="260" y="180" fill="#94a3b8" fontSize="12" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                    HIGH-EFFICIENCY EXTENDED MATRIX CORE
                  </text>
                  <text x="260" y="200" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    22 FPI · Extruded Dual Microchannel Baffles · Aluminium Al-3003
                  </text>
                </g>
              ) : unitCount === 2 ? (
                /* COMBY 2-UNIT DUAL CIRCUIT CORE SCHEMATIC */
                <g transform="translate(80, 55)">
                  {/* Outer Frame Assembly */}
                  <rect x="40" y="30" width="450" height="340" rx="8" fill="#070c18" stroke="#a855f7" strokeWidth="2" strokeDasharray="8 4"/>

                  {/* Sub-Unit 1: Water Radiator Core (Top) */}
                  <g opacity={activeCircuit === 'c2' ? 0.35 : 1}>
                    <rect x="70" y="45" width="390" height="135" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5"/>
                    <text x="80" y="65" fill="#38bdf8" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                      CIRCUIT 1: WATER RADIATOR CORE (Aluminium)
                    </text>
                    <text x="80" y="80" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      50/50 Water-Glycol · Proof Pressure: 4.0 Bar · Operating: 12-35 LPM
                    </text>
                    
                    {/* C1 Ports */}
                    <rect x="15" y="55" width="55" height="24" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
                    <text x="25" y="71" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">C1-IN</text>
                    <rect x="460" y="145" width="55" height="24" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
                    <text x="470" y="161" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">C1-OUT</text>

                    {showVectors && (
                      <path d="M 75 70 Q 260 70 450 155" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="5 3" markerEnd="url(#flow-arrow-sky)"/>
                    )}
                  </g>

                  {/* Thermal Separation Baffle */}
                  <line x1="45" y1="195" x2="485" y2="195" stroke="#a855f7" strokeWidth="2"/>
                  <text x="260" y="193" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    ISOLATION THERMAL BARRIER &amp; INTER-CORE MOUNTING PLATE
                  </text>

                  {/* Sub-Unit 2: Engine Oil Cooler Core (Bottom) */}
                  <g opacity={activeCircuit === 'c1' ? 0.35 : 1}>
                    <rect x="70" y="210" width="390" height="145" rx="4" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5"/>
                    <text x="80" y="230" fill="#fbbf24" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                      CIRCUIT 2: ENGINE OIL COOLER CORE (High Pressure)
                    </text>
                    <text x="80" y="245" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      Mobil 1 Racing 0W-40 · Proof Pressure: 16.0 Bar · Operating: 15-40 LPM
                    </text>

                    {/* C2 Ports */}
                    <rect x="15" y="225" width="55" height="24" rx="3" fill="#d97706" stroke="#fbbf24" strokeWidth="1"/>
                    <text x="25" y="241" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">C2-IN</text>
                    <rect x="460" y="320" width="55" height="24" rx="3" fill="#d97706" stroke="#fbbf24" strokeWidth="1"/>
                    <text x="470" y="336" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">C2-OUT</text>

                    {showVectors && (
                      <path d="M 75 240 Q 260 240 450 330" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 3" markerEnd="url(#flow-arrow-amber)"/>
                    )}
                  </g>

                  {/* Overall Combi Dimensions */}
                  {showDimensions && (
                    <g>
                      <line x1="70" y1="20" x2="460" y2="20" stroke="#facc15" strokeWidth="1"/>
                      <text x="265" y="15" fill="#facc15" fontSize="10" fontFamily="monospace" textAnchor="middle">OVERALL WIDTH = 480 mm ±0.5</text>
                      <line x1="530" y1="45" x2="530" y2="355" stroke="#facc15" strokeWidth="1"/>
                      <text x="540" y="200" fill="#facc15" fontSize="10" fontFamily="monospace" transform="rotate(90, 540, 200)" textAnchor="middle">STACK HEIGHT = 310 mm</text>
                    </g>
                  )}
                </g>
              ) : (
                /* COMBY 3-UNIT TRIPLE CIRCUIT CORE SCHEMATIC */
                <g transform="translate(60, 45)">
                  {/* Outer Frame Assembly */}
                  <rect x="30" y="25" width="480" height="360" rx="8" fill="#070c18" stroke="#a855f7" strokeWidth="2" strokeDasharray="8 4"/>

                  {/* Core 1: Water Radiator */}
                  <g opacity={activeCircuit !== 'all' && activeCircuit !== 'c1' ? 0.3 : 1}>
                    <rect x="60" y="35" width="420" height="95" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5"/>
                    <text x="70" y="55" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      CORE 1: WATER RADIATOR (C1) · 4.0 Bar Max · Coolant 50/50
                    </text>
                    <rect x="10" y="45" width="50" height="20" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
                    <text x="18" y="59" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C1-IN</text>
                    <rect x="480" y="100" width="50" height="20" rx="2" fill="#0284c7" stroke="#38bdf8" strokeWidth="1"/>
                    <text x="486" y="114" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C1-OUT</text>
                    {showVectors && <line x1="60" y1="55" x2="480" y2="110" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#flow-arrow-sky)"/>}
                  </g>

                  {/* Core 2: Engine Oil Cooler */}
                  <g opacity={activeCircuit !== 'all' && activeCircuit !== 'c2' ? 0.3 : 1}>
                    <rect x="60" y="145" width="420" height="95" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5"/>
                    <text x="70" y="165" fill="#fbbf24" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      CORE 2: ENGINE OIL COOLER (C2) · 16.0 Bar Max · Racing Oil
                    </text>
                    <rect x="10" y="155" width="50" height="20" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="1"/>
                    <text x="18" y="169" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C2-IN</text>
                    <rect x="480" y="210" width="50" height="20" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="1"/>
                    <text x="486" y="224" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C2-OUT</text>
                    {showVectors && <line x1="60" y1="165" x2="480" y2="220" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#flow-arrow-amber)"/>}
                  </g>

                  {/* Core 3: Gearbox / Intercooler */}
                  <g opacity={activeCircuit !== 'all' && activeCircuit !== 'c3' ? 0.3 : 1}>
                    <rect x="60" y="255" width="420" height="110" rx="3" fill="#0f172a" stroke="#34d399" strokeWidth="1.5"/>
                    <text x="70" y="275" fill="#34d399" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      CORE 3: GEARBOX / E-MOTOR COOLER (C3) · 10.0 Bar Max · Hydraulic ATF
                    </text>
                    <rect x="10" y="270" width="50" height="20" rx="2" fill="#059669" stroke="#34d399" strokeWidth="1"/>
                    <text x="18" y="284" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C3-IN</text>
                    <rect x="480" y="335" width="50" height="20" rx="2" fill="#059669" stroke="#34d399" strokeWidth="1"/>
                    <text x="486" y="349" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="bold">C3-OUT</text>
                    {showVectors && <line x1="60" y1="280" x2="480" y2="345" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 2" markerEnd="url(#flow-arrow-emerald)"/>}
                  </g>

                  {/* Stack Dimensions */}
                  {showDimensions && (
                    <g>
                      <line x1="60" y1="15" x2="480" y2="15" stroke="#facc15" strokeWidth="1"/>
                      <text x="270" y="10" fill="#facc15" fontSize="10" fontFamily="monospace" textAnchor="middle">TOTAL WIDTH = 520 mm</text>
                      <line x1="545" y1="35" x2="545" y2="365" stroke="#facc15" strokeWidth="1"/>
                      <text x="555" y="200" fill="#facc15" fontSize="10" fontFamily="monospace" transform="rotate(90, 555, 200)" textAnchor="middle">TOTAL HEIGHT = 330 mm</text>
                    </g>
                  )}
                </g>
              )}

              {/* Watermark / QA Stamp in top right */}
              <g transform="translate(710, 35)">
                <rect width="150" height="60" rx="4" fill="#070c18" stroke="#10b981" strokeWidth="1.5" opacity="0.9"/>
                <text x="75" y="22" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BICESTER WORKBENCH</text>
                <text x="75" y="37" fill="#ffffff" fontSize="9" fontFamily="monospace" textAnchor="middle">QA VERIFIED RIG-04</text>
                <text x="75" y="50" fill="#a7f3d0" fontSize="8" fontFamily="monospace" textAnchor="middle">ISO 9001 · AS9100</text>
              </g>
            </svg>
          </div>
        </div>
        )}

        {/* Bottom Specs & Instructions Footer */}
        <div className="bg-neutral-950 p-3 sm:p-4 border-t border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Info className="h-4 w-4 text-sky-400 shrink-0" />
            <span>
              <strong>Operator Flow Rig Coupling Instruction:</strong> Ensure test hoses match port dash sizes (C1: -16 AN, C2: -12 AN, C3: -10 AN). Purge all air before recording 5-point calibration frequencies.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer self-end md:self-auto"
          >
            Return to Flow Testing
          </button>
        </div>
      </div>
    </div>
  );
};
