import type { ExternalToast } from "sonner";

/**
 * Error handling utilities for the Courier Designer
 */

export interface TemplateError {
  /** Human-readable error message */
  message: string;
  /** Optional toast configuration (duration, action, description, etc.) */
  toastProps?: ExternalToast;
}

/**
 * Creates a custom error (for use in override functions)
 */
export const createCustomError = (message: string, toastProps?: ExternalToast): TemplateError => {
  return { message, toastProps };
};

/**
 * Checks if an error has a retry action configured
 */
export const isRetryableError = (error: TemplateError): boolean => {
  return error.toastProps?.action !== undefined;
};

/**
 * Extracts error message from various error formats for backward compatibility
 */
export const extractErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
};

/**
 * Converts a legacy string error to a TemplateError
 */
export const convertLegacyError = (error: string | TemplateError): TemplateError => {
  if (typeof error === "string") {
    return createCustomError(error);
  }
  return error;
};
