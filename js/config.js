// Configuration & Constants

export const MAP_CONFIG = {
  initialView: [39.8283, -98.5795],
  initialZoom: 5,
  tileLayer: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; OpenStreetMap contributors"
};

export const RADIUS_OPTIONS = {
  15: "Small - 15 mi",
  30: "Large - 30 mi"
};

export const CIRCLE_STYLE = {
  color: "#3D1B5B",
  weight: 1.5,
  fillColor: "#3D1B5B",
  fillOpacity: 0.15
};

export const MILES_TO_METERS = 1609.34;

export const API_CONFIG = {
  overpassUrl: "https://overpass-api.de/api/interpreter"
};

export const DEALERSHIP_CONFIG = {
  // OpenStreetMap tags for car dealerships
  tags: [
    'shop=car',
    'shop=car_repair', 
    'shop=car_parts'
  ],
  // filter to only car sales (not repair shops)
  salesOnly: true
};

export const GEOCODING = {
  searchUrl: "https://nominatim.openstreetmap.org/search",
  reverseUrl: "https://nominatim.openstreetmap.org/reverse"
};