interface Track {
  album: {
    album_type: string;
    artists: Artist[];
    available_markets: string[];
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    images: Image[];
    is_playable: boolean;
    name: string;
    release_date: string;
    release_date_precision: string;
    total_tracks: number;
    type: string;
    uri: string;
  };
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc: string;
  };
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  is_local: boolean;
  is_playable: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}

interface Artist {
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

interface Image {
  height: number;
  width: number;
  url: string;
}

export interface SavedTrack {
  added_at: string;
  track: Track;
}

export interface UserSavedTrackPagination {
  href: string;
  items: SavedTrack[];
  limit: number;
  next: string;
  offset: number;
  previous: null | any;
  total: number;
}

interface PlaylistTrack {
  added_at: string;
  added_by: {
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    type: "user";
    uri: string;
  };
  is_local: boolean;
  primary_color: string | null;
  track: {
    preview_url: string;
    available_markets: string[];
    explicit: boolean;
    type: "track";
    episode: boolean;
    track: boolean;
    album: {
      available_markets: string[];
      type: "album";
      album_type: "album";
      href: string;
      id: string;
      images: Image[];
      name: string;
      release_date: string;
      release_date_precision: "day";
      uri: string;
      artists: Artist[];
      external_urls: object;
      total_tracks: number;
    };
    artists: Artist[];
    disc_number: number;
    track_number: number;
    duration_ms: number;
    external_ids: {
      isrc: string;
    };
    external_urls: {
      spotify: string;
    };
    href: string;
    id: string;
    name: string;
    popularity: number;
    uri: string;
    is_local: boolean;
  };
  video_thumbnail: {
    url: string | null;
  };
}

export interface Playlist {
  collaborative: boolean;
  description: string;
  external_urls: any;
  followers: any;
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: any;
  public: boolean;
  snapshot_id: string;
  tracks: UserPlaylistTrackPagination;
  type: string;
  uri: string;
}
export interface SpotifyTrackPagination<T> {
  href: string;
  items: T[];
  limit: number;
  next: string;
  offset: number;
  previous: null | any;
  total: number;
}

export interface UserSavedTrackPagination
  extends SpotifyTrackPagination<SavedTrack> {}

export interface UserPlaylistTrackPagination
  extends SpotifyTrackPagination<PlaylistTrack> {}
