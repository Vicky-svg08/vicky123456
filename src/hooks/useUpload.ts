import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface UploadedFile {
  path: string;        // storage path: {uid}/{timestamp}-{name}
  name: string;        // original file name
  size: number;        // bytes
  type: string;        // mime type
  signedUrl: string;   // temporary URL valid for 1 hour (refreshed on view)
}

export interface UploadProgress {
  file: string;
  percent: number;     // 0-100
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

const BUCKET = 'receipts';
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'image/webp', 'image/heic', 'application/pdf',
];
const ALLOWED_EXT = '.jpg, .jpeg, .png, .webp, .heic, .pdf';

// Get a fresh signed URL (1 hour expiry) — never use getPublicUrl on private buckets
export const getSignedUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1 hour
  if (error) { console.error('signed url error', error); return null; }
  return data.signedUrl;
};

export const useUpload = () => {
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `"${file.name}" is not allowed. Accepted: ${ALLOWED_EXT}`;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `"${file.name}" exceeds the ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  };

  // Upload one or more files, returns array of UploadedFile
  const uploadFiles = async (files: File[]): Promise<UploadedFile[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validate all files first before uploading anything
    for (const f of files) {
      const err = validateFile(f);
      if (err) throw new Error(err);
    }

    setUploading(true);
    setProgress(files.map(f => ({ file: f.name, percent: 0, status: 'uploading' })));

    const results: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${Date.now()}-${safeName}`;

      try {
        // Supabase JS v2 doesn't expose upload progress natively,
        // so we simulate progress: 30% → uploading, 100% → done
        setProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, percent: 30 } : p
        ));

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) throw uploadError;

        // Get signed URL immediately after upload
        const signedUrl = await getSignedUrl(path);
        if (!signedUrl) throw new Error('Could not generate signed URL');

        setProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, percent: 100, status: 'done' } : p
        ));

        results.push({
          path,
          name: file.name,
          size: file.size,
          type: file.type,
          signedUrl,
        });
      } catch (err: any) {
        setProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, percent: 0, status: 'error', error: err.message } : p
        ));
        throw err;
      }
    }

    setUploading(false);
    return results;
  };

  const deleteFile = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  };

  const refreshSignedUrl = async (path: string) => {
    return await getSignedUrl(path);
  };

  const reset = () => {
    setProgress([]);
    setUploading(false);
  };

  return {
    uploading,
    progress,
    uploadFiles,
    deleteFile,
    refreshSignedUrl,
    reset,
    ALLOWED_EXT,
    MAX_SIZE_MB,
  };
};
