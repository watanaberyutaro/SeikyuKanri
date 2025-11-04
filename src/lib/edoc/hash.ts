// ファイルハッシュ計算ユーティリティ

/**
 * FileオブジェクトからSHA-256ハッシュを計算
 * @param file ファイルオブジェクト
 * @returns SHA-256ハッシュ（16進数文字列）
 */
export async function calculateFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * バッファからSHA-256ハッシュを計算（サーバー側用）
 * @param buffer バッファ
 * @returns SHA-256ハッシュ（16進数文字列）
 */
export async function calculateBufferSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 文字列からSHA-256ハッシュを計算
 * @param text 文字列
 * @returns SHA-256ハッシュ（16進数文字列）
 */
export async function calculateTextSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * ハッシュの検証
 * @param file ファイル
 * @param expectedHash 期待されるハッシュ
 * @returns 一致する場合true
 */
export async function verifyFileHash(file: File, expectedHash: string): Promise<boolean> {
  const actualHash = await calculateFileSHA256(file)
  return actualHash === expectedHash
}
