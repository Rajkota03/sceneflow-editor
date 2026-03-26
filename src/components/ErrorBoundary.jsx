import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                    height: '100%',
                    color: 'var(--text-secondary, #999)',
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </div>
                    <div style={{
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        maxWidth: '300px',
                        opacity: 0.7,
                    }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </div>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '0.5rem 1.25rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #333)',
                            background: 'var(--bg-secondary, #1a1a2e)',
                            color: 'var(--text-primary, #e0e0e0)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
