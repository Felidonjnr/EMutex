import { Helmet } from 'react-helmet-async';
import { useSiteContent } from '../context/SiteContentContext';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

export const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  noindex = false,
}: SEOProps) => {
  const { content } = useSiteContent();

  const defaultMetadata = {
    title: content.seo?.metaTitle || 'EMutex Nig — Wellness Products for Better Living',
    description: content.seo?.metaDescription || 'Premium Nigerian wellness and vitality products for adults.',
    keywords: content.seo?.keywords || 'wellness products Nigeria, vitality products Nigeria',
    image: content.seo?.ogImageUrl || '/images/emutex-logo.png',
    url: 'https://emutexnig.com',
    type: 'website' as const,
  };

  const seoTitle = title ? `${title} | ${content.brand.name}` : defaultMetadata.title;
  const seoDescription = description || defaultMetadata.description;
  const seoKeywords = keywords || defaultMetadata.keywords;
  const seoImage = image || defaultMetadata.image;
  const seoUrl = url || defaultMetadata.url;
  const seoType = type || defaultMetadata.type;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {!noindex && <meta name="robots" content="index,follow" />}
      <link rel="canonical" href={seoUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoType} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:url" content={seoUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
    </Helmet>
  );
};

export default SEO;
