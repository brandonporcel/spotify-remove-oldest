import dotenv from "dotenv";
import axios from "axios";

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
    data: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token ?? "",
    }).toString(),
  };

  try {
    const response = await axios(
      "https://accounts.spotify.com/api/token",
      authOptions
    );
    console.log("Response data:", response.data);
    if (response.data.access_token) {
      accessToken = response.data.access_token;
      console.log("New access token:", accessToken);
    } else {
      throw new Error("No access token received.");
    }
  } catch (error) {
    console.error("Error refreshing token:", error.message);
  }
};

const main = async () => {
  console.log("main refresh", credentials.refresh_token);
  console.log("main before", accessToken);
  await refreshToken();
  console.log("main after", accessToken);
};

main();
