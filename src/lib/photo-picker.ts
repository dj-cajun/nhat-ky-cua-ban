/** 앨범 사진 선택 — Zalo chooseImage + 웹 file input 폴백 */
export async function pickAlbumPhoto(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const isZalo =
      /Zalo/i.test(navigator.userAgent) ||
      Boolean((window as Window & { ZJSBridge?: unknown }).ZJSBridge);
    if (!isZalo) {
      const fromFile = await pickFromFileInput();
      if (fromFile) return fromFile;
    }
  }

  try {
    const { chooseImage } = await import('zmp-sdk/apis');
    const { filePaths } = await chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
    });
    const path = filePaths?.[0];
    if (!path) return pickFromFileInput();
    if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('/')) {
      return path;
    }
    return path;
  } catch {
    return pickFromFileInput();
  }
}

function pickFromFileInput(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}
