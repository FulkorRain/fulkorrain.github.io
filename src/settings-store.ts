export const SETTINGS_KEY = "oc-settings";

export type CustomSection = { label: string; items: string[] };

export type Settings = {
    accent?: string;
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