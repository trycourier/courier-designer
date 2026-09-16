import type { ErrorInfo, ReactNode } from "react";
import React, { Component } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component that catches JavaScript errors in the component tree
 * and integrates with the template error system
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // We can't use hooks in class components, so we'll use a ref approach
    // The hook-based wrapper below will handle setting the template error
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => {
  return (
    <div className="courier-p-6 courier-border courier-border-red-200 courier-bg-red-50 courier-rounded-lg courier-text-center">
      <h3 className="courier-text-lg courier-font-semibold courier-text-red-800 courier-mb-2">
        Something went wrong
      </h3>
      <p className="courier-text-red-600 courier-mb-4">
        An unexpected error occurred in the editor. Please refresh the page or contact support if
        the problem persists.
      </p>
      {process.env.NODE_ENV === "development" && error && (
        <details className="courier-text-left courier-text-sm courier-text-gray-600">
          <summary className="courier-cursor-pointer courier-mb-2">
            Error Details (Development)
          </summary>
          <pre className="courier-bg-gray-100 courier-p-2 courier-rounded courier-overflow-auto">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
};
