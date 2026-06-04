'use client';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

export type LatLng = [number, number]; // [lat, lng] — DB format, unchanged

interface Props {
  points: LatLng[];
  onChange: (points: LatLng[]) => void;
  readOnly?: boolean;
}

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946; // Bangalore

export default function GeofenceMapPicker({ points, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [localPoints, setLocalPoints] = useState<LatLng[]>(points);

  useEffect(() => {
    let mounted = true;
    loadGoogleMaps()
      .then((maps) => {
        if (!mounted || !containerRef.current || mapRef.current) return;
        mapsRef.current = maps;
        const center: LatLng = localPoints.length > 0 ? localPoints[0] : [DEFAULT_LAT, DEFAULT_LNG];
        const map = new maps.Map(containerRef.current, {
          center: { lat: center[0], lng: center[1] }, zoom: 13,
          streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false,
        });
        mapRef.current = map;
        renderPolygon(maps, map, localPoints);

        if (!readOnly) {
          map.addListener('click', (e: any) => {
            const newPt: LatLng = [parseFloat(e.latLng.lat().toFixed(6)), parseFloat(e.latLng.lng().toFixed(6))];
            setLocalPoints(prev => {
              const updated = [...prev, newPt];
              renderPolygon(maps, map, updated);
              onChange(updated);
              return updated;
            });
          });
        }
        setReady(true);
      })
      .catch(err => console.error('Google Maps failed to load:', err));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPolygon = (maps: any, map: any, pts: LatLng[]) => {
    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null; }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (pts.length === 0) return;

    const icon = { path: maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#03411a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 };

    pts.forEach((pt, idx) => {
      const marker = new maps.Marker({ position: { lat: pt[0], lng: pt[1] }, map, draggable: !readOnly, icon });
      if (!readOnly) {
        marker.addListener('dragend', (e: any) => {
          setLocalPoints(prev => {
            const updated = [...prev];
            updated[idx] = [parseFloat(e.latLng.lat().toFixed(6)), parseFloat(e.latLng.lng().toFixed(6))];
            renderPolygon(maps, map, updated);
            onChange(updated);
            return updated;
          });
        });
      }
      markersRef.current.push(marker);
    });

    if (pts.length >= 2) {
      const poly = new maps.Polygon({
        paths: pts.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#03411a', strokeWeight: 2.5, fillColor: '#4ade80', fillOpacity: 0.25, map,
      });
      polygonRef.current = poly;
      if (pts.length >= 3) {
        const b = new maps.LatLngBounds();
        pts.forEach(([lat, lng]) => b.extend({ lat, lng }));
        map.fitBounds(b, 24);
      }
    }
  };

  const undoLast = () => {
    setLocalPoints(prev => {
      const updated = prev.slice(0, -1);
      if (mapsRef.current && mapRef.current) renderPolygon(mapsRef.current, mapRef.current, updated);
      onChange(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setLocalPoints([]);
    if (polygonRef.current) { polygonRef.current.setMap(null); polygonRef.current = null; }
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    onChange([]);
  };

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid var(--border)', position: 'relative' }}>
      <div ref={containerRef} style={{ height: 340, width: '100%', background: '#e8f0e4' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8f0e4', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Loading map…
        </div>
      )}

      {ready && !readOnly && (
        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 1000 }}>
          <div style={{ background: 'rgba(3,65,26,0.9)', color: '#fff', borderRadius: 99, padding: '5px 14px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins', backdropFilter: 'blur(4px)', whiteSpace: 'nowrap' }}>
            {localPoints.length === 0
              ? 'Click map to add vertices (min 3, no maximum)'
              : localPoints.length < 3
                ? `${localPoints.length} point${localPoints.length > 1 ? 's' : ''} — add ${3 - localPoints.length} more`
                : `${localPoints.length} vertices ✓ — keep clicking for more precision`}
          </div>
          {localPoints.length > 0 && (
            <button onClick={undoLast} style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', border: 'none', borderRadius: 99, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>⟵ Undo</button>
          )}
          {localPoints.length > 0 && (
            <button onClick={clearAll} style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none', borderRadius: 99, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>Clear</button>
          )}
        </div>
      )}

      {ready && readOnly && localPoints.length > 0 && (
        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(3,65,26,0.85)', color: '#fff', borderRadius: 99, padding: '5px 14px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Poppins', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          {localPoints.length} point polygon
        </div>
      )}
    </div>
  );
}
