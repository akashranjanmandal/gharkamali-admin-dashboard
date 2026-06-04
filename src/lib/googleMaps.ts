'use client';
// Lightweight Google Maps JS API loader (no extra npm dep).
// Reads the key from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.

let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps unavailable on server'));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google.maps);
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Google Maps API key missing (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)'));

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('gmaps-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).google.maps));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'gmaps-sdk';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve((window as any).google.maps);
    s.onerror = () => { loadPromise = null; reject(new Error('Failed to load Google Maps')); };
    document.head.appendChild(s);
  });
  return loadPromise;
}
