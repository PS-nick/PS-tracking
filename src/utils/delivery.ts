import { ServiceUnit, DeliveryInfo, DispatchStatus, DeliveryPriority } from '../types/process';

export interface CalculatedDeliveryStatus {
  status: 'overdue' | 'due_today' | 'on_track' | 'ready_to_ship' | 'in_transit' | 'delivered';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  isOnTime: boolean; // Delivery on-time tracking flag
  onTimeCategory: 'delivered_on_time' | 'delivered_late' | 'on_track_on_time' | 'at_risk' | 'overdue';
  onTimeLabel: string;
  onTimeBadgeBg: string;
  onTimeBadgeText: string;
  onTimeBadgeBorder: string;
  onTimeDotColor: string;
  hoursOverdue?: number;
  daysOverdue?: number;
  hoursRemaining?: number;
  daysRemaining?: number;
  targetDate: Date;
  targetFormatted: string;
  actualDeliveryDate?: Date;
  actualDeliveryFormatted?: string;
  carrier?: string;
  trackingNumber?: string;
  destinationCity?: string;
  priority: DeliveryPriority;
}

/**
 * Calculates current delivery & SLA timeline status for a service unit,
 * including on-time delivery tracking and SLA compliance.
 */
export function getUnitDeliveryStatus(
  unit: ServiceUnit,
  referenceDate: Date = new Date()
): CalculatedDeliveryStatus {
  const refTime = referenceDate.getTime();

  // If no delivery object, generate default based on unit creation + 48h SLA
  const createdTime = new Date(unit.createdAt).getTime();
  const defaultTargetTime = createdTime + 48 * 60 * 60 * 1000;
  const targetDate = unit.delivery?.targetDeliveryDate 
    ? new Date(unit.delivery.targetDeliveryDate) 
    : new Date(defaultTargetTime);

  const targetTime = targetDate.getTime();
  const dispatchStatus = unit.delivery?.dispatchStatus || (
    unit.overallStatus === 'completed' ? 'delivered' : 'in_depot'
  );
  const priority = unit.delivery?.priority || 'standard';

  // Format target date e.g. "Oct 01, 14:00"
  const targetFormatted = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const actualDate = unit.delivery?.actualDeliveryDate
    ? new Date(unit.delivery.actualDeliveryDate)
    : undefined;
  const actualDeliveryFormatted = actualDate
    ? actualDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined;

  // Case 1: Delivered
  if (dispatchStatus === 'delivered') {
    // Check if delivered before or after promised target SLA date
    const actualTime = actualDate ? actualDate.getTime() : refTime;
    const isDeliveredOnTime = actualTime <= targetTime;

    return {
      status: 'delivered',
      label: isDeliveredOnTime ? 'DELIVERED ON-TIME' : 'DELIVERED LATE',
      badgeBg: isDeliveredOnTime ? 'bg-emerald-500/15' : 'bg-rose-500/15',
      badgeText: isDeliveredOnTime ? 'text-emerald-400' : 'text-rose-400',
      badgeBorder: isDeliveredOnTime ? 'border-emerald-500/40' : 'border-rose-500/40',
      dotColor: isDeliveredOnTime ? 'bg-emerald-400' : 'bg-rose-400',
      isOverdue: !isDeliveredOnTime,
      isDueSoon: false,
      isOnTime: isDeliveredOnTime,
      onTimeCategory: isDeliveredOnTime ? 'delivered_on_time' : 'delivered_late',
      onTimeLabel: isDeliveredOnTime ? '100% On-Time SLA Met' : 'Late Delivery Exception',
      onTimeBadgeBg: isDeliveredOnTime ? 'bg-emerald-500/15' : 'bg-rose-500/15',
      onTimeBadgeText: isDeliveredOnTime ? 'text-emerald-300' : 'text-rose-300',
      onTimeBadgeBorder: isDeliveredOnTime ? 'border-emerald-500/40' : 'border-rose-500/40',
      onTimeDotColor: isDeliveredOnTime ? 'bg-emerald-400' : 'bg-rose-500',
      targetDate,
      targetFormatted,
      actualDeliveryDate: actualDate,
      actualDeliveryFormatted,
      carrier: unit.delivery?.carrier || 'DHL AeroExpress',
      trackingNumber: unit.delivery?.trackingNumber || `EXP-${unit.serialNumber.replace('SN-', '')}`,
      destinationCity: unit.delivery?.destinationCity || 'Client Hub',
      priority,
    };
  }

  // Case 2: In Transit / Dispatched
  if (dispatchStatus === 'dispatched') {
    const isLateInTransit = refTime > targetTime;
    return {
      status: 'in_transit',
      label: isLateInTransit ? 'IN TRANSIT (DELAYED)' : 'IN TRANSIT (ON-TIME)',
      badgeBg: isLateInTransit ? 'bg-amber-500/15' : 'bg-sky-500/10',
      badgeText: isLateInTransit ? 'text-amber-400' : 'text-sky-400',
      badgeBorder: isLateInTransit ? 'border-amber-500/40' : 'border-sky-500/30',
      dotColor: isLateInTransit ? 'bg-amber-400' : 'bg-sky-400',
      isOverdue: isLateInTransit,
      isDueSoon: !isLateInTransit && targetTime - refTime <= 24 * 3600 * 1000,
      isOnTime: !isLateInTransit,
      onTimeCategory: isLateInTransit ? 'overdue' : 'on_track_on_time',
      onTimeLabel: isLateInTransit ? 'Courier Delay Alert' : 'On-Schedule Transit',
      onTimeBadgeBg: isLateInTransit ? 'bg-amber-500/20' : 'bg-sky-500/15',
      onTimeBadgeText: isLateInTransit ? 'text-amber-300' : 'text-sky-300',
      onTimeBadgeBorder: isLateInTransit ? 'border-amber-500/40' : 'border-sky-500/30',
      onTimeDotColor: isLateInTransit ? 'bg-amber-400' : 'bg-sky-400',
      targetDate,
      targetFormatted,
      carrier: unit.delivery?.carrier || 'DHL Trackside AeroExpress',
      trackingNumber: unit.delivery?.trackingNumber || `TRK-${unit.workOrderNumber}`,
      destinationCity: unit.delivery?.destinationCity || 'Regional Depot',
      priority,
    };
  }

  // Case 3: Completed & Ready for Dispatch
  if (unit.overallStatus === 'completed' || unit.signOff?.qaDisposition === 'APPROVED') {
    const isPastTarget = refTime > targetTime;
    return {
      status: 'ready_to_ship',
      label: isPastTarget ? 'DISPATCH DELAYED' : 'READY (ON-TIME)',
      badgeBg: isPastTarget ? 'bg-rose-500/15' : 'bg-teal-500/10',
      badgeText: isPastTarget ? 'text-rose-400' : 'text-teal-400',
      badgeBorder: isPastTarget ? 'border-rose-500/30' : 'border-teal-500/30',
      dotColor: isPastTarget ? 'bg-rose-400' : 'bg-teal-400',
      isOverdue: isPastTarget,
      isDueSoon: !isPastTarget && targetTime - refTime <= 24 * 3600 * 1000,
      isOnTime: !isPastTarget,
      onTimeCategory: isPastTarget ? 'overdue' : 'on_track_on_time',
      onTimeLabel: isPastTarget ? 'Overdue for Dispatch' : 'Ready On Schedule',
      onTimeBadgeBg: isPastTarget ? 'bg-rose-500/15' : 'bg-teal-500/15',
      onTimeBadgeText: isPastTarget ? 'text-rose-300' : 'text-teal-300',
      onTimeBadgeBorder: isPastTarget ? 'border-rose-500/30' : 'border-teal-500/30',
      onTimeDotColor: isPastTarget ? 'bg-rose-400' : 'bg-teal-400',
      targetDate,
      targetFormatted,
      carrier: unit.delivery?.carrier,
      trackingNumber: unit.delivery?.trackingNumber,
      destinationCity: unit.delivery?.destinationCity,
      priority,
    };
  }

  // Case 4: Still in depot - check if past target delivery deadline (OVERDUE)
  if (refTime > targetTime) {
    const diffMs = refTime - targetTime;
    const hoursOverdue = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    const daysOverdue = Math.floor(hoursOverdue / 24);

    return {
      status: 'overdue',
      label: daysOverdue >= 1 ? `OVERDUE (${daysOverdue}d)` : `OVERDUE (${hoursOverdue}h)`,
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/40',
      dotColor: 'bg-rose-500',
      isOverdue: true,
      isDueSoon: false,
      isOnTime: false,
      onTimeCategory: 'overdue',
      onTimeLabel: `Past SLA by ${hoursOverdue}h`,
      onTimeBadgeBg: 'bg-rose-500/20',
      onTimeBadgeText: 'text-rose-300',
      onTimeBadgeBorder: 'border-rose-500/50',
      onTimeDotColor: 'bg-rose-500',
      hoursOverdue,
      daysOverdue,
      targetDate,
      targetFormatted,
      carrier: unit.delivery?.carrier,
      trackingNumber: unit.delivery?.trackingNumber,
      destinationCity: unit.delivery?.destinationCity,
      priority,
    };
  }

  // Case 5: Due within 24 hours (DUE TODAY / SOON)
  const diffMs = targetTime - refTime;
  const hoursRemaining = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (hoursRemaining <= 24) {
    return {
      status: 'due_today',
      label: `DUE IN ${hoursRemaining}h`,
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/40',
      dotColor: 'bg-amber-400',
      isOverdue: false,
      isDueSoon: true,
      isOnTime: true,
      onTimeCategory: 'at_risk',
      onTimeLabel: `Due in ${hoursRemaining}h (On-Time)`,
      onTimeBadgeBg: 'bg-amber-500/20',
      onTimeBadgeText: 'text-amber-300',
      onTimeBadgeBorder: 'border-amber-500/40',
      onTimeDotColor: 'bg-amber-400',
      hoursRemaining,
      targetDate,
      targetFormatted,
      carrier: unit.delivery?.carrier,
      trackingNumber: unit.delivery?.trackingNumber,
      destinationCity: unit.delivery?.destinationCity,
      priority,
    };
  }

  // Case 6: On Track
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return {
    status: 'on_track',
    label: `DUE IN ${daysRemaining}d`,
    badgeBg: 'bg-neutral-800',
    badgeText: 'text-neutral-300',
    badgeBorder: 'border-neutral-700',
    dotColor: 'bg-neutral-400',
    isOverdue: false,
    isDueSoon: false,
    isOnTime: true,
    onTimeCategory: 'on_track_on_time',
    onTimeLabel: 'On Schedule (100% OTD)',
    onTimeBadgeBg: 'bg-emerald-500/10',
    onTimeBadgeText: 'text-emerald-400',
    onTimeBadgeBorder: 'border-emerald-500/30',
    onTimeDotColor: 'bg-emerald-400',
    daysRemaining,
    hoursRemaining,
    targetDate,
    targetFormatted,
    carrier: unit.delivery?.carrier,
    trackingNumber: unit.delivery?.trackingNumber,
    destinationCity: unit.delivery?.destinationCity,
    priority,
  };
}

/**
 * Calculates aggregate On-Time Delivery (OTD) telemetry across the entire depot fleet
 */
export function calculateFleetOnTimeRate(units: ServiceUnit[]) {
  if (units.length === 0) {
    return {
      onTimeRatePercent: 100,
      onTimeCount: 0,
      overdueCount: 0,
      deliveredOnTimeCount: 0,
      deliveredLateCount: 0,
      activeOnTrackCount: 0,
      totalCount: 0,
    };
  }

  let onTimeCount = 0;
  let overdueCount = 0;
  let deliveredOnTimeCount = 0;
  let deliveredLateCount = 0;
  let activeOnTrackCount = 0;

  for (const u of units) {
    const status = getUnitDeliveryStatus(u);
    if (status.isOnTime) {
      onTimeCount++;
      if (status.status === 'delivered') {
        deliveredOnTimeCount++;
      } else {
        activeOnTrackCount++;
      }
    } else {
      overdueCount++;
      if (status.status === 'delivered') {
        deliveredLateCount++;
      }
    }
  }

  const onTimeRatePercent = Math.round((onTimeCount / units.length) * 100);

  return {
    onTimeRatePercent,
    onTimeCount,
    overdueCount,
    deliveredOnTimeCount,
    deliveredLateCount,
    activeOnTrackCount,
    totalCount: units.length,
  };
}
