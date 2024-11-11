import dotenv from "dotenv";
import axios from "axios";
import handleDeleteOldestLiked from "./actions/delete-oldest-liked";
import handleDeleteOldestPlaylist from "./actions/delete-oldest-playlist";
import { getIdFromURL } from "./utils";
dotenv.config();

// 🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀🎧💿📀
const DELETE_FROM_LIKED_SONGS = true;
const PLAYLIST_IDS: string[] = [
  "https://open.spotify.com/playlist/2lzWkd6ERuRR46B2qshGho?si=9b36eea6abf1427f",
];

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
    try {
      const songName = await handleDeleteOldestLiked(accessToken);
      console.log(`La canción '${songName}' fue eliminada de 'liked songs'.`);
    } catch (error: any) {
      console.log("DELETE_FROM_LIKED_SONGS ERROR: " + error.message);
    }
  }

  const ids = PLAYLIST_IDS.map(getIdFromURL).filter((el) => el !== null);
  if (ids.length > 0) {
    const deletedSongs = await handleDeleteOldestPlaylist(accessToken, ids);
    deletedSongs.forEach((song) => {
      console.log(
        `La canción '${song.name}' fue eliminada de la playlist ${song.playlist}.`
      );
    });
  }
};

main();
