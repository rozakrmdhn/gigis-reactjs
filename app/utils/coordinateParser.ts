export interface ParsedCoordinate {
    lat: number;
    lng: number;
    format: "decimal" | "dms";
    raw: string;
}

// Decimal Format: e.g. "-7.19504, 112.06231" or "-7.19504 112.06231"
const DECIMAL_REGEX = /^([+-]?\d+(?:\.\d+)?)[,\s\t]+([+-]?\d+(?:\.\d+)?)$/;

// DMS Pair Format: e.g. "7°11'42.1\"S 112°3'44.3\"E"
// Matches Degrees, Minutes, optional Seconds, and hemisphere direction (English or Indonesian)
const DMS_PAIR_REGEX = /^(\d+)[°d\s]*(\d+)['m\s]*(?:(\d+(?:\.\d+)?)["s\s]*)?([NSNs])[\s,;\t]+(\d+)[°d\s]*(\d+)['m\s]*(?:(\d+(?:\.\d+)?)["s\s]*)?([EWTBewtb])$/i;

function dmsToDecimal(deg: number, min: number, sec: number, dir: string): number {
    const val = deg + min / 60 + sec / 3600;
    const upperDir = dir.toUpperCase();
    if (upperDir === "S" || upperDir === "W" || upperDir === "B") {
        return -val;
    }
    return val;
}

/**
 * Parses a single string for valid Decimal or DMS coordinates.
 * Returns ParsedCoordinate or null if invalid.
 */
export function tryParseCoordinate(input: string): ParsedCoordinate | null {
    const clean = input.trim();
    if (!clean) return null;

    // 1. Try matching Decimal coordinates
    const decMatch = clean.match(DECIMAL_REGEX);
    if (decMatch) {
        const lat = parseFloat(decMatch[1]);
        const lng = parseFloat(decMatch[2]);

        // Range validation
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            return {
                lat,
                lng,
                format: "decimal",
                raw: clean
            };
        }
    }

    // 2. Try matching DMS coordinate pairs
    const dmsMatch = clean.match(DMS_PAIR_REGEX);
    if (dmsMatch) {
        const latDeg = parseInt(dmsMatch[1], 10);
        const latMin = parseInt(dmsMatch[2], 10);
        const latSec = dmsMatch[3] ? parseFloat(dmsMatch[3]) : 0;
        const latDir = dmsMatch[4];

        const lngDeg = parseInt(dmsMatch[5], 10);
        const lngMin = parseInt(dmsMatch[6], 10);
        const lngSec = dmsMatch[7] ? parseFloat(dmsMatch[7]) : 0;
        const lngDir = dmsMatch[8];

        // Valid range checks for DMS components
        if (
            latDeg <= 90 && latMin < 60 && latSec < 60 &&
            lngDeg <= 180 && lngMin < 60 && lngSec < 60
        ) {
            const lat = dmsToDecimal(latDeg, latMin, latSec, latDir);
            const lng = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);

            // Double check final range
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return {
                    lat,
                    lng,
                    format: "dms",
                    raw: clean
                };
            }
        }
    }

    return null;
}

/**
 * Splitting multiline input and parsing coordinates on each line.
 */
export function parseMultiCoordinates(input: string): {
    valid: ParsedCoordinate[];
    errors: { line: number; raw: string }[];
} {
    const lines = input.split(/\r?\n/);
    const valid: ParsedCoordinate[] = [];
    const errors: { line: number; raw: string }[] = [];

    lines.forEach((line, index) => {
        const cleanLine = line.trim();
        if (!cleanLine) return; // skip empty lines

        const parsed = tryParseCoordinate(cleanLine);
        if (parsed) {
            valid.push(parsed);
        } else {
            errors.push({
                line: index + 1,
                raw: line
            });
        }
    });

    return { valid, errors };
}
