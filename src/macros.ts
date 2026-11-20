export type MacroDef = { id: string; label: string; desc: string; fallback: number };

export const MACROS: MacroDef[] = [
    {
        id: "selectall",
        label: "Select all on click",
        desc: "While on, clicking a text field selects all of it. In a list, only the line you clicked.",
        fallback: 0,
    },
    {
        id: "nextfield",
        label: "Enter goes to next field",
        desc: "While on, pressing Enter in a text field jumps to the next text field below it.",
        fallback: 0,
    },
];

export function macroNumber(macros: Record<string, number> | undefined, id: string): number {
    const value = macros?.[id];
    if (Number.isInteger(value) && value >= 0 && value <= 9) return value;
    return MACROS.find(m => m.id == id)?.fallback ?? 0;
}
