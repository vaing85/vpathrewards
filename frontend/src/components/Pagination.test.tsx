import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('returns null when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Previous and Next and page numbers when totalPages > 1', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    )
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('calls onPageChange when Next is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when Previous is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByText('Previous'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('disables Previous on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
    )
    expect(screen.getByText('Previous')).toBeDisabled()
    expect(screen.getByText('Next')).not.toBeDisabled()
  })

  it('disables Next on last page', () => {
    render(
      <Pagination currentPage={3} totalPages={3} onPageChange={() => {}} />
    )
    expect(screen.getByText('Next')).toBeDisabled()
    expect(screen.getByText('Previous')).not.toBeDisabled()
  })

  it('shows page info when showInfo and totalItems are provided', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={2}
        onPageChange={() => {}}
        showInfo
        totalItems={20}
      />
    )
    expect(screen.getByText(/Showing page 1 of 2/)).toBeInTheDocument()
    expect(screen.getByText(/20 total items/)).toBeInTheDocument()
  })

  it('calls onPageChange when a page number is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />
    )
    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
