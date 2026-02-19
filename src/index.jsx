import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./responsive-optimizations.css";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

// Handle unhandled promise rejections gracefully
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
