// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


map.on('zoomend', updateMarkerLabelScale);
map.on('mousedown', () => map.getContainer().classList.add('grabbing'));
map.on('mouseup', () => map.getContainer().classList.remove('grabbing'));

// Storage
const addressMap = new Map(); // { address: { lat, lon, radius, circle, marker } }

// Radius labels
const radiusLabels = {
    15: 'Small - 15 mi',
    30: 'Large - 30 mi'
  };

// Track pin placement mode
let pinPlacementMode = false;  

// Track selected radius for deletion
let selectedRadius = null;
let deleteMarker = null;

// Create delete button icon
function createDeleteIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="delete-radius-btn">×</div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

// Show delete button at circle center
function showDeleteButton(address) {
  const data = addressMap.get(address);
  if (!data) return;

  // Remove existing delete button if any
  if (deleteMarker) {
    map.removeLayer(deleteMarker);
  }

  selectedRadius = address;

  // Create marker with delete button at circle center
  deleteMarker = L.marker([data.lat, data.lon], {
    icon: createDeleteIcon(),
    zIndexOffset: 2000 // Make sure it's on top
  }).addTo(map);

  // Add click handler after a brief delay to let the DOM update
  setTimeout(() => {
    const btn = document.querySelector('.delete-radius-btn');
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteRadius(address);
      };
    }
  }, 50);
}

// Delete a specific radius
function deleteRadius(address) {
  const data = addressMap.get(address);
  if (!data) return;

  // Remove from map
  if (data.marker) map.removeLayer(data.marker);
  if (data.circle) map.removeLayer(data.circle);

  // Remove delete button
  if (deleteMarker) {
    map.removeLayer(deleteMarker);
    deleteMarker = null;
  }

  // Remove from storage
  addressMap.delete(address);
  selectedRadius = null;

  // Hide clear button if no more radii
  if (addressMap.size === 0) {
    document.getElementById('clearWrapper').classList.remove('visible');
  }
}

// Create labeled pin icon
function createLabeledPinIcon(address, miles, fullAddress = null) {
  const displayAddress = fullAddress || address;
  return L.divIcon({
    className: '',
    html: `
        <div class="marker-container zoom-scale-marker">
          <svg class="pin-svg" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="#A84DCF" stroke="white" stroke-width="3"/>
            <circle cx="10" cy="10" r="3" fill="white"/>
          </svg>
          <div class="custom-label zoom-scale-label" data-address="${address}" title="${displayAddress}">
            <div><strong>${address}</strong></div>
            <div class="subtext">${radiusLabels[miles] || ''}</div>
          </div>
        </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10], // Center of the pin
    popupAnchor: [0, -10]
  });
}

// Address Search
document.getElementById('searchButton').addEventListener('click', () => {
  const address = document.getElementById('addressInput').value.trim();
  if (address) geocodeAddress(address);
});

document.getElementById('togglePinMode').addEventListener('click', () => {
  pinPlacementMode = !pinPlacementMode;
  const toggleBtn = document.getElementById('togglePinMode');
  const statusSpan = toggleBtn.querySelector('.toggle-status');
  
  if (pinPlacementMode) {
    // Turn ON
    toggleBtn.dataset.active = 'true';
    statusSpan.textContent = 'ON';
    map.getContainer().style.cursor = 'crosshair';
    
    // Show banner on map
    showClickBanner(true);
    
  } else {
    // Turn OFF
    toggleBtn.dataset.active = 'false';
    statusSpan.textContent = 'OFF';
    map.getContainer().style.cursor = '';
    
    // NEW: Show banner when turning off
    showClickBanner(false);
  }
});

// Show click banner
function showClickBanner(isEnabled) {
  const banner = document.getElementById('click-banner');
  const message = document.getElementById('banner-message');
  const icon = document.querySelector('.banner-icon');
  
  // Update message and icon based on state
  if (isEnabled) {
    message.textContent = 'Click-to-add is turned ON';
    icon.textContent = '✓';
  } else {
    message.textContent = 'Click-to-add is turned OFF';
    icon.textContent = '✓';
  }
  
  // Show banner
  banner.classList.add('show');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    banner.classList.remove('show');
  }, 3000);
}

document.getElementById('addressInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('searchButton').click();
});

// Geocode
function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("Address not found.");

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);

      map.flyTo([lat, lon], 10, { duration: 2 });

      setTimeout(() => {
        if (addressMap.has(address)) {
          const old = addressMap.get(address);
          if (old.marker) map.removeLayer(old.marker);
          if (old.circle) map.removeLayer(old.circle);
        }

        const marker = L.marker([lat, lon], {
          icon: createLabeledPinIcon(address, '')
        }).addTo(map);

        addressMap.set(address, {
          lat,
          lon,
          radius: null,
          circle: null,
          marker,
        });

        const radiusUI = document.getElementById('radius');
        radiusUI.classList.add('visible');
        radiusUI.dataset.address = address;
        radiusUI.dataset.lat = lat;
        radiusUI.dataset.lon = lon;

        enableCustomDropdown();
        updateMarkerLabelScale();
      }, 2000);
    })
    .catch(err => {
      console.error("Geocoding error:", err);
      alert("There was an error processing your request.");
    });
}

// Reverse Geocode (coordinates to address)
function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.display_name) {
        alert("Could not find address for this location.");
        return;
      }

      const fullAddress = data.display_name;
      
      // Create a shorter, cleaner address
      const addr = data.address || {};
      const parts = [];
      
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village);
      }
      if (addr.state) {
        parts.push(addr.state);
      }
      if (addr.postcode) {
        parts.push(addr.postcode);
      }
      
      const shortAddress = parts.length > 0 ? parts.join(', ') : fullAddress;

      // Remove old marker/circle if exists
      if (addressMap.has(shortAddress)) {
        const old = addressMap.get(shortAddress);
        if (old.marker) map.removeLayer(old.marker);
        if (old.circle) map.removeLayer(old.circle);
      }

      const marker = L.marker([lat, lon], {
        icon: createLabeledPinIcon(shortAddress, '', fullAddress)
      }).addTo(map);

      addressMap.set(shortAddress, {
        lat,
        lon,
        radius: null,
        circle: null,
        marker,
        fullAddress: fullAddress
      });

      // Update UI
      document.getElementById('addressInput').value = shortAddress;
      const radiusUI = document.getElementById('radius');
      radiusUI.classList.add('visible');
      radiusUI.dataset.address = shortAddress;
      radiusUI.dataset.lat = lat;
      radiusUI.dataset.lon = lon;

      enableCustomDropdown();
      updateMarkerLabelScale();
    })
    .catch(err => {
      console.error("Reverse geocoding error:", err);
      alert("There was an error processing your request.");
    });
}

// Draw circle
function drawCircle(lat, lon, miles, address = null) {
  const radiusInMeters = miles * 1609.34;

  const circle = L.circle([lat, lon], {
    color: '#3D1B5B',
    weight: 1.5,
    fillColor: '#3D1B5B',
    fillOpacity: 0.15,
    radius: radiusInMeters
  }).addTo(map);

  // Add click handler to show delete button
  circle.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    showDeleteButton(address);
  });

  const existing = addressMap.get(address);
  if (existing?.marker) {
    const updatedIcon = createLabeledPinIcon(address, miles, existing.fullAddress);
    existing.marker.setIcon(updatedIcon);
  }

  //Fetch nearby dealerships
  fetchNearbyDealerships(lat, lon, miles);

  updateMarkerLabelScale();
  return { circle };
}

// Custom dropdown
const dropdown = document.getElementById('radiusSelect');
const selected = dropdown.querySelector('.dropdown-selected');
const options = dropdown.querySelector('.dropdown-options');
const optionItems = dropdown.querySelectorAll('.dropdown-option');

function enableCustomDropdown() {
  dropdown.classList.remove('disabled');
  selected.innerText = 'Choose One';
  selected.dataset.value = '';
}

selected.addEventListener('click', () => {
  if (dropdown.classList.contains('disabled')) {
    alert("Please search for an address first.");
    return;
  }
  options.style.display = options.style.display === 'block' ? 'none' : 'block';
});

optionItems.forEach(option => {
  option.addEventListener('click', () => {
    const value = parseInt(option.dataset.value);
    const text = option.innerText;

    const radiusData = document.getElementById('radius').dataset;
    const address = radiusData.address;
    const lat = parseFloat(radiusData.lat);
    const lon = parseFloat(radiusData.lon);

    if (!address || isNaN(lat) || isNaN(lon)) {
      alert("Please search for an address first.");
      selected.innerText = 'Choose One';
      selected.dataset.value = '';
      return;
    }

    selected.innerText = radiusLabels[value] || `${value} mi radius`;
    selected.dataset.value = value;
    options.style.display = 'none';

    if (addressMap.has(address)) {
      const old = addressMap.get(address);
      if (old.circle) map.removeLayer(old.circle);

      const { circle } = drawCircle(lat, lon, value, address);

      addressMap.set(address, {
        ...old,
        radius: value,
        circle
      });
    }

    document.getElementById('clearWrapper').classList.add('visible');
  });
});

document.addEventListener('click', e => {
  if (!dropdown.contains(e.target)) {
    options.style.display = 'none';
  }
});

document.getElementById('clearAll').addEventListener('click', () => {
  addressMap.forEach(({ marker, circle }) => {
    if (marker) map.removeLayer(marker);
    if (circle) map.removeLayer(circle);
  });
  addressMap.clear();

  // Hide delete button
  if (deleteMarker) {
    map.removeLayer(deleteMarker);
    deleteMarker = null;
  }
  selectedRadius = null;

  const radius = document.getElementById('radius');
  radius.classList.remove('visible');
  dropdown.classList.add('disabled');
  selected.innerText = 'Choose One';
  selected.dataset.value = '';
  document.getElementById('clearWrapper').classList.remove('visible');
});

// Label & Marker Scaling
function updateMarkerLabelScale() {
  const zoom = map.getZoom();
  const scale = Math.pow(0.9, 10 - zoom);

  const markers = document.querySelectorAll('.zoom-scale-marker');

  markers.forEach(marker => {
    marker.style.transform = `scale(${scale})`;
    // Don't override transform-origin - let CSS handle it
  });
}

// Handle clicking a label to change radius OR clicking map to place pin
map.on('click', (e) => {
    const label = e.originalEvent.target.closest('.custom-label');
    const deleteBtn = e.originalEvent.target.closest('.delete-radius-btn');
    
    // Don't do anything if clicking delete button
    if (deleteBtn) return;

    // Hide delete button when clicking elsewhere
    if (deleteMarker) {
      map.removeLayer(deleteMarker);
      deleteMarker = null;
      selectedRadius = null;
    }
    
    // If clicked on a label, handle label click
    if (label) {
      const address = label.dataset.address;
      const data = addressMap.get(address);
      if (!data) return;

      // Update input field
      const input = document.getElementById('addressInput');
      input.value = address;
      input.focus();
    
      // Update radius UI
      const radiusUI = document.getElementById('radius');
      radiusUI.classList.add('visible');
      radiusUI.dataset.address = address;
      radiusUI.dataset.lat = data.lat;
      radiusUI.dataset.lon = data.lon;
    
      enableCustomDropdown();

      // Update dropdown selection
      const currentRadius = data.radius;
      if (currentRadius) {
          selected.innerText = radiusLabels[currentRadius] || `${currentRadius} mi radius`;
          selected.dataset.value = currentRadius;

          optionItems.forEach(option => {
              if (parseInt(option.dataset.value) === currentRadius) {
                  option.classList.add('active-option');
              } else {
                  option.classList.remove('active-option');
              }
          });
      } else {
          selected.innerText = 'Choose One';
          selected.dataset.value = '';
      }
    
      // Scroll to dropdown into view
      document.getElementById('radiusSelect')?.scrollIntoView({ behavior: 'smooth' });
    } 
    // If clicked on empty map, place a new pin (only if mode is enabled)
    else if (pinPlacementMode) {
      const { lat, lng } = e.latlng;
      reverseGeocode(lat, lng);
    }
   // Show reminder if clicking map while feature is off
    else {
      const banner = document.getElementById('click-banner');
      const message = document.getElementById('banner-message');
      const icon = document.querySelector('.banner-icon');
      
      message.textContent = 'Turn on "Add Pins by Clicking Map" to place pins';
      icon.textContent = '!';
      banner.classList.add('show');
      
      setTimeout(() => {
        banner.classList.remove('show');
      }, 3000);
    }
});

// === Google Places: Dealership Search ===
async function fetchNearbyDealerships(lat, lon, radiusMiles) {
  const radiusMeters = radiusMiles * 1609.34;
  const apiKey = 'YOUR_SECURED_API_KEY_HERE'; // Replace this
  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radiusMeters}&type=car_dealer&key=${apiKey}`;

  try {
    const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(endpoint)}`);
    const data = await response.json();

    if (data.results?.length) {
      data.results.forEach(place => {
        const { name, geometry } = place;
        const dealerMarker = L.marker([geometry.location.lat, geometry.location.lng], {
          icon: L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          })
        }).bindPopup(`<strong>${name}</strong>`);

        dealerMarker.addTo(map);
      });
    } else {
      console.log('No dealerships found nearby.');
    }
  } catch (err) {
    console.error('Dealership fetch error:', err);
  }
}
