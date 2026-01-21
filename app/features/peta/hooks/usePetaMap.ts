import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type GeoJSONFeature, type GeoJSONFeatureCollection } from '../types';

interface UsePetaMapProps {
    mapboxToken: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

export function usePetaMap({ mapboxToken, containerRef }: UsePetaMapProps) {
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const onPanelShowRef = useRef<() => void>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [111.8328268, -7.2288555], // Bojonegoro
            zoom: 9.5
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
            mapRef.current = map;

            // Add source for selected road
            map.addSource('selected-jalan', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add layers for selected road
            map.addLayer({
                id: 'jalan-glow',
                type: 'line',
                source: 'selected-jalan',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 8,
                    'line-opacity': 0.3,
                }
            });

            map.addLayer({
                id: 'jalan-line',
                type: 'line',
                source: 'selected-jalan',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 4,
                }
            });

            // Add flow animation layer
            map.addLayer({
                id: 'jalan-flow',
                type: 'line',
                source: 'selected-jalan',
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2,
                    'line-dasharray': [0, 2, 2],
                    'line-opacity': 0.8
                }
            });

            // Interaction for selected road layers
            const selectedLayers = ['jalan-line', 'jalan-glow', 'jalan-flow'];
            selectedLayers.forEach(layerId => {
                map.on('mouseenter', layerId, () => {
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mouseleave', layerId, () => {
                    map.getCanvas().style.cursor = '';
                });

                map.on('click', layerId, () => {
                    if (onPanelShowRef.current) {
                        onPanelShowRef.current();
                    }
                });
            });
        });

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            markersRef.current.forEach(marker => marker.remove());
            map.remove();
            mapRef.current = null;
        };
    }, [mapboxToken]);

    const updateSelectedJalan = (selectedJalan: GeoJSONFeature | GeoJSONFeatureCollection | null, onPanelShow?: () => void) => {
        if (!mapRef.current) return;

        const source = mapRef.current.getSource('selected-jalan') as mapboxgl.GeoJSONSource;
        if (!source) return;

        if (!selectedJalan) {
            source.setData({
                type: 'FeatureCollection',
                features: []
            });
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];
            return;
        }

        source.setData(selectedJalan as any);

        // Extract coordinates for markers robustly
        let points: [number, number][] = [];

        if (selectedJalan.type === 'FeatureCollection') {
            selectedJalan.features.forEach(feature => {
                const geometry = feature.geometry;
                if (geometry.type === 'LineString') {
                    points.push(...(geometry.coordinates as [number, number][]));
                } else if (geometry.type === 'MultiLineString') {
                    points.push(...(geometry.coordinates.flat() as [number, number][]));
                }
            });
        } else {
            const geometry = selectedJalan.geometry;
            if (geometry.type === 'LineString') {
                points = geometry.coordinates as [number, number][];
            } else if (geometry.type === 'MultiLineString') {
                points = geometry.coordinates.flat() as [number, number][];
            } else if (geometry.type === 'GeometryCollection') {
                geometry.geometries.forEach(g => {
                    if (g.type === 'LineString') {
                        points.push(...(g.coordinates as [number, number][]));
                    } else if (g.type === 'MultiLineString') {
                        points.push(...(g.coordinates.flat() as [number, number][]));
                    }
                });
            }
        }

        // Remove existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        if (points.length > 0) {
            const startPoint = points[0];
            const endPoint = points[points.length - 1];

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

            // Create Popups
            const startPopup = new mapboxgl.Popup({ offset: 10, closeButton: false })
                .setDOMContent(createPopupContent('Titik Awal', startPoint[0], startPoint[1]));

            const endPopup = new mapboxgl.Popup({ offset: 10, closeButton: false })
                .setDOMContent(createPopupContent('Titik Akhir', endPoint[0], endPoint[1]));

            // Create Markers
            const elStart = document.createElement('div');
            elStart.className = 'marker-pulse marker-pulse-start';
            const startMarker = new mapboxgl.Marker(elStart).setLngLat(startPoint).setPopup(startPopup).addTo(mapRef.current);
            elStart.addEventListener('mouseenter', () => startPopup.addTo(mapRef.current!));
            elStart.addEventListener('click', () => startPopup.addTo(mapRef.current!));

            const elEnd = document.createElement('div');
            elEnd.className = 'marker-pulse marker-pulse-end';
            const endMarker = new mapboxgl.Marker(elEnd).setLngLat(endPoint).setPopup(endPopup).addTo(mapRef.current);
            elEnd.addEventListener('mouseenter', () => endPopup.addTo(mapRef.current!));
            elEnd.addEventListener('click', () => endPopup.addTo(mapRef.current!));

            markersRef.current = [startMarker, endMarker];

            // Zoom to the feature
            const bounds = new mapboxgl.LngLatBounds();
            points.forEach(p => bounds.extend(p));

            mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });

            // Animate flow
            const animate = (time: number) => {
                if (!mapRef.current || !mapRef.current.getLayer('jalan-flow')) return;

                const speed = 0.004;
                const dashLength = 2;
                const totalLength = dashLength * 2;
                const step = (time * speed) % totalLength;

                if (step < dashLength) {
                    mapRef.current.setPaintProperty('jalan-flow', 'line-dasharray', [0, step, dashLength, dashLength - step]);
                } else {
                    mapRef.current.setPaintProperty('jalan-flow', 'line-dasharray', [step - dashLength, dashLength, totalLength - step, 0]);
                }

                animationFrameRef.current = requestAnimationFrame(animate);
            };

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        onPanelShowRef.current = onPanelShow || null;
    };


    return {
        mapRef,
        updateSelectedJalan
    };
}
