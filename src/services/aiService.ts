// services/aiService.ts
import { supabase } from '../lib/supabase';

// Add at the top of your aiService.ts file
export const OPENAI_MODELS = {
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_4: 'gpt-4',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4O: 'gpt-4o'
};

interface AIGenerationParams {
  prompt: string;
  title?: string;
  existingContent?: string;
  tone?: string;
  contentLength?: string;
  contentType?: string;
}

interface AIGenerationResponse {
  content: string;
  error?: string;
}

/**
 * Generate content using OpenAI via Supabase Edge Function
 */
export async function generateContent(params: AIGenerationParams): Promise<AIGenerationResponse> {
  try {
    // Get session for auth (optional - you can remove this if your functions don't require auth)
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    // Define headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth headers if session exists
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['x-user-id'] = session.user.id;
    }

    // First try using Supabase's built-in functions.invoke method
    try {
      console.log('Attempting to call Edge Function via Supabase client...');
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: params,
        headers: session ? { 'x-user-id': session.user.id } : undefined
      });

      if (error) throw error;
      
      return {
        content: data.content || '',
        error: data.error
      };
    } catch (supabaseError) {
      console.warn('Supabase functions.invoke failed, falling back to fetch:', supabaseError);
      
      // Fallback to direct fetch if the Supabase method fails
      // This might work better with CORS in some environments
      const url = `${supabase.functions.url}/generate-content`;
      console.log('Attempting direct fetch to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        credentials: 'omit' // Important for CORS
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.content || '',
        error: data.error
      };
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to generate content'
    };
  }
}

/**
 * Generate an excerpt from post content using Supabase Edge Function
 */
export async function generateExcerpt(title: string, content?: string): Promise<AIGenerationResponse> {
  try {
    // Get session for auth (optional)
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    // Define headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth headers if session exists
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      headers['x-user-id'] = session.user.id;
    }

    // First try using Supabase's built-in functions.invoke method
    try {
      console.log('Attempting to call Excerpt Edge Function via Supabase client...');
      const { data, error } = await supabase.functions.invoke('generate-excerpt', {
        body: { title, content },
        headers: session ? { 'x-user-id': session.user.id } : undefined
      });

      if (error) throw error;
      
      return {
        content: data.content || '',
        error: data.error
      };
    } catch (supabaseError) {
      console.warn('Supabase functions.invoke failed, falling back to fetch:', supabaseError);
      
      // Fallback to direct fetch if the Supabase method fails
      const url = `${supabase.functions.url}/generate-excerpt`;
      console.log('Attempting direct fetch to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, content }),
        credentials: 'omit' // Important for CORS
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        content: data.content || '',
        error: data.error
      };
    }
  } catch (error) {
    console.error('Error generating excerpt:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Failed to generate excerpt'
    };
  }
}

/**
 * Development fallback: Mock content generation for testing without API calls
 * Use this during development if you can't get the Edge Functions working
 */
export async function mockGenerateContent(params: AIGenerationParams): Promise<AIGenerationResponse> {
  return new Promise(resolve => {
    // Simulate API delay
    setTimeout(() => {
      resolve({
        content: `<h2>Sample Generated Content</h2>
        <p>This is mock content generated for testing without making actual API calls.</p>
        <p>Your prompt was: "${params.prompt}"</p>
        <p>Here's what a real response might look like:</p>
        <ul>
          <li>It would be formatted with proper HTML</li>
          <li>It would be relevant to your topic</li>
          <li>It would match your requested tone: ${params.tone || 'default'}</li>
          <li>It would be approximately the length you requested: ${params.contentLength || 'medium'}</li>
        </ul>
        <p>To test with real AI-generated content, you'll need to set up the Supabase Edge Functions properly.</p>`
      });
    }, 1500);
  });
}

/**
 * Development fallback: Mock excerpt generation for testing without API calls
 */
export async function mockGenerateExcerpt(title: string, content?: string): Promise<AIGenerationResponse> {
  return new Promise(resolve => {
    // Simulate API delay
    setTimeout(() => {
      resolve({
        content: `This is a mock excerpt for a blog post titled "${title}". In a real implementation, this would be generated by the OpenAI API to create an engaging summary that entices readers to read the full article. The excerpt would be SEO-friendly and highlight the key points of your content.`
      });
    }, 800);
  });
}