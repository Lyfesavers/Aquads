import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaQuoteLeft,
  FaPlus,
  FaPencilAlt,
  FaTrash,
  FaTimes,
  FaCheck,
  FaSearch,
  FaTelegram,
  FaDiscord,
  FaCheckCircle,
  FaExclamationCircle,
} from 'react-icons/fa';
import { API_URL } from '../services/api';

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(token),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
  }
  return data;
}

function attributionLabel(item) {
  if (item.user?.username) return `@${item.user.username}`;
  if (item.displayName) return item.displayName;
  if (item.project?.title) return item.project.title;
  return 'Aquads community';
}

const emptyForm = {
  quote: '',
  role: '',
  displayName: '',
  published: true,
  sortOrder: 0,
  user: null,
  project: null,
};

const ACCENTS = [
  { bar: '#22d3ee', soft: 'rgba(34,211,238,0.18)', glow: 'rgba(34,211,238,0.35)' },
  { bar: '#818cf8', soft: 'rgba(129,140,248,0.18)', glow: 'rgba(129,140,248,0.35)' },
  { bar: '#34d399', soft: 'rgba(52,211,153,0.16)', glow: 'rgba(52,211,153,0.3)' },
  { bar: '#38bdf8', soft: 'rgba(56,189,248,0.18)', glow: 'rgba(56,189,248,0.32)' },
];

function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;
  const ok = toast.type !== 'error';
  return (
    <div
      role="status"
      className={`bot-t-toast fixed z-[60] left-1/2 -translate-x-1/2 bottom-6 sm:bottom-8 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md max-w-[min(92vw,420px)] ${
        ok
          ? 'bg-emerald-950/90 border-emerald-400/40 text-emerald-50'
          : 'bg-red-950/90 border-red-400/40 text-red-50'
      }`}
    >
      {ok ? <FaCheckCircle className="text-emerald-400 text-lg shrink-0" /> : <FaExclamationCircle className="text-red-400 text-lg shrink-0" />}
      <span className="text-sm font-medium leading-snug">{toast.message}</span>
      <button type="button" onClick={onDone} className="ml-1 text-white/50 hover:text-white shrink-0" aria-label="Dismiss">
        <FaTimes className="text-xs" />
      </button>
    </div>
  );
}

function TestimonialCard({ item, isAdmin, onEdit, onDelete, accent }) {
  const name = attributionLabel(item);
  const role = item.role || null;
  const metaBits = [item.project?.title, role].filter(Boolean);

  return (
    <article
      className="bot-t-slip group relative shrink-0 w-[280px] sm:w-[300px]"
      style={{
        '--bot-t-bar': accent.bar,
        '--bot-t-soft': accent.soft,
        '--bot-t-glow': accent.glow,
      }}
    >
      <div className="bot-t-slip-notch" aria-hidden />
      <div className="bot-t-slip-bar" aria-hidden />
      <span className="bot-t-slip-mark" aria-hidden>
        “
      </span>

      <div className="relative z-10 flex flex-col h-full p-5 min-h-[200px]">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] font-semibold text-white/50">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent.bar }} />
            Live signal
          </div>
          <div className="flex items-center gap-1.5 text-white/30">
            <FaTelegram className="text-[10px]" />
            <FaDiscord className="text-[10px]" />
          </div>
        </div>

        <p className="relative z-[1] text-[13px] sm:text-sm leading-relaxed text-white/90 italic flex-1">
          {item.quote}
        </p>

        <div className="mt-auto pt-4 flex items-center gap-2.5">
          <div className="relative flex shrink-0">
            {item.project?.logo ? (
              <img
                src={item.project.logo}
                alt=""
                className="w-9 h-9 rounded-[12px] object-cover ring-2 ring-black/40"
                loading="lazy"
              />
            ) : null}
            {item.user?.image ? (
              <img
                src={item.user.image}
                alt=""
                className={`w-9 h-9 rounded-full object-cover ring-2 ring-black/40 ${
                  item.project?.logo ? '-ml-2.5' : ''
                }`}
                loading="lazy"
              />
            ) : !item.project?.logo ? (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black ring-2 ring-black/40"
                style={{ background: accent.bar }}
              >
                {(name.replace(/^@/, '')[0] || 'A').toUpperCase()}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate tracking-tight">{name}</div>
            <div className="text-[11px] text-white/45 truncate">
              {metaBits.length ? metaBits.join(' · ') : 'Using the Aquads bot'}
            </div>
          </div>
          {!item.published && isAdmin ? (
            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Hidden
            </span>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="absolute top-2.5 right-2.5 flex gap-1 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="w-7 h-7 rounded-lg bg-black/35 hover:bg-cyan-500/25 border border-white/15 text-cyan-200 flex items-center justify-center backdrop-blur-sm"
              title="Edit"
              aria-label="Edit testimonial"
            >
              <FaPencilAlt className="text-[10px]" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="w-7 h-7 rounded-lg bg-black/35 hover:bg-red-500/25 border border-white/15 text-red-200 flex items-center justify-center backdrop-blur-sm"
              title="Delete"
              aria-label="Delete testimonial"
            >
              <FaTrash className="text-[10px]" />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Typeahead({ label, placeholder, valueLabel, onClear, results, onSearch, onSelect, searching }) {
  const [q, setQ] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) {
      onSearch('');
      return undefined;
    }
    timer.current = setTimeout(() => onSearch(q.trim()), 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, onSearch]);

  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {valueLabel ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-100">
          <span className="truncate">{valueLabel}</span>
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-white shrink-0" aria-label="Clear">
            <FaTimes />
          </button>
        </div>
      ) : (
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          {searching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">…</span>
          ) : null}
          {results.length > 0 ? (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl bg-[#121826] border border-white/10 shadow-xl">
              {results.map((r) => (
                <li key={r._id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 text-slate-200"
                    onClick={() => {
                      onSelect(r);
                      setQ('');
                      onSearch('');
                    }}
                  >
                    {r.image || r.logo ? (
                      <img src={r.image || r.logo} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-slate-700" />
                    )}
                    <span className="truncate">
                      {r.username ? `@${r.username}` : r.title}
                      {r.owner ? <span className="text-slate-500"> · {r.owner}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TestimonialForm({ token, initial, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          quote: initial.quote || '',
          role: initial.role || '',
          displayName: initial.displayName || '',
          published: initial.published !== false,
          sortOrder: initial.sortOrder || 0,
          user: initial.user || null,
          project: initial.project || null,
        }
      : { ...emptyForm }
  );
  const [userResults, setUserResults] = useState([]);
  const [projectResults, setProjectResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchingProjects, setSearchingProjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const searchUsers = useCallback(
    async (q) => {
      if (!q) {
        setUserResults([]);
        return;
      }
      setSearchingUsers(true);
      try {
        const data = await api(`/bot-testimonials/lookup/users?q=${encodeURIComponent(q)}`, { token });
        setUserResults(Array.isArray(data) ? data : []);
      } catch (_) {
        setUserResults([]);
      } finally {
        setSearchingUsers(false);
      }
    },
    [token]
  );

  const searchProjects = useCallback(
    async (q) => {
      if (!q) {
        setProjectResults([]);
        return;
      }
      setSearchingProjects(true);
      try {
        const data = await api(`/bot-testimonials/lookup/projects?q=${encodeURIComponent(q)}`, { token });
        setProjectResults(Array.isArray(data) ? data : []);
      } catch (_) {
        setProjectResults([]);
      } finally {
        setSearchingProjects(false);
      }
    },
    [token]
  );

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        quote: form.quote.trim(),
        role: form.role.trim() || null,
        displayName: form.displayName.trim() || null,
        published: form.published,
        sortOrder: Number(form.sortOrder) || 0,
        userId: form.user?._id || null,
        adId: form.project?._id || null,
        clearUser: !form.user,
        clearProject: !form.project,
      };
      let saved;
      let action;
      if (initial?._id) {
        saved = await api(`/bot-testimonials/${initial._id}`, { token, method: 'PUT', body });
        action = 'updated';
      } else {
        saved = await api('/bot-testimonials', { token, method: 'POST', body });
        action = 'created';
      }
      onSaved(saved, action);
      onClose();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <form
        onSubmit={save}
        className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0e1420] shadow-2xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{initial ? 'Edit testimonial' : 'Add testimonial'}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-2" aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Quote</label>
            <textarea
              required
              maxLength={500}
              rows={4}
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              placeholder="What they said about the raid bot…"
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 resize-y"
            />
            <div className="text-[10px] text-slate-500 mt-1 text-right">{form.quote.length}/500</div>
          </div>

          <Typeahead
            label="User account (optional)"
            placeholder="Search username…"
            valueLabel={form.user ? `@${form.user.username}` : null}
            onClear={() => setForm((f) => ({ ...f, user: null }))}
            results={userResults}
            onSearch={searchUsers}
            onSelect={(u) => setForm((f) => ({ ...f, user: u }))}
            searching={searchingUsers}
          />

          <Typeahead
            label="Project / bubble (optional)"
            placeholder="Search project title or id…"
            valueLabel={form.project ? form.project.title : null}
            onClear={() => setForm((f) => ({ ...f, project: null }))}
            results={projectResults}
            onSearch={searchProjects}
            onSelect={(p) => setForm((f) => ({ ...f, project: p }))}
            searching={searchingProjects}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Display name (if no user)</label>
              <input
                type="text"
                maxLength={80}
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Role label</label>
              <input
                type="text"
                maxLength={80}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Project owner"
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500/40"
              />
              Published on page
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              Sort
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="w-16 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-sm text-white"
              />
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-300 border border-white/10 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
            >
              <FaCheck />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function BotTestimonialsSection({ currentUser }) {
  const isAdmin = Boolean(currentUser?.isAdmin);
  const token = currentUser?.token || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const load = useCallback(async () => {
    setError('');
    try {
      const path = isAdmin && token ? '/bot-testimonials/admin' : '/bot-testimonials';
      const data = await api(path, { token: isAdmin ? token : undefined });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (isAdmin) return items;
    return items.filter((i) => i.published);
  }, [items, isAdmin]);

  // Duplicate for seamless marquee when there are enough cards
  const marqueeItems = useMemo(() => {
    if (visible.length === 0) return [];
    // Need enough width to loop cleanly — repeat until we have at least 6
    let loop = [...visible];
    while (loop.length < 6) loop = loop.concat(visible);
    return loop.concat(loop);
  }, [visible]);

  const scrollSeconds = Math.max(28, marqueeItems.length * 4);
  const handleSaved = (saved, action) => {
    if (!saved?._id) {
      load();
      showToast(action === 'updated' ? 'Testimonial updated' : 'Testimonial created');
      return;
    }
    setItems((prev) => {
      const idx = prev.findIndex((x) => x._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    showToast(
      action === 'updated' ? 'Testimonial updated successfully' : 'Testimonial created successfully'
    );
  };

  const handleDelete = async (item) => {
    if (!token) return;
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await api(`/bot-testimonials/${item._id}`, { token, method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x._id !== item._id));
      showToast('Testimonial deleted');
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  if (!loading && visible.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <section className="relative py-20 sm:py-24 border-t border-white/5 overflow-hidden">
      <style>{`
        @keyframes botTToastIn {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes botTMarquee {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .bot-t-toast { animation: botTToastIn 0.28s ease-out; }
        .bot-t-marquee {
          display: flex;
          width: max-content;
          gap: 1rem;
          animation: botTMarquee var(--bot-t-speed, 40s) linear infinite;
          will-change: transform;
        }
        .bot-t-marquee-wrap:hover .bot-t-marquee {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .bot-t-marquee { animation: none; }
        }
        .bot-t-slip {
          position: relative;
          isolation: isolate;
          border-radius: 1.15rem 1.15rem 1.15rem 0.45rem;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(8,12,20,0.88) 38%, rgba(8,12,20,0.95) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.35) inset,
            0 16px 36px -22px rgba(0,0,0,0.95),
            0 0 28px -14px var(--bot-t-glow);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .bot-t-slip:hover {
          transform: translateY(-4px);
          border-color: color-mix(in srgb, var(--bot-t-bar) 45%, transparent);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.35) inset,
            0 22px 44px -20px rgba(0,0,0,0.95),
            0 0 40px -10px var(--bot-t-glow);
        }
        .bot-t-slip-bar {
          position: absolute;
          left: 0;
          top: 14%;
          bottom: 14%;
          width: 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, var(--bot-t-bar), transparent);
          box-shadow: 0 0 14px var(--bot-t-glow);
        }
        .bot-t-slip-notch {
          position: absolute;
          right: -14px;
          top: 50%;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: #0a0a0f;
          transform: translateY(-50%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .bot-t-slip-mark {
          position: absolute;
          right: 0.85rem;
          bottom: -0.45rem;
          font-size: 5.5rem;
          line-height: 1;
          font-family: Georgia, 'Times New Roman', serif;
          color: var(--bot-t-soft);
          pointer-events: none;
          user-select: none;
          transform: rotate(8deg);
        }
        .bot-t-rail {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          letter-spacing: 0.35em;
        }
        .bot-t-fade-l,
        .bot-t-fade-r {
          pointer-events: none;
          position: absolute;
          top: 0;
          bottom: 0;
          width: 48px;
          z-index: 2;
        }
        .bot-t-fade-l {
          left: 0;
          background: linear-gradient(90deg, #0a0a0f, transparent);
        }
        .bot-t-fade-r {
          right: 0;
          background: linear-gradient(270deg, #0a0a0f, transparent);
        }
        @media (min-width: 640px) {
          .bot-t-fade-l, .bot-t-fade-r { width: 72px; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-10 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(34,211,238,0.45), rgba(129,140,248,0.35), transparent)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 mb-12">
          <div className="hidden lg:flex flex-col items-center gap-4 pt-2">
            <div className="w-px flex-1 min-h-[120px] bg-gradient-to-b from-cyan-400/60 via-indigo-400/30 to-transparent" />
            <span className="bot-t-rail text-[11px] uppercase text-cyan-300/70 font-semibold">
              Voices
            </span>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/5 text-cyan-300 text-xs font-semibold tracking-wide">
                <FaQuoteLeft className="text-[10px]" />
                Community feedback
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] tracking-tight mb-3">
                What users are saying about{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400">
                  our bot
                </span>
              </h2>
              <p className="text-gray-400 text-base md:text-lg max-w-xl">
                Straight from teams running raids on Telegram and Discord with Aquads.
              </p>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
              >
                <FaPlus />
                Add testimonial
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] w-[280px] sm:w-[300px] shrink-0 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cyan-500/25 bg-cyan-500/[0.03] px-6 py-14 text-center text-slate-400">
            No testimonials yet. Add the first one.
          </div>
        ) : (
          <div className="bot-t-marquee-wrap relative -mx-4 sm:mx-0">
            <div className="bot-t-fade-l hidden sm:block" aria-hidden />
            <div className="bot-t-fade-r hidden sm:block" aria-hidden />
            <div className="overflow-hidden px-4 sm:px-0 py-2">
              <div
                className="bot-t-marquee"
                style={{ '--bot-t-speed': `${scrollSeconds}s` }}
              >
                {marqueeItems.map((item, index) => (
                  <TestimonialCard
                    key={`${item._id}-${index}`}
                    item={item}
                    isAdmin={isAdmin}
                    accent={ACCENTS[index % ACCENTS.length]}
                    onEdit={(t) => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error ? <p className="mt-4 text-center text-sm text-red-400">{error}</p> : null}
      </div>

      {formOpen && isAdmin && token ? (
        <TestimonialForm
          token={token}
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      ) : null}

      <Toast toast={toast} onDone={clearToast} />
    </section>
  );
}
