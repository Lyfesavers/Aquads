import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import {
  getBlogReaderExtensions,
  isHtmlBlogContent,
  sanitizeBlogHtml,
} from '../utils/blogEditor';

const MarkdownBlogRenderer = ({ content, className }) => {
  const readerExtensions = useMemo(
    () => getBlogReaderExtensions({ linkOpenOnClick: true }),
    []
  );

  const editor = useEditor({
    extensions: readerExtensions,
    content: content || '',
    editable: false,
  }, [content, readerExtensions]);

  useEffect(() => {
    if (!editor || content === undefined) return;
    editor.commands.setContent(content, false);
  }, [editor, content]);

  if (!editor) {
    return <div className="animate-pulse bg-gray-700 h-24 rounded" />;
  }

  return <EditorContent editor={editor} className={className} />;
};

const BlogContentRenderer = ({ content, className = 'prose prose-invert prose-lg max-w-none blog-content' }) => {
  if (isHtmlBlogContent(content)) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(content) }}
      />
    );
  }

  return <MarkdownBlogRenderer content={content} className={className} />;
};

export default BlogContentRenderer;
