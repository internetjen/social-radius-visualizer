// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 5); // Set initial zoom and coordinates
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

map.on('zoom', updateMarkerLabelScale);
map.on('zoomend', updateMarkerLabelScale); // more precise control


// Storage
const addressMap = new Map(); // { address: { lat, lon, radius, circle, label } }

// Create labeled pin icon
function createLabeledPinIcon(address, miles) {
    return L.divIcon({
        className: '',
        html: `
            <div class="marker-container zoom-scale-marker">
                <div class="custom-label zoom-scale-label">
                    <div><strong>${address}</strong></div>
                    <div class="subtext">${miles ? miles + 'mi' : ''}</div>
                </div>
                <div class="custom-marker">
                    <div class="pin-wrapper">
                        <div class="pin-circle">
                            <div class="pin-inner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,
        iconSize: [100, 80],
        iconAnchor: [50, 75],
    });
}


// Address Search Handler
document.getElementById('searchButton').addEventListener('click', () => { // Get the address from the input field when Search button is clicked
    const address = document.getElementById('addressInput').value.trim(); 
   if (address) geocodeAddress(address) // Calls function with user's address input as parameters
});

// Geocoding function
function geocodeAddress(address) { 
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`; //Constructs a URL to call the Nominatim API, passing the address as a query.
    fetch(url) //Uses the fetch() function to call the API.
        .then(res => res.json()) // Converts the response to JSON.
        .then(data => {
        if (!data.length) return alert("Address not found."); //Checks if any results were returned
        //Set global lat variable with value from geocode response
         const lat = parseFloat(data[0].lat); // Pulls the Lat/Lon from the first result (data[0]) and converts Lat string to number
         const lon = parseFloat(data[0].lon); // Pulls the Lat/Lon from the first result (data[0]) and converts Lon string to number

        //Fly to and zoom into searched location
        map.flyTo([lat, lon], 10, {
            duration: 2 //Duration of 2 seconds
        });

        //Add marker of searched location
        setTimeout(() => {
            // Create a new marker for this address
            const addressMarker = L.marker([lat, lon], {
                icon: createLabeledPinIcon(address, '')
            }).addTo(map);
            
            // Remove existing marker for this address if it exists
            if (addressMap.has(address)) {
                const oldData = addressMap.get(address);
                if (oldData.marker) map.removeLayer(oldData.marker);
            }

            // Store this address and marker in the addressMap
            addressMap.set(address, {
                lat,
                lon,
                radius: null,
                marker: addressMarker,
                circle: null,
                label: null
            });
            
            //Show radius dropdown
            const radiusWrapper = document.getElementById('radius');
            radiusWrapper.classList.add('visible');
            radiusWrapper.dataset.address = address;
            radiusWrapper.dataset.lat = lat;
            radiusWrapper.dataset.lon = lon;

            enableCustomDropdown();
            updateMarkerLabelScale();
        }, 2000); // Matches duration of flyTo effect
        //Catches and logs any network or fetch-related errors, then shows an alert.
    })
        .catch(error => {
        console.error("Geocoding error:", error);
        alert("There was an error processing your request.");
    });
}

//Draw circle and label
function drawCircle(lat, lon, miles, address = null) {
    const radiusInMeters = miles * 1609.34 //Convert miles to meters (1 mile = 1609.34 meters)

    //Draw radius circle on map
    const circle = L.circle([lat,lon], {
        color: '#A84DCF',
        fillColor: '#A84DCF',
        fillOpacity: 0.25,
        radius: radiusInMeters //Radius in meters
    }).addTo(map);

    // Update existing marker's icon to show label
    const existingData = addressMap.get(address);
    if (existingData?.marker) {
        const updatedIcon = createLabeledPinIcon(address, miles);
        existingData.marker.setIcon(updatedIcon);
    }

    updateMarkerLabelScale();
    return { circle, label: null }
}

// Custom dropdown handling
const dropdown = document.getElementById('radiusSelect');
const selected = dropdown.querySelector('.dropdown-selected');
const options = dropdown.querySelector('.dropdown-options');
const optionItems = dropdown.querySelectorAll('.dropdown-option');

function enableCustomDropdown() {
    dropdown.classList.remove('disabled');
    selected.innerText = 'Select Cars Social Type'
    selected.dataset.value = '';
}

// Toggle options visibility
selected.addEventListener('click', () => {
    if (dropdown.classList.contains('disabled')) {
        alert("Please search for an address first.");
        return;
    }
    options.style.display = options.style.display === 'block' ? 'none' : 'block';
});

//Option selection
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
            selected.innerText= 'Select Cars Social Type';
            selected.setAttribute('data-value', '');
            return;
        }

        selected.innerText = text;
        selected.dataset.value = value;
        options.style.display = 'none';

        if (addressMap.has(address)) {
            const oldData = addressMap.get(address);
            
            // Remove existing circle and label if they exist
            if (oldData.circle) map.removeLayer(oldData.circle);
            if (oldData.label) map.removeLayer(oldData.label);
        
            // Draw new circle/label
            const { circle } = drawCircle(lat, lon, value, address);
        
            // Update that entry with new radius, circle, and label — keep existing marker
            addressMap.set(address, {
                ...oldData,
                radius: value,
                circle,
            });
        }        

        // Show clear all button
        document.getElementById('clearWrapper').classList.add('visible');
    });
});

//Close dropdown if clicked outside
document.addEventListener('click', e => {
    if (!dropdown.contains(e.target)) {
        options.style.display = 'none';
    }
});

//Clear all button
document.getElementById('clearAll').addEventListener('click', () => {
    //Remove ALL markers, circles, and labels
    addressMap.forEach(({marker, circle, label}) => {
        if (marker) map.removeLayer(marker);
        if (circle) map.removeLayer(circle);
        if (label) map.removeLayer(label);
    });
    addressMap.clear();

    // Reset UI
    const radius = document.getElementById('radius');
    radius.style.visibility = 'hidden';
    radius.style.opacity = '0';
    dropdown.classList.add('disabled');
    selected.innerText = 'Select Cars Social Type';
    selected.dataset.value = '';
    document.getElementById('clearWrapper').classList.remove('visible')
});

//Update scale based on zoom
function updateMarkerLabelScale() {
    const zoom = map.getZoom();
    const scale = Math.pow(0.9, 10 - zoom); // Adjust exponent base for faster/slower scaling
  
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
  