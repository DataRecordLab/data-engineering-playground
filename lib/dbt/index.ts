// ─── Types ────────────────────────────────────────────────────────────────────

export type Materialization = 'table' | 'view';
export type ModelFolder = 'staging' | 'warehouse' | 'mart';
export type ModelStatus = 'pending' | 'running' | 'success' | 'error';
export type TestType = 'not_null' | 'unique' | 'accepted_values';

export interface DbtModel {
  name: string;
  folder: ModelFolder;
  sql: string;
  materialization: Materialization;
  description?: string;
}

export interface DbtSourceTable {
  name: string;
  description?: string;
}

export interface DbtSource {
  name: string;
  tables: DbtSourceTable[];
}

export interface DbtTest {
  model: string;
  column: string;
  type: TestType;
  values?: string[];
}

export interface DbtProject {
  name: string;
  version: string;
  models: DbtModel[];
  sources: DbtSource[];
  tests: DbtTest[];
  seeds: Record<string, string>;
}

export interface ModelRunResult {
  name: string;
  folder: ModelFolder;
  status: ModelStatus;
  rowCount: number;
  durationMs: number;
  compiledSql: string;
  error?: string;
}

export interface TestResult {
  model: string;
  column: string;
  testType: string;
  status: 'pass' | 'fail';
  failCount: number;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseRefs(sql: string): string[] {
  const refs: string[] = [];
  const re = /\{\{\s*ref\(\s*['"](\w+)['"]\s*\)\s*\}\}/g;
  let m;
  while ((m = re.exec(sql)) !== null) refs.push(m[1]);
  return [...new Set(refs)];
}

export function parseSources(sql: string): Array<{ source: string; table: string }> {
  const list: Array<{ source: string; table: string }> = [];
  const re = /\{\{\s*source\(\s*['"](\w+)['"]\s*,\s*['"](\w+)['"]\s*\)\s*\}\}/g;
  let m;
  while ((m = re.exec(sql)) !== null) list.push({ source: m[1], table: m[2] });
  return list;
}

export function parseMaterialization(sql: string): Materialization {
  const m = sql.match(/\{\{\s*config\s*\([^)]*materialized\s*=\s*['"](\w+)['"]/);
  if (m?.[1] === 'view') return 'view';
  return 'table';
}

// Replace {{ ref() }} and {{ source() }} with actual table names
export function compileSql(sql: string): string {
  let out = sql;
  // Remove {{ config(...) }} blocks
  out = out.replace(/\{\{[\s\S]*?config\([\s\S]*?\)\s*\}\}/g, '').trim();
  // {{ ref('model') }} → model
  out = out.replace(/\{\{\s*ref\(\s*['"](\w+)['"]\s*\)\s*\}\}/g, '$1');
  // {{ source('src', 'table') }} → table
  out = out.replace(/\{\{\s*source\(\s*['"](\w+)['"]\s*,\s*['"](\w+)['"]\s*\)\s*\}\}/g, '$2');
  return out.trim();
}

// ─── DAG ─────────────────────────────────────────────────────────────────────

export function getExecutionOrder(models: DbtModel[]): DbtModel[] {
  const modelMap = new Map(models.map(m => [m.name, m]));
  const visited = new Set<string>();
  const result: DbtModel[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const model = modelMap.get(name);
    if (!model) return;
    for (const ref of parseRefs(model.sql)) visit(ref);
    result.push(model);
  }

  for (const model of models) visit(model.name);
  return result;
}

// Build adjacency list for DAG visualization
export function buildDagEdges(models: DbtModel[]): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  for (const model of models) {
    for (const ref of parseRefs(model.sql)) {
      edges.push({ from: ref, to: model.name });
    }
    for (const src of parseSources(model.sql)) {
      edges.push({ from: src.table, to: model.name });
    }
  }
  return edges;
}
