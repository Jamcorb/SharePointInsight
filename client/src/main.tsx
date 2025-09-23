import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeMsal } from "./lib/msal";

// Handle authentication redirect in popup window
async function handleAuthRedirect() {
  try {
    // Check if we're in a popup window (authentication redirect)
    if (window.opener && window.opener !== window) {
      console.log("🔍 [POPUP] Detected popup window, handling authentication redirect...");
      
      // Initialize MSAL to handle the redirect
      await initializeMsal();
      
      // Import MSAL instance and handle redirect
      const { msalInstance } = await import("./lib/msal");
      
      // Handle the redirect response
      await msalInstance.handleRedirectPromise();
      
      console.log("✅ [POPUP] Authentication redirect handled, closing popup...");
      
      // Close the popup window
      window.close();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("❌ [POPUP] Error handling authentication redirect:", error);
    // Still try to close the popup
    if (window.opener && window.opener !== window) {
      window.close();
    }
    return false;
  }
}

// Initialize application
async function initializeApp() {
  // Check if this is a popup authentication redirect
  const isPopupRedirect = await handleAuthRedirect();
  
  // Only render the full app if we're not in a popup
  if (!isPopupRedirect) {
    createRoot(document.getElementById("root")!).render(<App />);
  }
}

// Start the application
initializeApp().catch((error) => {
  console.error("❌ [APP] Failed to initialize application:", error);
  // Fallback to rendering the app anyway
  createRoot(document.getElementById("root")!).render(<App />);
});
