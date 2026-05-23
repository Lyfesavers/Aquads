import React, { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getBlogReaderExtensions } from '../utils/blogEditor';

const BlogContentRenderer = ({ content, className = 'prose prose-invert prose-lg max-w-none blog-content' }) => {
  const readerExtensions = useMemo(
    () => getBlogReaderExtensions(content, { linkOpenOnClick: true }),
    [content]
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

  return (
    <EditorContent
      editor={editor}
      className={className}
    />
  );
};

export default BlogContentRenderer;
