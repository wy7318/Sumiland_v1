import { useState, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadImage } from '../../lib/storage';
import { cn } from '../../lib/utils';

interface Props {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  className?: string;
}

export function ImageUpload({ onImageUploaded, currentImage, className = '' }: Props) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const { url, error } = await uploadImage(file);
      if (error) throw error;
      if (url) {
        onImageUploaded(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all duration-200",
            isDragging
              ? "border-primary-500 bg-primary-50"
              : "border-gray-300 hover:border-primary-500 hover:bg-gray-50",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className={cn(
            "w-8 h-8",
            isDragging ? "text-primary-500" : "text-gray-400"
          )} />
          <div className="text-center">
            <p className={cn(
              "text-sm",
              isDragging ? "text-primary-600" : "text-gray-600"
            )}>
              {isDragging ? (
                "Drop image here"
              ) : (
                <>
                  <span className="font-medium">Click to upload</span> or drag and drop
                  <br />
                  <span className="text-gray-500">PNG, JPG, GIF up to 5MB</span>
                </>
              )}
            </p>
          </div>
          {uploading && (
            <div className="mt-2 text-sm text-gray-500">
              Uploading...
            </div>
          )}
        </div>
      )}
    </div>
  );
}