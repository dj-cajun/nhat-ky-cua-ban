export type SpotifyTrackSearchResult = {
  id: string;
  uri: string;
  externalUrl: string;
  trackName: string;
  artistNames: string[];
  albumName: string | null;
  artworkUrl: string | null;
  durationMs: number;
  explicit: boolean;
};

export type DiaryMusicCard = {
  id: string;
  diaryEntryId: string;
  externalTrackId: string;
  spotifyUri: string;
  externalUrl: string;
  trackName: string;
  artistNames: string[];
  albumName: string | null;
  artworkUrl: string | null;
  durationMs: number | null;
  explicit: boolean;
};
