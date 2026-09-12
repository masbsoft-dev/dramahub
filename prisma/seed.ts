/**
 * Popula o catalogo com generos + os 10 titulos ficticios usados no
 * protótipo (docs/design-reference/Dramahub.dc.html), ja que a ingestao real
 * fica a cargo do endpoint /api/ingest (sem scraper de verdade neste
 * projeto). posterUrl/bannerUrl guardam o mesmo gradiente CSS usado no
 * design como placeholder visual — troque por URLs reais quando houver
 * artes de capa.
 */
import { PrismaClient, type ContentCountry } from "@prisma/client";

const prisma = new PrismaClient();

const gradient = (a: string, b: string) => `linear-gradient(160deg, ${a} 0%, ${b} 100%)`;

// Stream de teste oficial do hls.js (test-streams.mux.dev), compativel com
// browsers atuais — o antigo bipbop_4x3 da Apple e um asset legado (MPEG-2 TS
// de ~2011) que falha o demuxer do MSE em Chrome recentes.
const TEST_MANIFEST_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

type SeedDrama = {
  titlePortuguese: string;
  titleOriginal: string;
  gradientFrom: string;
  gradientTo: string;
  countryOrigin: ContentCountry;
  releaseYear: number;
  genres: string[];
  synopsis: string;
};

const DRAMAS: SeedDrama[] = [
  {
    titlePortuguese: "Luar de Seul",
    titleOriginal: "Moonlight Over Seoul",
    gradientFrom: "#5B2A9E",
    gradientTo: "#170B2B",
    countryOrigin: "KR",
    releaseYear: 2025,
    genres: ["Romance", "Legal/Jurídico"],
    synopsis:
      "Uma advogada em ascensão volta à cidade natal e descobre que o herdeiro que ela processou há dez anos agora é seu vizinho de porta — e o único que sabe o que aconteceu naquele inverno.",
  },
  {
    titlePortuguese: "O Contrato de Inverno",
    titleOriginal: "The Winter Contract",
    gradientFrom: "#1E5A7A",
    gradientTo: "#0B1A26",
    countryOrigin: "KR",
    releaseYear: 2024,
    genres: ["Romance", "Comédia"],
    synopsis:
      "Para herdar a empresa da família, ele precisa de uma noiva por um ano. Ela precisa pagar a dívida do pai. Nenhum dos dois esperava que o contrato virasse outra coisa.",
  },
  {
    titlePortuguese: "Herdeiros de Jade",
    titleOriginal: "Heirs of Jade",
    gradientFrom: "#2E7D5B",
    gradientTo: "#0C1F17",
    countryOrigin: "CN",
    releaseYear: 2024,
    genres: ["Histórico", "C-Drama"],
    synopsis:
      "Três irmãos disputam o comando da casa de chá mais antiga da cidade, enquanto um segredo de gerações ameaça derrubar tudo o que construíram.",
  },
  {
    titlePortuguese: "Café da Meia-Noite",
    titleOriginal: "Midnight Café",
    gradientFrom: "#9A5B2A",
    gradientTo: "#241409",
    countryOrigin: "KR",
    releaseYear: 2023,
    genres: ["Slice of life", "Romance"],
    synopsis:
      "Um café que só abre à meia-noite recebe clientes com histórias para contar — e uma dona que guarda a maior história de todas.",
  },
  {
    titlePortuguese: "A Rainha de Papel",
    titleOriginal: "The Paper Queen",
    gradientFrom: "#8C2340",
    gradientTo: "#240A13",
    countryOrigin: "KR",
    releaseYear: 2022,
    genres: ["Thriller", "Ação"],
    synopsis:
      "Uma repórter investigativa descobre que a família mais poderosa do país construiu o império sobre um crime que ela pode provar — se sobreviver para contar.",
  },
  {
    titlePortuguese: "Nove Caudas",
    titleOriginal: "Nine Tails",
    gradientFrom: "#6B2E8C",
    gradientTo: "#1B0B24",
    countryOrigin: "CN",
    releaseYear: 2026,
    genres: ["Fantasia", "C-Drama"],
    synopsis:
      "Uma espírito-raposa milenar assume forma humana para proteger a última descendente de quem um dia a salvou — e se apaixona por quem jurou nunca mais amar.",
  },
  {
    titlePortuguese: "Primavera em Busan",
    titleOriginal: "Spring in Busan",
    gradientFrom: "#C46A8E",
    gradientTo: "#33131F",
    countryOrigin: "KR",
    releaseYear: 2025,
    genres: ["Romance", "Escolar"],
    synopsis:
      "Dois surfistas rivais dividem o mesmo treinador, a mesma praia e, aos poucos, o mesmo coração.",
  },
  {
    titlePortuguese: "Segredos do Palácio Han",
    titleOriginal: "Secrets of Han Palace",
    gradientFrom: "#A8873C",
    gradientTo: "#2A2010",
    countryOrigin: "KR",
    releaseYear: 2021,
    genres: ["Histórico", "Legal/Jurídico"],
    synopsis:
      "Uma dama da corte finge servir a rainha enquanto investiga a morte do pai — sem saber que o príncipe herdeiro já desconfia dela.",
  },
  {
    titlePortuguese: "Amor em Modo Avião",
    titleOriginal: "Love in Airplane Mode",
    gradientFrom: "#2F6FA8",
    gradientTo: "#0D1C2B",
    countryOrigin: "CN",
    releaseYear: 2023,
    genres: ["Comédia", "Romance"],
    synopsis:
      "Presos num voo cancelado, dois estranhos apostam que nunca mais vão se ver. O algoritmo do aeroporto discorda.",
  },
  {
    titlePortuguese: "Doce Vingança",
    titleOriginal: "Sweet Revenge",
    gradientFrom: "#B03A2E",
    gradientTo: "#2B0E0A",
    countryOrigin: "KR",
    releaseYear: 2022,
    genres: ["Thriller", "Médico"],
    synopsis:
      "Ela virou a melhor cirurgiã do país só para voltar ao hospital que arruinou sua família — e operar exatamente quem precisa.",
  },
];

const EPISODES_PER_DRAMA = 5;

async function main() {
  console.log("Seed: generos + catalogo...");

  for (let i = 0; i < DRAMAS.length; i++) {
    const seedDrama = DRAMAS[i];
    const posterUrl = gradient(seedDrama.gradientFrom, seedDrama.gradientTo);
    const bannerUrl = posterUrl;

    const drama = await prisma.drama.upsert({
      where: {
        // nao ha @@unique(titlePortuguese) no schema — usamos findFirst+create
        // via um id deterministico curto para manter o seed idempotente.
        id: `seed-drama-${i}`,
      },
      create: {
        id: `seed-drama-${i}`,
        titlePortuguese: seedDrama.titlePortuguese,
        titleOriginal: seedDrama.titleOriginal,
        synopsis: seedDrama.synopsis,
        countryOrigin: seedDrama.countryOrigin,
        releaseYear: seedDrama.releaseYear,
        posterUrl,
        bannerUrl,
        rating: 8 + (i % 3) * 0.4,
      },
      update: {
        titlePortuguese: seedDrama.titlePortuguese,
        titleOriginal: seedDrama.titleOriginal,
        synopsis: seedDrama.synopsis,
        countryOrigin: seedDrama.countryOrigin,
        releaseYear: seedDrama.releaseYear,
        posterUrl,
        bannerUrl,
      },
    });

    for (const genreName of seedDrama.genres) {
      const genre = await prisma.genre.upsert({
        where: { name: genreName },
        create: { name: genreName },
        update: {},
      });
      await prisma.dramaGenre.upsert({
        where: { dramaId_genreId: { dramaId: drama.id, genreId: genre.id } },
        create: { dramaId: drama.id, genreId: genre.id },
        update: {},
      });
    }

    for (let epNumber = 1; epNumber <= EPISODES_PER_DRAMA; epNumber++) {
      const episode = await prisma.episode.upsert({
        where: { dramaId_episodeNumber: { dramaId: drama.id, episodeNumber: epNumber } },
        create: {
          dramaId: drama.id,
          episodeNumber: epNumber,
          title: `Episódio ${epNumber}`,
          manifestUrl: TEST_MANIFEST_URL,
          durationSeconds: 62 * 60 + epNumber * 180,
        },
        update: {
          manifestUrl: TEST_MANIFEST_URL,
        },
      });

      await prisma.subtitle.deleteMany({ where: { episodeId: episode.id } });
      await prisma.subtitle.createMany({
        data: [
          { episodeId: episode.id, language: "pt-BR", vttUrl: "/sample-subtitles/pt-BR.vtt" },
          { episodeId: episode.id, language: "en-US", vttUrl: "/sample-subtitles/en-US.vtt" },
        ],
      });
    }

    console.log(`  ✓ ${seedDrama.titlePortuguese}`);
  }

  console.log("Seed concluido.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
