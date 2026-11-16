#!/usr/bin/env python3
"""
Build the web copies of the key art that is uploaded to the repository root.

The originals (2-3 MB PNGs with spaces in their names) stay where they were
uploaded. This writes what the site serves into public/:

  public/art/<name>.jpg          full-resolution key art (posters keep their
                                 baked-in titles; also the press-kit download)
  public/art/<name>-scene.jpg    the same art cropped to the painting only, for
                                 cards and banners that set their own type
  public/art/<name>-hero.jpg     enlarged copy for full-bleed hero backdrops
  public/emblems/<name>.webp     faction emblems
  public/og/<name>.jpg           1200x630 social share cards: a painting with
                                 a title set in the ETU sprite font

Run it after uploading new art, then add the new entry to ART below:

  python3 scripts/build-art.py

Needs: pillow
"""

import importlib.util
import os

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART_DIR = os.path.join(ROOT, 'public', 'art')
EMBLEM_DIR = os.path.join(ROOT, 'public', 'emblems')

# source file (repo root) -> output name, and an optional (left, top, right,
# bottom) crop in source pixels that leaves out the baked-in title and call to
# action so the painting can sit behind the site's own type.
ART = [
    ('Megabot’s Crimson Eye.png', 'megabot-crimson-eye', None),
    ('ETU_ Fleeing the Colossal Megabot.png', 'fleeing-the-colossal-megabot', (0, 0, 1122, 760)),
    ("XJ9_ Megabot's Second in Command.png", 'xj9-second-in-command', (0, 215, 1122, 1085)),
    ('ETU_2026-11-07_Mycelari_Swarm_Official_Type.png', 'mycelari-swarm', (0, 360, 1122, 1110)),
    ('Space_dwarves_crystals.png', 'space-dwarves-crystal-mine', (0, 365, 1122, 1160)),
    ('king_arkanvil_crystal1.png', 'king-arkanvil-lore-sheet', (365, 0, 1130, 640)),
    ('Cyl_ The Corrupted Goddess.png', 'cyl-corrupted-goddess', (440, 0, 1500, 941)),
    ('Stellar_Solar_shade.png', 'solar-shade', (0, 0, 1536, 650)),
    ("Megabot's Evil Eye.webp", 'megabot-evil-eye', None),
    ('ETU_2026-11-12_Wild_Fights_Back_Provisional_Title.jpg', 'wild-fights-back', None),
    # The same painting without the poster type; the scene drops its black bands.
    ('wild_rebellion.png', 'wild-rebellion', (0, 300, 1122, 1190)),
    ('dwarves1.png', 'court-of-yllar', None),
    ('Crystal Consortium Pilot and Ship Concepts.png', 'crystal-consortium-pilots', None),
]

# Square and panel crops for leader portraits, pilot cards and unit cards:
# (source in repo root, output path under public/, crop box in source pixels,
# longest side of the output in px).
CROPS = [
    ('wild_rebellion.png', 'wild/ursos.jpg', (168, 435, 659, 926), 640),
    ('wild_rebellion.png', 'wild/entlord.jpg', (519, 463, 771, 715), 480),
    ("Megabot's Evil Eye.webp", 'megabot/evil-eye-portrait.jpg', (210, 379, 673, 842), 640),
    ("XJ9_ Megabot's Second in Command.png", 'megabot/xj9-portrait.jpg', (298, 210, 859, 771), 640),
]

# The Crystal Consortium concept sheet: five panels, each a pilot portrait over
# a three-quarter view of their ship and a top-down view of the same hull.
CONSORTIUM_SHEET = 'Crystal Consortium Pilot and Ship Concepts.png'
CONSORTIUM_PANELS = [
    ('arkanvil', 20, 378),
    ('arywen', 395, 712),
    ('arnkanard', 729, 1033),
    ('arykory', 1050, 1331),
    ('rianywen', 1348, 1655),
]
CONSORTIUM_ROWS = {'pilots': (154, 378), 'ships': (431, 747), 'ships-top': (749, 911)}
for _name, _l, _r in CONSORTIUM_PANELS:
    for _row, (_t, _b) in CONSORTIUM_ROWS.items():
        CROPS.append((CONSORTIUM_SHEET, f'space-dwarves/{_row}/{_name}.jpg', (_l, _t, _r, _b), 640))

# In-game screenshots published on elliottelford.com, kept under
# scripts/sources/ because they are not in the repo root uploads.
#   Wild clan mark: "Leaving Yoga, Learning to Code...", Aug 2026.
#   Dwarven Forge: "Explore the Universe 2175 Trailer #2: Gameplay", Oct 2026.
SOURCE_DIR = os.path.join(ROOT, 'scripts', 'sources')
SOURCE_CROPS = [
    # HUD panels cropped away; the forge and the player's ship are left.
    ('dwarven-forge-screenshot.png', 'space-dwarves/dwarven-forge.jpg', (60, 0, 840, 515), 780),
    # The bear-faced clan mark from the August 2026 emblem set.
    ('wild-emblem-bear.png', 'wild/clan-mark-bear.jpg', (0, 0, 1254, 1254), 800),
]

# Full-bleed hero backdrops: output name -> upscale factor. The portrait key
# art is narrower than a desktop viewport, so the hero gets a Lanczos-enlarged
# copy with a light sharpen instead of leaving the stretch to the browser.
# next/image serves it down to each screen size from there.
HERO = [
    ('megabot-evil-eye', 2),
]

EMBLEMS = [
    ('Space_Dwarves_log.jpg', 'space-dwarves'),
    ('rogueAI.png', 'rogue-ai-network'),
    ('terran_emblem_ETU.png', 'terran-federation'),
    ('wild_emblem.png', 'wild'),
]

EMBLEM_SIZE = 800

OG_DIR = os.path.join(ROOT, 'public', 'og')
OG_SIZE = (1200, 630)

# output name -> source, source crop (or None), vertical anchor of the 1200x630
# window (0 top .. 1 bottom), title text ("|" separates lines), letter depth px
OG = [
    ('site', 'ETU_ Fleeing the Colossal Megabot.png', (0, 0, 1122, 760), 0.5,
     'Explore the|Universe|2175', 66),
    ('megabot', 'Megabot\u2019s Crimson Eye.png', None, 0.32, 'Megabot', 92),
]


def save_jpeg(im, path):
    # 4:4:4 chroma keeps the red and cyan glow edges and the small poster type clean.
    im.save(path, 'JPEG', quality=88, subsampling=0, optimize=True, progressive=True)


def load_title_renderer():
    spec = importlib.util.spec_from_file_location(
        'render_title', os.path.join(ROOT, 'scripts', 'render-title.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.render


def build_og(render, source, crop, anchor, title, depth):
    im = Image.open(os.path.join(ROOT, source)).convert('RGB')
    if crop:
        im = im.crop(crop)
    w, h = OG_SIZE
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    top = round((im.height - h) * anchor)
    left = (im.width - w) // 2
    im = im.crop((left, top, left + w, top + h)).convert('RGBA')

    # Darken the lower left, where the title sits, and leave the rest alone.
    shade = Image.new('L', (w, h), 0)
    px = shade.load()
    for y in range(h):
        fy = max(0.0, (y / h - 0.3) / 0.7)
        for x in range(w):
            fx = max(0.0, 1 - x / (w * 0.9))
            px[x, y] = int(235 * min(1.0, fx * fy * 1.6))
    im.paste((4, 6, 20), (0, 0), shade)

    text = render(title, depth, 'transparent', 'left', 0)
    im.alpha_composite(text, (48, h - text.height - 30))
    return im.convert('RGB')


def main():
    os.makedirs(ART_DIR, exist_ok=True)
    os.makedirs(OG_DIR, exist_ok=True)
    os.makedirs(EMBLEM_DIR, exist_ok=True)

    for source, name, scene in ART:
        im = Image.open(os.path.join(ROOT, source)).convert('RGB')
        out = os.path.join(ART_DIR, name + '.jpg')
        save_jpeg(im, out)
        print(f'{name}.jpg  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB')
        if scene:
            crop = im.crop(scene)
            out = os.path.join(ART_DIR, name + '-scene.jpg')
            save_jpeg(crop, out)
            print(f'{name}-scene.jpg  {crop.width}x{crop.height}  {os.path.getsize(out) // 1024} KB')

    public = os.path.join(ROOT, 'public')
    jobs = [(os.path.join(ROOT, src), dst, box, side) for src, dst, box, side in CROPS]
    jobs += [(os.path.join(SOURCE_DIR, src), dst, box, side) for src, dst, box, side in SOURCE_CROPS]
    for src, dst, box, side in jobs:
        im = Image.open(src).convert('RGB').crop(box)
        if max(im.size) > side:
            im.thumbnail((side, side), Image.LANCZOS)
        out = os.path.join(public, dst)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        save_jpeg(im, out)
        print(f'{dst}  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB')

    for name, factor in HERO:
        im = Image.open(os.path.join(ART_DIR, name + '.jpg')).convert('RGB')
        im = im.resize((im.width * factor, im.height * factor), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=60, threshold=2))
        out = os.path.join(ART_DIR, name + '-hero.jpg')
        im.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
        print(f'{name}-hero.jpg  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB')

    for source, name in EMBLEMS:
        im = Image.open(os.path.join(ROOT, source)).convert('RGB')
        im = im.resize((EMBLEM_SIZE, EMBLEM_SIZE), Image.LANCZOS)
        out = os.path.join(EMBLEM_DIR, name + '.webp')
        im.save(out, 'WEBP', quality=86, method=6)
        print(f'emblems/{name}.webp  {os.path.getsize(out) // 1024} KB')


    render = load_title_renderer()
    for name, source, crop, anchor, title, depth in OG:
        out = os.path.join(OG_DIR, name + '.jpg')
        build_og(render, source, crop, anchor, title, depth).save(
            out, 'JPEG', quality=88, optimize=True, progressive=True)
        print(f'og/{name}.jpg  {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    main()
