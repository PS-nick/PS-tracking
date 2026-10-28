import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  Plus, 
  Check, 
  ShieldCheck, 
  Thermometer, 
  Gauge, 
  Droplets, 
  Activity, 
  Info 
} from 'lucide-react';
import { CustomCoolerType } from '../types/process';
import { saveCustomCoolerType } from '../constants/workbench';
import { audioAlert } from '../utils/audioAlert';

interface CustomCoolerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newCooler: CustomCoolerType) => void;
}

export const CustomCoolerModal: React.FC<CustomCoolerModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [baseType, setBaseType] = useState<'water_radiator' | 'oil_cooler' | 'intercooler' | 'heat_exchanger'>('water_radiator');
  const [label, setLabel] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [defaultMedium, setDefaultMedium] = useState<string>('Deionized Water (DI Water)');
  const [minLpm, setMinLpm] = useState<number>(15);
  const [maxLpm, setMaxLpm] = useState<number>(45);
  const [proofPressureBar, setProofPressureBar] = useState<number>(4.0);
  const [holdTimeSec, setHoldTimeSec] = useState<number>(60);
  const [fittingType, setFittingType] = useState<string>('Dash 08 JIC (-8 AN)');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectBaseType = (type: 'water_radiator' | 'oil_cooler' | 'intercooler' | 'heat_exchanger') => {
    setBaseType(type);
    if (type === 'oil_cooler') {
      setDefaultMedium('Engine Oil / Hydro Calibration Fluid');
      setProofPressureBar(16.0);
      setMinLpm(10);
      setMaxLpm(35);
      if (!code || code === 'RAD' || code === 'INT' || code === 'HEX') setCode('OIL');
    } else if (type === 'intercooler') {
      setDefaultMedium('Clean Compressed Air / DI Water Flush');
      setProofPressureBar(6.0);
      setMinLpm(20);
      setMaxLpm(60);
      if (!code || code === 'RAD' || code === 'OIL' || code === 'HEX') setCode('INT');
    } else if (type === 'heat_exchanger') {
      setDefaultMedium('Deionized Water (DI Water)');
      setProofPressureBar(6.0);
      setMinLpm(15);
      setMaxLpm(40);
      if (!code || code === 'RAD' || code === 'OIL' || code === 'INT') setCode('HEX');
    } else {
      setDefaultMedium('Deionized Water (DI Water)');
      setProofPressureBar(4.0);
      setMinLpm(15);
      setMaxLpm(45);
      if (!code || code === 'OIL' || code === 'INT' || code === 'HEX') setCode('RAD');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setValidationError('Please provide a cooler type name / designation.');
      return;
    }

    const cleanCode = (code.trim() || cleanLabel.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const id = `custom_${cleanCode.toLowerCase()}_${Date.now()}`;

    const newCooler: CustomCoolerType = {
      id,
      label: cleanLabel,
      code: cleanCode,
      baseType,
      description: description.trim() || `${cleanLabel} - Custom motorsport heat exchanger assembly (${baseType.replace('_', ' ')}).`,
      defaultMedium,
      defaultFlowTargetMinLpm: Number(minLpm) || 15,
      defaultFlowTargetMaxLpm: Number(maxLpm) || 45,
      defaultPressureTargetBar: Number(proofPressureBar) || 6.0,
      defaultPressureHoldTimeSec: Number(holdTimeSec) || 60,
      createdAt: new Date().toISOString(),
    };

    saveCustomCoolerType(newCooler);
    audioAlert.playClick();
    onSave(newCooler);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-5 flex items-center justify-center animate-fadeIn no-print">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-950 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider flex items-center gap-2">
                <span>Define Custom Cooler Type</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Save for Future Units
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Register a new heat exchanger category with custom flow, pressure, and media specifications
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300">
              {validationError}
            </div>
          )}

          {/* Type of Cooler Selection */}
          <div className="p-3 bg-neutral-950/90 rounded-xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-neutral-200 block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Thermometer className="h-3.5 w-3.5 text-amber-400" />
                <span>Select Type of Cooler (Base Matrix Classification) *</span>
              </label>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                {baseType.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Assign the base thermodynamic classification to establish default proof pressure, flush dwell times, and test media.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { id: 'water_radiator', label: 'Water Radiator', spec: '~4.0 Bar · DI Water' },
                { id: 'oil_cooler', label: 'Oil Cooler', spec: '~16.0 Bar · Oil Flush' },
                { id: 'intercooler', label: 'Intercooler', spec: '~6.0 Bar · Charge Air' },
                { id: 'heat_exchanger', label: 'Heat Exchanger', spec: '~6.0 Bar · Auxiliary' },
              ].map((opt) => {
                const isSel = baseType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectBaseType(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500/40 shadow-xs'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className="text-[9.5px] font-mono text-neutral-400 block mt-0.5">{opt.spec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-neutral-300 block text-xs font-medium mb-1">
                Cooler Type / Matrix Name *
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setValidationError(null);
                  if (!code) {
                    setCode(e.target.value.slice(0, 4).toUpperCase());
                  }
                }}
                placeholder="e.g. ERS Battery Chiller Plate / Diff Radiator"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-neutral-300 block text-xs font-medium mb-1">
                Code / Prefix *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. ERS / DIF"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono uppercase text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-neutral-300 block text-xs font-medium mb-1">
              Description &amp; Application Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Direct-chilled battery cold plate with brazed micro-channels for Formula 1 / Hypercar ERS module."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 resize-none font-sans"
            />
          </div>

          {/* Primary Medium & Fitting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-neutral-300 block font-medium mb-1 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-teal-400" />
                <span>Primary Test &amp; Calibration Medium</span>
              </label>
              <select
                value={defaultMedium}
                onChange={(e) => setDefaultMedium(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Deionized Water (DI Water)">Deionized Water (55°C DI Water)</option>
                <option value="Water / Glycol (50/50)">Water / Glycol (50/50 Racing Coolant)</option>
                <option value="Calibration Oil ISO VG 32">Calibration Oil ISO VG 32</option>
                <option value="Synthetic Ester Fluid">Synthetic Dielectric / Ester Fluid</option>
                <option value="Refrigerant Gas / Air">Air / Dry Nitrogen / Gas</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-300 block font-medium mb-1">
                Port Fitting Standard
              </label>
              <input
                type="text"
                value={fittingType}
                onChange={(e) => setFittingType(e.target.value)}
                placeholder="e.g. Dash 08 JIC (-8 AN) / Wiggins W900"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Test Targets: Flow & Proof Pressure */}
          <div className="p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-3">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
              Default Inspection Parameters:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Min Flow (LPM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={minLpm}
                  onChange={(e) => setMinLpm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Max Flow (LPM)</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxLpm}
                  onChange={(e) => setMaxLpm(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Proof Bar</label>
                <input
                  type="number"
                  step="0.1"
                  value={proofPressureBar}
                  onChange={(e) => setProofPressureBar(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Hold Dwell (s)</label>
                <input
                  type="number"
                  value={holdTimeSec}
                  onChange={(e) => setHoldTimeSec(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-100 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Save &amp; Select Cooler Type</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
