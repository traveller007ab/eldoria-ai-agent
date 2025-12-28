import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class SAFGraphErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("SAFNodeGraph crashed:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 border border-red-500/20 rounded-xl p-8 text-center">
                    <div className="max-w-md">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Simulation Rendering Failed</h3>
                        <p className="text-gray-400 mb-6 text-sm">
                            The system graph encountered an unexpected state and could not be rendered.
                            This often happens with invalid flow connections or missing component IDs.
                        </p>

                        <div className="bg-black/40 rounded p-4 mb-6 text-left overflow-auto max-h-32 border border-white/5">
                            <code className="text-xs text-red-400 font-mono">
                                {this.state.error?.message}
                            </code>
                        </div>

                        <button
                            onClick={this.handleReset}
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset Workbench
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
