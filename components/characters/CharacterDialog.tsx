'use client';

import { useState, useEffect, useCallback } from 'react';
import { MioIllustration, type MioExpression } from './MioIllustration';

export interface DialogLine {
  expression: MioExpression;
  name:       string;
  role:       string;
  text:       string;
  side?:      'left' | 'right';
}

interface Props {
  lines:      DialogLine[];
  onComplete: () => void;
}

const TYPEWRITER_SPEED = 28;

export function CharacterDialog({ lines, onComplete }: Props) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping]   = useState(true);

  const currentLine = lines[lineIndex];
  const side = currentLine.side ?? 'left';

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 cursor-pointer"
      onClick={advance}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="relative w-full max-w-3xl animate-dialog-in">
        <div className="relative bg-[#0f1220]/95 backdrop-blur-md border border-[#343856] rounded-2xl p-5 flex items-end gap-4 shadow-2xl shadow-black/60">
          {/* Corner accents */}
          <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-indigo-500/50" />
          <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-indigo-500/50" />

          {/* Left character */}
          {side === 'left' && (
            <div className="flex-shrink-0 self-end animate-idle-bob">
              <MioIllustration expression={currentLine.expression} size={88} />
            </div>
          )}

          {/* Text area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-white font-bold text-sm tracking-wide">{currentLine.name}</span>
              <span className="text-[#555b7a] text-xs border border-[#272b42] px-1.5 py-0.5 rounded">
                {currentLine.role}
              </span>
            </div>

            <p className="text-[#e8eaf6] text-sm leading-relaxed font-mono min-h-[3.5rem]">
              {displayed}
              {isTyping && <span className="inline-block w-[1ch] animate-cursor">▋</span>}
            </p>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-[#555b7a]">{lineIndex + 1} / {lines.length}</span>
              {!isTyping && (
                <span className="text-xs text-[#1CB0F6] animate-pulse flex items-center gap-1">
                  {lineIndex < lines.length - 1 ? '次へ' : '続ける'}
                  <span className="text-base leading-none">▶</span>
                </span>
              )}
            </div>
          </div>

          {/* Right character (flipped) */}
          {side === 'right' && (
            <div className="flex-shrink-0 self-end animate-idle-bob" style={{ transform: 'scaleX(-1)' }}>
              <MioIllustration expression={currentLine.expression} size={88} />
            </div>
          )}
        </div>

        <p className="text-center text-[#555b7a] text-xs mt-2">Click / Space でスキップ</p>
      </div>
    </div>
  );
}
