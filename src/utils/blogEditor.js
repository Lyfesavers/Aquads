import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { mergeAttributes } from '@tiptap/core';
import { Markdown } from 'tiptap-markdown';
import DOMPurify from 'dompurify';

export const isValidBlogImageUrl = (url) => {
  const value = url?.trim?.() || '';
  if (!value) return false;
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(value)) return true;
  // Aquads blog media stored in MongoDB
  return /^https?:\/\/[^/]+\/api\/blogs\/media\/[a-fA-F0-9]{24}(\?.*)?$/i.test(value);
};

export const BLOG_IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// SEO link policy: blog outbound links are nofollow by default.
// Authors can opt a specific link into dofollow by setting data-follow="true"
// (exposed via the "Dofollow" toggle in the editor toolbar).
const BLOG_LINK_REL_BASE = 'noopener noreferrer';
export const BLOG_LINK_REL_NOFOLLOW = `${BLOG_LINK_REL_BASE} nofollow`;
export const BLOG_LINK_REL_DOFOLLOW = BLOG_LINK_REL_BASE;

const HTML_TAG_PATTERN =
  /<\s*(p|h[1-6]|ul|ol|li|blockquote|pre|div|table|thead|tbody|tr|td|th|img|a|hr|strong|em|span|br)[\s>/]/i;

export const blogContentHasTable = (content) =>
  /<\s*table[\s>]/i.test(content || '');

// Markdown can't carry custom anchor attributes, so any dofollow link forces
// HTML storage (mirrors the table-storage rule).
export const blogContentHasDofollowLink = (content) =>
  /data-follow\s*=\s*["']true["']/i.test(content || '');

export const isHtmlBlogContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  return HTML_TAG_PATTERN.test(content);
};

export const isMarkdownBlogContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  if (isHtmlBlogContent(content)) return false;

  return (
    /^#+ .+/m.test(content) ||
    /\n#+ .+/m.test(content) ||
    /\n- .+/m.test(content) ||
    /^- .+/m.test(content) ||
    /\n\* .+/m.test(content) ||
    /^(>\s.*)+$/m.test(content) ||
    /\*\*[^*]+\*\*/m.test(content) ||
    /\*[^*]+\*/m.test(content) ||
    /!\[[^\]]*\]\([^)]+\)/m.test(content) ||
    /\[.+\]\(.+\)/m.test(content) ||
    /`[^`]+`/m.test(content) ||
    /^\s*```[\s\S]*?```\s*$/m.test(content)
  );
};

export const getBlogStorageFormat = (content) =>
  isHtmlBlogContent(content) ? 'html' : 'markdown';

// Link mark extended with an SEO-aware `data-follow` attribute. When
// data-follow="true" we emit dofollow rel ("noopener noreferrer"), otherwise
// we emit nofollow rel ("noopener noreferrer nofollow").
const BlogLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-follow': {
        default: null,
        parseHTML: (element) => {
          const explicit = element.getAttribute('data-follow');
          if (explicit === 'true') return 'true';
          return null;
        },
        renderHTML: (attributes) => {
          if (attributes['data-follow'] === 'true') {
            return { 'data-follow': 'true' };
          }
          return {};
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const isDofollow = HTMLAttributes['data-follow'] === 'true';
    const rel = isDofollow ? BLOG_LINK_REL_DOFOLLOW : BLOG_LINK_REL_NOFOLLOW;
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { rel }),
      0,
    ];
  },
});

const getBaseBlogExtensions = ({ linkOpenOnClick = false } = {}) => [
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: true,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: true,
    },
    heading: {
      levels: [1, 2, 3, 4, 5, 6],
    },
    codeBlock: {
      HTMLAttributes: {
        class: 'code-block',
      },
    },
  }),
  BlogLink.configure({
    openOnClick: linkOpenOnClick,
    autolink: true,
    validate: (href) => /^https?:\/\//.test(href),
    HTMLAttributes: {
      class: 'blog-link',
      target: '_blank',
      rel: BLOG_LINK_REL_NOFOLLOW,
    },
    linkOnPaste: true,
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: {
      class: 'blog-inline-image',
    },
  }),
  Table.configure({
    resizable: false,
    HTMLAttributes: {
      class: 'blog-table',
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
];

const getMarkdownExtension = () =>
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: true,
  });

export const getBlogHtmlEditorExtensions = ({ linkOpenOnClick = false } = {}) =>
  getBaseBlogExtensions({ linkOpenOnClick });

export const getBlogMarkdownEditorExtensions = ({ linkOpenOnClick = false } = {}) => [
  ...getBaseBlogExtensions({ linkOpenOnClick }),
  getMarkdownExtension(),
];

export const getBlogEditorExtensions = ({ linkOpenOnClick = false } = {}) =>
  getBlogMarkdownEditorExtensions({ linkOpenOnClick });

export const getBlogEditorExtensionsForFormat = (storageFormat, options = {}) =>
  storageFormat === 'html'
    ? getBlogHtmlEditorExtensions(options)
    : getBlogMarkdownEditorExtensions(options);

export const getBlogReaderExtensions = ({ linkOpenOnClick = false } = {}) =>
  getBlogMarkdownEditorExtensions({ linkOpenOnClick });

export const sanitizeBlogHtml = (html) => {
  const clean = DOMPurify.sanitize(html || '', {
    ADD_ATTR: ['target', 'rel', 'class', 'data-follow', 'loading', 'decoding'],
    ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
  });
  return clean.replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async"');
};

export const serializeBlogEditorContent = (editor, storageFormat) => {
  const html = editor.getHTML();

  if (storageFormat === 'html') {
    return html;
  }

  const markdown = editor.storage.markdown?.getMarkdown?.();
  if (typeof markdown === 'string') {
    return markdown;
  }

  return html;
};
