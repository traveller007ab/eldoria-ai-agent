
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { WorkspaceProvider } from './context/WorkspaceContext';
import './index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";

console.log('[INDEX] Initializing app...');

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error('[INDEX] CRITICAL: VITE_CONVEX_URL is missing. App will likely crash.');
}

const convex = new ConvexReactClient(convexUrl || 'http://localhost:3000');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[INDEX] CRITICAL: Root element not found.');
  throw new Error("Could not find root element to mount to");
}

console.log('[INDEX] Mounting React root...');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <HashRouter>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </HashRouter>
    </ConvexProvider>
  </React.StrictMode>
);

console.log('[INDEX] App rendered.');