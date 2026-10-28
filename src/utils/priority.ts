import { UnitPriority } from '../types/process';

export interface PriorityConfig {
  value: UnitPriority;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  glowColor: string;
  pulse: boolean;
  description: string;
}

export const PRIORITY_CONFIGS: Record<UnitPriority, PriorityConfig> = {
  emergency: {
    value: 'emergency',
    label: 'EMERGENCY',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    badgeBorder: 'border-rose-500/60',
    dotColor: 'bg-rose-500',
    glowColor: 'shadow-rose-500/30',
    pulse: true,
    description: 'Aircraft On Ground (AOG) & Immediate Expedited Turnaround',
  },
  high: {
    value: 'high',
    label: 'HIGH',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    badgeBorder: 'border-amber-500/50',
    dotColor: 'bg-amber-400',
    glowColor: 'shadow-amber-500/20',
    pulse: false,
    description: 'Critical Overhaul Priority & Accelerated Bench Queue',
  },
  medium: {
    value: 'medium',
    label: 'MEDIUM',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-300',
    badgeBorder: 'border-sky-500/30',
    dotColor: 'bg-sky-400',
    glowColor: 'shadow-sky-500/20',
    pulse: false,
    description: 'Standard Overhaul Production Workflow',
  },
  low: {
    value: 'low',
    label: 'LOW',
    badgeBg: 'bg-neutral-800/90',
    badgeText: 'text-neutral-400',
    badgeBorder: 'border-neutral-700',
    dotColor: 'bg-neutral-500',
    glowColor: 'transparent',
    pulse: false,
    description: 'Routine Scheduled Maintenance Rotation',
  },
};

export function getPriorityConfig(priority?: UnitPriority): PriorityConfig {
  if (!priority || !PRIORITY_CONFIGS[priority]) {
    return PRIORITY_CONFIGS.medium;
  }
  return PRIORITY_CONFIGS[priority];
}
