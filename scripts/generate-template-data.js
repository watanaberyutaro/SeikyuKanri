/**
 * accounting-template.json から SQL INSERT 文を生成するスクリプト
 * 実行: node generate-template-data.js > 00005_insert_template_data.sql
 */

const fs = require('fs')
const path = require('path')

// JSONファイルを読み込む
const templatePath = path.join(__dirname, '../database/templates/accounting-template.json')
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'))

console.log('-- 勘定科目・税率テンプレートデータ投入SQL')
console.log('-- 自動生成: generate-template-data.js')
console.log('-- 日時:', new Date().toISOString())
console.log('')

// 税率テンプレートのINSERT文を生成
console.log('-- 税率テンプレートデータ')
console.log('INSERT INTO tax_rate_templates (name, rate, category, applies_from, description) VALUES')

const taxRateValues = template.tax_rates.map((tr, index) => {
  const name = tr.name.replace(/'/g, "''")
  const description = tr.description ? tr.description.replace(/'/g, "''") : ''
  const isLast = index === template.tax_rates.length - 1
  return `  ('${name}', ${tr.rate}, '${tr.category}', '${tr.applies_from}', '${description}')${isLast ? ';' : ','}`
})

console.log(taxRateValues.join('\n'))
console.log('')

// 勘定科目テンプレートのINSERT文を生成
console.log('-- 勘定科目テンプレートデータ')
console.log('INSERT INTO account_templates (code, name, type, parent_code, tax_category, sort_order, description) VALUES')

const accountValues = template.accounts.map((acc, index) => {
  const name = acc.name.replace(/'/g, "''")
  const description = acc.description ? acc.description.replace(/'/g, "''") : ''
  const parentCode = acc.parent_code ? `'${acc.parent_code}'` : 'NULL'
  const taxCategory = acc.tax_category ? `'${acc.tax_category}'` : 'NULL'
  const isLast = index === template.accounts.length - 1
  return `  ('${acc.code}', '${name}', '${acc.type}', ${parentCode}, ${taxCategory}, ${acc.sort_order}, '${description}')${isLast ? ';' : ','}`
})

console.log(accountValues.join('\n'))
console.log('')
console.log('-- データ投入完了')
