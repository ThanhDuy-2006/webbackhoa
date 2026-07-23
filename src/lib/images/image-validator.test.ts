import { validateImageUrl } from './image-validator';
import { describe, it, expect } from 'vitest';

describe('image-validator', () => {
  it('should invalidate non-http urls', async () => {
    const isValid = await validateImageUrl('ftp://example.com/image.png');
    expect(isValid).toBe(false);
  });

  it('should invalidate relative urls', async () => {
    const isValid = await validateImageUrl('/images/test.png');
    expect(isValid).toBe(false);
  });
  
  // Note: we can't easily test real fetch here without mocking it, 
  // but this verifies the basic regex and structure validations.
});
