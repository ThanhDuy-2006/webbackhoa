// @ts-ignore
import { render, screen } from '@testing-library/react';
import { ProductForm } from './ProductForm';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('ProductForm', () => {
  it('renders form', () => {
    render(<ProductForm categories={[]} />);
    expect(screen.getByText('Tên sản phẩm')).toBeInTheDocument();
  });
});
