import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import TileWMS from 'ol/source/TileWMS';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Stroke, Fill } from 'ol/style';
import Overlay from 'ol/Overlay';
import Feature from 'ol/Feature';
import { X, ChevronUp, ChevronDown, Layers, MapPin } from 'lucide-react';
import { cn } from '~/lib/utils';
import 'ol/ol.css';

interface OpenLayersMapProps {
    className?: string;
    center?: [number, number];
    zoom?: number;
    geojsonData?: any;
    showJalanKabupaten?: boolean;
    showBatasDesa?: boolean;
    showJalanUtama?: boolean;
    showSegmenJalan?: boolean;
}

export interface OpenLayersMapRef {
    zoomToFeature: (geojson: any) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetRotation: () => void;
}

export const OpenLayersMap = forwardRef<OpenLayersMapRef, OpenLayersMapProps>(({
    className,
    center = [111.8328268, -7.2288555], // Bojonegoro
    zoom = 10,
    geojsonData,
    showJalanKabupaten = true,
    showBatasDesa = true,
    showJalanUtama = true,
    showSegmenJalan = true,
}, ref) => {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Map | null>(null);
    const vectorSourceRef = useRef<VectorSource>(new VectorSource());
    const highlightSourceRef = useRef<VectorSource>(new VectorSource());
    
    // Layer Refs
    const batasDesaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const utamaLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const segmenLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
    const jalanKabupatenWmsLayerRef = useRef<TileLayer<TileWMS> | null>(null);
    
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
        zoomToFeature: (geojson: any) => {
            if (!geojson || !mapRef.current) return;
            
            const format = new GeoJSON();
            const features = format.readFeatures(geojson, {
                featureProjection: 'EPSG:3857'
            });

            vectorSourceRef.current.clear();
            vectorSourceRef.current.addFeatures(features);

            const extent = vectorSourceRef.current.getExtent();
            mapRef.current.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000
            });
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
                            color: '#3b82f6',
                            width: 2,
                            lineDash: [4, 4],
                        }),
                        fill: new Fill({
                            color: 'rgba(59, 130, 246, 0.05)',
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
                            color: '#64748b',
                            width: 4,
                        }),
                    });
                }
                return [];
            },
        });
        utamaLayerRef.current = utamaLayer;

        // 3. WMS Jalan Kabupaten Layer
        const wmsLayer = new TileLayer({
            source: new TileWMS({
                url: 'https://geoportal.saggaserv.my.id/geoserver/sagga/wms',
                params: {
                    'LAYERS': 'sagga:JALAN_KABUPATEN_2022',
                    'TILED': true,
                    'TRANSPARENT': true,
                    'VERSION': '1.1.1'
                },
                serverType: 'geoserver',
                crossOrigin: 'anonymous'
            }),
            visible: showJalanKabupaten,
            opacity: 0.8,
            zIndex: 30
        });
        jalanKabupatenWmsLayerRef.current = wmsLayer;

        // 4. Jalan Segmen Layer
        const segmenLayer = new VectorLayer({
            source: vectorSourceRef.current,
            zIndex: 40,
            visible: showSegmenJalan,
            style: (feature) => {
                const props = feature.getProperties();
                const layer = props._layer;
                if (layer === 'jalan_segmen') {
                    return new Style({
                        stroke: new Stroke({
                            color: '#10b981',
                            width: 7,
                        }),
                    });
                }
                return [];
            },
        });
        segmenLayerRef.current = segmenLayer;

        // 5. Highlight Layer
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

        const map = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                    zIndex: 0
                }),
                batasDesaLayer,
                utamaLayer,
                wmsLayer,
                segmenLayer,
                highlightLayer,
            ],
            overlays: [vectorPopup],
            controls: [],
            view: new View({
                center: fromLonLat(center),
                zoom: zoom,
            }),
        });

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

                // Highlight selected feature
                const highlightFeature = feature.clone();
                highlightSourceRef.current.addFeature(highlightFeature);
                return;
            }

            // 2. Check WMS Feature Info
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
                            const response = await fetch(url);
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
    }, []);

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

    // Layer Visibility Effects
    useEffect(() => {
        if (batasDesaLayerRef.current) batasDesaLayerRef.current.setVisible(!!showBatasDesa);
    }, [showBatasDesa]);

    useEffect(() => {
        if (utamaLayerRef.current) utamaLayerRef.current.setVisible(!!showJalanUtama);
    }, [showJalanUtama]);

    useEffect(() => {
        if (segmenLayerRef.current) segmenLayerRef.current.setVisible(!!showSegmenJalan);
    }, [showSegmenJalan]);

    useEffect(() => {
        if (jalanKabupatenWmsLayerRef.current) {
            jalanKabupatenWmsLayerRef.current.setVisible(!!showJalanKabupaten);
        }
    }, [showJalanKabupaten]);

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
            {selectedVectorInfo && vectorPopupElementRef.current && createPortal(
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
