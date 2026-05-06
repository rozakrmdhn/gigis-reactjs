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
import { X, ChevronUp, ChevronDown, Layers, MapPin } from 'lucide-react';
import { cn } from '~/lib/utils';
import { CORE_LAYER_COLORS } from '~/lib/map-config';
import 'ol/ol.css';

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

    const vectorPopupRef = useRef<Overlay | null>(null);
    const vectorPopupElementRef = useRef<HTMLDivElement | null>(null);

    // Popup State
    const [selectedVectorInfo, setSelectedVectorInfo] = useState<{
        properties: any;
        coordinate: number[] | null;
        id?: string | number | null;
    } | null>(null);
    const [isPopupMinimized, setIsPopupMinimized] = useState(false);
    const [isPopupClosing, setIsPopupClosing] = useState(false);

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
                    return new Style({
                        stroke: new Stroke({
                            color: CORE_LAYER_COLORS.ADMIN.hex,
                            width: 2,
                            lineDash: [4, 4],
                        }),
                        fill: new Fill({
                            color: `${CORE_LAYER_COLORS.ADMIN.hex}0d`, // 05 opacity
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
                    return new Style({
                        stroke: new Stroke({
                            color: CORE_LAYER_COLORS.GENERAL.hex,
                            width: 2,
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

                    let color = '#22c55e'; // Default Green (Baik)
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
                            color = '#60a5fa'; // Biru Muda
                            lineDash = [6, 6]; // Dashed
                        }
                    }

                    const styles = [
                        new Style({
                            stroke: new Stroke({
                                color: color,
                                width: 5,
                                lineDash: lineDash
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
                return new Style({
                    image: new Icon({
                        anchor: [0.5, 1],
                        src: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Blue pin icon
                        scale: 0.07,
                    }),
                    text: title ? new Text({
                        text: title.toString().toUpperCase(),
                        font: 'bold 10px Inter, sans-serif',
                        fill: new Fill({ color: '#1e40af' }), // dark blue
                        stroke: new Stroke({ color: '#ffffff', width: 3 }),
                        offsetY: 8,
                        placement: 'point',
                        overflow: true
                    }) : undefined
                });
            }
        });

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
            offset: [0, -10],
            stopEvent: true,
        });
        vectorPopupRef.current = vectorPopup;

        const initialBasemapSource = (basemapUrl && basemapUrl !== 'osm')
            ? new XYZ({ url: basemapUrl, crossOrigin: 'anonymous' })
            : new OSM();

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

        // Click Handler
        map.on('click', async (evt) => {
            highlightSourceRef.current.clear();

            // 1. Check Vector Features
            const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
                layerFilter: (l) => l !== highlightLayer,
                hitTolerance: 5
            });

            if (feature instanceof Feature) {
                const props = feature.getProperties();
                const featureId = feature.getId();

                setIsPopupClosing(false);
                setSelectedVectorInfo({
                    properties: props,
                    coordinate: evt.coordinate,
                    id: featureId
                });
                vectorPopup.setPosition(evt.coordinate);

                if (onFeatureSelect) {
                    onFeatureSelect(props);
                }

                // Highlight selected feature
                const highlightFeature = feature.clone();
                highlightSourceRef.current.addFeature(highlightFeature);
                return;
            }

            // 2. Check WMS Feature Info from dynamic layers
            // Get all visible WMS layers
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
                        { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 1 }
                    );

                    if (url) {
                        try {
                            // Proxy domain replacement for CORS
                            const proxiedUrl = url.replace('https://saggaserv.my.id/geoserver', `${window.location.origin}/proxy/geoserver`);
                            const response = await fetch(proxiedUrl);
                            const data = await response.json();
                            if (data.features && data.features.length > 0) {
                                const feat = data.features[0];
                                setIsPopupClosing(false);
                                setSelectedVectorInfo({
                                    properties: feat.properties,
                                    coordinate: evt.coordinate,
                                    id: feat.id
                                });
                                vectorPopup.setPosition(evt.coordinate);

                                if (onFeatureSelect) {
                                    onFeatureSelect(feat.properties);
                                }

                                if (feat.geometry) {
                                    const format = new GeoJSON();
                                    const wmsFeatures = format.readFeatures(data);
                                    highlightSourceRef.current.addFeatures(wmsFeatures);
                                }
                                return;
                            }
                        } catch (err) {
                            console.error("WMS GetFeatureInfo failed", err);
                        }
                    }
                }
            }

            // Fallback to legacy WMS check
            if (showJalanKabupaten && jalanKabupatenWmsLayerRef.current) {
                const source = jalanKabupatenWmsLayerRef.current.getSource();
                const view = map.getView();
                if (source) {
                    const url = source.getFeatureInfoUrl(
                        evt.coordinate,
                        view.getResolution() || 0,
                        view.getProjection(),
                        { 'INFO_FORMAT': 'application/json', 'FEATURE_COUNT': 1 }
                    );

                    if (url) {
                        try {
                            // Proxy domain replacement for CORS
                            const proxiedUrl = url.replace('https://saggaserv.my.id/geoserver', `${window.location.origin}/proxy/geoserver`);
                            const response = await fetch(proxiedUrl);
                            const data = await response.json();
                            if (data.features && data.features.length > 0) {
                                const feat = data.features[0];
                                setIsPopupClosing(false);
                                setSelectedVectorInfo({
                                    properties: feat.properties,
                                    coordinate: evt.coordinate,
                                    id: feat.id
                                });
                                vectorPopup.setPosition(evt.coordinate);

                                if (onFeatureSelect) {
                                    onFeatureSelect(feat.properties);
                                }

                                // Try to highlight WMS feature if geometry is returned
                                if (feat.geometry) {
                                    const format = new GeoJSON();
                                    const wmsFeatures = format.readFeatures(data);
                                    highlightSourceRef.current.addFeatures(wmsFeatures);
                                }
                                return;
                            }
                        } catch (err) {
                            console.error("WMS GetFeatureInfo failed", err);
                        }
                    }
                }
            }

            // No feature found - close popup
            closePopup();
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
    }, []); // Removed basemapUrl from dependency to avoid recreation. We use a separate useEffect.

    useEffect(() => {
        if (!basemapLayerRef.current) return;
        if (!basemapUrl || basemapUrl === 'osm') {
            basemapLayerRef.current.setSource(new OSM());
        } else {
            basemapLayerRef.current.setSource(new XYZ({ url: basemapUrl, crossOrigin: 'anonymous' }));
        }
    }, [basemapUrl]);

    const closePopup = () => {
        setIsPopupClosing(true);
        setTimeout(() => {
            setSelectedVectorInfo(null);
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
                    const source = layer.getSource() as TileWMS;
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
            {!disablePopup && selectedVectorInfo && vectorPopupElementRef.current && createPortal(
                <div className={cn(
                    "bg-white/95 backdrop-blur-md rounded-2xl border border-blue-50 shadow-2xl w-64 flex flex-col pointer-events-auto relative mb-4 transition-all duration-300",
                    isPopupMinimized ? "p-2 h-auto" : "p-4 max-h-[350px]",
                    isPopupClosing ? "animate-out zoom-out-95 fade-out" : "animate-in zoom-in-95 fade-in"
                )}>
                    {/* Shadow Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-blue-50" />

                    {/* Actions */}
                    <div className="absolute top-3 right-3 flex gap-1 z-10">
                        <button
                            onClick={() => setIsPopupMinimized(!isPopupMinimized)}
                            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400"
                        >
                            {isPopupMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                            onClick={closePopup}
                            className="p-1 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors text-slate-400"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-3 shrink-0 mr-12">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                            <Layers size={14} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 leading-none mb-1">Informasi Fitur</p>
                            <h4 className="font-bold text-slate-800 text-xs truncate">
                                {selectedVectorInfo.properties.nama_ruas || selectedVectorInfo.properties.NM_RUAS || selectedVectorInfo.properties.nama_desa || 'DETAIL DATA'}
                            </h4>
                        </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                        "transition-all duration-300 overflow-hidden flex flex-col",
                        isPopupMinimized ? "max-h-0 opacity-0" : "max-h-[250px] opacity-100 border-t border-slate-100 pt-3"
                    )}>
                        <div className="overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {Object.entries(selectedVectorInfo.properties)
                                .filter(([key]) => !['geometry', '_layer', 'bbox', 'fid', 'id'].includes(key))
                                .map(([key, value]) => (
                                    <div key={key} className="flex flex-col p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[11px] font-extrabold text-slate-700 break-words">
                                            {formatValue(key, value)}
                                            {(key.toLowerCase().includes('panjang') || key.toLowerCase().includes('lebar')) ? ' m' : ''}
                                        </span>
                                    </div>
                                ))}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Koordinat</span>
                            <code className="text-[9px] font-bold bg-slate-50 px-2 py-0.5 rounded border text-blue-600">
                                {toLonLat(selectedVectorInfo.coordinate!)[1].toFixed(6)}, {toLonLat(selectedVectorInfo.coordinate!)[0].toFixed(6)}
                            </code>
                        </div>
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
