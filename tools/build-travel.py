"""Render a static travel chapter from JSON; Python standard library only.

The generated page works without JavaScript. The marked homepage Journey preview is regenerated from the same content.
"""
import argparse
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PHOTO_TEXT = (ROOT / 'assets/js/photos.js').read_text(encoding='utf-8')
PHOTOS = {p['file']: p for p in json.JSONDecoder().raw_decode(PHOTO_TEXT.split('=', 1)[1].lstrip())[0]}


def esc(value):
    return html.escape(str(value or ''), quote=True)


def photo(file, *, eager=False, sizes='(max-width: 760px) 100vw, 50vw'):
    item = PHOTOS.get(file)
    if not item:
        return '<div class="journey-missing" role="img" aria-label="Photograph not yet added">A photograph will live here.</div>'
    widths = [n for i, n in enumerate((320, 800, 1600)) if i == 0 or (320, 800, 1600)[i-1] < item['width']]
    stem = Path(file).stem
    candidates = ', '.join(f'./assets/images/previews/{stem}-{n}.jpg {min(n,item["width"])}w' for n in widths)
    for n in widths:
        if not (ROOT / f'assets/images/previews/{stem}-{n}.jpg').exists():
            raise ValueError(f'Missing preview for {file}; run tools/build-previews.ps1')
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<img src="./assets/images/previews/{stem}-800.jpg" srcset="{candidates}" sizes="{sizes}" width="{item["width"]}" height="{item["height"]}" alt="{esc(item["alt"])}" {load} decoding="async">'


def normalize(data):
    result, ids = [], set()
    for raw in data.get('destinations', []):
        if not isinstance(raw, dict) or not raw.get('destination'):
            continue
        item = dict(raw)
        slug = re.sub(r'[^a-z0-9]+', '-', str(item.get('id') or item['destination']).lower()).strip('-') or 'place'
        unique = slug
        while unique in ids:
            unique += '-next'
        ids.add(unique)
        item['id'] = unique
        item['photos'] = item.get('photos') if isinstance(item.get('photos'), list) else []
        item['story'] = item.get('story') if isinstance(item.get('story'), list) else []
        for field in ('region', 'year', 'date', 'duration'):
            item[field] = item.get(field) or 'To be added'
        item['memory'] = item.get('memory') or 'The memory from this place is still being written.'
        result.append(item)
    return result


def destination(item, index):
    return f'''<article class="journey-destination" id="place-{item['id']}">
      <a class="journey-image-link" href="#story-{item['id']}" aria-label="Read the {esc(item['destination'])} story">{photo(item.get('image'))}<span class="journey-image-index" aria-hidden="true">{index:02d}</span></a>
      <div class="journey-meta"><span>{esc(item['region'])}</span><span>{esc(item['year'])}</span></div>
      <h3><a href="#story-{item['id']}">{esc(item['destination'])} <span aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a></h3>
      <p>{esc(item.get('description') or 'A new chapter, waiting to be written.')}</p>
    </article>'''


def story(item):
    paragraphs = ''.join(f'<p>{esc(p)}</p>' for p in item['story']) or '<p>The full story is still being written. Come back for the next chapter.</p>'
    images = ''.join(f'<figure>{photo(file)}<figcaption>{esc(PHOTOS.get(file, {}).get("title", "Photograph to be added"))}</figcaption></figure>' for file in item['photos'][:3])
    return f'''<details class="journey-story" id="story-{item['id']}">
      <summary><span class="journey-meta">{esc(item['destination'])} / {esc(item['date'])}</span><h3>{esc(item.get('headline') or item['destination'])}</h3><span class="journey-story-toggle" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></summary>
      <div class="journey-story-body"><figure class="journey-story-hero">{photo(item.get('image'), sizes='90vw')}<figcaption>{esc(item['destination'])} · {esc(item['date'])} · {esc(item['duration'])}</figcaption></figure>
      <div class="journey-prose"><p class="journey-lead">{esc(item.get('introduction') or item.get('description'))}</p>{paragraphs}<h4>Along the way</h4><p>{esc(item.get('details') or 'Travel details to be added.')}</p><h4>The part I kept</h4><blockquote>{esc(item['memory'])}</blockquote></div>
      <div class="journey-story-photos">{images}</div><a class="journey-text-link" href="#places">Back to the places <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></a></div>
    </details>'''


def memory(item, index):
    return f'''<article class="journey-memory"><figure>{photo(item.get('image'))}</figure><div><p class="journey-meta">MEMORY {index:02d} / {esc(item['destination'])} / {esc(item['date'])}</p><blockquote>“{esc(item['memory'])}”</blockquote><a class="journey-text-link" href="#story-{item['id']}">Read this chapter <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></a></div></article>'''


def travel_map(items):
    mapped = []
    for item in items:
        point = item.get('coordinates')
        if not isinstance(point, dict):
            continue
        lat, lng = point.get('lat'), point.get('lng')
        if isinstance(lat, (float, int)) and isinstance(lng, (float, int)) and -90 <= lat <= 90 and -180 <= lng <= 180:
            mapped.append((item, lat, lng))
    if not mapped:
        return '<p>Add destination coordinates to see the journey map. The stories above are always available.</p>'
    south, north = min(p[1] for p in mapped), max(p[1] for p in mapped)
    west, east = min(p[2] for p in mapped), max(p[2] for p in mapped)
    markers, panels, points = [], [], []
    for index, (item, lat, lng) in enumerate(mapped):
        x = 50 if east == west else 20 + 60 * (lng-west)/(east-west)
        y = 50 if north == south else 80 - 60 * (lat-south)/(north-south)
        coordinate_label = f'{abs(lat):.4f}° {"N" if lat >= 0 else "S"} / {abs(lng):.4f}° {"E" if lng >= 0 else "W"}'
        points.append(f'{x*6:.1f},{y*4:.1f}')
        markers.append(f'<a class="journey-map-marker" href="#story-{item["id"]}" data-stop="{item["id"]}" style="left:{x:.2f}%;top:{y:.2f}%" aria-label="Explore {esc(item["destination"])}"><span>{index+1:02d}</span></a>')
        panels.append(f'''<article class="journey-map-detail" id="map-{item['id']}" {'' if index == 0 else 'hidden'}><figure>{photo(item.get('image'))}</figure><p class="journey-meta">{esc(item['date'])} · {coordinate_label}</p><h3>{esc(item['destination'])}</h3><p>{esc(item['memory'])}</p><a class="journey-text-link" href="#story-{item['id']}">Read the story <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></a></article>''')
    return f'''<div class="journey-map-layout"><div class="journey-map-plot" role="group" aria-label="Destination map. Select a numbered location to explore it."><svg viewBox="0 0 600 400" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="map-grid" width="60" height="50" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 50" fill="none" stroke="currentColor" stroke-width=".5"/></pattern></defs><rect width="600" height="400" fill="url(#map-grid)"/><polyline points="{' '.join(points)}" fill="none" stroke="#b4f5ed" stroke-width="1.5" stroke-dasharray="4 8"/></svg><span class="journey-map-north" aria-hidden="true">N <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></span>{''.join(markers)}<span class="journey-map-key">A location sketch<br>Approximate positions · not a route</span></div><div class="journey-map-details">{''.join(panels)}</div></div><p class="journey-map-status visually-hidden" role="status"></p>'''


def trip_folders(data):
    trail, folders = [], []
    trips = data.get('trips', [])
    for i, trip in enumerate(trips, 1):
        slug = re.sub(r'[^a-z0-9-]', '', trip['id'])
        title = esc(trip['name'])
        trail.append(f'<a href="#trip-{slug}"><span>{i:02d}</span><strong>{title}</strong></a>')
        photos = trip.get('photos', [])
        note = 'Preview images from my archive. Trip photographs coming soon.' if trip.get('placeholder') else f'{len(photos):02d} photographs from this trip.'
        frames = ''.join(f'<figure class="trip-media-window" style="--window-x:{(-36 if j % 2 == 0 else 38) + (j // 2) * 12}px;--window-y:{j * 18}px;--window-rotate:{-4 + j * 7}deg;--window-width:{72 - j * 5}%"><button class="trip-window-close" type="button" aria-label="Close {esc(PHOTOS.get(file, {}).get("title", "photograph"))}" hidden>×</button><a href="./assets/images/{esc(file)}" target="_blank" rel="noopener" aria-label="Open photograph: {esc(PHOTOS.get(file, {}).get("title", "Archive image"))}">{photo(file)}</a><figcaption>{esc(PHOTOS.get(file, {}).get("title", "Archive image"))}</figcaption></figure>' for j, file in enumerate(photos))
        peeks = ''.join(f'<span>{photo(file)}</span>' for file in photos[:3])
        folders.append(f'<details class="trip-folder" id="trip-{slug}"><summary><span class="trip-tab">TRIP / {i:02d}</span><span class="trip-peek" aria-hidden="true">{peeks}</span><span class="trip-cover">{photo(trip.get("cover"))}<span class="trip-stamp">{"PREVIEW" if trip.get("placeholder") else "PHOTO JOURNAL"}</span></span><span class="trip-folder-title"><strong>{title}</strong><span class="trip-plus" aria-hidden="true">+</span></span><span class="trip-region">{esc(trip.get("region"))}</span><span class="trip-open-label">Open folder</span></summary><div class="trip-folder-content"><p>{note}</p><div class="trip-frames">{frames}</div></div></details>')
    trail.append(f'<span class="trip-next"><span>{len(trips)+1:02d}</span><strong>The next chapter</strong><small>Still unfolding</small></span>')
    return '<nav class="trip-trail" aria-label="Trip chapters">'+''.join(trail)+'</nav><div class="trip-folders">'+''.join(folders)+'</div>'


def render(data):
    items = normalize(data)
    sample = bool(data.get('sample', True))
    warning = '<aside class="journey-draft" aria-label="Sample content">PREVIEW JOURNAL <span>Dummy trips, dates, and memories. Photos are from my existing archive and are illustrative, not verified destination images.</span></aside>' if sample else ''
    moments = []
    seen = set()
    for item in items:
        for file in item['photos']:
            if file in seen or file not in PHOTOS:
                continue
            seen.add(file)
            first = file == next((f for f in item['photos'] if f in PHOTOS), None)
            anchor = f' id="story-{item["id"]}"' if first else ''
            notes = data.get('photoNotes') or {}
            entry = notes.get(file) or ({'detail':item.get('description'), 'opinion':item.get('memory')} if first else {})
            detail = f'<p>{esc(entry.get("detail"))}</p>' if entry.get('detail') else ''
            opinion = f'<details><summary>My perspective <span aria-hidden="true">+</span></summary><p>{esc(entry.get("opinion"))}</p></details>' if entry.get('opinion') else ''
            note = f'<div class="journey-frame-note">{detail}{opinion}</div>' if detail or opinion else ''
            moments.append(f'<figure class="journey-frame" data-series="{item["id"]}"{anchor}><a class="journey-image-link" href="./assets/images/{esc(file)}" aria-label="View original: {esc(PHOTOS[file]["title"])}">{photo(file)}</a><figcaption><span>{esc(PHOTOS[file]["title"])}</span><span>{esc(item["destination"])}</span></figcaption>{note}</figure>')

    stats = data.get('stats') or {}
    def number(key, suffix=''):
        value = stats.get(key)
        return f'{value:,}{suffix}' if isinstance(value, (int,float)) and value >= 0 else '—'
    statistics = ''.join(f'<div><dt>{label}</dt><dd>{value}</dd></div>' for label,value in [('Story series',f'{len(items):02d}'),('Archive status','Ongoing'),('Photos',f'{len(seen):02d}'),('Home base','Kerala')])
    current = ''.join(f'<div><dt>{esc(key)}</dt><dd>{esc(value or "Still deciding")}</dd></div>' for key,value in (data.get('currently') or {}).items())
    kit = ''.join(f'<details><summary>{esc(item.get("name", "An essential"))}</summary><p>{esc(item.get("note", "A little something for the road."))}</p></details>' for item in data.get('kit',[]) if isinstance(item,dict))
    filters = '<button data-series-filter="all" aria-pressed="true">All photographs</button>' + ''.join(f'<button data-series-filter="{item["id"]}" aria-pressed="false">{esc(item["destination"])}</button>' for item in items)
    values = {'TRIP_FOLDERS':trip_folders(data), 'FILTERS':filters, 'NOTICE':warning, 'INTRO':esc(data.get('intro')), 'HERO':photo(data.get('heroImage'),eager=True,sizes='(max-width: 760px) 100vw, 85vw'), 'DESTINATIONS':''.join(destination(item,i+1) for i,item in enumerate(items)) or '<p>The first series is on its way.</p>', 'STORIES':''.join(story(item) for item in items) or '<p>The next story is still being written.</p>', 'MEMORIES':''.join(memory(item,i+1) for i,item in enumerate(items)), 'MOMENTS':''.join(moments) or '<p>The first photographs are on their way.</p>', 'MAP':'', 'STATS':statistics, 'STATS_NOTE':'Three honest, ongoing studies assembled from photographs already in the archive.', 'CURRENT':current, 'KIT':kit, 'ROBOTS':'<meta name="robots" content="noindex,follow">' if sample else '<meta name="robots" content="index,follow,max-image-preview:large">'}
    output = (ROOT/'tools/travel-template.html').read_text(encoding='utf-8')
    for key,value in values.items():
        output = output.replace('{{'+key+'}}',value)
    return output


def render_home_preview(data):
    items = normalize(data)
    photos = [item.get('image') for item in items if item.get('image') in PHOTOS]
    template = (ROOT/'tools/travel-home-template.html').read_text(encoding='utf-8')
    if data.get('sample',True):
        template = template.replace('class="journey-preview-chapters"','class="journey-preview-chapters" data-nosnippet')
    chapters = ''.join(f'<a href="./travel.html#story-{item["id"]}"><span class="journey-preview-number">{index+1:02d}</span><span><strong>{esc(item["destination"])}</strong><small>{esc(item["region"])} · {esc(item["year"])}</small></span><span aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a>' for index,item in enumerate(items[:3]))
    if data.get('trips'):
        chapters = ''.join(f'<a href="./travel.html#trip-{esc(trip["id"])}"><span class="journey-preview-number">{index+1:02d}</span><span><strong>{esc(trip["name"])}</strong><small>Open the trip folder</small></span><span aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a>' for index,trip in enumerate(data['trips']))
    values = {'MAIN_PHOTO': photo(photos[0] if photos else None), 'SIDE_PHOTO': photo(photos[1] if len(photos)>1 else None), 'CHAPTERS': chapters, 'NOTE': 'A preview of the journal · sample trips and archive photographs for now.' if data.get('sample',True) else 'Photographs, small details, and personal notes.'}
    for key,value in values.items():
        template=template.replace('{{'+key+'}}',value)
    return template


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Verify checked-in travel.html matches its source data and template')
    args = parser.parse_args()
    data = json.loads((ROOT/'assets/data/travel.json').read_text(encoding='utf-8'))
    result = render(data)
    target = ROOT/'travel.html'
    if args.check:
        if not target.exists() or target.read_text(encoding='utf-8') != result:
            raise SystemExit('travel.html is out of date. Run python tools/build-travel.py')
        print('PASS: static travel build is current.')
    else:
        target.write_text(result,encoding='utf-8')
        print('Built travel.html.')

    home = ROOT/'index.html'
    content = home.read_text(encoding='utf-8')
    start, end = '<!-- JOURNEY-PREVIEW:START -->', '<!-- JOURNEY-PREVIEW:END -->'
    if start not in content or end not in content:
        raise SystemExit('Homepage journey-preview markers are missing.')
    before, rest = content.split(start,1)
    _, after = rest.split(end,1)
    updated = before+start+'\n'+render_home_preview(data)+end+after
    if args.check:
        if updated != content:
            raise SystemExit('Homepage journey preview is out of date. Run python tools/build-travel.py')
        print('PASS: homepage journey preview is current.')
    else:
        home.write_text(updated,encoding='utf-8')
        print('Updated homepage journey preview; other sections preserved.')
