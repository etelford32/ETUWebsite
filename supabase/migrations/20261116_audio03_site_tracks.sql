-- AUDIO-03: tracks that ship with the website, as MP3 files under
-- public/media/audio/ (brought over from the composer's Google Drive).
--
-- Apply after the AUDIO-02 migration. Safe to re-run: a row that exists
-- keeps the title, category and visibility an admin gave it, and only takes
-- the file's new size, length and hash.
--
-- storage_path is 'site/<path under public/media/audio>'; nothing is in a
-- storage bucket. git_sha holds the file's sha1, used to version its URL.

alter table public.audio_tracks drop constraint if exists audio_tracks_source_check;
alter table public.audio_tracks
  add constraint audio_tracks_source_check check (source in ('repo', 'website', 'drive', 'site'));

insert into public.audio_tracks
  (source, mime_type, status, storage_path, kind, category, title, bytes, duration_seconds, git_sha, sort_order)
select 'site', 'audio/mpeg', 'published', v.*
from (values
  ('site/music/northern-winds.mp3', 'music', 'playing', 'Northern Winds', 682500, 34.403, 'f01b5b964164543b5b005ef9fae52d57c1f87127', 10),
  ('site/music/cosmic-drift.mp3', 'music', 'playing', 'Cosmic Drift', 1117073, 42.658, '0b4b5a80b9dfdef04e96470b1e900951ab7c4700', 20),
  ('site/music/dust-collector.mp3', 'music', 'playing', 'Dust Collector', 1511693, 58.044, '0318421bb2421f8f0c98721b171f863614f1fd5c', 30),
  ('site/music/world-map.mp3', 'music', 'world_map', 'World Map', 977660, 46.942, 'dc79612fdf44a265b924a71ade5bf03de008a02e', 40),
  ('site/music/explore-the-universe-title-theme.mp3', 'music', 'main_menu', 'Explore the Universe (Title Theme)', 416657, 18.547, 'e5713efe3d5907bd31bed2e8de4a6faa0affcfb4', 10),
  ('site/music/character-screen.mp3', 'music', 'character_screen', 'Character Screen', 954064, 29.1, '730e96b0f41eff1d0db4c486b3eaca8ebd6145f5', 20),
  ('site/music/loading-screen.mp3', 'music', 'loading', 'Loading Screen', 1007622, 42.031, '187ee65c3ef1196b1e3b8be8876161295e387c71', 30),
  ('site/music/echoes-of-lumari.mp3', 'music', 'soundtrack', 'Echoes of Lumari', 4983674, 249.078, 'b9c27811da3cd81fe9e6db35ee68f702b4968257', 10),
  ('site/music/tidal-wave.mp3', 'music', 'soundtrack', 'Tidal Wave', 4934562, 246.622, '07727c0e094b6d0cd3b0732b5249c77a632b2be5', 20),
  ('site/sfx/cyl/cyl-attach.mp3', 'sfx', 'cyl', 'Cyl Attach', 27472, 5.251, '4ddf1f3b8fbfbdfe0380e76ed5fb87272bae008a', 0),
  ('site/sfx/cyl/cyl-detach.mp3', 'sfx', 'cyl', 'Cyl Detach', 27131, 5.094, 'b36c024b17f726fff6384bfd3db17c129a19c58e', 0),
  ('site/sfx/cyl/cyl-laser-shot.mp3', 'sfx', 'cyl', 'Cyl Laser Shot', 15135, 3.161, '52ca98fc03ce7429c0e8b16b6ea30612b4a1bd43', 0),
  ('site/sfx/cyl/cyl-scanning.mp3', 'sfx', 'cyl', 'Cyl Scanning', 121258, 7.314, '6930cef0e5293e4f5a213d826c357d19abfdbaf6', 0),
  ('site/sfx/cyl/cyl-selection.mp3', 'sfx', 'cyl', 'Cyl Selection', 451665, 17.554, '420244e1baa3c57d8b6e534c3ea36e2a1096e169', 0),
  ('site/sfx/enemy/crystal-dwarf-marine-projectile.mp3', 'sfx', 'enemy', 'Crystal Dwarf Marine Projectile', 24428, 4.545, '29eef4556b8f4a541d5d03e98f0c1fde0a52ebbb', 0),
  ('site/sfx/enemy/enemy-laser.mp3', 'sfx', 'enemy', 'Enemy Laser', 16598, 3.135, 'a8834e88a3b33b331ca9515a5a6335a69b1d5aba', 0),
  ('site/sfx/enemy/fungal-grunt-mortar.mp3', 'sfx', 'enemy', 'Fungal Grunt Mortar', 28296, 4.415, '11c1658481765986901a708104e01401e12ef077', 0),
  ('site/sfx/enemy/fungal-warrior-laser-shot.mp3', 'sfx', 'enemy', 'Fungal Warrior Laser Shot', 15135, 3.161, '8c7a0c2fc4c3274aa3504d6c350fc67f73e8c9ec', 0),
  ('site/sfx/enemy/fungal-warrior-laser.mp3', 'sfx', 'enemy', 'Fungal Warrior Laser', 38694, 3.892, '86dd8dbb3d679111e441a81a9ca9ae53708a6e85', 0),
  ('site/sfx/enemy/mecha-scout-laser.mp3', 'sfx', 'enemy', 'Mecha Scout Laser', 41638, 4.676, 'aa4617d3793a9870308fd84164f5d3e743deb1eb', 0),
  ('site/sfx/enemy/megabot-spawn.mp3', 'sfx', 'enemy', 'Megabot Spawn', 249370, 18.965, 'a64c6d7d099bb71e2f5450ec279024ae71ea41e2', 0),
  ('site/sfx/enemy/mini-mecha-laser.mp3', 'sfx', 'enemy', 'Mini Mecha Laser', 30492, 4.153, '3e21ca9895823406a3a7a598f57b2bc3cbb8358b', 0),
  ('site/sfx/enemy/spore-spine-bomb-shot.mp3', 'sfx', 'enemy', 'Spore Spine Bomb Shot', 72828, 6.531, '6b1b5a701d4b3c5ee50a1505b6223eafd9341a40', 0),
  ('site/sfx/enemy/terminator-quad-laser-array.mp3', 'sfx', 'enemy', 'Terminator Quad Laser Array', 67329, 6.504, 'f8e89265576719084d2c556f1195d629da5fcc8a', 0),
  ('site/sfx/enemy/terminator-ship-arrival.mp3', 'sfx', 'enemy', 'Terminator Ship Arrival', 126174, 6.531, '3a28fb187b3013341ce7654f792436e117bf6da5', 0),
  ('site/sfx/impacts/explosion.mp3', 'sfx', 'impacts', 'Explosion', 47261, 5.172, 'a9c96da34577cb54e3a3a8b41276e53636b127ff', 0),
  ('site/sfx/impacts/laser-asteroid-impact.mp3', 'sfx', 'impacts', 'Laser Asteroid Impact', 17036, 3.291, '4d1914cb4d78b727135289bb31d141215a471d5c', 0),
  ('site/sfx/impacts/plasma-cloud-damage.mp3', 'sfx', 'impacts', 'Plasma Cloud Damage', 26308, 3.161, '70eb49bb21e28d101060bd50887c8e907990bd03', 0),
  ('site/sfx/impacts/ship-armor-impact.mp3', 'sfx', 'impacts', 'Ship Armor Impact', 17778, 1.176, '5f19db48b4ef030d583db48b4dc3b1fc03416a5f', 0),
  ('site/sfx/impacts/ship-hull-impact.mp3', 'sfx', 'impacts', 'Ship Hull Impact', 5051, 0.261, 'bf42c87a873c21cbdd9066d13d0649944bcdf202', 0),
  ('site/sfx/player/beam-loop.mp3', 'sfx', 'player', 'Beam Loop', 166615, 10.527, '7908743af609909872f05c7d5d1444ccfe13ed69', 0),
  ('site/sfx/player/beam-start.mp3', 'sfx', 'player', 'Beam Start', 14826, 2.926, '58ff258a6099f1f7c8d5094351815d281f4d5c4c', 0),
  ('site/sfx/player/beam-stop.mp3', 'sfx', 'player', 'Beam Stop', 11001, 0.549, '6cb1fd772c69be4e25aad54383d0ecf008992ff1', 0),
  ('site/sfx/player/blink.mp3', 'sfx', 'player', 'Blink', 36768, 3.422, '7d987913e4e78cf0acedfd3df437c6ef2f784331', 0),
  ('site/sfx/player/boost.mp3', 'sfx', 'player', 'Boost', 111623, 10.162, '45588841715e3907597b94151fe86ff058534ae5', 0),
  ('site/sfx/player/charge-shot.mp3', 'sfx', 'player', 'Charge Shot', 461586, 27.037, '4b7b0020bd5dc757ffa6706eb6e7aa53cab77b47', 0),
  ('site/sfx/player/dart.mp3', 'sfx', 'player', 'Dart', 29483, 3.291, '36d745ac15b845a418b8d9c30956a8819e463e2d', 0),
  ('site/sfx/player/healing-field-begin.mp3', 'sfx', 'player', 'Healing Field Begin', 87701, 4.049, 'a832c6dde8e1ff177b8eca71a2b11cc3330e3736', 0),
  ('site/sfx/player/healing-field-end.mp3', 'sfx', 'player', 'Healing Field End', 91406, 14.028, 'fb59c631a16ffad190ef2fa8bf4c7be0f1e6a7ac', 0),
  ('site/sfx/player/healing-field-uplift.mp3', 'sfx', 'player', 'Healing Field Uplift', 170663, 10.031, '61d5e533c35cca708c2e3221db17f852aaa371be', 0),
  ('site/sfx/player/laser.mp3', 'sfx', 'player', 'Laser', 5207, 0.287, '58cfcd5680612513a104bca32423c3b7cbc76f19', 0),
  ('site/sfx/player/low-energy.mp3', 'sfx', 'player', 'Low Energy', 104144, 5.616, '61ba0f68e3975d9c861615eaa07df70db749bb42', 0),
  ('site/sfx/player/mine-release.mp3', 'sfx', 'player', 'Mine Release', 36797, 5.172, 'a5d748f3da30c007a6fbbc63a9da4f0200f8c9c1', 0),
  ('site/sfx/player/missile.mp3', 'sfx', 'player', 'Missile', 59869, 4.284, 'a34f6df3d832109f02f9b7a0b614035bcfe04647', 0),
  ('site/sfx/player/rapid-fire-activation.mp3', 'sfx', 'player', 'Rapid Fire Activation', 36163, 4.153, '7f542b9650a28fb357aed62a900d9dea9996ad7b', 0),
  ('site/sfx/player/repair-droid.mp3', 'sfx', 'player', 'Repair Droid', 44192, 4.598, 'b86bf5f9aa065ca850e882ba136b91e5e6e01412', 0),
  ('site/sfx/player/shield-back.mp3', 'sfx', 'player', 'Shield Back', 36599, 4.676, '9a8d67229c23ad148763865e7fc9c3d75fc8d5f6', 0),
  ('site/sfx/player/shield-off.mp3', 'sfx', 'player', 'Shield Off', 24445, 3.788, '90aabbd814a5f10a3ec375a48e180f9982e35943', 0),
  ('site/sfx/player/shield-on-loop.mp3', 'sfx', 'player', 'Shield On Loop', 79516, 10.031, '2200015cf47aa67d144477c8e1a23ce976ee885f', 0),
  ('site/sfx/player/shield-on.mp3', 'sfx', 'player', 'Shield On', 32077, 4.78, '6b37586ff45b302c1a60e38baedaea305ac6d3f1', 0),
  ('site/sfx/player/shield-recharging-loop.mp3', 'sfx', 'player', 'Shield Recharging Loop', 86412, 10.031, '075776f57b1e8931a244f58f24674f48e80aac35', 0),
  ('site/sfx/player/ship-laser-shot.mp3', 'sfx', 'player', 'Ship Laser Shot', 17345, 3.657, '9f2b3795a905690afcefe9e1f9624164de5e73ac', 0),
  ('site/sfx/player/ship-shield-damage.mp3', 'sfx', 'player', 'Ship Shield Damage', 35876, 4.049, 'c4112c4e4fc6756955825720cfc8683c1ac68a01', 0),
  ('site/sfx/player/stealth-mode.mp3', 'sfx', 'player', 'Stealth Mode', 47448, 3.892, '95a7909f6a3a8e50de0491ab83c32bb3d4e95bb8', 0),
  ('site/sfx/player/teleport-ability.mp3', 'sfx', 'player', 'Teleport Ability', 50150, 5.669, 'b78aae277cf805c5ab136fbf094aa39a10c4d642', 0),
  ('site/sfx/player/thrust.mp3', 'sfx', 'player', 'Thrust', 130289, 6.531, 'ac0ba5cc40238e3bc58bb4b9cd2c3bf969e6227b', 0),
  ('site/sfx/player/tractor-beam.mp3', 'sfx', 'player', 'Tractor Beam', 167990, 12.304, '696f7ea4483322287299963f1b93cc20c3653cc9', 0),
  ('site/sfx/progress/collect-crystal-memory.mp3', 'sfx', 'progress', 'Collect Crystal Memory', 84015, 5.59, 'e23d3130c1a648690bb37b01cb27e36c325acdb7', 0),
  ('site/sfx/progress/game-over.mp3', 'sfx', 'progress', 'Game Over', 64477, 5.59, 'fe4069d1282ca01799c8ee02707406f236660164', 0),
  ('site/sfx/progress/level-up.mp3', 'sfx', 'progress', 'Level Up', 86413, 6.531, 'e523b41b61799b73f2373d8100ad07969a820970', 0),
  ('site/sfx/progress/quest-complete.mp3', 'sfx', 'progress', 'Quest Complete', 128052, 9.509, 'c54e69779eae53186532c3374fb262625a48aaaf', 0),
  ('site/sfx/progress/spend-skill-points.mp3', 'sfx', 'progress', 'Spend Skill Points', 60636, 3.344, 'dd031d4a3a4d6ee73b460ed9fa6f755c36edb639', 0),
  ('site/sfx/station/dock.mp3', 'sfx', 'station', 'Dock', 112998, 6.034, '3344790eaefa8cc19d6c1385819da66667b9d4a9', 0),
  ('site/sfx/station/docking-menu-open.mp3', 'sfx', 'station', 'Docking Menu Open', 19210, 3.03, 'e7cb097f22ce4e28fcd3af0f37fc7966c82fbbd5', 0),
  ('site/sfx/station/station-activation.mp3', 'sfx', 'station', 'Station Activation', 46943, 6.034, '344be3fb56eb44521edf892e3788e9c1d96d5f8c', 0),
  ('site/sfx/station/station-laser.mp3', 'sfx', 'station', 'Station Laser', 18602, 3.344, '0cd2fae1c2f5ab5e9ee7f09128716a2d1367ca1e', 0),
  ('site/sfx/station/station-worker-purchase.mp3', 'sfx', 'station', 'Station Worker Purchase', 52524, 3.892, '3126f2113b0dabc52f0d29b52b239e4e3a5d87cb', 0),
  ('site/sfx/station/undock.mp3', 'sfx', 'station', 'Undock', 149256, 8.046, '0041b7078734dd53a36d5d73aa7592bcd5ed4762', 0),
  ('site/sfx/ui/main-menu-click.mp3', 'sfx', 'ui', 'Main Menu Click', 132163, 10.031, '8af9c90af76f7b94b6e000457b297e2f9df84d21', 0),
  ('site/sfx/ui/ui-click.mp3', 'sfx', 'ui', 'UI Click', 15213, 3.161, '830af530816f9c38e4d5ee9aa92909800ec1ea21', 0),
  ('site/sfx/ui/world-map-open.mp3', 'sfx', 'ui', 'World Map Open', 52660, 1.437, '4072eaad61f05c295c3be4b2fe346fb0ff245ea4', 0)
) as v(storage_path, kind, category, title, bytes, duration_seconds, git_sha, sort_order)
on conflict (storage_path) do update
  set bytes = excluded.bytes,
      duration_seconds = excluded.duration_seconds,
      git_sha = excluded.git_sha,
      mime_type = excluded.mime_type;
