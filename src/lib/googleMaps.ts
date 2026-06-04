'use client';
// Lightweight Google Maps JS API loader (no extra npm dep).
// Reads the key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.

let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps unavailable on server'));
  if ((window as any).google?.maps?.Map) return Promise.resolve((window as any).google.maps);
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Maps API key missing (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)'));

  loadPromise = new Promise((resolve, reject) => {
    // callback fires only once google.maps (incl. the Map constructor) is ready.
    (window as any).__gmapsReady = () => resolve((window as any).google.maps);
    if (document.getElementById('gmaps-sdk')) {
      if ((window as any).google?.maps?.Map) resolve((window as any).google.maps);
      return;
    }
    const s = document.createElement('script');
    s.id = 'gmaps-sdk';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__gmapsReady`;
    s.async = true;
    s.onerror = () => { loadPromise = null; reject(new Error('Failed to load Google Maps')); };
    document.head.appendChild(s);
  });
  return loadPromise;
}
