import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormField from './FormField'

describe('FormField', () => {
  it('renders label and input', () => {
    const onChange = vi.fn()
    render(
      <FormField
        label="Email"
        name="email"
        value=""
        onChange={onChange}
      />
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('')
  })

  it('shows required asterisk when required is true', () => {
    render(
      <FormField
        label="Name"
        name="name"
        value=""
        onChange={() => {}}
        required
      />
    )
    const label = screen.getByText('Name')
    expect(label).toHaveTextContent('*')
  })

  it('shows error message when error and touched are set', () => {
    render(
      <FormField
        label="Email"
        name="email"
        value="bad"
        onChange={() => {}}
        error="Please enter a valid email"
        touched
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email')
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not show error when touched is false', () => {
    render(
      <FormField
        name="email"
        value=""
        onChange={() => {}}
        error="Invalid"
        touched={false}
      />
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders textarea when as="textarea"', () => {
    render(
      <FormField
        name="comment"
        value=""
        onChange={() => {}}
        as="textarea"
      />
    )
    const textarea = document.querySelector('textarea[name="comment"]')
    expect(textarea).toBeInTheDocument()
  })

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(
      <FormField
        name="email"
        value=""
        onChange={onChange}
      />
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a' } })
    expect(onChange).toHaveBeenCalled()
  })
})
