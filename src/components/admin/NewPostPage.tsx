// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { motion } from 'framer-motion';
// import { Save, X } from 'lucide-react';
// import { supabase } from '../../lib/supabase';
// import { getCurrentUser } from '../../lib/auth';
// import { ImageUpload } from './ImageUpload';
// import { RichTextEditor } from './RichTextEditor';
// import { useAuth } from '../../contexts/AuthContext';
// import { useOrganization } from '../../contexts/OrganizationContext';

// export function NewPostPage() {
//   const navigate = useNavigate();
//   const { organizations } = useAuth();
//   const [loading, setLoading] = useState(false);
//   const { selectedOrganization } = useOrganization();
//   const [error, setError] = useState<string | null>(null);
//   const [formData, setFormData] = useState({
//     title: '',
//     content: '',
//     excerpt: '',
//     featured_image: '',
//   });

//   const handleImageUploaded = (url: string) => {
//     setFormData(prev => ({ ...prev, featured_image: url }));
//   };

//   const handleContentChange = (html: string) => {
//     setFormData(prev => ({ ...prev, content: html }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);

//     try {
//       const userData = await getCurrentUser();
//       console.log('User Data:', userData);
//       console.log('User:', userData?.user);
//       if (!userData?.user) throw new Error('Not authenticated');

//       // Get the first organization (you might want to add organization selection)
//       const organizationId = selectedOrganization?.id;
//       if (!organizationId) throw new Error('No organization available');

//       // First check if user has an author record
//       const { data: authorData } = await supabase
//         .from('authors')
//         .select('id')
//         .eq('id', userData.user.id)
//         .single();

//       if (!authorData) {
//         // Create author record if it doesn't exist
//         const { error: authorError } = await supabase
//           .from('authors')
//           .insert([
//             {
//               id: userData.user.id,
//               name: userData.profile?.name || 'Anonymous',
//               email: userData.user.email || '',
//               organization_id: organizationId,
//               created_at: new Date().toISOString()
//             }
//           ]);

//         if (authorError) throw authorError;
//       }

//       const { error: insertError } = await supabase
//         .from('posts')
//         .insert([
//           {
//             title: formData.title,
//             slug: formData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
//             content: formData.content,
//             excerpt: formData.excerpt,
//             featured_image: formData.featured_image,
//             author_id: userData.user.id,
//             organization_id: organizationId,
//             published: false
//           }
//         ]);

//       if (insertError) throw insertError;
//       navigate('/admin/posts');
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to create post');
//       console.error('Error creating post:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (organizations.length === 0) {
//     return (
//       <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
//         You need to be part of an organization to create posts.
//       </div>
//     );
//   }

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       className="bg-white rounded-lg shadow-md p-6"
//     >
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Create New Post</h1>
//         <button
//           onClick={() => navigate('/admin/posts')}
//           className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
//         >
//           <X className="w-6 h-6" />
//         </button>
//       </div>

//       {error && (
//         <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
//           {error}
//         </div>
//       )}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div>
//           <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
//             Title
//           </label>
//           <input
//             type="text"
//             id="title"
//             required
//             value={formData.title}
//             onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
//             className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//           />
//         </div>

//         <div>
//           <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
//             Excerpt
//           </label>
//           <textarea
//             id="excerpt"
//             rows={3}
//             value={formData.excerpt}
//             onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
//             className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Featured Image
//           </label>
//           <ImageUpload
//             onImageUploaded={handleImageUploaded}
//             currentImage={formData.featured_image}
//           />
//         </div>

//         <div>
//           <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
//             Content
//           </label>
//           {/* Replace textarea with RichTextEditor */}
//           <RichTextEditor
//             content={formData.content}
//             onChange={handleContentChange}
//           />
//         </div>

//         <div className="flex justify-end space-x-4">
//           <button
//             type="button"
//             onClick={() => navigate('/admin/posts')}
//             className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={loading}
//             className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
//           >
//             <Save className="w-4 h-4 mr-2" />
//             {loading ? 'Saving...' : 'Save Post'}
//           </button>
//         </div>
//       </form>
//     </motion.div>
//   );
// }


import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, X, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { ImageUpload } from './ImageUpload';
import { RichTextEditor } from './RichTextEditor';
import { AIContentGenerator } from './AIContentGenerator';
import { generateExcerpt } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import type { RichTextEditorRef } from './RichTextEditor';

export function NewPostPage() {
  const navigate = useNavigate();
  const { organizations } = useAuth();
  const [loading, setLoading] = useState(false);
  const [excerptLoading, setExcerptLoading] = useState(false);
  const { selectedOrganization } = useOrganization();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    featured_image: '',
  });

  // Reference to the editor to allow programmatic content insertion
  const editorRef = useRef<RichTextEditorRef>(null);

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, featured_image: url }));
  };

  const handleContentChange = (html: string) => {
    setFormData(prev => ({ ...prev, content: html }));
  };

  // Handler for when AI generates content
  const handleAIContentGenerated = (generatedContent: string) => {
    // If the content is empty, replace it
    if (!formData.content.trim()) {
      setFormData(prev => ({ ...prev, content: generatedContent }));
    } else {
      // If the editor ref is available, insert at cursor position
      if (editorRef.current) {
        editorRef.current.insertContent(generatedContent);
      } else {
        // Fallback: append to existing content
        setFormData(prev => ({
          ...prev,
          content: prev.content + '\n\n' + generatedContent
        }));
      }
    }
  };

  // Generate excerpt using AI
  const handleGenerateExcerpt = async () => {
    if (!formData.title && !formData.content) {
      setError('Please provide a title or content before generating an excerpt.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setExcerptLoading(true);
    try {
      const response = await generateExcerpt(formData.title, formData.content);

      if (response.error) {
        setError(response.error);
        setTimeout(() => setError(null), 3000);
      } else {
        setFormData(prev => ({ ...prev, excerpt: response.content }));
      }
    } catch (err) {
      setError('Failed to generate excerpt. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setExcerptLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userData = await getCurrentUser();
      console.log('User Data:', userData);
      console.log('User:', userData?.user);
      if (!userData?.user) throw new Error('Not authenticated');

      // Get the first organization (you might want to add organization selection)
      const organizationId = selectedOrganization?.id;
      if (!organizationId) throw new Error('No organization available');

      // First check if user has an author record
      const { data: authorData } = await supabase
        .from('authors')
        .select('id')
        .eq('id', userData.user.id)
        .single();

      if (!authorData) {
        // Create author record if it doesn't exist
        const { error: authorError } = await supabase
          .from('authors')
          .insert([
            {
              id: userData.user.id,
              name: userData.profile?.name || 'Anonymous',
              email: userData.user.email || '',
              organization_id: organizationId,
              created_at: new Date().toISOString()
            }
          ]);

        if (authorError) throw authorError;
      }

      const { error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            title: formData.title,
            slug: formData.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
            content: formData.content,
            excerpt: formData.excerpt,
            featured_image: formData.featured_image,
            author_id: userData.user.id,
            organization_id: organizationId,
            published: false
          }
        ]);

      if (insertError) throw insertError;
      navigate('/admin/posts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
        You need to be part of an organization to create posts.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create New Post</h1>
        <button
          onClick={() => navigate('/admin/posts')}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
              Excerpt
            </label>

            {/* AI excerpt generator button */}
            <button
              type="button"
              onClick={handleGenerateExcerpt}
              disabled={excerptLoading}
              className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {excerptLoading ? 'Generating...' : 'Auto-generate excerpt'}
            </button>
          </div>

          <textarea
            id="excerpt"
            rows={3}
            value={formData.excerpt}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Featured Image
          </label>
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            currentImage={formData.featured_image}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Content
            </label>

            {/* Add AI Content Generator */}
            <AIContentGenerator
              onContentGenerated={handleAIContentGenerated}
              existingContent={formData.content}
              existingTitle={formData.title}
            />
          </div>

          {/* Rich Text Editor */}
          <RichTextEditor
            content={formData.content}
            onChange={handleContentChange}
            ref={editorRef}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/posts')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}