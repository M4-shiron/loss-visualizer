import { describe, expect, it } from 'vitest'
import { formatLaborTime, laborMinutesForAmount } from '../laborTime'

describe('laborMinutesForAmount', () => {
  it('金額 ÷ 時給 × 60分を、5分単位に丸めて返す', () => {
    // 3,000円 ÷ 1,200円/時 × 60 = 150分 = 2時間30分（ちょうど5分単位）
    expect(laborMinutesForAmount(3000, 1200)).toBe(150)
  })

  it('5分単位の途中の値は、近い方へ丸める', () => {
    // 1,000円 ÷ 1,200円/時 × 60 = 50分（ちょうど）
    expect(laborMinutesForAmount(1000, 1200)).toBe(50)
    // 900円 ÷ 1,200円/時 × 60 = 45分（ちょうど）
    expect(laborMinutesForAmount(900, 1200)).toBe(45)
    // 950円 ÷ 1,200円/時 × 60 = 47.5分 → 50分（切り上げ側）
    expect(laborMinutesForAmount(950, 1200)).toBe(50)
  })

  it('時給が未登録（undefined）なら常にundefined', () => {
    expect(laborMinutesForAmount(3000, undefined)).toBeUndefined()
  })

  it('時給が0以下ならundefined', () => {
    expect(laborMinutesForAmount(3000, 0)).toBeUndefined()
    expect(laborMinutesForAmount(3000, -100)).toBeUndefined()
  })

  it('金額が0以下ならundefined', () => {
    expect(laborMinutesForAmount(0, 1200)).toBeUndefined()
  })

  it('丸めると0分になる小さな金額では0を返す（表示側で「5分未満」に変換する）', () => {
    // 10円 ÷ 1,200円/時 × 60 = 0.5分 → 0分
    expect(laborMinutesForAmount(10, 1200)).toBe(0)
  })
})

describe('formatLaborTime', () => {
  it('時間と分の両方があるとき「約◯時間◯分」', () => {
    expect(formatLaborTime(150)).toBe('約2時間30分')
  })

  it('分が0のとき「約◯時間」（0分を出さない）', () => {
    expect(formatLaborTime(120)).toBe('約2時間')
  })

  it('1時間未満のとき「約◯分」', () => {
    expect(formatLaborTime(45)).toBe('約45分')
  })

  it('0分以下は「5分未満」', () => {
    expect(formatLaborTime(0)).toBe('5分未満')
  })
})
