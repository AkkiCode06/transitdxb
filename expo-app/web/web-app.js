// app.js
/* globals L */
(async () => {
  // ---- 1. Initialise map --------------------------------------------------
  const map = L.map('map', { zoomControl: false }).setView([25.2048, 55.2708], 11); // Dubai centre
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  // ---- 2. Load Salik gates & render markers ---------------------------------
  const gateData = await fetch('salik_gates.json').then(r => r.json());
  const gateIcon = L.divIcon({
    className: 'salik-gate-icon',
    html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#e52e71"><path d="M12 2a10 10 0 00-3.16 19.44c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03 .88 1.5 2.31 1.07 2.87 .82 .09-.64 .35-1.07 .63-1.32-2.22-.25-4.56-1.11-4.56-4.95 0-1.09 .39-1.99 1.03-2.69-.1-.25-.45-1.27 .1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0112 7.8c.85.004 1.71.114 2.51.333 1.91-1.29 2.75-1.02 2.75-1.02 .55 1.38 .2 2.4 .1 2.65 .64 .7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95 .36 .31 .68 .92 .68 1.86v2.76c0 .27 .18 .58 .69 .48A10 10 0 0012 2z"/></svg>`
  });

  gateData.forEach(g => {
    L.marker([g.lat, g.lng], { icon: gateIcon })
      .addTo(map)
      .bindTooltip(g.name, { direction: 'top', offset: [0, -12] });
  });

  // ---- 3. Geolocation – fill pickup field -----------------------------------
  const pickupInput = document.getElementById('pickup');
  let currentPos = null;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        currentPos = [latitude, longitude];
        pickupInput.value = `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
        L.marker(currentPos, { draggable: false })
          .addTo(map)
          .bindPopup('You are here')
          .openPopup();
        map.setView(currentPos, 13);
      },
      err => {
        console.warn('Geolocation error →', err);
        pickupInput.value = 'Unable to get location';
      },
      { enableHighAccuracy: true }
    );
  } else {
    pickupInput.value = 'Geolocation not supported';
  }

  // ---- 4. Google Places Autocomplete ----------------------------------------
  const destInput = document.getElementById('dest-input');
  const autocomplete = new google.maps.places.Autocomplete(destInput, {
    componentRestrictions: { country: 'AE' },
    fields: ['geometry', 'name', 'formatted_address'],
  });

  let destination = null;
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      alert('No geometry data for the selected place.');
      return;
    }
    destination = [place.geometry.location.lat(), place.geometry.location.lng()];
    L.marker(destination, { draggable: false })
      .addTo(map)
      .bindPopup(`<strong>${place.name}</strong>`)
      .openPopup();
  });

  // ---- 5. Route + fare calculation (stubbed) ---------------------------------
  const planBtn = document.getElementById('planBtn');
  const routeInfo = document.getElementById('routeInfo');
  const distSpan = document.getElementById('dist');
  const durSpan = document.getElementById('dur');
  const fareSpan = document.getElementById('fare');

  function computeRtaFare(distanceKm, durationMin, isNight) {
    const perKm = 2.45;
    const perMin = 0.5; // 50 fils per minute
    const baseDay = 9;   // AED (6‑8 AM / 10‑4 PM / 8‑10 PM)
    const baseNight = 10; // AED (10 PM‑6 AM)
    const minFare = isNight ? 13 : 12; // street‑hail / e‑hail minimum
    const base = isNight ? baseNight : baseDay;
    const raw = base + distanceKm * perKm + durationMin * perMin;
    return Math.max(raw, minFare).toFixed(2);
  }

  async function fetchRoute(orig, dest) {
    const url = `https://router.project-osrm.org/route/v1/driving/${orig[1]},${orig[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code !== 'Ok') throw new Error('Routing error');
    return data.routes[0];
  }

  let routeLayer = null;

  planBtn.addEventListener('click', async () => {
    if (!currentPos || !destination) {
      alert('Both current location and a destination are required.');
      return;
    }
    try {
      const route = await fetchRoute(currentPos, destination);
      const geo = route.geometry;
      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(geo, { style: { color: '#e52e71', weight: 5, opacity: 0.8 } }).addTo(map);
      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });

      const distanceKm = (route.distance / 1000).toFixed(2);
      const durationMin = Math.round(route.duration / 60);
      const isNight = (new Date()).getHours() >= 22 || (new Date()).getHours() < 6;

      distSpan.textContent = distanceKm;
      durSpan.textContent = durationMin;
      fareSpan.textContent = computeRtaFare(Number(distanceKm), durationMin, isNight);
      routeInfo.classList.remove('hidden');
    } catch (e) {
      console.error(e);
      alert('Failed to compute the route. See console for details.');
    }
  });
})();
