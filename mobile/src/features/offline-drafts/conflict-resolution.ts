export type ConflictChoice = 'keep_server' | 'overwrite_with_local';

/**
 * 1.0 conflict policy: never silently overwrite.
 * Caller must present [View server] [Overwrite with mine].
 */
export function resolveDiaryConflict(choice: ConflictChoice): ConflictChoice {
  return choice;
}

export function isNewerServerVersion(input: {
  serverUpdatedAt: string;
  knownServerUpdatedAt?: string;
}): boolean {
  if (!input.knownServerUpdatedAt) return false;
  return input.serverUpdatedAt !== input.knownServerUpdatedAt;
}
