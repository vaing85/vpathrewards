import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormValidation } from './useFormValidation'

describe('useFormValidation', () => {
  it('validates required field', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true } })
    )
    expect(result.current.validateField('name', '')).toBe('Name is required')
    expect(result.current.validateField('name', '  ')).toBe('Name is required')
    expect(result.current.validateField('name', 'John')).toBe(null)
  })

  it('validates email format', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: { email: true } })
    )
    expect(result.current.validateField('email', 'invalid')).toBe('Please enter a valid email address')
    expect(result.current.validateField('email', 'a@b.co')).toBe(null)
  })

  it('validates minLength', () => {
    const { result } = renderHook(() =>
      useFormValidation({ password: { minLength: 6 } })
    )
    expect(result.current.validateField('password', '12345')).toBe('Must be at least 6 characters')
    expect(result.current.validateField('password', '123456')).toBe(null)
  })

  it('validates maxLength', () => {
    const { result } = renderHook(() =>
      useFormValidation({ title: { maxLength: 10 } })
    )
    expect(result.current.validateField('title', '')).toBe(null)
    expect(result.current.validateField('title', 'short')).toBe(null)
    expect(result.current.validateField('title', 'this is way too long')).toBe('Must be no more than 10 characters')
  })

  it('validates pattern', () => {
    const { result } = renderHook(() =>
      useFormValidation({ code: { pattern: /^[A-Z]{3}$/ } })
    )
    expect(result.current.validateField('code', 'ABC')).toBe(null)
    expect(result.current.validateField('code', 'ab')).toBe('Invalid format')
    expect(result.current.validateField('code', 'ABCD')).toBe('Invalid format')
  })

  it('validates custom validator', () => {
    const { result } = renderHook(() =>
      useFormValidation({
        age: {
          custom: (v) => {
            const n = parseInt(v, 10)
            if (isNaN(n) || n < 18) return 'Must be 18 or older'
            return null
          },
        },
      })
    )
    expect(result.current.validateField('age', '17')).toBe('Must be 18 or older')
    expect(result.current.validateField('age', '18')).toBe(null)
    expect(result.current.validateField('age', '25')).toBe(null)
  })

  it('validateForm sets errors and returns false when invalid', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true }, email: { email: true } })
    )
    let valid = true
    act(() => {
      valid = result.current.validateForm({ name: '', email: 'bad' })
    })
    expect(valid).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Please enter a valid email address')
  })

  it('validateForm clears errors and returns true when valid', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true }, email: { email: true } })
    )
    let valid = false
    act(() => {
      valid = result.current.validateForm({ name: 'Jane', email: 'jane@example.com' })
    })
    expect(valid).toBe(true)
    expect(result.current.errors.name).toBe(null)
    expect(result.current.errors.email).toBe(null)
  })

  it('handleBlur marks field as touched', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true } })
    )
    expect(result.current.isFieldTouched('name')).toBe(false)
    act(() => {
      result.current.handleBlur('name')
    })
    expect(result.current.isFieldTouched('name')).toBe(true)
  })

  it('reset clears errors and touched', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true } })
    )
    act(() => {
      result.current.validateForm({ name: '' })
      result.current.handleBlur('name')
    })
    expect(result.current.hasError('name')).toBe(true)
    act(() => {
      result.current.reset()
    })
    expect(result.current.errors.name).toBeUndefined()
    expect(result.current.isFieldTouched('name')).toBe(false)
  })

  it('getFieldError returns error for field', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: { required: true } })
    )
    act(() => {
      result.current.validateForm({ name: '' })
    })
    expect(result.current.getFieldError('name')).toBe('Name is required')
    expect(result.current.getFieldError('other')).toBe(null)
  })
})
