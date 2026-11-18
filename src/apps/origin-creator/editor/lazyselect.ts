export const LAZY_MIN_OPTIONS = 24;

const optionHtmls: string[] = [];
const optionIds = new Map<string, number>();

export function registerEnumOptions(html: string): string {
    let id = optionIds.get(html);
    if (id === undefined) {
        id = optionHtmls.length;
        optionHtmls.push(html);
        optionIds.set(html, id);
    }
    return String(id);
}

export function fillLazySelect(select: HTMLSelectElement) {
    const id = select.getAttribute("lazyopts");
    if (id === null) return;

    const value = select.value;
    select.removeAttribute("lazyopts");
    select.innerHTML = optionHtmls[Number(id)];
    select.value = value;
}

export function showOption(select: HTMLSelectElement, value: string, text: string) {
    if (!select.hasAttribute("lazyopts")) return;
    if (select.options.length === 1 && select.options[0].value === value) return;
    select.replaceChildren(new Option(text, value));
}
