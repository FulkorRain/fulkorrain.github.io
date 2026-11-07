const MIN_OPTIONS = 10;

type Entry = { group: string | null; value: string; text: string };

let panel: HTMLElement | null = null;
let anchor: HTMLSelectElement | null = null;
let teardown: (() => void) | null = null;

function eligible(target: EventTarget | null): HTMLSelectElement | null {
    if (!(target instanceof HTMLSelectElement)) return null;
    if (target.disabled || target.options.length < MIN_OPTIONS) return null;
    if (!target.closest("#workspace")) return null;
    return target;
}

function entries(select: HTMLSelectElement): Entry[] {
    const out: Entry[] = [];
    for (const child of Array.from(select.children)) {
        if (child instanceof HTMLOptGroupElement) {
            for (const o of Array.from(child.children) as HTMLOptionElement[]) {
                out.push({ group: child.label, value: o.value, text: o.textContent || "" });
            }
        } else if (child instanceof HTMLOptionElement) {
            out.push({ group: null, value: child.value, text: child.textContent || "" });
        }
    }
    return out;
}

function close() {
    const p = panel;
    const t = teardown;
    panel = null;
    anchor = null;
    teardown = null;
    if (t) t();
    if (p && p.isConnected) p.remove();
}

function place(list: HTMLElement, input: HTMLElement) {
    if (!panel || !anchor) return;
    if (!anchor.isConnected) { close(); return; }

    const r = anchor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) { close(); return; }

    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const flip = below < 180 && above > below;

    input.style.height = r.height + "px";
    list.style.maxHeight = Math.min(320, Math.max(100, (flip ? above : below))) + "px";
    panel.classList.toggle("jsearch-up", flip);
    panel.style.minWidth = Math.max(r.width, 220) + "px";

    const left = Math.min(r.left, window.innerWidth - panel.offsetWidth - 8);
    panel.style.left = Math.max(4, left) + "px";
    panel.style.top = (flip ? r.bottom - panel.offsetHeight : r.top) + "px";
}

function highlight(node: HTMLElement, text: string, token: string) {
    const i = token ? text.toLowerCase().indexOf(token) : -1;
    if (i < 0) { node.textContent = text; return; }
    const b = document.createElement("b");
    b.textContent = text.substring(i, i + token.length);
    node.append(text.substring(0, i), b, text.substring(i + token.length));
}

function open(select: HTMLSelectElement, seed: string = "") {
    close();
    anchor = select;

    const all = entries(select);
    const current = select.value;

    const el = document.createElement("div");
    el.className = "jsearch";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "jsearch-input";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = select.selectedOptions[0]?.textContent || "";
    input.value = seed;
    const list = document.createElement("div");
    list.className = "jsearch-list";
    el.append(input, list);
    document.body.appendChild(el);
    panel = el;

    let shown: { entry: Entry; node: HTMLElement }[] = [];
    let idx = 0;

    const mark = () => {
        shown.forEach((s, i) => s.node.classList.toggle("jsearch-on", i === idx));
        shown[idx]?.node.scrollIntoView({ block: "nearest" });
    };

    const render = () => {
        const tokens = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        list.textContent = "";
        shown = [];

        let group: string | null | undefined = undefined;
        for (const entry of all) {
            const hay = entry.text.toLowerCase();
            if (!tokens.every(t => hay.includes(t))) continue;

            if (entry.group !== group) {
                group = entry.group;
                if (group) {
                    const h = document.createElement("div");
                    h.className = "jsearch-group";
                    h.textContent = group;
                    list.appendChild(h);
                }
            }

            const node = document.createElement("div");
            node.className = "jsearch-item" + (entry.value === current ? " jsearch-cur" : "");
            highlight(node, entry.text, tokens[0] || "");
            node.addEventListener("mouseenter", () => {
                idx = shown.findIndex(s => s.node === node);
                mark();
            });
            list.appendChild(node);
            shown.push({ entry, node });
        }

        if (shown.length === 0) {
            const none = document.createElement("div");
            none.className = "jsearch-none";
            none.textContent = "No matches";
            list.appendChild(none);
        }

        idx = tokens.length ? 0 : Math.max(0, shown.findIndex(s => s.entry.value === current));
        mark();
    };

    const pick = (entry: Entry) => {
        const changed = entry.value !== select.value;
        close();
        if (changed) {
            select.value = entry.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        select.focus();
    };

    input.addEventListener("input", () => { render(); place(list, input); });
    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "ArrowDown") {
            idx = Math.min(shown.length - 1, idx + 1);
            mark();
        } else if (e.key === "ArrowUp") {
            idx = Math.max(0, idx - 1);
            mark();
        } else if (e.key === "Enter") {
            if (shown[idx]) pick(shown[idx].entry);
        } else if (e.key === "Escape") {
            close();
            select.focus();
        } else if (e.key === "Tab") {
            close();
            return;
        } else {
            return;
        }
        e.preventDefault();
    });
    input.addEventListener("blur", close);

    list.addEventListener("mousedown", (e) => e.preventDefault());
    list.addEventListener("click", (e) => {
        const node = (e.target as Element).closest(".jsearch-item");
        const hit = shown.find(s => s.node === node);
        if (hit) pick(hit.entry);
    });

    const onScroll = (e: Event) => {
        if (panel && !panel.contains(e.target as Node)) place(list, input);
    };
    const onResize = () => place(list, input);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    teardown = () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onResize);
    };

    render();
    place(list, input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

if (typeof document !== "undefined") {
    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const select = eligible(e.target);
        if (!select) return;
        e.preventDefault();
        open(select);
    }, true);

    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const select = eligible(e.target);
        if (!select) return;

        if (e.key.length === 1 && e.key !== " ") {
            e.preventDefault();
            e.stopPropagation();
            open(select, e.key);
        } else if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            open(select);
        }
    }, true);
}
