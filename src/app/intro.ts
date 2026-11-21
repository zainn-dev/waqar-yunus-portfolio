import { createContext, useContext } from 'react';

/** `ready` flips true once the intro loader has finished (or immediately if it's skipped). */
export const IntroContext = createContext<{ ready: boolean }>({ ready: true });
export const useIntro = () => useContext(IntroContext);
