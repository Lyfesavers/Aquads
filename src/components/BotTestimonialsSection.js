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

function TestimonialCard({ item, isAdmin, onEdit, onDelete }) {
  const name = attributionLabel(item);
  const role = item.role || (item.project ? 'Project' : null);

  return (
    <article className="bot-t-card group relative flex flex-col h-full">
      <div className="bot-t-card-shine" aria-hidden />
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-400/10 border border-cyan-400/25 text-cyan-300">
            <FaQuoteLeft className="text-lg" />
          </span>
          <div className="flex items-center gap-1.5 opacity-80">
            <FaTelegram className="text-cyan-500/70 text-xs" />
            <FaDiscord className="text-indigo-400/70 text-xs" />
          </div>
        </div>

        <p className="text-[15px] sm:text-base leading-relaxed text-slate-200/95 flex-1 mb-6">
          {item.quote}
        </p>

        <div className="mt-auto pt-5 border-t border-white/[0.06] flex items-center gap-3">
          <div className="relative flex -space-x-2 shrink-0">
            {item.project?.logo ? (
              <img
                src={item.project.logo}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0c1220] bg-slate-800"
                loading="lazy"
              />
            ) : null}
            {item.user?.image ? (
              <img
                src={item.user.image}
                alt=""
                className={`w-10 h-10 rounded-full object-cover ring-2 ring-[#0c1220] bg-slate-800 ${
                  item.project?.logo ? '' : ''
                }`}
                loading="lazy"
              />
            ) : !item.project?.logo ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/40 to-blue-600/40 ring-2 ring-[#0c1220] flex items-center justify-center text-sm font-bold text-white">
                {(name.replace(/^@/, '')[0] || 'A').toUpperCase()}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white truncate">{name}</div>
            <div className="text-xs text-slate-400 truncate">
              {[item.project?.title, role].filter(Boolean).join(' · ') || 'Raid bot user'}
            </div>
          </div>
          {!item.published && isAdmin ? (
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Hidden
            </span>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 flex items-center justify-center"
              title="Edit"
              aria-label="Edit testimonial"
            >
              <FaPencilAlt className="text-xs" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 text-red-300 flex items-center justify-center"
              title="Delete"
              aria-label="Delete testimonial"
            >
              <FaTrash className="text-xs" />
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
      return;
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
      if (initial?._id) {
        await api(`/bot-testimonials/${initial._id}`, { token, method: 'PUT', body });
      } else {
        await api('/bot-testimonials', { token, method: 'POST', body });
      }
      onSaved();
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

  const handleDelete = async (item) => {
    if (!token) return;
    if (!window.confirm('Delete this testimonial?')) return;
    try {
      await api(`/bot-testimonials/${item._id}`, { token, method: 'DELETE' });
      await load();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  if (!loading && visible.length === 0 && !isAdmin) {
    return null;
  }

  return (
    <section className="relative py-20 border-t border-gray-800/50">
      <style>{`
        .bot-t-card {
          border-radius: 1.25rem;
          background:
            linear-gradient(165deg, rgba(34,211,238,0.08) 0%, rgba(14,20,32,0.92) 42%, rgba(99,102,241,0.06) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(34,211,238,0.04) inset, 0 18px 40px -28px rgba(0,0,0,0.9);
          overflow: hidden;
          transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .bot-t-card:hover {
          transform: translateY(-4px);
          border-color: rgba(34,211,238,0.28);
          box-shadow: 0 0 0 1px rgba(34,211,238,0.1) inset, 0 24px 48px -24px rgba(34,211,238,0.25);
        }
        .bot-t-card-shine {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 50% at 0% 0%, rgba(34,211,238,0.12), transparent 55%);
          pointer-events: none;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div className="text-center sm:text-left max-w-2xl">
            <p className="text-cyan-400/90 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Community voices
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              What projects say about the
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400"> raid bot</span>
            </h2>
            <p className="text-gray-400 text-base">
              Real notes from teams using Aquads raids on Telegram and Discord.
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 self-center sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20"
            >
              <FaPlus />
              Add testimonial
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center text-slate-400">
            No testimonials yet. Add the first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((item) => (
              <TestimonialCard
                key={item._id}
                item={item}
                isAdmin={isAdmin}
                onEdit={(t) => {
                  setEditing(t);
                  setFormOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
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
          onSaved={load}
        />
      ) : null}
    </section>
  );
}
