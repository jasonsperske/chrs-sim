# The Radio Room

An early, static-hosted classic radio collecting experience for the California
Historical Radio Society. Built with browser-native JavaScript, Three.js through
Object Studio, and IndexedDB. No server, account, or package installation is needed.

## Run

- `npm run dev` serves the source on port 5173 (requires Python 3).
- If occupied: `python3 -m http.server 5187`.
- `npm test` checks collection validation, empty defaults, and newest-first placement.
- `npm run build` writes the standalone website to `dist/`.

## Included

- Welcome screen with an interactive Object Studio RCA Victor GGIE radio.
- Empty, virtually infinite 3D wooden shelves. Drag, use two-axis scrolling,
  Shift-scroll horizontally, use arrow keys, and zoom using the controls or Ctrl-scroll.
- Historical attributes (manufacturer, release year, era, type) belong to the
  catalog model and are read-only. “View shelves by” makes shelf labels match the
  actual attribute values across the user's entire collection.
- Favorites, Personal, and Highlighted are independent memberships. Radios can be
  in multiple collections. Each membership has its own added timestamp; its shelf
  shows the most recently marked radio first. Editing details preserves this order;
  removing and re-adding a membership puts it first again.
- Personal history stores Owned / Used / Owned and used, optional from/to years,
  an ongoing flag, and a note. Years appear on the radio's shelf label in all views;
  historical release dates remain unchanged. Highlighted radios receive a badge
  and display lighting; favorites receive a star.
- All radios and All my collections views are available. Region heights expand
  with their contents to prevent adjacent collections overlapping. Legacy single
  shelf placements migrate to independent memberships; historical placements do
  not invent personal memberships. Records remain in IndexedDB.
- New acquisitions appear first with warm lighting and a NEW badge. Inspecting one
  acknowledges it, which is saved locally.
- Dedicated hash-routed history pages and personal collection controls. The workbench is disabled
  for now; existing cabinet-care data is preserved.
- Listening corner with power, volume, and Another recording controls. Each radio
  loads its own JSON catalog from `public/broadcasts/<catalog-id>.json`. The RCA
  starts with twelve verified FDR Library recordings dated 1939–1940, including
  the opening of the Golden Gate International Exposition.
- Random selection weights are 6 for the current month, 3 for adjacent months,
  2 for months two away, and 1 otherwise. Month distance wraps across December
  and January, uses the visitor's local month, and multiplies each track's baseWeight.
  The previous track is excluded when alternatives exist. Playback advances on
  completion; Another recording also makes a fresh weighted choice.
- Dates, speaker, and archival source are displayed for each recording. Audio starts
  on user input and stops when leaving the room. Catalog and playback failures offer
  retries and source links. Metadata is local; audio streams from the archive.
- IndexedDB persistence for collected radios, cabinet care, view position, zoom,
  grouping, selected radio, and volume. Storage failures fall back to the current visit.
- Responsive layout, keyboard controls, native form controls, and reduced-motion support.

## Study mode and future acquisitions

New collections start without radios. Use **Add a radio** on the collection screen,
then **Add to your collection** on the radio page to add the RCA and select it for
the listening corner. New acquisitions have no personal memberships until you
choose them on the radio detail page. QR scanning is intentionally absent.
Open `/?demo=1#collection` to reveal **Add study radio**. This mode uses a separate
IndexedDB database so test acquisitions do not change the visitor's collection.

The future acquisition boundary is:

```js
await window.radioRoom.addRadio({
  catalogId: 'rca-ggie-1939',
  section: 'personal',
});
```

Only registered entries in `src/catalog.js` are accepted. An optional `id` is reserved
for the future exhibit acquisition system. No input is evaluated as executable source:
only the locally bundled, trusted Object Studio model generators are compiled.

The learning library and workbench are future features. Only one radio model is
supplied in this version. Add another radio's catalog JSON using the existing schema;
recording dates must fall within its declared period and sources must use HTTPS.
The catalog is validated before playback, and unknown or invalid files show a retry state.

## Static deployment

All paths are relative and navigation uses URL hashes, so the build works at either
an origin root or a GitHub Pages repository subdirectory without rewrite rules.
The included `.github/workflows/pages.yml` builds and deploys on pushes to `main`.
In the repository's Pages settings, choose **GitHub Actions** as the deployment source.
No deployment has been made by creating this project.

The model runtime and generators are bundled locally. Google Fonts enhances the
font styling, with system font fallbacks when offline. Historical audio needs an
internet connection; preferences and models do not need a backend.

## Source attribution

- [Object Studio](https://jasonsperske.github.io/object_studio/) — shelf and GGIE
  radio generators, CC0-1.0, plus bundled Three.js runtime (MIT).
  See `public/vendor/NOTICE.md` and retained runtime license comments.
- [FDR Presidential Library, audio recordings](https://www.fdrlibrary.org/utterancesfdr#afdr148)
  — dated recordings from 1939–1940. Audio remains hosted by the archive.

Optional WebMCP tools expose collection read-back and room navigation in supporting
browsers. They use the same actions and state as the interface.
