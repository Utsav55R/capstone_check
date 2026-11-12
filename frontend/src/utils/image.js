const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Center-crops an uploaded image to a square and downsizes it to a compact JPEG
// data URL, so profile photos stay small enough to store with the profile.
export function imageFileToAvatarDataUrl(file, size = 320) {
  return new Promise((resolve, reject) => {
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      reject(new Error('unsupported'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('unreadable'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('unreadable'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
