/**
 * Standardized color constants for the FlowCounts application.
 * All red and yellow colors should use these constants for consistency.
 */

export const COLORS = {
  // Primary Brand Colors
  primary: '#1C5C59',
  primaryDark: '#164845',
  primaryLight: '#1C302F',
  
  // Standardized Red Colors
  red: '#c1121f',           // Primary red color
  redDark: '#a00d18',       // Darker red for hover states
  redLight: '#f8d7da',      // Light red for backgrounds
  redBorder: '#f5c6cb',     // Light red for borders
  
  // Standardized Yellow/Orange Colors  
  yellow: '#ffc107',        // Primary yellow color
  yellowDark: '#e0a800',    // Darker yellow for hover states
  yellowLight: '#fff3cd',   // Light yellow for backgrounds
  yellowBorder: '#ffeaa7',  // Light yellow for borders
  yellowText: '#856404',    // Dark yellow for text
  
  // Orange variant (for status indicators)
  orange: '#ff8c00',        // Orange color
  orangeLight: '#fff3cd',   // Light orange for backgrounds
  
  // Success Colors (Green)
  success: '#4f772d',       // Success green
  successLight: '#d4edda',  // Light success green
  successBorder: '#c3e6cb', // Success border
  successText: '#155724',   // Success text
  
  // Neutral Colors
  white: '#ffffff',
  black: '#000000',
  gray: '#6c757d',
  grayLight: '#f8f9fa',
  grayBorder: '#dee2e6',
  grayText: '#495057',
  
  // Status Colors
  pending: '#ffc107',       // Same as yellow
  approved: '#4f772d',      // Same as success
  rejected: '#c1121f',      // Same as red
  
  // Error Colors
  error: '#c1121f',         // Same as red
  errorLight: '#f8d7da',    // Same as redLight
  errorBorder: '#f5c6cb',   // Same as redBorder
  errorText: '#721c24',     // Dark red for text
};

// Helper function to get color variants
export const getColorVariant = (baseColor, variant = 'base') => {
  const colorMap = {
    red: {
      base: COLORS.red,
      dark: COLORS.redDark,
      light: COLORS.redLight,
      border: COLORS.redBorder,
      text: COLORS.errorText
    },
    yellow: {
      base: COLORS.yellow,
      dark: COLORS.yellowDark,
      light: COLORS.yellowLight,
      border: COLORS.yellowBorder,
      text: COLORS.yellowText
    },
    orange: {
      base: COLORS.orange,
      light: COLORS.orangeLight,
      text: COLORS.yellowText
    }
  };
  
  return colorMap[baseColor]?.[variant] || COLORS[baseColor] || baseColor;
};

export default COLORS;

