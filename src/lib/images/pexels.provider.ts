import { ImageSearchProvider, ImageSearchResult } from './provider.interface';

export class PexelsImageSearchProvider implements ImageSearchProvider {
  async searchImages(query: string): Promise<ImageSearchResult[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      console.error('PEXELS_API_KEY is not configured');
      return []; // Return empty gracefully if API key is missing
    }

    try {
      const url = new URL('https://api.pexels.com/v1/search');
      url.searchParams.append('query', query);
      url.searchParams.append('per_page', '20');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json',
        },
        // Don't cache here, let the service layer manage cache
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error(`Pexels API responded with status: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const photos = data.photos || [];

      return photos.map((photo: { src?: { large?: string; large2x?: string; original?: string; medium?: string; small?: string }; width?: number; height?: number; alt?: string }) => {
        // Prefer large / large2x image URL for high resolution product photo
        const imageUrl = photo.src?.large || photo.src?.large2x || photo.src?.original || photo.src?.medium;
        return {
          url: imageUrl,
          width: photo.width,
          height: photo.height,
          title: photo.alt || '',
          source_domain: 'pexels.com',
          thumbnail_url: photo.src?.medium || photo.src?.small || imageUrl,
        };
      });
    } catch (error) {
      console.error('Failed to search images via Pexels API:', error);
      return [];
    }
  }
}
