// Geocoding Functions - Forward & Reverse

import { GEOCODING } from './config.js';
import { map, updateMarkerLabelScale } from './map.js';
import { addressMap } from './storage.js';
import { createLabeledPinIcon } from './markers.js';
import { enableCustomDropdown } from './ui.js';

// Forward geocoding: Address → Coordinates
export function geocodeAddress(address) {
  const url = `${GEOCODING.searchUrl}?format=json&q=${encodeURIComponent(address)}`;
  
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      if (!data.length) {
        alert("Address not found.");
        return;
      }

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
          icon: createLabeledPinIcon(address, ""),
        }).addTo(map);

        addressMap.set(address, {
          lat,
          lon,
          radius: null,
          circle: null,
          marker,
        });

        const radiusUI = document.getElementById("radius");
        radiusUI.classList.add("visible");
        radiusUI.dataset.address = address;
        radiusUI.dataset.lat = lat;
        radiusUI.dataset.lon = lon;

        enableCustomDropdown();
        updateMarkerLabelScale();
      }, 2000);
    })
    .catch((err) => {
      console.error("Geocoding error:", err);
      alert("There was an error processing your request.");
    });
}

// Reverse geocoding: Coordinates → Address
export function reverseGeocode(lat, lon) {
  const url = `${GEOCODING.reverseUrl}?format=json&lat=${lat}&lon=${lon}`;
  
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
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

      const shortAddress = parts.length > 0 ? parts.join(", ") : fullAddress;

      // Remove old marker/circle if exists
      if (addressMap.has(shortAddress)) {
        const old = addressMap.get(shortAddress);
        if (old.marker) map.removeLayer(old.marker);
        if (old.circle) map.removeLayer(old.circle);
      }

      const marker = L.marker([lat, lon], {
        icon: createLabeledPinIcon(shortAddress, "", fullAddress),
      }).addTo(map);

      addressMap.set(shortAddress, {
        lat,
        lon,
        radius: null,
        circle: null,
        marker,
        fullAddress: fullAddress,
      });

      // Update UI
      document.getElementById("addressInput").value = shortAddress;
      const radiusUI = document.getElementById("radius");
      radiusUI.classList.add("visible");
      radiusUI.dataset.address = shortAddress;
      radiusUI.dataset.lat = lat;
      radiusUI.dataset.lon = lon;

      enableCustomDropdown();
      updateMarkerLabelScale();
    })
    .catch((err) => {
      console.error("Reverse geocoding error:", err);
      alert("There was an error processing your request.");
    });
}