import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type GeoJSONFeature } from '../types';

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

    const updateSelectedJalan = (selectedJalan: GeoJSONFeature | null, onPanelShow?: () => void) => {
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

        // Remove existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        if (points.length > 0) {
            const startPoint = points[0];
            const endPoint = points[points.length - 1];

            // Helper to create modern popup content
            const createPopupContent = (title: string, lng: number, lat: number) => {
                const container = document.createElement('div');
                container.className = 'p-1 min-w-[150px]';

                const titleEl = document.createElement('p');
                titleEl.className = 'font-bold text-sm mb-1 line-clamp-1';
                titleEl.innerText = title;
                container.appendChild(titleEl);

                const coordsContainer = document.createElement('div');
                coordsContainer.className = 'bg-muted/50 p-2 rounded-md mb-2 text-[10px] space-y-0.5 font-mono relative group';

                const lngEl = document.createElement('p');
                lngEl.innerHTML = `<span class="text-muted-foreground">Lng:</span> ${lng.toFixed(7)}`;
                coordsContainer.appendChild(lngEl);

                const latEl = document.createElement('p');
                latEl.innerHTML = `<span class="text-muted-foreground">Lat:</span> ${lat.toFixed(7)}`;
                coordsContainer.appendChild(latEl);

                container.appendChild(coordsContainer);

                const copyBtn = document.createElement('button');
                copyBtn.className = 'w-full py-1.5 px-2 bg-primary text-primary-foreground rounded-md text-[10px] font-medium transition-all hover:bg-primary/90 flex items-center justify-center gap-1.5 active:scale-95';
                const defaultContent = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>Salin Koordinat</span>
                `;
                copyBtn.innerHTML = defaultContent;

                copyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const textToCopy = `${lat}, ${lng}`;

                    const performCopy = async () => {
                        try {
                            let success = false;
                            if (navigator.clipboard && window.isSecureContext) {
                                await navigator.clipboard.writeText(textToCopy);
                                success = true;
                            } else {
                                // Fallback
                                const textArea = document.createElement("textarea");
                                textArea.value = textToCopy;
                                textArea.style.position = "fixed";
                                textArea.style.left = "-9999px";
                                textArea.style.top = "0";
                                document.body.appendChild(textArea);
                                textArea.focus();
                                textArea.select();
                                success = document.execCommand('copy');
                                document.body.removeChild(textArea);
                            }

                            if (success) {
                                copyBtn.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Tersalin!</span>
                                `;
                                copyBtn.className = 'w-full py-1.5 px-2 bg-green-600 text-white rounded-md text-[10px] font-medium flex items-center justify-center gap-1.5';

                                setTimeout(() => {
                                    copyBtn.innerHTML = defaultContent;
                                    copyBtn.className = 'w-full py-1.5 px-2 bg-primary text-primary-foreground rounded-md text-[10px] font-medium transition-all hover:bg-primary/90 flex items-center justify-center gap-1.5 active:scale-95';
                                }, 2000);
                            }
                        } catch (err) {
                            console.error('Gagal menyalin:', err);
                        }
                    };

                    performCopy();
                });

                container.appendChild(copyBtn);
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

            const elEnd = document.createElement('div');
            elEnd.className = 'marker-pulse marker-pulse-end';
            const endMarker = new mapboxgl.Marker(elEnd).setLngLat(endPoint).setPopup(endPopup).addTo(mapRef.current);
            elEnd.addEventListener('mouseenter', () => endPopup.addTo(mapRef.current!));

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
