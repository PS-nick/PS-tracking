import React, { useState } from 'react';
import { 
  Truck, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Send, 
  Calendar,
  ExternalLink,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { ServiceUnit, DeliveryInfo, DispatchStatus, DeliveryPriority } from '../types/process';
import { getUnitDeliveryStatus } from '../utils/delivery';

interface DeliveryTrackingModalProps {
  unit: ServiceUnit;
  isOpen: boolean;
  onClose: () => void;
  onUpdateUnit: (updater: (prev: ServiceUnit) => ServiceUnit, logAction?: string) => void;
}

export const DeliveryTrackingModal: React.FC<DeliveryTrackingModalProps> = ({
  unit,
  isOpen,
  onClose,
  onUpdateUnit,
}) => {
  const currentStatus = getUnitDeliveryStatus(unit);

  const [targetDate, setTargetDate] = useState(() => {
    if (unit.delivery?.targetDeliveryDate) {
      return String(unit.delivery.targetDeliveryDate).slice(0, 16);
    }
    // Default 48h from creation
    const baseTime = unit.createdAt ? new Date(unit.createdAt).getTime() : Date.now();
    const t = new Date(baseTime + 48 * 60 * 60 * 1000);
    return t.toISOString().slice(0, 16);
  });

  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatus>(() => {
    return unit.delivery?.dispatchStatus || (
      unit.overallStatus === 'completed' ? 'delivered' : 'in_depot'
    );
  });

  const [actualDateInput, setActualDateInput] = useState(() => {
    if (unit.delivery?.actualDeliveryDate) {
      return String(unit.delivery.actualDeliveryDate).slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });

  const [carrier, setCarrier] = useState(unit.delivery?.carrier || 'DHL AeroExpress');
  const [trackingNumber, setTrackingNumber] = useState(
    unit.delivery?.trackingNumber || `TRK-EXP-${unit.serialNumber.replace('SN-', '')}`
  );
  const [destinationCity, setDestinationCity] = useState(
    unit.delivery?.destinationCity || 'London Heathrow Aero Hub'
  );
  const [priority, setPriority] = useState<DeliveryPriority>(
    unit.delivery?.priority || 'standard'
  );
  const [shippingNotes, setShippingNotes] = useState(
    unit.delivery?.shippingNotes || ''
  );

  // Live on-time delivery evaluation based on form inputs
  const targetEpoch = new Date(targetDate).getTime();
  const isMarkedDelivered = dispatchStatus === 'delivered';
  const evalEpoch = isMarkedDelivered ? new Date(actualDateInput).getTime() : Date.now();
  const liveIsOnTime = evalEpoch <= targetEpoch;
  const varianceHours = Math.max(1, Math.round(Math.abs(evalEpoch - targetEpoch) / (1000 * 60 * 60)));

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();

    const isNowDelivered = dispatchStatus === 'delivered';
    const nowIso = new Date().toISOString();

    const deliveryPayload: DeliveryInfo = {
      targetDeliveryDate: new Date(targetDate).toISOString(),
      actualDeliveryDate: isNowDelivered ? new Date(actualDateInput).toISOString() : unit.delivery?.actualDeliveryDate,
      dispatchStatus,
      priority,
      carrier,
      trackingNumber,
      destinationCity,
      shippingNotes,
    };

    onUpdateUnit((prev) => ({
      ...prev,
      delivery: deliveryPayload,
      overallStatus: isNowDelivered ? 'completed' : prev.overallStatus,
      isArchived: isNowDelivered ? true : (dispatchStatus === 'in_depot' ? false : prev.isArchived),
      archivedAt: isNowDelivered ? (prev.archivedAt || nowIso) : (dispatchStatus === 'in_depot' ? undefined : prev.archivedAt),
    }), isNowDelivered 
      ? `Unit DELIVERED to customer & archived into past historical records` 
      : `Updated delivery logistics & tracking: Status is ${dispatchStatus.toUpperCase()}`);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">
                  Delivery Logistics &amp; SLA Tracking
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${currentStatus.badgeBg} ${currentStatus.badgeText} ${currentStatus.badgeBorder} shrink-0`}>
                  {currentStatus.label}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 truncate">
                {unit.serialNumber} &middot; WO #{unit.workOrderNumber} &middot; {unit.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSaveDelivery} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* On-Time Delivery Tracking Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
            liveIsOnTime 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                liveIsOnTime ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {liveIsOnTime ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {liveIsOnTime ? 'On-Time Delivery Status: Conforming' : 'Delivery SLA Exception: Overdue / Delayed'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    liveIsOnTime
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                  }`}>
                    {isMarkedDelivered
                      ? (liveIsOnTime ? `Delivered On-Time (${varianceHours}h early)` : `Delivered Late (${varianceHours}h overdue)`)
                      : (liveIsOnTime ? `On Track (${varianceHours}h remaining)` : `Overdue by ${varianceHours}h`)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Target SLA: <strong className="text-neutral-200 font-mono">{new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  {isMarkedDelivered && (
                    <> &middot; Actual Delivery: <strong className="text-white font-mono">{new Date(actualDateInput).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`text-xs font-bold font-mono block ${liveIsOnTime ? 'text-emerald-400' : 'text-rose-400'}`}>
                {liveIsOnTime ? '100% OTD' : '0% OTD'}
              </span>
              <span className="text-[10px] text-neutral-400 font-sans">
                {liveIsOnTime ? 'SLA Compliant' : 'SLA Breached'}
              </span>
            </div>
          </div>

          {/* Overdue Alert Banner if overdue */}
          {!liveIsOnTime && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-200 block">
                  Delivery SLA Exception Alert:
                </strong>
                <span>
                  This delivery is {varianceHours} hours past the promised customer delivery SLA commitment.
                  Expedite courier dispatch and priority clearance immediately.
                </span>
              </div>
            </div>
          )}

          {/* Logistics Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Target Delivery SLA Date */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                <span>Target SLA Delivery Date &amp; Time</span>
              </label>
              <input
                type="datetime-local"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>

            {/* Delivery Priority */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Dispatch Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DeliveryPriority)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 font-sans focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                <option value="standard">Standard Priority (48h Turnaround)</option>
                <option value="expedited">Expedited Priority (24h Turnaround)</option>
                <option value="aog_critical">AOG Critical (Immediate Aircraft On Ground)</option>
              </select>
            </div>

            {/* Actual Delivery Date (Only visible when Delivered) */}
            {dispatchStatus === 'delivered' && (
              <div className="sm:col-span-2">
                <label className="block text-neutral-300 font-semibold mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Actual Customer Delivery Date &amp; Time (Signed POD)</span>
                </label>
                <input
                  type="datetime-local"
                  value={actualDateInput}
                  onChange={(e) => setActualDateInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>
            )}

            {/* Dispatch Status */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Logistics &amp; Delivery Status
              </label>
              <select
                value={dispatchStatus}
                onChange={(e) => setDispatchStatus(e.target.value as DispatchStatus)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 font-sans focus:outline-none focus:border-amber-500/50 cursor-pointer font-medium"
              >
                <option value="in_depot">In Depot (Undergoing Overhaul)</option>
                <option value="ready_for_dispatch">Ready for Dispatch (QA Passed &amp; Packed)</option>
                <option value="dispatched">Dispatched / In Transit</option>
                <option value="delivered">Delivered to Customer Hub (Archive Record)</option>
              </select>
            </div>

            {/* Archival Notice when Delivered */}
            {dispatchStatus === 'delivered' && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-emerald-200">Historical Archival on Delivery</span>
                  Marking this unit as delivered automatically archives the past record into historical archives with full technical certificates, pressure test logs, and flow curves preserved.
                </div>
              </div>
            )}

            {/* Courier / Carrier */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-sky-400" />
                <span>Logistics Carrier</span>
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. DHL AeroExpress, FedEx Priority"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Tracking Number */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Carrier Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. DHL-984210492"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Destination Hub / City */}
            <div>
              <label className="block text-neutral-300 font-semibold mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                <span>Destination Airport / Fleet Hub</span>
              </label>
              <input
                type="text"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="e.g. Derby, UK (Rolls-Royce Plant)"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Shipping Notes */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1 text-xs">
              Delivery Logistics &amp; Courier Handover Notes
            </label>
            <textarea
              rows={2}
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              placeholder="e.g. Temperature controlled shipping container #4, signed POD required upon delivery..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>

          </div>

          {/* Pinned Modal Actions Footer */}
          <div className="flex items-center justify-between p-4 border-t border-neutral-800 bg-neutral-950/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.01] ${
                isMarkedDelivered
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
              }`}
            >
              <PackageCheck className="h-4 w-4 stroke-[2.5]" />
              <span>{isMarkedDelivered ? 'Deliver & Archive to History' : 'Update Delivery & SLA Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
