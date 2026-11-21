import { createContext, useContext } from 'react';
import type Lenis from 'lenis';

export const LenisContext = createContext<Lenis | null>(null);
/** The active Lenis instance, or null when smooth scrolling is off (e.g. reduced motion). */
export const useLenis = () => useContext(LenisContext);
