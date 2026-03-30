'use client';
import { useEffect, useRef, useState } from 'react';

export type LatLng = [number, number]; // [lat, lng]

interface Props {
  points: LatLng[];
  onChange: (points: LatLng[]) => void;
  readOnly?: boolean;
}

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946; // Bangalore

let leafletCss = false;

export default function GeofenceMapPicker({ points, onChange, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [localPoints, setLocalPoints] = useState<LatLng[]>(points);

  useEffect(() => {
    let L: any;

    const init = async () => {
      L = await import('leaflet');
      if (!leafletCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        leafletCss = true;
      }

      // Fix default icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!containerRef.current || mapRef.current) return;

      const center: LatLng = localPoints.length > 0 ? localPoints[0] : [DEFAULT_LAT, DEFAULT_LNG];
      const map = L.map(containerRef.current).setView(center, 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Render existing points
      renderPolygon(L, map, localPoints);

      if (!readOnly) {
        map.on('click', (e: any) => {
          const newPt: LatLng = [
            parseFloat(e.latlng.lat.toFixed(6)),
            parseFloat(e.latlng.lng.toFixed(6)),
          ];
          setLocalPoints(prev => {
            const updated = [...prev, newPt];
            renderPolygon(L, map, updated);
            onChange(updated);
            return updated;
          });
        });
      }

      setReady(true);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        polygonRef.current = null;
        markersRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPolygon = (L: any, map: any, pts: LatLng[]) => {
    // Remove existing polygon and markers
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (pts.length === 0) return;

    const smallIcon = L.divIcon({
      className: '',
      html: `<div style="width:10px;height:10px;border-radius:50%;background:#03411a;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    pts.forEach((pt, idx) => {
      const marker = L.marker(pt, { icon: smallIcon, draggable: !readOnly }).addTo(map);
      if (!readOnly) {
        marker.on('dragend', () => {
          const ll = marker.getLatLng();
          setLocalPoints(prev => {
            const updated = [...prev];
            updated[idx] = [parseFloat(ll.lat.toFixed(6)), parseFloat(ll.lng.toFixed(6))];
            renderPolygon(L, map, updated);
            onChange(updated);
            return updated;
          });
        });
      }
      markersRef.current.push(marker);
    });

    if (pts.length >= 2) {
      const poly = L.polygon(pts, {
        color: '#03411a',
        fillColor: '#4ade80',
        fillOpacity: 0.25,
        weight: 2.5,
        dashArray: pts.length < 3 ? '6 4' : undefined,
      }).addTo(map);
      polygonRef.current = poly;
      if (pts.length >= 3) map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    }
  };

  const undoLast = () => {
    setLocalPoints(prev => {
      const updated = prev.slice(0, -1);
      import('leaflet').then(L => {
        if (mapRef.current) renderPolygon(L, mapRef.current, updated);
      });
      onChange(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setLocalPoints([]);
    if (mapRef.current) {
      if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    }
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
