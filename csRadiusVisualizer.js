// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.on('zoomend', updateMarkerLabelScale);

// Storage
const addressMap = new Map(); // { address: { lat, lon, radius, circle, marker } }

// Create labeled pin icon
function createLabeledPinIcon(address, miles) {
  return L.divIcon({
    className: '',
    html: `
        <div class="marker-container zoom-scale-marker"">
        <div class="custom-label zoom-scale-label" data-address="${address}">
            <div><strong>${address}</strong></div>
            <div class="subtext">${miles ? miles + ' mi radius' : ''}</div>
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
    fillColor: '#3D1B5B',
    fillOpacity: 0.15,
    radius: radiusInMeters
  }).addTo(map);

  const existing = addressMap.get(address);
  if (existing?.marker) {
    const updatedIcon = createLabeledPinIcon(address, miles);
    existing.marker.setIcon(updatedIcon);
  }

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
  selected.innerText = 'Select Cars Social Type';
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
      selected.innerText = 'Select Cars Social Type';
      selected.dataset.value = '';
      return;
    }

    selected.innerText = text;
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
  selected.innerText = 'Select Cars Social Type';
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
    document.getElementById('addressInput').value = address;
  
    // Populate the radius UI with this address
    const radiusUI = document.getElementById('radius');
    radiusUI.classList.add('visible');
    radiusUI.dataset.address = address;
    radiusUI.dataset.lat = data.lat;
    radiusUI.dataset.lon = data.lon;
  
    enableCustomDropdown();
  
    // Scroll to dropdown (optional, if sidebar is long)
    document.getElementById('radiusSelect')?.scrollIntoView({ behavior: 'smooth' });
  });
  