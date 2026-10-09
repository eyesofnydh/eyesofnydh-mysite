"""Generate one indexable, shareable page for every portfolio photograph."""
import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://eyesofnydh.netlify.app'


def photos():
    text = (ROOT/'assets/js/photos.js').read_text(encoding='utf-8').split('=', 1)[1].lstrip()
    return json.JSONDecoder().raw_decode(text)[0]


def slug(title):
    value = title.lower().replace('’', '').replace("'", '')
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', value))


def preview(photo, size=800):
    return f'../assets/images/previews/{Path(photo["file"]).stem}-{size}.jpg'


def render(photo, collection):
    item_slug = slug(photo['title'])
    canonical = f'{ORIGIN}/photos/{item_slug}.html'
    same = [item for item in collection if item['file'] != photo['file'] and item['category'] == photo['category']]
    if len(same) < 3:
        same += [item for item in collection if item['file'] != photo['file'] and item not in same]
    related = ''.join(
        f'<a href="./{slug(item["title"])}.html"><img src="{preview(item)}" alt="{html.escape(item["alt"])}" width="{item["width"]}" height="{item["height"]}" loading="lazy"><span>{html.escape(item["title"])}</span></a>'
        for item in same[:3]
    )
    schema = json.dumps({
        '@context':'https://schema.org', '@type':'ImageObject', 'name':photo['title'],
        'description':photo['alt'], 'contentUrl':f'{ORIGIN}/assets/images/{photo["file"]}',
        'thumbnailUrl':f'{ORIGIN}/assets/images/previews/{Path(photo["file"]).stem}-800.jpg',
        'creator':{'@type':'Person','name':'Nidhin Narayanan'}, 'creditText':'Nidhin Narayanan / eyesofnydh',
        'copyrightNotice':'© Nidhin Narayanan'
    }, ensure_ascii=False).replace('</', '<\\/')
    title = html.escape(photo['title']); caption = html.escape(photo['alt'])
    sizes = [320, 800, 1600]
    widths = [size for i, size in enumerate(sizes) if i == 0 or sizes[i-1] < photo['width']]
    srcset = ', '.join(f'{preview(photo, size)} {min(size, photo["width"])}w' for size in widths)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title} — eyesofnydh</title><meta name="description" content="{caption}. A photograph by Nidhin Narayanan.">
<link rel="canonical" href="{canonical}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="analytics-domain" content="eyesofnydh.netlify.app">
<meta property="og:type" content="article"><meta property="og:title" content="{title} — eyesofnydh"><meta property="og:description" content="{caption}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{ORIGIN}/assets/images/{photo['file']}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="{ORIGIN}/assets/images/{photo['file']}">
<script type="application/ld+json">{schema}</script><link rel="icon" href="../favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../assets/css/style.css?v=20261010g"><link rel="stylesheet" href="../assets/css/photo.css?v=20261010g"><script src="../assets/js/motion.js?v=20261010g" defer></script><script src="../assets/js/analytics.js?v=20261010g" defer></script></head>
<body class="photo-page" id="top"><a class="skip-link" href="#photo-main">Skip to the photograph</a><header class="header"><div class="container header-inner"><a class="wordmark" href="../index.html">eyesofnydh<span class="brand-dot"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/></svg></span></a><a class="text-link" href="../index.html#gallery">Back to collection <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12H4m6-6-6 6 6 6"/></svg></a></div></header>
<main class="container" id="photo-main"><a class="photo-back text-link" href="../index.html#gallery"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12H4m6-6-6 6 6 6"/></svg> All photographs</a><article class="photo-detail"><figure><a href="../assets/images/{photo['file']}" aria-label="Open the original photograph"><img src="{preview(photo)}" srcset="{srcset}" sizes="(max-width:760px) 100vw,65vw" width="{photo['width']}" height="{photo['height']}" alt="{caption}"></a></figure><div class="photo-detail-copy"><p class="eyebrow">{html.escape(photo['category'])} / THE PERSONAL ARCHIVE</p><h1>{title}</h1><p>{caption}.</p><dl class="photo-facts"><div><dt>Place</dt><dd>Location not published</dd></div><div><dt>Camera</dt><dd>Camera details not recorded</dd></div><div><dt>Archive</dt><dd>eyesofnydh personal collection</dd></div></dl><a class="btn" href="../index.html#contact">Enquire about this work <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></a></div></article><section class="photo-related" aria-labelledby="related-title"><p class="eyebrow">KEEP LOOKING</p><h2 id="related-title">Related photographs.</h2><div class="photo-related-grid">{related}</div></section></main>
<footer class="container"><div class="footer-top"><a class="wordmark" href="../index.html">eyesofnydh<span class="brand-dot"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"/></svg></span></a><a href="#top" class="text-link">Back to top <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></a></div><div class="footer-bottom"><span>© 2026 Nidhin Narayanan</span><span>KERALA, INDIA</span></div></footer></body></html>'''


def build():
    collection = photos()
    return {slug(photo['title'])+'.html': render(photo, collection) for photo in collection}


def sync_fallback(check=False):
    path = ROOT/'index.html'
    text = path.read_text(encoding='utf-8')
    links = []
    for photo in photos():
        width = min(320,photo['width'])
        height = round(photo['height']*width/photo['width'])
        links.append(f'<a href="./photos/{slug(photo["title"])}.html"><img src="./assets/images/previews/{Path(photo["file"]).stem}-320.jpg" loading="lazy" alt="{html.escape(photo["alt"],quote=True)}" width="{width}" height="{height}"></a>')
    updated, count = re.subn(r'(<div class="fallback-gallery">).*?(</div>)', lambda match: match[1]+''.join(links)+match[2], text, count=1, flags=re.S)
    if count != 1: raise ValueError('Homepage fallback gallery is missing')
    if check and updated != text: raise SystemExit('Homepage fallback gallery is stale; run tools/build-photo-pages.py')
    if not check: path.write_text(updated,encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    target = ROOT/'photos'; pages = build()
    sync_fallback(args.check)
    if args.check:
        stale = [name for name, body in pages.items() if not (target/name).is_file() or (target/name).read_text(encoding='utf-8') != body]
        extras = [path.name for path in target.glob('*.html') if path.name not in pages] if target.exists() else []
        if stale or extras: raise SystemExit(f'Photo pages are stale: {stale + extras}')
        print(f'PASS: {len(pages)} shareable photo pages are current.')
    else:
        target.mkdir(exist_ok=True)
        for path in target.glob('*.html'):
            if path.name not in pages: path.unlink()
        for name, body in pages.items(): (target/name).write_text(body, encoding='utf-8')
        print(f'Built {len(pages)} shareable photo pages.')
