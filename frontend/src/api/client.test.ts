import { describe, it, expect } from 'vitest'
import apiClient from './client'

describe('apiClient', () => {
  const originalEnv = import.meta.env

  it('has baseURL set', () => {
    expect(apiClient.defaults.baseURL).toBeDefined()
    expect(typeof apiClient.defaults.baseURL).toBe('string')
  })

  it('baseURL points to API path', () => {
    expect(apiClient.defaults.baseURL).toMatch(/\/api$|\/api\?|localhost.*3001/)
  })

  it('has JSON content-type header', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
  })

  it('has request interceptors (for auth)', () => {
    expect(apiClient.interceptors.request.handlers).toBeDefined()
    expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0)
  })
})
