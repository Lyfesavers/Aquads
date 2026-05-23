import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import {
  getBlogEditorExtensions,
  isHtmlBlogContent,
} from '../utils/blogEditor';

const BlogContentRenderer = ({ content, className = 'prose prose-invert prose-lg max-w-none blog-content' }) => {
  const [ready, setReady] = useState(false);
  const editorKey = useRef(Math.random().toString(36).substring(7)).current;
  const useHtml = isHtmlBlogContent(content);

  const editor = useEditor({
    extensions: getBlogEditorExtensions({ linkOpenOnClick: true }),
    content: content || '',
    editable: false,
    onCreate({ editor: createdEditor }) {
      if (!content) {
        setReady(true);
        return;
      }

      try {
        createdEditor.commands.setContent(content, false);
      } catch (err) {
        console.error('Error rendering blog content:', err);
      }

      setReady(true);
    },
  }, [content, useHtml]);

  useEffect(() => {
    if (!editor || content === undefined) return;

    try {
      editor.commands.setContent(content, false);
    } catch (err) {
      console.error('Error updating blog content:', err);
    }
  }, [editor, content]);

  if (!editor || !ready) {
    return <div className="animate-pulse bg-gray-700 h-24 rounded" />;
  }

  return (
    <EditorContent
      key={`${editorKey}-${content?.slice?.(0, 24) || 'empty'}`}
      editor={editor}
      className={className}
    />
  );
};

export default BlogContentRenderer;
