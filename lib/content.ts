import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

/**
 * MUAC content layer â€” Notion is the single source of truth.
 *
 * Notion is the primary CMS.
 *
 * Archive
 *   â””â”€â”€ Profiles (Relation)
 *          â””â”€â”€ Profile
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

export type ArchiveBlock =
  | {
      type: "paragraph";
      text: string;
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
        "NOTION_TOKEN nÃ£o estÃ¡ definido no ambiente do servidor."
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
        `[notion] ${entity}.${field} â† propriedade "${propName}"`
      );
    } else {
      console.warn(
        `[notion] ${entity}.${field} â€” nenhuma propriedade correspondente encontrada`
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
   Notion Data Source resolver
   ========================================================================= */

let resolvedDataSourceId:
  | string
  | null = null;

async function getDataSourceId(): Promise<string> {
  if (
    NOTION_DATA_SOURCE_ID
  ) {
    return NOTION_DATA_SOURCE_ID;
  }

  if (
    resolvedDataSourceId
  ) {
    return resolvedDataSourceId;
  }

  if (
    !NOTION_DATABASE_ID
  ) {
    throw new Error(
      "NOTION_DATABASE_ID nÃ£o estÃ¡ definido."
    );
  }

  const database =
    await notion().databases.retrieve(
      {
        database_id:
          NOTION_DATABASE_ID,
      }
    );

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

  if (
    sources.length ===
    0
  ) {
    throw new Error(
      [
        "Nenhum Data Source foi encontrado dentro do database do Notion.",
        `Database ID: ${NOTION_DATABASE_ID}`,
        "Verifique se a integraÃ§Ã£o tem acesso ao database.",
      ].join(" ")
    );
  }

  resolvedDataSourceId =
    sources[0].id;

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    console.log(
      `[notion] Data Source resolvido automaticamente: ${resolvedDataSourceId}`
    );
  }

  return resolvedDataSourceId;
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
              "DescriÃ§Ã£o",
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
              "FunÃ§Ã£o",
              "ProfissÃ£o",
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
   Archive â†’ Notion mapping
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
    "sem tÃ­tulo";

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
        "NÃºmero",
        "Num",
        "Ãndice",
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
        "FunÃ§Ã£o",
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
        "DescriÃ§Ã£o",
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
        "Data de publicaÃ§Ã£o",
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

function mapBlocks(
  blocks: BlockObjectResponse[]
): ArchiveBlock[] {
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

      if (
        text.trim()
      ) {
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
      block.type ===
      "image"
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
        alt:
          caption || "",
        caption:
          caption ||
          undefined,
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

async function queryPublishedArchive(): Promise<
  PageObjectResponse[]
> {
  if (
    !NOTION_DATABASE_ID ||
    !NOTION_TOKEN
  ) {
    return [];
  }

  const dataSourceId =
    await getDataSourceId();

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

    /**
     * IMPORTANT:
     *
     * Do not use:
     *
     * response.results.filter(isFullPage)
     *
     * because some versions of the SDK type
     * response.results as unknown[].
     *
     * Instead we validate each result locally.
     */
    for (const result of response.results) {
      if (
        isPageObject(result)
      ) {
        results.push(result);
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

  /*
   * Published / Publicado / Public
   *
   * If the database has one of these properties
   * as a checkbox, only checked pages are shown.
   *
   * If no such property exists, every page is
   * considered published.
   */
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
  if (
    !NOTION_DATABASE_ID
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.warn(
        "[notion] NOTION_DATABASE_ID nÃ£o configurado â€” retornando array vazio"
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
        "[notion] NOTION_TOKEN nÃ£o configurado â€” retornando array vazio"
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
          "[notion] query retornou 0 resultados â€” getArchive retornarÃ¡ array vazio"
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
        mapBlocks(
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
        "eu quando tenho muito amor pra dar â€” atualizada sem aviso.",
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
        "o que se passsa na minha cabeÃ§a",
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
  const props = page.properties;
  const entity = `Gallery[${index}]`;

  const title = readTitle(props, entity) || "sem tÃ­tulo";

  const explicitSlug = readRichText(props, entity, "slug", ["Slug", "slug"]);

  let slug = explicitSlug || slugify(title) || page.id;

  // Image
  const imageCandidates = ["Image", "Imagem", "Photo", "Foto", "Cover", "Capa"];
  let image =
    readFiles(props, entity, "image", imageCandidates) ||
    readUrl(props, entity, "imageUrl", ["Image URL", "Imagem URL", "Photo URL", "Foto URL"]) ||
    pageCoverUrl(page) || "";

  // Note
  const note = readRichText(props, entity, "note", [
    "Note",
    "Nota",
    "Caption",
    "Legenda",
    "Description",
    "DescriÃ§Ã£o",
  ]);

  // Date
  const date =
    readDate(props, entity, "date", [
      "Date",
      "Data",
      "Published Date",
      "Data de publicaÃ§Ã£o",
    ]) || page.created_time;

  // Source
  const rawSource = readSelect(props, entity, "source", ["Source", "Fonte"]);
  const source =
    rawSource && rawSource.toLowerCase() === "nicoly"
      ? "nicoly"
      : "muac";

  // Tags
  const tags = readMultiSelect(props, entity, "tags", ["Tags", "Categorias", "Tags/Categorias"]);

  // Featured
  const featured = readCheckbox(props, entity, "featured", ["Featured", "Destaque", "Destacar"]) ?? false;

  return {
    id: page.id,
    slug,
    title,
    note,
    image,
    date,
    source,
    tags,
    featured,
  };
}

async function queryPublishedGallery(): Promise<PageObjectResponse[]> {
  if (!NOTION_DATABASE_ID || !NOTION_TOKEN) {
    return [];
  }

  const dataSourceId = await getDataSourceId();

  const results: PageObjectResponse[] = [];

  let cursor: string | undefined;

  do {
    const response = await notion().dataSources.query({
      data_source_id: dataSourceId,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });

    for (const result of response.results) {
      if (isPageObject(result)) {
        results.push(result);
      }
    }

    cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
  } while (cursor);

  if (results.length === 0) {
    return results;
  }

  const publishedHit = findProp(results[0].properties, "checkbox", ["Published", "Publicado", "Public"]);

  if (!publishedHit) {
    return results;
  }

  return results.filter((page) => {
    const property = page.properties[publishedHit.name];
    return property.type === "checkbox" && property.checkbox === true;
  });
}

export async function getGallery(): Promise<GalleryEntry[]> {
  if (!NOTION_DATABASE_ID) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[notion] NOTION_DATABASE_ID nÃ£o configurado â€” retornando array vazio");
    }
    return [];
  }

  if (!NOTION_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[notion] NOTION_TOKEN nÃ£o configurado â€” retornando array vazio");
    }
    return [];
  }

  try {
    const pages = await queryPublishedGallery();

    if (pages.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[notion] query retornou 0 resultados â€” getGallery retornarÃ¡ array vazio");
      }
      return [];
    }

    const entries = await Promise.all(
      pages.map((page, index) => mapPageToGalleryEntry(page, index))
    );

    const filtered = entries.filter((e) => !!e.image && e.image.trim() !== "");

    filtered.sort((a, b) => (a.date < b.date ? 1 : -1));

    return filtered;
  } catch (error) {
    console.warn("[notion] erro ao buscar gallery", error);
    return [];
  }
}
