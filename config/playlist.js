/* =====================================================================
   UNTOLD · DECK DE FITA  —  PLAYLIST LOCAL (MP3 hospedados no site)
   =====================================================================

   Este é o ÚNICO arquivo que você precisa editar para mudar as músicas
   do player fixo no topo do site. Não é preciso mexer no código do player.

   COMO ADICIONAR UMA MÚSICA
   1. Coloque o arquivo de áudio na pasta  /music  (ex.: music/minha-musica.mp3)
      Formatos aceitos: .mp3 (recomendado), .m4a/.aac, .ogg, .wav
      Dica: evite espaços e acentos no nome do arquivo.
   2. Copie um bloco { ... } abaixo, cole dentro de "tracks" e preencha:
        src     → caminho do arquivo (obrigatório)
        title   → nome da música     (obrigatório)
        artist  → artista             (opcional, padrão: "UNTOLD")
        info    → detalhe da faixa    (opcional: "Ao vivo no Casarão 682", "Demo 2026"...)
   3. Salve. A ordem da lista é a ordem de reprodução.

   COMO REMOVER / TROCAR
   - Remover: apague o bloco { ... } da faixa.
   - Trocar:  altere o "src" para o novo arquivo (e o título, se mudar).

   Se a lista estiver vazia, o deck aparece como "SEM FITA" e convida o
   visitante a ouvir a playlist oficial do Spotify (seção MÚSICA do site).

   ATENÇÃO: o player NUNCA começa a tocar sozinho — o visitante aperta PLAY.
   ===================================================================== */

window.UNTOLD_PLAYLIST = {
  /* Nome exibido na etiqueta da fita (lista de faixas) */
  label: "UNTOLD · LADO A",

  /* Volume inicial (0 a 1). O visitante pode ajustar; a escolha fica salva no navegador. */
  defaultVolume: 0.8,

  /* Ao terminar a última faixa, volta para a primeira? */
  loop: true,

  tracks: [
    /* EXEMPLO — remova as barras-asterisco para ativar:
    {
      src: "music/nome-da-musica.mp3",
      title: "Nome da Música",
      artist: "UNTOLD",
      info: "Ao vivo no Casarão 682"
    },
    */
    {
      src: "music/pearl-jam-dissident.mp3",
      title: "Dissident",
      artist: "Pearl Jam",
      info: "Do repertório da UNTOLD"
    },
  ]
};
