import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubNonSecureContextCrypto } from '../../test/nonSecureContext'
import { generateId } from '../id'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('generateId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('通常の環境ではUUID形式のIDを返す', () => {
    expect(generateId()).toMatch(UUID_PATTERN)
  })

  it('randomUUIDが使えない環境（http接続など）でもUUID形式のIDを返す', () => {
    stubNonSecureContextCrypto()
    expect(generateId()).toMatch(UUID_PATTERN)
  })

  it('randomUUIDが使えない環境でも重複しないIDを返す', () => {
    stubNonSecureContextCrypto()
    const ids = new Set(Array.from({ length: 500 }, () => generateId()))
    expect(ids.size).toBe(500)
  })
})
