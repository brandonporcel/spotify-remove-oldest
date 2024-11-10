import dotenv from "dotenv";
import axios from "axios";
import { joinUrlParams } from "./utils";
import {
  PlaylistTrack,
  Playlist,
  UserPlaylistTrackPagination,
  UserSavedTrackPagination,
  SavedTrack,
} from "./types/definitions";
dotenv.config();

// 🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀
const DELETE_FROM_LIKED_SONGS = false;
const PLAYLIST_IDS: string[] = ["2lzWkd6ERuRR46B2qshGho"];

const credentials = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  refresh_token: process.env.REFRESH_TOKEN,
};
let accessToken = "";

const refreshToken = async () => {
  // LIKED AND PLAYLIST
  //  var scope = "playlist-modify-public playlist-modify-private";
  const { client_id, client_secret, refresh_token } = credentials;

  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
    data: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token ?? "",
    }).toString(),
  };

  try {
    const { data } = await axios(
      "https://accounts.spotify.com/api/token",
      authOptions
    );
    if (!data.access_token) {
      throw new Error("No access token received.");
    }
    accessToken = data.access_token;
  } catch (error: any) {
    console.error("Error refreshing token:", error.message);
  }
};

const main = async () => {
  await refreshToken();
  if (DELETE_FROM_LIKED_SONGS) {
    const allLikedSongs = await getAllLikedSongs();

    if (allLikedSongs.length > 0) {
      const sortedLikedSongs = allLikedSongs.sort(
        (a, b) =>
          new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
      );

      const oldestLikedSong = sortedLikedSongs[0];
      await deleteOldestLikedSong(oldestLikedSong.track.id);
      console.log(`Se eliminó la canción ${oldestLikedSong.track.name}`);
    }
  }

  for (const id of PLAYLIST_IDS) {
    const { snapshot_id } = await getPlaylist(id);
    const allTracks = await getAllPlaylistTracks(id);
    const sortedTracks = allTracks.sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    );
    if (sortedTracks.length > 0) {
      const oldestTrack = sortedTracks[0];
      await deleteOldestPlaylistSong(id, snapshot_id, oldestTrack.track.uri);
      console.log(`Se eliminó la canción ${oldestTrack.track.name}`);
    }
  }
};

const getAllLikedSongs = async () => {
  let allLikedSongs: SavedTrack[] = [];
  let limit = 50;

  const firstPage = await getOldestLikedSongs({ limit, offset: 0 });
  allLikedSongs = allLikedSongs.concat(firstPage.items);

  const totalPages = Math.ceil(firstPage.total / limit);

  for (let page = 1; page < totalPages; page++) {
    const offset = page * limit;
    const pageData = await getOldestLikedSongs({ limit, offset });
    allLikedSongs = allLikedSongs.concat(pageData.items);
  }

  return allLikedSongs;
};

const getAllPlaylistTracks = async (playlistId: string) => {
  let allTracks: PlaylistTrack[] = [];
  let limit = 100;

  const firstPage = await getPlaylistTracks(playlistId, { limit, offset: 0 });
  allTracks = allTracks.concat(firstPage.items);

  const totalPages = Math.ceil(firstPage.total / limit);

  for (let page = 1; page < totalPages; page++) {
    const offset = page * limit;
    const pageData = await getPlaylistTracks(playlistId, { limit, offset });
    allTracks = allTracks.concat(pageData.items);
  }

  return allTracks;
};

const deleteOldestPlaylistSong = async (
  playlistId: string,
  snapshotId: string,
  songURI: string
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

const getPlaylist = async (playlistId: string) => {
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

const getPlaylistTracks = async (playlistId: string, params = {}) => {
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

const deleteOldestLikedSong = async (id: string) => {
  try {
    let url = "https://api.spotify.com/v1/me/tracks";
    const options = {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      data: JSON.stringify({ ids: [id] }),
    };
    await axios(url, options);
  } catch (error: any) {
    throw Error("Error DELETING oldest song. " + error.message);
  }
};

const getOldestLikedSongs = async (params = {}) => {
  try {
    let url = joinUrlParams(params, "https://api.spotify.com/v1/me/tracks");
    const options = {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const { data } = (await axios(url, options)) as {
      data: UserSavedTrackPagination;
    };
    return data;
  } catch (error: any) {
    throw new Error(`Error getting liked songs: ${error.message}`);
  }
};

main();
