const circles = []; // store all drawn circles
const labelMarker = []; // store all label markers
const allAddressMarkers = [];
const allAddressData = []; // Stores { address, lat, lon }

// Initialize map
const map = L.map('map').setView([39.8283, -98.5795], 5); // Set initial zoom and coordinates
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Storage
const addressMap = new Map(); // { address: { lat, lon, radius, circle, label } }

var lat, lon //Variable to store lat/lon of searched address

// Marker icon
const purpleMarkerIcon = L.divIcon({
    className: 'custom-marker',
    html: `
        <div class="pin-wrapper">
            <div class="pin-circle"></div>
            <div class="pin-inner"></div>
        </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
});

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
            //Remove previous search marker if exists
            if (map._marker) {
                map.removeLayer(map._marker);
            }

            map._marker = L.marker([lat, lon], {icon: purpleMarkerIcon})
                .addTo(map)
                .bindPopup(`
                    <div class="marker-popup">
                    <strong>${address}</strong><br>
                    </div>
                `).openPopup(); 

            //Show radius dropdown after successful address search
            // Store address and location
            const radiusWrapper = document.getElementById('radius');
            radiusWrapper.style.visibility = 'visible';
            radiusWrapper.style.opacity = '1';
            radiusWrapper.dataset.address = address;
            radiusWrapper.dataset.lat = lat;
            radiusWrapper.dataset.lon = lon;

            enableCustomDropdown();

        }, 2000); // Matches duration of flyTo effect
        //Catches and logs any network or fetch-related errors, then shows an alert.
    })
        .catch(error => {
        console.error("Geocoding error:", error);
        alert("There was an error processing your request.");
    });
}

//Draw circle and label
function drawCircle(lat, lon, miles, label = null) {
    const radiusInMeters = miles * 1609.34 //Convert miles to meters (1 mile = 1609.34 meters)

    //Draw radius circle on map
    const circle = L.circle([lat,lon], {
        color: '#A84DCF',
        fillColor: '#A84DCF',
        fillOpacity: 0.25,
        radius: radiusInMeters //Radius in meters
    }).addTo(map);

    //Floating label using L.divIcon
    const labelMarker = L.marker([lat, lon], {
        icon: L.divIcon({
            className: 'custom-label',
            html: `
                <div class="label-badge">
                    <strong>${label}</strong></br>
                    ${miles}mi
                </div>
                `,
                iconSize: [100, 40],  // Label size
                iconAnchor: [-10, -50],  // Position of label relative to pin
        }),
        interactive: false // Prevents from being clicked 
    }).addTo(map);

    return { circle, label: labelMarker }
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


        //Remove existing circle/label
        if (addressMap.has(address)) {
            const { circle, label} =  addressMap.get(address);
            map.removeLayer(circle);
            map.removeLayer(label)
        }

        //Draw new circle/label
        const newData = drawCircle(lat, lon, value, address);
        addressMap.set(address, { lat, lon, radius: value, ...newData});
       
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
    //Remove radius circles and labels
    addressMap.forEach(({circle, label}) => {
        map.removeLayer(circle);
        map.removeLayer(label);
    });
    addressMap.clear();

    // Remove the searched marker
    if (map._marker) {
        map.removeLayer(map._marker);
        delete map._marker;
    }

    // Reset UI
    const radius = document.getElementById('radius');
    radius.style.visibility = 'hidden';
    radius.style.opacity = '0';
    dropdown.classList.add('disabled');
    selected.innerText = 'Select Cars Social Type';
    selected.dataset.value = '';
    document.getElementById('clearWrapper').classList.remove('visible')
});