import express from "express";
import dotenv from "dotenv";
import axios, { AxiosRequestConfig } from "axios";
import color from "picocolors";
import prompts from "prompts";
import { generateRandomString, getIdFromURL } from "./utils";
import handleDeleteOldestLiked from "./actions/delete-oldest-liked";
import handleDeleteOldestPlaylist from "./actions/delete-oldest-playlist";
dotenv.config();

const {
  CLIENT_ID: client_id,
  CLIENT_SECRET: client_secret,
  PORT = 8888,
} = process.env;
const redirect_uri = `http://localhost:${PORT}/callback`;

const app = express();
app.use(express.static(__dirname + "/public"));

app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  if (!state) {
    return res.redirect(
      "/#" + new URLSearchParams({ error: "state_mismatch" }).toString()
    );
  }

  const authOptions: AxiosRequestConfig = {
    url: "https://accounts.spotify.com/api/token",
    method: "post",
    data: new URLSearchParams({
      code: code,
      redirect_uri: redirect_uri,
      grant_type: "authorization_code",
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  };

  try {
    const { data } = await axios(authOptions);
    const access_token = data.access_token;

    res.json({
      res: "Authorization Successful. Check the console for access token and profile info",
      token: access_token,
    });
  } catch (error: any) {
    console.error("Authentication Error:", error.message);
    res.redirect(
      "/#" + new URLSearchParams({ error: "invalid_token" }).toString()
    );
  }
});

const setTerminalPrompts = async (url: string) => {
  console.log(
    color.magenta("📀🎧 Spotify CLI - Eliminación de Canciones 🎧📀")
  );
  console.log(color.gray("--------------------------------------------------"));
  console.log(
    color.bgGreen(
      color.black(
        " Bienvenido a la app para eliminar la canción más antigua de tu biblioteca de 'liked songs' o de cualquier playlist que tengas.\n"
      )
    )
  );
  console.log(color.gray("--------------------------------------------------"));
  console.log(
    color.cyan(
      "Instrucciones:\n" +
        "  1. Obtener credenciales/tokens de acceso.\n" +
        "  2. Introducir el token.\n" +
        "  3. Seleccionar si quieres eliminar de 'liked songs'.\n" +
        "  4. Seleccionar si quieres eliminar de playlists.\n" +
        "  5. Añadir los IDs de las playlists.\n"
    )
  );
  console.log(color.gray("--------------------------------------------------"));
  console.log(
    color.yellow(
      `🟡 Consejo: Puedes cancelar la operación en cualquier momento con ${color.bold(
        "CTRL + C"
      )}\n`
    )
  );

  console.log(
    color.green("🔑 Ve y copia el token que te muestra la pantalla:\n") + url
  );

  const responses = await prompts([
    {
      type: "text",
      name: "getToken",
      message: color.green("🔑 Pega el token que obtuviste:"),
    },
    {
      type: "toggle",
      name: "liked",
      message: color.green("💝  ¿Eliminar de 'liked songs'?"),
      initial: true,
      active: "Sí",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "playlists",
      message: color.green("💌 ¿Eliminar de playlists?"),
      initial: true,
      active: "Sí",
      inactive: "No",
    },
  ]);
  let playlistURIs: string[] = [];

  if (responses.playlists) {
    let addingPlaylists = true;

    console.log(
      color.cyan(
        "\n📝 Agrega las URIs de las playlists una a una. Deja vacío y presiona Enter o escribe 'listo' cuando termines."
      )
    );

    while (addingPlaylists) {
      const { uri } = await prompts({
        type: "text",
        name: "uri",
        message: color.cyan(
          "URI de la playlist (o deja vacío/'listo' para terminar):"
        ),
      });

      if (uri.toLowerCase() === "listo" || uri.trim() === "") {
        addingPlaylists = false;
      } else if (uri.trim()) {
        playlistURIs.push(uri.trim());
        console.log(color.gray(`URI agregada: ${uri.trim()}`));
      }
    }

    console.log(color.cyan("\n✅ Playlists a procesar:"));
    playlistURIs.forEach((uri, index) =>
      console.log(color.gray(`${index + 1}. ${uri}`))
    );
  }

  console.log(
    color.green("\n🎉 ¡Configuración completa! Procesando tus solicitudes...\n")
  );
  return { responses, playlistURIs };
};

const main = async () => {
  const state = generateRandomString(16);
  const likedScope = "user-library-read user-library-modify";
  const playlistScope = "playlist-modify-public playlist-modify-private";
  const scope = likedScope + " " + playlistScope;

  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: client_id ?? "",
    scope,
    redirect_uri,
    state,
  }).toString()}`;

  const { playlistURIs, responses } = await setTerminalPrompts(url);
  if (!responses.getToken || responses.getToken.length < 100) {
    console.log(color.red("❌ El token es obligatorio o inválido"));
    process.exit(0);
  }
  if (responses.liked) {
    const songName = await handleDeleteOldestLiked(responses.getToken);
    console.log(color.bgGreen(`❤️  La canción ${songName} fue eliminada.`));
  }
  if (responses.playlists && playlistURIs.length > 0) {
    const ids = playlistURIs.map(getIdFromURL).filter((el) => el !== null);
    const deletedSongs = await handleDeleteOldestPlaylist(
      responses.getToken,
      ids
    );
    deletedSongs.forEach((song) => {
      console.log(
        color.bgGreen(
          `💟 La canción ${song.name} fue eliminada de la playlist `
        ),
        color.italic(song.playlist) + "."
      );
    });
  }
  console.log(color.green(`Gracias por usar la app!`));
  process.exit(0);
};

main();
app.listen(PORT);
