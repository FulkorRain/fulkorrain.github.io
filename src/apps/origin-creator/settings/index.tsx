const KEY = "oc-settings";

function load(): Record<string, any> {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
        return {};
    }
}

const settings = load();

function save() {
    localStorage.setItem(KEY, JSON.stringify(settings));
}

function row(label: string, desc: string, control: HTMLElement) {
    const el = document.createElement("div");
    el.className = "setting";

    const info = document.createElement("div");
    info.className = "info";
    const b = document.createElement("b");
    b.textContent = label;
    const small = document.createElement("small");
    small.textContent = desc;
    info.append(b, small);

    el.append(info, control);
    document.getElementById("settings").appendChild(el);
}

function dropdown(id: string, label: string, desc: string, options: [string, string][], apply: (value: string) => void) {
    const select = document.createElement("select");
    select.className = "sinput";
    for (const [value, text] of options) {
        const o = document.createElement("option");
        o.value = value;
        o.textContent = text;
        select.appendChild(o);
    }

    const stored = settings[id];
    select.value = options.some(o => o[0] == stored) ? stored : options[0][0];

    select.onchange = () => {
        settings[id] = select.value;
        save();
        apply(select.value);
    };

    row(label, desc, select);
}

dropdown(
    "accent",
    "Site colours",
    "Switch the site between the purple theme and the classic blue.",
    [["purple", "Purple"], ["blue", "Blue (classic)"]],
    (v) => {
        if (v == "blue") document.documentElement.setAttribute("accent", "blue");
        else document.documentElement.removeAttribute("accent");
    }
);
