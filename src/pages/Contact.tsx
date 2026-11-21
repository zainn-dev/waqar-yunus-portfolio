import { useSearchParams } from 'react-router-dom';
import { Seo } from '@/components/ui/Seo';
import { pageMeta } from '@/data/seo';
import { ContactBody } from '@/components/contact/ContactBody';

/** Contact page: the same three-column body as the "Start a project" panel, as a normal page. */
export default function Contact() {
  const [params] = useSearchParams();
  return (
    <>
      <Seo title={pageMeta['/contact'].title} description={pageMeta['/contact'].description} />
      <section className="border-b cell-b">
        <ContactBody id="page" titleId="contact-title" presetType={params.get('type')} page />
      </section>
    </>
  );
}
