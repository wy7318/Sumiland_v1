import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Indent,
    Outdent,
    Heading1,
    Heading2,
    Heading3,
    Type
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            Underline,
            TextStyle,
            FontFamily,
            Color,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    const toggleBold = () => editor.chain().focus().toggleBold().run();
    const toggleItalic = () => editor.chain().focus().toggleItalic().run();
    const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
    const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
    const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
    const setTextAlignLeft = () => editor.chain().focus().setTextAlign('left').run();
    const setTextAlignCenter = () => editor.chain().focus().setTextAlign('center').run();
    const setTextAlignRight = () => editor.chain().focus().setTextAlign('right').run();
    const indent = () => editor.chain().focus().indent().run();
    const outdent = () => editor.chain().focus().outdent().run();
    const setHeading = (level: 1 | 2 | 3) => editor.chain().focus().toggleHeading({ level }).run();

    return (
        <div className="rich-text-editor border border-gray-300 rounded-lg overflow-hidden">
            <div className="toolbar bg-gray-100 p-2 flex flex-wrap gap-1 border-b border-gray-300">
                <button
                    onClick={toggleBold}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
                    title="Bold"
                    type="button"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onClick={toggleItalic}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
                    title="Italic"
                    type="button"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onClick={toggleUnderline}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
                    title="Underline"
                    type="button"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </button>

                <div className="border-r border-gray-300 mx-1 h-6 my-auto"></div>

                <button
                    onClick={() => setHeading(1)}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
                    title="Heading 1"
                    type="button"
                >
                    <Heading1 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setHeading(2)}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
                    title="Heading 2"
                    type="button"
                >
                    <Heading2 className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setHeading(3)}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
                    title="Heading 3"
                    type="button"
                >
                    <Heading3 className="w-4 h-4" />
                </button>

                <div className="border-r border-gray-300 mx-1 h-6 my-auto"></div>

                <button
                    onClick={toggleBulletList}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
                    title="Bullet List"
                    type="button"
                >
                    <List className="w-4 h-4" />
                </button>
                <button
                    onClick={toggleOrderedList}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
                    title="Ordered List"
                    type="button"
                >
                    <ListOrdered className="w-4 h-4" />
                </button>

                <div className="border-r border-gray-300 mx-1 h-6 my-auto"></div>

                <button
                    onClick={setTextAlignLeft}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
                    title="Align Left"
                    type="button"
                >
                    <AlignLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={setTextAlignCenter}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
                    title="Align Center"
                    type="button"
                >
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button
                    onClick={setTextAlignRight}
                    className={`p-2 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
                    title="Align Right"
                    type="button"
                >
                    <AlignRight className="w-4 h-4" />
                </button>

                <div className="border-r border-gray-300 mx-1 h-6 my-auto"></div>

                <button
                    onClick={indent}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Indent"
                    type="button"
                >
                    <Indent className="w-4 h-4" />
                </button>
                <button
                    onClick={outdent}
                    className="p-2 rounded hover:bg-gray-200"
                    title="Outdent"
                    type="button"
                >
                    <Outdent className="w-4 h-4" />
                </button>

                <div className="border-r border-gray-300 mx-1 h-6 my-auto"></div>

                <select
                    className="p-1 rounded border border-gray-300 bg-white text-sm"
                    onChange={(e) => {
                        editor.chain().focus().setFontFamily(e.target.value).run();
                    }}
                >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                </select>

                <input
                    type="color"
                    onInput={(event) => {
                        editor.chain().focus().setColor((event.target as HTMLInputElement).value).run();
                    }}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer mx-1"
                    title="Text Color"
                />
            </div>

            <EditorContent
                editor={editor}
                className="p-4 min-h-[240px] focus:outline-none prose max-w-none"
            />
        </div>
    );
};