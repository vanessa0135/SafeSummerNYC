const HOT_THRESHOLD = 85; //hard coding the heat 
const HARD_CODED_TEMP = 95;

const USER_LOCATION = { //Hard coding user's location
    name: "Times Square, Manhattan",
    lat: 40.7580,
    lng: -73.9855
};

const SEARCH_RADIUS_MILES = 2;

const DATA_FILES = { //hard coding the json files - add them to the frontend folder
    cooling: "Energy_and_WAter_Services_Cooling_Centers.json",
    water: "data/water-fountains.json",
    bathroom: "data/bathrooms.json",
    charging: "data/charging-stations.json"
};

//test data for nearby places - can be removed when json files are added
// temporary test data
  const testData = {
    cooling: [
      {
        name: "Test Cooling Center",
        address: "200 W 43rd St, New York, NY",
        borough: "Manhattan",
        lat: 40.7572,
        lng: -73.9897
      },
      {
        name: "Test Cooling Center 2",
        address: "210 W 47th St, New York, NY",
        borough: "Manhattan",
        lat: 40.7609,
        lng: -73.9875
      }
    ],
    water: [
      {
        name: "Test Water Fountain",
        address: "Bryant Park, New York, NY",
        borough: "Manhattan",
        lat: 40.7536,
        lng: -73.9832
      }
    ],
    bathroom: [
      {
        name: "Test Public Bathroom",
        address: "Bryant Park, New York, NY",
        borough: "Manhattan",
        lat: 40.7539,
        lng: -73.9840
      }
    ],
    charging: [
      {
        name: "Test Charging Station",
        address: "7th Ave & W 44th St, New York, NY",
        borough: "Manhattan",
        lat: 40.7585,
        lng: -73.9851
      }
    ]
  };


let currentType = "cooling";
let map;
let userMarker;
let featureMarkers = [];
let radiusCircle;
let temp = HARD_CODED_TEMP; // change this for dynamic temperatures

const tempValue = document.getElementById("tempValue"); //for displaying temp
const tempBox = document.querySelector(".temp-box"); // for changing background color of temp
const weatherAlert = document.getElementById("weatherAlert"); //displaying weather message
const resultsTitle = document.getElementById("resultsTitle");
const userLocationLabel = document.getElementById("userLocationLabel");
const nearestCard = document.getElementById("nearestCard");
const resultsList = document.getElementById("resultsList");
const loadingOverlay = document.getElementById("loadingOverlay");
const buttons = document.querySelectorAll(".feature-btn");

// Initialize the app once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    tempValue.textContent = `${temp}°F`;
    userLocationLabel.textContent = `User location: ${USER_LOCATION.name}`;

    showWeatherAlert();
    updateTempBoxColor(temp); 
    initMap();
    attachButtonEvents();
    loadAndDisplayPlaces(currentType);

});


function showWeatherAlert() { 

    if (temp >= HOT_THRESHOLD) {

    weatherAlert.classList.remove("hidden");
    weatherAlert.innerHTML = `
        <strong>Heat Alert:</strong> It is ${temp}°F today.
        Stay cool indoors when possible. Use this app to find the nearest cooling center or other essential stops.
    `;
    } else {
    weatherAlert.classList.add("hidden");
    }
}

function updateTempBoxColor(temp) {
    tempBox.classList.remove("temp-hot", "temp-warm", "temp-mild", "temp-cool");
    //update temp box color

    
    if (temp >= HOT_THRESHOLD) 
    {
        tempBox.style.backgroundColor = "red";
      //change color to orange
    }
    else if (temp < HOT_THRESHOLD && temp >= 70) {
        tempBox.style.backgroundColor = "#98F051";
      //change color to greenish yellow
    }
    else {
        tempBox.style.backgroundColor = "skyblue";
      //default color blue or hidden
    }
}


function attachButtonEvents() {
    buttons.forEach(button => {
        button.addEventListener("click", () => {
        buttons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        currentType = button.dataset.type;
        loadAndDisplayPlaces(currentType);
        });
    });
}
Show loading overlay while fetching data
function showLoading() {
    loadingOverlay.classList.remove("hidden");
}
Hide loading overlay after data is loaded
function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

function getTitle(type) {
    const titles = {
        cooling: "Nearest Cooling Centers",
        water: "Nearest Water Fountains",
        bathroom: "Nearest Public Bathrooms",
        charging: "Nearest Charging Stations"
    };
    return titles[type];
}
// Initialize the Leaflet map
function initMap() {
    map = L.map("map").setView([USER_LOCATION.lat, USER_LOCATION.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    userMarker = L.marker([USER_LOCATION.lat, USER_LOCATION.lng])
    .addTo(map)
    .bindPopup(`<strong>You are here</strong><br>${USER_LOCATION.name}`);

    radiusCircle = L.circle([USER_LOCATION.lat, USER_LOCATION.lng], {
        radius: milesToMeters(SEARCH_RADIUS_MILES),
        color: "#2563eb",
        fillColor: "#93c5fd",
        fillOpacity: 0.15
    }).addTo(map);
}
// Remove existing feature markers from the map
function clearFeatureMarkers() {
    featureMarkers.forEach(marker => map.removeLayer(marker));
    featureMarkers = [];
}

async function loadAndDisplayPlaces(type) {
    showLoading();
    resultsTitle.textContent = getTitle(type);

    try {
        const response = await fetch(DATA_FILES[type]);
        const places = await response.json();

        // For testing without actual data, you can use the hardcoded testData instead:
        // setTimeout(() => {
        //     const nearbyPlaces = getNearbyPlaces(places, USER_LOCATION, SEARCH_RADIUS_MILES);
        //     renderPlaces(nearbyPlaces, type);
        //     hideLoading();
        // }, 1200);

        

        const nearbyPlaces = getNearbyPlaces(
            places,
            USER_LOCATION,
            SEARCH_RADIUS_MILES
        );

        renderPlaces(nearbyPlaces, type);
        hideLoading();

    } catch (error) {
        console.error("Error loading data:", error);
        nearestCard.innerHTML = `<p>Could not load data.</p>`;
        resultsList.innerHTML = "";
        hideLoading();
    }
}

//Calculate distance of locations and filter/sort based on distance and radius
function getNearbyPlaces(places, userLocation, radiusMiles) {
    const withDistance = places.map(place => {
        const distance = haversineMiles(
        userLocation.lat,
        userLocation.lng,
        place.lat,
        place.lng
        );

        return { ...place, distance };
    });

    return withDistance
        .filter(place => place.distance <= radiusMiles)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
}

//
function haversineMiles(lat1, lng1, lat2, lng2) {
    const R = 3958.8;
    const dLat = degreesToRadians(lat2 - lat1);
    const dLng = degreesToRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(degreesToRadians(lat1)) *
        Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
}

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function milesToMeters(miles) {
  return miles * 1609.34;
}

function renderPlaces(places, type) {
    clearFeatureMarkers();

    if (places.length === 0) {
        nearestCard.innerHTML = `
        <h3>No results found</h3>
        <p>No ${type} locations were found within ${SEARCH_RADIUS_MILES} miles.</p>
        `;
        resultsList.innerHTML = "";
        return;
    }

    const nearest = places[0];

    nearestCard.innerHTML = `
        <h3>${nearest.name}</h3>
        <p>${nearest.address}</p>
        <p><strong>Borough:</strong> ${nearest.borough}</p>
        <p><strong>Distance:</strong> ${nearest.distance.toFixed(2)} miles away</p>
    `;

    resultsList.innerHTML = places.map(place => `
        <div class="result-item">
        <h4>${place.name}</h4>
        <p>${place.address}</p>
        <p>${place.borough}</p>
        <p><strong>${place.distance.toFixed(2)} miles away</strong></p>
        </div>
    `).join("");

    places.forEach(place => {
        const marker = L.marker([place.lat, place.lng])
        .addTo(map)
        .bindPopup(`
            <strong>${place.name}</strong><br>
            ${place.address}<br>
            ${place.distance.toFixed(2)} miles away
        `);

        featureMarkers.push(marker);
    });

    const bounds = L.latLngBounds([
        [USER_LOCATION.lat, USER_LOCATION.lng],
        ...places.map(place => [place.lat, place.lng])
    ]);

    map.fitBounds(bounds, { padding: [50, 50] });
}