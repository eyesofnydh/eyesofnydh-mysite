# eyesofnydh

Nidhin Narayanan’s photography portfolio. Plain HTML, CSS, and JavaScript, with responsive image previews and no runtime framework.

## Current experience

- Mobile photography first, with camera photography and photo/video editing.
- Scroll-linked desktop focus dial and rotating mobile lens menu, with keyboard controls and Escape dismissal.
- A scroll-linked cinematic hero, DNA-style 3D carousel, photo stack, record shelf, photo wall, search, filters, saved photos, and shareable photo pages.
- A typography-led cursor image trail and image-only Travel folders with peeking, staggered polaroid windows.
- Journey is a photo collection with optional short details and personal opinions, rather than a blog. It includes series filters, a show/hide notes control, and a keyboard/swipe photo viewer.
- Subtle photo and section entrances, hover effects, Pause motion, and system reduced-motion support.
- Existing photographs remain accessible without JavaScript. No client testimonials or unverified service promises are displayed.

## Preview and build

Serve the repository root with `python -m http.server 4173`, then open `http://localhost:4173/` or `http://localhost:4173/travel.html`.

This is a static site; there is no npm build step. Netlify serves the checked-in files. Local changes and validation do not deploy it.

After changing Journey content or templates:

```sh
python tools/build-travel.py
python tools/build-travel.py --check
python tools/build-seo.py --check
```

The generator updates `travel.html` and only the marked Journey preview in `index.html`. Templates live in `tools/travel-template.html` and `tools/travel-home-template.html`. Shared layout refinements live in `assets/css/refinement.css`.

## Adding photographs and notes

The main collection uses `assets/js/photos.js`. Add the original image to `assets/images/`, describe it accurately, and generate responsive previews using `tools/build-previews.ps1`. Run `python tools/build-photo-pages.py` and `python tools/build-seo.py` to refresh durable photo pages and the sitemap.

Trip folders live in the `trips` list in `assets/data/travel.json`. Replace each `cover` and `photos` list with filenames from the photo collection, then set `placeholder` to `false` to remove the preview label. The numbered trail and homepage folder links are generated from that list. Run the travel builder after edits.

Journey uses `assets/data/travel.json`. The `destinations` list groups images into series; each `photos` array contains filenames from the main collection. Stable IDs preserve existing Journey links. Existing series descriptions and short reflections appear beneath the first photograph in each series.

To add details or opinions to any individual photograph, add a top-level `photoNotes` object:

```json
"photoNotes": {
  "f4.png": {
    "detail": "Your details about this photograph.",
    "opinion": "Your personal thoughts about the moment or the edit."
  }
}
```

Both fields are optional. Text is escaped by the generator. Equipment and settings are not inferred for individual images. Update `intro`, `currently`, and `kit` to change the process section. The page has no online editor or upload service; edit the content file and regenerate it.

## Validation

With the preview server running and Playwright installed:

```sh
node tests/refinement.cjs
node tests/gallery-ui.cjs
node tests/improvements.cjs
python tests/travel-build.py
python tools/build-travel.py --check
python tools/build-seo.py --check
```

`refinement.cjs` covers mobile/desktop navigation, seven widths from 320 to 1920 pixels, short landscape screens, image loading, local anchors, search, viewers, Journey filters/notes, focus restoration, deep links, motion preference persistence, and JavaScript-free browsing. Screenshots are saved under `tests/` and ignored by Git.

The gallery suites cover card layout, search recovery, saved photos, original-image viewing, sharing, blocked storage, and keyboard editing. Older camera-dial, lens-fan, and travel-article suites describe the previous design; `refinement.cjs` replaces those design-specific checks.

## Production

The canonical domain is `https://eyesofnydh.netlify.app`. `netlify.toml` configures security headers, caching, and stable `.html` URLs. Optional Plausible analytics loads only on the production hostname. External profile ownership, analytics configuration, and live deployment are not verified by local checks.
