// This is a simple Leaflet map example
var map = L.map('map').setView([51.505, -0.09], 13); // Set initial coordinates and zoom level

// Add a tile layer (map tiles)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
