'use client';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

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
    let mounted = true;
    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !containerRef.current || mapRef.current) return;
        const initLat = Number(lat) || DEFAULT_LAT;
        const initLng = Number(lng) || DEFAULT_LNG;
        const map = new maps.Map(containerRef.current, {
          center: { lat: initLat, lng: initLng }, zoom: 12,
          streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false,
        });
        mapRef.current = map;

        const marker = new maps.Marker({ position: { lat: initLat, lng: initLng }, map, draggable: true });
        markerRef.current = marker;

        const update = (latLng: any) => {
          const newLat = parseFloat(latLng.lat().toFixed(6));
          const newLng = parseFloat(latLng.lng().toFixed(6));
          setCoords({ lat: newLat, lng: newLng });
          onChange(newLat, newLng);
        };
        marker.addListener('dragend', (e: any) => update(e.latLng));
        map.addListener('click', (e: any) => { marker.setPosition(e.latLng); update(e.latLng); });

        setReady(true);
      })
      .catch(err => console.error('Google Maps failed to load:', err));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (e.g. user types into input) back to the map
  useEffect(() => {
    const newLat = Number(lat);
    const newLng = Number(lng);
    if (!mapRef.current || !markerRef.current || !newLat || !newLng) return;
    markerRef.current.setPosition({ lat: newLat, lng: newLng });
    mapRef.current.panTo({ lat: newLat, lng: newLng });
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
