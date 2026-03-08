import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// A component that throws
function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error noise from React during these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('renders custom fallback title', () => {
    render(
      <ErrorBoundary fallbackTitle="Page crashed">
        <Thrower shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Page crashed')).toBeInTheDocument();
  });

  it('recovers when Try Again is clicked', () => {
    // We need a component that can toggle the error
    let shouldThrow = true;
    function ToggleThrower() {
      if (shouldThrow) throw new Error('boom');
      return <div>Recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <ToggleThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    // After reset, the boundary should try rendering children again
    rerender(
      <ErrorBoundary>
        <ToggleThrower />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
