import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { jalanDesaService, type Jalan, type GeoJSONFeature } from '~/services/jalan-desa';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { MapPin, X, Search, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator as UISeparator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';

export function TabPeta() {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [jalanData, setJalanData] = useState<Jalan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJalan, setSelectedJalan] = useState<GeoJSONFeature | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const [fetchingGeojson, setFetchingGeojson] = useState(false);
    const animationFrameRef = useRef<number | null>(null);

    // Initialize map
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

            // Add click listener to the road line
            map.on('click', 'jalan-line', () => {
                setIsPanelVisible(true);
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

    // Handle debouncing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    // Fetch road list based on search
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await jalanDesaService.getJalan(debouncedSearch);
            setJalanData(data);
            setLoading(false);
        };
        fetchData();
    }, [debouncedSearch]);

    // Update map when selectedJalan changes
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
        // Panel stays hidden by default on selection as per user request
        setIsPanelVisible(false);

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
                                // Success UI
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

            // Create Markers with pulse effect
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
            const bounds = points.reduce((acc, coord) => {
                return [
                    [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
                    [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
                ];
            }, [[Infinity, Infinity], [-Infinity, -Infinity]]);

            mapRef.current.fitBounds(
                [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]],
                { padding: 100, duration: 1000 }
            );

            // Animate flow smoothly
            const animate = (time: number) => {
                if (!mapRef.current || !mapRef.current.getLayer('jalan-flow')) return;

                const speed = 0.004; // units per ms
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
    }, [selectedJalan]);

    const handleSelectJalan = async (id: string) => {
        setFetchingGeojson(true);
        const geojson = await jalanDesaService.getJalanById(id);
        if (geojson) {
            setSelectedJalan(geojson);
        }
        setFetchingGeojson(false);
    };

    return (
        <div className="flex-1 mt-2 relative border rounded-md overflow-hidden min-h-[500px]">
            {!mapboxToken && (
                <div className="absolute top-0 left-0 z-50 p-4 bg-yellow-100 text-yellow-800 w-full text-center">
                    Warning: VITE_MAPBOX_TOKEN is missing in .env
                </div>
            )}

            {/* Dropdown Menu - Absolute Positioned */}
            <div className="absolute top-3 left-3 z-10">
                <DropdownMenu onOpenChange={(open) => { if (!open) setSearch(""); }}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="shadow-md">
                            <MapPin className="mr-2 h-4 w-4" />
                            {selectedJalan ? selectedJalan.properties.nama_ruas : 'Pilih Ruas Jalan'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80 p-0" align="start">
                        <div className="p-3 pb-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Ketik nama ruas..."
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
                                {loading && search !== debouncedSearch ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Mencari...</div>
                                ) : loading && jalanData.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Memuat data...</div>
                                ) : jalanData.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Tidak ada hasil</div>
                                ) : (
                                    jalanData.map((jalan) => (
                                        <DropdownMenuItem
                                            key={jalan.id}
                                            className="flex flex-col items-start py-2 px-3 cursor-pointer"
                                            onClick={() => handleSelectJalan(jalan.id)}
                                        >
                                            <div className="flex justify-between w-full items-center">
                                                <span className="font-medium text-sm">{jalan.nama_ruas}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                <span className="text-[10px] font-mono pr-1 rounded-sm text-muted-foreground">
                                                    {jalan.panjang.toLocaleString()} m
                                                </span>
                                                | {jalan.desa}, Kec. {jalan.kecamatan}
                                            </span>
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Info Panel & Toggle Button */}
            {selectedJalan && (
                <div className="absolute top-14 left-3 z-10 flex flex-col items-start gap-2">
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
                        <Card className="py-1 w-80 shadow-lg gap-2 max-h-[85vh] overflow-auto">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 pt-2">
                                <CardTitle className="text-sm font-bold">
                                    {selectedJalan.properties.nama_ruas}
                                </CardTitle>
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
                                        <p>{selectedJalan.properties.desa}, {selectedJalan.properties.kecamatan}</p>
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
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Status Awal</p>
                                        <p>{selectedJalan.properties.status_awal}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground font-semibold">Status Eksisting</p>
                                        <p>{selectedJalan.properties.status_eksisting}</p>
                                    </div>
                                </div>
                                <UISeparator />
                                <div className="text-[10px] text-muted-foreground pt-1">
                                    <p>Sumber Data: {selectedJalan.properties.sumber_data}</p>
                                    <p>Terakhir Update: {selectedJalan.properties.updated_at ? new Date(selectedJalan.properties.updated_at).toLocaleDateString() : '-'}</p>
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
