#!/usr/bin/env python3
"""
Export the game's Ship Designer to the website.

The website's /ship-designer page does not carry its own copy of the ship: the
skins, the hull sprite, the laser and missile modes, the action bar and the
default profile are all read out of the game by this script, by running the
game's own code headlessly. The game is the source of truth; re-run this after
the game's designer or ship sprite changes and commit what it writes.

  python3 scripts/export-ship-designer.py --game ../ETU

It writes:

  src/lib/shipDesigner/gameData.json      skins and palettes, modes, the
                                          ability registry labels, the default
                                          action bar, the fresh profile, the
                                          designer's own UI colours, and where
                                          each sprite's engines sit
  public/ship-designer/hulls/<skin>.png   Ship.create_ship_surface for each
                                          skin (what the game's designer draws)
  public/ship-designer/lit/<skin>.webp    the lit 3D hull the ship wears in
                                          flight (etu.render.ship_hull_3d),
                                          nose up under the game's key light
  public/ship-designer/tiers/tier-<n>.png the classic hull at each SHIPVIS-01
                                          progression tier (0..5)
  public/ship-designer/doctrines/<id>.png the top-tier hull in each laser
                                          doctrine's accent

What it calls in the game (all in the materialized runtime image):

  SHIP_SKIN_PALETTES, THRUSTER_COLOR_PRESETS      the skin tables
  Ship.create_ship_surface                        the hull sprite
  etu.render.ship_hull_3d                         the lit hull
  etu.render.ship_progression_visuals             the tier accents
  ShipAbilities                                   action bar slots and labels
  SaveGame._normalize_ship_progress_profile       the fresh profile
  GameModeSelectScreen._draw_ship_design_page     read for its mode lists

Needs: the game checkout, python 3.11+, pygame (or pygame-ce), pillow.
"""

import argparse
import hashlib
import importlib.util
import inspect
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_OUT = ROOT / 'src' / 'lib' / 'shipDesigner' / 'gameData.json'
HULL_DIR = ROOT / 'public' / 'ship-designer' / 'hulls'
TIER_DIR = ROOT / 'public' / 'ship-designer' / 'tiers'
LIT_DIR = ROOT / 'public' / 'ship-designer' / 'lit'
DOCTRINE_DIR = ROOT / 'public' / 'ship-designer' / 'doctrines'

# The size passed to Ship.create_ship_surface. The game's own designer draws
# the hull at 72-110 px; the sprite is built from proportions of this number,
# so a larger one is the same drawing with more pixels in it.
SPRITE_SIZE = 256

# The lit hull (SHIP3D-01) is what the ship looks like in flight. It is baked
# at the ship's own size and supersampled; the game stops at 6 bake pixels per
# base pixel when zoomed in, and the bake takes any factor.
LIT_BASE_SIZE = 40
LIT_SUPERSAMPLE = 10


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--game', type=Path, default=ROOT.parent / 'ETU', help='path to the game checkout')
    parser.add_argument('--image', type=Path, default=None, help='an already materialized ETU14.py')
    return parser.parse_args()


def materialize(game: Path) -> Path:
    image = game / '.etu_runtime' / 'current' / 'ETU14.py'
    if not image.exists():
        subprocess.run(
            [sys.executable, 'run_game.py', '--prepare-only', '--native', 'off'],
            cwd=game, check=True,
        )
    return image


def load_game(game: Path, image: Path):
    os.environ.setdefault('SDL_VIDEODRIVER', 'dummy')
    os.environ.setdefault('SDL_AUDIODRIVER', 'dummy')
    sys.path.insert(0, str(game / 'src'))
    import pygame

    pygame.init()
    pygame.display.set_mode((64, 64))
    spec = importlib.util.spec_from_file_location('etu14_ship_designer_export', image)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return pygame, module


def hex_color(rgb) -> str:
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(c))) for c in rgb[:3])


def title(token: str) -> str:
    return str(token).replace('_', ' ').title()


def literal_tuple(source: str, name: str):
    """A `name = ( ("id", "Label"), ... )` tuple, read out of the page's source."""
    match = re.search(name + r'\s*=\s*\((.*?)\n\s*\)\n', source, re.S)
    if not match:
        raise SystemExit(f'could not find {name} in the designer page; the game changed, update this script')
    pairs = re.findall(r'\(\s*"([a-z_]+)"\s*,\s*"([^"]+)"\s*\)', match.group(1))
    if not pairs:
        raise SystemExit(f'{name} had no (id, label) pairs')
    return [{'id': mode, 'label': label} for mode, label in pairs]


def crop_to_content(pygame, surface, pad: int):
    """Trim the sprite to what is drawn, keeping it centred on the ship's axis."""
    bounds = surface.get_bounding_rect()
    cx = surface.get_width() // 2
    half = max(cx - bounds.left, bounds.right - cx) + pad
    top = max(0, bounds.top - pad)
    bottom = min(surface.get_height(), bounds.bottom + pad)
    rect = pygame.Rect(cx - half, top, half * 2, bottom - top).clip(surface.get_rect())
    return surface.subsurface(rect).copy(), rect


def save_png(pygame, surface, path: Path):
    from PIL import Image

    path.parent.mkdir(parents=True, exist_ok=True)
    raw = pygame.image.tobytes(surface, 'RGBA')
    picture = Image.frombytes('RGBA', surface.get_size(), raw)
    if path.suffix == '.webp':
        picture.save(path, quality=92, method=6)
    else:
        picture.save(path, optimize=True)


def main():
    args = parse_args()
    game = args.game.resolve()
    if not (game / 'run_game.py').exists():
        raise SystemExit(f'{game} is not a game checkout (no run_game.py); pass --game')
    image = (args.image or materialize(game)).resolve()
    pygame, m = load_game(game, image)

    from etu.render import ship_progression_visuals as spv

    # ── skins and their sprites ────────────────────────────────────────────
    def build_sprite(skin_id: str, upgrade_tier: int = 0, doctrine: str = ''):
        # The same stub the game's designer builds in
        # _get_mode_select_ship_preview_surface.
        stub = type('WebsiteShipPreview', (), {})()
        stub.size = float(SPRITE_SIZE)
        stub.skin_id = skin_id
        stub.hull_tint = None
        stub.glow_color = None
        stub.trail_color = None
        stub.thruster_color = None
        stub.laser_doctrine = doctrine
        if upgrade_tier:
            # What install_ship_progression_visuals binds onto Ship.
            stub._paint_upgrade_tier = lambda surface, tier, w, h, cx, cy: spv.paint_upgrade_tier(
                surface, tier, w, h, cx, cy, spv.doctrine_accent(stub), pygame, committed=bool(doctrine)
            )
        return m.Ship.create_ship_surface(stub, SPRITE_SIZE, 0, upgrade_tier)

    # Geometry of the sprite, from the same proportions create_ship_surface
    # uses, so the page can put flames under the thruster housings.
    width = int(round(SPRITE_SIZE))
    height = int(round(SPRITE_SIZE * 1.35))

    reference, crop = crop_to_content(pygame, build_sprite('classic', spv.MAX_TIER), pad=6)
    canvas = build_sprite('classic').get_width()
    cx = canvas // 2 - crop.x
    cy = canvas // 2 - crop.y
    sprite = {
        'width': crop.width,
        'height': crop.height,
        'thrusters': [
            {'x': cx + sign * int(width * 0.22), 'y': cy + int(height * 0.28) + int(height * 0.18) // 2}
            for sign in (-1, 1)
        ],
        'thrusterWidth': max(2, int(width * 0.18)),
        'core': {'x': cx, 'y': cy + int(height * 0.3)},
        'nose': {'x': cx, 'y': cy - int(height * 0.6)},
    }

    skins = []
    for skin_id, palette in m.SHIP_SKIN_PALETTES.items():
        surface = build_sprite(skin_id).subsurface(crop).copy()
        save_png(pygame, surface, HULL_DIR / f'{skin_id}.png')
        skins.append({
            'id': skin_id,
            'name': title(skin_id),
            'sprite': f'/ship-designer/hulls/{skin_id}.png',
            'palette': {key: hex_color(value) for key, value in palette.items()},
        })

    # ── the lit hull: what the ship looks like in flight ───────────────────
    from etu.render import ship_hull_3d as s3

    geo = s3.hull_geometry(LIT_BASE_SIZE)
    k = LIT_SUPERSAMPLE
    lit_crop = None
    lit = None
    for entry in skins:
        stub = type('WebsiteShipPreview', (), {'skin_id': entry['id'], 'hull_tint': None, 'glow_color': None})()
        material = s3.bake_hull_material(LIT_BASE_SIZE, k, s3.resolve_palette(stub, m.SHIP_SKIN_PALETTES))
        # Nose up on screen, under the game's screen-fixed key light.
        surface = s3.surface_from_rgba(pygame, s3.shade_hull(material, s3.body_light(0)))
        if lit_crop is None:
            _, lit_crop = crop_to_content(pygame, surface, pad=k)
            lcx = geo['cx'] * k - lit_crop.x
            lcy = geo['cy'] * k - lit_crop.y
            lit = {
                'width': lit_crop.width,
                'height': lit_crop.height,
                'thrusters': [
                    {
                        'x': lcx + sign * int(geo['width'] * 0.22 * k),
                        'y': lcy + int(geo['height'] * (0.28 + 0.09) * k),
                    }
                    for sign in (-1, 1)
                ],
                'thrusterWidth': int(geo['width'] * 0.18 * k),
                'keyLight': list(s3.KEY_LIGHT),
            }
        save_png(pygame, surface.subsurface(lit_crop).copy(), LIT_DIR / f"{entry['id']}.webp")
        entry['lit'] = f"/ship-designer/lit/{entry['id']}.webp"

    tiers = []
    thresholds = list(getattr(spv, '_LEVEL_THRESHOLDS', ()))
    for tier in range(spv.MAX_TIER + 1):
        surface = build_sprite('classic', tier).subsurface(crop).copy()
        save_png(pygame, surface, TIER_DIR / f'tier-{tier}.png')
        tiers.append({
            'tier': tier,
            'sprite': f'/ship-designer/tiers/tier-{tier}.png',
            'level': 1 if tier == 0 else thresholds[tier - 1],
        })

    doctrines = []
    for doctrine, accent in spv.DOCTRINE_ACCENTS.items():
        surface = build_sprite('classic', spv.MAX_TIER, doctrine).subsurface(crop).copy()
        save_png(pygame, surface, DOCTRINE_DIR / f'{doctrine}.png')
        doctrines.append({
            'id': doctrine,
            'name': title(doctrine),
            'accent': hex_color(accent),
            'sprite': f'/ship-designer/doctrines/{doctrine}.png',
        })

    # ── the designer page's own lists ──────────────────────────────────────
    page_source = inspect.getsource(m.GameModeSelectScreen._draw_ship_design_page)
    laser_modes = literal_tuple(page_source, 'laser_modes')
    missile_modes = literal_tuple(page_source, 'missile_modes')

    # ── the action bar ─────────────────────────────────────────────────────
    abilities = m.ShipAbilities
    default_slots = list(abilities.normalize_runtime_slots(abilities.default_action_bar_slots()))
    while default_slots and not default_slots[-1]:
        default_slots.pop()

    def slot(token):
        if not token:
            return None
        definition = abilities.get(token)
        entry = {
            'id': str(token),
            'label': str(getattr(definition, 'label', None) or title(token).upper()),
        }
        for attr in ('category', 'desc'):
            value = getattr(definition, attr, None)
            if value:
                entry['description' if attr == 'desc' else attr] = str(value)
        accent = getattr(definition, 'accent', None)
        if accent:
            entry['accent'] = hex_color(accent)
        return entry

    # ── the fresh profile ──────────────────────────────────────────────────
    profile = m.SaveGame._normalize_ship_progress_profile({})
    fresh = {
        'level': int(profile.get('ship_level_current', 1) or 1),
        'xp': float(profile.get('ship_xp_current', 0.0) or 0.0),
        'xpNext': float(profile.get('ship_xp_next', 100.0) or 100.0),
        'skillPoints': int(profile.get('skill_points', 0) or 0),
        'skinId': str((profile.get('appearance') or {}).get('skin_id') or 'classic'),
        'activeLaserMode': str(profile.get('active_laser_mode') or 'single'),
        'activeMissileMode': str(profile.get('active_missile_mode') or 'standard'),
        'unlockedLaserModes': sorted(str(mode) for mode in (profile.get('unlocked_laser_abilities') or [])),
        'unlockedMissileModes': ['standard'] + sorted(
            str(key) for key, value in (profile.get('unlocked_missile_abilities') or {}).items()
            if key in {'homing', 'cluster', 'splitter'} and int(value or 0) > 0
        ),
        'skills': [
            {'id': key, 'label': m.GameModeSelectScreen._ship_design_humanize(key), 'rank': int(value)}
            for key, value in (profile.get('skills') or {}).items()
        ],
    }

    data = {
        '_generated': (
            'Written by scripts/export-ship-designer.py from the game. Do not edit by hand; '
            'change the game and export again.'
        ),
        'source': {
            'repository': 'etelford32/ETU',
            'commit': subprocess.run(
                ['git', 'rev-parse', '--short', 'HEAD'], cwd=game, capture_output=True, text=True
            ).stdout.strip(),
            'runtimeImageSha256': hashlib.sha256(image.read_bytes()).hexdigest(),
        },
        'sprite': sprite,
        'litSprite': lit,
        'skins': skins,
        'thrusterColors': [
            {'id': key, 'name': title(key), 'color': hex_color(value)}
            for key, value in m.THRUSTER_COLOR_PRESETS.items()
        ],
        'progressionTiers': tiers,
        'doctrines': doctrines,
        'tabs': [{'id': tab, 'label': title(tab)} for tab in ('overview', 'loadout', 'upgrades', 'abilities')],
        'laserModes': laser_modes,
        'missileModes': missile_modes,
        'actionBar': {
            'slotCount': int(abilities.ACTION_BAR_SLOT_COUNT),
            'hotkeySlots': 9,
            'defaults': [slot(token) for token in default_slots],
        },
        'freshProfile': fresh,
        # The colours _ship_design_draw_panel / _draw_button / _draw_row use.
        'ui': {
            'panelFill': 'rgba(8, 16, 28, 0.73)',
            'panelBorder': hex_color((70, 150, 210)),
            'title': hex_color((235, 246, 255)),
            'rowLabel': hex_color((168, 194, 222)),
            'rowValue': hex_color((222, 238, 255)),
            'hint': hex_color((154, 184, 214)),
            'locked': hex_color((124, 144, 164)),
            'buttonFill': hex_color((18, 32, 48)),
            'buttonFillActive': hex_color((32, 58, 72)),
            'buttonFillDisabled': hex_color((18, 22, 30)),
            'buttonBorderDisabled': hex_color((72, 88, 104)),
            'buttonInnerActive': hex_color((130, 230, 255)),
            'tabAccent': hex_color((120, 220, 255)),
            'laserAccent': hex_color((110, 245, 220)),
            'missileAccent': hex_color((180, 245, 150)),
            'syncAccent': hex_color((120, 220, 170)),
            'backAccent': hex_color((90, 190, 255)),
            'level': hex_color((255, 222, 132)),
            'xp': hex_color((150, 225, 255)),
            'xpBarFill': hex_color((92, 205, 255)),
            'xpBarTrack': hex_color((36, 48, 72)),
        },
    }

    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(data, indent=2) + '\n')
    print(f'{len(skins)} skins, {len(tiers)} tiers, {len(default_slots)} action bar slots')
    print(f'sprite {crop.width}x{crop.height} from game {data["source"]["commit"]}')
    print(f'wrote {DATA_OUT.relative_to(ROOT)} and {HULL_DIR.relative_to(ROOT)}/')


if __name__ == '__main__':
    main()
