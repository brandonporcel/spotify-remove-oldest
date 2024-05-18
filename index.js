import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const credentials = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  refresh_token: process.env.REFRESH_TOKEN,
};
let accessToken = "";

const refreshToken = async () => {
  const { client_id, client_secret, refresh_token } = credentials;

  const authOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  };

  try {
    const response = await fetch(
      "https://accounts.spotify.com/api/token",
      authOptions
    );
    if (!response.ok) {
      throw new Error(
        `Failed to refresh token. HTTP error! Status: ${response.status}`
      );
    }
    const data = await response.json();
    accessToken = data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
  }
};

const main = async () => {
  const playlistsIds = ["25jCy3aG3muLRDT8wRwufw"];
  await refreshToken();
  playlistsIds.forEach(getPlaylist);
};

const deleteOldestSong = async (playlistId, snapshotId, songURI) => {
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
    await fetch(url, options);
  } catch (error) {
    console.log("Delete error:", error);
  }
};

const getPlaylist = async (playlistId) => {
  try {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
    const response = await fetch(url, options);
    const data = await response.json();
    if (response.ok && data.tracks.items.length > 0) {
      const {
        snapshot_id,
        tracks: { items },
      } = data;
      const oldSongURI = items[0].track.uri;
      await deleteOldestSong(playlistId, snapshot_id, oldSongURI);
    }
  } catch (error) {
    console.error("Error getting playlist:", error);
  }
};

main();
