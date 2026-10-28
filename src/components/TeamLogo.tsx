import React from 'react';

export interface TeamLogoProps {
  teamName?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  showBadgeBorder?: boolean;
}

/**
 * Returns normalized key for a motorsport constructor
 */
export function normalizeTeamKey(name?: string | null): string {
  if (!name) return 'generic';
  const n = name.toLowerCase().trim();

  if (n.includes('ferrari') && (n.includes('af corse') || n.includes('499p'))) return 'ferrari_af_corse';
  if (n.includes('ferrari') && n.includes('classiche')) return 'ferrari_classiche';
  if (n.includes('ferrari')) return 'ferrari';
  if (n.includes('mclaren')) return 'mclaren';
  if (n.includes('mercedes') || n.includes('petronas')) return 'mercedes';
  if (n.includes('red bull') || n.includes('rbpt') || n.includes('powertrains')) return 'redbull';
  if (n.includes('porsche') && (n.includes('penske') || n.includes('963'))) return 'porsche_penske';
  if (n.includes('porsche')) return 'porsche';
  if (n.includes('toyota') || n.includes('gazoo') || n.includes('gr010') || n.includes('yaris')) return 'toyota_gazoo';
  if (n.includes('aston martin')) return 'aston_martin';
  if (n.includes('williams')) return 'williams';
  if (n.includes('alpine')) return 'alpine';
  if (n.includes('sauber') || n.includes('kick')) return 'sauber';
  if (n.includes('haas')) return 'haas';
  if (n.includes('thor')) return 'thor';
  if (n.includes('manthey')) return 'manthey';
  if (n.includes('penske') && n.includes('indy')) return 'penske_indy';
  if (n.includes('penske')) return 'penske_indy';
  if (n.includes('ganassi')) return 'ganassi';
  if (n.includes('lotus')) return 'lotus';
  if (n.includes('ducati')) return 'ducati';
  if (n.includes('cadillac')) return 'cadillac';
  if (n.includes('bmw')) return 'bmw_m';
  if (n.includes('hyundai')) return 'hyundai_n';
  if (n.includes('cosworth') || n.includes('dfv')) return 'cosworth';
  if (n.includes('goodwood') || n.includes('masters')) return 'historic';

  return 'generic';
}

/**
 * Precision Vector Team Logos for Top Motorsport Constructors
 * Disabled per user requirement to remove team logos across the application.
 */
export const TeamLogo: React.FC<TeamLogoProps> = () => {
  return null;
};
