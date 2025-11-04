-- 勘定科目テンプレートテーブル（全テナント共通のマスタ）
CREATE TABLE IF NOT EXISTS account_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_code TEXT,
  tax_category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 税率テンプレートテーブル（全テナント共通のマスタ）
CREATE TABLE IF NOT EXISTS tax_rate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  category TEXT NOT NULL,
  applies_from DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_account_templates_type ON account_templates(type);
CREATE INDEX IF NOT EXISTS idx_account_templates_code ON account_templates(code);
CREATE INDEX IF NOT EXISTS idx_tax_rate_templates_category ON tax_rate_templates(category);

-- コメント
COMMENT ON TABLE account_templates IS '勘定科目テンプレート（全テナント共通のマスタデータ）';
COMMENT ON TABLE tax_rate_templates IS '税率テンプレート（全テナント共通のマスタデータ）';
