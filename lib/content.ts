import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { imageSize } from "image-size";

/**
 * MUAC content layer — Notion is the single source of truth.
 *
 * Notion is the primary CMS.
 *
 * Archive
 *   └── Profiles (Relation)
 *          └── Profile
 *
 * IMPORTANT:
 * Since Notion API 2025-09-03, databases and data sources
 * are separate concepts.
 *
 * NOTION_DATABASE_ID identifies the Notion database.
 * The actual query is performed against its data source.
 *
 * Optionally, NOTION_DATA_SOURCE_ID can be provided to avoid
 * resolving the data source automatically.
 *
 * This file is intentionally responsible only for the
 * content/data layer.
 */

/* =========================================================================
   Types
   ========================================================================= */

export type ArchiveRichText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  href?: string | null;
};

export type ArchiveBlock =
  | {
    type: "paragraph";
    richText: ArchiveRichText[];
  }
  | {
    type: "quote";
    text: string;
    attribution?: string;
  }
  | {
    type: "image";
    src: string;
    alt: string;
    caption?: string;
    width?: number;
  }
  | {
    type: "heading";
    text: string;
  }
  | {
    type: "list";
    ordered: boolean;
    items: string[];
  };

/* =========================================================================
   Profiles
   ========================================================================= */

export type ProfileRole =
  | "mentioned"
  | "subject"
  | "interviewee"
  | "author"
  | "collaborator"
  | "photographer"
  | "creator";

export type ProfileReference = {
  id: string;
  name: string;
  slug: string;
  role?: ProfileRole;
};

export type Profile = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatar: string | null;
  role: string;
  instagram: string | null;
  website: string | null;
};

/* =========================================================================
   Archive
   ========================================================================= */

export type ArchiveEntry = {
  slug: string;
  number: string;
  title: string;
  subject: string;
  role: string;
  dek: string;
  cover: string;
  tags: string[];
  profiles: ProfileReference[];
  date: string;
  featured?: boolean;
  body: ArchiveBlock[];
};

/* =========================================================================
   Playlists
   ========================================================================= */

export type PlaylistTrack = {
  title: string;
  artist: string;
};

export type Playlist = {
  slug: string;
  title: string;
  note: string;
  cover: string;
  date: string;
  tracks: PlaylistTrack[];
  current?: boolean;
  spotifyId?: string;
};

/* =========================================================================
   Gallery
   ========================================================================= */

export type GalleryEntry = {
  id: string;
  slug: string;
  title: string;
  note: string;
  image: string;
  mediaType: "image" | "video" | "audio";
  date: string;
  source: "muac" | "nicoly";
  tags: string[];
  featured: boolean;
};

/* =========================================================================
   Environment
   ========================================================================= */

const NOTION_TOKEN =
  process.env.NOTION_TOKEN?.trim();

const NOTION_DATABASE_ID =
  process.env.NOTION_DATABASE_ID?.trim();

const NOTION_DATA_SOURCE_ID =
  process.env.NOTION_DATA_SOURCE_ID?.trim();

const NOTION_GALLERY_DATABASE_ID =
  process.env.NOTION_GALLERY_DATABASE_ID?.trim();

const NOTION_GALLERY_DATA_SOURCE_ID =
  process.env.NOTION_GALLERY_DATA_SOURCE_ID?.trim();

export const NOTION_CONFIGURED = Boolean(
  NOTION_TOKEN &&
  NOTION_DATABASE_ID
);

/* =========================================================================
   Notion client
   ========================================================================= */

let client: Client | null = null;

function notion(): Client {
  if (!client) {
    if (!NOTION_TOKEN) {
      throw new Error(
        "NOTION_TOKEN não está definido no ambiente do servidor."
      );
    }

    client = new Client({
      auth: NOTION_TOKEN,
      notionVersion: "2026-03-11",
    });
  }

  return client;
}

/* =========================================================================
   Generic types
   ========================================================================= */

type Props =
  PageObjectResponse["properties"];

/**
 * Type guard local.
 *
 * We intentionally do NOT use isFullPage() for results returned by
 * dataSources.query(), because some versions of @notionhq/client
 * expose response.results as unknown[].
 */
function isPageObject(
  value: unknown
): value is PageObjectResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as {
      object?: unknown;
      id?: unknown;
      properties?: unknown;
    };

  return (
    candidate.object === "page" &&
    typeof candidate.id === "string" &&
    typeof candidate.properties === "object" &&
    candidate.properties !== null
  );
}

/* =========================================================================
   Logging
   ========================================================================= */

function logMatch(
  entity: string,
  field: string,
  propName: string | null
) {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    if (propName) {
      console.log(
        `[notion] ${entity}.${field} ← propriedade "${propName}"`
      );
    } else {
      console.warn(
        `[notion] ${entity}.${field} — nenhuma propriedade correspondente encontrada`
      );
    }
  }
}

/* =========================================================================
   Property helpers
   ========================================================================= */

function findProp(
  props: Props,
  type: string,
  candidates?: string[]
): {
  name: string;
  value: Props[string];
} | null {
  const entries =
    Object.entries(props);

  if (candidates) {
    for (const name of candidates) {
      const hit =
        entries.find(
          ([key, value]) =>
            key.toLowerCase() ===
            name.toLowerCase() &&
            value.type === type
        );

      if (hit) {
        return {
          name: hit[0],
          value: hit[1],
        };
      }
    }
  }

  const anyOfType =
    entries.find(
      ([, value]) =>
        value.type === type
    );

  return anyOfType
    ? {
      name: anyOfType[0],
      value: anyOfType[1],
    }
    : null;
}

function richTextToPlain(
  rt:
    | {
      plain_text: string;
    }[]
    | undefined
): string {
  if (!rt) {
    return "";
  }

  return rt
    .map(
      (item) =>
        item.plain_text
    )
    .join("");
}

/* =========================================================================
   Property readers
   ========================================================================= */

function readTitle(
  props: Props,
  entity: string
): string {
  const hit =
    findProp(
      props,
      "title"
    );

  logMatch(
    entity,
    "title",
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "title"
  ) {
    return "";
  }

  return richTextToPlain(
    hit.value.title
  );
}

function readRichText(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string {
  const hit =
    findProp(
      props,
      "rich_text",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "rich_text"
  ) {
    return "";
  }

  return richTextToPlain(
    hit.value.rich_text
  );
}

function readNumber(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): number | null {
  const hit =
    findProp(
      props,
      "number",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "number"
  ) {
    return null;
  }

  return hit.value.number;
}

function readDate(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string {
  const hit =
    findProp(
      props,
      "date",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "date" ||
    !hit.value.date
  ) {
    return "";
  }

  return hit.value.date.start;
}

function readCheckbox(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): boolean | null {
  const hit =
    findProp(
      props,
      "checkbox",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "checkbox"
  ) {
    return null;
  }

  return hit.value.checkbox;
}

function readSelect(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string | null {
  const hit =
    findProp(
      props,
      "select",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "select" ||
    !hit.value.select
  ) {
    return null;
  }

  return hit.value.select.name;
}

function readMultiSelect(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string[] {
  const hit =
    findProp(
      props,
      "multi_select",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "multi_select"
  ) {
    return [];
  }

  return hit.value.multi_select.map(
    (option) =>
      option.name
  );
}

function readRelation(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string[] {
  const hit =
    findProp(
      props,
      "relation",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "relation"
  ) {
    return [];
  }

  return hit.value.relation
    .map(
      (relation) =>
        relation.id
    )
    .filter(Boolean);
}

function readFilesArray(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string[] {
  const hit = findProp(
    props,
    "files",
    candidates
  );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !== "files"
  ) {
    return [];
  }

  return hit.value.files
    .map((file) => {
      if (file.type === "external") {
        return file.external.url;
      }

      if (file.type === "file") {
        return file.file.url;
      }

      return null;
    })
    .filter(
      (url): url is string =>
        Boolean(url)
    );
}

function readFiles(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string | null {
  const hit =
    findProp(
      props,
      "files",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "files" ||
    hit.value.files.length ===
    0
  ) {
    return null;
  }

  const file =
    hit.value.files[0];

  if (
    file.type ===
    "external"
  ) {
    return file.external.url;
  }

  if (
    file.type ===
    "file"
  ) {
    return file.file.url;
  }

  return null;
}

function readUrl(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string | null {
  const hit =
    findProp(
      props,
      "url",
      candidates
    );

  logMatch(
    entity,
    field,
    hit?.name ?? null
  );

  if (
    !hit ||
    hit.value.type !==
    "url"
  ) {
    return null;
  }

  return hit.value.url;
}

/* =========================================================================
   Utilities
   ========================================================================= */

function slugify(
  input: string
): string {
  return input
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /(^-|-$)/g,
      "");
}

function pageCoverUrl(
  page: PageObjectResponse
): string | null {
  const cover =
    page.cover;

  if (!cover) {
    return null;
  }

  if (
    cover.type ===
    "external"
  ) {
    return cover.external.url;
  }

  if (
    cover.type ===
    "file"
  ) {
    return cover.file.url;
  }

  return null;
}

/* =========================================================================
   Image dimensions
   ========================================================================= */

/**
 * Cache das dimensões das imagens.
 *
 * As URLs de arquivos do Notion/S3 são temporárias,
 * então usamos a URL atual como chave apenas durante
 * o ciclo de vida do servidor.
 */
const imageDimensionsCache =
  new Map<
    string,
    {
      width: number;
      height: number;
    }
  >();

/**
 * Obtém as dimensões reais da imagem.
 *
 * IMPORTANTE:
 * A API pública do Notion não informa a largura visual
 * escolhida no editor do Notion. Portanto, aqui usamos
 * as dimensões reais do arquivo para preservar sua
 * proporção.
 */
async function getImageDimensions(
  url: string
): Promise<{
  width: number;
  height: number;
}> {
  const cached =
    imageDimensionsCache.get(
      url
    );

  if (cached) {
    return cached;
  }

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const buffer =
      await response.arrayBuffer();

    const dimensions =
      imageSize(
        new Uint8Array(
          buffer
        )
      );

    if (
      !dimensions.width ||
      !dimensions.height
    ) {
      throw new Error(
        "Não foi possível determinar as dimensões da imagem."
      );
    }

    const result = {
      width:
        dimensions.width,
      height:
        dimensions.height,
    };

    imageDimensionsCache.set(
      url,
      result
    );

    return result;
  } catch (error) {
    console.warn(
      `[notion] não foi possível obter dimensões da imagem: ${url}`,
      error
    );

    /**
     * Fallback seguro.
     *
     * Mantemos uma proporção 3:2 apenas quando
     * não conseguimos ler o arquivo.
     */
    return {
      width: 1200,
      height: 800,
    };
  }
}

/* =========================================================================
   Notion Data Source resolver
   ========================================================================= */

const resolvedDataSourceIds =
  new Map<string, string>();

async function getDataSourceId(
  databaseId: string,
  explicitDataSourceId?: string
): Promise<string> {
  if (explicitDataSourceId) {
    return explicitDataSourceId;
  }

  const cached =
    resolvedDataSourceIds.get(
      databaseId
    );

  if (cached) {
    return cached;
  }

  const database =
    await notion().databases.retrieve({
      database_id:
        databaseId,
    });

  /**
   * The SDK typings can differ between versions,
   * so we intentionally narrow the response.
   */
  const databaseWithSources =
    database as typeof database & {
      data_sources?: Array<{
        id: string;
        name?: string;
      }>;
    };

  const sources =
    databaseWithSources.data_sources ??
    [];

  if (sources.length === 0) {
    throw new Error(
      [
        "Nenhum Data Source foi encontrado dentro do database do Notion.",
        `Database ID: ${databaseId}`,
        "Verifique se a integração tem acesso ao database.",
      ].join(" ")
    );
  }

  const dataSourceId =
    sources[0].id;

  resolvedDataSourceIds.set(
    databaseId,
    dataSourceId
  );

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.log(
      `[notion] Data Source resolvido automaticamente: ${dataSourceId} (database ${databaseId})`
    );
  }

  return dataSourceId;
}

/* =========================================================================
   Profile resolver
   ========================================================================= */

const profileCache =
  new Map<string, Profile>();

const profileRequestCache =
  new Map<
    string,
    Promise<Profile | null>
  >();

async function getProfileById(
  profileId: string
): Promise<Profile | null> {
  const cached =
    profileCache.get(
      profileId
    );

  if (cached) {
    return cached;
  }

  const pending =
    profileRequestCache.get(
      profileId
    );

  if (pending) {
    return pending;
  }

  const request =
    (async (): Promise<Profile | null> => {
      try {
        const page =
          await notion().pages.retrieve(
            {
              page_id:
                profileId,
            }
          );

        if (
          !isPageObject(page)
        ) {
          return null;
        }

        const props =
          page.properties;

        const entity =
          `Profile:${profileId}`;

        const name =
          readTitle(
            props,
            entity
          ) ||
          "Perfil sem nome";

        const slug =
          readRichText(
            props,
            entity,
            "slug",
            [
              "Slug",
              "slug",
            ]
          ) ||
          slugify(name) ||
          profileId;

        const bio =
          readRichText(
            props,
            entity,
            "bio",
            [
              "Bio",
              "Biography",
              "Descrição",
              "Description",
            ]
          );

        const role =
          readRichText(
            props,
            entity,
            "role",
            [
              "Role",
              "Função",
              "Profissão",
              "Occupation",
            ]
          );

        const instagram =
          readUrl(
            props,
            entity,
            "instagram",
            [
              "Instagram",
              "Instagram URL",
            ]
          );

        const website =
          readUrl(
            props,
            entity,
            "website",
            [
              "Website",
              "Site",
              "URL",
            ]
          );

        const avatar =
          readFiles(
            props,
            entity,
            "avatar",
            [
              "Avatar",
              "Foto",
              "Photo",
              "Imagem",
            ]
          ) ||
          readUrl(
            props,
            entity,
            "avatarUrl",
            [
              "Avatar URL",
              "Foto URL",
              "Photo URL",
            ]
          );

        const profile: Profile =
        {
          id: page.id,
          name,
          slug,
          bio,
          avatar,
          role,
          instagram,
          website,
        };

        profileCache.set(
          profileId,
          profile
        );

        return profile;
      } catch (error) {
        console.warn(
          `[notion] erro ao buscar profile ${profileId}`,
          error
        );

        return null;
      } finally {
        profileRequestCache.delete(
          profileId
        );
      }
    })();

  profileRequestCache.set(
    profileId,
    request
  );

  return request;
}

async function resolveProfileReferences(
  profileIds: string[]
): Promise<ProfileReference[]> {
  if (
    profileIds.length ===
    0
  ) {
    return [];
  }

  const uniqueIds = [
    ...new Set(profileIds),
  ];

  const profiles =
    await Promise.all(
      uniqueIds.map(
        (id) =>
          getProfileById(
            id
          )
      )
    );

  return profiles
    .filter(
      (
        profile
      ): profile is Profile =>
        profile !== null
    )
    .map(
      (profile) => ({
        id: profile.id,
        name: profile.name,
        slug: profile.slug,
      })
    );
}

/* =========================================================================
   Archive → Notion mapping
   ========================================================================= */

function detectMediaType(
  url: string
): "image" | "video" | "audio" {
  const cleanUrl =
    url
      .split("?")[0]
      .toLowerCase();

  if (
    /\.(mp4|webm|mov|m4v)$/i.test(
      cleanUrl
    )
  ) {
    return "video";
  }

  if (
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(
      cleanUrl
    )
  ) {
    return "audio";
  }

  return "image";
}

async function mapPageToEntry(
  page: PageObjectResponse,
  index: number
): Promise<ArchiveEntry> {
  const props =
    page.properties;

  const entity =
    `Archive[${index}]`;

  const title =
    readTitle(
      props,
      entity
    ) ||
    "sem título";

  const explicitSlug =
    readRichText(
      props,
      entity,
      "slug",
      [
        "Slug",
        "slug",
      ]
    );

  const number =
    readNumber(
      props,
      entity,
      "number",
      [
        "Number",
        "Número",
        "Num",
        "Índice",
      ]
    );

  const subject =
    readRichText(
      props,
      entity,
      "subject",
      [
        "Subject",
        "Assunto",
        "Nome do artista",
        "Artista",
      ]
    );

  const role =
    readRichText(
      props,
      entity,
      "role",
      [
        "Role",
        "Função",
        "Papel",
      ]
    );

  const dek =
    readRichText(
      props,
      entity,
      "dek",
      [
        "Dek",
        "Resumo",
        "Descrição",
        "Chamada",
      ]
    );

  const cover =
    readFiles(
      props,
      entity,
      "cover",
      [
        "Cover",
        "Capa",
        "Imagem",
      ]
    ) ||
    readUrl(
      props,
      entity,
      "coverUrl",
      [
        "Cover URL",
        "Imagem URL",
      ]
    ) ||
    pageCoverUrl(
      page
    ) ||
    "/images/carpa.png";

  const tags =
    readMultiSelect(
      props,
      entity,
      "tags",
      [
        "Tags",
        "Tags/Categorias",
        "Categorias",
      ]
    );

  const profileIds =
    readRelation(
      props,
      entity,
      "profiles",
      [
        "Profiles",
        "Perfis",
        "Pessoas",
      ]
    );

  const profiles =
    await resolveProfileReferences(
      profileIds
    );

  const date =
    readDate(
      props,
      entity,
      "date",
      [
        "Published Date",
        "Data",
        "Data de publicação",
      ]
    ) ||
    page.created_time;

  const featured =
    readCheckbox(
      props,
      entity,
      "featured",
      [
        "Featured",
        "Destaque",
        "Destacar",
      ]
    ) ?? false;

  return {
    slug:
      explicitSlug ||
      slugify(title) ||
      page.id,

    number:
      number !== null
        ? String(
          number
        ).padStart(
          3,
          "0"
        )
        : String(
          index + 1
        ).padStart(
          3,
          "0"
        ),

    title,
    subject,
    role,
    dek,
    cover,
    tags,
    profiles,
    date,
    featured,
    body: [],
  };
}

/* =========================================================================
   Archive blocks
   ========================================================================= */

function richTextArrayToPlain(
  rt:
    | {
      plain_text: string;
    }[]
    | undefined
): string {
  return rt
    ? rt
      .map(
        (item) =>
          item.plain_text
      )
      .join("")
    : "";
}

function richTextArrayToRichText(
  rt:
    | {
      plain_text: string;
      annotations?: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        code?: boolean;
      };
      href?: string | null;
    }[]
    | undefined
): ArchiveRichText[] {
  if (!rt) {
    return [];
  }

  return rt.map((item) => ({
    text: item.plain_text,
    bold:
      item.annotations?.bold ?? false,
    italic:
      item.annotations?.italic ?? false,
    underline:
      item.annotations?.underline ?? false,
    strikethrough:
      item.annotations?.strikethrough ?? false,
    code:
      item.annotations?.code ?? false,
    href:
      item.href ?? null,
  }));
}

/**
 * Converte os blocos do Notion.
 *
 * É async porque as imagens precisam ser lidas
 * para descobrir suas dimensões reais.
 */
async function mapBlocks(
  blocks: BlockObjectResponse[]
): Promise<ArchiveBlock[]> {
  const out: ArchiveBlock[] =
    [];

  let pendingList:
    | {
      ordered: boolean;
      items: string[];
    }
    | null = null;

  const flushList =
    () => {
      if (
        pendingList &&
        pendingList.items
          .length > 0
      ) {
        out.push({
          type: "list",
          ...pendingList,
        });
      }

      pendingList = null;
    };

  for (const block of blocks) {
    if (block.type === "paragraph") {
      const richText =
        richTextArrayToRichText(
          block.paragraph.rich_text
        );

      flushList();

      if (richText.length > 0) {
        out.push({
          type: "paragraph",
          richText,
        });
      }



    } else if (
      block.type ===
      "heading_1" ||
      block.type ===
      "heading_2" ||
      block.type ===
      "heading_3"
    ) {
      flushList();

      const richText =
        block.type ===
          "heading_1"
          ? block.heading_1
            .rich_text
          : block.type ===
            "heading_2"
            ? block.heading_2
              .rich_text
            : block.heading_3
              .rich_text;

      out.push({
        type: "heading",
        text:
          richTextArrayToPlain(
            richText
          ),
      });
    } else if (
      block.type ===
      "quote"
    ) {
      flushList();

      out.push({
        type: "quote",
        text:
          richTextArrayToPlain(
            block.quote
              .rich_text
          ),
      });
    } else if (
      block.type === "image"
    ) {
      flushList();

      const image =
        block.image;

      const url =
        image.type === "external"
          ? image.external.url
          : image.file.url;

      const caption =
        richTextArrayToPlain(
          image.caption
        );

      /**
       * Notion pode informar a largura original/configurada
       * da imagem através do objeto do bloco.
       *
       * Mantemos a informação disponível para o frontend,
       * mas não dependemos dela para renderizar.
       */
      const imageWithDimensions =
        image as typeof image & {
          width?: number;
        };

      const width =
        typeof imageWithDimensions.width === "number"
          ? imageWithDimensions.width
          : undefined;

      out.push({
        type: "image",
        src: url,
        alt: caption || "",
        caption:
          caption || undefined,
        width,
      });

    } else if (
      block.type ===
      "bulleted_list_item"
    ) {
      const text =
        richTextArrayToPlain(
          block
            .bulleted_list_item
            .rich_text
        );

      if (
        !pendingList ||
        pendingList.ordered
      ) {
        flushList();

        pendingList = {
          ordered: false,
          items: [],
        };
      }

      pendingList.items.push(
        text
      );
    } else if (
      block.type ===
      "numbered_list_item"
    ) {
      const text =
        richTextArrayToPlain(
          block
            .numbered_list_item
            .rich_text
        );

      if (
        !pendingList ||
        !pendingList.ordered
      ) {
        flushList();

        pendingList = {
          ordered: true,
          items: [],
        };
      }

      pendingList.items.push(
        text
      );
    } else {
      flushList();
    }
  }

  flushList();

  return out;
}

async function getAllBlocks(
  pageId: string
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] =
    [];

  let cursor:
    | string
    | undefined;

  do {
    const response =
      await notion()
        .blocks.children.list({
          block_id:
            pageId,
          start_cursor:
            cursor,
          page_size: 100,
        });

    for (const result of response.results) {
      if (
        typeof result ===
        "object" &&
        result !== null &&
        "type" in result
      ) {
        blocks.push(
          result as BlockObjectResponse
        );
      }
    }

    cursor =
      response.has_more &&
        response.next_cursor
        ? response.next_cursor
        : undefined;
  } while (cursor);

  return blocks;
}

/* =========================================================================
   Published Archive query
   ========================================================================= */

async function queryPublishedArchive(): Promise<PageObjectResponse[]> {
  if (!NOTION_DATABASE_ID || !NOTION_TOKEN) {
    return [];
  }

  const dataSourceId = await getDataSourceId(
    NOTION_DATABASE_ID,
    NOTION_DATA_SOURCE_ID
  );

  const results: PageObjectResponse[] = [];

  let cursor: string | undefined;

  do {
    const response = await notion().dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor
        ? {
          start_cursor: cursor,
        }
        : {}),
      page_size: 100,
    });

    for (const result of response.results) {
      if (isPageObject(result)) {
        results.push(result);
      }
    }

    cursor =
      response.has_more && response.next_cursor
        ? response.next_cursor
        : undefined;
  } while (cursor);

  if (results.length === 0) {
    return [];
  }

  /*
   * ============================================================
   * PUBLICAÇÃO
   * ============================================================
   *
   * O Archive do MUAC deve trabalhar somente com:
   *
   * Published = true
   *
   * Aceitamos algumas variações do nome para manter
   * compatibilidade com o banco atual do Notion.
   */

  const publishedCandidates = [
    "Published",
    "Publicado",
    "Public",
  ];

  let publishedPropertyName: string | null = null;

  /*
   * Procura a propriedade checkbox de publicação.
   *
   * Usamos todos os resultados disponíveis para evitar depender
   * exclusivamente do primeiro registro retornado pela API.
   */
  for (const page of results) {
    const hit = findProp(
      page.properties,
      "checkbox",
      publishedCandidates
    );

    if (hit) {
      publishedPropertyName = hit.name;
      break;
    }
  }

  /*
   * IMPORTANTE:
   *
   * Se a propriedade Published não existir, NÃO devemos assumir
   * que todos os artigos estão publicados.
   *
   * Isso evita que rascunhos apareçam na Home/Archive.
   */
  if (!publishedPropertyName) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        [
          "[notion] propriedade de publicação não encontrada.",
          'O Archive exige uma propriedade checkbox chamada',
          '"Published", "Publicado" ou "Public",',
          "com valor true para publicar o artigo.",
        ].join(" ")
      );
    }

    return [];
  }

  /*
   * Retorna somente páginas explicitamente publicadas.
   */
  const publishedPages = results.filter((page) => {
    const property =
      page.properties[publishedPropertyName!];

    return (
      property?.type === "checkbox" &&
      property.checkbox === true
    );
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[notion] Archive: ${publishedPages.length}/${results.length} artigos publicados`
    );
  }

  return publishedPages;
}

/* =========================================================================
   Public Archive API
   ========================================================================= */

export async function getArchive(): Promise<
  ArchiveEntry[]
> {
  if (
    !NOTION_DATABASE_ID
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_DATABASE_ID não configurado — retornando array vazio"
      );
    }

    return [];
  }

  if (!NOTION_TOKEN) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_TOKEN não configurado — retornando array vazio"
      );
    }

    return [];
  }

  try {
    const pages =
      await queryPublishedArchive();

    if (
      pages.length ===
      0
    ) {
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.warn(
          "[notion] query retornou 0 resultados — getArchive retornará array vazio"
        );
      }

      return [];
    }

    const entries =
      await Promise.all(
        pages.map(
          (
            page,
            index
          ) =>
            mapPageToEntry(
              page,
              index
            )
        )
      );

    entries.sort(
      (a, b) =>
        a.date < b.date
          ? 1
          : -1
    );

    return entries;
  } catch (error) {
    console.warn(
      "[notion] erro ao buscar archive",
      error
    );

    return [];
  }
}

/* =========================================================================
   Single Archive entry
   ========================================================================= */

export async function getArchiveEntry(
  slug: string
): Promise<ArchiveEntry | null> {
  if (
    !NOTION_DATABASE_ID ||
    !NOTION_TOKEN
  ) {
    return null;
  }

  try {
    const pages =
      await queryPublishedArchive();

    let matchedEntry:
      | ArchiveEntry
      | null = null;

    let matchedPage:
      | PageObjectResponse
      | null = null;

    for (
      let index = 0;
      index < pages.length;
      index++
    ) {
      const page =
        pages[index];

      const entry =
        await mapPageToEntry(
          page,
          index
        );

      if (
        entry.slug ===
        slug
      ) {
        matchedEntry =
          entry;

        matchedPage =
          page;

        break;
      }
    }

    if (
      !matchedEntry ||
      !matchedPage
    ) {
      return null;
    }

    const blocks =
      await getAllBlocks(
        matchedPage.id
      );

    return {
      ...matchedEntry,
      body:
        await mapBlocks(
          blocks
        ),
    };
  } catch (error) {
    console.warn(
      `[notion] erro ao buscar archive entry "${slug}"`,
      error
    );

    return null;
  }
}

/* =========================================================================
   Featured entry
   ========================================================================= */

export async function getFeaturedEntry(): Promise<
  ArchiveEntry | null
> {
  const all =
    await getArchive();

  if (
    all.length ===
    0
  ) {
    return null;
  }

  return (
    all.find(
      (entry) =>
        entry.featured
    ) ??
    all[0]
  );
}

/* =========================================================================
   Profiles API
   ========================================================================= */

export async function getProfiles(): Promise<
  Profile[]
> {
  const archive =
    await getArchive();

  const profileIds = [
    ...new Set(
      archive.flatMap(
        (entry) =>
          entry.profiles.map(
            (profile) =>
              profile.id
          )
      )
    ),
  ];

  const profiles =
    await Promise.all(
      profileIds.map(
        (id) =>
          getProfileById(
            id
          )
      )
    );

  return profiles
    .filter(
      (
        profile
      ): profile is Profile =>
        profile !== null
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR"
        )
    );
}

export async function getProfileBySlug(
  slug: string
): Promise<Profile | null> {
  const profiles =
    await getProfiles();

  return (
    profiles.find(
      (profile) =>
        profile.slug ===
        slug
    ) ?? null
  );
}

export async function getProfileEntries(
  profileSlug: string
): Promise<ArchiveEntry[]> {
  const archive =
    await getArchive();

  return archive.filter(
    (entry) =>
      entry.profiles.some(
        (profile) =>
          profile.slug ===
          profileSlug
      )
  );
}

/* =========================================================================
   Playlists
   ========================================================================= */

const staticPlaylists: Playlist[] =
  [
    {
      slug: "atual",
      title:
        "playlists autoexplicativa",
      note:
        "eu quando tenho muito amor pra dar — atualizada sem aviso.",
      cover:
        "/images/carpa.png",
      date:
        "2026-08-10",
      current: true,
      spotifyId:
        "6lzMbGKQaG1ElowNWfHz5w",
      tracks: [],
    },

    {
      slug:
        "playlist-002",
      title:
        "o que se passsa na minha cabeça",
      note:
        "uma curadoria de tudo que (in)felizmente sou...",
      cover:
        "/images/carpa.png",
      date:
        "2026-08-16",
      current: false,
      spotifyId:
        "5wiqiU6OjWk9wd3FjeEJOH",
      tracks: [],
    },
  ];

export function getPlaylists(): Playlist[] {
  return staticPlaylists;
}

export function getCurrentPlaylist(): Playlist {
  return (
    staticPlaylists.find(
      (playlist) =>
        playlist.current
    ) ??
    staticPlaylists[0]
  );
}

/* =========================================================================
   Gallery
   ========================================================================= */

async function mapPageToGalleryEntry(
  page: PageObjectResponse,
  index: number
): Promise<GalleryEntry> {
  const props =
    page.properties;

  const entity =
    `Gallery[${index}]`;

  const title =
    readTitle(
      props,
      entity
    ) ||
    "sem título";

  const explicitSlug =
    readRichText(
      props,
      entity,
      "slug",
      [
        "Slug",
        "slug",
      ]
    );

  const slug =
    explicitSlug ||
    slugify(title) ||
    page.id;

  // Image
  const imageCandidates = [
    "Image",
    "Imagem",
    "Photo",
    "Foto",
    "Cover",
    "Capa",
  ];

  const image =
    readFiles(
      props,
      entity,
      "image",
      imageCandidates
    ) ||
    readUrl(
      props,
      entity,
      "imageUrl",
      [
        "Image URL",
        "Imagem URL",
        "Photo URL",
        "Foto URL",
      ]
    ) ||
    pageCoverUrl(
      page
    ) ||
    "";

  // Note
  const note =
    readRichText(
      props,
      entity,
      "note",
      [
        "Note",
        "Nota",
        "Caption",
        "Legenda",
        "Description",
        "Descrição",
      ]
    );

  // Date
  const date =
    readDate(
      props,
      entity,
      "date",
      [
        "Date",
        "Data",
        "Published Date",
        "Data de publicação",
      ]
    ) ||
    page.created_time;

  // Source
  const rawSource =
    readSelect(
      props,
      entity,
      "source",
      [
        "Source",
        "Fonte",
      ]
    );

  const source =
    rawSource &&
      rawSource
        .toLowerCase() ===
      "nicoly"
      ? "nicoly"
      : "muac";

  // Tags
  const tags =
    readMultiSelect(
      props,
      entity,
      "tags",
      [
        "Tags",
        "Categorias",
        "Tags/Categorias",
      ]
    );

  // Featured
  const featured =
    readCheckbox(
      props,
      entity,
      "featured",
      [
        "Featured",
        "Destaque",
        "Destacar",
      ]
    ) ?? false;

  return {
    id: page.id,
    slug,
    title,
    note,
    image,
    mediaType:
      detectMediaType(
        image
      ),
    date,
    source,
    tags,
    featured,
  };
}

async function queryPublishedGallery(): Promise<
  PageObjectResponse[]
> {
  if (
    !NOTION_GALLERY_DATABASE_ID ||
    !NOTION_TOKEN
  ) {
    return [];
  }

  try {
    const dataSourceId =
      await getDataSourceId(
        NOTION_GALLERY_DATABASE_ID,
        NOTION_GALLERY_DATA_SOURCE_ID
      );

    const results: PageObjectResponse[] =
      [];

    let cursor:
      | string
      | undefined;

    do {
      const response =
        await notion().dataSources.query(
          {
            data_source_id:
              dataSourceId,
            ...(cursor
              ? {
                start_cursor:
                  cursor,
              }
              : {}),
            page_size: 100,
          }
        );

      for (const result of response.results) {
        if (
          isPageObject(
            result
          )
        ) {
          results.push(
            result
          );
        }
      }

      cursor =
        response.has_more &&
          response.next_cursor
          ? response.next_cursor
          : undefined;
    } while (cursor);

    if (
      results.length ===
      0
    ) {
      return results;
    }

    const publishedHit =
      findProp(
        results[0].properties,
        "checkbox",
        [
          "Published",
          "Publicado",
          "Public",
        ]
      );

    if (!publishedHit) {
      return results;
    }

    return results.filter(
      (page) => {
        const property =
          page.properties[
          publishedHit.name
          ];

        return (
          property.type ===
          "checkbox" &&
          property.checkbox ===
          true
        );
      }
    );
  } catch (error) {
    console.warn(
      "[notion] erro ao consultar Gallery",
      error
    );

    return [];
  }
}

export async function getGallery(): Promise<
  GalleryEntry[]
> {
  if (
    !NOTION_GALLERY_DATABASE_ID
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_GALLERY_DATABASE_ID não configurado — Gallery retornará array vazio"
      );
    }

    return [];
  }

  if (!NOTION_TOKEN) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_TOKEN não configurado — retornando array vazio"
      );
    }

    return [];
  }

  try {
    const pages =
      await queryPublishedGallery();

    if (
      pages.length ===
      0
    ) {
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.warn(
          "[notion] query retornou 0 resultados — getGallery retornará array vazio"
        );
      }

      return [];
    }

    const entries =
      await Promise.all(
        pages.map(
          (
            page,
            index
          ) =>
            mapPageToGalleryEntry(
              page,
              index
            )
        )
      );

    const filtered =
      entries.filter(
        (entry) =>
          !!entry.image &&
          entry.image.trim() !==
          ""
      );

    filtered.sort(
      (a, b) =>
        a.date < b.date
          ? 1
          : -1
    );

    return filtered;
  } catch (error) {
    console.warn(
      "[notion] erro ao buscar gallery",
      error
    );

    return [];
  }
}