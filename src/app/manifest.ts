import type { MetadataRoute } from 'next';
import { siteConfig } from '../../config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    lang: 'zh-CN',
    icons: [
      { src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/images/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/images/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/images/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
