import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Modal from './Modal';
import {
  getBlogEditorExtensions,
  isHtmlBlogContent,
  isValidBlogImageUrl,
  blogContentHasTable,
  serializeBlogEditorContent,
} from '../utils/blogEditor';

const MenuBar = ({ editor }) => {
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

  const insertImage = useCallback(() => {
    const url = window.prompt('Enter image URL (https://...)')
    if (url === null) return

    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    if (!isValidBlogImageUrl(trimmedUrl)) {
      window.alert('Please enter a valid image URL starting with http:// or https://')
      return
    }

    const alt = window.prompt('Alt text (optional)', '') ?? ''
    editor.chain().focus().setImage({ src: trimmedUrl, alt: alt.trim() }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }, [editor])

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-700 rounded-t border-b border-gray-600">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded text-white ${editor.isActive('bold') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded text-white ${editor.isActive('italic') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-2 py-1 rounded text-white ${editor.isActive('strike') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Strike
      </button>
      
      {/* Link button */}
      <button
        onClick={setLink}
        className={`px-2 py-1 rounded text-white ${editor.isActive('link') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Link
      </button>
      {editor.isActive('link') && (
        <button
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="px-2 py-1 rounded bg-gray-800 text-white"
          type="button"
        >
          Unlink
        </button>
      )}

      <button
        onClick={insertImage}
        className="px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-600"
        type="button"
      >
        Image
      </button>

      <button
        onClick={insertTable}
        className={`px-2 py-1 rounded text-white ${editor.isActive('table') ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Table
      </button>

      {editor.isActive('table') && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Row Above
          </button>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Row Below
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Col Left
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Col Right
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Delete Row
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white text-xs"
            type="button"
          >
            Delete Col
          </button>
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white text-xs"
            type="button"
          >
            Delete Table
          </button>
        </div>
      )}
      
      {/* Heading controls */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          H3
        </button>
      </div>
      
      {/* List controls */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('bulletList') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('orderedList') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Ordered List
        </button>
      </div>
      
      {/* Block formatting */}
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('blockquote') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Quote
        </button>
        <button
          onClick={() => editor.chain().focus().setHardBreak().run()}
          className="px-2 py-1 rounded bg-gray-800 text-white"
          type="button"
        >
          Line Break
        </button>
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-2 py-1 rounded text-white ${editor.isActive('paragraph') ? 'bg-gray-600' : 'bg-gray-800'}`}
          type="button"
        >
          Paragraph
        </button>
      </div>
      
      {/* Clear formatting */}
      <button
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-white"
        type="button"
      >
        Clear Format
      </button>
    </div>
  );
};

const CreateBlogModal = ({ onClose, onSubmit, initialData = null, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    bannerImage: initialData?.bannerImage || ''
  });
  
  const [preserveMarkdown, setPreserveMarkdown] = useState(
    initialData?.content ? !isHtmlBlogContent(initialData.content) : true
  );
  const [usesTableStorage, setUsesTableStorage] = useState(
    blogContentHasTable(initialData?.content || '')
  );
  const preserveMarkdownRef = useRef(preserveMarkdown);
  preserveMarkdownRef.current = preserveMarkdown;

  const editor = useEditor({
    extensions: getBlogEditorExtensions({ linkOpenOnClick: false }),
    content: formData.content,
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      const hasTable = blogContentHasTable(html);
      setUsesTableStorage(hasTable);
      setFormData(prev => ({
        ...prev,
        content: serializeBlogEditorContent(updatedEditor, preserveMarkdownRef.current),
      }));
    },
    // Enhanced editor props for better paste handling
    editorProps: {
      // This helps preserve line breaks in pasted content
      transformPastedHTML(html) {
        // Replace common Microsoft Word and Google Docs artifacts and preserve links
        const cleanedHtml = html
          .replace(/<table[\s\S]*?<\/table>/gi, '')
          // Fix Word's mso-style artifacts and normalize paragraphs
          .replace(/<o:p>(.*?)<\/o:p>/g, '$1')
          .replace(/<span style="mso-[^"]*">(.*?)<\/span>/g, '$1')
          // Convert Word's line breaks to proper HTML breaks
          .replace(/<!--\[if !supportLineBreakNewLine\]--><br><!--\[endif\]-->/g, '<br>')
          // Force Google Docs spans with line-height to be blocks
          .replace(/<span style="[^"]*line-height:[^"]*">(.*?)<\/span>/g, '<div>$1</div>')
          // Clean up empty paragraphs
          .replace(/<p>\s*<\/p>/g, '<p>&nbsp;</p>')
          // Convert div tags to paragraphs for better separation
          .replace(/<div(?![^>]*class="[^"]*ProseMirror[^"]*")([^>]*)>(.*?)<\/div>/g, '<p$1>$2</p>')
          // MOST IMPORTANT FIX: Convert sequences of <br> tags to paragraph breaks
          .replace(/(<br\s*\/?>\s*){2,}/g, '</p><p>')
          // Convert single <br> tags within paragraphs to spaces when appropriate
          .replace(/<br\s*\/?>/g, ' ')
          // Ensure double line breaks between paragraphs are preserved
          .replace(/<\/p>\s*<p/g, '</p><p')
          // Preserve hyperlinks attributes
          .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          });
          
        return cleanedHtml;
      },
      // This helps preserve whitespace in pasted plain text
      transformPastedText(text) {
        // Check if the text contains Markdown markers
        const hasMarkdownHeadings = /^#+\s+.+$/m.test(text);
        const hasMarkdownLists = /^[\s]*[-*+]\s+.+$/m.test(text);
        const hasMarkdownLinks = /\[.+\]\(.+\)/.test(text);
        const hasMarkdownBold = /\*\*.+\*\*/.test(text);
        
        // If the text appears to have Markdown formatting, return it as-is for the Markdown extension to handle
        if (hasMarkdownHeadings || hasMarkdownLists || hasMarkdownLinks || hasMarkdownBold) {
          return text;
        }
        
        // Handle regular text with line breaks in a smarter way
        return text
          // Normalize line endings
          .replace(/\r\n/g, '\n')
          // First remove any <br> tags that might be in the text already
          .replace(/<br\s*\/?>/gi, '\n')
          // Replace consecutive line breaks (3 or more) with a special token
          .replace(/\n{3,}/g, '||PARAGRAPH||')
          // Replace double line breaks with paragraph separator
          .replace(/\n\n/g, '||PARAGRAPH||')
          // Now handle the remaining single line breaks
          .replace(/\n/g, ' ')
          // Replace paragraph tokens with proper paragraph breaks
          .replace(/\|\|PARAGRAPH\|\|/g, '</p><p>')
          // Wrap in paragraph tags if needed
          .replace(/^(.+)$/, '<p>$1</p>');
      },
      // Special handling for code blocks
      handlePaste: (view, event) => {
        // Check if the paste event has clipboard data
        if (event.clipboardData && event.clipboardData.getData) {
          // Get plain text from clipboard
          const text = event.clipboardData.getData('text/plain');
          
          // Check if text has Markdown patterns
          const hasMarkdownHeadings = /^#+\s+.+$/m.test(text);
          const hasMarkdownLists = /^[\s]*[-*+]\s+.+$/m.test(text);
          const hasMarkdownLinks = /\[.+\]\(.+\)/.test(text);
          const hasMarkdownBold = /\*\*.+\*\*/.test(text);
          
          if (hasMarkdownHeadings || hasMarkdownLists || hasMarkdownLinks || hasMarkdownBold) {
            // Let the Markdown extension handle it
            return false;
          }
          
          // Check if user is holding Shift key during paste (for paste as plain text with preserved formatting)
          if (event.shiftKey) {
            if (text) {
              // Process the text to preserve paragraph breaks
              const processedText = text
                // Normalize line endings
                .replace(/\r\n/g, '\n')
                // Handle multiple consecutive line breaks (3+) and convert to double breaks
                .replace(/\n{3,}/g, '\n\n')
                // Split by double line breaks to get paragraphs
                .split(/\n\n/);
              
              // Insert each paragraph as a separate paragraph node
              processedText.forEach((paragraph, index) => {
                // Skip empty paragraphs
                if (!paragraph.trim()) return;
                
                // Insert paragraph with proper breaks
                const lines = paragraph.split('\n');
                
                // For each line in this paragraph
                lines.forEach((line, lineIndex) => {
                  // Insert the text content
                  view.dispatch(view.state.tr.insertText(line));
                  
                  // If not the last line in this paragraph, add a hard break
                  if (lineIndex < lines.length - 1) {
                    const { hardBreak } = view.state.schema.nodes;
                    view.dispatch(view.state.tr.replaceSelectionWith(hardBreak.create()));
                  }
                });
                
                // If not the last paragraph, add a paragraph break
                if (index < processedText.length - 1) {
                  view.dispatch(view.state.tr.insertText('\n\n'));
                }
              });
              
              // Prevent default paste behavior
              event.preventDefault();
              return true;
            }
          }
        }
        
        // Let the default handler work in most cases
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    setFormData(prev => ({
      ...prev,
      content: serializeBlogEditorContent(editor, preserveMarkdown),
    }));
  }, [editor, preserveMarkdown]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const content = editor
      ? serializeBlogEditorContent(editor, preserveMarkdownRef.current)
      : formData.content;
    onSubmit({ ...formData, content });
  }, [editor, formData, onSubmit]);

  return (
    <Modal onClose={onClose} fullScreen={true}>
      <div className="text-white max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-white text-center">{initialData ? 'Edit Blog Post' : 'Create New Blog Post'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1 text-gray-200">Title</label>
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
          <label htmlFor="bannerImage" className="block text-sm font-medium mb-1 text-gray-200">Banner Image URL</label>
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
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-200">Content (Max 10000 words)</label>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-400">Format Preservation:</span>
              <button
                type="button"
                onClick={() => setPreserveMarkdown(!preserveMarkdown)}
                className={`px-2 py-1 text-xs rounded text-white ${
                  preserveMarkdown ? 'bg-green-600' : 'bg-gray-600'
                }`}
              >
                {preserveMarkdown ? 'Markdown Enabled' : 'Rich Text Mode'}
              </button>
            </div>
          </div>
          <div className="border border-gray-600 rounded overflow-hidden">
            <MenuBar editor={editor} />
            <EditorContent 
              editor={editor} 
              className="prose prose-invert max-w-none min-h-[400px] md:min-h-[500px] p-4 bg-gray-800 focus:outline-none"
            />
            <div className="bg-gray-700 p-2 border-t border-gray-600 text-xs text-gray-400 space-y-1">
              <p>Tip: Markdown formatting is {preserveMarkdown ? 'enabled' : 'disabled'}. {
                preserveMarkdown ?
                'Your headings (#), lists (-), inline images, and other Markdown formatting will be preserved when saved.' :
                'Switch to Markdown mode to preserve special formatting like headings and lists.'
              }</p>
              <p>Use the Image and Table toolbar buttons to insert body images and comparison tables. Pasted tables are not supported.</p>
              {usesTableStorage && (
                <p className="text-amber-300">This post contains a table and will be saved in Rich Text (HTML) format.</p>
              )}
            </div>
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

              .ProseMirror img,
              .ProseMirror .blog-inline-image {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 1.5em auto;
                display: block;
              }

              .ProseMirror .tableWrapper,
              .ProseMirror .blog-table-wrapper {
                overflow-x: auto;
                margin: 1.5em 0;
              }

              .ProseMirror table,
              .ProseMirror .blog-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }

              .ProseMirror th,
              .ProseMirror td {
                border: 1px solid #4b5563;
                padding: 0.6em 0.75em;
                vertical-align: top;
                min-width: 80px;
              }

              .ProseMirror th {
                background-color: #374151;
                font-weight: 600;
              }

              .ProseMirror .selectedCell {
                background-color: rgba(59, 130, 246, 0.2);
              }
            `}</style>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className={`px-6 py-3 bg-gray-600 rounded text-white font-medium transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'
            }`}
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 bg-blue-600 rounded text-white font-medium transition-colors flex items-center justify-center min-w-[100px] ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {initialData ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              initialData ? 'Update' : 'Create'
            )}
          </button>
        </div>
      </form>
      </div>
    </Modal>
  );
};

export default CreateBlogModal; 