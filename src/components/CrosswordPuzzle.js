import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

import { CROSSWORD_WORDS } from '../data/crosswordWords';

const WORD_LIST_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const DIFFICULTY = {
  medium: { gridSize: 10, wordCount: 10, minLen: 3, maxLen: 6 },
  hard: { gridSize: 12, wordCount: 14, minLen: 4, maxLen: 7 },
  expert: { gridSize: 14, wordCount: 18, minLen: 4, maxLen: 8 },
};

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 0, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
];

function shuffle(arr, seed) {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getWordsForDifficulty(words, difficulty, seed) {
  const { minLen, maxLen } = difficulty;
  const filtered = words.filter(w => w.length >= minLen && w.length <= maxLen && /^[a-z]+$/.test(w));
  return shuffle(filtered, seed).slice(0, 100);
}

function buildWordSearch(words, gridSize, seed) {
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
  const placed = [];
  let rng = seed;

  for (const w of words) {
    const word = w.toUpperCase();
    if (word.length > gridSize) continue;
    const dirs = shuffle([...DIRECTIONS], rng++);
    let placed_ = false;
    for (const { dr, dc } of dirs) {
      if (placed_) break;
      const minR = dr >= 0 ? 0 : word.length - 1;
      const maxR = dr >= 0 ? gridSize - word.length : gridSize - 1;
      const minC = dc >= 0 ? 0 : word.length - 1;
      const maxC = dc >= 0 ? gridSize - word.length : gridSize - 1;
      if (minR > maxR || minC > maxC) continue;
      for (let attempt = 0; attempt < 50 && !placed_; attempt++) {
        const startR = minR + Math.floor(Math.random() * (maxR - minR + 1));
        const startC = minC + Math.floor(Math.random() * (maxC - minC + 1));
        let ok = true;
        for (let k = 0; k < word.length; k++) {
          const nr = startR + k * dr, nc = startC + k * dc;
          if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) { ok = false; break; }
          const cur = grid[nr][nc];
          if (cur && cur !== word[k]) { ok = false; break; }
        }
        if (ok) {
          for (let k = 0; k < word.length; k++) {
            grid[startR + k * dr][startC + k * dc] = word[k];
          }
          placed.push({ word, r: startR, c: startC, dr, dc });
          placed_ = true;
        }
      }
    }
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!grid[r][c]) {
        grid[r][c] = LETTERS[Math.floor(Math.random() * 26)];
      }
    }
  }

  return { grid, placed };
}

function CrosswordPuzzle({ currentUser }) {
  const [words, setWords] = useState(CROSSWORD_WORDS);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [puzzle, setPuzzle] = useState(null);
  const [solved, setSolved] = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [showWordList, setShowWordList] = useState(true);
  const isSelecting = useRef(false);

  useEffect(() => {
    fetch(WORD_LIST_URL)
      .then(r => r.text())
      .then(text => {
        const lines = text.split('\n').map(w => w.trim().toLowerCase());
        const filtered = lines.filter(w => w.length >= 3 && w.length <= 8 && /^[a-z]+$/.test(w));
        if (filtered.length > 5000) setWords(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const generatePuzzle = useCallback(() => {
    const diff = DIFFICULTY[difficulty];
    const pool = getWordsForDifficulty(words, diff, seed);
    const { grid, placed } = buildWordSearch(pool, diff.gridSize, seed);
    setPuzzle({ grid, placed });
    setSolved(new Set());
    setSelected([]);
  }, [words, difficulty, seed]);

  useEffect(() => {
    if (!loading && words.length > 0) generatePuzzle();
  }, [loading, difficulty, seed]);

  const isCellInWord = (r, c, wordInfo) => {
    const { word, r: sr, c: sc, dr, dc } = wordInfo;
    for (let k = 0; k < word.length; k++) {
      if (sr + k * dr === r && sc + k * dc === c) return true;
    }
    return false;
  };

  const isCellSelected = (r, c) => selected.some(([sr, sc]) => sr === r && sc === c);

  const isCellSolved = (r, c) => {
    return puzzle?.placed.some(p => solved.has(p.word) && isCellInWord(r, c, p));
  };

  const getSelectionWord = () => {
    if (selected.length < 2) return null;
    const sorted = [...selected].sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
    const dr = sorted[1][0] - sorted[0][0];
    const dc = sorted[1][1] - sorted[0][1];
    if (dr === 0 && dc === 0) return null;
    const step = dr === 0 ? 1 : Math.abs(dr);
    const stepC = dc === 0 ? 1 : Math.abs(dc);
    if (dc !== 0 && step !== stepC) return null;
    const ndr = dr === 0 ? 0 : dr / step;
    const ndc = dc === 0 ? 0 : dc / step;
    let word = '';
    const [r0, c0] = sorted[0];
    for (let k = 0; k < selected.length; k++) {
      const nr = r0 + k * ndr, nc = c0 + k * ndc;
      if (!selected.some(([r, c]) => r === nr && c === nc)) return null;
      word += puzzle.grid[nr][nc];
    }
    return word;
  };

  const handleCellDown = (r, c) => {
    if (!puzzle || !puzzle.grid[r][c]) return;
    isSelecting.current = true;
    setSelected([[r, c]]);
  };

  const handleCellEnter = (r, c) => {
    if (!isSelecting.current || !puzzle) return;
    setSelected(prev => {
      const last = prev[prev.length - 1];
      if (!last) return [[r, c]];
      const [lr, lc] = last;
      const dr = r - lr, dc = c - lc;
      if (dr === 0 && dc === 0) return prev;
      const sameLine = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
      if (!sameLine) return prev;
      const step = Math.max(Math.abs(dr), Math.abs(dc), 1);
      const ndr = dr === 0 ? 0 : dr / step;
      const ndc = dc === 0 ? 0 : dc / step;
      const [r0, c0] = prev[0];
      const newSel = [];
      const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
      for (let k = 0; k < len; k++) {
        const nr = r0 + k * ndr, nc = c0 + k * ndc;
        if (nr >= 0 && nr < puzzle.grid.length && nc >= 0 && nc < puzzle.grid[0].length) {
          newSel.push([nr, nc]);
        }
      }
      return newSel;
    });
  };

  const handleCellUp = () => {
    if (!isSelecting.current) return;
    isSelecting.current = false;
    const word = getSelectionWord();
    if (word && puzzle.placed.some(p => p.word === word) && !solved.has(word)) {
      setSolved(prev => new Set([...prev, word]));
    }
    setSelected([]);
  };

  useEffect(() => {
    const up = () => handleCellUp();
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [puzzle, solved]);

  const newPuzzle = () => setSeed(Math.floor(Math.random() * 1e9));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950/30 to-slate-900 text-amber-100 flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading word bank...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950/30 to-slate-900 text-amber-100">
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-amber-500/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/games" className="text-amber-400 hover:text-amber-300 font-semibold">← Game Hub</Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Word Search</h1>
          <span className="text-amber-500/80">Found: {solved.size} / {puzzle?.placed?.length || 0}</span>
        </div>
      </nav>

      <main className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col items-center">
        <div className="w-full flex flex-wrap gap-3 mb-4 items-center justify-center">
          <div className="flex gap-2">
            {Object.keys(DIFFICULTY).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition ${difficulty === d ? 'bg-amber-500 text-slate-900' : 'bg-slate-700/50 text-amber-200 hover:bg-slate-600/50'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button onClick={newPuzzle} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">New Puzzle</button>
          <button onClick={() => setShowWordList(w => !w)} className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-amber-200">{showWordList ? 'Hide' : 'Show'} Word List</button>
        </div>

        {puzzle && (
          <div className="w-full flex flex-col items-center gap-8">
            <div
              className="aspect-square p-2 sm:p-3 rounded-xl bg-slate-800/80 border border-amber-500/30 shadow-xl select-none"
              style={{
                width: 'min(92vw, 85vmin, 680px)',
                display: 'grid',
                gridTemplateColumns: `repeat(${puzzle.grid.length}, 1fr)`,
                gridTemplateRows: `repeat(${puzzle.grid.length}, 1fr)`,
                gap: 2,
              }}
            >
              {puzzle.grid.map((row, r) =>
                row.map((cell, c) => {
                  const isSel = isCellSelected(r, c);
                  const isSol = isCellSolved(r, c);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`min-w-0 min-h-0 flex items-center justify-center border rounded transition relative aspect-square text-base sm:text-lg md:text-xl font-bold cursor-pointer touch-none
                        ${isSol ? 'bg-emerald-600/80 text-white' : isSel ? 'bg-amber-500/80 text-slate-900' : 'bg-slate-700/80 hover:bg-slate-600/80 text-amber-100 border-slate-600/50'}`}
                      onMouseDown={() => handleCellDown(r, c)}
                      onMouseEnter={() => handleCellEnter(r, c)}
                      onTouchStart={(e) => { e.preventDefault(); handleCellDown(r, c); }}
                      onTouchMove={(e) => {
                        if (e.touches.length === 0) return;
                        const touch = e.touches[0];
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const elCell = el?.closest('[data-row]');
                        if (elCell?.dataset?.row !== undefined) handleCellEnter(parseInt(elCell.dataset.row, 10), parseInt(elCell.dataset.col, 10));
                      }}
                      data-row={r}
                      data-col={c}
                    >
                      {cell}
                    </div>
                  );
                })
              )}
            </div>

            {showWordList && (
              <div className="w-full max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-amber-400 text-center mb-4">Find these words</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {puzzle.placed.map((p, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${solved.has(p.word) ? 'bg-emerald-600/80 text-white line-through' : 'bg-slate-700/50 text-amber-200'}`}
                    >
                      {p.word}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-amber-300/70 text-center mt-4">Drag or tap across letters to find words. Words can be horizontal, vertical, or diagonal.</p>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-sm text-slate-400 text-center px-2">
          Words from {words.length.toLocaleString()}+ word bank • Procedurally generated • No two puzzles alike
        </p>
      </main>
    </div>
  );
}

export default CrosswordPuzzle;
