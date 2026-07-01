# transitdxb

An early web-based prototype of a Dubai ride-planning tool: pick a destination on a map, see nearby Salik toll gates, and get pointed to a ride. This was the proof-of-concept that later became the native [TransitGo](https://github.com/AkkiCode06/TransitGo) app.

## What it does

- Leaflet map centered on Dubai with Salik toll gate markers loaded from `salik_gates.json`
- Geolocation to auto-fill your current pickup location
- Google Places Autocomplete (restricted to the UAE) for destination search

## Structure

- `index.html` / `app.js` / `style.css` — the core web prototype
- `ContentView.swift` / `TransitDBApp.swift` — a thin iOS WebView wrapper around the prototype
- `expo-app/` — the same idea wrapped as a React Native (Expo) app using `react-native-webview`

## Running the web prototype

Serve the directory and open `index.html` — needs a Google Maps Places API key wired into the page.
