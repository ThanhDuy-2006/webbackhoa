import { ImageSearchResult } from './provider.interface';
import { ImageCandidate } from './types';

const PENALIZED_WORDS = [
  'logo', 'icon', 'banner', 'avatar', 'sprite', 'placeholder', 'thumbnail',
  'advertisement', 'social', 'vector', 'clipart', 'badge'
];

const PREFERRED_DOMAINS = [
  'pexels', 'amazon', 'walmart', 'target', 'ebay', 'shopify', 'cdn', 'images', 'static', 'media', 'upload'
];

/**
 * Calculates Stage 1 metadata score (0 - 100) for an image result.
 */
export function calculateMetadataScore(image: ImageSearchResult, query: string): number {
  let score = 50; // Base score

  const urlLower = image.url.toLowerCase();
  const titleLower = (image.title || '').toLowerCase();
  const queryLower = query.toLowerCase();

  // 1. Penalize bad keywords in URL or title
  for (const word of PENALIZED_WORDS) {
    if (urlLower.includes(word) || titleLower.includes(word)) {
      score -= 30;
    }
  }

  // 2. Prefer HTTPS
  if (urlLower.startsWith('https://')) {
    score += 10;
  }

  // 3. Aspect Ratio & Resolution
  if (image.width && image.height) {
    // High resolution preference
    if (image.width >= 500 && image.height >= 500) {
      score += 15;
    } else if (image.width < 200 || image.height < 200) {
      score -= 20; // Too small
    }

    // Square or near-square preference (aspect ratio between 0.8 and 1.25)
    const ratio = image.width / image.height;
    if (ratio >= 0.8 && ratio <= 1.25) {
      score += 10;
    }
  }

  // 4. Domain Preferences
  if (image.source_domain) {
    const domainLower = image.source_domain.toLowerCase();
    for (const pref of PREFERRED_DOMAINS) {
      if (domainLower.includes(pref)) {
        score += 5;
        break;
      }
    }
  }

  // 5. Query matching in title
  if (titleLower && titleLower.includes(queryLower)) {
    score += 10;
  }

  // Clamp score to 0 - 100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Stage 1: Ranks image search results by metadataScore.
 */
export function rankImagesByMetadata(images: ImageSearchResult[], query: string): ImageCandidate[] {
  return images
    .map((img, index) => {
      const metadataScore = calculateMetadataScore(img, query);
      return {
        id: `cand-${index}-${Math.random().toString(36).substring(2, 9)}`,
        url: img.url,
        thumbnailUrl: img.thumbnail_url || img.url,
        metadataScore,
        sourcePageUrl: img.url,
      };
    })
    .sort((a, b) => b.metadataScore - a.metadataScore);
}
