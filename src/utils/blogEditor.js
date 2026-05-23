import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import DOMPurify from 'dompurify';

export const isValidBlogImageUrl = (url) => /^https?:\/\/.+/i.test(url?.trim?.() || '');

const HTML_TAG_PATTERN =
  /<\s*(p|h[1-6]|ul|ol|li|blockquote|pre|div|table|thead|tbody|tr|td|th|img|a|hr|strong|em|span|br)[\s>/]/i;

export const blogContentHasTable = (content) =>
  /<\s*table[\s>]/i.test(content || '');

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
  Link.configure({
    openOnClick: linkOpenOnClick,
    autolink: true,
    validate: (href) => /^https?:\/\//.test(href),
    HTMLAttributes: {
      class: 'blog-link',
      target: '_blank',
      rel: 'noopener noreferrer',
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

export const sanitizeBlogHtml = (html) =>
  DOMPurify.sanitize(html || '', {
    ADD_ATTR: ['target', 'rel', 'class'],
    ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'],
  });

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
