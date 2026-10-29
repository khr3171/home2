// Compress locally. The original image is never uploaded by this function.
export async function compressPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('JPG, PNG, WEBP 사진을 골라 주세요.');
  if (file.size > 20 * 1024 * 1024) throw new Error('원본 사진은 20MB 이하로 골라 주세요.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 50_000_000) throw new Error('사진 크기가 너무 커요. 크기를 줄인 뒤 다시 골라 주세요.');
    const limit = 102399;
    for (const edge of [960, 800, 640, 480]) {
      const ratio = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('사진을 처리할 수 없어요. 다른 브라우저에서 시도해 주세요.');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for (const quality of [.76,.64,.52,.4]) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve,'image/webp',quality));
        // Unsupported browsers may return PNG: use JPEG as a predictable fallback.
        if (!blob || blob.type !== 'image/webp') blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',quality));
        if (blob && blob.size <= limit) {
          const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
          return new File([blob],`photo.${ext}`,{type:blob.type});
        }
      }
      canvas.width = canvas.height = 1;
    }
    throw new Error('100KB 이하로 줄이지 못했어요. 다른 사진을 골라 주세요.');
  } finally { bitmap.close(); }
}
