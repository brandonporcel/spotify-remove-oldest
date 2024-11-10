import axios from "axios";
import { joinUrlParams } from "../utils";
import { SavedTrack, UserSavedTrackPagination } from "../types/definitions";

const getOldestLikedSongs = async (params = {}, accessToken: string) => {
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

const getAllLikedSongs = async (accessToken: string) => {
  let allLikedSongs: SavedTrack[] = [];
  let limit = 50;

  const firstPage = await getOldestLikedSongs(
    { limit, offset: 0 },
    accessToken
  );
  allLikedSongs = allLikedSongs.concat(firstPage.items);

  const totalPages = Math.ceil(firstPage.total / limit);

  for (let page = 1; page < totalPages; page++) {
    const offset = page * limit;
    const pageData = await getOldestLikedSongs({ limit, offset }, accessToken);
    allLikedSongs = allLikedSongs.concat(pageData.items);
  }

  return allLikedSongs;
};

const deleteOldestLikedSong = async (id: string, accessToken: string) => {
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

const handleDeleteOldestLiked = async (accessToken: string) => {
  const allLikedSongs = await getAllLikedSongs(accessToken);
  if (allLikedSongs.length > 0) {
    const sortedLikedSongs = allLikedSongs.sort(
      (a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime()
    );

    const oldestLikedSong = sortedLikedSongs[0];
    await deleteOldestLikedSong(oldestLikedSong.track.id, accessToken);
    return oldestLikedSong.track.name;
  }
};

export default handleDeleteOldestLiked;
