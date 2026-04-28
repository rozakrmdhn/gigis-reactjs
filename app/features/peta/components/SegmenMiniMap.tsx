/**
 * SegmenMiniMap
 * Renders a GeoJSON LineString/MultiLineString feature as a tiny SVG polyline.
 * Zero dependencies — no OpenLayers needed for a decorative mini map.
 */
import { useMemo } from 'react';
import { cn } from '~/lib/utils';

interface SegmenMiniMapProps {
    /** A single GeoJSON Feature with LineString or MultiLineString geometry */
    feature: any;
    className?: string;
    strokeColor?: string;
    bgColor?: string;
    padding?: number;
}

/**
 * Flatten any geometry type to an array of [lon, lat] coordinate pairs.
 * Handles 2D [lon, lat] and 3D [lon, lat, z] coordinates.
 */
function flattenCoords(geometry: any): [number, number][] {
    if (!geometry) return [];

    // Helper to normalise one coordinate (strips Z if present)
    const normalise = (c: number[]): [number, number] => [c[0], c[1]];

    switch (geometry.type) {
        case 'LineString':
            return (geometry.coordinates as number[][]).map(normalise);
        case 'MultiLineString':
            return (geometry.coordinates as number[][][]).flatMap(line => line.map(normalise));
        case 'Point':
            return [normalise(geometry.coordinates as number[])];
        case 'MultiPoint':
            return (geometry.coordinates as number[][]).map(normalise);
        case 'Polygon':
            return (geometry.coordinates[0] as number[][]).map(normalise);
        case 'MultiPolygon':
            return (geometry.coordinates as number[][][][]).flatMap(poly => poly[0].map(normalise));
        default:
            return [];
    }
}

/** Project geographic coords to SVG space, preserving aspect ratio. */
function projectToSVG(
    coords: [number, number][],
    viewW: number,
    viewH: number,
    padding: number
): string | null {
    if (coords.length < 2) return null;

    const lons = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const spanLon = maxLon - minLon || 0.0001;
    const spanLat = maxLat - minLat || 0.0001;

    const drawW = viewW - padding * 2;
    const drawH = viewH - padding * 2;

    // Keep aspect ratio — use the tighter scale to fit inside the box
    const scaleX = drawW / spanLon;
    const scaleY = drawH / spanLat;
    const scale = Math.min(scaleX, scaleY);

    // Centre the line within the drawing area
    const offsetX = padding + (drawW - spanLon * scale) / 2;
    const offsetY = padding + (drawH - spanLat * scale) / 2;

    return coords
        .map(([lon, lat]) => {
            const x = offsetX + (lon - minLon) * scale;
            // SVG y-axis is flipped relative to geographic latitude
            const y = offsetY + (maxLat - lat) * scale;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

const VIEW_W = 160;
const VIEW_H = 80;

export function SegmenMiniMap({
    feature,
    className,
    strokeColor = '#22c55e',
    bgColor = 'transparent',
    padding = 10,
}: SegmenMiniMapProps) {
    const points = useMemo(() => {
        // Accept a raw Feature or the geometry object directly
        const geometry = feature?.geometry ?? feature;
        const coords = flattenCoords(geometry);
        return projectToSVG(coords, VIEW_W, VIEW_H, padding);
    }, [feature, padding]);

    if (!points) {
        // Fallback — show a dashed placeholder so the card area isn't empty
        return (
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className={cn('w-full h-full opacity-20', className)}
                aria-hidden
            >
                <line
                    x1={padding} y1={VIEW_H / 2}
                    x2={VIEW_W - padding} y2={VIEW_H / 2}
                    stroke={strokeColor}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={cn('w-full h-full', className)}
            style={{ background: bgColor }}
            aria-hidden
        >
            {/* Wide glow track */}
            <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeOpacity={0.18}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Medium halo */}
            <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeOpacity={0.35}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Crisp main line */}
            <polyline
                points={points}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
