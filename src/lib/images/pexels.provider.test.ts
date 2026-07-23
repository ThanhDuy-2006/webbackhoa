import { PexelsImageSearchProvider } from './pexels.provider';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PexelsImageSearchProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, PEXELS_API_KEY: 'test-pexels-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty array when PEXELS_API_KEY is not configured', async () => {
    delete process.env.PEXELS_API_KEY;
    const provider = new PexelsImageSearchProvider();
    const results = await provider.searchImages('apple');
    expect(results).toEqual([]);
  });

  it('maps Pexels API photos to ImageSearchResult correctly', async () => {
    const mockPhotos = [
      {
        id: 2014422,
        width: 3000,
        height: 4000,
        url: 'https://www.pexels.com/photo/2014422/',
        alt: 'Fresh Red Apple',
        src: {
          original: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg',
          large2x: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
          large: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
          medium: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=350',
          small: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=130',
        },
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ photos: mockPhotos }),
      } as Response)
    );

    const provider = new PexelsImageSearchProvider();
    const results = await provider.searchImages('apple');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.pexels.com/v1/search'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'test-pexels-key',
        }),
      })
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      url: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
      width: 3000,
      height: 4000,
      title: 'Fresh Red Apple',
      source_domain: 'pexels.com',
      thumbnail_url: 'https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&h=350',
    });
  });

  it('handles API error status gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      } as Response)
    );

    const provider = new PexelsImageSearchProvider();
    const results = await provider.searchImages('apple');
    expect(results).toEqual([]);
  });
});
