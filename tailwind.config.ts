import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1440px', '2xl': '1920px' },
    extend: {
      // Semantic colours driven by CSS variables (see styles/index.css).
      // `ink*` = surfaces, `bone` = foreground, `lime` = solid fill, `onfill` = text on that fill,
      // `accent` = accent text. Wrapping a section in `.theme-dark` flips all of them.
      colors: {
        ink: { DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)', 2: 'rgb(var(--c-bg2) / <alpha-value>)', 3: 'rgb(var(--c-bg3) / <alpha-value>)' },
        bone: 'rgb(var(--c-fg) / <alpha-value>)',
        mute: 'rgb(var(--c-mute) / <alpha-value>)',
        line: 'rgb(var(--c-line) / calc(<alpha-value> * 0.16))',
        lime: 'rgb(var(--c-fill) / <alpha-value>)',
        onfill: 'rgb(var(--c-onfill) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        sage: '#3DDC97',
        stage: '#201E1E',
        neon: '#3DDC97',
      },
      // Borders/underlines in the "lime" role use a deep green on light surfaces so focus and
      // active states keep enough contrast; on .theme-dark they are mint like the fill.
      borderColor: { lime: 'rgb(var(--c-edge) / <alpha-value>)' },
      textDecorationColor: { lime: 'rgb(var(--c-edge) / <alpha-value>)' },
      borderRadius: { cta: '3px' },
      fontFamily: {
        display: ['"Antonio Variable"', 'Antonio', '"Arial Narrow"', 'system-ui', 'sans-serif'],
        brand: ['"Space Grotesk Variable"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '1760px' },
      transitionTimingFunction: { expo: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
} satisfies Config;
