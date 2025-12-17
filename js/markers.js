// Marker & Circle Management

import { RADIUS_OPTIONS, CIRCLE_STYLE, MILES_TO_METERS, API_CONFIG } from './config.js';
import { map, updateMarkerLabelScale } from './map.js';
import { addressMap, setDeleteMarker, clearDeleteMarker, getDeleteMarker, setSelectedRadius, clearSelectedRadius } from './storage.js';

// Create labeled pin icon
export function createLabeledPinIcon(address, miles, fullAddress = null) {
  const displayAddress = fullAddress || address;
  return L.divIcon({
    className: "",
    html: `
        <div class="marker-container zoom-scale-marker">
          <svg class="pin-svg" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="#A84DCF" stroke="white" stroke-width="3"/>
            <circle cx="10" cy="10" r="3" fill="white"/>
          </svg>
          <div class="custom-label zoom-scale-label" data-address="${address}" title="${displayAddress}">
            <div><strong>${address}</strong></div>
            <div class="subtext">${RADIUS_OPTIONS[miles] || ""}</div>
          </div>
        </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

// Create delete button icon
export function createDeleteIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="delete-radius-btn">×</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Show delete button at circle center
export function showDeleteButton(address) {
  const data = addressMap.get(address);
  if (!data) return;

  // Remove existing delete button if any
  const currentDeleteMarker = getDeleteMarker();
  if (currentDeleteMarker) {
    map.removeLayer(currentDeleteMarker);
  }

  setSelectedRadius(address);

  // Create marker with delete button at circle center
  const deleteMarker = L.marker([data.lat, data.lon], {
    icon: createDeleteIcon(),
    zIndexOffset: 2000,
  }).addTo(map);

  setDeleteMarker(deleteMarker);

  // Add click handler after a brief delay to let the DOM update
  setTimeout(() => {
    const btn = document.querySelector(".delete-radius-btn");
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteRadius(address);
      };
    }
  }, 50);
}

// Delete a specific radius
export function deleteRadius(address) {
  const data = addressMap.get(address);
  if (!data) return;

  // Remove from map
  if (data.marker) map.removeLayer(data.marker);
  if (data.circle) map.removeLayer(data.circle);

  // Remove delete button
  const deleteMarker = getDeleteMarker();
  if (deleteMarker) {
    map.removeLayer(deleteMarker);
    clearDeleteMarker();
  }

  // Remove from storage
  addressMap.delete(address);
  clearSelectedRadius();

  // Hide clear button if no more radii
  if (addressMap.size === 0) {
    document.getElementById("clearWrapper").classList.remove("visible");
  }
}

// Draw circle with radius
export function drawCircle(lat, lon, miles, address = null) {
  const radiusInMeters = miles * MILES_TO_METERS;

  const circle = L.circle([lat, lon], {
    ...CIRCLE_STYLE,
    radius: radiusInMeters,
  }).addTo(map);

  // Add click handler to show delete button
  circle.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    showDeleteButton(address);
  });

  const existing = addressMap.get(address);
  if (existing?.marker) {
    const updatedIcon = createLabeledPinIcon(
      address,
      miles,
      existing.fullAddress
    );
    existing.marker.setIcon(updatedIcon);
  }

  // Fetch nearby dealerships
  fetchNearbyDealerships(lat, lon, miles);

  updateMarkerLabelScale();
  return { circle };
}

// Fetch nearby dealerships using Google Places API
async function fetchNearbyDealerships(lat, lon, radiusMiles) {
  const radiusMeters = radiusMiles * MILES_TO_METERS;
  const apiKey = API_CONFIG.googlePlacesKey;
  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radiusMeters}&type=car_dealer&key=${apiKey}`;

  try {
    const response = await fetch(
      `${API_CONFIG.corsProxy}?${encodeURIComponent(endpoint)}`
    );
    const data = await response.json();

    if (data.results?.length) {
      data.results.forEach((place) => {
        const { name, geometry } = place;
        const dealerMarker = L.marker(
          [geometry.location.lat, geometry.location.lng],
          {
            icon: L.icon({
              iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            }),
          }
        ).bindPopup(`<strong>${name}</strong>`);

        dealerMarker.addTo(map);
      });
    } else {
      console.log("No dealerships found nearby.");
    }
  } catch (err) {
    console.error("Dealership fetch error:", err);
  }
}