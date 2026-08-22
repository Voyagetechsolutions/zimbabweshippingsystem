// Operations-centre visual language: emerald primary on a cool #F6F8FA canvas,
// white cards with soft shadows, and status accents that read at a glance.
export const colors = {
  bg: '#F7F9FA',
  surface: '#ffffff',
  border: '#E7ECE9',
  text: '#101828',
  textMuted: '#667085',
  textFaint: '#94a3b8',
  primary: '#009B68',
  primaryDark: '#006B4B',
  primarySoft: '#EAF8F2',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  amberBorder: '#fde68a',
  blue: '#1d4ed8',
  blueSoft: '#eff6ff',
  danger: '#dc2626',
  white: '#ffffff',
  // Status accent system (per the ops-centre design direction).
  orange: '#ea580c',
  orangeSoft: '#fff7ed',
  purple: '#7c3aed',
  purpleSoft: '#f5f3ff',
  cyan: '#0891b2',
  cyanSoft: '#ecfeff',
  gold: '#a16207',
  goldSoft: '#fefce8',
  redSoft: '#fef2f2',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 10, md: 14, lg: 18, pill: 999 };

// Very soft card shadow — visible on #F6F8FA without feeling heavy.
export const shadow = {
  shadowColor: '#0f172a',
  shadowOpacity: 0.045,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 1,
} as const;

export const type = { heading: 25, section: 17, cardTitle: 15, body: 14, caption: 12 } as const;

// Instantly recognizable stage colors: confirmed→green, collection→orange,
// warehouse→blue, loading→purple, sea→cyan, customs→gold, delivered→emerald.
export function stageTone(status: string | null | undefined): { bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s.includes('cancel')) return { bg: colors.redSoft, fg: colors.danger };
  if (s.includes('deliver') && !s.includes('out for')) return { bg: colors.primarySoft, fg: colors.primaryDark };
  if (s.includes('out for delivery')) return { bg: colors.cyanSoft, fg: colors.cyan };
  if (s.includes('customs')) return { bg: colors.goldSoft, fg: colors.gold };
  if (s.includes('transit') || s.includes('sea')) return { bg: colors.cyanSoft, fg: colors.cyan };
  if (s.includes('loading') || s.includes('container')) return { bg: colors.purpleSoft, fg: colors.purple };
  if (s.includes('warehouse') || s.includes('processing')) return { bg: colors.blueSoft, fg: colors.blue };
  if (s.includes('pickup') || s.includes('collect') || s.includes('pending')) return { bg: colors.orangeSoft, fg: colors.orange };
  if (s.includes('confirm')) return { bg: colors.primarySoft, fg: colors.primaryDark };
  return { bg: '#f1f5f9', fg: '#475569' };
}

// Seven-stage shipment journey used for timelines and progress dots.
export const STAGES = ['Confirmed', 'Collected', 'Warehouse', 'Loading', 'At sea', 'Customs', 'Delivered'] as const;

export function stageIndex(status: string | null | undefined): number {
  const s = (status || '').toLowerCase();
  if (s.includes('deliver') && !s.includes('out for')) return 6;
  if (s.includes('customs') || s.includes('out for delivery') || s.includes('zw warehouse') || s.includes('arrived')) return 5;
  if (s.includes('transit') || s.includes('sea')) return 4;
  if (s.includes('loading') || s.includes('container')) return 3;
  if (s.includes('uk warehouse') || s.includes('processing')) return 2;
  if (s.includes('collected')) return 1;
  return 0;
}
