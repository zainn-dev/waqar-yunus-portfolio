import { services } from '@/data/services';

/** EDIT ME — contact form options. */
export const projectTypes = [...services.map((s) => s.title), 'Something else'];

export const budgetRanges = ['Not sure yet', 'Under $1,000', '$1,000 – $3,000', '$3,000 – $7,000', '$7,000+'];
