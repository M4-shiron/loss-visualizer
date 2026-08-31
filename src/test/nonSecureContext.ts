import { vi } from 'vitest'

/**
 * `crypto.randomUUID` はセキュアコンテキスト（HTTPS・localhost）でしか公開されない。
 * 実機のiPhoneからはLAN内のhttp（例: http://192.168.0.5:5173/）で開くため、
 * その環境では `randomUUID` が存在せず、IDを作る時点で例外になる（第11ループの不具合）。
 * 非セキュアコンテキストでも使える `getRandomValues` だけがある状態を再現する。
 *
 * 後片付けは呼び出し側で `vi.unstubAllGlobals()` を行う。
 */
export function stubNonSecureContextCrypto(): void {
  const realCrypto = globalThis.crypto
  vi.stubGlobal('crypto', {
    getRandomValues: (array: Uint8Array<ArrayBuffer>) => realCrypto.getRandomValues(array),
  })
}
