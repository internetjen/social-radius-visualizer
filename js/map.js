// Map Initialization & Utilities

import { MAP_CONFIG } from './config.js';

// Initialize Leaflet map
export const map = L.map("map").setView(
  MAP_CONFIG.initialView,
  MAP_CONFIG.initialZoom
);

// Add tile layer
L.tileLayer(MAP_CONFIG.tileLayer, {
  attribution: MAP_CONFIG.attribution
}).addTo(map);

// Update marker and label scaling based on zoom level
export function updateMarkerLabelScale() {
  const zoom = map.getZoom();
  const scale = Math.pow(0.9, 10 - zoom);

  const markers = document.querySelectorAll(".zoom-scale-marker");

  markers.forEach((marker) => {
    marker.style.transform = `scale(${scale})`;
  });
}

// Set up map event listeners
export function initMapEventListeners() {
  map.on("zoomend", updateMarkerLabelScale);
  map.on("mousedown", () => map.getContainer().classList.add("grabbing"));
  map.on("mouseup", () => map.getContainer().classList.remove("grabbing"));
}