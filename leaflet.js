// This is a simple Leaflet map example
var map = L.map('map').setView([39.8283, -98.5795], 4); // Set initial zoom and coordinates

// Add a tile layer (credit: OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

//This script allows a user to type an address into a search box, click search, and retrieve the latitude and longitude of that address using the Nominatim API
//Address search function
document.getElementById('searchButton').addEventListener('click', function() { // Get the address from the input field when Search button is clicked
    var address = document.getElementById('addressInput').value; 
    geocodeAddress(address) //Calls function with user's address input as parameters
});

function geocodeAddress(address) { 
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`; //Constructs a URL to call the Nominatim API, passing the address as a query.

    fetch(url) //Uses the fetch() function to call the API.
    .then(response => response.json()) // Converts the response to JSON.
    .then(data => {
        console.log(data); //Logs the data to the console so you can inspect what was returned.

        if (data.length > 0) { //Checks if any results were returned
        const lat = parseFloat(data[0].lat); // Pulls the Lat/Lon from the first result (data[0]) and converts Lat string to number
        const lon = parseFloat(data[0].lon); // Pulls the Lat/Lon from the first result (data[0]) and converts Lon string to number
        console.log(`Latitude: ${lat}, Longitude: ${lon}`); //Logs the coordinates to the console

        //Fly to and zoom into searched location
        map.flyTo([lat, lon], 12, {
            duration: 2 //Duration of effect
        });

        //Add marker of searched location
        setTimeout(() => {
        L.marker([lat, lon]) //Creates marker at searched address, adds to map, and pops up
            .addTo(map)
            .bindPopup(`<b>${address}</>`);
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
