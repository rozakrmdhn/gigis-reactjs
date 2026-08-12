import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import OLMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat, toLonLat } from "ol/proj";
import Overlay from "ol/Overlay";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import { Draw, Modify } from "ol/interaction";
import { Style, Stroke, Fill, Circle as CircleStyle, Text as StyleText } from "ol/style";
import { X, MapPin, Copy } from "lucide-react";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import type { UsulanDesaGeometry, GeometryType, GeoJSONGeometry } from "../types/usulan-desa.types";
import { desaService } from "~/services/desa";
import type { MapLayerConfig } from "~/features/peta/components/OpenLayersMap";
import { useTheme } from "next-themes";
import "ol/ol.css";

interface GeometryMapProps {
    savedGeometries: UsulanDesaGeometry[];
    drawMode: GeometryType | null;
    editingGeometry?: UsulanDesaGeometry | null;
    onDrawComplete: (geom: GeoJSONGeometry | GeoJSONGeometry[]) => void;
    className?: string;
    showDesaBoundaries?: boolean;
    idKecamatanForDesa?: number | null;
    basemapUrl?: string;
    isLeftPanelOpen?: boolean;
    isRightPanelOpen?: boolean;
    layers?: MapLayerConfig[];
}

export interface GeometryMapRef {
    zoomToGeometry: (geometry: UsulanDesaGeometry) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetRotation: () => void;
    addPointsFromCoordinates: (coords: [number, number][]) => void;
    addLineFromCoordinates: (coords: [number, number][]) => void;
    addPolygonFromCoordinates: (coords: [number, number][]) => void;
}

export const GeometryMap = forwardRef<GeometryMapRef, GeometryMapProps>(({
    savedGeometries,
    drawMode,
    editingGeometry = null,
    onDrawComplete,
    className,
    showDesaBoundaries = false,
    idKecamatanForDesa = null,
    basemapUrl = "osm",
    isLeftPanelOpen = false,
    isRightPanelOpen = false,
    layers = [],
}, ref) => {
    const mapElementRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<OLMap | null>(null);

    // Vector Sources & Layers
    const basemapLayerRef = useRef<TileLayer<OSM | XYZ> | null>(null);
    const savedSourceRef = useRef<VectorSource>(new VectorSource());
    const drawSourceRef = useRef<VectorSource>(new VectorSource());
    const desaSourceRef = useRef<VectorSource>(new VectorSource());

    // Popup refs
    const popupOverlayRef = useRef<Overlay | null>(null);
    const popupElementRef = useRef<HTMLDivElement>(null);

    // Selected Feature Popup State
    const [selectedGeometryInfo, setSelectedGeometryInfo] = useState<{
        keterangan: string;
        type: string;
        coordinate: number[];
        geom?: any;
    } | null>(null);

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    // Dynamically calculate map viewport padding based on side panel states
    // Format: [top, right, bottom, left]
    const getViewportPadding = (): [number, number, number, number] => {
        const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
        const topPadding = 80;
        const bottomPadding = 50;
        const leftPadding = isDesktop && isLeftPanelOpen ? 384 + 50 : 50;
        const rightPadding = isDesktop && isRightPanelOpen ? 400 + 50 : 50;

        return [topPadding, rightPadding, bottomPadding, leftPadding];
    };

    const formatMapCoordinateText = (geom: any, clickCoord: number[]) => {
        if (geom && geom.type === "Point" && geom.coordinates) {
            const [lon, lat] = geom.coordinates;
            return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
        }
        // For LineString, Polygon, or fallback (show click coordinates)
        const lonLat = toLonLat(clickCoord);
        return `${lonLat[1].toFixed(6)}, ${lonLat[0].toFixed(6)}`;
    };

    const handleCopyMapCoordinate = (geom: any, clickCoord: number[]) => {
        let textToCopy = "";
        if (geom && geom.type === "Point" && geom.coordinates) {
            const [lon, lat] = geom.coordinates;
            textToCopy = `${lat}, ${lon}`;
        } else {
            // For LineString, Polygon, or fallback (copy click coordinates)
            const lonLat = toLonLat(clickCoord);
            textToCopy = `${lonLat[1]}, ${lonLat[0]}`;
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => toast.success("Koordinat lokasi berhasil disalin!"))
                .catch(() => toast.error("Gagal menyalin koordinat."));
        }
    };

    // React to panel toggles to update map size
    useEffect(() => {
        const map = mapRef.current;
        if (map) {
            setTimeout(() => {
                map.updateSize();
            }, 300);
        }
    }, [isLeftPanelOpen, isRightPanelOpen]);

    // Style Helper based on geometry type and optional label
    const getGeometryStyle = (type: string, label?: string) => {
        const labelStyle = label ? new StyleText({
            text: label,
            font: "bold 11px 'Inter', sans-serif",
            fill: new Fill({ color: "#1e293b" }),
            stroke: new Stroke({ color: "#ffffff", width: 3 }),
            overflow: true,
            offsetY: type === "Point" ? -16 : 0,
            padding: [2, 4, 2, 4],
            backgroundFill: new Fill({ color: "rgba(255,255,255,0.75)" }),
            backgroundStroke: new Stroke({ color: "rgba(100,116,139,0.3)", width: 1 })
        }) : undefined;

        if (type === "Point") {
            return new Style({
                image: new CircleStyle({
                    radius: 8,
                    fill: new Fill({ color: "#ef4444" }), // Red 500
                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                }),
                text: labelStyle
            });
        } else if (type === "LineString") {
            return new Style({
                stroke: new Stroke({
                    color: "#3b82f6", // Blue 500
                    width: 4
                }),
                text: labelStyle
            });
        } else {
            // Polygon
            return new Style({
                stroke: new Stroke({
                    color: "#10b981", // Emerald 500
                    width: 3
                }),
                fill: new Fill({
                    color: "rgba(16, 185, 129, 0.2)"
                }),
                text: labelStyle
            });
        }
    };

    // Zoom/Focus ref method
    useImperativeHandle(ref, () => ({
        zoomToGeometry: (geometry: UsulanDesaGeometry) => {
            const map = mapRef.current;
            if (!map || !geometry.geom) return;

            const format = new GeoJSON();
            const feature = format.readFeature(geometry.geom, {
                dataProjection: "PROJCS" in geometry.geom ? undefined : "EPSG:4326",
                featureProjection: "EPSG:3857"
            }) as any;

            const olGeometry = feature.getGeometry();
            if (olGeometry) {
                const extent = olGeometry.getExtent();
                const isPoint = geometry.geom.type === "Point";

                map.getView().fit(extent, {
                    padding: getViewportPadding(),
                    duration: 1000,
                    maxZoom: 18
                });

                // Show popup automatically on focus
                const coords = isPoint
                    ? (olGeometry.getCoordinates() as number[])
                    : (olGeometry.getClosestPoint(map.getView().getCenter() || [0, 0]) as number[]);

                setSelectedGeometryInfo({
                    keterangan: geometry.keterangan_geometry,
                    type: geometry.geom.type,
                    coordinate: coords
                });

                if (popupOverlayRef.current) {
                    popupOverlayRef.current.setPosition(coords);
                }
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
        addPointsFromCoordinates: (coords: [number, number][]) => {
            const map = mapRef.current;
            if (!map || coords.length === 0) return;

            drawSourceRef.current.clear();
            const features: Feature[] = [];
            const geojsons: GeoJSONGeometry[] = [];

            coords.forEach(([lng, lat]) => {
                const coord = fromLonLat([lng, lat]);
                const feature = new Feature({
                    geometry: new Point(coord)
                });
                feature.set("geometryType", "Point");
                features.push(feature);

                geojsons.push({
                    type: "Point",
                    coordinates: [lng, lat]
                });
            });

            drawSourceRef.current.addFeatures(features);

            if (geojsons.length === 1) {
                onDrawComplete(geojsons[0]);
            } else {
                onDrawComplete(geojsons);
            }

            const extent = drawSourceRef.current.getExtent();
            map.getView().fit(extent, {
                padding: getViewportPadding(),
                duration: 500,
                maxZoom: 16
            });
        },
        addLineFromCoordinates: (coords: [number, number][]) => {
            const map = mapRef.current;
            if (!map || coords.length < 2) return;

            const transformedCoords = coords.map(c => fromLonLat(c));
            const feature = new Feature({
                geometry: new LineString(transformedCoords)
            });
            feature.set("geometryType", "LineString");

            drawSourceRef.current.clear();
            drawSourceRef.current.addFeature(feature);

            const geojson: GeoJSONGeometry = {
                type: "LineString",
                coordinates: coords
            };
            onDrawComplete(geojson);

            const extent = feature.getGeometry()?.getExtent();
            if (extent) {
                map.getView().fit(extent, {
                    padding: getViewportPadding(),
                    duration: 500,
                    maxZoom: 16
                });
            }
        },
        addPolygonFromCoordinates: (coords: [number, number][]) => {
            const map = mapRef.current;
            if (!map || coords.length < 3) return;

            // Ensure the polygon is closed (first and last coordinate must be the same)
            const closedCoords = [...coords];
            if (
                closedCoords[0][0] !== closedCoords[closedCoords.length - 1][0] ||
                closedCoords[0][1] !== closedCoords[closedCoords.length - 1][1]
            ) {
                closedCoords.push(closedCoords[0]);
            }

            const transformedCoords = closedCoords.map(c => fromLonLat(c));
            const feature = new Feature({
                geometry: new Polygon([transformedCoords])
            });
            feature.set("geometryType", "Polygon");

            drawSourceRef.current.clear();
            drawSourceRef.current.addFeature(feature);

            const geojson: GeoJSONGeometry = {
                type: "Polygon",
                coordinates: [closedCoords]
            };
            onDrawComplete(geojson);

            const extent = feature.getGeometry()?.getExtent();
            if (extent) {
                map.getView().fit(extent, {
                    padding: getViewportPadding(),
                    duration: 500,
                    maxZoom: 16
                });
            }
        }
    }));

    // 1. Map Initialization
    useEffect(() => {
        if (!mapElementRef.current) return;

        // Tile layer basemap
        const isAtrBpn = basemapUrl && basemapUrl.includes("atrbpn.go.id");
        const finalUrl = isAtrBpn ? `/proxy/basemap?url=${basemapUrl}` : basemapUrl;
        const initialBasemapSource = (isDark && (!basemapUrl || basemapUrl === 'osm' || basemapUrl.includes('cartocdn.com/dark_all')))
            ? new XYZ({ url: "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", crossOrigin: 'anonymous' })
            : ((basemapUrl && basemapUrl !== 'osm')
                ? new XYZ({ url: finalUrl, crossOrigin: 'anonymous' })
                : new OSM());

        const tileLayer = new TileLayer({
            source: initialBasemapSource,
            zIndex: 0
        });
        basemapLayerRef.current = tileLayer;

        // Layer for saved geometries
        const savedLayer = new VectorLayer({
            source: savedSourceRef.current,
            zIndex: 10,
            style: (feature) => {
                const type = feature.get("type") || "Point";
                const label = feature.get("keterangan_geometry") || "";
                return getGeometryStyle(type, label);
            }
        });

        // Layer for current active drawing or active editing (styled in yellow)
        const drawLayer = new VectorLayer({
            source: drawSourceRef.current,
            zIndex: 20,
            style: new Style({
                image: new CircleStyle({
                    radius: 8,
                    fill: new Fill({ color: "#eab308" }), // Yellow 500
                    stroke: new Stroke({ color: "#ffffff", width: 2 })
                }),
                stroke: new Stroke({
                    color: "#eab308", // Yellow 500
                    width: 4
                }),
                fill: new Fill({
                    color: "rgba(234, 179, 8, 0.25)" // Yellow 500 with opacity
                })
            })
        });

        // Layer for village boundaries (desa)
        const desaLayer = new VectorLayer({
            source: desaSourceRef.current,
            zIndex: 5,
            style: (feature) => {
                const namaDesa = feature.get("nama_desa") || "";
                return new Style({
                    stroke: new Stroke({
                        color: "rgba(99, 102, 241, 0.7)",
                        width: 1.5,
                        lineDash: [4, 4]
                    }),
                    fill: new Fill({
                        color: "rgba(99, 102, 241, 0.05)"
                    }),
                    text: new StyleText({
                        text: namaDesa,
                        font: "bold 9px 'Inter', sans-serif",
                        fill: new Fill({ color: "#4f46e5" }),
                        stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
                        overflow: true
                    })
                });
            }
        });

        // Create popup overlay element
        const popupEl = document.createElement("div");
        popupEl.className = "ol-geometry-popup-container";
        popupElementRef.current = popupEl;

        const popupOverlay = new Overlay({
            element: popupEl,
            positioning: "bottom-center",
            offset: [0, -10],
            stopEvent: true
        });
        popupOverlayRef.current = popupOverlay;

        // Build OpenLayers map
        const map = new OLMap({
            target: mapElementRef.current,
            layers: [tileLayer, desaLayer, savedLayer, drawLayer],
            overlays: [popupOverlay],
            controls: [], // Disable default zoom controls
            view: new View({
                center: fromLonLat([111.8328268, -7.2288555]), // Bojonegoro default
                zoom: 11
            })
        });

        mapRef.current = map;

        // Pointer move event to change cursor when hovering over shapes
        map.on("pointermove", (evt) => {
            if (evt.dragging) return;
            const pixel = map.getEventPixel(evt.originalEvent);
            const hit = map.hasFeatureAtPixel(pixel, {
                layerFilter: (layer) => layer === savedLayer
            });
            map.getTargetElement().style.cursor = hit ? "pointer" : "";
        });

        // Click event on shapes to show description popup
        map.on("click", (evt) => {
            const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
                layerFilter: (layer) => layer === savedLayer
            });

            if (feature instanceof Feature) {
                const keterangan = feature.get("keterangan_geometry");
                const type = feature.get("type");
                const geom = feature.getGeometry();

                let rawGeom = null;
                if (geom) {
                    const format = new GeoJSON();
                    rawGeom = format.writeGeometryObject(geom, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    });
                }

                setSelectedGeometryInfo({
                    keterangan,
                    type,
                    coordinate: evt.coordinate,
                    geom: rawGeom
                });

                popupOverlay.setPosition(evt.coordinate);
            } else {
                // Close popup if clicking empty space
                setSelectedGeometryInfo(null);
                popupOverlay.setPosition(undefined);
            }
        });

        // Cleanup
        return () => {
            map.setTarget(undefined);
            mapRef.current = null;
        };
    }, []);

    // 2. React to savedGeometries updates
    useEffect(() => {
        const source = savedSourceRef.current;
        source.clear();

        if (savedGeometries && savedGeometries.length > 0) {
            const format = new GeoJSON();
            savedGeometries.forEach((item) => {
                // Skip loading the feature currently being edited
                if (editingGeometry && item.id === editingGeometry.id) {
                    return;
                }

                if (item.geom) {
                    try {
                        const feature = format.readFeature(item.geom, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857"
                        }) as any;

                        // Set properties to use in styles & popup
                        feature.set("keterangan_geometry", item.keterangan_geometry);
                        feature.set("type", item.geom.type);
                        feature.set("id", item.id);

                        source.addFeature(feature);
                    } catch (e) {
                        console.error("Gagal membaca geometry item:", item, e);
                    }
                }
            });

            // Auto-fit to geometries if they exist (only when NOT editing)
            const map = mapRef.current;
            if (map && !editingGeometry) {
                const extent = source.getExtent();
                if (extent && extent[0] !== Infinity && extent[0] !== -Infinity) {
                    map.getView().fit(extent, {
                        padding: getViewportPadding(),
                        maxZoom: 18,
                        duration: 1000
                    });
                }
            }
        }
    }, [savedGeometries, editingGeometry]);

    // 2b. React to showDesaBoundaries and idKecamatanForDesa updates
    useEffect(() => {
        const source = desaSourceRef.current;
        source.clear();

        if (showDesaBoundaries && idKecamatanForDesa) {
            desaService.getGeojsonDesa(idKecamatanForDesa)
                .then((geojson) => {
                    if (geojson) {
                        const format = new GeoJSON();
                        const features = format.readFeatures(geojson, {
                            dataProjection: "EPSG:4326",
                            featureProjection: "EPSG:3857"
                        });

                        features.forEach((feature) => {
                            const props = feature.getProperties();
                            feature.set("nama_desa", props.nama_desa || props.name || "");
                        });

                        source.addFeatures(features);
                    }
                })
                .catch((err) => console.error("Gagal memuat batas wilayah desa:", err));
        }
    }, [showDesaBoundaries, idKecamatanForDesa]);

    // 2c. React to basemapUrl updates
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
            const finalUrl = isAtrBpn ? `/proxy/basemap?url=${basemapUrl}` : basemapUrl;
            basemapLayerRef.current.setSource(new XYZ({ url: finalUrl, crossOrigin: 'anonymous' }));
        }
    }, [basemapUrl, isDark]);

    // 2d. React to dynamic layers (overlays) updates
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const existingLayers = map.getLayers();
        if (!existingLayers) return;

        // Clean up removed layers (those with dynamic-overlay- prefix but not present in new layers prop)
        const layersToRemove = existingLayers.getArray().filter(l => {
            const id = l.get('id');
            return id && id.startsWith('dynamic-overlay-') && !layers.some(lc => `dynamic-overlay-${lc.id}` === id);
        });
        
        layersToRemove.forEach(l => map.removeLayer(l));

        // Process active layers
        layers.forEach((layerConfig) => {
            const layerId = `dynamic-overlay-${layerConfig.id}`;
            let layer = existingLayers.getArray().find(l => l.get('id') === layerId);

            if (!layer) {
                // Create new layer instance
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
                } else if (layerConfig.type === 'tile' && layerConfig.url) {
                    layer = new TileLayer({
                        source: new OSM({
                            url: layerConfig.url
                        }),
                        zIndex: layerConfig.zIndex ?? 0
                    });
                } else if (layerConfig.type === 'vector' && layerConfig.data) {
                    layer = new VectorLayer({
                        source: new VectorSource({
                            features: new GeoJSON().readFeatures(layerConfig.data, {
                                featureProjection: 'EPSG:3857'
                            })
                        }),
                        zIndex: layerConfig.zIndex ?? 50,
                        style: new Style({
                            stroke: new Stroke({ color: '#2563eb', width: 2 }),
                            fill: new Fill({ color: 'rgba(37, 99, 235, 0.1)' })
                        })
                    });
                }

                if (layer) {
                    layer.set('id', layerId);
                    map.addLayer(layer);
                }
            }

            if (layer) {
                layer.setVisible(layerConfig.visible !== false);
                layer.setOpacity(layerConfig.opacity ?? 1);
                layer.setZIndex(layerConfig.zIndex ?? 50);
                
                // Update WMS parameters dynamically (e.g., CQL_FILTER)
                if (layerConfig.type === 'wms') {
                    const wmsSource = (layer as any).getSource();
                    if (wmsSource && wmsSource.updateParams) {
                        wmsSource.updateParams({
                            ...layerConfig.params
                        });
                    }
                }
            }
        });
    }, [layers]);

    // 3. React to drawMode changes (Point, LineString, Polygon)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear active drawing if not currently editing (to let edit view handle its load)
        if (!editingGeometry) {
            drawSourceRef.current.clear();
        }

        setSelectedGeometryInfo(null);
        if (popupOverlayRef.current) {
            popupOverlayRef.current.setPosition(undefined);
        }

        if (!drawMode) {
            // Keep crosshair off if no drawMode active
            if (!editingGeometry) {
                map.getTargetElement().style.cursor = "";
            }
            return;
        }

        // Change cursor to crosshair for drawing
        map.getTargetElement().style.cursor = "crosshair";

        // Setup draw interaction
        const draw = new Draw({
            source: drawSourceRef.current,
            type: drawMode
        });

        draw.on("drawstart", () => {
            // When redrawing or starting a new draw, clear the existing preview features
            drawSourceRef.current.clear();
        });

        draw.on("drawend", (event) => {
            const feature = event.feature;
            const olGeometry = feature.getGeometry();

            if (olGeometry) {
                const format = new GeoJSON();
                const geojsonGeom = format.writeGeometryObject(olGeometry, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857"
                }) as GeoJSONGeometry;

                onDrawComplete(geojsonGeom);
            }
        });

        map.addInteraction(draw);

        return () => {
            map.removeInteraction(draw);
        };
    }, [drawMode, editingGeometry, onDrawComplete]);

    // 4. React to editingGeometry updates for interactive shifting / vertex dragging
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // If drawing mode is active, drawMode has priority
        if (drawMode) return;

        // Clean slate
        drawSourceRef.current.clear();
        setSelectedGeometryInfo(null);
        if (popupOverlayRef.current) {
            popupOverlayRef.current.setPosition(undefined);
        }

        if (!editingGeometry) return;

        const format = new GeoJSON();
        let editingFeature: any = null;

        try {
            editingFeature = format.readFeature(editingGeometry.geom, {
                dataProjection: "EPSG:4326",
                featureProjection: "EPSG:3857"
            }) as any;

            editingFeature.set("keterangan_geometry", editingGeometry.keterangan_geometry);
            editingFeature.set("type", editingGeometry.geom.type);
            editingFeature.set("id", editingGeometry.id);

            drawSourceRef.current.addFeature(editingFeature);

            // Zoom map to the feature
            const olGeometry = editingFeature.getGeometry();
            if (olGeometry) {
                const extent = olGeometry.getExtent();
                map.getView().fit(extent, {
                    padding: getViewportPadding(),
                    duration: 1000,
                    maxZoom: 18
                });
            }
        } catch (e) {
            console.error("Gagal me-load feature edit ke peta:", e);
        }

        // Add modify interaction targeting the editing feature vector source
        const modify = new Modify({
            source: drawSourceRef.current,
            style: new Style({
                image: new CircleStyle({
                    radius: 5,
                    fill: new Fill({ color: "#eab308" }),
                    stroke: new Stroke({ color: "#ffffff", width: 1.5 })
                })
            })
        });

        // Set initial geometry state in parent so saving works without dragging
        onDrawComplete(editingGeometry.geom);

        // Listen to modify end events to update coordinates in parent state
        modify.on("modifyend", (event) => {
            const features = event.features.getArray();
            if (features.length > 0) {
                const modifiedFeature = features[0];
                const olGeometry = modifiedFeature.getGeometry();
                if (olGeometry) {
                    const geojsonGeom = format.writeGeometryObject(olGeometry, {
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857"
                    }) as GeoJSONGeometry;
                    onDrawComplete(geojsonGeom);
                }
            }
        });

        map.addInteraction(modify);

        return () => {
            map.removeInteraction(modify);
            drawSourceRef.current.clear();
        };
    }, [editingGeometry, drawMode, onDrawComplete]);

    const closePopup = () => {
        setSelectedGeometryInfo(null);
        if (popupOverlayRef.current) {
            popupOverlayRef.current.setPosition(undefined);
        }
    };

    return (
        <div className={cn("relative w-full h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800", className)}>
            <div ref={mapElementRef} className="w-full h-full" />

            {/* React Portal for Popup Overlay */}
            {selectedGeometryInfo && popupElementRef.current && createPortal(
                <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl p-4 w-60 flex flex-col pointer-events-auto relative mb-3 animate-in zoom-in-95 duration-200">
                    {/* Shadow Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-950 rotate-45 border-r border-b border-slate-100 dark:border-slate-800" />

                    {/* Close button */}
                    <button
                        onClick={closePopup}
                        className="absolute top-2.5 right-2.5 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors text-slate-400"
                    >
                        <X size={14} />
                    </button>

                    {/* Metadata Header */}
                    <div className="flex items-center gap-2 mb-2 shrink-0 pr-6">
                        <div className="p-1 bg-blue-600 rounded text-white shrink-0">
                            <MapPin size={12} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none">Geometry</p>
                            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-normal mt-0.5">
                                {selectedGeometryInfo.type}
                            </h4>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex flex-col gap-2">
                        <p className="text-slate-600 dark:text-slate-300 text-xs break-words leading-relaxed">
                            {selectedGeometryInfo.keterangan || <span className="italic text-slate-400">—</span>}
                        </p>
                        {selectedGeometryInfo.coordinate && (
                            <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono select-all truncate max-w-[170px]" title={formatMapCoordinateText(selectedGeometryInfo.geom, selectedGeometryInfo.coordinate)}>
                                    {formatMapCoordinateText(selectedGeometryInfo.geom, selectedGeometryInfo.coordinate)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                                    onClick={() => handleCopyMapCoordinate(selectedGeometryInfo.geom, selectedGeometryInfo.coordinate)}
                                    title="Salin Koordinat"
                                >
                                    <Copy size={12} />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>,
                popupElementRef.current
            )}
        </div>
    );
});

GeometryMap.displayName = "GeometryMap";
