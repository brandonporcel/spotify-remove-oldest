import dotenv from "dotenv";
import axios from "axios";
import { joinUrlParams } from "./utils";
import {
  Playlist,
  UserPlaylistTrackPagination,
  UserSavedTrackPagination,
} from "./types/definitions";
dotenv.config();

// 🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀
const DELETE_FROM_LIKED_SONGS = false;
const PLAYLIST_IDS: string[] = ["5M0teXNh3hNHp5dAADP5lO"];

const credentials = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  refresh_token: process.env.REFRESH_TOKEN,
};
let accessToken = "";

const refreshToken = async () => {
  // esto me funciono para eliminar de mis likes, no para eliminar de una playlist
  // var scope = "playlist-read-private playlist-modify-private user-read-private";

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
    const { total, items } = await getOldestLikedSongs({ limit: 1 });

    if (total === 1) {
      await deleteOldestLikedSong(items[0].track.id);
      console.log(`Se elimino la cancion ${items[0].track.name}`);
    } else {
      const songToDelete = await getOldestLikedSongs({
        limit: 1,
        offset: total - 1,
      });
      await deleteOldestLikedSong(songToDelete.items[0].track.id);
      console.log(`Se elimino la cancion ${songToDelete.items[0].track.name}`);
    }
  }

  PLAYLIST_IDS.forEach(async (id) => {
    const { snapshot_id, tracks } = await getPlaylist(id);
    if (tracks.total === 1) {
      await deleteOldestPlaylistSong(
        id,
        snapshot_id,
        tracks.items[0].track.uri
      );
      console.log(`Se elimino la cancion ${tracks.items[0].track.name}`);
    } else {
      const songFromPlaylistToDelete = await getPlaylistTracks(id, {
        limit: 1,
        offset: tracks.total - 1,
      });
      await deleteOldestPlaylistSong(
        id,
        snapshot_id,
        songFromPlaylistToDelete.items[0].track.uri
      );
      console.log(
        `Se elimino la cancion ${songFromPlaylistToDelete.items[0].track.name}`
      );
    }
  });
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
      body: JSON.stringify({
        tracks: [{ uri: songURI }],
        snapshot_id: snapshotId,
      }),
    };
    await axios(url, options);
  } catch (error: any) {
    console.log("Delete error:", error.message);
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
