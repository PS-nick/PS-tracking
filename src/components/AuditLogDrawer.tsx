import React from 'react';
import { 
  X, 
  History, 
  Clock, 
  User, 
  FileText, 
  Camera, 
  CheckCircle2, 
  Download, 
  Activity 
} from 'lucide-react';
import { ActivityEntry, StepId } from '../types/process';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityEntry[];
  unitSerialNumber: string;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
  unitSerialNumber,
}) => {
  if (!isOpen) return null;

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Audit_Log_${unitSerialNumber}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Sort logs in reverse chronological order
  const sortedLogs = [...logs].reverse();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-neutral-100">
                Real-Time Audit Stream
              </h3>
              <p className="text-[11px] font-mono text-neutral-400">
                Unit {unitSerialNumber} · {logs.length} logged entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportLogsAsJson}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md hover:bg-neutral-800 transition-colors"
              title="Export Log as JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md hover:bg-neutral-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Real-time Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-500 font-mono">
              No entries logged yet for this unit.
            </div>
          ) : (
            sortedLogs.map((entry, index) => (
              <div
                key={entry.id || index}
                className="relative pl-6 pb-3 border-l-2 border-neutral-800 last:border-transparent group"
              >
                {/* Timeline node */}
                <div className="absolute -left-[7px] top-0.5 h-3 w-3 rounded-full bg-neutral-950 border-2 border-amber-400 group-hover:scale-125 transition-transform" />

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-neutral-500" />
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-[10px] text-neutral-300 uppercase">
                      {entry.stepId}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-neutral-200">
                    {entry.action}
                  </p>

                  {entry.details && (
                    <p className="text-[11px] text-neutral-400 bg-neutral-950/70 p-2 rounded border border-neutral-800/80 font-mono">
                      {entry.details}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="h-2.5 w-2.5" />
                      {entry.user}
                    </span>
                    {entry.mediaCount && (
                      <span className="flex items-center gap-1 text-amber-400/80">
                        <Camera className="h-2.5 w-2.5" />
                        {entry.mediaCount} media attached
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 text-center text-[10px] font-mono text-neutral-500">
          Timestamped live log compliant with ISO 9001 / AS9100 quality traceability
        </div>
      </div>
    </div>
  );
};
