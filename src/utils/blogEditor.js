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

export const blogContentHasTable = (content) =>
  /<\s*table[\s>]/i.test(content || '');

export const isHtmlBlogContent = (content) => {
  if (!content || typeof content !== 'string') return false;

  if (blogContentHasTable(content)) return true;

  const trimmed = content.trim();
  return /<\s*(p|h[1-6]|ul|ol|blockquote|pre|div|table|img|a|hr|strong|em|span)[\s>/]/i.test(trimmed);
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

export const getBlogEditorExtensions = ({ linkOpenOnClick = false } = {}) => [
  ...getBaseBlogExtensions({ linkOpenOnClick }),
  getMarkdownExtension(),
];

export const getBlogReaderExtensions = (content, { linkOpenOnClick = false } = {}) => {
  const extensions = getBaseBlogExtensions({ linkOpenOnClick });
  extensions.push(getMarkdownExtension());
  return extensions;
};

export const sanitizeBlogHtml = (html) =>
  DOMPurify.sanitize(html || '', {
    ADD_ATTR: ['target', 'rel', 'class'],
  });

export const serializeBlogEditorContent = (editor, preserveMarkdown) => {
  const html = editor.getHTML();

  if (blogContentHasTable(html) || !preserveMarkdown) {
    return html;
  }

  const markdown = editor.storage.markdown?.getMarkdown?.();
  if (typeof markdown === 'string') {
    return markdown;
  }

  return html;
};
