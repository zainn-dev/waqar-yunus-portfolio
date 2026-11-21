import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, Loader2 } from 'lucide-react';
import { profile } from '@/data/profile';
import { budgetRanges, projectTypes } from '@/data/contact';
import { ContactError, isContactConfigured, submitContact } from '@/lib/contact';
import { cn } from '@/utils/cn';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name (at least 2 characters).').max(100, 'Keep the name under 100 characters.'),
  email: z.string().trim().email('Enter a valid email address, like name@example.com.'),
  projectType: z.string().min(1, 'Choose the type of project.'),
  budget: z.string().optional(),
  message: z.string().trim().min(20, 'Tell me a little more — at least 20 characters.').max(4000, 'Keep the message under 4,000 characters.'),
  /** Honeypot: real people never see or fill this. */
  company: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;
type Status = { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error'; message: string };

const ERR = '#FF8A7A';
const field =
  'w-full rounded-[8px] border bg-transparent px-5 py-4 text-[15px] text-bone placeholder:text-mute transition-colors duration-300 focus:outline-none focus:border-lime hover:border-bone/40';

/**
 * The project enquiry form (used by the contact panel and the contact page). Labels are visually
 * hidden; placeholders carry the prompt, errors are announced and linked to their field.
 * `id` keeps field ids unique when two copies are on screen.
 */
export function ContactForm({ id = 'cf', presetType }: { id?: string; presetType?: string | null }) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const mountedAt = useRef(Date.now());
  const abort = useRef<AbortController | null>(null);
  const configured = isContactConfigured();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { name: '', email: '', projectType: presetType && projectTypes.includes(presetType) ? presetType : '', budget: '', message: '', company: '' },
  });

  useEffect(() => () => abort.current?.abort(), []);

  const onSubmit = async (values: FormValues) => {
    if (values.company || Date.now() - mountedAt.current < 2500) {
      setStatus({ state: 'error', message: 'That was a little too fast. Please wait a moment and try again.' });
      return;
    }
    setStatus({ state: 'sending' });
    abort.current = new AbortController();
    try {
      await submitContact(
        { name: values.name, email: values.email, projectType: values.projectType, budget: values.budget || undefined, message: values.message },
        abort.current.signal,
      );
      setStatus({ state: 'sent' });
      reset();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setStatus({ state: 'error', message: err instanceof ContactError ? err.message : 'Something went wrong while sending. Please try again.' });
    }
  };

  const fid = (n: string) => `${id}-${n}`;
  const errorText = (name: keyof FormValues) =>
    errors[name] ? (
      <p id={fid(`${name}-error`)} role="alert" className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: ERR }}>
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {errors[name]?.message}
      </p>
    ) : null;
  const a11y = (name: keyof FormValues) => ({
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? fid(`${name}-error`) : undefined,
    style: errors[name] ? { borderColor: ERR } : undefined,
  });

  return (
    <AnimatePresence mode="wait">
      {status.state === 'sent' ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[8px] border border-lime/50 p-8 md:p-10" role="status">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lime text-onfill"><Check className="h-6 w-6" aria-hidden="true" /></span>
          <h2 className="mt-6 font-display text-4xl uppercase">Message sent.</h2>
          <p className="mt-3 text-mute">Thanks for reaching out — I’ll get back to you within a day.</p>
          <button type="button" onClick={() => setStatus({ state: 'idle' })} className="mt-8 min-h-[44px] text-accent underline underline-offset-4">Send another message</button>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4" aria-describedby={!configured ? fid('config') : undefined} exit={{ opacity: 0 }}>
          {!configured && (
            <p id={fid('config')} className="font-mono text-[11px] uppercase tracking-[0.06em] text-mute/70">
              {import.meta.env.DEV ? <>Dev only: set <code className="font-mono text-xs text-bone">VITE_CONTACT_ENDPOINT</code> to enable sending</> : 'This form isn’t accepting messages yet'}
              {profile.email ? <>, or email <a className="text-bone underline" href={`mailto:${profile.email}`}>{profile.email}</a> directly.</> : '.'}
            </p>
          )}

          <div>
            <label htmlFor={fid('name')} className="sr-only">Name (required)</label>
            <input id={fid('name')} autoComplete="name" placeholder="Name *" className={cn(field, 'border-[var(--grid)]')} {...a11y('name')} {...register('name')} />
            {errorText('name')}
          </div>
          <div>
            <label htmlFor={fid('email')} className="sr-only">Email (required)</label>
            <input id={fid('email')} type="email" inputMode="email" autoComplete="email" placeholder="Email *" className={cn(field, 'border-[var(--grid)]')} {...a11y('email')} {...register('email')} />
            {errorText('email')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <label htmlFor={fid('projectType')} className="sr-only">Project type (required)</label>
              <select id={fid('projectType')} className={cn(field, 'appearance-none border-[var(--grid)] pr-12 [&:has(option[value=""]:checked)]:text-mute')} {...a11y('projectType')} {...register('projectType')}>
                <option value="">Project type *</option>
                {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-5 top-[1.15rem] h-5 w-5 text-accent" strokeWidth={2.5} />
              {errorText('projectType')}
            </div>
            <div className="relative">
              <label htmlFor={fid('budget')} className="sr-only">Budget (optional)</label>
              <select id={fid('budget')} className={cn(field, 'appearance-none border-[var(--grid)] pr-12 [&:has(option[value=""]:checked)]:text-mute')} {...register('budget')}>
                <option value="">Budget</option>
                {budgetRanges.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-5 top-[1.15rem] h-5 w-5 text-accent" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <label htmlFor={fid('message')} className="sr-only">Message (required)</label>
            <textarea id={fid('message')} rows={5} placeholder="A short description of your project is always best :)" className={cn(field, 'resize-y border-[var(--grid)]')} {...a11y('message')} {...register('message')} />
            {errorText('message')}
          </div>

          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={fid('company')}>Company</label>
            <input id={fid('company')} tabIndex={-1} autoComplete="off" {...register('company')} />
          </div>

          {status.state === 'error' && (
            <p role="alert" className="flex items-start gap-2 rounded-[8px] border p-4 text-sm" style={{ borderColor: `${ERR}80`, color: '#FFB3A8' }}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {status.message}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-5 pt-2">
            <button
              type="submit"
              disabled={status.state === 'sending'}
              className="inline-flex min-h-[56px] items-center gap-3 rounded-[8px] bg-lime px-7 font-display text-[1.75rem] leading-none text-onfill transition-transform duration-300 ease-expo hover:-translate-y-0.5 disabled:opacity-60"
            >
              {status.state === 'sending' ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Sending…</> : 'Let’s connect!'}
            </button>
            <p className="text-sm text-mute">Your details are only used to reply to you.</p>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
