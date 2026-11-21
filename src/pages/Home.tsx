import { Seo } from '@/components/ui/Seo';
import { GlobeHome } from '@/components/home/GlobeHome';
import { profile } from '@/data/profile';
import { visibleSocials } from '@/data/socials';
import { SITE_URL } from '@/lib/site';

/** Home is a single screen: the project globe under the grid header. */
export default function Home() {
  return (
    <>
      <Seo
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: profile.name,
          jobTitle: profile.title,
          url: SITE_URL,
          address: { '@type': 'PostalAddress', addressLocality: 'Delhi', addressCountry: 'IN' },
          knowsAbout: ['React', 'TypeScript', 'Node.js', 'WordPress', 'E-commerce', 'Payment integrations'],
          sameAs: visibleSocials().map((s) => s.href),
        }}
      />
      <GlobeHome />
    </>
  );
}
