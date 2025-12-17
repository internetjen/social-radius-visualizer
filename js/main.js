// Main Application Entry Point

import { initMapEventListeners } from './map.js';
import { geocodeAddress } from './geocoding.js';
import { 
  initDropdown, 
  initTogglePinMode, 
  initClearAllButton, 
  initMapClickHandler,
  initMobileSheet,
  initDealershipPanel 
} from './ui.js';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize map event listeners
  initMapEventListeners();

  // Initialize UI components
  initDropdown();
  initTogglePinMode();
  initClearAllButton();
  initMapClickHandler();
  initMobileSheet();
  initDealershipPanel()

  // Search button handler
  document.getElementById("searchButton").addEventListener("click", () => {
    const address = document.getElementById("addressInput").value.trim();
    if (address) geocodeAddress(address);
  });

  // Enter key handler for address input
  document.getElementById("addressInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("searchButton").click();
    }
  });

  console.log("🗺️ Social Radius Visualizer initialized!");
});