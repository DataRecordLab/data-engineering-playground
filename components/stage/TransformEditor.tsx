'use client';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-[#1e1e1e] rounded-lg text-slate-500 text-sm"
      style={{ height: '100%' }}
    >
      エディタを読み込み中...
    </div>
  ),
});

interface Props {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export function TransformEditor({ value, onChange, height = 300 }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700" style={{ height }}>
      <MonacoEditor
        language="sql"
        theme="vs-dark"
        value={value}
        onChange={val => onChange(val ?? '')}
        options={{
          fontSize: 13,
          fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: false,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          scrollbar: { verticalScrollbarSize: 6 },
        }}
      />
    </div>
  );
}
