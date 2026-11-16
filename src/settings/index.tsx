import { loadSettings, saveSettings, exportSettings, parseSettings, mergeSettings, ID_PATTERN, CustomSection, Settings } from "../settings-store";

let settings: Settings = loadSettings();
const root = document.getElementById("settings");

const HELPERS: [string, string][] = [
    ["attributes", "Attributes"],
    ["effects", "Status effects"],
    ["damage_types", "Damage types"],
    ["damage_tags", "Damage tags"],
];

function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
}

function heading(text: string) {
    root.appendChild(make("h2", "sheading", text));
}

function row(label: string, desc: string, control: HTMLElement) {
    const el = make("div", "setting");
    const info = make("div", "info");
    info.append(make("b", "", label), make("small", "", desc));
    el.append(info, control);
    root.appendChild(el);
}

function dropdown(options: [string, string][], selected: string, onchange: (value: string) => void) {
    const select = make("select", "sinput");
    for (const [value, text] of options) {
        const o = make("option", "", text);
        o.value = value;
        select.appendChild(o);
    }
    select.value = options.some(o => o[0] == selected) ? selected : options[0][0];
    select.onchange = () => onchange(select.value);
    return select;
}

heading("Appearance");

function applyAccent(v?: string) {
    if (v == "blue") document.documentElement.setAttribute("accent", "blue");
    else document.documentElement.removeAttribute("accent");
}

const accentSelect = dropdown([["purple", "Purple"], ["blue", "Blue (classic)"]], settings.accent, (v) => {
    settings.accent = v;
    saveSettings(settings);
    applyAccent(v);
});

row("Site colours", "Switch site theme between the purple theme and blue.", accentSelect);

heading("Custom helper menus");

const intro = make("p", "sintro", "Add items to the Helper Menus in Origin Creator");
root.appendChild(intro);

const form = make("div", "setting col");
const helperSelect = dropdown(HELPERS, HELPERS[0][0], () => {});
const labelInput = make("input", "sinput");
labelInput.type = "text";
labelInput.placeholder = "Group Name";
labelInput.maxLength = 60;
const itemsArea = make("textarea", "sinput");
itemsArea.rows = 6;
itemsArea.placeholder = "modid:item\nmodid:block";
itemsArea.spellcheck = false;
const buttons = make("div", "sbuttons");
const saveBtn = make("button", "sbtn", "Add section");
saveBtn.type = "button";
const cancelBtn = make("button", "sbtn", "Cancel");
cancelBtn.type = "button";
cancelBtn.hidden = true;
const message = make("div", "smessage");
buttons.append(saveBtn, cancelBtn);
form.append(make("b", "", "New section"), helperSelect, labelInput, itemsArea, buttons, message);
root.appendChild(form);

const listBox = make("div", "slist");
root.appendChild(listBox);

let editing: { key: string; label: string } | null = null;

function reset() {
    editing = null;
    labelInput.value = "";
    itemsArea.value = "";
    helperSelect.disabled = false;
    saveBtn.textContent = "Add section";
    cancelBtn.hidden = true;
    form.firstElementChild.textContent = "New section";
}

function sections(key: string): CustomSection[] {
    return (settings.helpers ??= {})[key] ??= [];
}

function renderList() {
    listBox.textContent = "";
    let any = false;

    for (const [key, title] of HELPERS) {
        const list = settings.helpers?.[key] ?? [];
        if (!list.length) continue;
        any = true;

        listBox.appendChild(make("h3", "", title));
        for (const section of list) {
            const el = make("div", "setting");
            const info = make("div", "info");
            info.append(make("b", "", section.label), make("small", "", `${section.items.length} items`));

            const actions = make("div", "sbuttons");
            const edit = make("button", "sbtn", "Edit");
            edit.type = "button";
            edit.onclick = () => {
                editing = { key, label: section.label };
                helperSelect.value = key;
                helperSelect.disabled = true;
                labelInput.value = section.label;
                itemsArea.value = section.items.join("\n");
                saveBtn.textContent = "Save changes";
                cancelBtn.hidden = false;
                form.firstElementChild.textContent = "Editing section";
                message.textContent = "";
                form.scrollIntoView({ block: "nearest" });
            };
            const del = make("button", "sbtn", "Delete");
            del.type = "button";
            del.onclick = () => {
                const arr = sections(key);
                arr.splice(arr.indexOf(section), 1);
                if (!arr.length) delete settings.helpers[key];
                saveSettings(settings);
                if (editing && editing.key == key && editing.label == section.label) reset();
                renderList();
            };
            actions.append(edit, del);

            el.append(info, actions);
            listBox.appendChild(el);
        }
    }

    if (!any) listBox.appendChild(make("p", "sintro", "Nothing here yet."));
}

saveBtn.onclick = () => {
    const label = labelInput.value.trim();
    const items: string[] = [];
    const bad: string[] = [];

    for (const raw of itemsArea.value.split("\n")) {
        const line = raw.trim().toLowerCase();
        if (!line) continue;
        if (!ID_PATTERN.test(line)) bad.push(raw.trim());
        else if (!items.includes(line)) items.push(line);
    }

    if (!label) { message.textContent = "Give the section a name."; return; }
    if (!items.length) { message.textContent = "Add at least one valid ID."; return; }

    const key = editing ? editing.key : helperSelect.value;
    const arr = sections(key);

    if (editing) {
        const at = arr.findIndex(s => s.label == editing.label);
        if (at >= 0) arr.splice(at, 1);
    }

    const same = arr.findIndex(s => s.label == label);
    if (same >= 0) arr.splice(same, 1);
    arr.push({ label, items });

    saveSettings(settings);
    renderList();
    reset();
    message.textContent = bad.length ? `Saved. Skipped ${bad.length} invalid line${bad.length == 1 ? "" : "s"}: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? ", ..." : ""}` : "Saved.";
};

cancelBtn.onclick = () => {
    reset();
    message.textContent = "";
};

renderList();

heading("Backup");

const backup = make("div", "setting col");
const exportBtn = make("button", "sbtn", "Export settings");
exportBtn.type = "button";
const importMode = dropdown([["replace", "Replace settings"], ["merge", "Merge into settings"]], "replace", () => {});
const importBtn = make("button", "sbtn", "Import settings");
importBtn.type = "button";
const fileInput = make("input");
fileInput.type = "file";
fileInput.accept = ".json,application/json";
fileInput.hidden = true;
const backupMessage = make("div", "smessage");

const exportRow = make("div", "sbuttons");
exportRow.append(exportBtn);
const importRow = make("div", "sbuttons");
importRow.append(importMode, importBtn, fileInput);
backup.append(
    exportRow,
    importRow,
    backupMessage
);
root.appendChild(backup);

exportBtn.onclick = () => {
    const blob = new Blob([exportSettings(settings)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = make("a");
    a.href = url;
    a.download = "origin-creator-settings.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    backupMessage.textContent = "Exported.";
};

importBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;

    const result = parseSettings(await file.text());
    if ("error" in result) {
        backupMessage.textContent = result.error;
        return;
    }

    const replace = importMode.value == "replace";
    if (replace && Object.keys(settings).length && !confirm("Replace Settings?")) return;

    settings = replace ? result.settings : mergeSettings(settings, result.settings);
    saveSettings(settings);
    accentSelect.value = settings.accent == "blue" ? "blue" : "purple";
    applyAccent(settings.accent);
    reset();
    renderList();
    backupMessage.textContent = result.skipped ? `Imported. Skipped ${result.skipped} invalid entr${result.skipped == 1 ? "y" : "ies"}.` : "Imported.";
};
