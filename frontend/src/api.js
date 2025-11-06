import axios from "axios";

// Determine API base URL based on environment
// In development with Vite proxy, use relative path
// In production, Django serves both frontend and backend, so relative path works
const getBaseURL = () => {
  // Check if we're in development (Vite dev server)
  if (import.meta.env.DEV) {
    return "/api";
  }
  // In production, Django serves the API from the same origin
  return "/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Ensure URLs have trailing slashes for Django compatibility
  // Only add trailing slash if URL doesn't have one and doesn't have query parameters
  if (config.url && !config.url.endsWith('/')) {
    // Check if URL has query parameters
    const urlParts = config.url.split('?');
    if (urlParts.length === 1) {
      // No query parameters, safe to add trailing slash
      config.url += '/';
    }
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        fullURL: `${originalRequest?.baseURL}${originalRequest?.url}`,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('API Request Error (no response):', {
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        fullURL: `${originalRequest?.baseURL}${originalRequest?.url}`,
        message: error.message,
      });
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem("refresh");
        if (refreshToken) {
          const response = await axios.post("/api/auth/token/refresh/", {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem("access", access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
