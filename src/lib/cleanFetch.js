/**
 * Clean Fetch utility to bypass third-party instrumentation (rrweb, etc.)
 * that can cause "Response body is already used" errors.
 * 
 * Creates a hidden iframe with a clean window.fetch that hasn't been instrumented.
 */

let cleanFetchInstance = null;
let iframeElement = null;

/**
 * Creates a clean fetch function from a hidden iframe
 * This bypasses any window.fetch instrumentation in the main window
 */
const createCleanFetch = () => {
  if (cleanFetchInstance) {
    return cleanFetchInstance;
  }

  try {
    // Create a hidden iframe
    iframeElement = document.createElement('iframe');
    iframeElement.style.display = 'none';
    iframeElement.sandbox = 'allow-same-origin allow-scripts';
    document.body.appendChild(iframeElement);

    // Get the clean fetch from the iframe's window
    const iframeWindow = iframeElement.contentWindow;
    if (iframeWindow && iframeWindow.fetch) {
      cleanFetchInstance = iframeWindow.fetch.bind(iframeWindow);
      return cleanFetchInstance;
    }
  } catch (error) {
    console.warn('Could not create clean fetch from iframe, falling back to window.fetch:', error);
  }

  // Fallback to regular fetch if iframe creation fails
  return window.fetch.bind(window);
};

/**
 * Get a clean fetch function that bypasses instrumentation
 */
export const getCleanFetch = () => {
  if (typeof document === 'undefined') {
    // SSR environment - use global fetch
    return fetch;
  }
  
  return createCleanFetch();
};

/**
 * Custom fetch implementation for Supabase that uses clean fetch
 */
export const supabaseFetch = async (input, init) => {
  const cleanFetch = getCleanFetch();
  return cleanFetch(input, init);
};

/**
 * Cleanup function to remove the iframe when no longer needed
 */
export const cleanupCleanFetch = () => {
  if (iframeElement && iframeElement.parentNode) {
    iframeElement.parentNode.removeChild(iframeElement);
    iframeElement = null;
    cleanFetchInstance = null;
  }
};
