// @ts-ignore
import { render, screen, fireEvent } from '@testing-library/react';
import { SmartImage } from './smart-image';
import { describe, it, expect, vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  } as Response)
);

describe('SmartImage', () => {
  it('renders standard image', () => {
    render(<SmartImage productId="123" src="https://example.com/test.jpg" alt="test" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
    expect(img).toHaveAttribute('alt', 'test');
  });

  it('falls back to placeholder on error', () => {
    render(<SmartImage productId="123" src="https://example.com/bad.jpg" alt="test" />);
    const img = screen.getByRole('img');
    
    fireEvent.error(img);
    
    // Checks that placeholder is set
    expect(img).toHaveAttribute('src', '/images/product-placeholder.png');
    
    // Checks that report-broken was called
    expect(fetch).toHaveBeenCalledWith('/api/images/report-broken', expect.any(Object));
  });
});
