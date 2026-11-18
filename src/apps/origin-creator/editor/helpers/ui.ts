import { getHelper, helperSections } from "./registry";
import { spritePicker } from "./sprites";


let panel: HTMLElement | null = null;
let anchor: HTMLElement | null = null;

function close() {
    if (panel) panel.remove();
    panel = null;
    anchor = null;
}

const isChooser = (s: HTMLSelectElement) => Array.from(s.options).some(o => o.hasAttribute("key"));
const valueSelect = (f: Element) => Array.from(f.querySelectorAll("select")).find(s => !isChooser(s)) as HTMLSelectElement | undefined;
const chooserSelect = (f: Element) => Array.from(f.querySelectorAll("select")).find(isChooser) as HTMLSelectElement | undefined;
const textInput = (f: Element) => f.querySelector("input[type=text], textarea") as HTMLInputElement | HTMLTextAreaElement | null;

function fire(el: HTMLElement) {
    el.dispatchEvent(new Event("change", { bubbles: true }));
}

function addToList(field: Element, value: string | string[]): boolean {
    const area = field.querySelector("textarea.tlist") as HTMLTextAreaElement | null;
    if (!area) return false;

    const add = Array.isArray(value) ? value.join("\n") : value;
    area.value = area.value.trim() ? area.value.replace(/\s+$/, "") + "\n" + add : add;
    fire(area);
    return true;
}

function applyToField(field: Element, value: string): boolean {
    if (field.getAttribute("jtype") == "list") return addToList(field, value);

    if (!valueSelect(field) && !chooserSelect(field) && !textInput(field)) {
        const toggle = field.querySelector("button[key]") as HTMLElement | null;
        if (toggle) toggle.click();
    }

    // can be with or without minecraft:
    const select = valueSelect(field);
    if (select) {
        const bare = value.replace(/^minecraft:/, "");
        const wanted = [`string-${value}`, `string-${bare}`, `string-minecraft:${bare}`];
        const option = Array.from(select.options).find(o => wanted.includes(o.value));
        if (option) {
            select.value = option.value;
            fire(select);
            return true;
        }
    }

    let input = textInput(field);

    if (!input) {
        const chooser = chooserSelect(field);
        const custom = chooser && Array.from(chooser.options).find(o => o.getAttribute("type") === "string");
        if (chooser && custom) {
            chooser.value = custom.value;
            fire(chooser);
            input = textInput(field);
        }
    }

    if (input) {
        input.value = value;
        fire(input);
        return true;
    }

    return false;
}

function applyValue(button: HTMLElement, value: string): boolean {
    const field = button.closest(".field");
    return !!field && applyToField(field, value);
}

type MultiKind = "list" | "entries" | "wrap" | null;

type WrapInfo = { ops: string[]; key: string };

function wrapInfo(field: Element): WrapInfo | null {
    const owner = ownerOf(field);
    if (!owner || owner.getAttribute("jtype") != "object") return null;

    const select = (Array.from(owner.querySelectorAll(".field[jid='type'] select")) as HTMLSelectElement[])
        .find(s => s.closest("[jtype='object']") === owner);
    if (!select) return null;

    const ids: Record<string, string> = {};
    for (const o of Array.from(select.options)) {
        const m = /^string-(.+):(and|or)$/.exec(o.value);
        if (m) ids[m[2]] = `${m[1]}:${m[2]}`;
    }
    if (!ids.and) return null;

    const ops = ids.or ? ["or", "and"] : ["and"];
    return { ops: ops.map(op => ids[op]), key: ids.or ? "conditions" : "actions" };
}

function ownerOf(from: Element | null): HTMLElement | null {
    let e = from?.parentElement?.closest("[jtype]") as HTMLElement | null;
    while (e && e.getAttribute("jtype") == "more") e = e.parentElement?.closest("[jtype]") as HTMLElement | null;
    return e;
}

function entryOf(field: Element): HTMLElement | null {
    let entry = ownerOf(field);
    if (entry && entry.getAttribute("jtype") == "object") {
        const up = entry.parentElement?.closest("[jtype]") as HTMLElement | null;
        if (up && up.getAttribute("jtype") == "or") entry = up;
    }
    if (!entry || !["object", "or"].includes(entry.getAttribute("jtype")) || entry.hasAttribute("named")) return null;
    if (!/^\d+$/.test(entry.getAttribute("jid") ?? "")) return null;
    const owner = entry.parentElement?.closest("[jtype]");
    return owner && owner.getAttribute("jtype") == "list" ? entry : null;
}

function cloneButton(entry: HTMLElement): HTMLElement | undefined {
    const buttons = Array.from(entry.querySelectorAll("button[onclick*='cloneListItem']")) as HTMLElement[];
    return buttons.find(b => b.parentElement?.parentElement === entry);
}

function multiKind(button: HTMLElement): MultiKind {
    const field = button.closest(".field");
    if (!field) return null;
    if (field.getAttribute("jtype") == "list") return field.querySelector("textarea.tlist") ? "list" : null;

    const entry = entryOf(field);
    if (entry) return cloneButton(entry) ? "entries" : null;
    return wrapInfo(field) ? "wrap" : null;
}

function indexPath(from: Element, to: Element): number[] {
    const path: number[] = [];
    for (let e: Element = from; e != to; e = e.parentElement) {
        path.unshift(Array.prototype.indexOf.call(e.parentElement.children, e));
    }
    return path;
}

function follow(root: Element, path: number[]): Element | null {
    let e: Element | null = root;
    for (const i of path) e = e?.children[i] ?? null;
    return e;
}

function applyMany(button: HTMLElement, values: string[], wrapper?: string): boolean {
    const field = button.closest(".field");
    const kind = multiKind(button);
    if (!field || !kind || values.length == 0) return false;
    if (kind == "list") return addToList(field, values);
    if (kind == "wrap") {
        if (values.length == 1) return applyToField(field, values[0]);
        const info = wrapInfo(field);
        const use = wrapper && info.ops.includes(wrapper) ? wrapper : info.ops[0];
        return (window as any).JSONED.wrapValues(field, values, use, info.key);
    }

    let entry = entryOf(field);
    const path = indexPath(field, entry);

    for (let i = 0; i < values.length; i++) {
        if (i > 0) {
            cloneButton(entry).click();
            entry = entry.nextElementSibling as HTMLElement;
        }
        const target = follow(entry, path);
        if (!target || !applyToField(target, values[i])) return false;
    }
    return true;
}

let multiOn = false;
let lastOp = "";

// Helper panel resize
const EDGE = 8;
function place() {
    if (!panel || !anchor) return;
    if (!anchor.isConnected) { close(); return; }

    const r = anchor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { close(); return; } // button scrolled out of view

    const below = window.innerHeight - r.bottom - EDGE;
    const above = r.top - EDGE;
    const flip = below < 200 && above > below;

    
    panel.style.maxHeight = Math.min(340, Math.max(120, flip ? above : below)) + "px";
    const top = flip ? r.top - panel.offsetHeight - 4 : r.bottom + 4;
    const left = Math.min(r.left, window.innerWidth - panel.offsetWidth - EDGE);

    panel.style.left = Math.max(4, left) + "px";
    panel.style.top = Math.max(4, top) + "px";
}

function open(button: HTMLElement) {
    const helper = getHelper(button.getAttribute("data-helper") || "");
    if (!helper) return;

    close();
    anchor = button;

    const el = document.createElement("div");
    el.className = "jhelper-panel";

    const head = document.createElement("div");
    head.className = "jhelper-head";
    const title = document.createElement("span");
    title.textContent = helper.title;
    const x = document.createElement("button");
    x.type = "button";
    x.className = "jhelper-close";
    x.textContent = "×";
    x.title = "Close";
    x.addEventListener("click", close);

    const kind = helper.kind == "sprites" ? null : multiKind(button);
    const picked: string[] = [];
    let multi = !!kind && multiOn;

    const right = document.createElement("div");
    right.className = "jhelper-head-right";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "jhelper-multi";
    toggle.textContent = "+";
    toggle.title = kind == "list" ? "Pick several values and add them all at once"
        : kind == "wrap" ? "Pick several values and combine them with and / or"
        : "Pick several values and create one entry for each";
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "jhelper-clear";
    clear.textContent = "Clear";
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "jhelper-apply";
    const info = kind == "wrap" ? wrapInfo(button.closest(".field")) : null;
    const op = document.createElement("select");
    op.className = "jhelper-op";
    for (const id of info?.ops ?? []) {
        const o = document.createElement("option");
        o.value = id;
        o.textContent = id.endsWith(":or") ? "Or" : "And";
        op.appendChild(o);
    }
    if (info?.ops.includes(lastOp)) op.value = lastOp;
    op.addEventListener("change", () => { lastOp = op.value; });
    if (info && info.ops.length > 1) right.append(op);
    if (kind) right.append(clear, apply, toggle);
    right.append(x);
    head.append(title, right);

    // Sprite pickers
    if (helper.kind == "sprites") {
        el.classList.add("jhelper-sprites");
        el.append(head, spritePicker(helper, button, place));
        document.body.appendChild(el);
        panel = el;
        place();
        return;
    }

    const search = document.createElement("input");
    search.type = "text";
    search.className = "jhelper-search";
    search.placeholder = "Search...";

    const list = document.createElement("div");
    list.className = "jhelper-list";

    const note = document.createElement("div");
    note.className = "jhelper-note";

    const sync = () => {
        toggle.setAttribute("aria-pressed", String(multi));
        list.classList.toggle("jhelper-multi-on", multi);
        clear.hidden = !multi;
        apply.hidden = !multi;
        op.hidden = !multi;
        apply.textContent = `Add (${picked.length})`;
        apply.disabled = picked.length == 0;
        clear.disabled = picked.length == 0;
    };

    const all = helperSections(helper);

    const render = () => {
        const q = search.value.trim().toLowerCase();
        list.textContent = "";
        let shown = 0;

        for (const section of all) {
            const items = section.items.filter(i => !q || i.value.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q));
            if (items.length === 0) continue;

            const h = document.createElement("div");
            h.className = "jhelper-section";
            h.textContent = section.label;
            list.appendChild(h);

            for (const item of items) {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "jhelper-item";
                b.setAttribute("data-value", item.value);
                if (multi && picked.includes(item.value)) b.classList.add("jhelper-picked");
                b.textContent = item.value;
                if (item.desc) {
                    const d = document.createElement("span");
                    d.textContent = item.desc;
                    b.appendChild(d);
                }
                list.appendChild(b);
                shown++;
            }
        }

        if (shown === 0) {
            const none = document.createElement("div");
            none.className = "jhelper-none";
            none.textContent = "No matches";
            list.appendChild(none);
        }
    };
        search.addEventListener("input", () => { render(); place(); });

    list.addEventListener("click", (e) => {
        const b = (e.target as Element).closest(".jhelper-item") as HTMLElement | null;
        if (!b || !anchor) return;
        const value = b.getAttribute("data-value") || "";
        if (multi) {
            const at = picked.indexOf(value);
            if (at >= 0) picked.splice(at, 1);
            else picked.push(value);
            b.classList.toggle("jhelper-picked", at < 0);
            note.textContent = "";
            sync();
            return;
        }
        if (applyValue(anchor, value)) {
            close();
        } else {
            note.textContent = "That value isn't available in this field.";
        }
    });

    toggle.addEventListener("click", () => {
        multi = !multi;
        multiOn = multi;
        picked.length = 0;
        note.textContent = "";
        sync();
        render();
        place();
    });
    clear.addEventListener("click", () => {
        picked.length = 0;
        sync();
        render();
    });
    apply.addEventListener("click", () => {
        if (!anchor) return;
        if (applyMany(anchor, picked.slice(), op.value)) close();
        else note.textContent = "Those values couldn't be added here.";
    });

    el.append(head, search, list, note);
    sync();
    render();
    document.body.appendChild(el);
    panel = el;

        place();

    search.focus();
}

// Helper menu closures

if (typeof document !== "undefined") {
    document.addEventListener("click", (e) => {
        const target = e.target as Element | null;
        if (!target || !target.closest) return;

        const button = target.closest(".jhelper") as HTMLElement | null;
        if (button) {
           
            if (panel && anchor === button) close();
            else open(button);
            return;
        }

        if (panel && !e.composedPath().includes(panel)) close();
    });

    window.addEventListener("scroll", (e) => {
        if (panel && !panel.contains(e.target as Node)) place();
    }, true);
    window.addEventListener("resize", place);
    
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
    });
}