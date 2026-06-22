'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sprite } from './Sprite';
import { TANAKA } from './sprites/tanaka';
import { TAMURA } from './sprites/tamura';

export interface DialogLine {
  character: 'tanaka' | 'tamura';
  expression: string;
  name: string;
  role: string;
  text: string;
  side?: 'left' | 'right';
}

interface Props {
  lines: DialogLine[];
  onComplete: () => void;
}

const SPRITE_MAP = {
  tanaka: TANAKA,
  tamura: TAMURA,
} as const;

const TYPEWRITER_SPEED = 28; // ms per character

export function CharacterDialog({ lines, onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = lines[lineIndex];
  const sprites = SPRITE_MAP[currentLine.character];
  const grid = sprites?.[currentLine.expression] ?? sprites?.['neutral'] ?? sprites?.[Object.keys(sprites)[0]];

  // Typewriter effect
  useEffect(() => {
    setDisplayed('');
    setIsTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(currentLine.text.slice(0, i));
      if (i >= currentLine.text.length) {
        clearInterval(id);
        setIsTyping(false);
      }
    }, TYPEWRITER_SPEED);
    return () => clearInterval(id);
  }, [lineIndex, currentLine.text]);

  const advance = useCallback(() => {
    if (isTyping) {
      setDisplayed(currentLine.text);
      setIsTyping(false);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(i => i + 1);
    } else {
      onComplete();
    }
  }, [isTyping, lineIndex, lines.length, currentLine.text, onComplete]);

  // Space / Enter to advance
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  const side = currentLine.side ?? 'left';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 cursor-pointer"
      onClick={advance}
    >
      {/* Backdrop blur on bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-3xl animate-dialog-in">
        <div className="relative bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-5 flex items-end gap-4 shadow-2xl shadow-black/60">
          {/* Corner accent */}
          <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-blue-500/50" />
          <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-blue-500/50" />

          {/* Character sprite */}
          {side === 'left' && grid && (
            <div className="flex-shrink-0 self-end animate-idle-bob">
              <Sprite grid={grid} scale={4} />
            </div>
          )}

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-white font-bold text-sm tracking-wide">
                {currentLine.name}
              </span>
              <span className="text-slate-500 text-xs border border-slate-700 px-1.5 py-0.5 rounded">
                {currentLine.role}
              </span>
            </div>

            <p className="text-slate-100 text-sm leading-relaxed font-mono min-h-[3.5rem]">
              {displayed}
              {isTyping && (
                <span className="inline-block w-[1ch] animate-cursor">▋</span>
              )}
            </p>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-600">
                {lineIndex + 1} / {lines.length}
              </span>
              {!isTyping && (
                <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1">
                  {lineIndex < lines.length - 1 ? '次へ' : '続ける'}
                  <span className="text-base leading-none">▶</span>
                </span>
              )}
            </div>
          </div>

          {/* Right-side character */}
          {side === 'right' && grid && (
            <div className="flex-shrink-0 self-end animate-idle-bob scale-x-[-1]">
              <Sprite grid={grid} scale={4} />
            </div>
          )}
        </div>

        {/* Skip hint */}
        <p className="text-center text-slate-700 text-xs mt-2">
          Click / Space でスキップ
        </p>
      </div>
    </div>
  );
}
