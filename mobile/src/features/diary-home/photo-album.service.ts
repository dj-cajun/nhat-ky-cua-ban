import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppError } from '@/types/domain';
import {
  addPhoto,
  deletePhoto,
  listCorkSlotUris,
  listPhotosForUser,
  type PhotoAsset,
} from '@/features/local/repository';

export type { PhotoAsset };

function extFromMime(mime: string | null | undefined, uri: string): string {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('webp')) return 'webp';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = uri.toLowerCase().match(/\.(png|webp|jpe?g)(\?|$)/);
  if (m?.[1]?.startsWith('jp')) return 'jpg';
  if (m?.[1]) return m[1];
  return 'jpg';
}

/**
 * Copy picker URI into app documents so cork/album URIs survive restarts.
 * Falls back to the original URI on web or if copy fails.
 */
async function persistLocalCopy(
  userId: string,
  uri: string,
  mimeType?: string | null,
): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base || uri.startsWith('data:') || uri.startsWith('http')) {
    return uri;
  }
  const dir = `${base}diary-photos/${userId}/`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFromMime(mimeType, uri)}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

async function removeLocalFile(storagePath: string): Promise<void> {
  const base = FileSystem.documentDirectory;
  if (!base || !storagePath.startsWith(base)) return;
  try {
    await FileSystem.deleteAsync(storagePath, { idempotent: true });
  } catch {
    /* ignore */
  }
}

export async function loadAlbumPhotos(userId: string): Promise<PhotoAsset[]> {
  return listPhotosForUser(userId);
}

export async function loadCorkSlots(userId: string): Promise<Array<string | null>> {
  return listCorkSlotUris(userId);
}

/**
 * Open system library, persist locally, and register in album.
 * Returns null if the user canceled.
 */
export async function pickAndSavePhoto(userId: string): Promise<PhotoAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new AppError('FORBIDDEN', 'Photo library permission is required.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.72,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const asset = result.assets[0];
  const stored = await persistLocalCopy(userId, asset.uri, asset.mimeType);
  return addPhoto(userId, stored);
}

export async function removeAlbumPhoto(ownerId: string, photo: PhotoAsset): Promise<void> {
  await deletePhoto(ownerId, photo.id);
  await removeLocalFile(photo.storagePath);
}
