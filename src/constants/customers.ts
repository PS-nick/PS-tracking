import { ALL_MOTORSPORT_TEAMS } from './motorsport';

/**
 * Approved motorsport customer teams and constructor partners for depot overhaul.
 */
export const STANDARD_CUSTOMERS = [
  'Red Bull Racing Powertrains',
  'Scuderia Ferrari HP',
  'Mercedes-AMG Petronas F1 Team',
  'McLaren F1 Team',
  'Porsche Penske Motorsport (963)',
  'Ferrari AF Corse (499P)',
  'Toyota Gazoo Racing (GR010)',
  'Team Penske IndyCar',
  'Chip Ganassi Racing',
  'Arrow McLaren IndyCar',
  'Toyota Gazoo Racing WRT (Yaris Rally1)',
  'Hyundai Motorsport (i20 N Rally1)',
  'TAG Heuer Porsche Formula E Team',
  'Jaguar TCS Racing',
  'Manthey EMA (Porsche 911 GT3 R)',
  'Ducati Lenovo Team',
  // Historic & Heritage Motorsport Constructors
  'Classic Team Lotus',
  'Goodwood Revival Heritage Racing',
  'Masters Historic Racing Squad',
  'Ferrari Classiche Technical Depot',
  'Cosworth DFV Heritage Works',
] as const;

export type StandardCustomer = typeof STANDARD_CUSTOMERS[number] | string;
