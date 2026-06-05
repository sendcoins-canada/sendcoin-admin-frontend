'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Image from '@tiptap/extension-image';
import { Menu, Link2, Minus, GalleryAdd } from 'iconsax-react';

// Click-based color picker (hover was unreliable)
function ColorPicker({ editor, colors }: { editor: Editor; colors: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-gray-200 text-xs font-medium text-gray-600" title="Text color">
        <span className="text-sm font-bold" style={{ color: editor.getAttributes('textStyle').color || '#000' }}>A</span>
        <span className="text-[8px]">▼</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 grid grid-cols-4 gap-1.5 p-2.5 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {colors.map((c) => (
              <button key={c} type="button"
                onClick={() => { editor.chain().focus().setColor(c).run(); setOpen(false); }}
                className="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Font-size extension via TextStyle mark attributes
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize?.replace(/['"]+/g, '') || null,
        renderHTML: (attrs: Record<string, string>) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size: ${attrs.fontSize}` };
        },
      },
    };
  },
});

interface NewsletterEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
];
const COLORS = [
  '#000000', '#1a1a2e', '#444444', '#888888',
  '#0647F7', '#2563eb', '#dc2626', '#16a34a',
  '#ca8a04', '#7c3aed', '#db2777', '#0d9488',
];
const MERGE_FIELDS = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}'];

export function NewsletterEditor({
  value,
  onChange,
  placeholder = 'Write your newsletter content...',
  minHeight = '300px',
}: NewsletterEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph', 'image'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { style: 'color:#0647F7;text-decoration:underline' },
      }),
      Placeholder.configure({ placeholder }),
      FontSize,
      Color,
      FontFamily,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { style: 'max-width:100%;height:auto;border-radius:8px;' },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content focus:outline-none px-4 py-3 text-sm text-gray-900',
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
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

  const insertImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  useEffect(() => {
    if (editor && !value) {
      editor.commands.setContent('');
    }
  }, [value, editor]);

  if (!editor) return null;

  const Btn = ({ active, onClick, title, children, disabled }: {
    active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors text-xs font-medium ${
        active ? 'bg-gray-200 text-blue-600' : disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
      }`}>
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
        {/* Font family */}
        <select
          onChange={(e) => {
            if (!e.target.value) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(e.target.value).run();
          }}
          value={editor.getAttributes('textStyle').fontFamily || ''}
          className="px-1.5 py-1 rounded border border-gray-200 bg-white text-xs text-gray-600 focus:outline-none max-w-[110px]"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* Font size */}
        <select
          onChange={(e) => {
            if (!e.target.value) editor.chain().focus().unsetMark('textStyle').run();
            else editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run();
          }}
          value={editor.getAttributes('textStyle').fontSize || ''}
          className="px-1.5 py-1 rounded border border-gray-200 bg-white text-xs text-gray-600 focus:outline-none w-[65px]"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Color picker — click-based */}
        <ColorPicker editor={editor} colors={COLORS} />

        <Sep />

        {/* Formatting */}
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <span style={{ fontWeight: 700, fontSize: '14px' }}>B</span>
        </Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <span style={{ fontStyle: 'italic', fontSize: '14px', fontFamily: 'Georgia, serif' }}>I</span>
        </Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <span style={{ textDecoration: 'underline', fontSize: '14px' }}>U</span>
        </Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <span style={{ textDecoration: 'line-through', fontSize: '14px' }}>S</span>
        </Btn>

        <Sep />

        {/* Headings */}
        {([1, 2, 3] as const).map((l) => (
          <Btn key={l} active={editor.isActive('heading', { level: l })}
            onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()} title={`Heading ${l}`}>
            H{l}
          </Btn>
        ))}

        <Sep />

        {/* Lists */}
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          <Menu size={15} />
        </Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          1.
        </Btn>

        <Sep />

        {/* Alignment */}
        {(['left', 'center', 'right'] as const).map((a) => (
          <Btn key={a} active={editor.isActive({ textAlign: a })}
            onClick={() => editor.chain().focus().setTextAlign(a).run()} title={`Align ${a}`}>
            {a[0].toUpperCase()}
          </Btn>
        ))}

        <Sep />

        {/* Insert */}
        <Btn onClick={setLink} active={editor.isActive('link')} title="Insert link">
          <Link2 size={15} />
        </Btn>
        <Btn onClick={insertImage} title="Insert image">
          <GalleryAdd size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal line">
          <Minus size={15} />
        </Btn>

        {/* Merge fields */}
        <div className="ml-auto">
          <select
            onChange={(e) => { if (e.target.value) { editor.chain().focus().insertContent(e.target.value).run(); e.target.value = ''; } }}
            className="px-1.5 py-1 rounded border border-gray-200 bg-white text-xs text-gray-600 focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Variable...</option>
            {MERGE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
