import { get, keys } from "./wrapper";

const CUT = 600;
const STEP = 300;

let shown = new WeakMap<object, number>();

export function resetTruncation() {
    shown = new WeakMap();
}

export function setShown(owner: object, count: number) {
    shown.set(owner, count);
}

function countLines(v: any): number {
    if (v === null || typeof v != "object") return 1;
    let n = 2;
    if (Array.isArray(v)) {
        for (const x of v) n += countLines(x);
    } else {
        for (const k of keys(v)) n += countLines(get(v, k));
    }
    return n;
}

export function visibleCount(owner: object, values: any[]): { count: number, next: number } | null {
    const lens = values.map(countLines);
    if (lens.reduce((a, b) => a + b, 0) <= CUT) return null;

    const step = (from: number) => {
        let n = from;
        let acc = 0;
        while (n < lens.length && acc < STEP) acc += lens[n++];
        return n;
    };

    const count = Math.min(shown.get(owner) ?? step(0), lens.length);
    if (count >= lens.length) return null;
    return { count, next: step(count) };
}

export function truncNotice(count: number, total: number, next: number): string {
    return `<div class="jtrunc" data-next="${next}"><span>Showing ${count} of ${total} entries</span>`
        + `<button type="button" class="normal" onclick="JSONED.showMore(this)">Show next ${STEP} lines</button>`
        + `<button type="button" class="normal" onclick="JSONED.showAll(this)">Show all</button></div>`;
}
