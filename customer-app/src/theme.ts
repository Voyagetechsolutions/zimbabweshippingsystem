// Customer app visual language — mirrors the public website's Zimbabwe flag
// branding (not the staff app's admin emerald).
export const colors = {
  bg: '#f7f8f7',
  surface: '#ffffff',
  border: '#e6e8e6',
  ink: '#10130F',
  text: '#171b16',
  textMuted: '#5f675e',
  textFaint: '#9aa199',
  green: '#008C45',
  greenDark: '#06622F',
  greenSoft: '#e8f5ee',
  yellow: '#FFCB05',
  yellowSoft: '#fff8e0',
  red: '#DE3831',
  redSoft: '#fdeceb',
  white: '#ffffff',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

// The flag stripe used across the website's heroes.
export const FLAG = [colors.green, colors.yellow, colors.red] as const;
