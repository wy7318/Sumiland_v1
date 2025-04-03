import { supabase } from './supabase';

export async function uploadImage(file: File, bucket: string = 'Sumiland Design') {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const session = await supabase.auth.getSession();

    if (!session.data.session) {
      throw new Error('User is not authenticated');
    } else {
      console.log('ausjssjssj');
    }

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('Available Buckets:', buckets);


    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error };
  }
}

export async function deleteImage(url: string, bucket: string = 'Sumiland Design') {
  try {
    // Extract file path from URL
    const filePath = url.split(`/${bucket}/`)[1];
    if (!filePath) throw new Error('Invalid file URL');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { error };
  }
}