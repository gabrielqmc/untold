/* =====================================================================
   UNTOLD · VÍDEOS DO YOUTUBE  (seção "AO VIVO" do site)
   =====================================================================

   O site mostra sempre os 3 vídeos mais recentes do canal.

   COMO FUNCIONA A ATUALIZAÇÃO AUTOMÁTICA
   O arquivo data/youtube-latest.js é gerado automaticamente pela
   automação do GitHub (.github/workflows/youtube-latest.yml), que lê o
   feed público do canal 1x por dia — sem chave de API. Quando a banda
   publica um vídeo novo, ele aparece no site na próxima execução.
   Você também pode rodar manualmente: GitHub → Actions → "YouTube ·
   últimos vídeos" → Run workflow.

   ESTE ARQUIVO serve para:
     • definir o canal;
     • personalizar título/legenda/miniatura de vídeos específicos
       (pelo ID do vídeo — o trecho depois de /shorts/ ou ?v= no link).
   ===================================================================== */

window.UNTOLD_VIDEOS = {
  channelUrl: "https://www.youtube.com/@bandauntold",
  channelHandle: "@bandauntold",

  /* Quantos vídeos exibir */
  limit: 3,

  /* Personalizações opcionais por ID de vídeo.
     Qualquer campo omitido usa o que veio do YouTube. */
  overrides: {
    "kqoFHmFWBcc": { title: "Mulher de Fases", artist: "Raimundos", venue: "Ao vivo no Caiçara Clube de Jaú", thumb: "assets/img/color/capa-1.webp", thumbBw: "assets/img/bw/capa-1.webp" },
    "2W55C2K_ibc": { title: "War Pigs", artist: "Black Sabbath", venue: "Ao vivo no Jimi's Bar", thumb: "assets/img/color/capa-2.webp", thumbBw: "assets/img/bw/capa-2.webp" },
    "QZCnOxacnCM": { title: "Proibida Pra Mim", artist: "Charlie Brown Jr.", venue: "Ao vivo na Adelaide", thumb: "assets/img/color/capa-3.webp", thumbBw: "assets/img/bw/capa-3.webp" }
  }
};
