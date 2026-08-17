import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

/**
 * MUAC content layer — Notion is the single source of truth.
 *
 * Notion is the primary CMS.
 *
 * Archive
 *   └── Profiles (Relation)
 *          └── Profile
 *
 * This file is intentionally responsible only for the content/data layer.
 * The UI should consume the exported types and functions below.
 */

export type ArchiveBlock =
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "heading"; text: string }
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
   Videos
   ========================================================================= */

export type VideoEntry = {
  slug: string;
  title: string;
  note: string;
  youtubeId?: string;
  cover: string;
  date: string;
  source: "muac" | "nicoly";
};

/* =========================================================================
   Notion client + generic property readers
   ========================================================================= */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID =
  process.env.NOTION_DATABASE_ID;

export const NOTION_CONFIGURED = Boolean(
  NOTION_TOKEN && NOTION_DATABASE_ID
);

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
    });
  }

  return client;
}

type Props = PageObjectResponse["properties"];

function logMatch(
  entity: string,
  field: string,
  propName: string | null
) {
  if (process.env.NODE_ENV !== "production") {
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

/**
 * Find a property by exact type, optionally narrowed
 * by a list of likely property names.
 */
function findProp(
  props: Props,
  type: string,
  candidates?: string[]
): {
  name: string;
  value: Props[string];
} | null {
  const entries = Object.entries(props);

  if (candidates) {
    for (const name of candidates) {
      const hit = entries.find(
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

  const anyOfType = entries.find(
    ([, value]) => value.type === type
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
  if (!rt) return "";

  return rt
    .map((item) => item.plain_text)
    .join("");
}

/* =========================================================================
   Property readers
   ========================================================================= */

function readTitle(
  props: Props,
  entity: string
): string {
  const hit = findProp(
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
    hit.value.type !== "title"
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
  const hit = findProp(
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
    hit.value.type !== "rich_text"
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
  const hit = findProp(
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
    hit.value.type !== "number"
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
  const hit = findProp(
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
    hit.value.type !== "date" ||
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
  const hit = findProp(
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
    hit.value.type !== "checkbox"
  ) {
    return null;
  }

  return hit.value.checkbox;
}

function readMultiSelect(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string[] {
  const hit = findProp(
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
    hit.value.type !== "multi_select"
  ) {
    return [];
  }

  return hit.value.multi_select.map(
    (option) => option.name
  );
}

function readRelation(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string[] {
  const hit = findProp(
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
    hit.value.type !== "relation"
  ) {
    return [];
  }

  return hit.value.relation
    .map((relation) => relation.id)
    .filter(Boolean);
}

function readFiles(
  props: Props,
  entity: string,
  field: string,
  candidates: string[]
): string | null {
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
    hit.value.type !== "files" ||
    hit.value.files.length === 0
  ) {
    return null;
  }

  const file = hit.value.files[0];

  if (file.type === "external") {
    return file.external.url;
  }

  if (file.type === "file") {
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
  const hit = findProp(
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
    hit.value.type !== "url"
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
      ""
    );
}

function pageCoverUrl(
  page: PageObjectResponse
): string | null {
  const cover = page.cover;

  if (!cover) return null;

  if (cover.type === "external") {
    return cover.external.url;
  }

  if (cover.type === "file") {
    return cover.file.url;
  }

  return null;
}

/* =========================================================================
   Profile resolver
   ========================================================================= */

/**
 * In-memory cache.
 *
 * This prevents multiple Archive entries referencing the same
 * person from causing repeated Notion requests during the same
 * server process.
 */
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
    profileCache.get(profileId);

  if (cached) {
    return cached;
  }

  const pending =
    profileRequestCache.get(profileId);

  if (pending) {
    return pending;
  }

  const request =
    (async (): Promise<Profile | null> => {
      try {
        const page =
          await notion().pages.retrieve({
            page_id: profileId,
          });

        if (!isFullPage(page)) {
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

        const profile: Profile = {
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
    profileIds.length === 0
  ) {
    return [];
  }

  const uniqueIds = [
    ...new Set(profileIds),
  ];

  const profiles =
    await Promise.all(
      uniqueIds.map((id) =>
        getProfileById(id)
      )
    );

  return profiles
    .filter(
      (
        profile
      ): profile is Profile =>
        profile !== null
    )
    .map((profile) => ({
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
    }));
}

/* =========================================================================
   Archive → Notion page mapping
   ========================================================================= */

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
    pageCoverUrl(page) ||
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
        ? String(number).padStart(
            3,
            "0"
          )
        : String(index + 1).padStart(
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

function mapBlocks(
  blocks: BlockObjectResponse[]
): ArchiveBlock[] {
  const out: ArchiveBlock[] = [];

  let pendingList: {
    ordered: boolean;
    items: string[];
  } | null = null;

  const flushList = () => {
    if (
      pendingList &&
      pendingList.items.length > 0
    ) {
      out.push({
        type: "list",
        ...pendingList,
      });
    }

    pendingList = null;
  };

  for (const block of blocks) {
    if (
      block.type ===
      "paragraph"
    ) {
      const text =
        richTextArrayToPlain(
          block.paragraph
            .rich_text
        );

      flushList();

      if (text.trim()) {
        out.push({
          type: "paragraph",
          text,
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
      block.type === "quote"
    ) {
      flushList();

      out.push({
        type: "quote",
        text:
          richTextArrayToPlain(
            block.quote.rich_text
          ),
      });
    } else if (
      block.type === "image"
    ) {
      flushList();

      const image =
        block.image;

      const url =
        image.type ===
        "external"
          ? image.external.url
          : image.file.url;

      const caption =
        richTextArrayToPlain(
          image.caption
        );

      out.push({
        type: "image",
        src: url,
        alt: caption || "",
        caption:
          caption || undefined,
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
          block_id: pageId,
          start_cursor: cursor,
          page_size: 100,
        });

    blocks.push(
      ...(response.results.filter(
        (result) =>
          "type" in result
      ) as BlockObjectResponse[])
    );

    cursor =
      response.has_more
        ? response.next_cursor ??
          undefined
        : undefined;
  } while (cursor);

  return blocks;
}

/* =========================================================================
   Published Archive query
   ========================================================================= */

/**
 * Best-effort "Published" filter.
 *
 * If no checkbox property exists at all,
 * everything is treated as published.
 */
async function queryPublishedArchive(): Promise<
  PageObjectResponse[]
> {
  const results: PageObjectResponse[] =
    [];

  let cursor:
    | string
    | undefined;

  do {
    const response =
      await notion()
        .databases.query({
          database_id:
            NOTION_DATABASE_ID!,
          start_cursor: cursor,
          page_size: 100,
        });

    results.push(
      ...(response.results.filter(
        isFullPage
      ) as PageObjectResponse[])
    );

    cursor =
      response.has_more
        ? response.next_cursor ??
          undefined
        : undefined;
  } while (cursor);

  if (
    results.length === 0
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
}

/* =========================================================================
   Public Archive API
   ========================================================================= */

export async function getArchive(): Promise<
  ArchiveEntry[]
> {
  if (!NOTION_DATABASE_ID) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_DATABASE_ID not set — returning empty array"
      );
    }

    return [];
  }

  try {
    const pages =
      await queryPublishedArchive();

    if (
      pages.length === 0
    ) {
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.warn(
          "[notion] query returned 0 results — getArchive will return empty array"
        );
      }

      return [];
    }

    const entries =
      await Promise.all(
        pages.map(
          (page, index) =>
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
      "[notion] error fetching archive — getArchive will return empty array",
      error
    );

    return [];
  }
}

export async function getArchiveEntry(
  slug: string
): Promise<ArchiveEntry | null> {
  if (!NOTION_DATABASE_ID) {
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
        entry.slug === slug
      ) {
        matchedEntry = entry;
        matchedPage = page;
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
      body: mapBlocks(blocks),
    };
  } catch (error) {
    console.warn(
      `[notion] error fetching archive entry "${slug}"`,
      error
    );

    return null;
  }
}

export async function getFeaturedEntry(): Promise<
  ArchiveEntry | null
> {
  const all =
    await getArchive();

  if (
    !all ||
    all.length === 0
  ) {
    return null;
  }

  return (
    all.find(
      (entry) =>
        entry.featured
    ) ?? all[0]
  );
}

/* =========================================================================
   Public Profile API
   ========================================================================= */

/**
 * Returns all profiles referenced by the Archive.
 *
 * This is useful later for /people.
 */
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
      profileIds.map((id) =>
        getProfileById(id)
      )
    );

  return profiles
    .filter(
      (
        profile
      ): profile is Profile =>
        profile !== null
    )
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "pt-BR"
      )
    );
}

/**
 * Returns a profile by its public slug.
 *
 * Example:
 * /people/rafa
 */
export async function getProfileBySlug(
  slug: string
): Promise<Profile | null> {
  const profiles =
    await getProfiles();

  return (
    profiles.find(
      (profile) =>
        profile.slug === slug
    ) ?? null
  );
}

/**
 * Returns all Archive entries in which
 * a specific profile appears.
 *
 * This is the foundation for the
 * future "people feed".
 */
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
      date: "2026-08-10",
      current: true,

      spotifyId:
        "6lzMbGKQaG1ElowNWfHz5w",

      tracks: [],
    },

    {
      slug: "playlist-002",
      title:
        "o que se passsa na minha cabeça",
      note:
        "uma curadoria de tudo que (in)felizmente sou...",
      cover:
        "/images/carpa.png",
      date: "2026-08-16",
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
   Videos
   ========================================================================= */

const staticVideos: VideoEntry[] =
  [
    {
      slug: "video-001",
      title:
        "vídeo placeholder — experimento 01",
      note:
        "espaço reservado para o primeiro vídeo publicado pela MUAC.",
      cover:
        "/images/carpa.png",
      date: "2026-07-01",
      source: "muac",
    },
  ];

export function getVideos(): VideoEntry[] {
  return [...staticVideos].sort(
    (a, b) =>
      a.date < b.date
        ? 1
        : -1
  );
}