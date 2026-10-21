import type { Metadata, Viewport } from 'next';
import { siteConfig } from '../../config';
import PwaRegister from '../components/pwa-register';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#141414',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    images: [{ url: '/images/opengraph.jpg', alt: `${siteConfig.name}：蓝色时刻的海岸与灯塔` }],
  },
  icons: {
    icon: '/images/lumolog-mark.svg',
    apple: '/images/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body data-photo-fallback="/images/photo-fallback.svg">
    <a className="skip-link" href="#main-content">跳到内容</a>
    {children}
    <PwaRegister />
  </body></html>;
}
