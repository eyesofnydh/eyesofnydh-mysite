# Site quality report — 10 October 2026

## Issues found and fixed

- **Mobile menu focus:** Escape tried to return keyboard focus to the hidden lens toggle. It now returns to the visible header Menu button. Arrow Down also opens the menu and focuses its current section.
- **Carousel scroll trapping:** ordinary vertical wheel scrolling was captured by the DNA carousel. Vertical scrolling now moves the page; horizontal scrolling or Shift + wheel changes photographs.
- **Autoplay behind the viewer:** the carousel could advance while an original photograph was open. It now pauses while the viewer is open or the carousel is outside the viewport, and resumes when available.
- **Failed originals:** a failed gallery image left a broken image without an explanation. The viewer now displays a readable message and recovers when another frame is selected.
- **Photo-page image sharpness:** photo pages offered only 320/800 previews, with inaccurate width descriptors for smaller originals. They now offer up to 1600 pixels with descriptors matching each source's available width.

## Visual and accessibility improvements

- Centered the photo-page canvas and removed the unused desktop navigation gutter on those pages.
- Kept action arrows close to their labels and added a subtle related-photo hover response that respects Reduced Motion.
- Added a keyboard skip link to photo pages and explicit related-image dimensions to stabilize loading.
- Updated carousel hints to describe the supported gestures.

## Validation

- Chromium responsive checks at 320, 375, 390, 768, 1024, 1440 and 1920 pixels, plus short landscape screens.
- WebKit and Chromium iPhone-mode checks at 320, 375, 390, 430 and 844 pixels: SVG icons, menu bounds, four gallery layouts, swipes, autoplay, original viewing, saving and Reduced Motion.
- All 55 photo pages checked at 320 pixels in both engines for preview decoding, heading bounds, horizontal overflow and header link collisions; representative photo pages also checked at 390, 768 and 1440 pixels.
- All 57 published HTML pages checked for missing local links, anchors, images, preview references, duplicate IDs and missing image alternatives.
- Gallery search, filters, saved photos, blocked browser storage, share-link fallback, empty-state recovery, keyboard handling and browsing without JavaScript.
- Journey filters, notes, viewers, deep links and nine generator tests.
- Generated photo pages, Journey pages and sitemap checked for freshness; JavaScript syntax and patch whitespace checked.
- New regression suites added to the repository's automatic validation workflow.

## Scope and remaining items

These checks cover the supported workflows and viewport sizes; they do not prove the absence of every possible bug. WebKit emulation does not replace a physical iPhone test. Native OS share-sheet behavior, external social account ownership and analytics configuration were not verified.

Ooty, Vagamon and Idukki labels remain pending the owner's photo-to-place mapping. The 28 curated additions remain in the main collection, and unpublished originals are preserved locally.
