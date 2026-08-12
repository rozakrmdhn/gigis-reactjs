import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Stroke, Fill, Text, Icon } from 'ol/style';
import { X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Layers, MapPin, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { CORE_LAYER_COLORS } from '~/lib/map-config';
import 'ol/ol.css';
import { getProxiedLayerUrl } from '~/lib/utils';
import { useTheme } from "next-themes";

const getStoredStyle = (key: string, defaultStyle: { color: string; width: number; lineDash?: number[]; scale?: number }) => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('gigis_custom_vector_styles');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed[key]) {
                    const item = parsed[key];
                    let lineDashVal: number[] | undefined = undefined;
                    if (item.lineDash === 'dashed') {
                        lineDashVal = [6, 6];
                    } else if (item.lineDash === 'solid') {
                        lineDashVal = undefined;
                    } else if (Array.isArray(item.lineDash)) {
                        lineDashVal = item.lineDash;
                    }
                    return {
                        color: item.color || defaultStyle.color,
                        width: item.width !== undefined ? Number(item.width) : defaultStyle.width,
                        lineDash: lineDashVal,
                        scale: item.scale !== undefined ? Number(item.scale) : defaultStyle.scale,
                        fillColor: item.fillColor || `${item.color || defaultStyle.color}0d`
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error loading custom styles from localStorage:", e);
    }
    return defaultStyle;
};

export interface MapPopupItem {
    id: string | number;
    layerId?: string;
    title: string;
    badgeText: string;
    badgeColor?: string;
    properties: Record<string, any>;
    geometry?: any;
}

export interface MapLayerConfig {
    id: string;
    title: string;
    type: 'wms' | 'vector' | 'osm' | 'tile';
    url?: string;
    params?: any;
    data?: any;
    visible?: boolean;
    opacity?: number;
    zIndex?: number;
    style?: any;
    legendUrl?: string;
}

interface OpenLayersMapProps {
    className?: string;
    center?: [number, number];
    zoom?: number;
    layers?: MapLayerConfig[];
    // Legacy props for compatibility, can be phased out
    geojsonData?: any;
    showJalanKabupaten?: boolean;
    showBatasDesa?: boolean;
    showJalanUtama?: boolean;
    showSegmenJalan?: boolean;
    basemapUrl?: string | 'osm';
    markers?: { id: string; lat: number; lon: number; title?: string }[];
    onFeatureSelect?: (properties: any) => void;
    disablePopup?: boolean;
    onMapReady?: (map: Map) => void;
}

export interface OpenLayersMapRef {
    zoomIn: () => void;
    zoomOut: () => void;
    resetRotation: () => void;
    zoomToCoordinate: (lon: number, lat: number, zoom?: number) => void;
    fitAllMarkers: () => void;
    zoomToFeature: (geojson: any) => void;
    getMap: () => Map | null;
}

export const OpenLayersMap = forwardRef<OpenLayersMapRef, OpenLayersMapProps>(({
    className,
    center = [111.8328268, -7.2288555], // Bojonegoro
    zoom = 10,
    layers = [],
    geojsonData,
    showBatasDesa = true,
    showJalanUtama = true,
    showSegmenJalan = true,
    basemapUrl = 'osm',
    markers = [],
    onFeatureSelect,
    disablePopup = false,
    onMapReady,
}, ref) => {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const markerSourceRef = useRef<VectorSource>(new VectorSource());
    const highlightSourceRef = useRef<VectorSource>(new VectorSource());

    // Layer Refs
    const basemapLayerRef = useRef<TileLayer<OSM | XYZ> | null>(null);
    const batasDesaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const utamaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const segmenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

    const vectorPopupRef = useRef<Overlay | null>(null);
    const vectorPopupElementRef = useRef<HTMLDivElement | null>(null);

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    // Multi-Popup Layer State
    const [popupItems, setPopupItems] = useState<MapPopupItem[]>([]);
    const [popupIndex, setPopupIndex] = useState<number>(0);
    const [popupCoordinate, setPopupCoordinate] = useState<number[] | null>(null);
    const [isPopupMinimized, setIsPopupMinimized] = useState(false);
    const [isPopupClosing, setIsPopupClosing] = useState(false);

    const layersRef = useRef<MapLayerConfig[]>(layers);
    useEffect(() => {
        layersRef.current = layers;
    }, [layers]);

    useImperativeHandle(ref, () => ({
        getMap: () => mapRef.current,
        zoomToFeature: (geojson: any) => {
            if (!mapRef.current) return;

            vectorSourceRef.current.clear();
            if (!geojson) return;

            const format = new GeoJSON();
            const features = format.readFeatures(geojson, {
                featureProjection: 'EPSG:3857'
            });

            vectorSourceRef.current.addFeatures(features);

            const extent = vectorSourceRef.current.getExtent();
            if (extent && extent[0] !== Infinity) {
                mapRef.current.getView().fit(extent, {
                    padding: [50, 50, 50, 50],
                    duration: 1000
                });
            }
        },
        zoomIn: () => {
            const view = mapRef.current?.getView();
            if (view) {
                const currentZoom = view.getZoom() || 0;
                view.animate({ zoom: currentZoom + 1, duration: 250 });
            }
        },
        zoomOut: () => {
            const view = mapRef.current?.getView();
            if (view) {
                const currentZoom = view.getZoom() || 0;
                view.animate({ zoom: currentZoom - 1, duration: 250 });
            }
        },
        resetRotation: () => {
            mapRef.current?.getView().animate({ rotation: 0, duration: 250 });
        },
        zoomToCoordinate: (lon: number, lat: number, targetZoom: number = 15) => {
            if (!mapRef.current) return;
            mapRef.current.getView().animate({
                center: fromLonLat([lon, lat]),
                zoom: targetZoom,
                duration: 1000
            });
        },
        fitAllMarkers: () => {
            if (!mapRef.current) return;
            const extent = markerSourceRef.current.getExtent();
            // Check if extent is valid and not empty
            if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
                // If it's a single point, fit might zoom in too much or error depending on OL version
                // We add a safety check for single points
                const isSinglePoint = extent[0] === extent[2] && extent[1] === extent[3];

                if (isSinglePoint) {
                    mapRef.current.getView().animate({
                        center: [extent[0], extent[1]],
                        zoom: 16,
                        duration: 1000
                    });
                } else {
                    mapRef.current.getView().fit(extent, {
                        padding: [80, 80, 80, 80],
                        duration: 1000,
                        maxZoom: 18
                    });
                }
            }
        }
    }));

    useEffect(() => {
        if (!mapElement.current) return;

        // 1. Batas Desa Layer
        const batasDesaLayer = new VectorLayer({
            source: vectorSourceRef.current,
            zIndex: 10,
            visible: showBatasDesa,
            style: (feature) => {
                const props = feature.getProperties();
                const layer = props._layer;
                if (layer === 'batas_desa') {
                    const custom = getStoredStyle('batas_desa', { color: CORE_LAYER_COLORS.ADMIN.hex, width: 2, lineDash: [4, 4] });
                    return new Style({
                        stroke: new Stroke({
                            color: custom.color,
                            width: custom.width,
                            lineDash: custom.lineDash,
                        }),
                        fill: new Fill({
                            color: (custom as any).fillColor || `${custom.color}0d`,
                        }),
                    });
                }
                return [];
            },
        });
        batasDesaLayerRef.current = batasDesaLayer;

        // 2. Jalan Utama Layer
        const utamaLayer = new VectorLayer({
            source: vectorSourceRef.current,
            zIndex: 20,
            visible: showJalanUtama,
            style: (feature) => {
                const props = feature.getProperties();
                const layer = props._layer;
                if (layer === 'jalan_utama') {
                    const custom = getStoredStyle('jalan_utama', { color: CORE_LAYER_COLORS.GENERAL.hex, width: 2 });
                    return new Style({
                        stroke: new Stroke({
                            color: custom.color,
                            width: custom.width,
                            lineDash: custom.lineDash,
                        }),
                    });
                }
                return [];
            },
        });
        utamaLayerRef.current = utamaLayer;


        // 4. Jalan Segmen Layer
        const segmenLayer = new VectorLayer({
            source: vectorSourceRef.current,
            zIndex: 40,
            visible: showSegmenJalan,
            style: (feature) => {
                const props = feature.getProperties();
                const layer = props._layer;
                if (layer === 'jalan_segmen') {
                    const checkMelarosa = props.check_melarosa;
                    const statusJalan = props.status_jalan;
                    const kondisi = (props.kondisi || props.KONDISI || '').toLowerCase();

                    let styleKey = 'jalan_desa_baik';
                    let defaultColor = '#22c55e';
                    let defaultWidth = 5;
                    let defaultLineDash: number[] | undefined = undefined;

                    if (statusJalan === 'Jalan Desa') {
                        if (kondisi === 'baik') {
                            styleKey = checkMelarosa === 'Tidak' ? 'jalan_lingkungan_baik' : 'jalan_desa_baik';
                            defaultColor = '#22c55e';
                        } else if (kondisi === 'sedang') {
                            styleKey = checkMelarosa === 'Tidak' ? 'jalan_lingkungan_sedang' : 'jalan_desa_sedang';
                            defaultColor = '#f59e0b';
                        } else {
                            styleKey = checkMelarosa === 'Tidak' ? 'jalan_lingkungan_rusak' : 'jalan_desa_rusak';
                            defaultColor = '#ef4444';
                        }
                        if (checkMelarosa === 'Tidak') {
                            defaultLineDash = [6, 6];
                        }
                    } else if (statusJalan === 'Jalan Kabupaten') {
                        if (kondisi === 'baik') {
                            styleKey = 'jalan_kabupaten_baik';
                            defaultColor = '#2563eb';
                        } else if (kondisi === 'sedang') {
                            styleKey = 'jalan_kabupaten_sedang';
                            defaultColor = '#60a5fa';
                        } else {
                            styleKey = 'jalan_kabupaten_rusak';
                            defaultColor = '#60a5fa';
                            defaultLineDash = [6, 6];
                        }
                    }

                    const custom = getStoredStyle(styleKey, { color: defaultColor, width: defaultWidth, lineDash: defaultLineDash });

                    const styles = [
                        new Style({
                            stroke: new Stroke({
                                color: custom.color,
                                width: custom.width,
                                lineDash: custom.lineDash
                            }),
                        })
                    ];

                    const label = props.nama_ruas || props.NM_RUAS;
                    if (label) {
                        styles.push(new Style({
                            text: new Text({
                                text: label.toString().toUpperCase(),
                                font: 'bold 10px Inter, sans-serif',
                                fill: new Fill({ color: '#fff' }),
                                stroke: new Stroke({ color: custom.color, width: 3 }),
                                offsetY: -12,
                                placement: 'line',
                                repeat: 300,
                                overflow: true
                            })
                        }));
                    }
                    return styles;
                }
                return [];
            },
        });
        segmenLayerRef.current = segmenLayer;

        // 5. Marker Layer
        const markerLayer = new VectorLayer({
            source: markerSourceRef.current,
            zIndex: 500,
            style: (feature) => {
                const title = feature.get('title');
                const custom = getStoredStyle('marker_titik', { color: '#1e40af', width: 2, scale: 0.07 });
                return new Style({
                    image: new Icon({
                        anchor: [0.5, 1],
                        src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Blue pin icon
                        scale: custom.scale !== undefined ? custom.scale : 0.07,
                        color: custom.color !== '#1e40af' ? custom.color : undefined, // Apply custom color directly to icon if customized
                    }),
                    text: title ? new Text({
                        text: title.toString().toUpperCase(),
                        font: 'bold 10px Inter, sans-serif',
                        fill: new Fill({ color: custom.color }),
                        stroke: new Stroke({ color: '#ffffff', width: 3 }),
                        offsetY: 8,
                        placement: 'point',
                        overflow: true
                    }) : undefined
                });
            }
        });
        markerLayerRef.current = markerLayer;

        // 6. Highlight Layer
        const highlightLayer = new VectorLayer({
            source: highlightSourceRef.current,
            zIndex: 100,
            style: [
                new Style({
                    stroke: new Stroke({
                        color: 'rgba(34, 211, 238, 0.4)',
                        width: 12,
                    }),
                }),
                new Style({
                    stroke: new Stroke({
                        color: '#22d3ee',
                        width: 4,
                    }),
                }),
            ],
        });

        // Popup Overlay
        const popupEl = document.createElement('div');
        popupEl.className = 'vector-popup-container';
        vectorPopupElementRef.current = popupEl;
        const vectorPopup = new Overlay({
            element: popupEl,
            positioning: 'bottom-center',
            offset: [0, 0],
            stopEvent: true,
        });
        vectorPopupRef.current = vectorPopup;

        const isAtrBpn = basemapUrl && basemapUrl.includes("atrbpn.go.id");
        const finalUrl = isAtrBpn ? `/proxy/basemap?url=${encodeURIComponent(basemapUrl)}` : basemapUrl;
        const initialBasemapSource = (isDark && (!basemapUrl || basemapUrl === 'osm' || basemapUrl.includes('cartocdn.com/dark_all')))
            ? new XYZ({ url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", crossOrigin: 'anonymous' })
            : ((basemapUrl && basemapUrl !== 'osm')
                ? new XYZ({ url: finalUrl, crossOrigin: 'anonymous' })
                : new OSM());

        const basemapLayer = new TileLayer({
            source: initialBasemapSource,
            zIndex: 0
        });
        basemapLayerRef.current = basemapLayer;

        const map = new Map({
            target: mapElement.current,
            layers: [
                basemapLayer,
                batasDesaLayer,
                utamaLayer,
                segmenLayer,
                markerLayer,
                highlightLayer,
            ],
            overlays: [vectorPopup],
            controls: [],
            view: new View({
                center: fromLonLat(center),
                zoom: zoom,
            }),
        });

        // 6. Pointer Move Handler for cursor style
        map.on('pointermove', (evt) => {
            if (evt.dragging) return;

            const pixel = map.getEventPixel(evt.originalEvent);
            const hit = map.hasFeatureAtPixel(pixel, {
                layerFilter: (l) => l.get('id') !== 'highlight',
                hitTolerance: 5
            });

            // Precise check for WMS: use layer.getData(pixel) to reliably detect non-transparent content
            let wmsHit = false;
            if (!hit) {
                const layers = map.getLayers().getArray();
                for (const layer of layers) {
                    if (layer.get('type') === 'wms' && layer.getVisible()) {
                        try {
                            const data = (layer as any).getData(pixel);
                            if (data && (data instanceof Uint8Array || data instanceof Uint8ClampedArray || data instanceof Float32Array)) {
                                if (data.length >= 4 && data[3] > 0) {
                                    wmsHit = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Ignore CORS or other canvas extraction errors
                        }
                    }
                }
            }

            map.getTargetElement().style.cursor = (hit || wmsHit) ? 'pointer' : '';
        });

        // 7. Dynamic Layers Management
        // (Handled via useEffect now)

        mapRef.current = map;
        if (onMapReady) {
            onMapReady(map);
        }

        // Click Handler (Multi-Popup Layer Support)
        map.on('click', async (evt) => {
            highlightSourceRef.current.clear();
            const currentLayers = layersRef.current;

            const vectorItems: MapPopupItem[] = [];

            // 1. Collect all Vector Features at clicked pixel
            map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
                if (feature instanceof Feature && layer !== highlightLayer) {
                    const props = feature.getProperties();
                    const fId = feature.getId() || props.id || props.ID || Math.random().toString();

                    let title = "Detail Data";
                    let badgeText = "Vector";
                    let badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";

                    const layerType = props._layer;
                    if (layerType === 'jalan_segmen') {
                        title = props.nama_ruas || props.NM_RUAS || "Segmen Jalan";
                        badgeText = "Segmen Jalan";
                        badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
                    } else if (layerType === 'jalan_utama') {
                        title = props.nama_ruas || props.NM_RUAS || "Jalan Utama";
                        badgeText = "Jalan Utama";
                        badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
                    } else if (layerType === 'batas_desa') {
                        title = props.nama_desa || props.NAMOBJ || "Batas Desa";
                        badgeText = "Batas Desa";
                        badgeColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
                    } else {
                        const layerId = layer?.get('id');
                        const matchedConfig = currentLayers.find(c => c.id === layerId);
                        title = props.nama || props.name || props.NAMOBJ || matchedConfig?.title || "Dataset Katalog";
                        badgeText = matchedConfig?.title || "Katalog Vector";
                        badgeColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
                    }

                    vectorItems.push({
                        id: fId,
                        layerId: layer?.get('id'),
                        title,
                        badgeText,
                        badgeColor,
                        properties: props,
                        geometry: feature
                    });
                }
            }, { hitTolerance: 6 });

            // 2. Collect all WMS Features from dynamic catalog layers
            const wmsItems: MapPopupItem[] = [];
            const visibleWmsLayers = map.getLayers().getArray()
                .filter(l => l instanceof TileLayer && l.get('type') === 'wms' && l.getVisible());

            for (const layer of visibleWmsLayers) {
                const source = (layer as TileLayer<TileWMS>).getSource();
                const view = map.getView();
                if (source) {
                    const url = source.getFeatureInfoUrl(
                        evt.coordinate,
                        view.getResolution() || 0,
                        view.getProjection(),
                        { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 5 }
                    );

                    if (url) {
                        try {
                            const proxiedUrl = getProxiedLayerUrl(url);
                            const response = await fetch(proxiedUrl);
                            if (response.ok) {
                                const data = await response.json();
                                if (data.features && data.features.length > 0) {
                                    const matchedConfig = currentLayers.find(c => c.id === layer.get('id'));
                                    const catalogTitle = matchedConfig?.title || layer.get('title') || 'Dataset Katalog (WMS)';

                                    data.features.forEach((feat: any, idx: number) => {
                                        const props = feat.properties || {};
                                        const title = props.nama || props.name || props.NAMOBJ || props.nama_ruas || catalogTitle;

                                        wmsItems.push({
                                            id: feat.id || `${layer.get('id')}-${idx}`,
                                            layerId: layer.get('id'),
                                            title,
                                            badgeText: catalogTitle,
                                            badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
                                            properties: props,
                                            geometry: feat.geometry
                                        });
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("WMS GetFeatureInfo failed", err);
                        }
                    }
                }
            }

            const allItems = [...vectorItems, ...wmsItems];

            if (allItems.length > 0) {
                setIsPopupClosing(false);
                setPopupItems(allItems);
                setPopupIndex(0);
                setPopupCoordinate(evt.coordinate);
                vectorPopup.setPosition(evt.coordinate);
            } else {
                closePopup();
            }
        });

        const resizeObserver = new ResizeObserver(() => {
            map.updateSize();
        });

        if (mapElement.current) {
            resizeObserver.observe(mapElement.current);
        }

        return () => {
            resizeObserver.disconnect();
            map.setTarget(undefined);
            mapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const handleStyleChange = () => {
            if (batasDesaLayerRef.current) batasDesaLayerRef.current.changed();
            if (utamaLayerRef.current) utamaLayerRef.current.changed();
            if (segmenLayerRef.current) segmenLayerRef.current.changed();
            if (markerLayerRef.current) markerLayerRef.current.changed();
        };

        window.addEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        return () => {
            window.removeEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        };
    }, []);

    // Reactive effect when active popup item changes
    useEffect(() => {
        if (popupItems.length > 0 && popupItems[popupIndex]) {
            const item = popupItems[popupIndex];
            highlightSourceRef.current.clear();

            if (item.geometry) {
                try {
                    const format = new GeoJSON();
                    let feat;
                    if (item.geometry instanceof Feature) {
                        feat = item.geometry.clone();
                    } else if (typeof item.geometry === 'object' && item.geometry.type) {
                        feat = format.readFeature(item.geometry, { featureProjection: 'EPSG:3857' });
                    }
                    if (feat) {
                        if (Array.isArray(feat)) {
                            highlightSourceRef.current.addFeatures(feat);
                        } else {
                            highlightSourceRef.current.addFeature(feat as Feature);
                        }
                    }
                } catch (err) {
                    console.error("Highlight parse error:", err);
                }
            }

            if (onFeatureSelect) {
                onFeatureSelect(item.properties);
            }
        }
    }, [popupIndex, popupItems, onFeatureSelect]);

    useEffect(() => {
        if (!basemapLayerRef.current) return;
        if (isDark && (!basemapUrl || basemapUrl === 'osm' || basemapUrl.includes('cartocdn.com/dark_all'))) {
            basemapLayerRef.current.setSource(new XYZ({
                url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                crossOrigin: 'anonymous'
            }));
        } else if (!basemapUrl || basemapUrl === 'osm') {
            basemapLayerRef.current.setSource(new OSM());
        } else {
            const isAtrBpn = basemapUrl && basemapUrl.includes("atrbpn.go.id");
            const finalUrl = isAtrBpn ? `/proxy/basemap?url=${encodeURIComponent(basemapUrl)}` : basemapUrl;
            basemapLayerRef.current.setSource(new XYZ({ url: finalUrl, crossOrigin: 'anonymous' }));
        }
    }, [basemapUrl, isDark]);

    const closePopup = () => {
        setIsPopupClosing(true);
        setTimeout(() => {
            setPopupItems([]);
            setPopupIndex(0);
            setPopupCoordinate(null);
            vectorPopupRef.current?.setPosition(undefined);
            highlightSourceRef.current.clear();
            setIsPopupMinimized(false);
            setIsPopupClosing(false);
        }, 200);
    };

    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const existingLayers = map.getLayers();

        // 1. Tag legacy layers if they don't have an ID
        if (batasDesaLayerRef.current) batasDesaLayerRef.current.set('id', 'legacy_batas_desa');
        if (utamaLayerRef.current) utamaLayerRef.current.set('id', 'legacy_utama');
        if (segmenLayerRef.current) segmenLayerRef.current.set('id', 'legacy_segmen');

        // 2. Process dynamic layers
        layers.forEach((layerConfig) => {
            let layer = existingLayers.getArray().find(l => l.get('id') === layerConfig.id);

            if (!layer) {
                // Create new layer
                if (layerConfig.type === 'wms' && layerConfig.url) {
                    layer = new TileLayer({
                        source: new TileWMS({
                            url: layerConfig.url,
                            params: {
                                ...layerConfig.params,
                                'TILED': true,
                                'TRANSPARENT': true
                            },
                            crossOrigin: 'anonymous'
                        }),
                        zIndex: layerConfig.zIndex ?? 50
                    });
                } else if (layerConfig.type === 'vector' && layerConfig.data) {
                    layer = new VectorLayer({
                        source: new VectorSource({
                            features: new GeoJSON().readFeatures(layerConfig.data, {
                                featureProjection: 'EPSG:3857'
                            })
                        }),
                        zIndex: layerConfig.zIndex ?? 50,
                        style: (feature) => {
                            // If a specific style is provided in config
                            if (layerConfig.style) {
                                const customStyle = new Style({
                                    stroke: new Stroke({
                                        color: layerConfig.style.stroke || '#3b82f6',
                                        width: layerConfig.style.width || 2,
                                        lineDash: layerConfig.style.lineDash
                                    }),
                                    fill: new Fill({
                                        color: layerConfig.style.fill || 'rgba(59, 130, 246, 0.05)'
                                    })
                                });

                                if (layerConfig.style.labelField) {
                                    const label = feature.get(layerConfig.style.labelField);
                                    if (label) {
                                        customStyle.setText(new Text({
                                            text: label.toString().toUpperCase(),
                                            font: 'bold 10px sans-serif',
                                            fill: new Fill({ color: CORE_LAYER_COLORS.ADMIN.hex }),
                                            stroke: new Stroke({ color: '#ffffff', width: 3 }),
                                            overflow: true
                                        }));
                                    }
                                }

                                return customStyle;
                            }

                            // Default styles for administrative layers
                            const id = layerConfig.id;
                            if (id === 'legacy_batas_desa') {
                                return new Style({
                                    stroke: new Stroke({ color: CORE_LAYER_COLORS.ADMIN.hex, width: 2, lineDash: [4, 4] }),
                                    fill: new Fill({ color: `${CORE_LAYER_COLORS.ADMIN.hex}0d` })
                                });
                            }
                            if (id.startsWith('legacy_desa_')) {
                                return new Style({
                                    stroke: new Stroke({ color: CORE_LAYER_COLORS.ADMIN.hex, width: 2.5 }),
                                    fill: new Fill({ color: `${CORE_LAYER_COLORS.ADMIN.hex}0d` })
                                });
                            }
                            if (id.startsWith('legacy_poros_')) {
                                return new Style({
                                    stroke: new Stroke({ color: '#000000', width: 3 })
                                });
                            }
                            if (id.startsWith('legacy_segments_')) {
                                const checkMelarosa = feature.get('check_melarosa');
                                const statusJalan = feature.get('status_jalan');
                                const kondisi = (feature.get('kondisi') || feature.get('KONDISI') || '').toLowerCase();

                                let color = '#22c55e'; // Default Green
                                let lineDash: number[] | undefined = undefined;

                                if (statusJalan === 'Jalan Desa') {
                                    // Category 1 & 2
                                    if (kondisi === 'baik') color = '#22c55e';
                                    else if (kondisi === 'sedang') color = '#f59e0b'; // Orange
                                    else if (kondisi === 'rusak ringan' || kondisi === 'rusak berat') color = '#ef4444'; // Merah

                                    if (checkMelarosa === 'Tidak') {
                                        lineDash = [6, 6]; // Dashed
                                    }
                                } else if (statusJalan === 'Jalan Kabupaten') {
                                    // Category 3
                                    if (kondisi === 'baik') {
                                        color = '#2563eb'; // Biru
                                        lineDash = undefined;
                                    } else if (kondisi === 'sedang') {
                                        color = '#60a5fa'; // Biru Muda
                                        lineDash = undefined;
                                    } else if (kondisi === 'rusak ringan' || kondisi === 'rusak berat') {
                                        color = '#2563eb'; // Biru
                                        lineDash = [6, 6]; // Dashed
                                    }
                                }

                                const styles = [
                                    new Style({
                                        stroke: new Stroke({
                                            color: color,
                                            width: 5,
                                            lineDash: lineDash
                                        })
                                    })
                                ];

                                const label = feature.get('nama_ruas') || feature.get('NM_RUAS');
                                if (label) {
                                    styles.push(new Style({
                                        text: new Text({
                                            text: label.toString().toUpperCase(),
                                            font: 'bold 10px Inter, sans-serif',
                                            fill: new Fill({ color: '#fff' }),
                                            stroke: new Stroke({ color: color, width: 3 }),
                                            offsetY: -12,
                                            placement: 'line',
                                            repeat: 300,
                                            overflow: true
                                        })
                                    }));
                                }
                                return styles;
                            }

                            return new Style({
                                stroke: new Stroke({ color: CORE_LAYER_COLORS.CATALOG.hex, width: 2 }),
                                fill: new Fill({ color: `${CORE_LAYER_COLORS.CATALOG.hex}1a` }) // 10% opacity
                            });
                        }
                    });
                } else if (layerConfig.type === 'tile' && layerConfig.url) {
                    layer = new TileLayer({
                        source: new OSM({
                            url: layerConfig.url
                        }),
                        zIndex: layerConfig.zIndex ?? 0
                    });
                }

                if (layer) {
                    layer.set('id', layerConfig.id);
                    layer.set('type', layerConfig.type);
                    map.addLayer(layer);
                }
            }

            if (layer) {
                layer.setVisible(layerConfig.visible !== false);
                layer.setOpacity(layerConfig.opacity ?? 1);
                layer.setZIndex(layerConfig.zIndex ?? 50);

                // Update WMS params if changed (crucial for reactive CQL filtering)
                if (layerConfig.type === 'wms') {
                    const source = (layer as any).getSource() as TileWMS;
                    if (source && layerConfig.params) {
                        source.updateParams(layerConfig.params);
                    }
                }
            }
        });

        // 3. Remove layers that are no longer in the config (only for dynamic layers)
        const PROTECTED_LAYER_IDS = ['legacy_batas_desa', 'legacy_utama', 'legacy_segmen', 'highlight', 'legacy_poros'];
        const dynamicLayerIds = new Set(layers.map(l => l.id));
        existingLayers.getArray().forEach(l => {
            const id = l.get('id');
            if (id && !PROTECTED_LAYER_IDS.includes(id) && !dynamicLayerIds.has(id)) {
                map.removeLayer(l);
            }
        });

    }, [layers]);

    // Marker Management
    useEffect(() => {
        if (!mapRef.current) return;

        markerSourceRef.current.clear();

        const features = markers.map(m => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([m.lon, m.lat])),
                id: m.id,
                title: m.title
            });
            feature.setId(m.id);
            return feature;
        });

        markerSourceRef.current.addFeatures(features);
    }, [markers]);

    useEffect(() => {
        if (geojsonData && (geojsonData as any).type && mapRef.current) {
            const format = new GeoJSON();
            const features = format.readFeatures(geojsonData, {
                featureProjection: 'EPSG:3857'
            });
            vectorSourceRef.current.clear();
            vectorSourceRef.current.addFeatures(features);

            const extent = vectorSourceRef.current.getExtent();

            if (extent && extent[0] !== Infinity) {
                mapRef.current.getView().fit(extent, {
                    padding: [50, 50, 50, 50],
                    duration: 1000
                });
            }
        }
    }, [geojsonData]);

    const formatValue = (key: string, value: any) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') {
            return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
        }
        return String(value);
    };

    return (
        <div ref={mapElement} className={className}>
            {!disablePopup && popupItems.length > 0 && popupCoordinate && vectorPopupElementRef.current && createPortal(
                <div className={cn(
                    "flex flex-col items-center select-none pointer-events-none origin-bottom transform-gpu transition-all duration-300",
                    isPopupClosing ? "animate-out zoom-out-95 fade-out" : "animate-in zoom-in-95 fade-in"
                )}>
                    {/* Main Popup Card Container */}
                    <div className={cn(
                        "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-blue-100 dark:border-slate-800 shadow-2xl w-72 flex flex-col pointer-events-auto relative transition-all duration-300",
                        isPopupMinimized ? "p-2 h-auto" : "p-3.5 max-h-[380px]"
                    )}>
                        {/* Action Controls (Minimize & Close) */}
                        <div className="absolute top-3 right-3 flex gap-1 z-10">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => setIsPopupMinimized(!isPopupMinimized)}
                                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400"
                                    >
                                        {isPopupMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                    {isPopupMinimized ? "Perbesar Popup" : "Minimalkan Popup"}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={closePopup}
                                        className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 rounded-md transition-colors text-slate-400"
                                    >
                                        <X size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                    Tutup Popup
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {/* Multi-layer Popup Navigator Header */}
                        {popupItems.length > 1 && (
                            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-xl text-[10px] font-bold mb-2 mr-14">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={popupIndex === 0}
                                            onClick={() => setPopupIndex(prev => Math.max(0, prev - 1))}
                                            className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-600 dark:text-slate-300"
                                        >
                                            <ChevronLeft size={13} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        Layer Sebelumnya
                                    </TooltipContent>
                                </Tooltip>
                                <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 tracking-tight">
                                    Layer {popupIndex + 1} dari {popupItems.length}
                                </span>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={popupIndex === popupItems.length - 1}
                                            onClick={() => setPopupIndex(prev => Math.min(popupItems.length - 1, prev + 1))}
                                            className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all text-slate-600 dark:text-slate-300"
                                        >
                                            <ChevronRight size={13} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                        Layer Selanjutnya
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        )}

                        {/* Current Active Item Header */}
                        <div className={cn("flex items-center gap-2.5 mb-2.5 shrink-0", popupItems.length === 1 && "mr-12")}>
                            <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20 shrink-0">
                                <Layers size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none inline-block mb-1",
                                    popupItems[popupIndex]?.badgeColor || "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                )}>
                                    {popupItems[popupIndex]?.badgeText || "Feature"}
                                </span>
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate leading-tight">
                                    {popupItems[popupIndex]?.title || 'DETAIL DATA'}
                                </h4>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className={cn(
                            "transition-all duration-300 overflow-hidden flex flex-col",
                            isPopupMinimized ? "max-h-0 opacity-0" : "max-h-[250px] opacity-100 border-t border-slate-100 dark:border-slate-800 pt-2.5"
                        )}>
                            <div className="overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                                {Object.entries(popupItems[popupIndex]?.properties || {})
                                    .filter(([key]) => !['geometry', '_layer', 'bbox', 'fid', 'id'].includes(key))
                                    .map(([key, value]) => (
                                        <div key={key} className="flex flex-col p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter leading-none mb-1">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 break-words">
                                                {formatValue(key, value)}
                                                {(key.toLowerCase().includes('panjang') || key.toLowerCase().includes('lebar')) ? ' m' : ''}
                                            </span>
                                        </div>
                                    ))}
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 gap-1.5">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Koordinat</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <code className="text-[9.5px] font-mono font-bold bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 truncate">
                                        {toLonLat(popupCoordinate)[1].toFixed(6)}, {toLonLat(popupCoordinate)[0].toFixed(6)}
                                    </code>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const lonLat = toLonLat(popupCoordinate);
                                                    const coordText = `${lonLat[1].toFixed(6)}, ${lonLat[0].toFixed(6)}`;
                                                    navigator.clipboard.writeText(coordText);
                                                    toast.success(`Koordinat disalin: ${coordText}`);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors shrink-0"
                                            >
                                                <Copy size={13} />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                            Salin Koordinat
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thick Vertical Dotted Pointer Line & Pulsing Target Point Indicator */}
                    <div className="flex flex-col items-center relative z-20 shrink-0 pointer-events-none">
                        <div className="w-0 h-6 border-l-[3px] border-dotted border-blue-600 dark:border-blue-400 shadow-sm" />
                        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-md animate-ping absolute -bottom-0.5" />
                        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-md" />
                    </div>
                </div>,
                vectorPopupElementRef.current
            )}
        </div>
    );
});

OpenLayersMap.displayName = 'OpenLayersMap';

// Global style for custom scrollbar
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .unselectable { user-select: none; }
    `;
    document.head.appendChild(style);
}
