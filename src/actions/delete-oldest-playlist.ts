import axios from "axios";
import {
  Playlist,
  PlaylistTrack,
  UserPlaylistTrackPagination,
} from "../types/definitions";
import { joinUrlParams } from "../utils";

const getPlaylist = async (playlistId: string, accessToken: string) => {
  try {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}`;
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const { data } = (await axios(url, options)) as { data: Playlist };
    return data;
  } catch (error: any) {
    throw new Error(`Error getting playlist: ${error.message}`);
  }
};

const getPlaylistTracks = async (
  playlistId: string,
  params = {},
  accessToken: string
) => {
  try {
    const url = joinUrlParams(
      params,
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
    );
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const { data } = (await axios(url, options)) as {
      data: UserPlaylistTrackPagination;
    };
    return data;
  } catch (error: any) {
    throw new Error(`Error getting playlist songs: ${error.message}`);
  }
};

const getAllPlaylistTracks = async (
  playlistId: string,
  accessToken: string
) => {
  let allTracks: PlaylistTrack[] = [];
  let limit = 100;

  const firstPage = await getPlaylistTracks(
    playlistId,
    { limit, offset: 0 },
    accessToken
  );
  allTracks = allTracks.concat(firstPage.items);

  const totalPages = Math.ceil(firstPage.total / limit);

  for (let page = 1; page < totalPages; page++) {
    const offset = page * limit;
    const pageData = await getPlaylistTracks(
      playlistId,
      { limit, offset },
      accessToken
    );
    allTracks = allTracks.concat(pageData.items);
  }

  return allTracks;
};

const deleteOldestPlaylistSong = async (
  playlistId: string,
  snapshotId: string,
  songURI: string,
  accessToken: string
) => {
  try {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const options = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      data: JSON.stringify({
        tracks: [{ uri: songURI }],
        snapshot_id: snapshotId,
      }),
    };
    await axios(url, options);
  } catch (error: any) {
    console.log("Error deleting oldest song form playlist:", error.message);
  }
};

const handleDeleteOldestPlaylist = async (
  accessToken: string,
  PLAYLIST_IDS: string[]
) => {
  let songs: { playlist: string; name: string }[] = [];
  for (const id of PLAYLIST_IDS) {
    const { snapshot_id, name } = await getPlaylist(id, accessToken);
    const allTracks = await getAllPlaylistTracks(id, accessToken);
    const sortedTracks = allTracks.sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    );
    if (sortedTracks.length > 0) {
      const oldestTrack = sortedTracks[0];
      await deleteOldestPlaylistSong(
        id,
        snapshot_id,
        oldestTrack.track.uri,
        accessToken
      );
      songs.push({ name: oldestTrack.track.name, playlist: name });
    }
  }
  return songs;
};

export default handleDeleteOldestPlaylist;
