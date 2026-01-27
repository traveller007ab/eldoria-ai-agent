
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { WorkspaceProvider } from './context/WorkspaceContext';
import './index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

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