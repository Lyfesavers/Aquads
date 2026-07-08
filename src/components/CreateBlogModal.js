import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Modal from './Modal';
import {
  getBlogEditorExtensionsForFormat,
  getBlogStorageFormat,
  blogContentHasTable,
  blogContentHasDofollowLink,
  serializeBlogEditorContent,
  BLOG_IMAGE_ACCEPT,
  BLOG_IMAGE_MAX_BYTES,
} from '../utils/blogEditor';
import { uploadBlogImage } from '../services/api';

const MenuBar = ({ editor, onUploadInlineImage, inlineImageUploading }) => {
  const inlineImageInputRef = useRef(null);
  const linkAttrs = editor ? editor.getAttributes('link') : {}
  const isLinkActive = editor ? editor.isActive('link') : false
  const isLinkDofollow = linkAttrs['data-follow'] === 'true'

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

    // Preserve existing dofollow flag when updating an existing link;
    // new links default to nofollow (data-follow = null).
    const existingDataFollow = editor.getAttributes('link')['data-follow']
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url, 'data-follow': existingDataFollow === 'true' ? 'true' : null })
      .run()
  }, [editor])

  const toggleDofollow = useCallback(() => {
    if (!editor) return
    const current = editor.getAttributes('link')['data-follow']
    const next = current === 'true' ? null : 'true'
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .updateAttributes('link', { 'data-follow': next })
      .run()
  }, [editor])

  const handleInlineImageFile = useCallback(async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor || !onUploadInlineImage) return

    if (!file.type.startsWith('image/')) {
      window.alert('Please choose a JPEG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
      window.alert('Image must be 5MB or smaller.')
      return
    }

    try {
      const url = await onUploadInlineImage(file)
      const alt = window.prompt('Alt text (optional)', file.name.replace(/\.[^.]+$/, '')) ?? ''
      editor.chain().focus().setImage({ src: url, alt: alt.trim() }).run()
    } catch (err) {
      window.alert(err.message || 'Failed to upload image')
    }
  }, [editor, onUploadInlineImage])

  const insertImage = useCallback(() => {
    inlineImageInputRef.current?.click()
  }, [])

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
    <div className="flex flex-wrap gap-1 p-2 bg-gray-700">
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
        className={`px-2 py-1 rounded text-white ${isLinkActive ? 'bg-gray-600' : 'bg-gray-800'}`}
        type="button"
      >
        Link
      </button>
      {isLinkActive && (
        <>
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2 py-1 rounded bg-gray-800 text-white"
            type="button"
          >
            Unlink
          </button>
          <button
            onClick={toggleDofollow}
            className={`px-2 py-1 rounded text-white ${isLinkDofollow ? 'bg-emerald-600' : 'bg-gray-800'}`}
            type="button"
            title={
              isLinkDofollow
                ? 'This link passes SEO link equity (rel="noopener noreferrer"). Click to switch to nofollow.'
                : 'This link is nofollow (rel="noopener noreferrer nofollow"). Click to mark as dofollow.'
            }
          >
            {isLinkDofollow ? 'Dofollow' : 'Nofollow'}
          </button>
        </>
      )}

      <input
        ref={inlineImageInputRef}
        type="file"
        accept={BLOG_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleInlineImageFile}
      />
      <button
        onClick={insertImage}
        disabled={inlineImageUploading}
        className="px-2 py-1 rounded bg-gray-800 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait"
        type="button"
      >
        {inlineImageUploading ? 'Uploading…' : 'Image'}
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
  const [bannerUploading, setBannerUploading] = useState(false);
  const [inlineImageUploading, setInlineImageUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const bannerInputRef = useRef(null);
  
  const [storageFormat, setStorageFormat] = useState(() =>
    getBlogStorageFormat(initialData?.content || '')
  );
  const [preserveMarkdown, setPreserveMarkdown] = useState(storageFormat === 'markdown');
  const [usesTableStorage, setUsesTableStorage] = useState(
    blogContentHasTable(initialData?.content || '')
  );
  const [usesDofollowStorage, setUsesDofollowStorage] = useState(
    blogContentHasDofollowLink(initialData?.content || '')
  );
  const storageFormatRef = useRef(storageFormat);
  storageFormatRef.current = storageFormat;
  const preserveMarkdownRef = useRef(preserveMarkdown);
  preserveMarkdownRef.current = preserveMarkdown;
  const skipPreserveMarkdownSyncRef = useRef(true);

  const editorExtensions = useMemo(
    () => getBlogEditorExtensionsForFormat(storageFormat, { linkOpenOnClick: false }),
    [storageFormat]
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: formData.content,
    onUpdate: ({ editor: updatedEditor }) => {
      const html = updatedEditor.getHTML();
      const hasTable = blogContentHasTable(html);
      const hasDofollow = blogContentHasDofollowLink(html);
      let nextFormat = storageFormatRef.current;

      if ((hasTable || hasDofollow) && nextFormat !== 'html') {
        nextFormat = 'html';
        storageFormatRef.current = 'html';
        setStorageFormat('html');
        setPreserveMarkdown(false);
      }

      setUsesTableStorage(hasTable);
      setUsesDofollowStorage(hasDofollow);
      setFormData(prev => ({
        ...prev,
        content: serializeBlogEditorContent(updatedEditor, nextFormat),
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
          // Preserve hyperlinks attributes (default to nofollow; the TipTap
          // BlogLink extension will re-apply the correct rel based on
          // data-follow when content is rendered/serialized).
          .replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (match, url, text) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
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
  }, [editorExtensions]);

  useEffect(() => {
    if (!editor) return;

    if (skipPreserveMarkdownSyncRef.current) {
      skipPreserveMarkdownSyncRef.current = false;
      return;
    }

    const nextFormat = preserveMarkdown ? 'markdown' : 'html';
    storageFormatRef.current = nextFormat;
    setStorageFormat(nextFormat);
    setFormData(prev => ({
      ...prev,
      content: serializeBlogEditorContent(editor, nextFormat),
    }));
  }, [editor, preserveMarkdown]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleUploadInlineImage = useCallback(async (file) => {
    setUploadError('');
    setInlineImageUploading(true);
    try {
      const { url } = await uploadBlogImage(file, { variant: 'inline' });
      return url;
    } finally {
      setInlineImageUploading(false);
    }
  }, []);

  const handleBannerFile = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Banner must be a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
      setUploadError('Banner image must be 5MB or smaller.');
      return;
    }

    setUploadError('');
    setBannerUploading(true);
    try {
      const { url } = await uploadBlogImage(file, { variant: 'banner' });
      setFormData((prev) => ({ ...prev, bannerImage: url }));
    } catch (err) {
      setUploadError(err.message || 'Failed to upload banner');
    } finally {
      setBannerUploading(false);
    }
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!formData.bannerImage?.trim()) {
      setUploadError('Please upload a banner image.');
      return;
    }
    const content = editor
      ? serializeBlogEditorContent(editor, storageFormatRef.current)
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
          <label className="block text-sm font-medium mb-1 text-gray-200">
            Banner image
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Upload a wide image (recommended 1280×720). Images are compressed and hosted on Aquads for fast loading.
          </p>
          <input
            ref={bannerInputRef}
            type="file"
            accept={BLOG_IMAGE_ACCEPT}
            className="hidden"
            onChange={handleBannerFile}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait text-white rounded transition-colors"
            >
              {bannerUploading ? 'Uploading…' : formData.bannerImage ? 'Replace banner' : 'Upload banner'}
            </button>
            {formData.bannerImage && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, bannerImage: '' }))}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Remove
              </button>
            )}
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-400">{uploadError}</p>
          )}
          {formData.bannerImage && (
            <div className="mt-2 aspect-video rounded overflow-hidden border border-gray-600">
              <img
                src={formData.bannerImage}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
        
        <div>
          <div className="border border-gray-600 rounded flex flex-col">
            <div className="rounded-t bg-gray-800/95 border-b border-gray-600 shadow-lg shrink-0">
              <div className="flex flex-wrap justify-between items-center gap-2 px-3 pt-3 pb-1">
                <label className="block text-sm font-medium text-gray-200">Content</label>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400">Format Preservation:</span>
                  <button
                    type="button"
                    disabled={storageFormat === 'html' || usesTableStorage || usesDofollowStorage}
                    onClick={() => {
                      if (storageFormat === 'html' || usesTableStorage || usesDofollowStorage) return;
                      setPreserveMarkdown(!preserveMarkdown);
                    }}
                    className={`px-2 py-1 text-xs rounded text-white ${
                      preserveMarkdown ? 'bg-green-600' : 'bg-gray-600'
                    } ${storageFormat === 'html' || usesTableStorage || usesDofollowStorage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {preserveMarkdown ? 'Markdown Enabled' : 'Rich Text Mode'}
                  </button>
                </div>
              </div>
              <MenuBar
                editor={editor}
                onUploadInlineImage={handleUploadInlineImage}
                inlineImageUploading={inlineImageUploading}
              />
            </div>
            <div className="bg-gray-800 max-h-[60vh] overflow-y-auto overscroll-contain">
              <EditorContent
                editor={editor}
                className="prose prose-invert max-w-none min-h-[400px] md:min-h-[500px] px-4 pb-4 pt-2 bg-gray-800 focus:outline-none"
              />
            </div>
            <div className="bg-gray-700 p-2 border-t border-gray-600 text-xs text-gray-400 space-y-1">
              <p>Tip: Markdown formatting is {preserveMarkdown ? 'enabled' : 'disabled'}. {
                preserveMarkdown ?
                'Your headings (#), lists (-), inline images, and other Markdown formatting will be preserved when saved.' :
                'Switch to Markdown mode to preserve special formatting like headings and lists.'
              }</p>
              <p>Use the Image button to upload body images (hosted on Aquads, max 5MB). Use Table for comparison tables. Pasted tables are not supported.</p>
              <p>Outbound links are <span className="text-amber-300">nofollow by default</span>. Select a link and click the toolbar toggle to mark it as <span className="text-emerald-300">Dofollow</span> when you want to pass SEO link equity (e.g. partner / sponsored project links you trust).</p>
              {usesTableStorage && (
                <p className="text-amber-300">This post contains a table and stays in Rich Text (HTML) format.</p>
              )}
              {usesDofollowStorage && (
                <p className="text-amber-300">This post contains a Dofollow link and stays in Rich Text (HTML) format so the per-link SEO setting is preserved.</p>
              )}
              {storageFormat === 'html' && !usesTableStorage && !usesDofollowStorage && (
                <p className="text-amber-300">This post uses Rich Text (HTML) storage. Markdown mode is disabled to protect formatting.</p>
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