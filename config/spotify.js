/* =====================================================================
   UNTOLD · PLAYLIST OFICIAL NO SPOTIFY  (seção "MÚSICA" do site)
   =====================================================================

   Isto é DIFERENTE do deck de fita no topo do site:
     • Deck no topo  → toca os MP3 hospedados no próprio site (config/playlist.js)
     • Esta seção    → incorpora o player oficial do Spotify (embed/iframe)

   COMO TROCAR A PLAYLIST
   No Spotify: abra a playlist → "..." → Compartilhar → "Copiar link da playlist".
   Cole o link em "url" abaixo. Qualquer um destes formatos funciona:
     "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc123"
     "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"
     "37i9dQZF1DXcBWIGoYBM5M"
   Também aceita álbum, artista ou faixa (ex.: https://open.spotify.com/album/...).

   Enquanto "url" estiver vazio, a seção mostra o estado "em breve".
   ===================================================================== */

window.UNTOLD_SPOTIFY = {
  /* Link ou URI da playlist oficial no Spotify */
  url: "https://open.spotify.com/playlist/2Ib87rJyN3y7edYhrzHRlP?si=5223ac1a18464d92",

  /* Nome e descrição exibidos ao lado do player */
  name: "UNTOLD — Playlist Oficial",
  description: "Os sons que tocam no nosso palco: clássicos do rock nacional e internacional, do jeito que a gente gosta de ouvir.",

  /* Capa (opcional). Deixe "" para usar a capa desenhada pelo site.
     Ex.: "assets/img/capa-playlist.jpg" (quadrada, mín. 640x640) */
  cover: "",

  /* Tema do player do Spotify: 0 = escuro, 1 = colorido automático */
  theme: 0
};
