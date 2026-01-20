import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { kecamatanService, type Kecamatan } from '~/services/kecamatan';
import { jalanDesaService, type GeoJSONFeatureCollection, type Jalan, type GeoJSONFeature } from '~/services/jalan-desa';
import { desaService } from '~/services/desa';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { MapPin, Search, Loader2, Info, X } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator as UISeparator } from '~/components/ui/separator';

export function TabPetaKecamatan() {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);

    const [kecamatanData, setKecamatanData] = useState<Kecamatan[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedKecamatan, setSelectedKecamatan] = useState<Kecamatan | null>(null);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);
    const [selectedJalan, setSelectedJalan] = useState<GeoJSONFeature | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const animationFrameRef = useRef<number | null>(null);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        mapboxgl.accessToken = mapboxToken;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [111.8328268, -7.2288555], // Bojonegoro
            zoom: 9.5
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
            mapRef.current = map;

            // Add source for roads in kecamatan
            map.addSource('kecamatan-jalan', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add source for villages in kecamatan
            map.addSource('kecamatan-desa', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // Add layer for village polygons (fill)
            map.addLayer({
                id: 'desa-fill',
                type: 'fill',
                source: 'kecamatan-desa',
                paint: {
                    'fill-color': '#10b981',
                    'fill-opacity': 0.1,
                }
            });

            // Add layer for village outlines
            map.addLayer({
                id: 'desa-outline',
                type: 'line',
                source: 'kecamatan-desa',
                paint: {
                    'line-color': '#10b981',
                    'line-width': 1,
                    'line-dasharray': [2, 2]
                }
            });

            // Add layer for road lines
            map.addLayer({
                id: 'jalan-line',
                type: 'line',
                source: 'kecamatan-jalan',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 3,
                }
            });

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
                id: 'jalan-line-selected',
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

            // Add click listener to the road line
            map.on('click', 'jalan-line', (e) => {
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    const id = feature.properties?.id;
                    if (id) {
                        handleSelectJalan(id.toString());
                    }
                }
            });

            // Change cursor to pointer when hovering over the road line
            map.on('mouseenter', 'jalan-line', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'jalan-line', () => {
                map.getCanvas().style.cursor = '';
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

    // Fetch Kecamatan List
    useEffect(() => {
        const fetchKecamatan = async () => {
            setLoading(true);
            const data = await kecamatanService.getKecamatan();
            setKecamatanData(data);
            setLoading(false);
        };
        fetchKecamatan();
    }, []);

    // Update Map when selectedKecamatan changes
    useEffect(() => {
        if (!selectedKecamatan || !mapRef.current) return;

        const handleKecamatanChange = async () => {
            setFetchingGeojson(true);
            const [geojsonJalan, geojsonDesa] = await Promise.all([
                jalanDesaService.getGeojsonJalan(selectedKecamatan.id.toString()),
                desaService.getGeojsonDesa(selectedKecamatan.id.toString())
            ]);

            if (mapRef.current) {
                const sourceJalan = mapRef.current.getSource('kecamatan-jalan') as mapboxgl.GeoJSONSource;
                const sourceDesa = mapRef.current.getSource('kecamatan-desa') as mapboxgl.GeoJSONSource;

                if (sourceJalan && geojsonJalan) {
                    sourceJalan.setData(geojsonJalan);
                }

                if (sourceDesa && geojsonDesa) {
                    sourceDesa.setData(geojsonDesa);
                }

                // Fit bounds to the features (using village polygons as they usually define the boundary)
                const bounds = new mapboxgl.LngLatBounds();
                let hasBounds = false;

                if (geojsonDesa && geojsonDesa.features.length > 0) {
                    geojsonDesa.features.forEach((feature) => {
                        const geometry = feature.geometry;
                        if (geometry.type === 'Polygon') {
                            geometry.coordinates[0].forEach((coord: any) => {
                                bounds.extend(coord as [number, number]);
                                hasBounds = true;
                            });
                        } else if (geometry.type === 'MultiPolygon') {
                            geometry.coordinates.forEach((polygon: any) => {
                                polygon[0].forEach((coord: any) => {
                                    bounds.extend(coord as [number, number]);
                                    hasBounds = true;
                                });
                            });
                        }
                    });
                } else if (geojsonJalan && geojsonJalan.features.length > 0) {
                    geojsonJalan.features.forEach((feature) => {
                        const geometry = feature.geometry;
                        if (geometry.type === 'LineString') {
                            geometry.coordinates.forEach((coord: number[]) => {
                                bounds.extend(coord as [number, number]);
                                hasBounds = true;
                            });
                        } else if (geometry.type === 'MultiLineString') {
                            geometry.coordinates.forEach((line: number[][]) => {
                                line.forEach((coord: number[]) => {
                                    bounds.extend(coord as [number, number]);
                                    hasBounds = true;
                                });
                            });
                        }
                    });
                }

                if (hasBounds) {
                    mapRef.current.fitBounds(bounds, {
                        padding: 50,
                        duration: 1000
                    });
                }
            }
            setFetchingGeojson(false);
        };

        handleKecamatanChange();
    }, [selectedKecamatan]);

    // Update Map when selectedJalan changes (logic from TabPeta)
    useEffect(() => {
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
            setIsPanelVisible(false);
            return;
        }

        source.setData(selectedJalan as any);
        setIsPanelVisible(true);

        // Extract coordinates for markers
        let coords: any[] = [];
        if (selectedJalan.geometry.type !== 'GeometryCollection') {
            coords = (selectedJalan.geometry as any).coordinates.flat(Infinity);
        }
        const points: [number, number][] = [];
        for (let i = 0; i < coords.length; i += 2) {
            points.push([coords[i], coords[i + 1]]);
        }

        // Remove existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        if (points.length > 0) {
            const startPoint = points[0];
            const endPoint = points[points.length - 1];

            // Helper to create modern popup content (simplified for brevity, matching TabPeta)
            const createPopupContent = (title: string, lng: number, lat: number) => {
                const container = document.createElement('div');
                container.className = 'p-1 min-w-[150px]';
                const titleEl = document.createElement('p');
                titleEl.className = 'font-bold text-sm mb-1';
                titleEl.innerText = title;
                container.appendChild(titleEl);
                const coordsEl = document.createElement('p');
                coordsEl.className = 'text-[10px] text-muted-foreground font-mono';
                coordsEl.innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                container.appendChild(coordsEl);
                return container;
            };

            const startPopup = new mapboxgl.Popup({ offset: 10, closeButton: false })
                .setDOMContent(createPopupContent('Titik Awal', startPoint[0], startPoint[1]));
            const endPopup = new mapboxgl.Popup({ offset: 10, closeButton: false })
                .setDOMContent(createPopupContent('Titik Akhir', endPoint[0], endPoint[1]));

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
                const totalLength = 4;
                const step = (time * speed) % totalLength;
                if (step < 2) {
                    mapRef.current.setPaintProperty('jalan-flow', 'line-dasharray', [0, step, 2, 2 - step]);
                } else {
                    mapRef.current.setPaintProperty('jalan-flow', 'line-dasharray', [step - 2, 2, totalLength - step, 0]);
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };

            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [selectedJalan]);

    const handleSelectJalan = async (id: string) => {
        setFetchingGeojson(true);
        const geojson = await jalanDesaService.getJalanById(id);
        if (geojson) {
            setSelectedJalan(geojson);
        }
        setFetchingGeojson(false);
    };

    const filteredKecamatan = kecamatanData.filter((item) =>
        item.nama_kecamatan.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 mt-2 relative border rounded-md overflow-hidden min-h-[500px]">
            {!mapboxToken && (
                <div className="absolute top-0 left-0 z-50 p-4 bg-yellow-100 text-yellow-800 w-full text-center">
                    Warning: VITE_MAPBOX_TOKEN is missing in .env
                </div>
            )}

            {/* Dropdown Menu - Absolute Positioned */}
            <div className="absolute top-3 left-3 z-10 flex gap-2 items-center">
                <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(""); }}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="shadow-md">
                            <MapPin className="mr-2 h-4 w-4" />
                            {selectedKecamatan ? `Kec. ${selectedKecamatan.nama_kecamatan}` : 'Pilih Kecamatan'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-0" align="start">
                        <div className="p-3 pb-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari kecamatan..."
                                    className="pl-9 h-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        <ScrollArea className="h-72">
                            <div className="p-1">
                                {loading ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Memuat data...</div>
                                ) : filteredKecamatan.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil</div>
                                ) : (
                                    filteredKecamatan.map((kec) => (
                                        <DropdownMenuItem
                                            key={kec.id}
                                            className="flex items-center py-2 px-3 cursor-pointer"
                                            onClick={() => setSelectedKecamatan(kec)}
                                        >
                                            <span className="font-medium text-sm">{kec.nama_kecamatan}</span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                {fetchingGeojson && (
                    <div className="bg-white/80 dark:bg-black/80 p-2 rounded-full shadow-md animate-spin">
                        <Loader2 className="h-4 w-4 text-primary" />
                    </div>
                )}
            </div>

            {/* Info Panel & Toggle Button */}
            {selectedJalan && (
                <div className="absolute top-26 right-3 z-10 flex flex-col items-end gap-2 text-primary">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="shadow-md h-9 w-9"
                        onClick={() => setIsPanelVisible(!isPanelVisible)}
                        title="Tampilkan Informasi"
                    >
                        <Info className="h-5 w-5" />
                    </Button>

                    {isPanelVisible && (
                        <Card className="py-1 w-80 shadow-lg max-h-[85vh] overflow-auto">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-2">
                                <CardTitle className="text-sm font-bold">
                                    {selectedJalan.properties.nama_ruas}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setSelectedJalan(null)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-3">
                                <UISeparator />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Kode Ruas</p>
                                        <p>{selectedJalan.properties.kode_ruas}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Lokasi</p>
                                        <p>{selectedJalan.properties.desa}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Panjang</p>
                                        <p>{selectedJalan.properties.panjang.toLocaleString()} m</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Lebar</p>
                                        <p>{selectedJalan.properties.lebar} m</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Perkerasan</p>
                                        <p>{selectedJalan.properties.perkerasan}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Kondisi</p>
                                        <p>{selectedJalan.properties.kondisi}</p>
                                    </div>
                                </div>
                                <UISeparator />
                                <div className="text-[10px] text-muted-foreground pt-1">
                                    <p>Sumber Data: {selectedJalan.properties.sumber_data}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <div ref={mapContainerRef} className="w-full h-full" />
        </div>
    );
}
