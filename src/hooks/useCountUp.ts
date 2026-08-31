import { useEffect, useState } from 'react'

const STEPS = 16

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * 数値を0から目標値へ、短いイーズアウトでカウントアップする（PRODUCT_SPEC.md §15）。
 *
 * 「毎回派手にはせず」の方針に沿って、演出は短く控えめにする（既定700ms）。
 * OSの「視差効果を減らす」設定が有効なときは、アニメーションせず即座に目標値を返す。
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    // 初期状態（useStateの初期化関数）で既に判定済みのため、ここでは何もしない。
    if (prefersReducedMotion()) return

    let step = 0
    const stepDuration = durationMs / STEPS
    const id = setInterval(() => {
      step += 1
      const progress = Math.min(1, step / STEPS)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (step >= STEPS) clearInterval(id)
    }, stepDuration)

    return () => clearInterval(id)
  }, [target, durationMs])

  return value
}
