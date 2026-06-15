'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextBold, TextItalic, Menu, Link2, Minus } from 'iconsax-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your message...',
  minHeight = '200px',
  className = '',
}: RichTextEditorProps) {
  const mergeFields = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}'];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline hover:text-blue-700' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content focus:outline-none min-h-[120px] px-3 py-2 text-sm text-gray-900',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Sync when value is cleared from parent (e.g. form reset after send)
  React.useEffect(() => {
    if (editor && !value) {
      editor.commands.setContent('', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${className}`}
      style={{ minHeight }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-100 bg-gray-50/50">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            editor.can().undo() ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            editor.can().redo() ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo"
        >
          ↻
        </button>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Bold"
        >
          <TextBold size={18} color="currentColor" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Italic"
        >
          <TextItalic size={18} color="currentColor" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Strikethrough"
        >
          <span className="text-sm font-medium line-through">S</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('underline') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Underline"
        >
          <span className="text-sm font-medium underline">U</span>
        </button>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1.5 rounded text-xs font-bold hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1.5 rounded text-xs font-bold hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Heading 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1.5 rounded text-xs font-bold hover:bg-gray-200 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Heading 3"
        >
          H3
        </button>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Bullet list"
        >
          <Menu size={18} color="currentColor" variant={editor.isActive('bulletList') ? 'Bold' : 'Linear'} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Numbered list"
        >
          <span className="text-sm font-medium">1.</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('blockquote') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Quote"
        >
          "
        </button>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <div className="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Align left"
          >
            L
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Align center"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
            }`}
            title="Align right"
          >
            R
          </button>
        </div>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <div className="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!editor.can().sinkListItem('listItem')}
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              editor.can().sinkListItem('listItem')
                ? 'text-gray-600 hover:bg-gray-200'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Increase indent"
          >
            ➜
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!editor.can().liftListItem('listItem')}
            className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              editor.can().liftListItem('listItem')
                ? 'text-gray-600 hover:bg-gray-200'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="Decrease indent"
          >
            ⇤
          </button>
        </div>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="px-2 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          title="Clear formatting"
        >
          Tx
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors ${
            editor.isActive('code') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Inline code"
        >
          {'</>'}
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-200 transition-colors ${
            editor.isActive('codeBlock') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Code block"
        >
          {'</>'} block
        </button>
        <div className="w-px h-6 bg-gray-200 mx-0.5" />
        <button
          type="button"
          onClick={setLink}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
          title="Link"
        >
          <Link2 size={18} color="currentColor" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 rounded hover:bg-gray-200 text-gray-600 transition-colors"
          title="Horizontal rule"
        >
          <Minus size={18} color="currentColor" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <select
            onChange={(e) => {
              const field = e.target.value;
              if (!field) return;
              editor.chain().focus().insertContent(field).run();
              e.target.value = '';
            }}
            className="px-2 py-1.5 rounded border border-gray-200 bg-white text-xs text-gray-600 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            defaultValue=""
          >
            <option value="" disabled>
              Insert variable...
            </option>
            {mergeFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
