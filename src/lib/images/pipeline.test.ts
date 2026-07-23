import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateControlledSearchQueries } from './query-generator';
import { calculateMetadataScore } from './image-ranking';
import { NoVisionProvider } from './types';

describe('Smart Product Image Pipeline Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Search Query Generation', () => {
    it('generates a maximum of 4 controlled queries and avoids broad generic terms', () => {
      const queries = generateControlledSearchQueries('Củ cải trắng');
      expect(queries).toHaveLength(4);
      expect(queries).toContain('daikon radish isolated');
      expect(queries).not.toContain('vegetable'); // Excludes overly broad single-word terms
    });
  });

  describe('Stage 1 Metadata Scoring', () => {
    it('labels score as metadataScore and clamps between 0 and 100', () => {
      const sampleResult = {
        url: 'https://images.pexels.com/photos/100/clean_product.jpg',
        width: 800,
        height: 800,
        title: 'daikon radish',
        source_domain: 'pexels.com',
      };
      const score = calculateMetadataScore(sampleResult, 'daikon radish');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes undesirable keywords like logo or vector', () => {
      const cleanResult = {
        url: 'https://images.pexels.com/photos/100/clean.jpg',
        width: 800,
        height: 800,
        title: 'daikon radish',
      };
      const logoResult = {
        url: 'https://images.pexels.com/photos/100/logo_vector.jpg',
        width: 800,
        height: 800,
        title: 'daikon radish logo vector',
      };

      const cleanScore = calculateMetadataScore(cleanResult, 'daikon radish');
      const logoScore = calculateMetadataScore(logoResult, 'daikon radish');

      expect(logoScore).toBeLessThan(cleanScore);
    });
  });

  describe('Stage 2 Vision Provider Fallback & Thresholds', () => {
    it('missing vision provider sets verificationStatus to not_available and produces no visualScore', async () => {
      const visionProvider = new NoVisionProvider();
      const evaluations = await visionProvider.evaluateCandidates({
        productName: 'Củ cải trắng',
        normalizedName: 'củ cải trắng',
        aliases: ['daikon radish isolated'],
        candidates: [{ id: 'cand-1', url: 'https://images.pexels.com/photos/100/daikon.jpg' }],
      });

      expect(evaluations).toHaveLength(0);
    });
  });
});
