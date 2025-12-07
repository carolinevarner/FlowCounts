/**
 * Standardized error display component.
 * All error messages should be displayed using this component to ensure
 * consistent styling with the red color #c1121f.
 */
import COLORS from '../styles/colors';

export default function ErrorDisplay({ error, title = 'Error' }) {
  if (!error) return null;

  return (
    <div style={{ 
      whiteSpace: 'pre-line', 
      marginBottom: 16,
      padding: '16px',
      backgroundColor: COLORS.errorLight,
      border: `2px solid ${COLORS.error}`,
      borderRadius: '8px',
      color: COLORS.error,
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 2px 4px rgba(193, 18, 31, 0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: error.includes('\n') ? '8px' : '0' }}>
        <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
        <strong style={{ fontSize: '16px' }}>{title}</strong>
      </div>
      <div style={{ marginLeft: error.includes('\n') ? '26px' : '0' }}>{error}</div>
    </div>
  );
}








