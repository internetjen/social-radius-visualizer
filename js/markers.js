// Marker & Circle Management

import { RADIUS_OPTIONS, CIRCLE_STYLE, MILES_TO_METERS, API_CONFIG } from './config.js';
import { map, updateMarkerLabelScale } from './map.js';
import { addressMap, setDeleteMarker, clearDeleteMarker, getDeleteMarker, setSelectedRadius, clearSelectedRadius } from './storage.js';
import { updateDealershipPanel } from './ui.js';

// Cache for dealership data to avoid repeated API calls
const dealershipCache = new Map();
let dealershipMarkers = []; // Track all dealership markers for cleanup

// Debounce function to prevent rapid API calls
let fetchTimeout = null;

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

  // Clear dealership markers
  clearDealershipMarkers();

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
  console.log('Drawing circle for address:', address); // ← ADD THIS DEBUG LINE
  
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

  // Fetch nearby dealerships and update label with count
  fetchNearbyDealerships(lat, lon, miles, address);

  updateMarkerLabelScale();
  return { circle };
}

// Fetch nearby dealerships using Overpass API (OpenStreetMap)
async function fetchNearbyDealerships(lat, lon, radiusMiles, address) {
  const radiusMeters = radiusMiles * MILES_TO_METERS;
  
  // Create cache key
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${radiusMiles}`;
  
  // Check cache first
  if (dealershipCache.has(cacheKey)) {
    console.log(`Using cached data for ${address}`);
    const cachedData = dealershipCache.get(cacheKey);
    updateMarkerWithCount(address, radiusMiles, cachedData);
    displayDealershipMarkers(cachedData);
    return;
  }
  
  // Clear existing timeout
  if (fetchTimeout) {
    clearTimeout(fetchTimeout);
  }
  
  // Debounce API calls by 500ms
  fetchTimeout = setTimeout(async () => {
    // Build Overpass QL query - get center points only
    const query = `
      [out:json][timeout:25];
      (
        node["shop"="car"](around:${radiusMeters},${lat},${lon});
        way["shop"="car"](around:${radiusMeters},${lat},${lon});
      );
      out center;
    `;

    try {
      const response = await fetch(API_CONFIG.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON - API may be overloaded');
      }

      const data = await response.json();

      if (data.elements?.length) {
        // Deduplicate dealerships by location and name
        const dealerships = deduplicateDealerships(data.elements);
        
        console.log(`Found ${dealerships.length} unique dealerships for ${address}`);
        
        // Cache the result
        dealershipCache.set(cacheKey, dealerships);
        
        // Update marker with count
        updateMarkerWithCount(address, radiusMiles, dealerships);
        
        // Display markers
        displayDealershipMarkers(dealerships);
      } else {
        console.log("No dealerships found nearby.");
        updateMarkerWithCount(address, radiusMiles, []);
      }
    } catch (err) {
      console.error("Dealership fetch error:", err.message);
      
      // Show user-friendly error
      if (err.message.includes('504') || err.message.includes('timeout')) {
        console.warn('⚠️ API timeout - try again in a few seconds');
      } else if (err.message.includes('not JSON')) {
        console.warn('⚠️ API overloaded - using fallback');
      }
      
      // Still update marker (without count)
      updateMarkerWithCount(address, radiusMiles, []);
    }
  }, 500);
}

// Deduplicate dealerships by proximity and name
function deduplicateDealerships(elements) {
  const uniqueDealerships = [];
  const DISTANCE_THRESHOLD = 0.0001; // ~10 meters
  
  elements.forEach(element => {
    // Get coordinates - for ways, use center
    const lat = element.center?.lat || element.lat;
    const lon = element.center?.lon || element.lon;
    
    if (!lat || !lon) return;
    
    // Get name for comparison
    const name = element.tags?.name || 
                 element.tags?.operator || 
                 element.tags?.brand || 
                 '';
    
    // Check if we already have this dealership
    const isDuplicate = uniqueDealerships.some(existing => {
      const existingName = existing.tags?.name || 
                          existing.tags?.operator || 
                          existing.tags?.brand || 
                          '';
      
      // Check if same name and very close location
      const isSameName = name && existingName && 
                         name.toLowerCase() === existingName.toLowerCase();
      
      const existingLat = existing.center?.lat || existing.lat;
      const existingLon = existing.center?.lon || existing.lon;
      
      const latDiff = Math.abs(lat - existingLat);
      const lonDiff = Math.abs(lon - existingLon);
      
      const isCloseBy = latDiff < DISTANCE_THRESHOLD && lonDiff < DISTANCE_THRESHOLD;
      
      return isSameName && isCloseBy;
    });
    
    if (!isDuplicate) {
      // Normalize the element to always have lat/lon at top level
      uniqueDealerships.push({
        ...element,
        lat: lat,
        lon: lon
      });
    }
  });
  
  return uniqueDealerships;
}

/// Helper function to update marker with dealership count
function updateMarkerWithCount(address, radiusMiles, dealerships) {
  console.log('updateMarkerWithCount called:', { address, radiusMiles, count: dealerships.length }); // ← ADD DEBUG
  
  const existing = addressMap.get(address);
  if (existing) {
    const dealershipCount = dealerships.length;
    
    addressMap.set(address, {
      ...existing,
      dealerships: dealerships,
      dealershipCount: dealershipCount
    });
    
    // Update marker label
    if (existing.marker) {
      const updatedIcon = createLabeledPinIcon(
        address,
        radiusMiles,
        existing.fullAddress,
        dealershipCount
      );
      existing.marker.setIcon(updatedIcon);
    }
    
    // Update dealership panel
    console.log('Calling updateDealershipPanel with:', dealerships.length, 'dealerships'); // ← ADD DEBUG
    updateDealershipPanel(dealerships, existing.lat, existing.lon);
  } else {
    console.warn('No existing data found for address:', address); // ← ADD DEBUG
  }
}

// Helper function to display dealership markers
function displayDealershipMarkers(dealerships) {
  // Clear old markers first
  clearDealershipMarkers();
  
  dealerships.forEach((element) => {
    const name = element.tags?.name || 'Unnamed Dealership';
    const brand = element.tags?.brand || element.tags?.operator || '';
    
    const popupContent = `
      <div style="min-width: 150px;">
        <strong>${name}</strong>
        ${brand ? `<br><em>${brand}</em>` : ''}
      </div>
    `;

    const dealerMarker = L.marker([element.lat, element.lon], {
      icon: L.icon({
        iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      }),
    }).bindPopup(popupContent);

    dealerMarker.addTo(map);
    dealershipMarkers.push(dealerMarker); // Track for cleanup
  });
}

// Clear all dealership markers from map
function clearDealershipMarkers() {
  dealershipMarkers.forEach(marker => map.removeLayer(marker));
  dealershipMarkers = [];
}

// At the very end of markers.js, add:
export { clearDealershipMarkers };