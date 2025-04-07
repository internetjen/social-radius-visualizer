const circles = []; // store all drawn circles
const labelMarker = []; // store all label markers
const allAddressMarkers = [];
const allAddressData = []; // Stores { address, lat, lon }

const addressMap = new Map(); // { address: { marker, circle, radius } }


var map = L.map('map').setView([39.8283, -98.5795], 5); // Set initial zoom and coordinates

// Add a tile layer (credit: OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var lat, lon //Variable to store lat/lon of searched address

//This script allows a user to type an address into a search box, click search, and retrieve the latitude and longitude of that address using the Nominatim API
//Address search function
document.getElementById('searchButton').addEventListener('click', function() { // Get the address from the input field when Search button is clicked
    var address = document.getElementById('addressInput').value; 
    geocodeAddress(address) //Calls function with user's address input as parameters
});

const purpleMarkerIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-pin"></div>
      <div class="marker-dot"></div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
});

//Geocoding function
function geocodeAddress(address) { 
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`; //Constructs a URL to call the Nominatim API, passing the address as a query.

    fetch(url) //Uses the fetch() function to call the API.
    .then(response => response.json()) // Converts the response to JSON.
    .then(data => {
        if (data.length > 0) { //Checks if any results were returned
        //Set global lat variable with value from geocode response
         lat = parseFloat(data[0].lat); // Pulls the Lat/Lon from the first result (data[0]) and converts Lat string to number
         lon = parseFloat(data[0].lon); // Pulls the Lat/Lon from the first result (data[0]) and converts Lon string to number

        //Fly to and zoom into searched location
        map.flyTo([lat, lon], 10, {
            duration: 2 //Duration of effect
        });

        //Add marker of searched location
        setTimeout(() => {
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
            document.getElementById('radius').style.visibility = 'visible';
            document.getElementById('radius').style.opacity = '1'
            document.getElementById('radius').setAttribute('data-address', address);
            document.getElementById('radius').setAttribute('data-lat', lat);
            document.getElementById('radius').setAttribute('data-lon', lon);

            enableCustomDropdown();

        }, 2000); // Matches duration of flyTo effect

    } else {
        alert("Address not found."); //If no results were returned, it alerts the user that the address wasn't found.
    }
})

//Catches and logs any network or fetch-related errors, then shows an alert.
.catch(error => {
    console.error("Geocoding error:", error);
    alert("There was an error processing your request.");
});
}

//Draw circle radius round searched location
function drawCircle(lat, lon, miles, label = null) {
    const radiusInMeters = miles * 1609.34 //Convert miles to meters (1 mile = 1609.34 meters)

    //Draw radius circle on map
    const circle = L.circle([lat,lon], {
        color: '#A84DCF',
        fillColor: '#A84DCF',
        fillOpacity: 0.25,
        radius: radiusInMeters //Radius in meters
    }).addTo(map);
    circles.push(circle); //store for future clearing

    //Offset label abvoe circle
    const offsetLat = lat + (miles / 69); // ~1 degree latitude = 69 miles
    const marker = L.marker([offsetLat, lon], {
        icon: purpleMarkerIcon
    }).addTo(map);

    marker.bindPopup(`
        <div class="marker-popup">
            <strong>${label}</strong><br>
            <span>${miles}mi</span>
        </div>
        `).openPopup();

    return { circle, label: marker }
}

//Custom dropdown handling
const dropdown = document.getElementById('radiusSelect');
const selected = dropdown.querySelector('.dropdown-selected');
const options = dropdown.querySelector('.dropdown-options');
const optionItems = dropdown.querySelectorAll('.dropdown-option');

function enableCustomDropdown() {
    dropdown.classList.remove('disabled');
    selected.innerText = 'Select Cars Social Type'
    selected.setAttribute('data-value', '')
}

//Toggle options visibility
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
        const value = parseInt(option.getAttribute('data-value'));
        const text = option.innerText;

        const address = document.getElementById('radius').getAttribute('data-address');
        const lat = parseFloat(document.getElementById('radius').getAttribute('data-lat'));
        const lon = parseFloat(document.getElementById('radius').getAttribute('data-lon'));
    
        if (!address || isNaN(lat) || isNaN(lon)) {
            alert("Please search for an address first.");
            selected.innerText= 'Select Cars Social Type';
            selected.setAttribute('data-value', '');
            return;
        }

        selected.innerText = text;
        selected.setAttribute('data-value', value);
        options.style.display = 'none';


        //Remove circle for this address if exists
        if (addressMap.has(address)) {
            const existing =  addressMap.get(address);
            map.removeLayer(existing.circle);
            map.removeLayer(existing.label)
        }

        //Draw new circle
        const circle = drawCircle(lat, lon, value, address);

        addressMap.set(address, { lat, lon, radius: value, circle: circle.circle, label: circle.label});
       
        // Show clear all button
        document.getElementById('clearWrapper').classList.add('visible');

    });
});

//Close dropdown if clicked outside
document.addEventListener('click', (e) => {
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

    // Hide and reset the dropdown
    document.getElementById('radius').style.visibility = 'hidden';
    document.getElementById('radius').style.opacity = '0';
    dropdown.classList.add('disabled');
    selected.innerText = 'Select Cars Social Type';
    selected.setAttribute('data-value', '');

    // Hide clear button
    document.getElementById('clearWrapper').classList.remove('visible')
});


