# QCF V2 Mushaf reader

## Official contract

The authenticated server-only Quran adapter uses the Quran Foundation Content
API and the Madani QCF V2 Mushaf (`mushaf=1`). It requests verses by page with
word data and the fields needed for rendering and accessibility: `code_v2`,
`v2_page`, `page_number`, `line_number`, `position`, `char_type_name`,
`verse_key`, `text_qpc_hafs`, and verse-level `text_uthmani`.

Primary references:

- https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/
- https://api-docs.quran.foundation/docs/tutorials/fonts/page-layout/
- https://api-docs.quran.foundation/docs/content_apis_versioned/4.0.0/verses-by-page-number/
- https://api-docs.quran.foundation/legal/developer-terms/

No Quran Foundation client ID, secret, access token, or authorization header is
sent to the browser or written to browser storage.

## Page construction

The adapter flattens words in provider order, verifies every word and its
`v2_page` belong to the requested page, verifies line and position data, rejects
duplicate word IDs or unsafe glyph markup, groups by `line_number`, and emits
lines in numeric order. The renderer never rebuilds a page from verse strings
and never allows individual words to wrap.

Each page uses `p{PAGE}-v2` from the official URL:

`https://verses.quran.foundation/fonts/quran/hafs/v2/woff2/p{PAGE}.woff2`

Verse-end markers and provider-supplied Basmala text use the official
`UthmanicHafs1Ver18` font. A deterministic module-level promise cache loads each
font once per document. A failed font load produces a clear incomplete-page
state; QCF glyphs are never shown through a fallback font.

Surah names use restrained text headings because the current content response
does not provide an official decorative heading asset. Whether a Basmala
precedes a Surah comes from `chapters.bismillah_pre`; its Arabic text is loaded
from the official `1:1` response and is not reconstructed locally.

## Accessibility and selection

The visual QCF canvas is `aria-hidden` and non-selectable because its private-use
glyphs are not meaningful to screen readers or clipboard consumers. A separate
screen-reader structure announces page, Surah, verse, and the official Arabic
word text for the portion present on that page. This prevents duplicate reading
when an ayah crosses a page boundary.

## Offline boundary

The latest `main` baseline does not contain an explicit IndexedDB Wird download
feature. This change therefore does not add automatic storage of authenticated
pages. It preserves the existing public offline shell and adds a dedicated
Service Worker cache only for official QCF fonts requested by a displayed page.
Successful fonts expire after seven days, matching the Quran Foundation
content-retention limit. Missing or expired fonts fail closed.

The versioned `QuranPage` line model contains the minimum rendering and
accessible-text data needed by a future explicit, account-scoped download flow.
That flow must still store complete page ranges atomically and add
`downloadedAt`/`expiresAt` metadata before claiming offline availability.

## Progress boundary

Rendering, font loading, scrolling, and notification navigation never complete
a session or advance Quran progress. The existing reader route continues to
record only its established last-opened position after the complete assigned
page range loads. Session completion remains an explicit confirmed action.

## Manual visual review

Before merge, compare pages 1, 22, 80, a page containing a Surah boundary, and a
page in the final Juz with Quran.com or another authoritative Quran Foundation
rendering. Confirm word order, official line boundaries, verse markers, Surah
and Basmala placement, font/page matching, clipping, and stable layout after the
font loads at 320px and desktop widths.
