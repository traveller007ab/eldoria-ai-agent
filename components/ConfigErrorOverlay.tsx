
import React from 'react';

export const ConfigErrorOverlay: React.FC = () => {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="max-w-md w-full text-center bg-gray-800 border border-red-500/50 rounded-lg p-8 shadow-2xl shadow-red-900/20">
                <h1 className="text-3xl font-bold text-red-400 mb-4">Configuration Error</h1>
                <p className="text-gray-300 mb-2">
                    The Gemini API Key is missing or has not been configured correctly.
                </p>
                {/* FIX: Updated the error message to reflect the change from a file-based
                configuration (`config.ts`) to using environment variables for the API key. */}
                <p className="text-gray-400 text-sm">
                    Please set the <code className="bg-gray-700 text-yellow-300 px-1.5 py-0.5 rounded-md text-xs">API_KEY</code> environment variable to enable Eldoria.
                </p>
            </div>
        </div>
    );
};