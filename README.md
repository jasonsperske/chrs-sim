# The Radio Room

An early, static-hosted classic radio collecting experience for the California
Historical Radio Society. Built with browser-native JavaScript, Three.js through
Object Studio, and IndexedDB. No server, account, or package installation is needed.

## Run

- `npm run dev` serves the source on port 5173 (`PORT=5187 npm run dev` if it is
  taken). Like the static host, it answers paths without a file with
  `index.html`, so deep links such as `/radio/<catalog-id>` load.
- `npm run preview` builds and serves `dist/`.
- `npm test` checks bookmarks and their migration, shelf packing and model fit, framing, and recording catalogs.
- `npm run build` writes the standalone website to `dist/`.

## Included

- Welcome screen with an interactive Object Studio RCA Victor GGIE radio.
- Every radio in the catalog is on the virtually infinite 3D wooden shelves from
  the first visit; there is nothing to add or acquire. Drag, use two-axis scrolling,
  Shift-scroll horizontally, use arrow keys, and zoom using the controls or Ctrl-scroll.
- Historical attributes (manufacturer, release year, era, type) belong to the
  catalog model and are read-only. “View shelves by” makes shelf labels match the
  actual attribute values across the user's entire collection.
- Favorites, Personal, and Highlighted are optional bookmarks for finding radios
  again out of the larger set. They are independent memberships; a radio can be
  in any or all of them. Each membership has its own added timestamp; its shelf
  shows the most recently marked radio first. Editing details preserves this order;
  removing and re-adding a membership puts it first again.
- Personal history stores Owned / Used / Owned and used, optional from/to years,
  an ongoing flag, and a note. Years appear on the radio's shelf label in all views;
  historical release dates remain unchanged. Highlighted radios receive a badge
  and display lighting; favorites receive a star.
- All radios and All my collections views are available. Region heights expand
  with their contents to prevent adjacent collections overlapping. Bookmarks are
  stored in IndexedDB, one record per catalog radio, keyed by its catalog id.
  Acquired copies saved by earlier versions merge into their radio's bookmark:
  each membership keeps its latest time and the most recent personal history
  wins. Legacy single shelf placements migrate to independent memberships;
  historical placements do not invent personal memberships.
- Each radio has its own page, in the spirit of Object Studio's page per object:
  `/radio/<catalog-id>` is its About mode (history, model notes, resources and
  bookmarks) and `/radio/<catalog-id>/listen` its listening corner mode. The
  page's favorite toggle works in both modes. The top bar's Listening corner opens
  the listening mode of the radio viewed last. The workbench is disabled for now.
- Four radios from Object Studio: the 1939 RCA Victor GGIE, the 1938 Silvertone
  6110 “Rocket”, Oliver P. Fritchle's c.1931 cabinet radio, and the 1940s Navy field
  transmitter-receiver shown in the Navajo Code Talkers exhibit.
- Shelves are a bento layout. Each catalog radio declares a `footprint` in shelf
  slots and rows, e.g. the Fritchle is 2×3 and the field radio 2×2. Each shelf
  region packs its radios densely in order (by release year, or newest bookmark
  first on a personal collection's shelf): small radios fill the
  gaps beside large ones. The shelf boards inside a large radio's cell are left
  out and dividers close its sides.
- The listening corner frames each radio at its own size. Tabletop radios stand
  on a table sized to their footprint. Floor-standing radios like the Fritchle
  stand on a low plinth, on a taller stage, and fill most of it. The camera keeps
  the radio in view at any turn.
- Listening corner with power, volume, and Another recording controls. Each radio
  loads its own JSON catalog from `public/broadcasts/<catalog-id>.json`:
  - RCA: twelve FDR Library recordings, 1939–1940, including the opening of the
    Golden Gate International Exposition.
  - Silvertone: twelve 1938 broadcasts, including The War of the Worlds.
  - Fritchle: nine from 1931–1932, mostly the 1932 campaign.
  - Field radio: twelve wartime bulletins, Armed Forces Radio Service relays and
    addresses a station could have received, 1942–1945.
- Random selection weights are 6 for the current month, 3 for adjacent months,
  2 for months two away, and 1 otherwise. Month distance wraps across December
  and January, uses the visitor's local month, and multiplies each track's baseWeight.
  The previous track is excluded when alternatives exist. Playback advances on
  completion; Another recording also makes a fresh weighted choice.
- Dates, speaker, and archival source are displayed for each recording. Audio starts
  on user input and stops when leaving the room. Catalog and playback failures offer
  retries and source links. Metadata is local; audio streams from the archive.
- IndexedDB persistence for bookmarks, personal history, view position, zoom,
  grouping, the last radio viewed, and volume. Storage failures fall back to the current visit.
- Responsive layout, keyboard controls, native form controls, and reduced-motion support.

## Radio pages and adding radios

Open any radio from the shelves, or go straight to `/radio/<catalog-id>`. Use the
page's **About** and **Listening corner** modes to switch between its history and
its period recordings; each mode has its own URL, so both can be linked to.
`window.radioRoom.openRadio(catalogId, 'about' | 'listen')` opens a page and
`window.radioRoom.getCollection()` reads every radio with its bookmarks. No input
is evaluated as executable source: only the locally bundled, trusted Object
Studio model generators are compiled.

The learning library and workbench are future features. To add a radio to the
collection, vendor its
Object Studio generator into `public/vendor/`, register it in `src/catalog.js` with
its footprint and poses, and add its catalog JSON using the existing schema;
recording dates must fall within its declared period and sources must use HTTPS.
The catalog is validated before playback, and unknown or invalid files show a retry state.

## Static deployment

Pages have real paths: `/`, `/collection`, `/radio/<catalog-id>` and
`/radio/<catalog-id>/listen`. The build copies `index.html` to `404.html`, which
GitHub Pages serves for any path without a file, so a deep link loads the app and
the app reads the path. An inline script in `index.html` sets `<base>` to the
site's directory, found by removing the app's route from the path, so asset URLs
stay relative. The build therefore works at either an origin root or a GitHub
Pages repository subdirectory without rewrite rules. A deep link's first
response has status 404, as with any Pages 404 fallback. Hash links from
earlier versions, such as `#radio/<catalog-id>`, redirect to their path.
The workflow in `.github/workflows/pages.yml`:

- Runs tests and builds on pull requests targeting `main`.
- Runs tests, builds, and publishes `dist/` on pushes to `main`.
- Supports a manual run from the Actions tab; select `main` to deploy.
- Deploys only after a successful build, using the `github-pages` environment.

To enable publishing:

1. Push this repository to GitHub with `main` as the publishing branch.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. Push to `main`, or run **Test and deploy to GitHub Pages** from the Actions tab.
4. The deployment job reports the published site URL.

No custom secret, npm installation, or `gh-pages` branch is required. Pull requests
cannot publish the site. No GitHub remote is currently configured in this local
checkout, so the workflow has not been run on GitHub yet.

The model runtime and generators are bundled locally. Google Fonts enhances the
font styling, with system font fallbacks when offline. Historical audio needs an
internet connection; preferences and models do not need a backend.

## Source attribution

- [Object Studio](https://jasonsperske.github.io/object_studio/) — shelf, GGIE,
  Silvertone rocket, Fritchle and field radio generators, CC0-1.0, plus bundled
  Three.js runtime (MIT).
  See `public/vendor/NOTICE.md` and retained runtime license comments.
- [FDR Presidential Library, audio recordings](https://www.fdrlibrary.org/utterancesfdr#afdr148)
  — dated recordings from 1932–1945.
- [Vincent Voice Library, Michigan State University](https://d.lib.msu.edu/vvl)
  — wartime and 1932 campaign recordings.
- [Internet Archive](https://archive.org/) — news broadcasts, The War of the Worlds
  and other period recordings. Each recording links to its source item.
- Audio remains hosted by each archive.

Optional WebMCP tools expose collection read-back and room navigation in supporting
browsers. They use the same actions and state as the interface.
