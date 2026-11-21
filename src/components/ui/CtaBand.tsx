import { ButtonLink } from '@/components/ui/Button';

export function CtaBand({ title, body, to = '/contact', label = 'Start a project' }: { title: string; body?: string; to?: string; label?: string }) {
  return (
    <section className="page-wrap py-24 md:py-32">
      <div className="flex flex-col gap-8 border-t border-line pt-12 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="t-h2 max-w-[14ch]">{title}</h2>
          {body && <p className="mt-6 max-w-[46ch] text-mute">{body}</p>}
        </div>
        <ButtonLink to={to} magnetic>{label}</ButtonLink>
      </div>
    </section>
  );
}
