export const SETTINGS_KEY = "oc-settings";

export type CustomSection = { label: string; items: string[] };

export type Settings = {
    accent?: string;
    defaultFormat?: number;
    macros?: Record<string, number>;
    helpers?: Record<string, CustomSection[]>;
};

export function loadSettings(): Settings {
    try {
        const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
        return data && typeof data == "object" && !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

export function saveSettings(settings: Settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { }
}

export function customSections(key: string): CustomSection[] {
    const list = loadSettings().helpers?.[key];
    if (!Array.isArray(list)) return [];
    return list.filter(s => s && typeof s.label == "string" && Array.isArray(s.items) && s.items.length);
}

import { isPackFormat } from "./pack-versions";
import { MACROS } from "./macros";

export const SETTINGS_FORMAT = "origin-creator-settings";
export const SETTINGS_VERSION = 1;
export const FREE_TEXT_HELPERS = new Set(["commands"]);
export const ID_PATTERN = /^[a-z0-9_.-]+:[a-z0-9_.\-\/]+$/;

export function exportSettings(settings: Settings): string {
    return JSON.stringify({ format: SETTINGS_FORMAT, version: SETTINGS_VERSION, ...settings }, null, 2);
}

export function parseSettings(text: string): { settings: Settings; skipped: number } | { error: string } {
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        return { error: "That file isn't valid JSON." };
    }

    if (!data || typeof data != "object" || Array.isArray(data) || data.format != SETTINGS_FORMAT) {
        return { error: "That doesn't look like an Origin Creator settings file." };
    }
    if (typeof data.version != "number" || data.version > SETTINGS_VERSION) {
        return { error: "That file was made by a newer version of the Origin Creator." };
    }

    const settings: Settings = {};
    let skipped = 0;

    if (data.accent == "blue" || data.accent == "purple") settings.accent = data.accent;

    if (isPackFormat(data.defaultFormat)) settings.defaultFormat = data.defaultFormat;

    if (data.macros && typeof data.macros == "object" && !Array.isArray(data.macros)) {
        for (const [id, n] of Object.entries<any>(data.macros)) {
            if (MACROS.some(m => m.id == id) && Number.isInteger(n) && n >= 0 && n <= 9) (settings.macros ??= {})[id] = n;
            else skipped++;
        }
    }

    if (data.helpers && typeof data.helpers == "object" && !Array.isArray(data.helpers)) {
        for (const [key, list] of Object.entries<any>(data.helpers)) {
            if (!Array.isArray(list)) { skipped++; continue; }
            const sections: CustomSection[] = [];
            for (const s of list) {
                if (!s || typeof s.label != "string" || !s.label.trim() || !Array.isArray(s.items)) { skipped++; continue; }
                const items: string[] = [];
                for (const raw of s.items) {
                    const free = FREE_TEXT_HELPERS.has(key);
                    const id = typeof raw == "string" ? (free ? raw.trim() : raw.trim().toLowerCase()) : "";
                    if (free ? !id || id.includes("\n") : !ID_PATTERN.test(id)) skipped++;
                    else if (!items.includes(id)) items.push(id);
                }
                if (items.length) sections.push({ label: s.label.trim().slice(0, 60), items });
            }
            if (sections.length) (settings.helpers ??= {})[key] = sections;
        }
    }

    return { settings, skipped };
}

export function mergeSettings(base: Settings, incoming: Settings): Settings {
    const out: Settings = { ...base, helpers: { ...(base.helpers ?? {}) } };
    if (incoming.accent) out.accent = incoming.accent;
    if (incoming.defaultFormat) out.defaultFormat = incoming.defaultFormat;
    if (incoming.macros) out.macros = { ...(base.macros ?? {}), ...incoming.macros };

    for (const [key, list] of Object.entries(incoming.helpers ?? {})) {
        const merged = [...(out.helpers[key] ?? [])];
        for (const section of list) {
            const at = merged.findIndex(s => s.label == section.label);
            if (at >= 0) merged[at] = section;
            else merged.push(section);
        }
        out.helpers[key] = merged;
    }

    if (!Object.keys(out.helpers).length) delete out.helpers;
    return out;
}
