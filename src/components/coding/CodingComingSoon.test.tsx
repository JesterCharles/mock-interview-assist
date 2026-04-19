// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CodingComingSoon } from './CodingComingSoon';

describe('CodingComingSoon', () => {
  it('renders the headline', () => {
    render(<CodingComingSoon />);
    expect(
      screen.getByRole('heading', { name: /Coding Challenges Coming Soon/i }),
    ).toBeInTheDocument();
  });

  it('renders the body copy', () => {
    render(<CodingComingSoon />);
    expect(
      screen.getByText(/We're building an in-browser coding environment/i),
    ).toBeInTheDocument();
  });

  it('links to /dashboard by default', () => {
    render(<CodingComingSoon />);
    const link = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('accepts a custom backHref', () => {
    render(<CodingComingSoon backHref="/associate/demo" />);
    const link = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(link).toHaveAttribute('href', '/associate/demo');
  });

  it('uses design tokens (var(--accent), var(--ink))', () => {
    render(<CodingComingSoon />);
    const heading = screen.getByRole('heading', {
      name: /Coding Challenges Coming Soon/i,
    });
    expect(heading.getAttribute('style') ?? '').toContain('var(--ink)');
    const link = screen.getByRole('link', { name: /Back to Dashboard/i });
    expect(link.getAttribute('style') ?? '').toContain('var(--accent)');
  });
});
