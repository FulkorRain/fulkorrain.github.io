import { loadSettings } from "../../settings-store";
import { MACROS, macroNumber } from "../../macros";
import { PROJECT } from "./projects";

let selectAll = false;

const actions: Record<string, () => void> = {
    selectall() {
        selectAll = !selectAll;
        PROJECT.showSnack(`Select all on click: ${selectAll ? "on" : "off"}`);
    },
};

window.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const match = /^Digit([1-9])$/.exec(e.code);
    if (!match) return;

    const n = Number(match[1]);
    const macros = loadSettings().macros;
    const macro = MACROS.find(m => macroNumber(macros, m.id) == n);
    if (!macro) return;

    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) actions[macro.id]?.();
}, true);

const skipTypes = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image", "hidden"]);

document.addEventListener("click", (e) => {
    if (!selectAll) return;
    const t = e.target;
    if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && !skipTypes.has(t.type))) {
        if (!t.closest(".ace_editor")) t.select();
    }
}, true);
