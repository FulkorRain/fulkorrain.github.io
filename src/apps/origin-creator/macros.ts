import { loadSettings } from "../../settings-store";
import { MACROS, macroNumber } from "../../macros";
import { PROJECT } from "./projects";

let selectAll = false;
let nextField = false;

const actions: Record<string, () => void> = {
    selectall() {
        selectAll = !selectAll;
        PROJECT.showSnack(`Select all on click: ${selectAll ? "on" : "off"}`);
    },
    nextfield() {
        nextField = !nextField;
        PROJECT.showSnack(`Enter goes to next field: ${nextField ? "on" : "off"}`);
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
    if (t instanceof HTMLTextAreaElement) {
        if (t.closest(".ace_editor") || t.selectionStart != t.selectionEnd) return;
        const at = t.selectionStart;
        const start = t.value.lastIndexOf("\n", at - 1) + 1;
        const next = t.value.indexOf("\n", at);
        t.setSelectionRange(start, next < 0 ? t.value.length : next);
    } else if (t instanceof HTMLInputElement && !skipTypes.has(t.type) && !t.closest(".ace_editor")) {
        t.select();
    }
}, true);

const fieldTypes = new Set(["text", "number", "search", "url", "email", "tel"]);

function usable(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
    if (el instanceof HTMLTextAreaElement) return !el.disabled && !el.readOnly && el.getClientRects().length > 0;
    return el instanceof HTMLInputElement && fieldTypes.has(el.type) && !el.disabled && !el.readOnly && el.getClientRects().length > 0;
}

document.addEventListener("keydown", (e) => {
    if (!nextField || e.key != "Enter" || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.isComposing) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !usable(t)) return;
    const workspace = document.getElementById("workspace");
    if (!workspace?.contains(t)) return;

    const fields = Array.from(workspace.querySelectorAll("input, textarea")).filter(usable);
    const next = fields[fields.indexOf(t) + 1];
    e.preventDefault();
    if (next) {
        next.focus();
        next.select();
    }
}, true);
