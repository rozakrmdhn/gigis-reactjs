import { useState, useCallback, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Point {
    lng: number;
    lat: number;
}

interface UseDrawMapProps {
    mapboxToken?: string;
    container: HTMLDivElement | null;
    refJalanFeatures?: any;
    refSegmenFeatures?: any;
    refSegmenKabFeatures?: any;
    baseJalanFeatures?: any;
    isDrawing?: boolean;
    onRoadSelect?: (id: string) => void;
}

export function useDrawMap({
    mapboxToken,
    container,
    refJalanFeatures,
    refSegmenFeatures,
    refSegmenKabFeatures,
    baseJalanFeatures,
    isDrawing = false,
    onRoadSelect
}: UseDrawMapProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [points, setPoints] = useState<Point[]>([]);
    const [panjang, setPanjang] = useState(0);
    const [isMapReady, setIsMapReady] = useState(false);

    const isDrawingRef = useRef(isDrawing);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        isDrawingRef.current = isDrawing;
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = isDrawing ? 'crosshair' : '';
        }
    }, [isDrawing]);

    // --- Snapping Logic ---
    const findNearestVertex = useCallback((point: mapboxgl.LngLat, map: mapboxgl.Map) => {
        const threshold = 15; // pixels for snapping
        const pointPx = map.project(point);
        const bbox: [mapboxgl.PointLike, mapboxgl.PointLike] = [
            [pointPx.x - threshold, pointPx.y - threshold],
            [pointPx.x + threshold, pointPx.y + threshold]
        ];

        // Query layers for potential snap targets
        const features = map.queryRenderedFeatures(bbox, {
            layers: ['base-jalan-layer', 'ref-jalan-layer', 'ref-segmen-layer', 'ref-segmen-kab-layer']
        });

        if (features.length === 0) {
            // Also snap to existing drawing points
            let minDist = Infinity;
            let snappedPoint = point;

            points.forEach(p => {
                const pPx = map.project([p.lng, p.lat]);
                const dist = Math.hypot(pPx.x - pointPx.x, pPx.y - pointPx.y);
                if (dist < threshold && dist < minDist) {
                    minDist = dist;
                    snappedPoint = new mapboxgl.LngLat(p.lng, p.lat);
                }
            });

            return snappedPoint;
        }

        // Find nearest coordinate in the found features
        let nearestPoint = point;
        let minDistance = Infinity;

        features.forEach(f => {
            const geometry = f.geometry;
            if (geometry.type === 'LineString') {
                const line = turf.lineString(geometry.coordinates as any);
                const pt = turf.point([point.lng, point.lat]);
                const snapped = turf.nearestPointOnLine(line, pt);

                // We prefer snapping to actual vertices for better topology
                // But nearestPointOnLine is good for mid-segment snapping
                const dist = turf.distance(pt, snapped, { units: 'meters' });
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestPoint = new mapboxgl.LngLat(snapped.geometry.coordinates[0], snapped.geometry.coordinates[1]);
                }

                // Check actual vertices for even better precision
                geometry.coordinates.forEach((coord: any) => {
                    const vPx = map.project(coord as [number, number]);
                    const distPx = Math.hypot(vPx.x - pointPx.x, vPx.y - pointPx.y);
                    if (distPx < threshold) {
                        const distMeters = turf.distance(pt, turf.point(coord as [number, number]), { units: 'meters' });
                        if (distMeters < minDistance) {
                            minDistance = distMeters;
                            nearestPoint = new mapboxgl.LngLat(coord[0], coord[1]);
                        }
                    }
                });
            }
        });

        return nearestPoint;
    }, [points]);

    // --- Map Initialization ---
    useEffect(() => {
        if (!container || mapRef.current || typeof window === 'undefined') return;

        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || mapboxToken || '';

        const map = new mapboxgl.Map({
            container,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [111.8328268, -7.2288555],
            zoom: 12,
            antialias: true
        });

        map.on('load', () => {
            // --- Add Sources ---
            map.addSource('base-jalan', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('ref-jalan', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('ref-segmen', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('ref-segmen-kab', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('draw-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addSource('draw-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

            // --- Add Layers ---
            // Base Roads
            map.addLayer({
                id: 'base-jalan-layer',
                type: 'line',
                source: 'base-jalan',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#64748b',
                    'line-width': 3,
                    'line-opacity': 0.8
                }
            });

            // Reference Roads
            map.addLayer({
                id: 'ref-jalan-layer',
                type: 'line',
                source: 'ref-jalan',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#94a3b8',
                    'line-width': 3,
                    'line-opacity': 0.6
                }
            });

            // Segmen Desa
            map.addLayer({
                id: 'ref-segmen-layer',
                type: 'line',
                source: 'ref-segmen',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#22c55e',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            // Segmen Kab
            map.addLayer({
                id: 'ref-segmen-kab-layer',
                type: 'line',
                source: 'ref-segmen-kab',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            // Drawing Line
            map.addLayer({
                id: 'draw-line-layer',
                type: 'line',
                source: 'draw-path',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#EF4444',
                    'line-width': 4
                }
            });

            // -- Removed draw-points-layer to use HTML markers for pulsing effect --

            // Hover effects for base roads
            map.on('mousemove', 'base-jalan-layer', () => {
                if (!isDrawingRef.current) {
                    map.getCanvas().style.cursor = 'pointer';
                }
            });
            map.on('mouseleave', 'base-jalan-layer', () => {
                if (!isDrawingRef.current) {
                    map.getCanvas().style.cursor = '';
                }
            });
            map.on('click', 'base-jalan-layer', (e) => {
                if (!isDrawingRef.current && e.features?.[0]) {
                    const id = e.features[0].properties?.id;
                    if (id && onRoadSelect) onRoadSelect(id);
                }
            });

            // Click for drawing
            map.on('click', (e) => {
                if (isDrawingRef.current) {
                    const snapped = findNearestVertex(e.lngLat, map);
                    setPoints(prev => [...prev, { lng: snapped.lng, lat: snapped.lat }]);
                }
            });

            mapRef.current = map;
            setIsMapReady(true);
        });

        const resizeObserver = new ResizeObserver(() => {
            map.resize();
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
            setIsMapReady(false);
        };
    }, [container, findNearestVertex, onRoadSelect, mapboxToken]);

    // --- Sync Reference Data ---
    useEffect(() => {
        if (!isMapReady || !mapRef.current) return;

        const map = mapRef.current;

        const updateSource = (id: string, data: any) => {
            const source = map.getSource(id) as mapboxgl.GeoJSONSource;
            if (source) {
                source.setData(data || { type: 'FeatureCollection', features: [] });
            }
        };

        updateSource('base-jalan', baseJalanFeatures);
        updateSource('ref-jalan', refJalanFeatures);
        updateSource('ref-segmen', refSegmenFeatures);
        updateSource('ref-segmen-kab', refSegmenKabFeatures);

        // Fit bounds if we have reference data
        const features = [
            ...(refJalanFeatures?.features || []),
            ...(refSegmenFeatures?.features || []),
            ...(refSegmenKabFeatures?.features || [])
        ];

        if (features.length > 0) {
            const collection = turf.featureCollection(features);
            const bbox = turf.bbox(collection);
            map.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]], { padding: 100, duration: 1000 });
        }
    }, [isMapReady, baseJalanFeatures, refJalanFeatures, refSegmenFeatures, refSegmenKabFeatures]);

    // --- Sync Drawing ---
    useEffect(() => {
        if (!isMapReady || !mapRef.current) return;

        const map = mapRef.current;

        // Update Path
        const pathData: any = {
            type: 'FeatureCollection',
            features: points.length > 1 ? [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: points.map(p => [p.lng, p.lat])
                }
            }] : []
        };
        (map.getSource('draw-path') as mapboxgl.GeoJSONSource).setData(pathData);

        // Update Markers (for pulsing effect)
        markersRef.current.forEach(m => m.remove());
        markersRef.current = points.map((p, i) => {
            const el = document.createElement('div');
            el.className = 'custom-draw-marker';

            const isStart = i === 0;
            const isEnd = i === points.length - 1 && i > 0;
            const pulseClass = isStart ? 'marker-pulse-start' : isEnd ? 'marker-pulse-end' : 'bg-slate-600';

            el.innerHTML = `<div class="marker-pulse ${pulseClass}"></div>`;

            return new mapboxgl.Marker({ element: el })
                .setLngLat([p.lng, p.lat])
                .addTo(map);
        });

        // Calculate Length
        if (points.length > 1) {
            const line = turf.lineString(points.map(p => [p.lng, p.lat]));
            setPanjang(turf.length(line, { units: 'meters' }));
        } else {
            setPanjang(0);
        }
    }, [points, isMapReady]);

    // Handle Resize on mode change
    useEffect(() => {
        if (isMapReady && mapRef.current) {
            [50, 150, 300, 500].forEach(delay => {
                setTimeout(() => mapRef.current?.resize(), delay);
            });
        }
    }, [isDrawing, isMapReady]);

    const undoLastPoint = useCallback(() => {
        setPoints(prev => prev.slice(0, -1));
    }, []);

    const clearPoints = useCallback(() => {
        setPoints([]);
    }, []);

    const zoomIn = () => mapRef.current?.zoomIn();
    const zoomOut = () => mapRef.current?.zoomOut();
    const resetBearing = () => {
        mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 1000 });
    };

    return {
        mapRef,
        points,
        panjang,
        undoLastPoint,
        clearPoints,
        zoomIn,
        zoomOut,
        resetBearing
    };
}
