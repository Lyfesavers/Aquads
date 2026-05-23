import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';

export const isValidBlogImageUrl = (url) => /^https?:\/\/.+/i.test(url?.trim?.() || '');

export const blogContentHasTable = (content) =>
  /<\s*table[\s>]/i.test(content || '');

export const isHtmlBlogContent = (content) => {
  if (!content || typeof content !== 'string') return false;

  if (blogContentHasTable(content)) return true;

  const trimmed = content.trim();
  return /^<\s*(p|h[1-6]|ul|ol|blockquote|pre|div|table|img)[\s>]/i.test(trimmed);
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

export const getBlogEditorExtensions = ({ linkOpenOnClick = false } = {}) => [
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
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: true,
  }),
];

export const serializeBlogEditorContent = (editor, preserveMarkdown) => {
  const html = editor.getHTML();

  if (blogContentHasTable(html) || !preserveMarkdown) {
    return html;
  }

  return editor.storage.markdown.getMarkdown();
};
