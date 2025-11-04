// 電子取引データ・監査ログの型定義

// エンティティタイプ
export type EntityType = 'invoice' | 'quote' | 'bill' | 'receipt' | 'expense' | 'contract'

// アクションタイプ
export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'download' | 'export' | 'view'

// 電子文書
export interface EDocument {
  id: string
  tenant_id: string
  user_id: string

  // エンティティ紐付け
  entity_type: EntityType
  entity_id: string

  // ファイル情報
  file_name: string
  file_size: number
  mime_type: string
  storage_url: string

  // 改ざん防止
  sha256: string
  version: number
  is_latest: boolean
  replaced_by?: string

  // 検索要件
  issued_at: string
  counterparty?: string
  total_amount?: number
  document_number?: string
  searchable?: Record<string, any>

  // タイムスタンプ（オプション）
  timestamp_token?: string
  timestamp_url?: string
  timestamped_at?: string

  // 監査
  created_at: string
  created_by?: string
}

// 電子文書登録入力
export interface RegisterEDocumentInput {
  entity_type: EntityType
  entity_id: string

  file_name: string
  file_size: number
  mime_type: string
  storage_url: string

  sha256: string

  issued_at: string
  counterparty?: string
  total_amount?: number
  document_number?: string
  searchable?: Record<string, any>
}

// 電子文書検索クエリ
export interface SearchEDocumentsQuery {
  entity_type?: EntityType
  from_date?: string
  to_date?: string
  counterparty?: string
  document_number?: string
  min_amount?: number
  max_amount?: number
  search_text?: string // searchable JSONB内を検索
  limit?: number
}

// 監査ログ
export interface AuditLog {
  id: string
  tenant_id: string

  // アクター情報
  actor_user_id?: string
  actor_name?: string
  actor_email?: string

  // アクション
  action: AuditAction
  entity_type: string
  entity_id?: string
  entity_label?: string

  // 変更内容
  before?: Record<string, any>
  after?: Record<string, any>
  changes?: Record<string, any>

  // コンテキスト
  ip?: string
  user_agent?: string
  request_id?: string

  // タイムスタンプ
  created_at: string
}

// 監査ログ作成入力
export interface CreateAuditLogInput {
  action: AuditAction
  entity_type: string
  entity_id?: string
  entity_label?: string

  before?: Record<string, any>
  after?: Record<string, any>
  changes?: Record<string, any>

  ip?: string
  user_agent?: string
  request_id?: string
}

// 監査ログ検索クエリ
export interface SearchAuditLogsQuery {
  from_date?: string
  to_date?: string
  actor_user_id?: string
  action?: AuditAction
  entity_type?: string
  entity_id?: string
  limit?: number
}

// ファイルハッシュ計算結果
export interface FileHashResult {
  sha256: string
  size: number
  mimeType: string
}
