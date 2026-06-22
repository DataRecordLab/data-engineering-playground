import { querySQL } from './engine';
import type { ValidationRule } from '@/types';

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  detail: string;
}

export async function runValidation(rules: ValidationRule[]): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const rule of rules) {
    try {
      switch (rule.type) {
        case 'table_exists': {
          const r = await querySQL(
            `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_name = '${rule.table}'`
          );
          const exists = Number(r.rows[0]?.cnt ?? 0) > 0;
          results.push({ rule, passed: exists, detail: exists ? 'テーブルが存在します' : rule.message });
          break;
        }

        case 'row_count': {
          const r = await querySQL(`SELECT COUNT(*) AS cnt FROM ${rule.table}`);
          const actual = Number(r.rows[0]?.cnt ?? 0);
          const passed = actual === Number(rule.expected);
          results.push({
            rule,
            passed,
            detail: passed ? `${actual}行 ✓` : `${rule.message}（実際: ${actual}行）`,
          });
          break;
        }

        case 'column_exists': {
          const r = await querySQL(
            `SELECT COUNT(*) AS cnt FROM information_schema.columns
             WHERE table_name = '${rule.table}' AND column_name = '${rule.column}'`
          );
          const exists = Number(r.rows[0]?.cnt ?? 0) > 0;
          results.push({ rule, passed: exists, detail: exists ? 'カラムが存在します' : rule.message });
          break;
        }

        case 'custom': {
          if (!rule.sql) { results.push({ rule, passed: false, detail: 'SQL未定義' }); break; }
          const r = await querySQL(rule.sql);
          const actual = String(r.rows[0] ? Object.values(r.rows[0])[0] : '');
          const passed = actual === String(rule.expected);
          results.push({
            rule,
            passed,
            detail: passed ? '✓ OK' : rule.message,
          });
          break;
        }

        default:
          results.push({ rule, passed: false, detail: '未対応のバリデーション種別' });
      }
    } catch (e) {
      results.push({ rule, passed: false, detail: `エラー: ${String(e).slice(0, 100)}` });
    }
  }

  return results;
}
