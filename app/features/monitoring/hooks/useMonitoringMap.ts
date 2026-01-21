import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type GeoJSONFeatureCollection } from '~/features/peta/types';

interface UseMonitoringMapProps {
    mapboxToken: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useMonitoringMap({ mapboxToken, containerRef }: UseMonitoringMapProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [111.8328268, -7.2288555], // Bojonegoro
            zoom: 9.5
        });

        // Removed default NavigationControl

        map.on('load', () => {
            mapRef.current = map;

            // Source for main road (Jalan)
            map.addSource('jalan-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Source for segments (Segmen)
            map.addSource('segmen-source', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Layer for Jalan (Gray)
            map.addLayer({
                id: 'jalan-layer',
                type: 'line',
                source: 'jalan-source',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#808080', // Gray
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });

            // Layer for Segmen (Green)
            map.addLayer({
                id: 'segmen-layer',
                type: 'line',
                source: 'segmen-source',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#22c55e', // Green
                    'line-width': 4
                }
            });
        });

        return () => {
            markersRef.current.forEach(marker => marker.remove());
            map.remove();
            mapRef.current = null;
        };
    }, [mapboxToken]);

    const updateData = (jalanData: GeoJSONFeatureCollection | null, segmenData: GeoJSONFeatureCollection | null, isMobile?: boolean) => {
        if (!mapRef.current) return;

        const jalanSource = mapRef.current.getSource('jalan-source') as mapboxgl.GeoJSONSource;
        const segmenSource = mapRef.current.getSource('segmen-source') as mapboxgl.GeoJSONSource;

        if (jalanSource) {
            jalanSource.setData(jalanData || { type: 'FeatureCollection', features: [] });
        }

        if (segmenSource) {
            segmenSource.setData(segmenData || { type: 'FeatureCollection', features: [] });
        }

        // Fit bounds logic from combined data
        const allFeatures = [
            ...(jalanData?.features || []),
            ...(segmenData?.features || [])
        ];

        let points: [number, number][] = [];
        allFeatures.forEach(feature => {
            const geometry = feature.geometry;
            if (geometry.type === 'LineString') {
                points.push(...(geometry.coordinates as [number, number][]));
            } else if (geometry.type === 'MultiLineString') {
                points.push(...(geometry.coordinates.flat() as [number, number][]));
            }
        });

        // Markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const featuresForMarkers = (segmenData?.features && segmenData.features.length > 0)
            ? segmenData.features
            : (jalanData?.features || []);

        if (featuresForMarkers.length > 0) {
            featuresForMarkers.forEach(feature => {
                const geometry = feature.geometry;
                let featurePoints: [number, number][] = [];

                if (geometry.type === 'LineString') {
                    featurePoints = geometry.coordinates as [number, number][];
                } else if (geometry.type === 'MultiLineString') {
                    featurePoints = geometry.coordinates.flat() as [number, number][];
                }

                if (featurePoints.length > 0) {
                    const startPoint = featurePoints[0];
                    const endPoint = featurePoints[featurePoints.length - 1];

                    // Helper to create ultra-mini modern popup content
                    const createPopupContent = (title: string, lng: number, lat: number) => {
                        const container = document.createElement('div');
                        container.className = 'px-1.5 py-1 flex items-center gap-2 min-w-fit max-w-[200px] overflow-hidden';

                        const textContent = document.createElement('div');
                        textContent.className = 'flex flex-col leading-none';

                        const titleEl = document.createElement('span');
                        titleEl.className = 'font-bold text-[9px] text-slate-400 uppercase tracking-tighter mb-0.5';
                        titleEl.innerText = title;
                        textContent.appendChild(titleEl);

                        const coordsEl = document.createElement('div');
                        coordsEl.className = 'font-mono text-[10px] text-slate-700 whitespace-nowrap';
                        coordsEl.innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        textContent.appendChild(coordsEl);

                        container.appendChild(textContent);

                        // Subtle copy icon
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'text-primary hover:text-primary/80 transition-colors p-1 rounded hover:bg-slate-100 flex-shrink-0 ml-1 border border-slate-100 shadow-sm bg-white';
                        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

                        container.appendChild(copyBtn);

                        // Copy logic
                        copyBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const textToCopy = `${lat}, ${lng}`;

                            const performCopy = async () => {
                                let success = false;
                                try {
                                    if (navigator.clipboard) {
                                        await navigator.clipboard.writeText(textToCopy);
                                        success = true;
                                    } else {
                                        throw new Error('Clipboard API unavailable');
                                    }
                                } catch (err) {
                                    // Fallback for mobile/non-HTTPS
                                    const textArea = document.createElement("textarea");
                                    textArea.value = textToCopy;

                                    // Ensure it's not visible and doesn't affect layout/scrolling
                                    textArea.style.position = "fixed";
                                    textArea.style.left = "0";
                                    textArea.style.top = "0";
                                    textArea.style.opacity = "0";
                                    textArea.style.width = "1px";
                                    textArea.style.height = "1px";
                                    textArea.style.padding = "0";
                                    textArea.style.border = "none";
                                    textArea.style.outline = "none";
                                    textArea.style.boxShadow = "none";
                                    textArea.style.background = "transparent";

                                    document.body.appendChild(textArea);

                                    // Focus without scrolling
                                    textArea.focus({ preventScroll: true });
                                    textArea.select();

                                    try {
                                        success = document.execCommand('copy');
                                    } catch (copyErr) {
                                        console.error('Fallback copy failed:', copyErr);
                                    }
                                    document.body.removeChild(textArea);
                                }

                                if (success) {
                                    const originalHTML = copyBtn.innerHTML;
                                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>';
                                    setTimeout(() => {
                                        copyBtn.innerHTML = originalHTML;
                                    }, 2000);
                                }
                            };

                            performCopy();
                        };

                        return container;
                    };

                    // Mark Titik Awal/Akhir based on context
                    const isRoad = !segmenData?.features || segmenData.features.length === 0;
                    const startTitle = isRoad ? 'Awal Ruas' : 'Awal Segmen';
                    const endTitle = isRoad ? 'Akhir Ruas' : 'Akhir Segmen';

                    // Create Popups
                    const startPopup = new mapboxgl.Popup({
                        offset: 15,
                        closeButton: false,
                        className: 'minimal-popup'
                    }).setDOMContent(createPopupContent(startTitle, startPoint[0], startPoint[1]));

                    const endPopup = new mapboxgl.Popup({
                        offset: 15,
                        closeButton: false,
                        className: 'minimal-popup'
                    }).setDOMContent(createPopupContent(endTitle, endPoint[0], endPoint[1]));

                    // Start marker
                    const elStart = document.createElement('div');
                    elStart.className = 'w-3 h-3 bg-white rounded-full border-2 border-slate-600 shadow-sm transition-transform hover:scale-125 cursor-pointer';
                    const startMarker = new mapboxgl.Marker(elStart)
                        .setLngLat(startPoint)
                        .setPopup(startPopup)
                        .addTo(mapRef.current!);

                    elStart.addEventListener('mouseenter', () => startPopup.addTo(mapRef.current!));
                    elStart.addEventListener('click', () => startPopup.addTo(mapRef.current!));
                    markersRef.current.push(startMarker);

                    // End marker
                    const elEnd = document.createElement('div');
                    elEnd.className = 'w-3 h-3 bg-white rounded-full border-2 border-slate-600 shadow-sm transition-transform hover:scale-125 cursor-pointer';
                    const endMarker = new mapboxgl.Marker(elEnd)
                        .setLngLat(endPoint)
                        .setPopup(endPopup)
                        .addTo(mapRef.current!);

                    elEnd.addEventListener('mouseenter', () => endPopup.addTo(mapRef.current!));
                    elEnd.addEventListener('click', () => endPopup.addTo(mapRef.current!));
                    markersRef.current.push(endMarker);
                }
            });
        }

        if (points.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            points.forEach(p => bounds.extend(p));

            // Adjust padding based on device. 
            // On desktop (with panels) we want more padding.
            // On mobile we want to maximize the view.
            const padding = isMobile ? 50 : 250;

            mapRef.current.fitBounds(bounds, { padding: padding, duration: 1000 });
        }
    };

    const zoomIn = () => {
        if (mapRef.current) mapRef.current.zoomIn();
    };

    const zoomOut = () => {
        if (mapRef.current) mapRef.current.zoomOut();
    };

    const resetBearing = () => {
        if (mapRef.current) mapRef.current.resetNorthPitch();
    };

    return {
        mapRef,
        updateData,
        zoomIn,
        zoomOut,
        resetBearing
    };
}
