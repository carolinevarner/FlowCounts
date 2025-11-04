/**
 * Utility functions for handling error messages from the API.
 */

/**
 * Extract error message from API response.
 * Handles both database error responses and legacy error responses.
 * 
 * @param {Object} error - The error object from axios
 * @returns {string} - The user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error || !error.response) {
    return 'An unexpected error occurred. Please try again.';
  }

  const response = error.response;
  const data = response.data;

  // Handle database error response format
  if (data && typeof data === 'object') {
    // Database error response format
    if (data.detail) {
      return data.detail;
    }
    
    // Legacy error response format
    if (data.error) {
      return data.error;
    }
    
    // Validation errors format
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.join(', ');
    }
    
    // Field-specific errors
    if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
      return data.non_field_errors.join(', ');
    }
  }

  // Fallback error messages based on status code
  switch (response.status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You are not authenticated. Please log in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'A server error occurred. Please try again later.';
    default:
      return `An error occurred (${response.status}). Please try again.`;
  }
};

/**
 * Extract error title from API response.
 * 
 * @param {Object} error - The error object from axios
 * @returns {string} - The error title
 */
export const getErrorTitle = (error) => {
  if (!error || !error.response || !error.response.data) {
    return 'Error';
  }

  const data = error.response.data;
  
  // Database error response format
  if (data.title) {
    return data.title;
  }
  
  // Legacy format fallback
  if (data.error) {
    return 'Error';
  }
  
  return 'Error';
};

/**
 * Extract error code from API response.
 * 
 * @param {Object} error - The error object from axios
 * @returns {string|null} - The error code
 */
export const getErrorCode = (error) => {
  if (!error || !error.response || !error.response.data) {
    return null;
  }

  const data = error.response.data;
  
  // Database error response format
  if (data.error_code) {
    return data.error_code;
  }
  
  return null;
};

/**
 * Check if error is a database error response.
 * 
 * @param {Object} error - The error object from axios
 * @returns {boolean} - True if it's a database error response
 */
export const isDatabaseError = (error) => {
  return getErrorCode(error) !== null;
};

