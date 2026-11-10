# UX review and solutions

**As of:** 10 November 2026 · **Subject:** template "CanvasBio" with demo content ("Lauter Frauen") · **Type:** self-assessment

This document lists the usability problems found in the review of November 2026 and the solution agreed for each. It is the basis for the visual proposal and for the implementation that follow. Accessibility is covered by the [audit report](accessibility-audit.md) (in German); every solution here keeps WCAG 2.2 AA, and the last sections name the criteria and tests that have to be updated.

## Result

|             | Count | Findings                                                 |
| ----------- | ----- | -------------------------------------------------------- |
| Critical    | 4     | U1–U4                                                    |
| Significant | 8     | U5–U12                                                   |
| Minor       | 3     | U13–U15                                                  |
| Solved      | 15    | U1–U15 (U15: the mechanism; the demo quote is unchanged) |

**Overall:** browsing works well: the mosaic, the chapter index, the random biography and the focus handling need no change. The problems are in three places: reading a biography (U1, U5, U12), searching (U2, U3, U11) and moving on from a biography (U4, U6).

## Method

| Procedure          | Scope                                                                                                  | Where                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Code walk-through  | Every route and flow: start, four views, biography, search and filters, menu, text pages, not found    | `app/routes`, `app/components`                    |
| Screenshots        | Static build, 393 × 659 px (iPhone 15 profile) and 1440 × 900 px, light and dark, with the open states | Playwright (Chromium), not kept in the repository |
| Measurements       | History entries, positions relative to the first screen, row and page heights                          | Playwright (Chromium)                             |
| Content statistics | Entries per biography section over all 783 people                                                      | `content/people/*/de.md`                          |
| Real devices       | iPhone (Safari), Android (Chrome)                                                                      | **open**                                          |
| Screen readers     | VoiceOver, TalkBack, NVDA                                                                              | **open** – [protocol](screenreader-protokoll.md)  |

## Findings and solutions

Legend: ● critical · ◐ significant · ○ minor

### Reading a biography

| ID  | Priority | Finding                                                                                                                                                                                            | Solution                                                                                                             |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| U1  | ●        | The life story is behind the second tab. The first tab shows one line and about three facts. The third tab has at most two entries (birth, death) for 451 of 783 people. No biography has a quote. | One continuous page instead of tabs; section links only where the page is long. See [U1](#u1-biography-as-one-page). |
| U5  | ◐        | A biography opened from a shared link fills the phone screen without the site's name or navigation. There is no way to share it.                                                                   | Share button in the top bar; a line at the end that says where the reader is. See [U5](#u5-sharing-and-arriving).    |
| U12 | ◐        | On phones the tabs and the close button float over the text without a background; lines of text run through them.                                                                                  | One solid bar for section links, share and close. Part of [U1](#u1-biography-as-one-page).                           |
| U13 | ○        | "Biografie" names the page and its first tab. In English "Timeline" names a tab and a view.                                                                                                        | Sections are called "Überblick / Overview", "Lebensgeschichte / Life story", "Lebenslauf / Life in dates".           |
| U14 | ○        | An unknown biography address on a phone shows "not found" in the sheet without a close button.                                                                                                     | The sheet keeps its top bar with "Close" in the error state.                                                         |

### Searching

| ID  | Priority | Finding                                                                                                                                                                                    | Solution                                                                                                                        |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| U2  | ●        | A search from the start page opens the mosaic, where matches stay scattered. "Zetkin" + Enter lights one tile among 783 instead of opening her. With 60 matches a phone shows one of them. | A single name match opens the person; other searches land in the list; mosaic and map link to it. See [U2](#u2-search-results). |
| U3  | ●        | In list and timeline the results bar scrolls away; nothing in the navigation shows that a filter is active. It still narrows previous/next and the random biography.                       | A mark on the search button; the biography says when it moves within results. See [U3](#u3-active-search-stays-visible).        |
| U11 | ◐        | Name suggestions rank ties by `prominence` and stop after five. The project rule is never to rank or cut people by prominence.                                                             | Ties alphabetical; a last row "Alle N anzeigen". See [U11](#u11-name-suggestions).                                              |

### Moving between views and biographies

| ID  | Priority | Finding                                                                                                                                                                                              | Solution                                                                                                                |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| U4  | ●        | Closing a biography adds a history entry. The back button then reopens it; every "next" adds one more (six entries after three steps).                                                               | Closing goes back in history. See [U4](#u4-history).                                                                    |
| U6  | ◐        | From mosaic and map, previous/next follow an order the reader never sees (Clara Zetkin between Consuelo Zavala and He Zhen).                                                                         | Previous/next only where the reader chose or sees the order. See [U6](#u6-previous-and-next).                           |
| U7  | ◐        | On phones the view switch is an icon with a chevron. The start page's tabs look like the same switch but only change a preview; the list is two taps away, three of four tabs have no visible label. | Labelled switch; the start page links straight to each view. See [U7](#u7-choosing-a-view).                             |
| U8  | ◐        | On a phone the timeline's first screen holds the key dates and the axis; the first person starts at 637 of 659 px.                                                                                   | Key dates fold away on narrow screens. See [U8](#u8-timeline-on-phones).                                                |
| U9  | ◐        | The list is about 196 phone screens long, three people per screen. The tag overflow "+2" looks like a control but is not one.                                                                        | Compact rows on phones. See [U9](#u9-list-on-phones).                                                                   |
| U10 | ◐        | The map's place list is one flat list sorted by count, without search or grouping. The search panel already groups places by continent.                                                              | Same grouping as the search panel, plus a filter field. See [U10](#u10-place-list-of-the-map).                          |
| U15 | ○        | The start page quotes Hedwig Dohm, who has no biography in the demo collection.                                                                                                                      | Optional `start.quote.person` links the source to a biography; the content check warns if the quoted person is missing. |

## Solutions in detail

### U1 Biography as one page

The tabs go. A biography is one page that reads from top to bottom:

| #   | Section                         | Content                                                                   | Shown                                                   |
| --- | ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Head                            | Portrait (phones: at the top; from 1024 px: beside the facts), name, tags | always                                                  |
| 2   | "Überblick / Overview"          | Summary line, key facts, quote, portrait credit                           | always; no heading of its own (the name is its heading) |
| 3   | "Lebensgeschichte / Life story" | Contents (for three or more parts), the text, notes                       | if there is a text                                      |
| 4   | "Lebenslauf / Life in dates"    | The dated entries                                                         | only with three or more entries                         |
| 5   | "Quellen / Sources"             | Sources and licences                                                      | always                                                  |
| 6   | "Ähnliche Biografien"           | Related people                                                            | if any                                                  |
| 7   | "Weitere Biografien"            | Previous/next ([U6](#u6-previous-and-next)), random biography             | see U6                                                  |

- **Top bar:** one solid bar in the surface colour that sticks to the top of the sheet or card: section links on the left, share and close on the right. It replaces the two floating layers (U12). On phones it appears once the portrait has scrolled past; before that only share and close float on the portrait, each on its own round background as today.
- **Section links:** "Überblick", "Lebensgeschichte", "Lebenslauf" as links in a `nav`, shown only for the sections that exist, and only if there are at least two. The section being read is marked (`aria-current`), as in the chapter index of the list.
- **Addresses:** `#geschichte` and `#lebenslauf` (`#story`, `#timeline`) stay valid. They now scroll to the section instead of choosing a tab, so old links keep working. Links in the contents of the life story still leave the address alone.
- **Configuration:** `detail.tabs` keeps its shape (`id`, `label`, `shortLabel`, `slug`) and is read as the list of sections. The README entry changes from "Biography tabs" to "Biography sections".
- **Without JavaScript and in print:** nothing changes; all sections were already in the HTML.

Effect on the demo content: the 451 biographies with two dated entries lose a section that repeated their facts, and every biography shows its text without a tap.

### U2 Search results

| Situation                                                    | Today                                  | New                                                                                 |
| ------------------------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Name typed, exactly one person matches, no filter set, Enter | Mosaic with one lit tile               | The biography opens                                                                 |
| Search applied from the start page or a text page            | Mosaic                                 | List                                                                                |
| Search applied in list, timeline, mosaic or map              | Stays in the view                      | Stays in the view (unchanged)                                                       |
| Results bar in mosaic and map                                | "Suche ändern", filters, previous/next | Additionally "Als Liste zeigen": the list with the same search                      |
| Nothing entered                                              | Button "783 Ergebnisse anzeigen"       | Button "Alle 783 anzeigen"; it closes the panel and clears a search that was active |

The panel stays one panel with one button; the search still applies only on submit (WCAG 3.2.2, as documented in the audit report).

| Key                 | Deutsch           | English      |
| ------------------- | ----------------- | ------------ |
| `search.asList`     | Als Liste zeigen  | Show as list |
| `search.showAll(n)` | Alle {n} anzeigen | Show all {n} |

### U3 Active search stays visible

- **Search button:** while a search is active, the button in the navigation carries a filled dot in the accent colour, and its name says so. The dot is a shape, not only a colour (WCAG 1.4.1).
- **Biography:** when previous/next move within search results, a line above them says so and offers the way out.
- **Random biography:** within a search the label names the limit, in the list toolbar, on the mosaic and in the biography.

| Key                       | Deutsch                                 | English                              |
| ------------------------- | --------------------------------------- | ------------------------------------ |
| `nav.searchActive(n)`     | Suche, {n} Ergebnisse                   | Search, {n} results                  |
| `detail.withinResults(n)` | Sie blättern in {n} Suchergebnissen.    | You are browsing {n} search results. |
| `detail.leaveResults`     | Alle Biografien                         | All biographies                      |
| `random.inResults`        | Zufällige Biografie aus den Ergebnissen | Random biography from the results    |

The results bar itself stays where it is. A second sticky bar on phones would compete with the navigation and the timeline's axis.

### U4 History

| Action                                               | Today                    | New                                                                                           |
| ---------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Open a biography from an overview                    | New entry                | New entry (unchanged); the layout remembers the overview's place in the history               |
| Related, previous, next, random inside a biography   | New entry                | New entry; the back button returns to the biography before                                    |
| Close (button, Escape, backdrop, swipe down)         | New entry (the overview) | Back in history to the overview entry the reader came from, however many biographies followed |
| Close a biography that was the first page of a visit | New entry (the overview) | The overview replaces the entry; back leaves the site as expected                             |
| Back button after closing                            | Reopens the biography    | Leaves the overview for the page before it                                                    |

The overview's place is the index React Router keeps in the history state; it is remembered while the people pages are open. After a reload of an open biography it is unknown, and closing replaces the entry as on a direct link. Focus still returns to the person in the overview after closing, and the sheet still slides down first on phones.

### U5 Sharing and arriving

- **Share:** a button in the top bar of the biography. It calls the system's share sheet where there is one (phones) and copies the address elsewhere, with a status message. The address includes the section hash if the reader is in one.
- **Arriving:** if the biography is the first page of the visit, the end of the page names the site and leads into the collection, above "Ähnliche Biografien". Readers who came from an overview do not see it.

| Key                      | Deutsch                            | English                          |
| ------------------------ | ---------------------------------- | -------------------------------- |
| `detail.share`           | Teilen                             | Share                            |
| `detail.linkCopied`      | Link kopiert                       | Link copied                      |
| `detail.partOf(n, name)` | Eine von {n} Biografien bei {name} | One of {n} biographies at {name} |
| `detail.discoverAll`     | Alle Biografien entdecken          | Discover all biographies         |

### U6 Previous and next

| Opened from                    | Previous/next                                               | Label above                                   |
| ------------------------------ | ----------------------------------------------------------- | --------------------------------------------- |
| List                           | In the chosen order                                         | The order, e.g. "Name A–Z"                    |
| Timeline                       | In the chosen order                                         | The order, e.g. "Geburtsjahr, älteste zuerst" |
| Any view with an active search | Within the results (list and timeline: in the chosen order) | See [U3](#u3-active-search-stays-visible)     |
| Mosaic or map, no search       | Not shown                                                   |                                               |
| Direct link                    | Not shown                                                   |                                               |

Related biographies and the random biography are always there, so no biography is a dead end.

### U7 Choosing a view

- **View switch on phones:** the button shows the name of the active view next to its icon on every screen size. To make room below 480 px, the brand in the navigation of the four overview pages shows the monogram (`brand.monogram`) instead of the wordmark; its accessible name stays "Lauter Frauen – Startseite". Everywhere else the wordmark stays.
- **Start page:** the four tabs become four links, each with icon and name, each opening its view with one tap. The mosaic preview stays as the picture of the page and as the main way in ("Mosaik öffnen"). From 1024 px, pointing at or focusing a link shows that view's preview in the card; on phones the card always shows the mosaic. The links sit below the card on every screen, so the reading and focus order is the same everywhere (the visual proposal had them above it from 1024 px).

This removes the tab pattern from the start page; the group keeps its name "Ansichten".

### U8 Timeline on phones

Below the `@xl` container width the key dates are folded into one line, "Wichtige Daten (6)", that opens in place (`aria-expanded`). The diamonds on the axis stay. From `@xl` the two-column list stays open as today. Without JavaScript the list is open.

### U9 List on phones

Rows on narrow containers (below `@lg`):

| Element  | Today               | New                                      |
| -------- | ------------------- | ---------------------------------------- |
| Portrait | 80 px               | 56 px                                    |
| Name     | Heading size        | Body size, semibold                      |
| Summary  | All lines, wrapping | Two lines at most, the rest cut with "…" |
| Tags     | First tag and "+2"  | Not shown (still read by screen readers) |

Target: six people on a 659 px screen instead of three. Wider layouts keep today's row.

### U10 Place list of the map

- **Grouping:** continents with their countries, and the places under each country, in alphabetical order, as the place field of the search panel already does (`placeGroups`). Counts stay next to each entry. Each level opens in place.
- **Filter field:** "Ort suchen" at the top of the panel narrows the list while typing.
- **Unchanged:** choosing a place moves the map there and lists its people; "N ohne bekannten Ort" stays at the end.

### U11 Name suggestions

- Ties are ordered by sort name, not by `prominence`.
- If more than five people match, a last row "Alle {n} anzeigen" applies the name search and opens the list (as in [U2](#u2-search-results)).
- The same rule goes for related biographies: ties are broken by a stable hash of the slug instead of `prominence` (`app/lib/content/related.ts`). The random biography keeps its weighting: it does not rank or cut, and favouring lesser-known people is its documented purpose.

## User flows

| Goal                         | Today                                                                           | New                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Find one person by name      | Search, type, Enter, mosaic with one lit tile, tap it                           | Search, type, Enter: the biography                                     |
| See everyone in a field      | Search, choose a field, apply, mosaic, look for lit tiles or switch to the list | Search, choose a field, apply: the list                                |
| Read a life story            | Open the biography, find and tap "Geschichte", read                             | Open the biography, read                                               |
| Close and carry on           | Close; the back button reopens the biography                                    | Close or back, with the same result                                    |
| Pass a biography on          | Copy the address from the browser, if it is visible                             | "Teilen"                                                               |
| Arrive from a shared link    | Biography without context; "Close" leads to the mosaic                          | Biography with the site named at its end and a way into the collection |
| Open the list from the start | Tap the list tab, tap "Liste öffnen"                                            | Tap "Liste"                                                            |

## Effects on the accessibility documents

| Document                                            | Entry                                                                                                                | Change                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Audit report](accessibility-audit.md)              | 2.4.5, 4.1.2                                                                                                         | Tabs are no longer used in the biography or on the start page; name the section navigation instead |
|                                                     | 2.4.11                                                                                                               | The solid top bar of the biography needs a scroll margin for focus and jumps                       |
|                                                     | 1.4.1, 4.1.3                                                                                                         | Mark on the search button; status message "Link kopiert"                                           |
|                                                     | 2.4.3                                                                                                                | Closing by going back in history still returns focus to the person in the overview                 |
| [Screen reader protocol](screenreader-protokoll.md) | Steps 1, 7, 12                                                                                                       | Start page links instead of tabs; sections instead of tabs; search lands in the list               |
| Tests                                               | `e2e/person-detail.spec.ts`, `e2e/search.spec.ts`, `e2e/start.spec.ts`, `e2e/navigation.spec.ts`, `e2e/a11y.spec.ts` | Tab tests become section tests; new tests for history, share, search landing and the search mark   |

## Decided

- **No tabs in the biography.** The three tabs are not a requirement of the template.
- **Language of this document:** English, like the README.
- **Not changed:** the mosaic and its gestures, the chapter index, the weighting of the random biography, focus handling, the menu, language and appearance settings.

## Open points

1. **Visual proposal:** done in Phase 3 and rolled out across the app: three elevation levels (`shadow-float`, `shadow-panel`, `shadow-dialog`), corner radius by role (full, card, xl, md), one segmented control (`app/components/ui/segmented.ts`; the map toggle now uses the accent colour), one close button, `text-eyebrow` for small headings, `text-display`, `text-quote` and `text-wordmark` for the sizes off the scale, outlines without opacity variants. The style guide page (`/styleguide`) shows them. Not adopted: a check mark in the chosen segment; the fill already marks it (accepted under 1.4.1 in the audit report).
2. **Monogram in the navigation (U7):** implemented on the four overview pages below 480 px; documented as an exception under WCAG 2.5.3 in the audit report.
3. **Place hierarchy (U10):** resolved without new content. A place belongs to the country all people linked to it share; where that is ambiguous, the key facts name it ("in Königshain-Wiederau, Deutschland"). This assigns 916 of 918 map places, with no disagreement between the two; the other two are listed under "Weitere Orte".
4. **Real devices and screen readers** after implementation, as in the audit report.
5. **Start page quote (U15):** `start.quote.person` now links the quote's source to that biography, and the content check warns if the slug is missing. The demo quotes Hedwig Dohm, who has no biography in the collection: either add hers or choose a quote by someone in it.

## Order of implementation

| Step | Findings          | Why in this order                                                      |
| ---- | ----------------- | ---------------------------------------------------------------------- |
| 1    | U4                | Small, independent, and every later test of the biography relies on it |
| 2    | U1, U12, U13, U14 | The biography page; the largest change                                 |
| 3    | U5, U6            | Build on the new top bar and end of the biography                      |
| 4    | U2, U3, U11       | Search                                                                 |
| 5    | U7                | Navigation and start page                                              |
| 6    | U8, U9, U10, U15  | Independent improvements of single views                               |
