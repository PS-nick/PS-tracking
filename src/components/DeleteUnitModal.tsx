import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { ServiceUnit } from '../types/process';

interface DeleteUnitModalProps {
  unit: ServiceUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (unitId: string, reason?: string) => Promise<void> | void;
}

export const DeleteUnitModal: React.FC<DeleteUnitModalProps> = ({
  unit,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Wrong Serial / Typo in Unit Identifier');
  const [customNote, setCustomNote] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !unit) return null;

  const reasons = [
    'Wrong Serial / Typo in Unit Identifier',
    'Duplicate Unit Intake Entry',
    'Incorrect Customer or Vehicle Allocation',
    'Wrong Part Number / Matrix Specification',
    'Cancelled Order / Test Intake Scratch',
  ];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const fullReason = customNote.trim() ? `${selectedReason}: ${customNote.trim()}` : selectedReason;
      await onConfirmDelete(unit.id, fullReason);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>Delete Unit (Input Error)</span>
              </h3>
              <p className="text-xs text-rose-300/80">
                Permanently purge incorrectly registered unit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Unit Summary Card */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-neutral-400">Unit To Delete:</span>
              <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/60">
                {unit.serialNumber}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-neutral-300 font-mono text-[11px]">
              <div>
                <span className="text-neutral-500 block">Customer:</span>
                <span className="text-neutral-200 font-sans font-semibold">{unit.customerName}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Model / Part:</span>
                <span className="text-neutral-200 font-sans font-semibold truncate block">
                  {unit.modelName} ({unit.partNumber})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Work Order:</span>
                <span className="text-neutral-200">{unit.workOrderNumber}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Life Cycle:</span>
                <span className="text-neutral-200">Life #{unit.lifeNumber ?? 1}</span>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <strong className="text-rose-300 block font-semibold">Irreversible Action:</strong>
              <span>
                This will immediately remove this unit and all its logged inspection, flow calibration, pressure test, and cleaning records from local depot memory and Cloud Firestore.
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-neutral-300 font-semibold block text-[11px]">
              Select Reason for Purging:
            </label>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === r
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="sr-only"
                  />
                  <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedReason === r ? 'border-rose-400 bg-rose-500' : 'border-neutral-600'
                  }`}>
                    {selectedReason === r && <Check className="h-2.5 w-2.5 text-black stroke-[3]" />}
                  </div>
                  <span className="text-xs">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1">
            <label className="text-neutral-400 block text-[11px]">
              Additional Operator Comment (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Serial typo corrected to SN-8843-HP in new intake"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-500 font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isDeleting ? 'Purging Unit...' : 'Delete Unit Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
