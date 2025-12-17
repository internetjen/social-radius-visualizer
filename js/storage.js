// Data Storage Management

// Storage for all addresses and their data
// Structure: { address: { lat, lon, radius, circle, marker, fullAddress } }
export const addressMap = new Map();

// Track selected radius for deletion
export let selectedRadius = null;
export let deleteMarker = null;

export function setSelectedRadius(address) {
  selectedRadius = address;
}

export function clearSelectedRadius() {
  selectedRadius = null;
}

export function setDeleteMarker(marker) {
  deleteMarker = marker;
}

export function clearDeleteMarker() {
  deleteMarker = null;
}

export function getDeleteMarker() {
  return deleteMarker;
}

export function clearAllData() {
  addressMap.clear();
  selectedRadius = null;
  deleteMarker = null;
}