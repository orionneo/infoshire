import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

const SITE_URL = 'https://infoshire.com.br';

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href={`${SITE_URL}${window.location.pathname}`} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="InfoShire" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={`${SITE_URL}${window.location.pathname}`} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="mobile-web-app-capable" content="yes" />
  </Helmet>
);

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
