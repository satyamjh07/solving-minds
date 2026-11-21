/**
 * Cloudinary Unsigned Upload Utility
 * Used for community posts and profile pictures.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  onProgress?: (percent: number) => void;
}

export async function uploadToCloudinary(file: File, options: UploadOptions = {}): Promise<string> {
  const {
    folder = 'study_aura',
    maxSizeMB = 5,
    onProgress
  } = options;

  // Validate environment
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary configuration is missing. Check NEXT_PUBLIC_CLOUDINARY environment variables.');
  }

  // Validate file
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit.`);
  }

  // Build FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_URL);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        let errMsg = 'Upload failed';
        try {
          const errData = JSON.parse(xhr.responseText);
          errMsg = errData.error?.message || errMsg;
        } catch (_) {}
        reject(new Error(errMsg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

/**
 * Transforms a Cloudinary URL to use auto-optimization (f_auto, q_auto).
 */
export function getOptimizedUrl(url: string | null | undefined, extraTransforms: string = ''): string {
  if (!url || !url.includes('cloudinary.com')) return url || '';
  const transforms = ['f_auto', 'q_auto', ...(extraTransforms ? [extraTransforms] : [])].join(',');
  return url.replace('/upload/', `/upload/${transforms}/`);
}
