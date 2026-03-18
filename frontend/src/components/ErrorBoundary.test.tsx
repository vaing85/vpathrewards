import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

const ThrowError = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders default fallback when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('renders custom fallback when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
