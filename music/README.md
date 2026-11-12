# Músicas do deck de fita (player do topo do site)

Coloque aqui os arquivos de áudio que o player fixo no topo do site vai tocar
(`.mp3` recomendado; também funcionam `.m4a`, `.ogg`, `.wav`).

Depois, liste cada faixa em **`config/playlist.js`**:

```js
{
  src: "music/nome-da-musica.mp3",
  title: "Nome da Música",
  artist: "UNTOLD",
  info: "Ao vivo no Casarão 682"
},
```

Dicas:
- Evite espaços e acentos no nome do arquivo (`mulher-de-fases-ao-vivo.mp3`).
- MP3 a 192–256 kbps é um bom equilíbrio entre qualidade e peso.
- O player nunca começa a tocar sozinho: o visitante aperta PLAY.

Isto é diferente da playlist do Spotify (seção "Música" do site), que é
configurada em `config/spotify.js`.
