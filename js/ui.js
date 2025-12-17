// UI Interactions - Dropdowns, Toggles, Banners, Mobile Sheet

import { RADIUS_OPTIONS } from './config.js';
import { map } from './map.js';
import { addressMap, getDeleteMarker, clearDeleteMarker, clearSelectedRadius } from './storage.js';
import { drawCircle } from './markers.js';
import { reverseGeocode } from './geocoding.js';

// Track pin placement mode
export let pinPlacementMode = false;

// DOM elements
const dropdown = document.getElementById("radiusSelect");
const selected = dropdown.querySelector(".dropdown-selected");
const options = dropdown.querySelector(".dropdown-options");
const optionItems = dropdown.querySelectorAll(".dropdown-option");

// Enable custom dropdown
export function enableCustomDropdown() {
  dropdown.classList.remove("disabled");
  selected.innerText = "Choose One";
  selected.dataset.value = "";
}

// Initialize dropdown functionality
export function initDropdown() {
  selected.addEventListener("click", () => {
    if (dropdown.classList.contains("disabled")) {
      alert("Please search for an address first.");
      return;
    }
    options.style.display = options.style.display === "block" ? "none" : "block";
  });

  optionItems.forEach((option) => {
    option.addEventListener("click", () => {
      const value = parseInt(option.dataset.value);
      const text = option.innerText;

      const radiusData = document.getElementById("radius").dataset;
      const address = radiusData.address;
      const lat = parseFloat(radiusData.lat);
      const lon = parseFloat(radiusData.lon);

      if (!address || isNaN(lat) || isNaN(lon)) {
        alert("Please search for an address first.");
        selected.innerText = "Choose One";
        selected.dataset.value = "";
        return;
      }

      selected.innerText = RADIUS_OPTIONS[value] || `${value} mi radius`;
      selected.dataset.value = value;
      options.style.display = "none";

      if (addressMap.has(address)) {
        const old = addressMap.get(address);
        if (old.circle) map.removeLayer(old.circle);

        const { circle } = drawCircle(lat, lon, value, address);

        addressMap.set(address, {
          ...old,
          radius: value,
          circle,
        });
      }

      document.getElementById("clearWrapper").classList.add("visible");
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      options.style.display = "none";
    }
  });
}

// Show/hide click banner
export function showClickBanner(isEnabled) {
  const banner = document.getElementById("click-banner");
  const message = document.getElementById("banner-message");
  const icon = document.querySelector(".banner-icon");

  // Update message and icon based on state
  if (isEnabled) {
    message.textContent = "Click-to-add is turned ON";
    icon.textContent = "✓";
  } else {
    message.textContent = "Click-to-add is turned OFF";
    icon.textContent = "✓";
  }

  // Show banner
  banner.classList.add("show");

  // Auto-hide after 3 seconds
  setTimeout(() => {
    banner.classList.remove("show");
  }, 3000);
}

// Initialize toggle pin mode
export function initTogglePinMode() {
  document.getElementById("togglePinMode").addEventListener("change", function () {
    pinPlacementMode = this.checked;

    if (pinPlacementMode) {
      map.getContainer().style.cursor = "crosshair";
      showClickBanner(true);
    } else {
      map.getContainer().style.cursor = "";
      showClickBanner(false);
    }
  });
}

// Initialize clear all button
export function initClearAllButton() {
  document.getElementById("clearAll").addEventListener("click", () => {
    addressMap.forEach(({ marker, circle }) => {
      if (marker) map.removeLayer(marker);
      if (circle) map.removeLayer(circle);
    });
    addressMap.clear();

    // Hide delete button
    const deleteMarker = getDeleteMarker();
    if (deleteMarker) {
      map.removeLayer(deleteMarker);
      clearDeleteMarker();
    }
    clearSelectedRadius();

    const radius = document.getElementById("radius");
    radius.classList.remove("visible");
    dropdown.classList.add("disabled");
    selected.innerText = "Choose One";
    selected.dataset.value = "";
    document.getElementById("clearWrapper").classList.remove("visible");
  });
}

// Initialize map click handler
export function initMapClickHandler() {
  map.on("click", (e) => {
    const label = e.originalEvent.target.closest(".custom-label");
    const deleteBtn = e.originalEvent.target.closest(".delete-radius-btn");

    // Don't do anything if clicking delete button
    if (deleteBtn) return;

    // Hide delete button when clicking elsewhere
    const deleteMarker = getDeleteMarker();
    if (deleteMarker) {
      map.removeLayer(deleteMarker);
      clearDeleteMarker();
      clearSelectedRadius();
    }

    // If clicked on a label, handle label click
    if (label) {
      handleLabelClick(label);
    }
    // If clicked on empty map, place a new pin (only if mode is enabled)
    else if (pinPlacementMode) {
      const { lat, lng } = e.latlng;
      reverseGeocode(lat, lng);
    }
    // Show reminder if clicking map while feature is off
    else {
      showMapClickReminder();
    }
  });
}

// Handle clicking on a marker label
function handleLabelClick(label) {
  const address = label.dataset.address;
  const data = addressMap.get(address);
  if (!data) return;

  // Update input field
  const input = document.getElementById("addressInput");
  input.value = address;
  input.focus();

  // Update radius UI
  const radiusUI = document.getElementById("radius");
  radiusUI.classList.add("visible");
  radiusUI.dataset.address = address;
  radiusUI.dataset.lat = data.lat;
  radiusUI.dataset.lon = data.lon;

  enableCustomDropdown();

  // Update dropdown selection
  const currentRadius = data.radius;
  if (currentRadius) {
    selected.innerText = RADIUS_OPTIONS[currentRadius] || `${currentRadius} mi radius`;
    selected.dataset.value = currentRadius;

    optionItems.forEach((option) => {
      if (parseInt(option.dataset.value) === currentRadius) {
        option.classList.add("active-option");
      } else {
        option.classList.remove("active-option");
      }
    });
  } else {
    selected.innerText = "Choose One";
    selected.dataset.value = "";
  }

  // Scroll dropdown into view
  document.getElementById("radiusSelect")?.scrollIntoView({ behavior: "smooth" });
}

// Show reminder banner when clicking map without pin mode enabled
function showMapClickReminder() {
  const banner = document.getElementById("click-banner");
  const message = document.getElementById("banner-message");
  const icon = document.querySelector(".banner-icon");

  message.textContent = 'Turn on "Add Pins by Clicking Map" to place pins';
  icon.textContent = "!";
  banner.classList.add("show");

  setTimeout(() => {
    banner.classList.remove("show");
  }, 3000);
}

// Initialize mobile bottom sheet touch handlers
export function initMobileSheet() {
  if (window.innerWidth <= 768) {
    const sheet = document.querySelector(".sidebar");
    const handle = document.querySelector(".grab-handle");

    let startY = 0;
    let currentTranslate = 0;
    let isDragging = false;

    handle.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
      },
      { passive: true }
    );

    handle.addEventListener(
      "touchmove",
      (e) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        if (sheet.classList.contains("expanded") && diff > 0) {
          currentTranslate = diff;
          sheet.style.transform = `translateY(${currentTranslate}px)`;
        } else if (!sheet.classList.contains("expanded") && diff < 0) {
          currentTranslate = diff;
          sheet.style.transform = `translateY(calc(75vh - 80px + ${currentTranslate}px))`;
        }
      },
      { passive: true }
    );

    handle.addEventListener("touchend", () => {
      isDragging = false;

      if (Math.abs(currentTranslate) > 50) {
        sheet.classList.toggle("expanded");
      }

      sheet.style.transform = "";
      currentTranslate = 0;
    });

    handle.addEventListener("click", () => {
      sheet.classList.toggle("expanded");
    });
  }
}