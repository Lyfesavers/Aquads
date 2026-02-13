import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CROSSWORD_WORDS } from '../data/crosswordWords';

const WORD_LIST_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';

const DIFFICULTY = {
  medium: { gridSize: 9, wordCount: 12, minLen: 3, maxLen: 6 },
  hard: { gridSize: 11, wordCount: 18, minLen: 4, maxLen: 7 },
  expert: { gridSize: 13, wordCount: 24, minLen: 4, maxLen: 8 },
};

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
  return shuffle(filtered, seed).slice(0, 200);
}

function buildCrossword(words, gridSize) {
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
  const placed = [];
  const dirs = [{ dr: 0, dc: 1 }, { dr: 1, dc: 0 }];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toUpperCase();
    let placed_ = false;

    if (placed.length === 0) {
      const r = Math.floor(gridSize / 2);
      const c = Math.max(0, Math.floor((gridSize - word.length) / 2));
      for (let k = 0; k < word.length; k++) grid[r][c + k] = word[k];
      placed.push({ word, r, c, dir: 0 });
      placed_ = true;
    } else {
      const crossList = shuffle(placed.map((_, i) => i), i);
      for (const pi of crossList) {
        if (placed_) break;
        const cross = placed[pi];
        const crossWord = cross.word;
        const crossDr = dirs[cross.dir].dr;
        const crossDc = dirs[cross.dir].dc;
        for (let ci = 0; ci < crossWord.length && !placed_; ci++) {
          const letter = crossWord[ci];
          const idx = word.indexOf(letter);
          if (idx === -1) continue;
          const dir = 1 - cross.dir;
          const { dr, dc } = dirs[dir];
          const r = cross.r + ci * crossDr - idx * dr;
          const c = cross.c + ci * crossDc - idx * dc;
          if (r < 0 || c < 0 || r + word.length * dr > gridSize || c + word.length * dc > gridSize) continue;
          let ok = true;
          for (let k = 0; k < word.length; k++) {
            const nr = r + k * dr, nc = c + k * dc;
            const cur = grid[nr][nc];
            if (cur && cur !== word[k]) { ok = false; break; }
          }
          if (ok) {
            for (let k = 0; k < word.length; k++) grid[r + k * dr][c + k * dc] = word[k];
            placed.push({ word, r, c, dir });
            placed_ = true;
          }
        }
      }
    }
  }

  return { grid, placed };
}

function CrosswordPuzzle({ currentUser }) {
  const [searchParams] = useSearchParams();
  const urlSeed = parseInt(searchParams.get('seed'), 10);
  const urlDiff = searchParams.get('diff');

  const [words, setWords] = useState(CROSSWORD_WORDS);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState(() => (urlDiff && DIFFICULTY[urlDiff] ? urlDiff : 'medium'));
  const [puzzle, setPuzzle] = useState(null);
  const [userGrid, setUserGrid] = useState([]);
  const [selected, setSelected] = useState(null);
  const [streak, setStreak] = useState(0);
  const [hints, setHints] = useState(3);
  const [solved, setSolved] = useState(new Set());
  const solvedRef = useRef(new Set());
  const [seed, setSeed] = useState(() => (!isNaN(urlSeed) ? urlSeed : Math.floor(Math.random() * 1e9)));
  const [showClues, setShowClues] = useState(true);

  useEffect(() => {
    if (!isNaN(urlSeed)) setSeed(s => (s !== urlSeed ? urlSeed : s));
    if (urlDiff && DIFFICULTY[urlDiff]) setDifficulty(d => (d !== urlDiff ? urlDiff : d));
  }, [urlSeed, urlDiff]);

  useEffect(() => { solvedRef.current = solved; }, [solved]);

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
    const { grid, placed } = buildCrossword(pool, diff.gridSize);
    setPuzzle({ grid, placed });
    setUserGrid(grid.map(row => row.map(c => c ? '' : null)));
    setSolved(new Set());
    setStreak(0);
    setHints(3);
    setSelected(null);
  }, [words, difficulty, seed]);

  useEffect(() => {
    if (!loading && words.length > 0) generatePuzzle();
  }, [loading, difficulty, seed]);

  const handleCellChange = (r, c, key) => {
    if (!puzzle || !puzzle.grid[r][c]) return;
    const letter = key.toUpperCase();
    if (letter.length === 1 && /[A-Z]/.test(letter)) {
      setUserGrid(prev => {
        const next = prev.map(row => [...row]);
        next[r][c] = letter;
        return next;
      });
    } else if (key === 'Backspace') {
      setUserGrid(prev => {
        const next = prev.map(row => [...row]);
        next[r][c] = '';
        return next;
      });
    }
  };

  useEffect(() => {
    if (!puzzle || !userGrid.length) return;
    const { placed } = puzzle;
    const toAdd = [];
    placed.forEach(({ word, r: pr, c: pc, dir }) => {
      if (solvedRef.current.has(word)) return;
      const dr = dir === 0 ? 0 : 1, dc = dir === 0 ? 1 : 0;
      let match = true;
      for (let k = 0; k < word.length; k++) {
        const nr = pr + k * dr, nc = pc + k * dc;
        if ((userGrid[nr]?.[nc] || '').toUpperCase() !== word[k]) { match = false; break; }
      }
      if (match) toAdd.push(word);
    });
    if (toAdd.length > 0) {
      setSolved(prev => {
        const next = new Set(prev);
        toAdd.forEach(w => next.add(w));
        return next;
      });
      setStreak(s => s + toAdd.length);
    }
  }, [userGrid, puzzle]);

  const revealLetter = () => {
    if (hints <= 0 || !puzzle) return;
    const empty = [];
    puzzle.placed.forEach(({ word, r, c, dir }) => {
      const dr = dir === 0 ? 0 : 1, dc = dir === 0 ? 1 : 0;
      for (let k = 0; k < word.length; k++) {
        const nr = r + k * dr, nc = c + k * dc;
        if (!userGrid[nr] || !userGrid[nr][nc]) empty.push({ r: nr, c: nc, letter: word[k] });
      }
    });
    if (empty.length === 0) return;
    const { r, c, letter } = empty[Math.floor(Math.random() * empty.length)];
    setUserGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = letter;
      return next;
    });
    setHints(h => h - 1);
  };

  const newPuzzle = () => {
    setSeed(Math.floor(Math.random() * 1e9));
  };

  const shareUrl = `${window.location.origin}/games/crossword?seed=${seed}&diff=${difficulty}`;

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
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Word Grid</h1>
          <div className="flex items-center gap-4">
            <span className="text-amber-500/80">🔥 {streak}</span>
            <span className="text-cyan-400/80">💡 {hints}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
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
          <div className="flex gap-2">
            <button onClick={newPuzzle} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium">New Puzzle</button>
            <button onClick={revealLetter} disabled={hints <= 0} className={`px-4 py-2 rounded-lg font-medium ${hints > 0 ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>Reveal Letter</button>
            <button onClick={() => setShowClues(c => !c)} className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-amber-200">{showClues ? 'Hide' : 'Show'} Clues</button>
          </div>
        </div>

        {puzzle && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-shrink-0">
              <div
                className="inline-grid gap-0 p-2 rounded-xl bg-slate-800/80 border border-amber-500/30 shadow-xl"
                style={{ gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(32px, 1fr))`, gridTemplateRows: `repeat(${puzzle.grid.length}, minmax(32px, 1fr))` }}
              >
                {puzzle.grid.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-slate-600/50 rounded transition ${cell ? 'bg-slate-700/80 hover:bg-slate-600/80 cursor-pointer' : 'bg-slate-900/60'}`}
                      onClick={() => cell && setSelected({ r, c })}
                    >
                      {cell ? (
                        <input
                          type="text"
                          maxLength={1}
                          value={userGrid[r]?.[c] || ''}
                          onChange={e => handleCellChange(r, c, e.target.value.slice(-1))}
                          onKeyDown={e => {
                            if (e.key === 'Backspace') {
                              setUserGrid(prev => { const n = prev.map(row => [...row]); n[r][c] = ''; return n; });
                            } else if (e.key.length === 1) handleCellChange(r, c, e.key);
                          }}
                          className={`w-full h-full text-center bg-transparent border-none text-amber-100 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 rounded ${selected?.r === r && selected?.c === c ? 'ring-2 ring-amber-500' : ''}`}
                          autoFocus={selected?.r === r && selected?.c === c}
                        />
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            {showClues && (
              <div className="flex-1 space-y-4">
                <h3 className="text-lg font-semibold text-amber-400">Clues</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {puzzle.placed.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 ${solved.has(p.word) ? 'text-emerald-400 line-through' : 'text-amber-200/90'}`}>
                      <span className="text-amber-500/70 font-mono text-sm">{i + 1}.</span>
                      <span>{p.word.length} letters</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-amber-500/20">
                  <p className="text-sm text-amber-300/80">Fill in the grid by finding words that intersect. Use Reveal Letter for a hint. Share this puzzle with friends:</p>
                  <div className="flex gap-2 mt-2 items-center">
                    <code className="flex-1 text-xs text-cyan-400 break-all">{shareUrl}</code>
                    <button onClick={() => navigator.clipboard?.writeText(shareUrl)} className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs whitespace-nowrap">Copy</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-sm text-slate-400 text-center">Words from {words.length.toLocaleString()}+ word bank • Procedurally generated • No two puzzles alike</p>
      </main>
    </div>
  );
}

export default CrosswordPuzzle;
