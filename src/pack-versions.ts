import { loadSettings } from "./settings-store";

export const PACK_VERSIONS: [number, string][] = [
    [6, "1.16.x"],
    [7, "1.17.x"],
    [8, "1.18.0-1"],
    [9, "1.18.2+"],
    [10, "1.19.0-3"],
    [12, "1.19.4"],
    [15, "1.20.0-1"],
    [18, "1.20.2"],
    [26, "1.20.3-4"],
    [48, "1.21-1.21.1"],
];

export const FALLBACK_FORMAT = 10;

export function isPackFormat(value: unknown): value is number {
    return PACK_VERSIONS.some(v => v[0] === value);
}

export function defaultPackFormat(fallback = FALLBACK_FORMAT): number {
    const value = loadSettings().defaultFormat;
    return isPackFormat(value) ? value : fallback;
}
