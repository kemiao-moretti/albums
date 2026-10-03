import { describe, expect, it } from 'vitest';
import type { Album } from './gallery-schema';
import { moveSelection } from './gallery-navigation';

const albums: Album[] = [
  {
    id: 'one',
    title: '第一组',
    date: '2026-01-01',
    categories: [],
    tags: [],
    photos: [
      { id: 'one-1', src: '/images/demo/coast-1.webp', alt: '第一张' },
      { id: 'one-2', src: '/images/demo/coast-2.webp', alt: '第二张' },
    ],
  },
  {
    id: 'two',
    title: '第二组',
    date: '2026-01-02',
    categories: [],
    tags: [],
    photos: [{ id: 'two-1', src: '/images/demo/cafe-1.webp', alt: '第三张' }],
  },
  {
    id: 'three',
    title: '第三组',
    date: '2026-01-03',
    categories: [],
    tags: [],
    photos: [
      { id: 'three-1', src: '/images/demo/forest-1.webp', alt: '第四张' },
      { id: 'three-2', src: '/images/demo/alpine-1.webp', alt: '第五张' },
    ],
  },
];

describe('lightbox navigation', () => {
  it('moves within a group, then across loaded groups', () => {
    const loadedAlbums = [albums[0], albums[1], albums[2], albums[0], albums[2]];
    expect(moveSelection(loadedAlbums, { albumIndex: 3, photoIndex: 0 }, 1)).toEqual({ albumIndex: 3, photoIndex: 1 });
    expect(moveSelection(loadedAlbums, { albumIndex: 3, photoIndex: 1 }, 1)).toEqual({ albumIndex: 4, photoIndex: 0 });
    expect(moveSelection(loadedAlbums, { albumIndex: 4, photoIndex: 0 }, -1)).toEqual({ albumIndex: 3, photoIndex: 1 });
  });

  it('wraps at both ends of the loaded list', () => {
    expect(moveSelection(albums, { albumIndex: 2, photoIndex: 1 }, 1)).toEqual({ albumIndex: 0, photoIndex: 0 });
    expect(moveSelection(albums, { albumIndex: 0, photoIndex: 0 }, -1)).toEqual({ albumIndex: 2, photoIndex: 1 });
  });
});
