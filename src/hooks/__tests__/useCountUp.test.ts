import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubPrefersReducedMotion } from '../../test/reducedMotion'
import { useCountUp } from '../useCountUp'

describe('useCountUp', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('0から目標値へ、時間をかけてカウントアップする', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCountUp(1000, 800))

    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(1000)

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe(1000)
  })

  it('視差効果を減らす設定が有効なときは、アニメーションせず即座に目標値を返す', () => {
    stubPrefersReducedMotion(true)
    const { result } = renderHook(() => useCountUp(1000, 800))
    expect(result.current).toBe(1000)
  })

  it('視差効果を減らす設定が無効なときは、通常どおりアニメーションする', () => {
    stubPrefersReducedMotion(false)
    vi.useFakeTimers()
    const { result } = renderHook(() => useCountUp(500, 800))
    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(result.current).toBe(500)
  })
})
