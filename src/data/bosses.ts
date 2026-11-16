import { resolveFactionSlug } from "./factions";

/**
 * The bosses that exist in the game today: the Construct LAB's boss roster
 * (`_construct_boss_token_order` in the ETU runtime). Every line of copy here
 * is taken from the game code — bestiary blurbs, registry fields, class
 * constants, ability names and in-game dialogue. Nothing planned, nothing
 * invented.
 */

/** Bestiary rarity. Only bosses with a bestiary entry carry one. */
export type BossTier = "Rare" | "Epic" | "Legendary";
export type BossStatus = "live" | "in-development";

export interface BossAbility {
  name: string;
  /** One short line: what it does. */
  text: string;
  /** Revealed on click: the numbers behind it. */
  detail?: string;
  /** Index into `screenshots` that shows this ability, if one does. */
  shot?: number;
}

export interface BossShot {
  src: string;
  alt: string;
}

export interface BossStat {
  label: string;
  value: string;
}

export interface BossPhase {
  name: string;
  /** Health mark ("60%") for health phases, duration ("0.85 s") for cycles. */
  at: string;
  /** What changes, or what the boss says. */
  line?: string;
  /** True when `line` is something the boss says. */
  spoken?: boolean;
}

export interface Boss {
  /** URL slug. Hyphenated, lower-case. */
  id: string;
  /** Game-side registry token (snake_case). */
  token: string;
  /** Display name, as the game shows it. */
  name: string;
  /** One line, from the game's own text. */
  tagline: string;
  /** Hero image (path under /public). Always screenshots[0]. */
  heroImage: string;
  /** In-game screenshots. */
  screenshots: BossShot[];
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  tier?: BossTier;
  /** Game-side faction token from the boss registry. */
  factionToken?: string;
  /** Resolved website faction slug for cross-linking (computed). */
  factionId?: string;
  /** How you run into it. */
  encounter?: string;
  stats: BossStat[];
  abilities: BossAbility[];
  /** Health phases, or a repeating combat cycle. */
  phases?: { kind: "health" | "cycle"; label: string; steps: BossPhase[] };
  /** A line the boss says in-game. */
  quote?: string;
  homeZone?: string;
  homePlanet?: string;
  status: BossStatus;
  /** Long-form page for this boss outside /bosses/[slug] (e.g. /megabot). */
  featurePage?: { href: string; label: string };
}

const SHOT = "/bosses";

type RawBoss = Omit<Boss, "heroImage" | "factionId">;

const RAW_BOSSES: RawBoss[] = [
  {
    id: "megabot",
    token: "megabot",
    name: "MEGABOT",
    tagline: "The machine god. Its eyes are its weapons.",
    screenshots: [
      { src: `${SHOT}/megabot-solid.jpg`, alt: "MEGABOT holding station" },
      { src: `${SHOT}/megabot-full-burn.jpg`, alt: "MEGABOT at full burn on its leg jets" },
      { src: `${SHOT}/megabot-turret-spray.jpg`, alt: "MEGABOT firing a turret spray" },
      { src: `${SHOT}/megabot-worn-down.jpg`, alt: "MEGABOT with armour stripped and an arm broken" },
    ],
    color: { primary: "#ef4444", secondary: "#dc2626", accent: "#fca5a5" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Scales to your ship's power. Its full kit unlocks in its arena.",
    stats: [
      { label: "Hull", value: "50,000" },
      { label: "Shield", value: "10,000" },
      { label: "Power scaling", value: "0.75× – 12×" },
    ],
    abilities: [
      {
        name: "Evil Eye",
        text: "A tracking lance that pierces everything in its line.",
        detail: "Hitscan, range 3,000. Pulses for 5 s: lit 0.2 s of every second, 260 damage a second while lit. Running hands it the shot: close in and reverse across the sweep.",
      },
      {
        name: "Orbital Strike",
        text: "Three delayed impacts around your ship.",
        detail: "420 damage each, 260-unit blast. Arena only.",
      },
      { name: "Gravity Well", text: "Pulls your ship in.", detail: "Reaches 900 units. Arena only." },
      { name: "Turret Spray", text: "A spread from the arm cannon.", detail: "120 damage a round.", shot: 2 },
      {
        name: "Minibot Swarm",
        text: "Releases a swarm of minibots.",
        detail: "3 mecha scouts, 2 mini mechas, 1 medic, 500 nanobots, 20 nanoturrets.",
      },
      {
        name: "Layered Armour",
        text: "Fifteen plates, two layers each, over a frame with eight weak points.",
        detail: "A live plate absorbs half of a hit. A stripped plate exposes the frame at 1.6×. A broken arm cannot fire its cannon.",
        shot: 3,
      },
      {
        name: "Separation",
        text: "At 60% the head and hands fly off and fight on their own.",
        detail: "Arms follow 9 s later, legs at 30%. Head 3,000, hand 1,200, arm 2,800, leg 3,600. A part shot down costs the hull 75% of its health.",
      },
      {
        name: "Protocol Zero",
        text: "At 1% hull: a ten-second self-destruct countdown.",
        detail: "Be more than 3,000 units away when it ends.",
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Assembled", at: "100%", line: "ALL SYSTEMS NOMINAL. BEGINNING TERMINATION SEQUENCE.", spoken: true },
        { name: "Separated", at: "60%", line: "EACH COMPONENT IS SUFFICIENT TO END YOU.", spoken: true },
        { name: "Overdrive", at: "30%", line: "IMPOSSIBLE. RECALCULATING... RECALCULATING...", spoken: true },
        { name: "Core Meltdown", at: "1%", line: "THIS UNIT... WAS MERELY... A SCOUT...", spoken: true },
      ],
    },
    quote: "ORGANIC DETECTED. INITIATING PROTOCOL ZERO.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
    featurePage: { href: "/megabot", label: "Meet MEGABOT" },
  },
  {
    id: "mega-mecha-scout",
    token: "mega_mecha_scout",
    name: "Mega Mecha Scout",
    tagline: "A scout scaled past all reason, and armed to match its arrogance.",
    screenshots: [
      { src: `${SHOT}/mega-mecha-scout-render.jpg`, alt: "Mega Mecha Scout hull" },
      { src: `${SHOT}/mega-mecha-scout-volley.jpg`, alt: "Mega Mecha Scout missile volley closing on the player" },
    ],
    color: { primary: "#f97316", secondary: "#ea580c", accent: "#fdba74" },
    tier: "Epic",
    factionToken: "evil_robots",
    encounter: "Survival: arrives when the encounter timer runs out.",
    stats: [
      { label: "Hull", value: "2,400" },
      { label: "Shield", value: "550" },
      { label: "Reward", value: "1,100 XP · 2,200 cr" },
    ],
    abilities: [
      {
        name: "Missile Volleys",
        text: "Cluster, splitter and long-range homing rounds.",
        detail: "Mid volley: four rounds, one every 0.34 s. Its missiles outrun it.",
        shot: 1,
      },
      { name: "Machine Gun", text: "Opens up at close range.", shot: 1 },
      { name: "Escorts", text: "Calls in ordinary Mecha Scouts.", detail: "On a 60 s timer." },
      {
        name: "Shootable Parts",
        text: "The cockpit and each thruster can be shot out.",
        detail: "Cockpit 15% of hull, each thruster 11%. A dead cockpit means no aim and unguided missiles.",
      },
      { name: "Decoy Flares", text: "A last stand at 30% hull.", detail: "30 flares, 3.2 s each, lure range 700." },
    ],
    phases: {
      kind: "health",
      label: "Encounter",
      steps: [
        { name: "Arrival", at: "100%", line: "Biggest scout in the fleet.", spoken: true },
        { name: "Wounded", at: "55%", line: "You are hurting the paint.", spoken: true },
        { name: "Critical", at: "25%", line: "Structural. Irrelevant.", spoken: true },
        { name: "Defeat", at: "0%", line: "Scout... report... incomplete...", spoken: true },
      ],
    },
    quote: "You shot one. I have tubes.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "robo-b",
    token: "robo_b",
    name: "Robo B",
    tagline: "A chrome war frame with a blaster that runs dry every thirty seconds.",
    screenshots: [
      { src: `${SHOT}/robo-b-firing.jpg`, alt: "Robo B with his blaster charged and shield dome up" },
      { src: `${SHOT}/robo-b-recharging.jpg`, alt: "Robo B recharging his blaster, dome dimmed" },
      { src: `${SHOT}/robo-b-generator-blast.jpg`, alt: "Robo B's generator exploding" },
    ],
    color: { primary: "#60ccff", secondary: "#5c687c", accent: "#bfe9ff" },
    tier: "Epic",
    factionToken: "evil_robots",
    encounter: "Drops in on the raid at Bill's Cave with three Iron Fists.",
    stats: [
      { label: "Hull", value: "3,600" },
      { label: "Shield", value: "900" },
      { label: "Generator", value: "950" },
      { label: "Reward", value: "1,800 XP · 3,600 cr" },
    ],
    abilities: [
      {
        name: "Blaster",
        text: "Three-bolt bursts from the long gun in his right hand.",
        detail: "8 damage a bolt, range 980. A burst every 1.05 s.",
        shot: 0,
      },
      {
        name: "Generator",
        text: "The pack on his back powers his shield, his speed and his guns.",
        detail: "950 hull. A round within 55° of his tail hits it past the shield, and 35% reaches his hull.",
      },
      {
        name: "Shield Dome",
        text: "Covers his front and flanks. His back is open.",
        detail: "Regenerates 45 a second after 2.5 s. Stops while the blaster recharges.",
        shot: 1,
      },
      {
        name: "Jet Dash",
        text: "Sidesteps on his thrusters while the blaster recharges.",
        detail: "0.32 s burst every 3.6 s. Needs the generator.",
      },
      {
        name: "Generator Lost",
        text: "Destroy the generator and the shield is gone for good.",
        detail: "0.6× speed, 0.75× bolt damage, 1.5× recharge time, no dashes.",
        shot: 2,
      },
    ],
    phases: {
      kind: "cycle",
      label: "Blaster Cycle",
      steps: [
        { name: "Blaster Online", at: "30 s", line: "ROBO B ONLINE. TARGET ACQUIRED.", spoken: true },
        { name: "Blaster Recharging", at: "30 s", line: "Blaster cells dry. Rerouting generator.", spoken: true },
      ],
    },
    quote: "GENERATOR LOST. SHIELD OFFLINE.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "alpha-robot",
    token: "alpha_robot",
    name: "Alpha Robot",
    tagline: "A mech with a soldier's guns and a shield that thinks for itself. Two minds, one fight.",
    screenshots: [
      { src: `${SHOT}/alpha-robot-charged-bolt.jpg`, alt: "Alpha Robot landing a charged bolt, his shield plate thrown wide" },
      { src: `${SHOT}/alpha-robot-flak.jpg`, alt: "Alpha Robot firing wrist flak at point-blank range" },
    ],
    color: { primary: "#d6463c", secondary: "#782420", accent: "#ffb3ab" },
    tier: "Epic",
    factionToken: "evil_robots",
    encounter: "Survival: MegaBot dispatches him five minutes in.",
    stats: [
      { label: "Hull", value: "16,000" },
      { label: "Shield", value: "4,000" },
      { label: "Alpha Shield", value: "3,200" },
      { label: "Reward", value: "7,800 XP · 15,500 cr" },
    ],
    abilities: [
      {
        name: "Alpha Shield",
        text: "A plate with its own hull, its own thrusters and its own mind.",
        detail: "3,200 hull. Flies home to mend at 25%. Spent after three trips. Re-forged 20 s after it breaks.",
      },
      {
        name: "Forearm Blasters",
        text: "Six-round bursts, alternating arms.",
        detail: "28 damage a bolt, range 1,500. From phase 2 every third burst opens with a 96-damage charged bolt.",
        shot: 0,
      },
      {
        name: "Bicep Rockets",
        text: "The pods open, then a homing volley.",
        detail: "115 damage, 70-unit blast. Four rockets, eight from phase 2.",
      },
      { name: "Wrist Flak", text: "A seven-round fan when you close in.", detail: "16 damage a round, inside 380 units.", shot: 1 },
      {
        name: "Shield Throw",
        text: "Throws the plate at your ship. He is uncovered until it comes home.",
        detail: "260 damage. Phase 2 on, inside 900 units, every 11 s.",
      },
      {
        name: "Boot Slam",
        text: "Both boots go blue, then he burns straight at you.",
        detail: "180 damage. Phase 2 on, inside 760 units, every 14 s.",
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "ALPHA UNIT DEPLOYED. THE EYE SENDS ITS REGARDS. SHIELD, ON ME.", spoken: true },
        { name: "Phase 2", at: "66%", line: "ARMOUR COMPROMISED. OVERDRIVE. THE BOOTS ARE HOT.", spoken: true },
        { name: "Phase 3", at: "33%", line: "THIS IS WHAT HE BUILT ME FOR.", spoken: true },
        { name: "Defeat", at: "0%", line: "FATHER... I HELD... THE LINE...", spoken: true },
      ],
    },
    quote: "YOU SHOT THE SHIELD. EVERYONE SHOOTS THE SHIELD. NOW LOOK AT ME.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "sidewinder",
    token: "sidewinder",
    name: "SideWinder",
    tagline: "It will not turn to face you and it will not fly where it is pointed.",
    screenshots: [
      { src: `${SHOT}/sidewinder-burn.jpg`, alt: "SideWinder mid lateral burn" },
      { src: `${SHOT}/sidewinder-turn.jpg`, alt: "SideWinder swinging its drive yoke" },
      { src: `${SHOT}/sidewinder-drift.jpg`, alt: "SideWinder drifting between burns" },
    ],
    color: { primary: "#fbbf24", secondary: "#d97706", accent: "#fde68a" },
    tier: "Rare",
    factionToken: "evil_robots",
    encounter: "A bounty contract. Kill it to earn Sustained Side Thrust.",
    stats: [
      { label: "Hull", value: "7,600" },
      { label: "Shield", value: "2,600" },
      { label: "Reward", value: "6,200 XP · 12,500 cr" },
    ],
    abilities: [
      {
        name: "Lateral Drive",
        text: "Charges, then burns sideways across your line.",
        detail: "Reverses its orbit every 2–3 burns.",
        shot: 0,
      },
      { name: "Drift Lance", text: "A heavy bolt from its free-turning gun cradle.", detail: "46 damage. Always ready.", shot: 1 },
      { name: "Crossfire", text: "A five-round fan, fired mid-burn.", detail: "22 damage per round." },
      {
        name: "Wake Charge",
        text: "Mines left in its wake.",
        detail: "20 damage. Arms in 0.6 s, lasts 3.2 s, then blooms into six shards of 12.",
      },
      {
        name: "Lateral Rail",
        text: "A red sight line, then a rail shot.",
        detail: "120 damage at 1,600 u/s. 1 s of warning, 7 s cooldown. From phase II.",
      },
      { name: "Coriolis Scatter", text: "A close-range cone of pellets.", detail: "Nine pellets of 9 in a 40° cone, inside 350 units." },
      {
        name: "Overclock",
        text: "At 65% and 30% hull it vents, then comes back tighter and faster.",
        detail: "Each change is a 2.4 s vent with no fire. In phase III it coasts at 1.90× damage taken.",
      },
    ],
    phases: {
      kind: "cycle",
      label: "Burn Cycle",
      steps: [
        { name: "Charging", at: "0.85 s", line: "The drift ring lights the side it will burn." },
        { name: "Sustaining", at: "1.25 s", line: "Full lateral burn. Crossfire and mines." },
        { name: "Coasting", at: "1.05 s", line: "No steering. Takes 1.65× damage." },
        { name: "Venting", at: "1.90 s", line: "Overheated after about three burns. Holds fire." },
      ],
    },
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "null-architect",
    token: "null_architect",
    name: "Null Architect",
    tagline: "Megabot's high priest. He builds prisons of dark electricity around you and stands inside them.",
    screenshots: [
      { src: `${SHOT}/null-architect-hologram.jpg`, alt: "The Null Architect, a green hologram on his blueprint grid" },
      { src: `${SHOT}/null-architect-chain-walls.jpg`, alt: "The Null Architect raising chain walls around the player" },
      { src: `${SHOT}/null-architect-charged.jpg`, alt: "The Null Architect charged, his tesseract gone red" },
      { src: `${SHOT}/null-architect-stunned.jpg`, alt: "The Null Architect stunned" },
    ],
    color: { primary: "#5aff8c", secondary: "#aa82ff", accent: "#e8ffee" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Survival: MegaBot dispatches him seven minutes in. Also a Bounty Hunters Guild contract.",
    stats: [
      { label: "Hull", value: "20,000" },
      { label: "Shield", value: "6,000" },
      { label: "Ward Pylons", value: "6" },
      { label: "Reward", value: "9,000 XP · 18,000 cr" },
    ],
    abilities: [
      {
        name: "Chain Walls",
        text: "Pylons leave his orbit and arc dark electricity between them.",
        detail: "140 damage a touch. Stand 9 s. A door opens for 1.4 s of every 3.2 s.",
        shot: 1,
      },
      { name: "Stasis Seal", text: "A square on the floor that holds a ship that crosses it.", detail: "Arms in 0.8 s. Holds for 1.6 s. Up to three." },
      {
        name: "Null Writ",
        text: "A slow seeker that switches your weapons off.",
        detail: "Weapons nulled for 5 s. 160 hull: shoot it down, or outrun it for 4 s.",
      },
      { name: "Fold", text: "He does not fly. He folds, and folds rocks into your path.", detail: "A marker shows every arrival 0.6 s ahead." },
      {
        name: "Null Point",
        text: "A point that pulls your ship in and drains it.",
        detail: "Pulls from 700 units. 220 damage a second at the core. Pops for 90.",
      },
      {
        name: "Cells",
        text: "The Ring, the Lattice, the Drain, the Split. He is untouchable until you are out.",
        detail: "Weak link: 900 hull. Dissolves after 25 s.",
      },
      {
        name: "The Matrix",
        text: "Four panes close on you. Break one or be crushed.",
        detail: "2,400 hull a pane, 3× damage on the seam. Closes in 12 s. Crush: 60% of max hull. A broken pane stuns him for 4 s.",
        shot: 2,
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase I", at: "100%", line: "I computed you before you were born. Three roots, one braid. I built the room.", spoken: true },
        { name: "Phase II", at: "66%", line: "The room learns.", spoken: true },
        { name: "Phase III", at: "33%", line: "School is out. The enclosure is the sermon now.", spoken: true },
        { name: "Defeat", at: "0%", line: "The braid holds. Then I was right.", spoken: true },
      ],
    },
    quote: "You cannot damage what you have not escaped. Begin.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "siege-colossus",
    token: "siege_colossus",
    name: "Siege Colossus",
    tagline: "Megabot's ultimate weapon, and his pet. It unrolls to fire down its own length, and coils round whatever comes close.",
    screenshots: [
      { src: `${SHOT}/siege-colossus-fan.jpg`, alt: "The Siege Colossus, hood reared, sweeping its beam past the ship" },
      { src: `${SHOT}/siege-colossus-grid.jpg`, alt: "The Siege Colossus burning a grid of parallel beams" },
    ],
    color: { primary: "#ff7850", secondary: "#ff4646", accent: "#ffc9a8" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Summoned in the Construct.",
    stats: [
      { label: "Hull", value: "60,000" },
      { label: "Body", value: "30 chambers · 10 turrets" },
      { label: "Reward", value: "5,600 XP · 11,200 cr" },
    ],
    abilities: [
      {
        name: "Lance",
        text: "Unrolls into a straight line and fires down it.",
        detail: "4 s unfurl, then a 0.8 s burn at 220 damage a second, 5,000 units past the muzzle. The aim locks before it fires.",
      },
      {
        name: "Wrap",
        text: "Slithers round a ship that comes close and closes into a ring.",
        detail: "Springs inside 2,200 units. The ring holds 6 s and tightens in three pulses. Touching it costs 120.",
      },
      {
        name: "Turrets",
        text: "Ten turrets, firing as five pairs down the body.",
        detail: "Three-bolt bursts, 6 damage a bolt, 2.6 s cooldown, range 7,800. One of each pair leads you, the other fires where you are.",
      },
      {
        name: "Silo Salvo",
        text: "Eight homing missiles, launched during the charge.",
        detail: "60 damage each. Missiles are shootable.",
      },
      {
        name: "Lattice",
        text: "Thin bolts thrown either side of the lance.",
        detail: "Six lines, 30 damage a bolt. The safe space is the gaps between them.",
      },
      {
        name: "Broadside",
        text: "Every live turret fires at once.",
        detail: "Three heavy bolts each, 10 damage a bolt. 15 s cooldown. A turret shot off is a gap in the volley.",
      },
      {
        name: "Grid",
        text: "Five parallel beams that drift sideways.",
        detail: "900 units apart, burning 2.4 s. 18 s cooldown. Move with the drift or thread to the next gap.",
        shot: 1,
      },
      {
        name: "Gravity Hook",
        text: "Casts a tether at a ship running from him and reels it in.",
        detail: "Reaches 14,500 units. 14 s cooldown. Jink off the cast's line and it misses.",
      },
      {
        name: "Siege Mortars",
        text: "Lobs shells at marks on your course.",
        detail: "Six mortar chambers, 45 damage a shell, out to 16,000 units. The marks are drawn until the shell lands.",
      },
      {
        name: "Shoot the Head",
        text: "Hits on the hood build strain until he is stunned.",
        detail: "Dazed for 3 s, taking 1.5× damage. A stun in the wrap or the ring lets the ship go. Then 10 s before it can happen again.",
      },
      {
        name: "Severing",
        text: "Cut a chamber through and everything behind it drops off.",
        detail: "Below 17 chambers the ring cannot close. The neck and the first three chambers cannot be cut.",
      },
    ],
    phases: {
      kind: "cycle",
      label: "Charge Cycle",
      steps: [
        { name: "Charge", at: "4.0 s", line: "Unfurls. The bearing tracks the ship, then locks." },
        { name: "Strike", at: "0.8 s", line: "Full length. The lance burns down the line." },
        { name: "Recoil", at: "1.6 s", line: "The shell closes. This is the punish window." },
      ],
    },
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "crush",
    token: "crush",
    name: "Crush",
    tagline: "The Megabot's strangler. He lunges, closes both fists round a ship and squeezes.",
    screenshots: [
      { src: `${SHOT}/crush-stalking.jpg`, alt: "Crush stalking, hands open" },
      { src: `${SHOT}/crush-windup.jpg`, alt: "Crush throwing both arms wide before a lunge" },
      { src: `${SHOT}/crush-lunge.jpg`, alt: "Crush lunging at the ship" },
      { src: `${SHOT}/crush-grip.jpg`, alt: "Crush with both fists closed round the ship" },
      { src: `${SHOT}/crush-grip-live.jpg`, alt: "Crush gripping the player's ship in a live fight" },
    ],
    color: { primary: "#ff3b30", secondary: "#c4181e", accent: "#ffb09c" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Summoned in the Construct.",
    stats: [
      { label: "Hull", value: "22,000" },
      { label: "Reward", value: "6,800 XP · 13,000 cr" },
    ],
    abilities: [
      {
        name: "Lunge",
        text: "Throws both arms wide, then bursts at where the ship is.",
        detail: "0.62 s tell. No lead and no turning mid-lunge: sidestep during the wind-up and he overshoots.",
        shot: 2,
      },
      {
        name: "Grip",
        text: "Pins the ship between his fists and crushes it.",
        detail: "40 rising to 110 damage a second over a 3.6 s hold. Thrust against the fists and shoot him to tear free.",
        shot: 3,
      },
      { name: "Throw", text: "Hurls a ship he has held to the end.", detail: "100 damage." },
      {
        name: "Cable Hand",
        text: "Fires his right hand on a cable and reels the ship in.",
        detail: "From phase 2. Reaches 1,150 units. 7.5 s cooldown, 5.5 s in phase 3.",
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "CRUSH ONLINE. COME CLOSER, LITTLE SHIP.", spoken: true },
        { name: "Phase 2", at: "60%", line: "PLATING BREACHED. HANDS STILL WORK.", spoken: true },
        { name: "Phase 3", at: "25%", line: "I WILL CRUSH YOU FLAT.", spoken: true },
        { name: "Defeat", at: "0%", line: "MY... GRIP...", spoken: true },
      ],
    },
    quote: "GOT YOU.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "xj9",
    token: "xj9",
    name: "XJ9",
    tagline: "The Overlord Suit: the armour the Megabot wears to war, guarding a world the Empire has taken.",
    screenshots: [
      { src: `${SHOT}/xj9-sword-sweep.jpg`, alt: "XJ9 cutting a sword sweep across the ship" },
      { src: `${SHOT}/xj9-guard.jpg`, alt: "XJ9 holding his blade flat in guard" },
      { src: `${SHOT}/xj9-rail-volley.jpg`, alt: "XJ9 firing both shoulder railguns" },
      { src: `${SHOT}/xj9-crescent-volley.jpg`, alt: "XJ9 slashing crescent waves at the ship" },
      { src: `${SHOT}/xj9-horn-charge.jpg`, alt: "XJ9 turned horn-first down the lane his eye painted" },
    ],
    color: { primary: "#ff8424", secondary: "#b0803e", accent: "#f6cc7e" },
    tier: "Legendary",
    factionToken: "evil_robots",
    encounter: "Summoned in the Construct.",
    stats: [
      { label: "Hull", value: "34,000" },
      { label: "Reward", value: "5,200 XP · 10,400 cr" },
    ],
    abilities: [
      {
        name: "Guard",
        text: "The blade held flat across him drinks lasers into his charge.",
        detail: "Absorbs laser, plasma and energy. Warheads break the guard and stagger it for 1.6 s.",
        shot: 1,
      },
      { name: "Deflect", text: "A flick of the wrists sends lasers back.", detail: "60% of the hit comes back, 160 at most." },
      {
        name: "Sword Sweep",
        text: "The blade goes up behind him, then cuts across.",
        detail: "195 damage. 1 s of warning. One hit a swing.",
        shot: 0,
      },
      {
        name: "Crescent Volley",
        text: "Three slashes, three crescent waves.",
        detail: "54 damage a wave, up to 1.6× with a full charge.",
        shot: 3,
      },
      {
        name: "Rail Volley",
        text: "Both shoulder railguns swing down and fire.",
        detail: "Two bolts, 105 damage each. Strip both rails and the volley is gone.",
        shot: 2,
      },
      {
        name: "Horn Charge",
        text: "Turns horn-first and runs the lane his eye painted.",
        detail: "270 damage. 1.6 s of warning.",
        shot: 4,
      },
      {
        name: "Horn Storm",
        text: "At full charge: nine marked strikes where the ship is heading.",
        detail: "Each mark shows for 0.6 s before it lands.",
      },
      {
        name: "Beam Lance",
        text: "A beam down the blade's line that turns after the ship.",
        detail: "From the second act, at half charge. 3,400 units long. Fly across it faster than 300 units a second and you leave it.",
      },
      {
        name: "Planetfall",
        text: "Burns down onto his world to fight and to mend.",
        detail: "From the second act. 180 damage in a 620-unit blast. Break both boots and he is stranded.",
      },
    ],
    phases: {
      kind: "health",
      label: "Acts",
      steps: [
        { name: "Sentinel", at: "100%", line: "THIS WORLD IS MINE. YOU DO NOT PASS.", spoken: true },
        { name: "Planetfall", at: "65%", line: "YOU HAVE MARKED THE SUIT. FIGHT ME ON MY WORLD.", spoken: true },
        { name: "Breach", at: "35%", line: "THE CANOPY IS CRACKED. LOOK AT ME, THEN.", spoken: true },
        { name: "Eject", at: "0%", line: "THE SUIT IS SPENT. I AM NOT. COME TO THE COLOSSUS.", spoken: true },
      ],
    },
    quote: "THIS WORLD IS MINE. YOU DO NOT PASS.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "siege-mecha",
    token: "siege_mecha",
    name: "Siege Mecha",
    tagline: "The Evil Robots' long gun. It is slow and it out-ranges you.",
    screenshots: [
      { src: `${SHOT}/siege-mecha-firing.jpg`, alt: "Siege Mecha firing its laser rifle" },
      { src: `${SHOT}/siege-mecha-salvo.jpg`, alt: "Siege Mecha rippling a missile salvo from its shoulder racks" },
      { src: `${SHOT}/siege-mecha-beam.jpg`, alt: "Siege Mecha's beam in a live fight" },
    ],
    color: { primary: "#e0333a", secondary: "#681016", accent: "#e8c063" },
    tier: "Epic",
    factionToken: "evil_robots",
    encounter: "An elite capital unit. Stands 900 units behind a Terminator's vanguard.",
    stats: [
      { label: "Hull", value: "18,000" },
      { label: "Shield", value: "3,000" },
      { label: "Reward", value: "4,800 XP · 9,600 cr" },
    ],
    abilities: [
      {
        name: "Laser Rifle",
        text: "Tracks with a broken sighting laser, locks, then burns down the frozen bearing.",
        detail: "440 damage a second, 3,600 units long, 46 wide. The lock holds 0.6 s: leave the line. On a target that stays in it the beam runs up to 1.6 s and climbs to triple power.",
        shot: 0,
      },
      {
        name: "Shoulder Racks",
        text: "Twelve homing missiles, rippled shoulder to shoulder.",
        detail: "70 damage each, one every 0.13 s, from 450 to 3,200 units. They can be shot down.",
        shot: 1,
      },
      {
        name: "Displacing",
        text: "Backs away when you get close. It is not fast enough.",
        detail: "Inside 1,000 units. Top speed 92 u/s. A ship that crosses close and fast is never locked.",
      },
      { name: "Energy Shield", text: "Regenerates when it is left alone.", detail: "60 a second after 5 s without a hit." },
      {
        name: "Overcharge",
        text: "Under 40% hull the reactor runs past its rating.",
        detail: "Tracking 1.8 s to 1.3 s. Cooling 3.0 s to 2.2 s.",
      },
    ],
    phases: {
      kind: "cycle",
      label: "Rifle Cycle",
      steps: [
        { name: "Tracking", at: "1.8 s", line: "The sighting laser follows a lead on your ship." },
        { name: "Locked", at: "0.6 s", line: "FIRING SOLUTION HELD.", spoken: true },
        { name: "Firing", at: "0.5 s", line: "The beam burns down the bearing it locked on." },
        { name: "Cooling", at: "3.0 s", line: "Fins glow. Nothing fires." },
      ],
    },
    quote: "SIEGE FRAME ON STATION. RANGE IS MINE.",
    homeZone: "Zone 4: Evil",
    homePlanet: "Mechatropolis",
    status: "live",
  },
  {
    id: "ursos",
    token: "ursos",
    name: "Ursos, Bear King",
    tagline: "Wild King and Guardian of Urthan Prime. Half fur, half steel.",
    screenshots: [
      { src: `${SHOT}/ursos.jpg`, alt: "Ursos, rail gun stowed on his back" },
      { src: `${SHOT}/ursos-rail-charging.jpg`, alt: "Ursos charging his rail gun along a sight line" },
      { src: `${SHOT}/ursos-rail-shot.jpg`, alt: "Ursos firing his rail gun" },
    ],
    color: { primary: "#34d399", secondary: "#059669", accent: "#a7f3d0" },
    tier: "Epic",
    factionToken: "wild_clans",
    encounter: "Spawns neutral. Hail him before you choose a fight.",
    stats: [
      { label: "Hull", value: "12,000" },
      { label: "Reward", value: "4,200 XP · 8,500 cr" },
    ],
    abilities: [
      {
        name: "Rampage Charge",
        text: "Winds up, then rams. Every rampage ends in a Ground Quake.",
        detail: "More likely each phase: 16%, 30%, 44%. Quake: 55 inside 260 units, plus a ring of 20 shards.",
      },
      {
        name: "Rail Gun",
        text: "The gun on his back charges along a ground line, locks, and fires.",
        detail: "52 damage a bolt at 1,750 u/s. One, two, then three bolts by phase. Range 420 to 1,900. 6.5 s cooldown.",
        shot: 2,
      },
      { name: "Maw Beam", text: "A charged beam from the jaws.", detail: "Range 760, 48 damage." },
      {
        name: "Claw Rake",
        text: "A swipe that throws three rakes ahead of it.",
        detail: "40 damage in a 110° arc, 240 units of reach. One, two, then three blows by phase; the third is a Maul.",
      },
      {
        name: "Claw Launch",
        text: "A thrown claw that splits into finger missiles.",
        detail: "132 damage. Splits after 0.65 s into five missiles of 30.",
      },
      { name: "Grapple Chain", text: "Drags you in.", detail: "Range 960, 86 damage." },
      { name: "Bellow", text: "A roar on each phase change that shoves you back.", detail: "1.4 s. A 420-unit ring, 10 damage." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "Steel and claw. We settle this the old way.", spoken: true },
        { name: "Enrage", at: "65%" },
        { name: "Last Stand", at: "30%" },
      ],
    },
    quote: "Good. Pain means the fight still matters.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Urthan Prime",
    status: "live",
  },
  {
    id: "bloom-queen",
    token: "bloom_queen",
    name: "Bloom Queen",
    tagline: "She seeds the field with her own children and reaps what grows.",
    screenshots: [
      { src: `${SHOT}/bloom-queen-hype.jpg`, alt: "Bloom Queen hyping her hyphae healers" },
      { src: `${SHOT}/bloom-queen-sirens-call.jpg`, alt: "Bloom Queen singing Siren's Call, pull rings spreading" },
      { src: `${SHOT}/bloom-queen-embrace.jpg`, alt: "Bloom Queen locking the lane for The Embrace" },
      { src: `${SHOT}/bloom-queen-crimson-kiss.jpg`, alt: "Bloom Queen winding up Crimson Kiss" },
    ],
    color: { primary: "#e879f9", secondary: "#c026d3", accent: "#f5d0fe" },
    tier: "Epic",
    factionToken: "mycelari",
    encounter: "Opens with Mass Birth: three fungal warriors, a sporespine bomber and five hyphae healers.",
    stats: [
      { label: "Hull", value: "12,000" },
      { label: "Shield", value: "500" },
      { label: "Reward", value: "4,500 XP · 9,500 cr" },
    ],
    abilities: [
      {
        name: "Crimson Kiss",
        text: "A fan of spores aimed where you are going.",
        detail: "Three, five, then seven spores by phase. Range 1,300. 0.45 s wind-up.",
        shot: 3,
      },
      {
        name: "The Embrace",
        text: "Charges, locks a lane, then lunges down it.",
        detail: "640 u/s. 90, 130, then 170 damage by phase. 5 s cooldown. Leaves bloom patches behind her.",
        shot: 2,
      },
      {
        name: "Siren's Call",
        text: "A song that pulls your ship in and ends in a Bloom Nova.",
        detail: "From phase 2. Every 16 s, radius 1,100. 450 damage during the song breaks it.",
        shot: 1,
      },
      {
        name: "The Veil",
        text: "Her healers hold a veil over her.",
        detail: "Blocks 20%, plus 12% for each living healer. Shattered: a 3 s stun and 25% more damage taken.",
      },
      {
        name: "Hype the Hyphae",
        text: "Doubles her healers' output.",
        detail: "20 s. A full-heal pulse every 4 s within 1,500 units.",
        shot: 0,
      },
      { name: "Battle Formations", text: "Spear, Shield Wall, Encirclement.", detail: "Switches every 8 s." },
      { name: "Crimson Conversion", text: "Turns enemies into fungal warriors.", detail: "Up to five at a time." },
      {
        name: "Paradise Protocol",
        text: "A spreading field that births Mycelari.",
        detail: "Opens phase 3, then every 45 s. Grows to 2,000 units.",
      },
      {
        name: "Convergence",
        text: "Shares one health pool with the Fungal Lord.",
        detail: "From phase 2, when he is within 1,000 units.",
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%", line: "Orchestrates the hive." },
        { name: "Phase 2", at: "70%", line: "Commands up to 150 units." },
        { name: "Phase 3", at: "40%", line: "Paradise Protocol." },
      ],
    },
    quote: "The bloom welcomes your presence.",
    homeZone: "Zone 1: Fungal",
    homePlanet: "Bloomhaven",
    status: "live",
  },
  {
    id: "fungal-lord",
    token: "fungal_lord",
    name: "Fungal Lord",
    tagline: "The supreme leader of the Mycelari. A massive networked consciousness.",
    screenshots: [
      { src: `${SHOT}/fungal-lord.jpg`, alt: "The Fungal Lord" },
      { src: `${SHOT}/fungal-lord-network.jpg`, alt: "The Fungal Lord linked to his network" },
    ],
    color: { primary: "#f87171", secondary: "#b91c1c", accent: "#fecaca" },
    tier: "Epic",
    factionToken: "mycelari",
    encounter: "Sleeps until you come within 800 units.",
    stats: [
      { label: "Hull", value: "8,000" },
      { label: "Shield", value: "2,000" },
      { label: "Reward", value: "4,000 XP · 9,000 cr" },
    ],
    abilities: [
      { name: "Spore Barrage", text: "Aimed spore volleys.", detail: "8 s of fire, 20 s cooldown. Faster each phase." },
      { name: "Orchestrating", text: "Summons fungal warriors and powers them up.", detail: "A warrior every 8 s, a healer every 12 s.", shot: 1 },
      { name: "Network Overcharge", text: "Doubles his warriors' damage.", detail: "Ends in a ring of 100 spores." },
      { name: "Defensive Cocoon", text: "Holds still and rebuilds his shield.", detail: "4 s. 24 s cooldown." },
      { name: "Death Bloom", text: "His network collapses with him." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase 1", at: "100%" },
        { name: "Phase 2", at: "80%" },
        { name: "Phase 3", at: "50%" },
        { name: "Phase 4", at: "25%" },
      ],
    },
    homeZone: "Zone 1: Fungal",
    homePlanet: "Lordspore",
    status: "live",
  },
  {
    id: "arkanvil-king",
    token: "arkanvil_king",
    name: "King Arkanvil Starhammer",
    tagline: "A forge-hull that charges its crystal and brings it down like a hammer.",
    screenshots: [
      { src: `${SHOT}/arkanvil-battery.jpg`, alt: "King Arkanvil's hull battery firing" },
      { src: `${SHOT}/arkanvil-hull.jpg`, alt: "Rune band, gem inlays and the Starhammer sigil" },
    ],
    color: { primary: "#a78bfa", secondary: "#7c3aed", accent: "#ddd6fe" },
    tier: "Epic",
    factionToken: "crystal_consortium",
    encounter: "Holds court at his throne, and returns to it when you leave.",
    stats: [
      { label: "Hull", value: "4,000" },
      { label: "Shield", value: "1,200" },
      { label: "Reward", value: "4,600 XP · 9,800 cr" },
    ],
    abilities: [
      { name: "Crystal Charge", text: "Dashes in from range.", detail: "Beyond 640 units. 240 damage. 7.5 s cooldown." },
      { name: "Hammer Burst", text: "A lunge and shock at close quarters.", detail: "Inside 360 units. 9.5 s cooldown." },
      {
        name: "Turret Battery",
        text: "Eight twin-barrel mounts, firing in a ripple.",
        detail: "One mount at a time, both barrels. Six-round magazines, 24 damage a bolt.",
        shot: 0,
      },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Stern", at: "100%", line: "Battery fires every 0.52 s." },
        { name: "Agitated", at: "60%", line: "Every 0.43 s." },
        { name: "Enraged", at: "25%", line: "Every 0.34 s." },
      ],
    },
    quote: "Threaten the guild and I'll shatter your hull where it drifts.",
    homeZone: "Zone 10: Crystal",
    homePlanet: "Yllar",
    status: "live",
  },
  {
    id: "space-jesus",
    token: "space_jesus",
    name: "Space Jesus",
    tagline: "The Terrans' saviour, in a hull built for miracles. The miracles are weapons.",
    screenshots: [{ src: `${SHOT}/space-jesus.jpg`, alt: "Space Jesus, his cross-shaped hull inside an allied halo" }],
    color: { primary: "#f6d67e", secondary: "#8ce4ff", accent: "#fdf0c4" },
    tier: "Legendary",
    factionToken: "terran_federation",
    encounter: "Survival: joins you as an ally at 13:00, a minute into the MegaBot battle. Hostile to the Terrans, he judges you instead.",
    stats: [
      { label: "Hull", value: "18,000" },
      { label: "Shield", value: "2,400" },
      { label: "Armor", value: "180" },
    ],
    abilities: [
      { name: "Blessing Lance", text: "A single bolt that leads its target.", detail: "28 damage, 560 u/s, one a second." },
      {
        name: "Judgment",
        text: "A telegraphed fan of bolts.",
        detail: "0.6 s wind-up. Three bolts over 24° every 6 s; five over 36° every 4.5 s in phase II. 22 damage a bolt.",
      },
      {
        name: "Benediction",
        text: "Holds still and prays his hull back. Damage breaks the prayer.",
        detail: "Phase II. 4 s channel, 1.5% of his hull every 0.5 s, 40 to each Terran within 900 units. 600 damage interrupts it. 20 s cooldown.",
      },
      {
        name: "The Twelve Seats",
        text: "A ring of twelve seats lights around him as he falls.",
        detail: "Phase II. One seat for each twelfth of his lower half lost. Ring radius 520 units.",
      },
      { name: "Healing", text: "As an ally he mends you and Terran ships near him.", detail: "65 a second within 900 units." },
    ],
    phases: {
      kind: "health",
      label: "Phases",
      steps: [
        { name: "Phase I", at: "100%", line: "Blessing Lance and Judgment." },
        { name: "Phase II", at: "50%", line: "Benediction, and the Twelve Seats." },
      ],
    },
    quote: "I begin with healing, but I will not let violence take root on Elysium.",
    homeZone: "Zone 15: Wreckage",
    homePlanet: "Elysium 2175",
    status: "live",
  },
  {
    id: "ent-lord",
    token: "ent_lord",
    name: "EntLord",
    tagline: "The whole Ent Council in one body, the lord of Enthara. He fights to learn what you are.",
    screenshots: [
      { src: `${SHOT}/ent-lord.jpg`, alt: "EntLord, ten crowns round one trunk" },
      { src: `${SHOT}/ent-lord-wardens.jpg`, alt: "EntLord with the two Wardens he calls out of the soil" },
      { src: `${SHOT}/ent-lord-healing.jpg`, alt: "EntLord rooted and healing" },
    ],
    color: { primary: "#ffd86e", secondary: "#78e68c", accent: "#fff0c2" },
    tier: "Legendary",
    factionToken: "wild_clans",
    encounter: "Rises when you come within 2,500 units of Enthara. A friend of the Wild is offered a sparring trial instead.",
    stats: [
      { label: "Hull", value: "12,000" },
      { label: "Reward", value: "6,000 XP · 12,000 cr" },
    ],
    abilities: [
      { name: "Seed Volley", text: "Ten seeds at a time.", detail: "28 damage each, every 2 s, reach 1,000." },
      { name: "Branch Blow", text: "A blow that lands well beyond his trunk.", detail: "300 damage, reach 520, every 2.2 s." },
      { name: "Bramble Storm", text: "A full ring of thorns, every bearing at once.", detail: "24 thorns, 14 damage each. Within 900 units. 9 s cooldown." },
      { name: "Long Needle", text: "Holds fire, charges, then fires one lance.", detail: "1.2 s charge. 160 damage at 950 u/s, out to 1,800 units. 8 s cooldown." },
      { name: "Ember Spores", text: "Whoever hurts him burns.", detail: "8 damage a second for 4 s. A fresh hit refreshes it." },
      { name: "Bark", text: "Shrugs off slugs, takes some of a laser, and burns.", detail: "Kinetic ×0.50, laser ×0.65, fire ×1.30." },
    ],
    phases: {
      kind: "health",
      label: "The Trial",
      steps: [
        { name: "Rises", at: "100%", line: "Small machine-rider. The trees remember every fire. Show me what burns in you.", spoken: true },
        { name: "Wardens", at: "75%", line: "Calls two Wardens out of the soil." },
        { name: "Yields", at: "50%", line: "Enough. You have roots after all. The grove will walk beside you.", spoken: true },
        { name: "Roots and heals", at: "25%", line: "A 10 s channel for 30% of his health. Fire breaks it and stuns him for 6 s. Once a fight." },
      ],
    },
    quote: "I was old when your sun was young. Speak quickly.",
    homeZone: "Zone 2: Wild",
    homePlanet: "Enthara",
    status: "live",
  },
];

export const bosses: Record<string, Boss> = Object.fromEntries(
  RAW_BOSSES.map((b) => [
    b.id,
    {
      ...b,
      heroImage: b.screenshots[0].src,
      factionId: b.factionToken ? resolveFactionSlug(b.factionToken) : undefined,
    },
  ])
) as Record<string, Boss>;

export function getBoss(slug: string): Boss | undefined {
  return bosses[slug];
}

export function getAllBossSlugs(): string[] {
  return Object.keys(bosses);
}

export function getAllBosses(): Boss[] {
  return Object.values(bosses);
}

export function getBossesForFaction(factionSlug: string): Boss[] {
  return Object.values(bosses).filter((b) => b.factionId === factionSlug);
}
