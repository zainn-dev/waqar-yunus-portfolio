/** Remembers scroll offsets per history entry so back/forward returns where you were. */
export const scrollPositions = new Map<string, number>();

/**
 * Key of the history entry whose page is actually on screen. During a route transition the URL
 * changes before the old page leaves, so positions are only saved when this matches the URL.
 */
let renderedKey = '';
export const setRenderedKey = (key: string) => { renderedKey = key; };
export const getRenderedKey = () => renderedKey;
