/**
 * Contact form adapter.
 *
 * Sends JSON to VITE_CONTACT_ENDPOINT. Compatible with Formspree, Getform, Basin and
 * most serverless handlers. To use something else (EmailJS, Supabase, your own API),
 * replace `submitContact` — the form only relies on it resolving or throwing.
 */
export interface ContactPayload {
  name: string;
  email: string;
  projectType: string;
  budget?: string;
  message: string;
}

export const CONTACT_ENDPOINT = (import.meta.env.VITE_CONTACT_ENDPOINT || '').trim();
export const isContactConfigured = () => CONTACT_ENDPOINT.length > 0;

export class ContactError extends Error {}

export async function submitContact(payload: ContactPayload, signal?: AbortSignal): Promise<void> {
  if (!isContactConfigured()) {
    throw new ContactError('This form isn’t accepting messages yet. Please reach out through one of the other contact options.');
  }
  let res: Response;
  try {
    res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new ContactError('Your message couldn’t be sent — check your connection and try again.');
  }
  if (!res.ok) {
    throw new ContactError(`The server rejected the message (error ${res.status}). Please try again or email directly.`);
  }
}
