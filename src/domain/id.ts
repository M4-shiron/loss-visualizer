/**
 * `crypto.randomUUID` はセキュアコンテキスト（HTTPS・localhost）でのみ公開される。
 * 実機確認のためにLAN内のhttp（例: http://192.168.0.5:5173/）で開いた場合は
 * 存在せず、そのまま呼ぶと例外になってIDを必要とする操作がすべて失敗する。
 * セキュアコンテキストを問わず使える `getRandomValues` で同じ形式を組み立てる。
 */
function uuidV4FromRandomValues(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // RFC 4122のバージョン(4)とバリアントのビットを立てる
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return uuidV4FromRandomValues()
}
