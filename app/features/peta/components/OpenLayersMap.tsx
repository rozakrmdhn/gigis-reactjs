import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Stroke, Fill, Text, Icon, Circle as CircleStyle } from 'ol/style';
import { CORE_LAYER_COLORS } from '~/lib/map-config';
import 'ol/ol.css';
import { getProxiedLayerUrl } from '~/lib/utils';
import { useTheme } from "next-themes";
import * as turf from '@turf/turf';

const getStoredStyle = (key: string, defaultStyle: { color: string; width: number; lineDash?: number[]; scale?: number; visible?: boolean }) => {
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
                    } else if (item.lineDash === 'dotted') {
                        lineDashVal = [2, 4];
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
                        fillColor: item.fillColor || `${item.color || defaultStyle.color}0d`,
                        visible: item.visible !== undefined ? Boolean(item.visible) : true
                    };
                }
            }
        }
    } catch (e) {
        console.error("Error loading custom styles from localStorage:", e);
    }
    return { ...defaultStyle, visible: defaultStyle.visible !== false };
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
    onInspectFeatures?: (features: any[], coordinate: [number, number] | null) => void;
    isInspectMode?: boolean;
    bufferCenter?: [number, number] | null;
    bufferRadiusKm?: number;
    isBufferMode?: boolean;
    onBufferPointSelect?: (coordinate: [number, number]) => void;
    overlapGeometry?: any;
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
    fitBuffer: () => void;
    fitOverlap: () => void;
    getMap: () => Map | null;
}

export const OpenLayersMap = forwardRef<OpenLayersMapRef, OpenLayersMapProps>(({
    className,
    center = [111.8328268, -7.2288555], // Bojonegoro
    zoom = 11,
    layers = [],
    geojsonData,
    showJalanKabupaten = false,
    showBatasDesa = false,
    showJalanUtama = false,
    showSegmenJalan = false,
    basemapUrl,
    markers = [],
    onFeatureSelect,
    onInspectFeatures,
    isInspectMode = false,
    bufferCenter = null,
    bufferRadiusKm = 1.0,
    isBufferMode = false,
    onBufferPointSelect,
    overlapGeometry = null,
    disablePopup = false,
    onMapReady,
}, ref) => {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const markerSourceRef = useRef<VectorSource>(new VectorSource());
    const highlightSourceRef = useRef<VectorSource>(new VectorSource());
    const bufferSourceRef = useRef<VectorSource>(new VectorSource());
    const overlapSourceRef = useRef<VectorSource>(new VectorSource());

    // Layer Refs
    const basemapLayerRef = useRef<TileLayer<OSM | XYZ> | null>(null);
    const batasDesaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const utamaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const segmenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const bufferLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const overlapLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const markerLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const onInspectFeaturesRef = useRef(onInspectFeatures);
    useEffect(() => {
        onInspectFeaturesRef.current = onInspectFeatures;
    }, [onInspectFeatures]);

    const isInspectModeRef = useRef(isInspectMode);
    useEffect(() => {
        isInspectModeRef.current = isInspectMode;
        if (mapRef.current) {
            mapRef.current.getTargetElement().style.cursor = (isInspectMode || isBufferMode) ? 'crosshair' : '';
        }
    }, [isInspectMode, isBufferMode]);

    const isBufferModeRef = useRef(isBufferMode);
    useEffect(() => {
        isBufferModeRef.current = isBufferMode;
    }, [isBufferMode]);

    const onBufferPointSelectRef = useRef(onBufferPointSelect);
    useEffect(() => {
        onBufferPointSelectRef.current = onBufferPointSelect;
    }, [onBufferPointSelect]);

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

            try {
                const format = new GeoJSON();
                const features = format.readFeatures(geojson, {
                    featureProjection: 'EPSG:3857'
                });

                if (features && features.length > 0) {
                    const tempSource = new VectorSource({ features });
                    const extent = tempSource.getExtent();
                    if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
                        mapRef.current.getView().fit(extent, {
                            padding: [60, 60, 60, 60],
                            duration: 1000,
                            maxZoom: 16
                        });
                    }
                    tempSource.clear();
                }
            } catch (err) {
                console.error("Failed to zoom to feature:", err);
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
        },
        fitBuffer: () => {
            if (!mapRef.current) return;
            const extent = bufferSourceRef.current.getExtent();
            if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
                mapRef.current.getView().fit(extent, {
                    padding: [80, 80, 80, 80],
                    duration: 800,
                    maxZoom: 17
                });
            }
        },
        fitOverlap: () => {
            if (!mapRef.current) return;
            const extent = overlapSourceRef.current.getExtent();
            if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
                mapRef.current.getView().fit(extent, {
                    padding: [80, 80, 80, 80],
                    duration: 800,
                    maxZoom: 17
                });
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
            declutter: true,
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
            declutter: true,
            visible: showSegmenJalan,
            style: (feature) => {
                const props = feature.getProperties();
                const layer = props._layer;
                if (layer === 'jalan_segmen') {
                    let symbologyMode = 'kondisi';
                    try {
                        if (typeof window !== 'undefined') {
                            symbologyMode = localStorage.getItem('gigis_symbology_mode') || 'kondisi';
                        }
                    } catch (e) { }

                    let styleKey = 'jalan_desa_baik';
                    let defaultColor = '#22c55e';
                    let defaultWidth = 5;
                    let defaultLineDash: number[] | undefined = undefined;

                    if (symbologyMode === 'status_verifikasi') {
                        const rawStatus = (props.status_verifikasi || props.status || props.status_usulan || '').toString().toLowerCase();
                        if (rawStatus.includes('setuju') || rawStatus.includes('approved') || rawStatus.includes('terverifikasi') || props.is_verified) {
                            styleKey = 'verif_approved';
                            defaultColor = '#10b981';
                        } else if (rawStatus.includes('ajuk') || rawStatus.includes('submit') || rawStatus.includes('proses') || rawStatus.includes('evaluasi')) {
                            styleKey = 'verif_submitted';
                            defaultColor = '#3b82f6';
                        } else if (rawStatus.includes('revisi') || rawStatus.includes('tolak') || rawStatus.includes('catatan')) {
                            styleKey = 'verif_revision';
                            defaultColor = '#f43f5e';
                        } else {
                            styleKey = 'verif_draft';
                            defaultColor = '#94a3b8';
                            defaultLineDash = [6, 6];
                        }
                    } else if (symbologyMode === 'jenis_perkerasan') {
                        const rawPerkerasan = (props.jenis_perkerasan || props.perkerasan || props.tipe_perkerasan || props.jenis_konstruksi || '').toString().toLowerCase();
                        if (rawPerkerasan.includes('aspal') || rawPerkerasan.includes('hotmix') || rawPerkerasan.includes('lapen')) {
                            styleKey = 'perkerasan_aspal';
                            defaultColor = '#0f172a';
                        } else if (rawPerkerasan.includes('beton') || rawPerkerasan.includes('rigid') || rawPerkerasan.includes('cor')) {
                            styleKey = 'perkerasan_beton';
                            defaultColor = '#0284c7';
                        } else if (rawPerkerasan.includes('paving') || rawPerkerasan.includes('conblock')) {
                            styleKey = 'perkerasan_paving';
                            defaultColor = '#d97706';
                        } else {
                            styleKey = 'perkerasan_tanah';
                            defaultColor = '#854d0e';
                            defaultLineDash = [6, 6];
                        }
                    } else if (symbologyMode === 'status_jalan') {
                        const statusJalan = (props.status_jalan || '').toString();
                        const checkMelarosa = props.check_melarosa;
                        if (statusJalan === 'Jalan Kabupaten') {
                            styleKey = 'hirarki_kabupaten';
                            defaultColor = '#9333ea';
                            defaultWidth = 6;
                        } else if (checkMelarosa === 'Tidak') {
                            styleKey = 'hirarki_lingkungan';
                            defaultColor = '#06b6d4';
                            defaultWidth = 4;
                        } else {
                            styleKey = 'hirarki_poros';
                            defaultColor = '#4f46e5';
                            defaultWidth = 6;
                        }
                    } else {
                        // Default Mode: 'kondisi'
                        const checkMelarosa = props.check_melarosa;
                        const statusJalan = props.status_jalan;
                        const kondisi = (props.kondisi || props.KONDISI || '').toLowerCase();

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
                    }

                    const custom = getStoredStyle(styleKey, { color: defaultColor, width: defaultWidth, lineDash: defaultLineDash });
                    if (custom.visible === false) {
                        return []; // Layer category isolated/hidden by user
                    }

                    const styles = [
                        new Style({
                            stroke: new Stroke({
                                color: custom.color,
                                width: custom.width,
                                lineDash: custom.lineDash
                            }),
                        })
                    ];

                    const label = props.nama_segmen || props.nama_ruas || props.NM_RUAS || props.nama_jalan;
                    if (label) {
                        styles.push(new Style({
                            text: new Text({
                                text: label.toString(),
                                font: '600 10px Inter, system-ui, sans-serif',
                                fill: new Fill({ color: '#ffffff' }),
                                stroke: new Stroke({ color: '#090d16', width: 3.5 }),
                                offsetY: -10,
                                placement: 'line',
                                overflow: false,
                                maxAngle: Math.PI / 4,
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
            declutter: true,
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

        // 6. Buffer Layer (Turf.js analysis visualization)
        const bufferLayer = new VectorLayer({
            source: bufferSourceRef.current,
            zIndex: 150,
            style: (feature) => {
                const geomType = feature.getGeometry()?.getType();
                if (geomType === 'Point') {
                    return new Style({
                        image: new Icon({
                            anchor: [0.5, 0.5],
                            src: 'https://cdn-icons-png.flaticon.com/512/7588/7588725.png',
                            scale: 0.05,
                        })
                    });
                }
                return [
                    new Style({
                        stroke: new Stroke({
                            color: '#0891b2',
                            width: 6,
                        }),
                    }),
                    new Style({
                        stroke: new Stroke({
                            color: '#06b6d4',
                            width: 2.5,
                            lineDash: [6, 6]
                        }),
                        fill: new Fill({
                            color: 'rgba(6, 182, 212, 0.15)'
                        })
                    })
                ];
            }
        });
        bufferLayerRef.current = bufferLayer;

        // 7. Overlap Intersection Layer (Turf.js Overlap Engine visualization)
        const overlapLayer = new VectorLayer({
            source: overlapSourceRef.current,
            zIndex: 180,
            style: (feature, resolution) => {
                const zoom = Math.log2(156543.03392804097 / resolution);
                const geomType = feature.getGeometry()?.getType();
                const color = feature.get('color') || '#f59e0b';
                const name = feature.get('name');

                const styles: Style[] = [];

                if (geomType === 'LineString' || geomType === 'MultiLineString') {
                    styles.push(
                        new Style({
                            stroke: new Stroke({
                                color: '#090d16',
                                width: 7,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }),
                        }),
                        new Style({
                            stroke: new Stroke({
                                color: color,
                                width: 4,
                                lineCap: 'round',
                                lineJoin: 'round',
                            }),
                        })
                    );

                    if (name && zoom >= 13.5) {
                        styles.push(
                            new Style({
                                text: new Text({
                                    text: String(name),
                                    font: 'bold 11px Inter, system-ui, sans-serif',
                                    fill: new Fill({ color: '#ffffff' }),
                                    stroke: new Stroke({ color: '#090d16', width: 3.5, lineJoin: 'round' }),
                                    placement: 'line',
                                    offsetY: -10,
                                    repeat: 500,
                                    maxAngle: Math.PI / 6,
                                    overflow: false,
                                }),
                            })
                        );
                    }
                    return styles;
                }

                if (geomType === 'Point' || geomType === 'MultiPoint') {
                    return new Style({
                        image: new CircleStyle({
                            radius: 7,
                            fill: new Fill({ color: color }),
                            stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
                        }),
                        text: name ? new Text({
                            text: String(name),
                            font: 'bold 10px Inter, system-ui, sans-serif',
                            fill: new Fill({ color: '#ffffff' }),
                            stroke: new Stroke({ color: '#090d16', width: 3 }),
                            offsetY: -14,
                        }) : undefined
                    });
                }

                styles.push(
                    new Style({
                        stroke: new Stroke({
                            color: color,
                            width: 3,
                        }),
                        fill: new Fill({
                            color: `${color}40`,
                        }),
                    }),
                    new Style({
                        stroke: new Stroke({
                            color: '#ffffff',
                            width: 1.5,
                            lineDash: [4, 4],
                        }),
                    })
                );

                if (name) {
                    styles.push(
                        new Style({
                            text: new Text({
                                text: String(name),
                                font: 'bold 10px Inter, system-ui, sans-serif',
                                fill: new Fill({ color: '#ffffff' }),
                                stroke: new Stroke({ color: '#090d16', width: 3 }),
                                overflow: true,
                            }),
                        })
                    );
                }

                return styles;
            },
        });
        overlapLayerRef.current = overlapLayer;

        // 8. Highlight Layer
        const highlightLayer = new VectorLayer({
            source: highlightSourceRef.current,
            zIndex: 200,
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
                bufferLayer,
                overlapLayer,
                markerLayer,
                highlightLayer,
            ],
            overlays: [],
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

            if (isInspectModeRef.current) {
                map.getTargetElement().style.cursor = 'crosshair';
            } else {
                map.getTargetElement().style.cursor = (hit || wmsHit) ? 'pointer' : '';
            }
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
                        title = props.nama_ruas || props.NM_RUAS || props.nama_segmen || "Segmen Jalan";
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
                        title = props.nama || props.name || props.NAMOBJ || matchedConfig?.title || "Dataset Spasial";
                        badgeText = matchedConfig?.title || "Vektor";
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
            const lonLat = toLonLat(evt.coordinate);

            if (onInspectFeaturesRef.current) {
                const geojsonFormat = new GeoJSON();
                const inspectedList = allItems.map((item) => {
                    let geomObj = item.geometry;
                    if (item.geometry instanceof Feature) {
                        try {
                            const g = item.geometry.getGeometry();
                            if (g) {
                                geomObj = geojsonFormat.writeGeometryObject(g, {
                                    featureProjection: 'EPSG:3857',
                                    dataProjection: 'EPSG:4326'
                                });
                            }
                        } catch (e) {}
                    }
                    return {
                        id: String(item.id),
                        layerId: item.layerId,
                        title: item.title,
                        layerTitle: item.badgeText,
                        type: item.layerId?.startsWith('layer-') ? 'wms' as const : 'vector' as const,
                        badgeText: item.badgeText,
                        badgeColor: item.badgeColor,
                        properties: item.properties,
                        coordinate: [lonLat[1], lonLat[0]] as [number, number],
                        geometry: geomObj,
                    };
                });
                onInspectFeaturesRef.current(inspectedList, [lonLat[1], lonLat[0]]);
            }

            if (isBufferModeRef.current && onBufferPointSelectRef.current) {
                onBufferPointSelectRef.current([lonLat[1], lonLat[0]]);
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

    // Turf.js Buffer Visualization Effect
    useEffect(() => {
        if (!mapRef.current) return;
        bufferSourceRef.current.clear();
        if (bufferCenter) {
            try {
                const centerPoint = turf.point([bufferCenter[1], bufferCenter[0]]);
                const bufferPoly = turf.buffer(centerPoint, bufferRadiusKm || 1.0, { units: 'kilometers' });
                if (bufferPoly) {
                    const format = new GeoJSON();
                    const feat = format.readFeature(bufferPoly, { featureProjection: 'EPSG:3857' });
                    const centerPointGeom = new Feature({
                        geometry: new Point(fromLonLat([bufferCenter[1], bufferCenter[0]]))
                    });
                    bufferSourceRef.current.addFeatures([feat as Feature, centerPointGeom]);
                }
            } catch (err) {
                console.error("Failed to render buffer polygon:", err);
            }
        }
    }, [bufferCenter, bufferRadiusKm]);

    // Turf.js Overlap Intersection Visualization Effect
    useEffect(() => {
        if (!mapRef.current) return;
        overlapSourceRef.current.clear();
        if (overlapGeometry) {
            try {
                const format = new GeoJSON();
                const features = format.readFeatures(overlapGeometry, { featureProjection: 'EPSG:3857' });
                if (Array.isArray(features) && features.length > 0) {
                    overlapSourceRef.current.addFeatures(features);
                } else if (features) {
                    overlapSourceRef.current.addFeature(features as any);
                }
            } catch (err) {
                console.error("Failed to render overlap geometry:", err);
            }
        }
    }, [overlapGeometry]);

    useEffect(() => {
        const handleStyleChange = () => {
            if (batasDesaLayerRef.current) batasDesaLayerRef.current.changed();
            if (utamaLayerRef.current) utamaLayerRef.current.changed();
            if (segmenLayerRef.current) segmenLayerRef.current.changed();
            if (markerLayerRef.current) markerLayerRef.current.changed();
            if (bufferLayerRef.current) bufferLayerRef.current.changed();
            if (overlapLayerRef.current) overlapLayerRef.current.changed();
        };

        window.addEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        return () => {
            window.removeEventListener('MELAROSA-vector-styles-changed', handleStyleChange);
        };
    }, []);

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
                        declutter: true,
                        zIndex: layerConfig.zIndex ?? 50,
                        style: (feature, resolution) => {
                            const zoom = Math.log2(156543.03392804097 / resolution);

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

                                // Only display administrative label at appropriate zoom range (zoom 11.5 - 15.5)
                                if (layerConfig.style.labelField && zoom >= 11.5 && zoom <= 15.5) {
                                    const label = feature.get(layerConfig.style.labelField);
                                    if (label) {
                                        customStyle.setText(new Text({
                                            text: label.toString().toUpperCase(),
                                            font: 'bold 10px Inter, system-ui, sans-serif',
                                            fill: new Fill({ color: CORE_LAYER_COLORS.ADMIN.hex }),
                                            stroke: new Stroke({ color: '#090d16', width: 3 }),
                                            overflow: false,
                                            placement: 'point'
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
                                const styles = [
                                    new Style({
                                        stroke: new Stroke({ color: '#090d16', width: 5.5, lineCap: 'round', lineJoin: 'round' })
                                    }),
                                    new Style({
                                        stroke: new Stroke({ color: '#f97316', width: 3.5, lineCap: 'round', lineJoin: 'round' })
                                    })
                                ];

                                // Road names only show at zoom >= 13.5 to prevent visual clutter
                                if (zoom >= 13.5) {
                                    const rawLabel = feature.get('nama_ruas') || feature.get('NM_RUAS') || feature.get('nama_jalan') || feature.get('nama');
                                    if (rawLabel) {
                                        styles.push(new Style({
                                            text: new Text({
                                                text: String(rawLabel),
                                                font: '600 11px Inter, system-ui, sans-serif',
                                                fill: new Fill({ color: '#ffffff' }),
                                                stroke: new Stroke({ color: '#090d16', width: 3.5, lineJoin: 'round' }),
                                                offsetY: -10,
                                                placement: 'line',
                                                repeat: 600, // Repeat cleanly every 600px along the road
                                                maxAngle: Math.PI / 6, // 30 deg max bend to prevent distortion
                                                overflow: false, // Don't render on short lines
                                            })
                                        }));
                                    }
                                }
                                return styles;
                            }
                            if (id.startsWith('legacy_segments_')) {
                                const checkMelarosa = feature.get('check_melarosa');
                                const statusJalan = feature.get('status_jalan');
                                const kondisi = (feature.get('kondisi') || feature.get('KONDISI') || '').toLowerCase();

                                let color = '#22c55e'; // Default Green
                                let lineDash: number[] | undefined = undefined;

                                if (statusJalan === 'Jalan Desa') {
                                    if (kondisi === 'baik') color = '#22c55e';
                                    else if (kondisi === 'sedang') color = '#f59e0b'; // Orange
                                    else if (kondisi === 'rusak ringan' || kondisi === 'rusak berat') color = '#ef4444'; // Merah

                                    if (checkMelarosa === 'Tidak') {
                                        lineDash = [6, 6];
                                    }
                                } else if (statusJalan === 'Jalan Kabupaten') {
                                    if (kondisi === 'baik') {
                                        color = '#2563eb';
                                        lineDash = undefined;
                                    } else if (kondisi === 'sedang') {
                                        color = '#60a5fa';
                                        lineDash = undefined;
                                    } else if (kondisi === 'rusak ringan' || kondisi === 'rusak berat') {
                                        color = '#2563eb';
                                        lineDash = [6, 6];
                                    }
                                }

                                const styles = [
                                    new Style({
                                        stroke: new Stroke({
                                            color: '#090d16',
                                            width: 6,
                                            lineCap: 'round',
                                            lineJoin: 'round',
                                        })
                                    }),
                                    new Style({
                                        stroke: new Stroke({
                                            color: color,
                                            width: 4,
                                            lineDash: lineDash,
                                            lineCap: 'round',
                                            lineJoin: 'round',
                                        })
                                    })
                                ];

                                // Segment details only show at detailed zoom >= 15.5
                                if (zoom >= 15.5) {
                                    const label = feature.get('nama_segmen') || feature.get('nama_ruas') || feature.get('NM_RUAS') || (feature.get('kode_ruas') ? `Ruas ${feature.get('kode_ruas')}` : null);
                                    if (label) {
                                        styles.push(new Style({
                                            text: new Text({
                                                text: String(label),
                                                font: '600 10px Inter, system-ui, sans-serif',
                                                fill: new Fill({ color: '#f8fafc' }),
                                                stroke: new Stroke({ color: '#090d16', width: 3.5, lineJoin: 'round' }),
                                                offsetY: -10,
                                                placement: 'line',
                                                repeat: 400,
                                                maxAngle: Math.PI / 6,
                                                overflow: false,
                                            })
                                        }));
                                    }
                                }
                                return styles;
                            }

                            return new Style({
                                stroke: new Stroke({ color: CORE_LAYER_COLORS.CATALOG.hex, width: 2 }),
                                fill: new Fill({ color: `${CORE_LAYER_COLORS.CATALOG.hex}1a` })
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
                } else if (layerConfig.type === 'vector' && layerConfig.data && (layer as any).getSource) {
                    const vecSource = (layer as any).getSource();
                    if (vecSource && typeof vecSource.clear === 'function') {
                        vecSource.clear();
                        const features = new GeoJSON().readFeatures(layerConfig.data, {
                            featureProjection: 'EPSG:3857'
                        });
                        vecSource.addFeatures(features);
                    }
                }
            }
        });

        // 3. Remove layers that are no longer in the config (only for dynamic layers)
        const STATIC_INTERNAL_LAYER_IDS = [
            'legacy_batas_desa',
            'legacy_utama',
            'legacy_segmen',
            'highlight',
            'buffer_layer',
            'overlap_layer',
            'marker_layer',
            'basemap'
        ];
        const dynamicLayerIds = new Set(layers.map(l => l.id));
        const layersToRemove: any[] = [];
        existingLayers.getArray().forEach(l => {
            const id = l.get('id');
            if (id && !STATIC_INTERNAL_LAYER_IDS.includes(id) && !dynamicLayerIds.has(id)) {
                layersToRemove.push(l);
            }
        });
        layersToRemove.forEach(l => {
            if (l && typeof (l as any).getSource === 'function') {
                (l as any).getSource()?.clear?.();
            }
            map.removeLayer(l);
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
        <div ref={mapElement} className={className} />
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
