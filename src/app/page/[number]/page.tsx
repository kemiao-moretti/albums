import { GalleryPage, pageNumber } from '@/components/gallery-page';
import { siteConfig } from '../../../../config';

export const dynamic = 'force-dynamic';

export default async function PagedHome({ params }: { params: Promise<{ number: string }> }) {
  const page = pageNumber((await params).number);
  return <GalleryPage page={page} title="全部作品" intro={siteConfig.description} className="is-home" fallbackBase="/" />;
}
