import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Modal from './Modal';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter the URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink()
        .run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url })
      .run()
  }, [editor])

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-700 rounded-t border-b border-gray-600">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded ${editor.isActive('bold') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded ${editor.isActive('italic') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-2 py-1 rounded ${editor.isActive('strike') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Strike
      </button>
      
      {/* Link button */}
      <button
        onClick={setLink}
        className={`px-2 py-1 rounded ${editor.isActive('link') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Link
      </button>
      {editor.isActive('link') && (
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2 py-1 rounded bg-gray-800"
          type="button"
        >
          Unlink
        </button>
      )}
      
      {/* Heading controls */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H3
        </button>
      </div>
      
      {/* List controls */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Ordered List
        </button>
      </div>
      
      {/* Block formatting */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded ${editor.isActive('blockquote') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Quote
        </button>
        <button
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className="px-2 py-1 rounded bg-gray-800"
          type="button"
        >
          Line Break
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 rounded ${editor.isActive('paragraph') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Paragraph
        </button>
      </div>
      
      {/* Clear formatting */}
      <button
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="px-2 py-1 rounded bg-red-700 hover:bg-red-800"
        type="button"
      >
        Clear Format
      </button>
    </div>
  );
};

const CreateBlogModal = ({ onClose, onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    bannerImage: initialData?.bannerImage || ''
  });

  // Create an enhanced StarterKit configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure the base kit for better paste handling
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
        // This helps preserve whitespace
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        // Automatically detect links in pasted content
        autolink: true,
        // Allow validation of pasted URLs
        validate: href => /^https?:\/\//.test(href),
        HTMLAttributes: {
          class: 'blog-link',
          target: '_blank',
          rel: 'noopener noreferrer'
        },
        // Linkify (convert text URLs to actual links)
        linkOnPaste: true,
      }),
    ],
    content: formData.content,
    onUpdate: ({ editor }) => {
      setFormData(prev => ({ ...prev, content: editor.getHTML() }));
    },
    // Enhanced editor props for better paste handling
    editorProps: {
      // This helps preserve line breaks in pasted content
      transformPastedHTML(html) {
        // Replace common Microsoft Word and Google Docs artifacts and preserve links
        const cleanedHtml = html
          // Fix Word's mso-style artifacts and normalize paragraphs
          .replace(/<o:p>(.*?)<\/o:p>/g, '$1')
          .replace(/<span style="mso-[^"]*">(.*?)<\/span>/g, '$1')
          // Convert Word's line breaks to proper HTML breaks
          .replace(/<!--\[if !supportLineBreakNewLine\]--><br><!--\[endif\]-->/g, '<br>')
          // Force Google Docs spans with line-height to be blocks
          .replace(/<span style="[^"]*line-height:[^"]*">(.*?)<\/span>/g, '<div>$1</div>')
          // Clean up empty paragraphs
          .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
          // Preserve hyperlinks attributes
          .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          });
          
        return cleanedHtml;
      },
      // This helps preserve whitespace in pasted plain text
      transformPastedText(text) {
        // Preserve consecutive spaces and line breaks
        return text
          .replace(/\n\n/g, '<p></p>')
          .replace(/\n/g, '<br>');
      },
      // Special handling for code blocks
      handlePaste: (view, event) => {
        // Let the default handler work in most cases
        // Only return true if we're handling it specially
        return false;
      },
    },
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{initialData ? 'Edit Blog Post' : 'Create New Blog Post'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="bannerImage" className="block text-sm font-medium mb-1">Banner Image URL</label>
          <input
            type="url"
            id="bannerImage"
            name="bannerImage"
            value={formData.bannerImage}
            onChange={handleChange}
            required
            placeholder="https://example.com/image.jpg W1280xH720px"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.bannerImage && (
            <div className="mt-2 aspect-video rounded overflow-hidden">
              <img 
                src={formData.bannerImage} 
                alt="Banner preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/640x360?text=Invalid+Image+URL';
                }}
              />
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Content (Max 5000 words)</label>
          <div className="border border-gray-600 rounded overflow-hidden">
            <MenuBar editor={editor} />
            <EditorContent 
              editor={editor} 
              className="prose prose-invert max-w-none min-h-[300px] p-4 bg-gray-800 focus:outline-none"
            />
            <style jsx global>{`
              .ProseMirror {
                min-height: 300px;
                padding: 1rem;
                outline: none;
              }
              
              .ProseMirror p {
                margin-bottom: 1em;
              }
              
              .ProseMirror h1 {
                font-size: 1.75em;
                font-weight: bold;
                margin-bottom: 0.5em;
                margin-top: 1em;
              }
              
              .ProseMirror h2 {
                font-size: 1.5em;
                font-weight: bold;
                margin-bottom: 0.5em;
                margin-top: 1em;
              }
              
              .ProseMirror h3 {
                font-size: 1.25em;
                font-weight: bold;
                margin-bottom: 0.5em;
                margin-top: 1em;
              }
              
              .ProseMirror ul {
                list-style: disc;
                padding-left: 1.5em;
                margin-bottom: 1em;
              }
              
              .ProseMirror ol {
                list-style: decimal;
                padding-left: 1.5em;
                margin-bottom: 1em;
              }
              
              .ProseMirror li {
                margin-bottom: 0.25em;
              }
              
              .ProseMirror blockquote {
                border-left: 3px solid #4b5563;
                padding-left: 1em;
                margin-left: 0;
                margin-right: 0;
                font-style: italic;
                margin-bottom: 1em;
              }
              
              .ProseMirror pre {
                background-color: #1f2937;
                color: #e5e7eb;
                padding: 0.75em;
                border-radius: 0.25em;
                white-space: pre-wrap;
                margin-bottom: 1em;
                font-family: monospace;
              }
              
              .ProseMirror code {
                background-color: rgba(75, 85, 99, 0.4);
                padding: 0.2em 0.4em;
                border-radius: 0.25em;
                font-family: monospace;
              }
              
              .ProseMirror a {
                color: #3b82f6;
                text-decoration: underline;
                cursor: pointer;
              }
              
              .ProseMirror a:hover {
                color: #60a5fa;
              }
              
              /* Preserve whitespace in pre tags */
              .ProseMirror pre {
                white-space: pre-wrap;
              }
              
              /* Keep spacing in pasted content */
              .ProseMirror p.empty-node::before {
                content: attr(data-placeholder);
                float: left;
                color: #aaa;
                pointer-events: none;
                height: 0;
              }
            `}</style>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            {initialData ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBlogModal; 