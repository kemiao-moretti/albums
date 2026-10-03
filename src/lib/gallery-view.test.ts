import { describe, expect, it } from 'vitest';
import sample from '../../data';
import { gallerySchema } from './gallery-schema';
import { albumsFor, pageOf, orderedAlbums, termsFor } from './gallery-view';

const gallery = gallerySchema.parse(sample);
const paginatedGallery = {
  ...gallery,
  albums: Array.from({ length: 13 }, (_, index) => ({
    ...gallery.albums[0],
    id: `sample-${index}`,
  })),
};

describe('runtime gallery views', () => {
  it('preserves JSON order and paginates without losing a work', () => {
    const albums = orderedAlbums(paginatedGallery);
    expect(albums[0].id).toBe('sample-0');
    expect(orderedAlbums({ ...paginatedGallery, albums: [...albums].reverse() })[0].id).toBe(albums.at(-1)?.id);
    expect(pageOf(albums, 1).albums).toHaveLength(12);
    expect(pageOf(albums, 2).albums).toHaveLength(1);
    expect(pageOf(albums, 1).albums.concat(pageOf(albums, 2).albums).map(album => album.id)).toEqual(albums.map(album => album.id));
  });

  it('updates category and tag views from the same data', () => {
    const category = gallery.albums[0].categories[0];
    const tag = gallery.albums[0].tags[0];
    const categories = termsFor(gallery, 'categories');
    const selectedCategory = categories.find(term => term.name === category);
    expect(selectedCategory?.albums.map(album => album.id)).toEqual(albumsFor(gallery, 'categories', category).map(album => album.id));
    expect(termsFor(gallery, 'tags').some(term => term.name === tag)).toBe(true);
  });
});
