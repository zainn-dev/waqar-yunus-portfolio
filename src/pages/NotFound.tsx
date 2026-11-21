import { Seo } from '@/components/ui/Seo';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="page-wrap flex min-h-[90svh] flex-col justify-center pt-[calc(var(--header-h)+3rem)]">
      <Seo title="Page not found" noindex />
      <p className="t-label mb-6">Error 404</p>
      <h1 className="t-mega">
        Lost in<br />the void<span aria-hidden="true" className="ml-[0.03em] inline-block h-[0.17em] w-[0.17em] bg-lime" />
      </h1>
      <p className="mt-8 max-w-[44ch] text-lg text-mute">This page doesn’t exist or has moved. Head back home to explore the projects.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/about" variant="outline">About me</ButtonLink>
      </div>
    </section>
  );
}
