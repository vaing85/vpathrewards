/**
 * Utility function to get the authentication token
 * Checks both 'accessToken' (new) and 'token' (legacy) for backward compatibility
 * Returns null if no token is found (caller should handle this)
 */
export const getAuthToken = () => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  // Return null if token is empty string or falsy
  return token || null;
};

/**
 * Utility function to set the authentication token
 * Sets both 'accessToken' (new) and 'token' (legacy) for backward compatibility
 */
export const setAuthToken = (token) => {
  localStorage.setItem('accessToken', token);
  localStorage.setItem('token', token); // Legacy support
};

/**
 * Utility function to remove authentication tokens
 */
export const removeAuthToken = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

