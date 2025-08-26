import React from 'react';
import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaRefresh } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    handleReload = () => {
        // Clear the error state and reload the page
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Custom error UI
            return (
                <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full"
                    >
                        <FaExclamationTriangle className="text-orange-500 text-6xl mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h1>
                        <p className="text-gray-600 mb-6">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-left mb-4 p-4 bg-gray-50 rounded-lg">
                                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                                    Error Details (Development)
                                </summary>
                                <pre className="text-xs text-red-600 overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="w-full bg-accent text-white py-3 rounded-xl font-bold text-lg shadow-md hover:bg-accent-dark transition-colors duration-300 flex items-center justify-center gap-2"
                        >
                            <FaRefresh />
                            Refresh Page
                        </button>
                    </motion.div>
                </div>
            );
        }

        // Normally, just render children
        return this.props.children;
    }
}

export default ErrorBoundary;