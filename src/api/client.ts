/**
 * API Client for Google Tasks
 * 
 * Handles authentication, request/response, and error handling.
 * Wraps axios with auth token injection.
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { GOOGLE_TASKS_API } from "./endpoints";

/**
 * Error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * API Client configuration
 */
interface ApiClientConfig {
  accessToken: string;
  onTokenExpired?: () => void;
  refreshToken?: () => Promise<string | null>;
  onError?: (error: ApiError) => void;
}

/**
 * Google Tasks API Client
 */
export class GoogleTasksClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (err: any) => void;
  }> = [];

  constructor(config: ApiClientConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: GOOGLE_TASKS_API.BASE_URL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const processQueue = (error: any, token: string | null = null) => {
      this.failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token!);
        }
      });
      this.failedQueue = [];
    };

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const statusCode = error.response?.status;

        // Auto-refresh token on 401 Unauthorized
        if (statusCode === 401 && originalRequest && !originalRequest._retry && this.config.refreshToken) {
          if (this.isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                throw this.handleError(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            console.log("GoogleTasksClient: 401 detected, attempting auto-refresh of access token...");
            const newToken = await this.config.refreshToken();
            if (newToken) {
              console.log("GoogleTasksClient: token refreshed successfully, retrying failed request");
              this.setAccessToken(newToken);
              processQueue(null, newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } else {
              throw new Error("No refresh token available");
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            this.config.onTokenExpired?.();
            const apiError = new ApiError("Session expired. Please sign in again.", 401);
            this.config.onError?.(apiError);
            throw apiError;
          } finally {
            this.isRefreshing = false;
          }
        }

        const apiError = this.handleError(error);
        
        // Check for token expiration
        if (apiError.statusCode === 401) {
          this.config.onTokenExpired?.();
        }
        
        this.config.onError?.(apiError);
        throw apiError;
      }
    );
  }

  /**
   * Update the access token
   */
  setAccessToken(token: string): void {
    this.config.accessToken = token;
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
  }

  /**
   * Transform axios errors into ApiError
   */
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const message = 
        (error.response.data as { message?: string })?.message ||
        error.message ||
        "API request failed";
      return new ApiError(message, error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      return new ApiError("No response from server - check your connection");
    } else {
      // Error setting up request
      return new ApiError(error.message || "Request failed");
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: unknown, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.post<T>(path, data, { params });
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data: unknown): Promise<T> {
    const response = await this.client.put<T>(path, data);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data: unknown): Promise<T> {
    const response = await this.client.patch<T>(path, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete(path: string): Promise<void> {
    await this.client.delete(path);
  }
}

/**
 * Create a new API client instance
 */
export function createApiClient(config: ApiClientConfig): GoogleTasksClient {
  return new GoogleTasksClient(config);
}
