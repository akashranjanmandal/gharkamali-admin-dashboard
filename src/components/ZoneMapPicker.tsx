'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  lat: number | string;
  lng: number | string;
  onChange: (lat: number, lng: number) => void;
}

// Default center: India (New Delhi)
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

export default function ZoneMapPicker({ lat, lng, onChange }: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState({ lat: Number(lat) || DEFAULT_LAT, lng: Number(lng) || DEFAULT_LNG });

  useEffect(() => {
    // Leaflet must be loaded client-side only
    let L: any;
    let map: any;

    const init = async () => {
      L = await import('leaflet');

      // Fix default marker icons (webpack breaks them)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || mapRef.current) return;

      const initLat = Number(lat) || DEFAULT_LAT;
      const initLng = Number(lng) || DEFAULT_LNG;

      map = L.map(containerRef.current, { zoomControl: true }).setView([initLat, initLng], 12);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Place initial marker
      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      const updateCoords = (latLng: any) => {
        const newLat = parseFloat(latLng.lat.toFixed(6));
        const newLng = parseFloat(latLng.lng.toFixed(6));
        setCoords({ lat: newLat, lng: newLng });
        onChange(newLat, newLng);
      };

      marker.on('dragend', () => updateCoords(marker.getLatLng()));
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng);
      });

      setReady(true);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (e.g. user types into input) back to map
  useEffect(() => {
    const newLat = Number(lat);
    const newLng = Number(lng);
    if (!mapRef.current || !markerRef.current || !newLat || !newLng) return;
    markerRef.current.setLatLng([newLat, newLng]);
    mapRef.current.panTo([newLat, newLng]);
  }, [lat, lng]);

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--border)', position: 'relative' }}>
      <div ref={containerRef} style={{ height: 280, width: '100%', background: '#e8f0e4' }} />
      {ready && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(3,65,26,0.9)', color: '#fff', borderRadius: 99,
          padding: '4px 12px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins',
          pointerEvents: 'none', whiteSpace: 'nowrap', backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}>
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </div>
      )}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#e8f0e4', color: 'var(--text-muted)', fontSize: '0.82rem',
        }}>
          Loading map…
        </div>
      )}
    </div>
  );
}
