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
      res: "Autorización exitosa. Revisa la consola para ver el token de acceso.",
      token: access_token,
    });
  } catch (error: any) {
    console.error("Error de autenticación:", error.message);
    res.redirect(
      "/#" + new URLSearchParams({ error: "invalid_token" }).toString()
    );
  }
});

const setTerminalPrompts = async (): Promise<{
  liked: boolean;
  playlists: boolean;
  playlistURIs: string[];
  getToken: string;
}> => {
  console.log(
    color.magenta("📀🎧 Spotify CLI - Eliminación de Canciones 🎧📀")
  );
  console.log(color.gray("--------------------------------------------------"));
  console.log(
    color.bgGreen(
      color.black(
        "Bienvenido a la aplicación para eliminar la canción más antigua de tu biblioteca de 'liked songs' o de cualquier playlist que tengas.\n"
      )
    )
  );
  console.log(color.gray("--------------------------------------------------"));
  console.log(
    color.cyan(
      "Instrucciones:\n" +
        "  1. Selecciona las acciones que deseas realizar.\n" +
        "  2. Autoriza la aplicación para obtener los tokens necesarios.\n" +
        "  3. Proporciona el token obtenido.\n"
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

  const actionResponses = await prompts([
    {
      type: "toggle",
      name: "liked",
      message: color.green("💝 ¿Eliminar de 'liked songs'?"),
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

  const { liked, playlists } = actionResponses;

  if (!liked && !playlists) {
    console.log(color.red("❌ No se seleccionó ninguna acción. Saliendo..."));
    process.exit(0);
  }

  let scope = "";
  if (liked) {
    scope += " user-library-read user-library-modify";
  }
  if (playlists) {
    scope += " playlist-modify-public playlist-modify-private";
  }
  scope = scope.trim();

  const stateParam = generateRandomString(16);
  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: client_id ?? "",
    scope: scope,
    redirect_uri,
    state: stateParam,
  }).toString()}`;

  console.log(
    color.green(
      "\n🔗 Ve y autoriza la aplicación visitando la siguiente URL:\n"
    )
  );
  console.log(color.blue(url));
  console.log("\n");

  const tokenResponse = await prompts({
    type: "text",
    name: "getToken",
    message: color.green("🔑 Pega el token que obtuviste:"),
    validate: (value) =>
      value.length < 100 ? "❌ Token inválido. Intenta de nuevo." : true,
  });

  const { getToken } = tokenResponse;

  let playlistURIs: string[] = [];
  if (playlists) {
    console.log(
      color.cyan(
        "\n📝 Agrega las URLs(o ids) de las playlists una a una. Deja vacío y presiona Enter o escribe 'listo' cuando termines."
      )
    );

    let addingPlaylists = true;
    while (addingPlaylists) {
      const { uri } = await prompts({
        type: "text",
        name: "uri",
        message: color.cyan(
          "URL(o id) de la playlist (o deja vacío/'listo' para terminar):"
        ),
      });

      if (uri.trim().toLowerCase() === "listo" || uri.trim() === "") {
        addingPlaylists = false;
      } else if (uri.trim()) {
        playlistURIs.push(uri.trim());
        console.log(color.gray(`✅ URL agregada: ${uri.trim()}`));
      }
    }

    if (playlistURIs.length > 0) {
      console.log(color.cyan("\n✅ Playlists a procesar:"));
      playlistURIs.forEach((uri, index) =>
        console.log(color.gray(`  ${index + 1}. ${uri}`))
      );
    } else {
      console.log(color.yellow("⚠️ No se agregaron playlists para procesar."));
    }
  }

  console.log(
    color.green("\n🎉 ¡Configuración completa! Procesando tus solicitudes...\n")
  );

  return { liked, playlists, playlistURIs, getToken };
};

const main = async () => {
  const { liked, playlists, playlistURIs, getToken } =
    await setTerminalPrompts();

  if (!getToken || getToken.length < 100) {
    console.log(color.red("❌ El token no fue dado o es inválido."));
    process.exit(0);
  }

  if (liked) {
    try {
      const songName = await handleDeleteOldestLiked(getToken);
      console.log(
        color.bgGreen(
          `❤️ La canción '${songName}' fue eliminada de 'liked songs'.`
        )
      );
    } catch (error: any) {
      console.log(
        color.red("❌ Error al eliminar de 'liked songs':"),
        error.message
      );
    }
  }

  if (playlists && playlistURIs.length > 0) {
    const ids = playlistURIs.map(getIdFromURL).filter((el) => el !== null);
    try {
      const deletedSongs = await handleDeleteOldestPlaylist(getToken, ids);
      deletedSongs.forEach((song) => {
        console.log(
          color.bgGreen(
            `💟 La canción '${
              song.name
            }' fue eliminada de la playlist ${color.italic(song.playlist)}.`
          )
        );
      });
    } catch (error: any) {
      console.log(
        color.red("❌ Error al eliminar de playlists:"),
        error.message
      );
    }
  }

  console.log(color.green(`\n✨ ¡Gracias por usar la app!`));
  process.exit(0);
};

main();
app.listen(PORT);
