import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Store error details for display
    this.setState({
      error,
      errorInfo
    });

    // Log to error tracking service
    if (typeof window !== 'undefined') {
      import('../../utils/errorTracking').then(({ default: errorTracker }) => {
        errorTracker.logReactError(error, errorInfo, {
          component: 'ErrorBoundary',
          path: window.location.pathname
        });
      }).catch(err => {
        console.error('Failed to load error tracker:', err);
      });
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <ErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onGoHome={() => {
            this.handleReset();
            this.props.navigate?.('/dashboard');
          }}
        />
      );
    }

    return this.props.children;
  }
}

// Functional wrapper to use hooks
function ErrorBoundaryWrapper({ children, ...props }) {
  const navigate = useNavigate();
  return <ErrorBoundary navigate={navigate} {...props}>{children}</ErrorBoundary>;
}

// Fallback UI component
function ErrorFallback({ error, errorInfo, onReset, onGoHome }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <div className="error-boundary-icon">⚠️</div>
        <h1 className="error-boundary-title">Oops! Something went wrong</h1>
        <p className="error-boundary-message">
          We're sorry, but something unexpected happened. Don't worry, your balance and progress are safe.
        </p>
        
        {isDevelopment && error && (
          <details className="error-boundary-details">
            <summary>Error Details (Development Only)</summary>
            <div className="error-boundary-error">
              <strong>Error:</strong>
              <pre>{error.toString()}</pre>
              {errorInfo && (
                <>
                  <strong>Component Stack:</strong>
                  <pre>{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}

        <div className="error-boundary-actions">
          <button 
            className="error-boundary-button error-boundary-button-primary" 
            onClick={onReset}
          >
            Try Again
          </button>
          <button 
            className="error-boundary-button error-boundary-button-secondary" 
            onClick={onGoHome}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundaryWrapper;

