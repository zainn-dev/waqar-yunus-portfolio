import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/app/App';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import '@/styles/index.css';

// The app restores scroll itself (see PageShell); the browser's automatic restoration would
// jump to a clamped position on the outgoing page during the transition.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Build-time SEO tags exist for crawlers and link previews. Once the app runs, React 19
// owns the head, so remove them to avoid duplicate/conflicting canonical and Open Graph tags.
document.querySelectorAll('[data-seo="static"]').forEach((el) => el.remove());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SmoothScroll>
        <App />
      </SmoothScroll>
    </BrowserRouter>
  </StrictMode>,
);
