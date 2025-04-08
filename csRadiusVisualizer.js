// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


map.on('zoomend', updateMarkerLabelScale);

// Storage
const addressMap = new Map(); // { address: { lat, lon, radius, circle, marker } }

// Radius labels
const radiusLabels = {
    15: 'Small - 15 mi',
    30: 'Large - 30 mi'
  };
  

// Create labeled pin icon
function createLabeledPinIcon(address, miles) {
  return L.divIcon({
    className: '',
    html: `
        <div class="marker-container zoom-scale-marker">
        <div class="custom-label zoom-scale-label" data-address="${address}">
            <div><strong>${address}</strong></div>
            <div class="subtext">${radiusLabels[miles] || ''}</div>
        </div>
        </div>
    `,
    iconSize: [100, 80],
    iconAnchor: [50, 30], 
  });
}

// Address Search
document.getElementById('searchButton').addEventListener('click', () => {
  const address = document.getElementById('addressInput').value.trim();
  if (address) geocodeAddress(address);
});

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

  const existing = addressMap.get(address);
  if (existing?.marker) {
    const updatedIcon = createLabeledPinIcon(address, miles);
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
  const labels = document.querySelectorAll('.zoom-scale-label');

  markers.forEach(marker => {
    marker.style.transform = `scale(${scale})`;
    marker.style.transformOrigin = 'bottom center';
  });

  labels.forEach(label => {
    label.style.transform = `scale(${scale})`;
    label.style.transformOrigin = 'left center';
  });
}

// Handle clicking a label to change radius
map.on('click', (e) => {
    const label = e.originalEvent.target.closest('.custom-label');
    if (!label) return;
  
    const address = label.dataset.address;
    const data = addressMap.get(address);
    if (!data) return;

    //Update input field
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
