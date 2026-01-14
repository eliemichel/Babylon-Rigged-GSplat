/**
 * Get the DOM elements by their ids.
 * @param ids - The ids of the elements.
 * @returns A record of the elements.
 */
export function getElementsByIds(ids: string[]): Record<string, HTMLElement> {
    const elements: Record<string, HTMLElement> = {};
    for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id '${id}' not found`);
        }
        elements[id] = element;
    }
    return elements;
}
