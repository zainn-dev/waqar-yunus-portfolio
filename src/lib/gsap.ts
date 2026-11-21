import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP, CustomEase);
/** The globe's flight curve: most of the move in the first third, then a long soft settle. */
CustomEase.create('snappy', 'M0,0 C0.094,0.026 0.124,0.127 0.157,0.29 0.197,0.486 0.254,0.8 0.348,0.884 0.42,0.949 0.374,1 1,1');
// Keep scroll restoration manual — the app's PageShell handles back/forward positions.
ScrollTrigger.clearScrollMemory('manual');
gsap.defaults({ ease: 'expo.out', duration: 1.1 });

export { gsap, ScrollTrigger, useGSAP };
