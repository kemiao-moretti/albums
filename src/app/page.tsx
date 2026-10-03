import { GalleryPage, pageNumber } from '@/components/gallery-page';
import { siteConfig } from '../../config';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageNumber((await searchParams).page);
  return <GalleryPage page={page} title="全部作品" intro={siteConfig.description} className="is-home" fallbackBase="/" />;
}
