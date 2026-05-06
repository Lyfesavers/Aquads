import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShareAlt, FaExternalLinkAlt } from 'react-icons/fa';

const FEED_LABEL = {
  technology: 'Technology',
  business: 'Business',
};

const FEED_ACCENT = {
  technology: 'from-sky-500/25 to-indigo-600/10 border-sky-500/30',
  business: 'from-emerald-500/25 to-teal-600/10 border-emerald-500/30',
};

const FEED_BADGE = {
  technology: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  business: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

function CourseImage({ imageUrl, feed, className = '' }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${
          FEED_ACCENT[feed] || FEED_ACCENT.technology
        } border-b border-white/5 ${className}`}
        aria-hidden
      >
        <span className="text-4xl font-black text-white/10 tracking-tighter select-none uppercase">
          {(FEED_LABEL[feed] || 'Course').slice(0, 4)}
        </span>
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Free course
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gray-950 ${className}`}>
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />
    </div>
  );
}

function CourseCard({ course, onShare }) {
  const detailUrl = `/learn/courses/${course.slug}`;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/60 shadow-lg shadow-black/30 ring-1 ring-white/5 transition hover:border-blue-500/40 hover:bg-gray-900/90">
      <Link
        to={detailUrl}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        <CourseImage
          imageUrl={course.imageUrl}
          feed={course.feed}
          className="aspect-[16/10] w-full shrink-0"
        />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                FEED_BADGE[course.feed] || FEED_BADGE.technology
              }`}
            >
              {FEED_LABEL[course.feed] || course.feed}
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-300">
              {course.category}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onShare(course);
            }}
            className="text-gray-400 hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-white/5"
            aria-label={`Share ${course.title}`}
            title="Copy share link"
          >
            <FaShareAlt className="w-3.5 h-3.5" />
          </button>
        </div>

        <Link to={detailUrl} className="block">
          <h3 className="mb-2 text-lg font-bold leading-snug text-white line-clamp-3 group-hover:text-blue-200 transition-colors">
            {course.title}
          </h3>
        </Link>
        {course.description ? (
          <p className="text-sm leading-relaxed text-gray-400 line-clamp-3">{course.description}</p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2 pt-2">
          <time className="font-mono text-[10px] text-gray-500" dateTime={course.publishedAt}>
            {formatDate(course.publishedAt)}
          </time>
          <Link
            to={detailUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200"
          >
            View course
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

const FreeCoursesList = ({
  items,
  categories = [],
  feedFilter,
  onChangeFeedFilter,
  categoryFilter,
  onChangeCategoryFilter,
  search,
  onChangeSearch,
  loading = false,
  pagination = null,
  onLoadMore,
  isLoadingMore = false,
  onShare,
}) => {
  // Categories shown depend on the active feed filter so the chip list stays relevant.
  const categoriesForFeed = categories
    .filter((c) => (feedFilter === 'all' ? true : c.feed === feedFilter))
    .reduce((acc, c) => {
      const existing = acc.find((x) => x.category === c.category);
      if (existing) {
        existing.count += c.count;
      } else {
        acc.push({ category: c.category, count: c.count });
      }
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

  const handleShare = (course) => {
    if (typeof onShare === 'function') {
      onShare(course);
      return;
    }
    const url = `${window.location.origin}/learn/courses/${course.slug}`;
    if (navigator.share) {
      navigator
        .share({ title: course.title, text: course.description || course.title, url })
        .catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => alert('Course link copied to clipboard!'),
      () => {}
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All feeds' },
              { id: 'technology', label: 'Technology & Programming' },
              { id: 'business', label: 'Business & Marketing' },
            ].map(({ id, label }) => {
              const active = feedFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeFeedFilter(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="search"
              value={search}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-lg border border-white/10 bg-gray-950/60 px-3 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M21 21l-3.5-3.5" />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChangeCategoryFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors border ${
              categoryFilter === 'all'
                ? 'bg-white text-gray-900 border-white'
                : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700 border-white/10'
            }`}
          >
            All categories
          </button>
          {categoriesForFeed.map(({ category, count }) => {
            const active = categoryFilter === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategoryFilter(category)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors border inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-white text-gray-900 border-white'
                    : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700 border-white/10'
                }`}
              >
                {category}
                <span
                  className={`text-[10px] font-bold ${
                    active ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
            <p className="text-gray-400 text-sm">Loading courses…</p>
          </div>
        </div>
      ) : !items?.length ? (
        <div className="text-center py-16 text-gray-400 max-w-lg mx-auto">
          <p className="mb-2 text-lg text-gray-300">No courses match those filters</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Try clearing your search or switching to a different category.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing <span className="text-gray-300 font-semibold">{items.length}</span>
              {pagination?.total ? (
                <>
                  {' '}of <span className="text-gray-300 font-semibold">{pagination.total}</span>
                </>
              ) : null}
              {' '}courses
            </span>
            <span className="inline-flex items-center gap-1 text-gray-500">
              <FaExternalLinkAlt className="w-3 h-3" /> Hosted on cursa.app
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((course) => (
              <CourseCard key={course._id} course={course} onShare={handleShare} />
            ))}
          </div>
        </>
      )}

      {pagination?.hasMore && typeof onLoadMore === 'function' ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-all duration-200 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/25 inline-flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Loading…</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Load more courses</span>
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FreeCoursesList;
