import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white dark:bg-slate-800 focus-within:border-sigap-500 focus-within:ring-2 focus-within:ring-sigap-100 transition">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('bold') ? 'bg-slate-200 text-sigap-700 font-bold' : ''
          }`}
          title="Tebal"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('italic') ? 'bg-slate-200 text-sigap-700' : ''
          }`}
          title="Miring"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('strike') ? 'bg-slate-200 text-sigap-700' : ''
          }`}
          title="Coret"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-sigap-700 font-bold' : ''
          }`}
          title="Judul 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-sigap-700 font-bold' : ''
          }`}
          title="Judul 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('bulletList') ? 'bg-slate-200 text-sigap-700' : ''
          }`}
          title="Daftar Poin"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('orderedList') ? 'bg-slate-200 text-sigap-700' : ''
          }`}
          title="Daftar Nomor"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg hover:bg-slate-200 transition ${
            editor.isActive('blockquote') ? 'bg-slate-200 text-sigap-700' : ''
          }`}
          title="Kutipan"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"
          title="Urungkan"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"
          title="Ulangi"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Konten Editor */}
      <div className="p-4 min-h-[220px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
