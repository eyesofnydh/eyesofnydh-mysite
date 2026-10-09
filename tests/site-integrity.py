"""Check every published HTML page and its local links and media references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
pages = [ROOT / 'index.html', ROOT / 'travel.html', *sorted((ROOT / 'photos').glob('*.html'))]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.references, self.images = path, [], [], []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.references.append(attrs[key])
        if attrs.get('srcset'):
            self.references.extend(item.strip().split()[0] for item in attrs['srcset'].split(','))
        if tag == 'img':
            self.images.append(attrs)


parsed = {path.resolve(): Page(path) for path in pages}
errors = []
for path, page in parsed.items():
    if len(page.ids) != len(set(page.ids)):
        errors.append(f'{path.name}: duplicate IDs')
    for image in page.images:
        if 'alt' not in image:
            errors.append(f'{path.name}: missing image alternative')
    for reference in page.references:
        url = urlsplit(reference)
        if url.scheme or url.netloc:
            continue
        target = ((ROOT / unquote(url.path.lstrip('/'))) if url.path.startswith('/') else (path.parent / unquote(url.path))).resolve() if url.path else path
        if target.is_dir():
            target /= 'index.html'
        if not target.is_file():
            errors.append(f'{path.name}: missing {reference}')
        elif url.fragment and target in parsed and unquote(url.fragment) not in parsed[target].ids:
            errors.append(f'{path.name}: missing anchor {reference}')
assert not errors, '\n'.join(errors)
print(f'PASS: {len(pages)} published pages, unique IDs, image alternatives, local links, anchors and media references.')
