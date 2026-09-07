export type TileColor = "black" | "white";
type TileKind = "number" | "joker";

export type GameType = "davinci" | "robo77" | "rummikub" | "watermelon" | "dalmuti";
export type RoboCardKind = "number" | "minus10" | "double" | "reverse";
type RummikubColor = "red" | "blue" | "black" | "yellow";

type RummikubTile = {
  id: string;
  kind: "number" | "joker";
  number: number | null;
  color: RummikubColor;
  jokerValue?: number | null;
  jokerColor?: RummikubColor | null;
};

type RummikubMeld = {
  id: string;
  tiles: RummikubTile[];
};

export type DalmutiCard = {
  id: string;
  kind: "number" | "joker";
  rank: number;
  name: string;
};

type DalmutiRole = "greater-dalmuti" | "lesser-dalmuti" | "merchant" | "lesser-peon" | "greater-peon";
type DalmutiPhase = "setup" | "tax" | "play" | "hand-end";
type DalmutiSetupDraw = { rank: number; name: string };
type DalmutiPlay = { playerId: string; rank: number; count: number; cards: DalmutiCard[] };

const DALMUTI_CARD_NAMES: Record<number, string> = {
  1: "달무티",
  2: "총리대신",
  3: "시종장",
  4: "남작부인",
  5: "수녀원장",
  6: "기사",
  7: "재봉사",
  8: "석공",
  9: "요리사",
  10: "양치기",
  11: "광부",
  12: "농노",
  13: "광대",
};

export type RoboCard = {
  id: string;
  kind: RoboCardKind;
  value: number | null;
  label: string;
};

export type Tile = {
  id: string;
  kind: TileKind;
  number: number | null;
  color: TileColor;
  revealed?: boolean;
  revealedAtEnd?: boolean;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
};

type CameraSignal = {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  kind: "offer" | "answer" | "ice";
  payload: string;
  createdAt: string;
};

type Player = {
  id: string;
  name: string;
  secret: string;
  hand: Tile[];
  unplacedJokers: Tile[];
  roboHand: RoboCard[];
  rummikubHand: RummikubTile[];
  rummikubInitialMelded: boolean;
  rummikubScore: number;
  watermelonScore: number;
  watermelonDrops: number;
  watermelonGameOver: boolean;
  dalmutiHand: DalmutiCard[];
  dalmutiFinishPlace: number | null;
  chips: number;
  eliminated: boolean;
  isHost: boolean;
};

export type RoomState = {
  code: string;
  hostId: string;
  kickedNames: string[];
  gameType: GameType;
  status: "waiting" | "drawing" | "placing" | "playing" | "finished";
  createdAt: string;
  waitingSince: string | null;
  aloneSince: string | null;
  players: Player[];
  deck: Tile[];
  setupPlayerId: string | null;
  setupDrawCount: number;
  setupDrawColors: TileColor[];
  setupCompletedIds: string[];
  turnPlayerId: string | null;
  turnDraw: Tile | null;
  turnDrawn: boolean;
  turnDrawPosition: number | null;
  turnCanEnd: boolean;
  penaltyPlayerId: string | null;
  winnerId: string | null;
  turnNumber: number;
  log: string[];
  chat: ChatMessage[];
  cameraEnabledPlayerIds: string[];
  cameraSignals: CameraSignal[];
  roboDeck: RoboCard[];
  roboDiscard: RoboCard[];
  roboTotal: number;
  roboDirection: "clockwise" | "counterclockwise";
  roboPendingCards: number;
  roboRoundNumber: number;
  roboFirstPlayerId: string | null;
  rummikubPool: RummikubTile[];
  rummikubTable: RummikubMeld[];
  dalmutiDeck: DalmutiCard[];
  dalmutiSetupDraws: Record<string, DalmutiSetupDraw>;
  dalmutiPhase: DalmutiPhase;
  dalmutiHandNumber: number;
  dalmutiLastPlay: DalmutiPlay | null;
  dalmutiLeadRank: number | null;
  dalmutiLeadCount: number;
  dalmutiPassCount: number;
  dalmutiLastPlayerId: string | null;
  dalmutiFinishOrder: string[];
  dalmutiTaxGreaterDone: boolean;
  dalmutiTaxLesserDone: boolean;
  dalmutiRevolution: "revolution" | "greater-revolution" | null;
  dalmutiHasSeating: boolean;
};

type StoredRoom = {
  state: RoomState;
  version: number;
};

type RoomRow = {
  state: string;
  version: number;
  updated_at: string;
};

type RoomListRow = {
  state: string;
  version: number;
  updated_at: string;
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
  run: () => Promise<{ meta?: { changes?: number } }>;
};

type D1Like = {
  prepare: (sql: string) => D1Statement;
};

type LegacyTile = {
  id: string;
  kind?: TileKind;
  number?: number | null;
  color: TileColor;
  revealed?: boolean;
  revealedAtEnd?: boolean;
};

type LegacyPlayer = Omit<Player, "hand" | "unplacedJokers" | "roboHand" | "rummikubHand" | "chips" | "eliminated" | "watermelonScore" | "watermelonDrops" | "watermelonGameOver" | "dalmutiHand" | "dalmutiFinishPlace"> & {
  hand: LegacyTile[];
  unplacedJokers?: LegacyTile[];
  roboHand?: RoboCard[];
  rummikubHand?: RummikubTile[];
  rummikubInitialMelded?: boolean;
  rummikubScore?: number;
  chips?: number;
  eliminated?: boolean;
  watermelonScore?: number;
  watermelonDrops?: number;
  watermelonGameOver?: boolean;
  dalmutiHand?: DalmutiCard[];
  dalmutiFinishPlace?: number | null;
};

type LegacyRoomState = Omit<RoomState, "gameType" | "players" | "deck" | "kickedNames" | "setupPlayerId" | "setupDrawCount" | "setupDrawColors" | "setupCompletedIds" | "turnDraw" | "turnDrawn" | "turnDrawPosition" | "turnCanEnd" | "penaltyPlayerId" | "chat" | "cameraEnabledPlayerIds" | "cameraSignals" | "roboDeck" | "roboDiscard" | "roboTotal" | "roboDirection" | "roboPendingCards" | "roboRoundNumber" | "roboFirstPlayerId" | "rummikubPool" | "rummikubTable" | "dalmutiDeck" | "dalmutiSetupDraws" | "dalmutiPhase" | "dalmutiHandNumber" | "dalmutiLastPlay" | "dalmutiLeadRank" | "dalmutiLeadCount" | "dalmutiPassCount" | "dalmutiLastPlayerId" | "dalmutiFinishOrder" | "dalmutiTaxGreaterDone" | "dalmutiTaxLesserDone" | "dalmutiRevolution" | "dalmutiHasSeating"> & {
  gameType?: GameType;
  players: LegacyPlayer[];
  deck: LegacyTile[];
  kickedNames?: string[];
  setupPlayerId?: string | null;
  setupDrawCount?: number;
  setupDrawColors?: TileColor[];
  setupCompletedIds?: string[];
  turnDraw: LegacyTile | null;
  turnDrawn?: boolean;
  turnDrawPosition?: number | null;
  turnCanEnd?: boolean;
  penaltyPlayerId?: string | null;
  chat?: ChatMessage[];
  cameraEnabledPlayerIds?: string[];
  cameraSignals?: CameraSignal[];
  roboDeck?: RoboCard[];
  roboDiscard?: RoboCard[];
  roboTotal?: number;
  roboDirection?: "clockwise" | "counterclockwise";
  roboPendingCards?: number;
  roboRoundNumber?: number;
  roboFirstPlayerId?: string | null;
  rummikubPool?: RummikubTile[];
  rummikubTable?: RummikubMeld[];
  dalmutiDeck?: DalmutiCard[];
  dalmutiSetupDraws?: Record<string, DalmutiSetupDraw>;
  dalmutiPhase?: DalmutiPhase;
  dalmutiHandNumber?: number;
  dalmutiLastPlay?: DalmutiPlay | null;
  dalmutiLeadRank?: number | null;
  dalmutiLeadCount?: number;
  dalmutiPassCount?: number;
  dalmutiLastPlayerId?: string | null;
  dalmutiFinishOrder?: string[];
  dalmutiTaxGreaterDone?: boolean;
  dalmutiTaxLesserDone?: boolean;
  dalmutiRevolution?: "revolution" | "greater-revolution" | null;
  dalmutiHasSeating?: boolean;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const APP_VERSION = "tablehouse-dalmuti-v1";
const SINGLE_PLAYER_ROOM_TTL_MS = 10 * 60 * 1000;
const WAITING_ROOM_TTL_MS = 60 * 60 * 1000;
const ROOM_EXPIRED_MESSAGE = "방이 대기 시간 초과로 자동 종료되었습니다.";
const schemaSql = `CREATE TABLE IF NOT EXISTS game_rooms (
  code TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
)`;

let schemaReady: Promise<void> | null = null;

async function database() {
  const runtime = (await import("cloudflare:workers")) as unknown as {
    env?: { DB?: D1Like };
  };
  const db = runtime.env?.DB;
  if (!db) {
    throw new Error(
      "게임 저장소가 아직 연결되지 않았습니다. Sites의 DB 바인딩을 확인해주세요.",
    );
  }
  return db;
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = database()
      .then((db) => db.prepare(schemaSql).run())
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  await schemaReady;
}

function token() {
  return crypto.randomUUID().replaceAll("-", "");
}

function makeCode() {
  return Array.from({ length: 5 }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

function makeTile(number: number, color: TileColor): Tile {
  return { id: `${color}-${number}-${token().slice(0, 8)}`, kind: "number", number, color };
}

function makeJoker(color: TileColor): Tile {
  return { id: `${color}-joker-${token().slice(0, 8)}`, kind: "joker", number: null, color };
}

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function buildDeck() {
  const tiles: Tile[] = [];
  for (let number = 0; number <= 11; number += 1) {
    tiles.push(makeTile(number, "black"), makeTile(number, "white"));
  }
  tiles.push(makeJoker("black"), makeJoker("white"));
  return shuffle(tiles);
}

const rummikubColors: RummikubColor[] = ["red", "blue", "black", "yellow"];

function makeRummikubTile(number: number, color: RummikubColor, copy: number): RummikubTile {
  return { id: `rummikub-${color}-${number}-${copy}-${token().slice(0, 8)}`, kind: "number", number, color };
}

function makeRummikubJoker(copy: number): RummikubTile {
  return { id: `rummikub-joker-${copy}-${token().slice(0, 8)}`, kind: "joker", number: null, color: "red" };
}

function buildRummikubPool() {
  const tiles: RummikubTile[] = [];
  rummikubColors.forEach((color) => {
    for (let copy = 0; copy < 2; copy += 1) {
      for (let number = 1; number <= 13; number += 1) tiles.push(makeRummikubTile(number, color, copy));
    }
  });
  tiles.push(makeRummikubJoker(0), makeRummikubJoker(1));
  return shuffle(tiles);
}

function normalizeRummikubTile(tile: RummikubTile): RummikubTile {
  const color = rummikubColors.includes(tile.color) ? tile.color : "red";
  if (tile.kind === "joker") {
    const jokerValue = Number.isInteger(tile.jokerValue) && tile.jokerValue >= 1 && tile.jokerValue <= 13 ? tile.jokerValue : null;
    const jokerColor = tile.jokerColor && rummikubColors.includes(tile.jokerColor) ? tile.jokerColor : null;
    return { id: tile.id, kind: "joker", number: null, color, jokerValue, jokerColor };
  }
  const number = Number.isInteger(tile.number) && tile.number >= 1 && tile.number <= 13 ? tile.number : 1;
  return { id: tile.id, kind: "number", number, color };
}

function normalizeRummikubMeld(meld: RummikubMeld): RummikubMeld {
  return { id: meld.id || `meld-${token().slice(0, 8)}`, tiles: (meld.tiles ?? []).map(normalizeRummikubTile) };
}

function makeDalmutiCard(rank: number, copy: number): DalmutiCard {
  return {
    id: `dalmuti-${rank}-${copy}-${token().slice(0, 8)}`,
    kind: rank === 13 ? "joker" : "number",
    rank,
    name: DALMUTI_CARD_NAMES[rank] ?? "광대",
  };
}

function buildDalmutiDeck() {
  const cards: DalmutiCard[] = [];
  for (let rank = 1; rank <= 12; rank += 1) {
    for (let copy = 0; copy < rank; copy += 1) cards.push(makeDalmutiCard(rank, copy));
  }
  cards.push(makeDalmutiCard(13, 0), makeDalmutiCard(13, 1));
  return shuffle(cards);
}

function normalizeDalmutiCard(card: DalmutiCard): DalmutiCard {
  const rank = Number.isInteger(card.rank) && card.rank >= 1 && card.rank <= 13 ? card.rank : 13;
  return {
    id: card.id || `dalmuti-${rank}-${token().slice(0, 8)}`,
    kind: rank === 13 ? "joker" : "number",
    rank,
    name: DALMUTI_CARD_NAMES[rank] ?? "광대",
  };
}

function sortDalmutiHand(hand: DalmutiCard[]) {
  hand.sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));
}

function dalmutiRoleAt(index: number, count: number): DalmutiRole {
  if (index === 0) return "greater-dalmuti";
  if (index === 1) return "lesser-dalmuti";
  if (index === count - 2) return "lesser-peon";
  if (index === count - 1) return "greater-peon";
  return "merchant";
}

function dalmutiRoleLabel(role: DalmutiRole) {
  return role === "greater-dalmuti"
    ? "위대한 달무티"
    : role === "lesser-dalmuti"
      ? "총리대신"
      : role === "greater-peon"
        ? "농노"
        : role === "lesser-peon"
          ? "광부"
          : "상인";
}

function dalmutiPlayerByRole(state: RoomState, role: DalmutiRole) {
  return state.players.find((_, index) => dalmutiRoleAt(index, state.players.length) === role) ?? null;
}

function dalmutiActivePlayers(state: RoomState) {
  return state.players.filter((player) => player.dalmutiFinishPlace === null);
}

function nextDalmutiPlayer(state: RoomState, currentId: string) {
  const currentIndex = state.players.findIndex((player) => player.id === currentId);
  if (currentIndex < 0) return null;
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(currentIndex + offset) % state.players.length];
    if (player && player.dalmutiFinishPlace === null) return player;
  }
  return null;
}

function dalmutiCardSetRank(cards: DalmutiCard[]) {
  if (!cards.length) return null;
  const numbered = cards.filter((card) => card.kind !== "joker");
  if (!numbered.length) return 13;
  const rank = numbered[0]?.rank ?? null;
  return numbered.every((card) => card.rank === rank) ? rank : null;
}

function takeDalmutiCards(player: Player, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  const selected = uniqueIds.map((id) => player.dalmutiHand.find((card) => card.id === id));
  if (selected.some((card) => !card)) throw new Error("내 손패에 있는 카드만 선택해주세요.");
  player.dalmutiHand = player.dalmutiHand.filter((card) => !uniqueIds.includes(card.id));
  return selected as DalmutiCard[];
}

function lowestDalmutiCards(player: Player, count: number) {
  return [...player.dalmutiHand].sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id)).slice(0, count);
}

function dalmutiFinishHand(state: RoomState) {
  const active = dalmutiActivePlayers(state);
  if (active.length > 1) return false;
  if (active.length === 1) {
    const last = active[0];
    last.dalmutiFinishPlace = state.players.length;
    state.dalmutiFinishOrder = [...state.dalmutiFinishOrder, last.id];
  }
  state.status = "finished";
  state.dalmutiPhase = "hand-end";
  state.winnerId = state.dalmutiFinishOrder[0] ?? null;
  state.turnPlayerId = null;
  state.dalmutiLastPlay = null;
  state.dalmutiLeadRank = null;
  state.dalmutiLeadCount = 0;
  state.dalmutiPassCount = 0;
  const winner = playerById(state, state.winnerId ?? "");
  addLog(state, `${winner?.name ?? "첫 번째 플레이어"}님이 달무티가 되었습니다. 탈락 순서대로 다음 판의 자리가 정해집니다.`);
  return true;
}

function beginDalmutiPlay(state: RoomState) {
  clearWaitingTimer(state);
  state.status = "playing";
  state.dalmutiPhase = "play";
  state.turnPlayerId = state.players[0]?.id ?? null;
  state.turnNumber = 1;
  state.dalmutiLastPlay = null;
  state.dalmutiLeadRank = null;
  state.dalmutiLeadCount = 0;
  state.dalmutiPassCount = 0;
  state.dalmutiLastPlayerId = null;
  const first = state.players[0];
  addLog(state, `${first?.name ?? "위대한 달무티"}님(${dalmutiRoleLabel("greater-dalmuti")})부터 카드를 냅니다.`);
}

function performDalmutiTax(state: RoomState, actor: Player, kind: "greater" | "lesser", ids: string[]) {
  if (state.status !== "playing" || state.dalmutiPhase !== "tax") throw new Error("지금은 세금 교환 단계가 아닙니다.");
  const actorRole = dalmutiRoleAt(state.players.findIndex((player) => player.id === actor.id), state.players.length);
  const expectedRole: DalmutiRole = kind === "greater" ? "greater-dalmuti" : "lesser-dalmuti";
  if (actorRole !== expectedRole) throw new Error("현재 세금을 받을 계급이 아닙니다.");
  if (kind === "greater" && state.dalmutiTaxGreaterDone) throw new Error("대농노 세금은 이미 교환했습니다.");
  if (kind === "lesser" && state.dalmutiTaxLesserDone) throw new Error("소농노 세금은 이미 교환했습니다.");
  const count = kind === "greater" ? 2 : 1;
  if (!Array.isArray(ids) || ids.length !== count || new Set(ids).size !== count) throw new Error(`${count}장의 서로 다른 카드를 선택해주세요.`);
  const peon = dalmutiPlayerByRole(state, kind === "greater" ? "greater-peon" : "lesser-peon");
  if (!peon) throw new Error("세금을 낼 농노를 찾을 수 없습니다.");
  const incoming = lowestDalmutiCards(peon, count);
  const outgoing = takeDalmutiCards(actor, ids);
  peon.dalmutiHand = peon.dalmutiHand.filter((card) => !incoming.some((item) => item.id === card.id));
  actor.dalmutiHand.push(...incoming);
  peon.dalmutiHand.push(...outgoing);
  sortDalmutiHand(actor.dalmutiHand);
  sortDalmutiHand(peon.dalmutiHand);
  if (kind === "greater") state.dalmutiTaxGreaterDone = true;
  else state.dalmutiTaxLesserDone = true;
  addLog(state, `${actor.name}님과 ${peon.name}님이 ${count}장의 세금 카드를 교환했습니다.`);
  if (state.dalmutiTaxGreaterDone && state.dalmutiTaxLesserDone) beginDalmutiPlay(state);
}

function startDalmutiHand(state: RoomState) {
  if (state.players.length < 4) throw new Error("달무티는 최소 4명이 필요합니다.");
  clearWaitingTimer(state);
  state.status = "playing";
  state.dalmutiPhase = "tax";
  state.dalmutiHandNumber += 1;
  state.dalmutiDeck = buildDalmutiDeck();
  state.dalmutiSetupDraws = {};
  state.dalmutiLastPlay = null;
  state.dalmutiLeadRank = null;
  state.dalmutiLeadCount = 0;
  state.dalmutiPassCount = 0;
  state.dalmutiLastPlayerId = null;
  state.dalmutiFinishOrder = [];
  state.dalmutiTaxGreaterDone = false;
  state.dalmutiTaxLesserDone = false;
  state.dalmutiRevolution = null;
  state.turnPlayerId = null;
  state.turnNumber = 0;
  state.winnerId = null;
  state.players.forEach((player) => {
    player.dalmutiHand = [];
    player.dalmutiFinishPlace = null;
  });
  let dealIndex = 0;
  while (state.dalmutiDeck.length) {
    const card = state.dalmutiDeck.pop();
    const player = state.players[dealIndex % state.players.length];
    if (!card || !player) break;
    player.dalmutiHand.push(card);
    dealIndex += 1;
  }
  state.players.forEach((player) => sortDalmutiHand(player.dalmutiHand));
  addLog(state, `제${state.dalmutiHandNumber}판 카드가 모두 배분되었습니다. 계급 세금을 교환하세요.`);
}

function startDalmutiGame(state: RoomState) {
  clearWaitingTimer(state);
  state.status = "drawing";
  state.dalmutiPhase = "setup";
  state.dalmutiSetupDraws = {};
  state.dalmutiHasSeating = false;
  state.dalmutiHandNumber = 0;
  state.dalmutiFinishOrder = [];
  state.turnPlayerId = null;
  addLog(state, "모두 한 장씩 뽑아 첫 판의 계급과 자리를 정합니다.");
}

function startDalmutiNextHand(state: RoomState) {
  const order = state.dalmutiFinishOrder
    .map((id) => state.players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
  if (order.length === state.players.length) state.players = order;
  startDalmutiHand(state);
}

function resetDalmutiRoom(state: RoomState) {
  markWaiting(state);
  state.dalmutiPhase = "setup";
  state.dalmutiDeck = buildDalmutiDeck();
  state.dalmutiSetupDraws = {};
  state.dalmutiLastPlay = null;
  state.dalmutiLeadRank = null;
  state.dalmutiLeadCount = 0;
  state.dalmutiPassCount = 0;
  state.dalmutiLastPlayerId = null;
  state.dalmutiFinishOrder = [];
  state.dalmutiTaxGreaterDone = false;
  state.dalmutiTaxLesserDone = false;
  state.dalmutiRevolution = null;
  state.turnPlayerId = null;
  state.turnNumber = 0;
  state.winnerId = null;
  state.players.forEach((player) => {
    player.dalmutiHand = [];
    player.dalmutiFinishPlace = null;
  });
}

function makeRoboNumber(value: number): RoboCard {
  return { id: `robo-${value}-${token().slice(0, 8)}`, kind: "number", value, label: String(value) };
}

function makeRoboSpecial(kind: Exclude<RoboCardKind, "number">): RoboCard {
  const labels = { minus10: "-10", double: "×2", reverse: "REVERSE" };
  return { id: `robo-${kind}-${token().slice(0, 8)}`, kind, value: null, label: labels[kind] };
}

function buildRoboDeck() {
  const cards: RoboCard[] = [makeRoboNumber(76)];
  [11, 22, 33, 44, 55, 66].forEach((value) => cards.push(makeRoboNumber(value)));
  for (let value = 2; value <= 9; value += 1) {
    for (let copy = 0; copy < 3; copy += 1) cards.push(makeRoboNumber(value));
  }
  for (let copy = 0; copy < 8; copy += 1) cards.push(makeRoboNumber(10));
  for (let copy = 0; copy < 4; copy += 1) {
    cards.push(makeRoboSpecial("minus10"));
    cards.push(makeRoboSpecial("double"));
    cards.push(makeRoboSpecial("reverse"));
    cards.push({ ...makeRoboNumber(0), id: `robo-zero-${token().slice(0, 8)}` });
  }
  return shuffle(cards);
}

function normalizeTile(tile: LegacyTile): Tile {
  const kind = tile.kind === "joker" ? "joker" : "number";
  return { ...tile, kind, number: kind === "joker" ? null : tile.number ?? null };
}

function normalizeRoboCard(card: RoboCard): RoboCard {
  const kind: RoboCardKind = card.kind === "minus10" || card.kind === "double" || card.kind === "reverse"
    ? card.kind
    : "number";
  const value = kind === "number" ? (Number.isInteger(card.value) ? card.value : 0) : null;
  const label = kind === "number" ? String(value) : kind === "minus10" ? "-10" : kind === "double" ? "×2" : "REVERSE";
  return { id: card.id, kind, value, label };
}

function normalizeRoomState(state: RoomState, fallbackTimestamp = new Date().toISOString()): RoomState {
  const legacy = state as unknown as LegacyRoomState;
  const persistedGameType = (legacy as { gameType?: unknown }).gameType;
  const unsupportedGame = persistedGameType !== "davinci" && persistedGameType !== "robo77" && persistedGameType !== "rummikub" && persistedGameType !== "watermelon" && persistedGameType !== "dalmuti";
  const fallback = Number.isFinite(Date.parse(fallbackTimestamp)) ? fallbackTimestamp : new Date().toISOString();
  const rawRoom = legacy as unknown as { createdAt?: unknown; waitingSince?: unknown; aloneSince?: unknown };
  legacy.createdAt = typeof rawRoom.createdAt === "string" && Number.isFinite(Date.parse(rawRoom.createdAt))
    ? rawRoom.createdAt
    : fallback;
  legacy.waitingSince = typeof rawRoom.waitingSince === "string" && Number.isFinite(Date.parse(rawRoom.waitingSince))
    ? rawRoom.waitingSince
    : legacy.status === "waiting" ? fallback : null;
  legacy.aloneSince = typeof rawRoom.aloneSince === "string" && Number.isFinite(Date.parse(rawRoom.aloneSince))
    ? rawRoom.aloneSince
    : legacy.status === "waiting" && legacy.players.length === 1 ? legacy.waitingSince : null;
  legacy.gameType = persistedGameType === "robo77" ? "robo77" : persistedGameType === "rummikub" ? "rummikub" : persistedGameType === "watermelon" ? "watermelon" : persistedGameType === "dalmuti" ? "dalmuti" : "davinci";
  legacy.deck = legacy.deck.map(normalizeTile);
  legacy.players.forEach((player) => {
    player.hand = player.hand.map(normalizeTile);
    player.unplacedJokers = (player.unplacedJokers ?? []).map(normalizeTile);
    player.roboHand = (player.roboHand ?? []).map(normalizeRoboCard);
    player.rummikubHand = (player.rummikubHand ?? []).map(normalizeRummikubTile);
    player.rummikubInitialMelded = player.rummikubInitialMelded ?? false;
    player.rummikubScore = Number.isFinite(player.rummikubScore) ? player.rummikubScore : 0;
    player.watermelonScore = Number.isFinite(player.watermelonScore) ? Math.max(0, Math.floor(player.watermelonScore)) : 0;
    player.watermelonDrops = Number.isFinite(player.watermelonDrops) ? Math.max(0, Math.floor(player.watermelonDrops)) : 0;
    player.watermelonGameOver = player.watermelonGameOver ?? false;
    player.dalmutiHand = (player.dalmutiHand ?? []).map(normalizeDalmutiCard);
    player.dalmutiFinishPlace = Number.isInteger(player.dalmutiFinishPlace) ? Math.max(1, player.dalmutiFinishPlace!) : null;
    player.chips = Number.isInteger(player.chips) ? player.chips : 3;
    player.eliminated = player.eliminated ?? false;
  });
  legacy.turnDraw = legacy.turnDraw ? normalizeTile(legacy.turnDraw) : null;
  legacy.kickedNames = legacy.kickedNames ?? [];
  legacy.turnDrawn = legacy.turnDrawn ?? Boolean(legacy.turnDraw);
  legacy.turnDrawPosition = legacy.turnDrawPosition ?? null;
  legacy.turnCanEnd = legacy.turnCanEnd ?? false;
  legacy.penaltyPlayerId = legacy.penaltyPlayerId ?? null;
  legacy.setupPlayerId = legacy.setupPlayerId ?? null;
  legacy.setupDrawCount = legacy.setupDrawCount ?? 0;
  if (!legacy.setupDrawColors) {
    const setupPlayer = legacy.players.find((player) => player.id === legacy.setupPlayerId);
    legacy.setupDrawColors = [
      ...(setupPlayer?.hand ?? []),
      ...(setupPlayer?.unplacedJokers ?? []),
    ].map((tile) => tile.color).slice(0, legacy.setupDrawCount);
  }
  legacy.setupCompletedIds = legacy.setupCompletedIds ?? [];
  legacy.chat = (legacy.chat ?? []).slice(-80);
  const currentPlayerIds = new Set(legacy.players.map((player) => player.id));
  legacy.cameraEnabledPlayerIds = (legacy.cameraEnabledPlayerIds ?? []).filter((id) => currentPlayerIds.has(id));
  legacy.cameraSignals = (legacy.cameraSignals ?? []).filter((signal) =>
    currentPlayerIds.has(signal.fromPlayerId) && currentPlayerIds.has(signal.toPlayerId)
  ).slice(-240);
  legacy.roboDeck = (legacy.roboDeck ?? []).map(normalizeRoboCard);
  legacy.roboDiscard = (legacy.roboDiscard ?? []).map(normalizeRoboCard);
  legacy.roboTotal = Number.isFinite(legacy.roboTotal) ? legacy.roboTotal : 0;
  legacy.roboDirection = legacy.roboDirection === "counterclockwise" ? "counterclockwise" : "clockwise";
  legacy.roboPendingCards = Number.isInteger(legacy.roboPendingCards) ? legacy.roboPendingCards : 0;
  legacy.roboRoundNumber = Number.isInteger(legacy.roboRoundNumber) ? legacy.roboRoundNumber : 0;
  legacy.roboFirstPlayerId = legacy.roboFirstPlayerId ?? null;
  legacy.rummikubPool = (legacy.rummikubPool ?? []).map(normalizeRummikubTile);
  legacy.rummikubTable = (legacy.rummikubTable ?? []).map(normalizeRummikubMeld);
  legacy.dalmutiDeck = (legacy.dalmutiDeck ?? []).map(normalizeDalmutiCard);
  legacy.dalmutiSetupDraws = legacy.dalmutiSetupDraws ?? {};
  legacy.dalmutiPhase = legacy.dalmutiPhase === "tax" || legacy.dalmutiPhase === "play" || legacy.dalmutiPhase === "hand-end" || legacy.dalmutiPhase === "setup" ? legacy.dalmutiPhase : "setup";
  legacy.dalmutiHandNumber = typeof legacy.dalmutiHandNumber === "number" && Number.isInteger(legacy.dalmutiHandNumber) ? Math.max(0, legacy.dalmutiHandNumber) : 0;
  legacy.dalmutiLastPlay = legacy.dalmutiLastPlay ? { ...legacy.dalmutiLastPlay, cards: (Array.isArray(legacy.dalmutiLastPlay.cards) ? legacy.dalmutiLastPlay.cards : []).map(normalizeDalmutiCard) } : null;
  legacy.dalmutiLeadRank = typeof legacy.dalmutiLeadRank === "number" && Number.isInteger(legacy.dalmutiLeadRank) && legacy.dalmutiLeadRank >= 1 && legacy.dalmutiLeadRank <= 13 ? legacy.dalmutiLeadRank : null;
  legacy.dalmutiLeadCount = typeof legacy.dalmutiLeadCount === "number" && Number.isInteger(legacy.dalmutiLeadCount) ? Math.max(0, legacy.dalmutiLeadCount) : 0;
  legacy.dalmutiPassCount = typeof legacy.dalmutiPassCount === "number" && Number.isInteger(legacy.dalmutiPassCount) ? Math.max(0, legacy.dalmutiPassCount) : 0;
  legacy.dalmutiLastPlayerId = legacy.dalmutiLastPlayerId ?? null;
  legacy.dalmutiFinishOrder = Array.isArray(legacy.dalmutiFinishOrder) ? legacy.dalmutiFinishOrder.filter((id) => currentPlayerIds.has(id)) : [];
  legacy.dalmutiTaxGreaterDone = legacy.dalmutiTaxGreaterDone ?? false;
  legacy.dalmutiTaxLesserDone = legacy.dalmutiTaxLesserDone ?? false;
  legacy.dalmutiRevolution = legacy.dalmutiRevolution === "greater-revolution" ? "greater-revolution" : legacy.dalmutiRevolution === "revolution" ? "revolution" : null;
  legacy.dalmutiHasSeating = legacy.dalmutiHasSeating ?? false;
  if (unsupportedGame) {
    legacy.status = "waiting";
    legacy.deck = buildDeck();
    legacy.players.forEach((player) => {
      player.hand = [];
      player.unplacedJokers = [];
      player.rummikubHand = [];
      player.rummikubInitialMelded = false;
      player.rummikubScore = 0;
      player.dalmutiHand = [];
      player.dalmutiFinishPlace = null;
    });
    legacy.setupPlayerId = null;
    legacy.setupDrawCount = 0;
    legacy.setupDrawColors = [];
    legacy.setupCompletedIds = [];
    legacy.turnPlayerId = null;
    legacy.turnDraw = null;
    legacy.turnDrawn = false;
    legacy.turnDrawPosition = null;
    legacy.turnCanEnd = false;
    legacy.penaltyPlayerId = null;
    legacy.winnerId = null;
    legacy.turnNumber = 0;
    legacy.rummikubPool = buildRummikubPool();
    legacy.rummikubTable = [];
    legacy.dalmutiDeck = buildDalmutiDeck();
    legacy.dalmutiSetupDraws = {};
    legacy.dalmutiPhase = "setup";
    legacy.dalmutiHandNumber = 0;
    legacy.dalmutiLastPlay = null;
    legacy.dalmutiLeadRank = null;
    legacy.dalmutiLeadCount = 0;
    legacy.dalmutiPassCount = 0;
    legacy.dalmutiLastPlayerId = null;
    legacy.dalmutiFinishOrder = [];
    legacy.dalmutiTaxGreaterDone = false;
    legacy.dalmutiTaxLesserDone = false;
    legacy.dalmutiRevolution = null;
    legacy.dalmutiHasSeating = false;
    legacy.log = ["이 방의 게임이 정리되었습니다. 로비에서 새 게임을 선택해 시작하세요."];
  }
  if (legacy.status !== "waiting") {
    legacy.waitingSince = null;
    legacy.aloneSince = null;
  } else {
    legacy.waitingSince = legacy.waitingSince ?? fallback;
    legacy.aloneSince = legacy.players.length === 1 ? legacy.aloneSince ?? legacy.waitingSince : null;
  }
  const normalized = legacy as unknown as RoomState;
  const turnPlayer = normalized.players.find((player) => player.id === normalized.turnPlayerId);
  if (
    turnPlayer &&
    normalized.turnDraw &&
    !turnPlayer.hand.some((tile) => tile.id === normalized.turnDraw?.id) &&
    (normalized.turnDraw.kind === "number" || normalized.turnDrawPosition !== null)
  ) {
    insertTile(turnPlayer.hand, normalized.turnDraw, normalized.turnDrawPosition);
  }
  return normalized;
}

function insertNumberTile(hand: Tile[], tile: Tile) {
  const index = hand.findIndex(
    (current) =>
      current.kind === "number" &&
      (current.number! > tile.number! ||
        (current.number === tile.number && current.color === "white" && tile.color === "black")),
  );
  if (index === -1) hand.push(tile);
  else hand.splice(index, 0, tile);
}

function insertTile(hand: Tile[], tile: Tile, position: number | null) {
  if (tile.kind === "joker") {
    const safePosition = Math.max(0, Math.min(position ?? hand.length, hand.length));
    hand.splice(safePosition, 0, tile);
  } else {
    insertNumberTile(hand, tile);
  }
}

function autoPlaceInitialJokers(state: RoomState) {
  state.players.forEach((player) => {
    while (player.unplacedJokers.length > 0) {
      const joker = player.unplacedJokers.shift();
      if (!joker) break;
      const position = Math.floor(Math.random() * (player.hand.length + 1));
      player.hand.splice(position, 0, joker);
    }
  });
}

function prepareInitialDraw(state: RoomState) {
  clearWaitingTimer(state);
  state.deck = buildDeck();
  state.players.forEach((player) => {
    player.hand = [];
    player.unplacedJokers = [];
  });
  state.status = "drawing";
  state.setupCompletedIds = [];
  state.setupDrawCount = 0;
  state.setupDrawColors = [];
  state.setupPlayerId = state.players[Math.floor(Math.random() * state.players.length)]?.id ?? null;
  state.turnPlayerId = null;
  state.turnDraw = null;
  state.turnDrawn = false;
  state.turnDrawPosition = null;
  state.turnCanEnd = false;
  state.penaltyPlayerId = null;
  state.winnerId = null;
  state.turnNumber = 0;
  const firstPlayer = playerById(state, state.setupPlayerId ?? "");
  addLog(state, `${firstPlayer?.name ?? "첫 번째 플레이어"}님부터 시작 패를 고릅니다.`);
}

function finishInitialSetupPlayer(state: RoomState, player: Player) {
  // Number tiles are inserted in order as they are drawn. Sorting here would
  // treat a placed joker's null number like zero and pull it back to the front.
  if (player.unplacedJokers.length > 0) {
    state.status = "placing";
    state.setupPlayerId = player.id;
    return;
  }

  const completed = new Set(state.setupCompletedIds);
  completed.add(player.id);
  state.setupCompletedIds = Array.from(completed);
  const nextPlayer = state.players.find((candidate) => !completed.has(candidate.id));
  if (!nextPlayer) {
    beginPlaying(state);
    addLog(state, `${player.name}님이 카드를 모두 뽑았습니다.`);
    return;
  }
  addLog(state, `${player.name}님이 카드를 모두 뽑았습니다.`);
  state.status = "drawing";
  state.setupPlayerId = nextPlayer.id;
  state.setupDrawCount = 0;
  state.setupDrawColors = [];
}

function resetRoundState(state: RoomState) {
  markWaiting(state);
  state.deck = buildDeck();
  state.players.forEach((player) => {
    player.hand = [];
    player.unplacedJokers = [];
  });
  state.setupPlayerId = null;
  state.setupDrawCount = 0;
  state.setupDrawColors = [];
  state.setupCompletedIds = [];
  state.turnPlayerId = null;
  state.turnDraw = null;
  state.turnDrawn = false;
  state.turnDrawPosition = null;
  state.turnCanEnd = false;
  state.penaltyPlayerId = null;
  state.winnerId = null;
  state.turnNumber = 0;
}

function addLog(state: RoomState, message: string) {
  state.log = [message, ...state.log].slice(0, 12);
}

function addChat(state: RoomState, actor: Player, rawMessage: unknown) {
  const message = typeof rawMessage === "string" ? rawMessage.trim().slice(0, 240) : "";
  if (!message) throw new Error("메시지를 입력해주세요.");
  state.chat = [
    ...state.chat,
    {
      id: token().slice(0, 16),
      playerId: actor.id,
      playerName: actor.name,
      message,
      createdAt: new Date().toISOString(),
    },
  ].slice(-80);
}

function markWaiting(state: RoomState, timestamp = new Date().toISOString()) {
  state.status = "waiting";
  state.waitingSince = timestamp;
  state.aloneSince = state.players.length === 1 ? timestamp : null;
}

function clearWaitingTimer(state: RoomState) {
  state.waitingSince = null;
  state.aloneSince = null;
}

function roomIsExpired(state: RoomState, now = Date.now()) {
  if (state.status !== "waiting" || state.players.length === 0) return false;
  const waitingStartedAt = Date.parse(state.waitingSince ?? state.createdAt);
  if (!Number.isFinite(waitingStartedAt)) return false;
  if (state.players.length === 1) {
    const aloneStartedAt = Date.parse(state.aloneSince ?? state.waitingSince ?? state.createdAt);
    return Number.isFinite(aloneStartedAt) && now - aloneStartedAt >= SINGLE_PLAYER_ROOM_TTL_MS;
  }
  return now - waitingStartedAt >= WAITING_ROOM_TTL_MS;
}

function tileLabel(tile: Tile) {
  return `${tile.color === "black" ? "검정" : "흰색"} ${tile.kind === "joker" ? "조커" : tile.number}`;
}

function playerBySecret(state: RoomState, secret: string) {
  return state.players.find((player) => player.secret === secret) ?? null;
}

function playerById(state: RoomState, id: string) {
  return state.players.find((player) => player.id === id) ?? null;
}

async function roomExists(code: string) {
  const db = await database();
  const row = await db
    .prepare("SELECT code FROM game_rooms WHERE code = ?1")
    .bind(code)
    .first<{ code: string }>();
  return Boolean(row);
}

async function deleteRoomIfCurrentVersion(code: string, version: number) {
  const db = await database();
  const result = await db
    .prepare("DELETE FROM game_rooms WHERE code = ?1 AND version = ?2")
    .bind(code, version)
    .run();
  return result.meta?.changes === 1;
}

async function readRoom(code: string): Promise<StoredRoom> {
  await ensureSchema();
  const db = await database();
  const row = await db
    .prepare("SELECT state, version, updated_at FROM game_rooms WHERE code = ?1")
    .bind(code)
    .first<RoomRow>();
  if (!row) throw new Error("방을 찾을 수 없습니다.");
  const state = normalizeRoomState(JSON.parse(row.state) as RoomState, row.updated_at);
  if (roomIsExpired(state)) {
    if (await deleteRoomIfCurrentVersion(state.code, row.version)) throw new Error(ROOM_EXPIRED_MESSAGE);
    return readRoom(code);
  }
  if (state.status === "placing" && !state.setupPlayerId) {
    autoPlaceInitialJokers(state);
    beginPlaying(state);
    return writeRoom({ state, version: row.version });
  }
  return { state, version: row.version };
}

class RoomConflictError extends Error {}

async function retryRoomConflict<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof RoomConflictError) || attempt >= 3) throw error;
    }
  }
}

async function writeRoom(room: StoredRoom) {
  const db = await database();
  const nextVersion = room.version + 1;
  const result = await db
    .prepare(
      "UPDATE game_rooms SET state = ?1, version = ?2, updated_at = ?3 WHERE code = ?4 AND version = ?5",
    )
    .bind(
      JSON.stringify(room.state),
      nextVersion,
      new Date().toISOString(),
      room.state.code,
      room.version,
    )
    .run();
  if (result.meta?.changes !== 1) {
    throw new RoomConflictError("동시 요청이 많습니다. 잠시 후 다시 시도해주세요.");
  }
  return { ...room, version: nextVersion };
}

function publicState(state: RoomState, secret: string) {
  const viewer = playerBySecret(state, secret);
  const isRobo = state.gameType === "robo77";
  const isRummikub = state.gameType === "rummikub";
  const isDalmuti = state.gameType === "dalmuti";
  if (!viewer) throw new Error("플레이어 인증이 만료되었습니다.");
  const isViewingAnotherPlayersSetup = !isDalmuti &&
    (state.status === "drawing" || state.status === "placing") &&
    state.setupPlayerId !== viewer.id;
  const publicStatus = state.status === "placing" && isViewingAnotherPlayersSetup
    ? "drawing"
    : state.status;

  return {
    appVersion: APP_VERSION,
    code: state.code,
    gameType: state.gameType,
    status: publicStatus,
    setupPlayerId: state.setupPlayerId,
    setupDrawCount: isViewingAnotherPlayersSetup ? 0 : state.setupDrawCount,
    setupDrawColors: isViewingAnotherPlayersSetup ? [] : state.setupDrawColors,
    initialColorCounts: {
      black: state.deck.filter((tile) => tile.color === "black").length +
        (isViewingAnotherPlayersSetup ? state.setupDrawColors.filter((color) => color === "black").length : 0),
      white: state.deck.filter((tile) => tile.color === "white").length +
        (isViewingAnotherPlayersSetup ? state.setupDrawColors.filter((color) => color === "white").length : 0),
    },
    turnPlayerId: state.turnPlayerId,
    winnerId: state.winnerId,
    turnNumber: state.turnNumber,
    deckCount: isRobo
      ? state.roboDeck.length
      : isRummikub
        ? state.rummikubPool.length
        : isDalmuti
          ? state.dalmutiDeck.length
        : state.deck.length + (isViewingAnotherPlayersSetup ? state.setupDrawCount : 0),
    chat: state.chat,
    camera: {
      enabledPlayerIds: state.cameraEnabledPlayerIds,
      signals: state.cameraSignals.filter((signal) => signal.toPlayerId === viewer.id),
    },
    turnDrawn: state.turnDrawn,
    turnCanEnd: state.turnCanEnd,
    penaltyPending: state.penaltyPlayerId === viewer.id,
    turnDrawPosition:
      state.turnPlayerId === viewer.id ? state.turnDrawPosition : null,
    turnDraw:
      state.turnPlayerId === viewer.id && state.turnDraw
        ? state.turnDraw
        : null,
    pendingJokers: viewer.unplacedJokers ?? [],
    you: { id: viewer.id, name: viewer.name, isHost: viewer.isHost },
    players: state.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      hand: (
        isViewingAnotherPlayersSetup && player.id === state.setupPlayerId
          ? []
          : player.hand
      ).map((tile) => {
        if (state.status === "finished") return { ...tile, revealedAtEnd: !tile.revealed };
        if (player.id === viewer.id || tile.revealed) return tile;
        return { id: tile.id, kind: "hidden", number: null, color: tile.color, revealed: false };
      }),
      roboHand: isRobo && (player.id === viewer.id || state.status === "finished") ? player.roboHand : [],
      roboHandCount: player.roboHand.length,
      rummikubHand: isRummikub && (player.id === viewer.id || state.status === "finished") ? player.rummikubHand : [],
      rummikubHandCount: player.rummikubHand.length,
      rummikubInitialMelded: player.rummikubInitialMelded,
      rummikubScore: player.rummikubScore,
      watermelonScore: player.watermelonScore,
      watermelonDrops: player.watermelonDrops,
      watermelonGameOver: player.watermelonGameOver,
      dalmutiHand: isDalmuti && (player.id === viewer.id || state.status === "finished") ? player.dalmutiHand : [],
      dalmutiHandCount: player.dalmutiHand.length,
      dalmutiRole: isDalmuti ? dalmutiRoleAt(index, state.players.length) : null,
      dalmutiFinishPlace: player.dalmutiFinishPlace,
      chips: player.chips,
      eliminated: player.eliminated,
    })),
    log: state.log,
    robo: isRobo ? {
      total: state.roboTotal,
      direction: state.roboDirection,
      pendingCards: state.roboPendingCards,
      lastCard: state.roboDiscard[state.roboDiscard.length - 1] ?? null,
      discard: state.roboDiscard.slice(-8),
      deckCount: state.roboDeck.length,
      roundNumber: state.roboRoundNumber,
      firstPlayerId: state.roboFirstPlayerId,
    } : null,
    rummikub: isRummikub ? {
      table: state.rummikubTable,
      poolCount: state.rummikubPool.length,
    } : null,
    dalmuti: isDalmuti ? {
      phase: state.dalmutiPhase,
      handNumber: state.dalmutiHandNumber,
      setupDraws: Object.entries(state.dalmutiSetupDraws).map(([playerId, draw]) => ({ playerId, ...draw })),
      lastPlay: state.dalmutiLastPlay,
      leadRank: state.dalmutiLeadRank,
      leadCount: state.dalmutiLeadCount,
      passCount: state.dalmutiPassCount,
      finishOrder: state.dalmutiFinishOrder,
      revolution: state.dalmutiRevolution,
      tax: {
        greaterDone: state.dalmutiTaxGreaterDone,
        lesserDone: state.dalmutiTaxLesserDone,
        greaterDalmutiId: state.players[0]?.id ?? null,
        lesserDalmutiId: state.players[1]?.id ?? null,
        greaterPeonId: state.players[state.players.length - 1]?.id ?? null,
        lesserPeonId: state.players[state.players.length - 2]?.id ?? null,
        revolutionEligible: viewer.dalmutiHand.filter((card) => card.kind === "joker").length >= 2,
      },
    } : null,
  };
}

function requirePlayer(state: RoomState, secret: string) {
  const player = playerBySecret(state, secret);
  if (!player) throw new Error("플레이어 인증이 만료되었습니다.");
  return player;
}

function isActivePlayer(player: Player) {
  return player.hand.some((tile) => !tile.revealed);
}

function nextPlayer(state: RoomState, currentId: string) {
  const currentIndex = state.players.findIndex((player) => player.id === currentId);
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const candidate = state.players[(currentIndex + offset) % state.players.length];
    if (isActivePlayer(candidate)) return candidate;
  }
  return null;
}

function nextPlayerBySeat(state: RoomState, currentId: string) {
  const currentIndex = state.players.findIndex((player) => player.id === currentId);
  if (currentIndex < 0 || state.players.length === 0) return null;
  return state.players[(currentIndex + 1) % state.players.length] ?? null;
}
function finishIfOnePlayerRemains(state: RoomState) {
  const activePlayers = state.players.filter(isActivePlayer);
  if (activePlayers.length !== 1) return false;
  state.status = "finished";
  state.winnerId = activePlayers[0].id;
  state.turnPlayerId = null;
  state.turnDraw = null;
  state.turnDrawn = false;
  state.turnDrawPosition = null;
  state.turnCanEnd = false;
  state.penaltyPlayerId = null;
  addLog(state, `${activePlayers[0].name}님이 최종 승자가 되었습니다.`);
  return true;
}

function roboPlayers(state: RoomState) {
  return state.players.filter((player) => !player.eliminated);
}

function nextRoboPlayer(state: RoomState, currentId: string, direction = state.roboDirection) {
  const currentIndex = state.players.findIndex((player) => player.id === currentId);
  const step = direction === "counterclockwise" ? -1 : 1;
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (currentIndex + step * offset + state.players.length * 2) % state.players.length;
    const candidate = state.players[index];
    if (candidate && !candidate.eliminated) return candidate;
  }
  return null;
}

function drawRoboCard(state: RoomState) {
  if (state.roboDeck.length === 0 && state.roboDiscard.length > 1) {
    const topCard = state.roboDiscard[state.roboDiscard.length - 1];
    state.roboDeck = shuffle(state.roboDiscard.slice(0, -1));
    state.roboDiscard = topCard ? [topCard] : [];
  }
  return state.roboDeck.pop() ?? null;
}

function beginRoboRound(state: RoomState, firstPlayerId: string) {
  clearWaitingTimer(state);
  const activePlayers = roboPlayers(state);
  state.roboDeck = buildRoboDeck();
  state.roboDiscard = [];
  state.roboTotal = 0;
  state.roboDirection = "clockwise";
  state.roboPendingCards = 0;
  state.roboRoundNumber += 1;
  state.roboFirstPlayerId = firstPlayerId;
  state.turnPlayerId = firstPlayerId;
  state.turnNumber = 1;
  activePlayers.forEach((player) => { player.roboHand = []; });
  for (let cardIndex = 0; cardIndex < 5; cardIndex += 1) {
    activePlayers.forEach((player) => {
      const card = drawRoboCard(state);
      if (card) player.roboHand.push(card);
    });
  }
  state.status = "playing";
  state.winnerId = null;
}

function startRoboGame(state: RoomState) {
  clearWaitingTimer(state);
  state.players.forEach((player) => {
    player.roboHand = [];
    player.chips = 3;
    player.eliminated = false;
  });
  const firstPlayer = state.players[Math.floor(Math.random() * state.players.length)];
  if (!firstPlayer) throw new Error("게임을 시작할 플레이어가 없습니다.");
  state.roboRoundNumber = 0;
  state.status = "playing";
  beginRoboRound(state, firstPlayer.id);
  addLog(state, `${firstPlayer.name}님이 무작위로 첫 라운드의 선 플레이어가 되었습니다.`);
}

function resetRoboRoom(state: RoomState) {
  markWaiting(state);
  state.players.forEach((player) => {
    player.roboHand = [];
    player.chips = 3;
    player.eliminated = false;
  });
  state.roboDeck = buildRoboDeck();
  state.roboDiscard = [];
  state.roboTotal = 0;
  state.roboDirection = "clockwise";
  state.roboPendingCards = 0;
  state.roboRoundNumber = 0;
  state.roboFirstPlayerId = null;
  state.turnPlayerId = null;
  state.turnNumber = 0;
  state.winnerId = null;
}

function finishRoboIfOnePlayerRemains(state: RoomState) {
  const activePlayers = roboPlayers(state);
  if (activePlayers.length !== 1) return false;
  state.status = "finished";
  state.winnerId = activePlayers[0].id;
  state.turnPlayerId = null;
  state.roboPendingCards = 0;
  addLog(state, `${activePlayers[0].name}님이 로보77의 최종 승자가 되었습니다.`);
  return true;
}

function applyRoboPenalty(player: Player) {
  if (player.chips > 0) {
    player.chips -= 1;
    return false;
  }
  player.eliminated = true;
  return true;
}

function rummikubTileValue(tile: RummikubTile) {
  return tile.kind === "joker" ? tile.jokerValue ?? null : tile.number;
}

function rummikubTileColor(tile: RummikubTile) {
  return tile.kind === "joker" ? tile.jokerColor ?? null : tile.color;
}

function rummikubRackPenalty(hand: RummikubTile[]) {
  return hand.reduce((sum, tile) => sum + (tile.kind === "joker" ? 30 : tile.number ?? 0), 0);
}

function validateRummikubMeld(meld: RummikubMeld) {
  const tiles = meld.tiles;
  if (tiles.length < 3 || tiles.length > 13) return { valid: false, points: 0 };
  const values = tiles.map(rummikubTileValue);
  if (values.some((value) => value === null)) return { valid: false, points: 0 };
  const nonJokers = tiles.filter((tile) => tile.kind !== "joker");
  const valueSet = new Set(values);
  const isGroup = valueSet.size === 1 && tiles.length <= 4 && new Set(tiles.map(rummikubTileColor)).size === tiles.length;
  if (isGroup) return { valid: true, points: values.reduce((sum, value) => sum + (value ?? 0), 0) };
  const colors = tiles.map(rummikubTileColor);
  if (colors.some((color) => color === null) || new Set(colors).size !== 1) return { valid: false, points: 0 };
  const orderedValues = values as number[];
  for (let index = 1; index < orderedValues.length; index += 1) {
    if (orderedValues[index] !== orderedValues[index - 1] + 1) return { valid: false, points: 0 };
  }
  if (nonJokers.some((tile, index) => index > 0 && tile.kind === "number" && tile.number === nonJokers[index - 1]?.number)) {
    return { valid: false, points: 0 };
  }
  return { valid: true, points: orderedValues.reduce((sum, value) => sum + value, 0) };
}

function rummikubTileFromPayload(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("루미큐브 타일 정보가 올바르지 않습니다.");
  const item = raw as Record<string, unknown>;
  const kind = item.kind === "joker" ? "joker" : "number";
  const color = rummikubColors.includes(item.color as RummikubColor) ? item.color as RummikubColor : null;
  if (!color) throw new Error("루미큐브 색상이 올바르지 않습니다.");
  const tile: RummikubTile = {
    id: String(item.id ?? ""),
    kind,
    number: kind === "joker" ? null : Number(item.number),
    color,
    jokerValue: kind === "joker" ? Number.isInteger(Number(item.jokerValue)) ? Number(item.jokerValue) : null : undefined,
    jokerColor: kind === "joker" && rummikubColors.includes(item.jokerColor as RummikubColor) ? item.jokerColor as RummikubColor : null,
  };
  if (kind === "number" && (!Number.isInteger(tile.number) || tile.number! < 1 || tile.number! > 13)) {
    throw new Error("루미큐브 숫자가 올바르지 않습니다.");
  }
  if (kind === "joker" && (tile.jokerValue === null || tile.jokerColor === null)) {
    throw new Error("조커가 대신할 숫자와 색을 선택해주세요.");
  }
  return tile;
}

function startRummikubGame(state: RoomState) {
  clearWaitingTimer(state);
  state.rummikubPool = buildRummikubPool();
  state.rummikubTable = [];
  state.players.forEach((player) => {
    player.rummikubHand = [];
    player.rummikubInitialMelded = false;
    player.rummikubScore = 0;
  });
  const starterDraws = state.players.map((player) => ({ player, tile: state.rummikubPool.pop() }));
  const highestValue = Math.max(...starterDraws.map(({ tile }) => tile?.number ?? 0));
  const highestPlayers = starterDraws.filter(({ tile }) => (tile?.number ?? 0) === highestValue);
  const firstPlayer = highestPlayers[Math.floor(Math.random() * highestPlayers.length)]?.player;
  starterDraws.forEach(({ tile }) => { if (tile) state.rummikubPool.push(tile); });
  shuffle(state.rummikubPool);
  for (let count = 0; count < 14; count += 1) {
    state.players.forEach((player) => {
      const tile = state.rummikubPool.pop();
      if (tile) player.rummikubHand.push(tile);
    });
  }
  if (!firstPlayer) throw new Error("게임을 시작할 플레이어가 없습니다.");
  state.status = "playing";
  state.turnPlayerId = firstPlayer.id;
  state.turnNumber = 1;
  state.winnerId = null;
  addLog(state, `${firstPlayer.name}님부터 루미큐브를 시작합니다. 처음에는 30점 이상을 등록해야 합니다.`);
}

function resetRummikubRoom(state: RoomState) {
  markWaiting(state);
  state.rummikubPool = buildRummikubPool();
  state.rummikubTable = [];
  state.turnPlayerId = null;
  state.turnNumber = 0;
  state.winnerId = null;
  state.players.forEach((player) => {
    player.rummikubHand = [];
    player.rummikubInitialMelded = false;
    player.rummikubScore = 0;
  });
}

function resetWatermelonRoom(state: RoomState) {
  markWaiting(state);
  state.turnPlayerId = null;
  state.turnNumber = 0;
  state.winnerId = null;
  state.players.forEach((player) => {
    player.watermelonScore = 0;
    player.watermelonDrops = 0;
    player.watermelonGameOver = false;
  });
}

function startWatermelonGame(state: RoomState) {
  clearWaitingTimer(state);
  state.status = "playing";
  state.turnPlayerId = null;
  state.turnNumber = 1;
  state.winnerId = null;
  state.players.forEach((player) => {
    player.watermelonScore = 0;
    player.watermelonDrops = 0;
    player.watermelonGameOver = false;
  });
  addLog(state, "수박 합성 대전이 시작됐습니다. 각자의 보드에서 가장 높은 점수를 만드세요.");
}

function beginPlaying(state: RoomState) {
  clearWaitingTimer(state);
  state.status = "playing";
  state.setupPlayerId = null;
  state.setupDrawCount = 0;
  state.setupDrawColors = [];
  state.setupCompletedIds = [];
  state.turnPlayerId = state.players[Math.floor(Math.random() * state.players.length)].id;
  state.turnNumber = 1;
  state.turnDraw = null;
  state.turnDrawn = false;
  state.turnDrawPosition = null;
  state.turnCanEnd = false;
  state.penaltyPlayerId = null;
  const firstPlayer = playerById(state, state.turnPlayerId);
  addLog(state, `${firstPlayer?.name ?? "무작위 플레이어"}님이 첫 턴을 가져갑니다.`);
}

function finishTurn(state: RoomState, actor: Player) {
  const next = nextPlayer(state, actor.id);
  state.turnDraw = null;
  state.turnDrawn = false;
  state.turnDrawPosition = null;
  state.turnCanEnd = false;
  state.penaltyPlayerId = null;
  if (finishIfOnePlayerRemains(state)) return;
  state.turnPlayerId = next?.id ?? null;
  state.turnNumber += 1;
}

export async function createRoom(name: string, requestedGameType: GameType = "davinci") {
  const cleanName = name.trim().slice(0, 18);
  if (!cleanName) throw new Error("닉네임을 입력해주세요.");
  const gameType: GameType = requestedGameType === "robo77" ? "robo77" : "davinci";
  const normalizedGameType: GameType = requestedGameType === "rummikub" ? "rummikub" : requestedGameType === "watermelon" ? "watermelon" : requestedGameType === "dalmuti" ? "dalmuti" : gameType;
  await ensureSchema();

  let code = makeCode();
  while (await roomExists(code)) code = makeCode();
  const createdAt = new Date().toISOString();

  const player: Player = {
    id: token().slice(0, 12),
    name: cleanName,
    secret: token(),
    hand: [],
    unplacedJokers: [],
    roboHand: [],
    rummikubHand: [],
    rummikubInitialMelded: false,
    rummikubScore: 0,
    watermelonScore: 0,
    watermelonDrops: 0,
    watermelonGameOver: false,
    dalmutiHand: [],
    dalmutiFinishPlace: null,
    chips: 3,
    eliminated: false,
    isHost: true,
  };
  const state: RoomState = {
    code,
    hostId: player.id,
    kickedNames: [],
    gameType: normalizedGameType,
    status: "waiting",
    createdAt,
    waitingSince: createdAt,
    aloneSince: createdAt,
    players: [player],
    deck: buildDeck(),
    setupPlayerId: null,
    setupDrawCount: 0,
    setupDrawColors: [],
    setupCompletedIds: [],
    turnPlayerId: null,
    turnDraw: null,
    turnDrawn: false,
    turnDrawPosition: null,
    turnCanEnd: false,
    penaltyPlayerId: null,
    winnerId: null,
    turnNumber: 0,
    log: ["방이 만들어졌습니다. 친구에게 방 코드를 공유하세요."],
    chat: [],
    cameraEnabledPlayerIds: [],
    cameraSignals: [],
    roboDeck: buildRoboDeck(),
    roboDiscard: [],
    roboTotal: 0,
    roboDirection: "clockwise",
    roboPendingCards: 0,
    roboRoundNumber: 0,
    roboFirstPlayerId: null,
    rummikubPool: buildRummikubPool(),
    rummikubTable: [],
    dalmutiDeck: buildDalmutiDeck(),
    dalmutiSetupDraws: {},
    dalmutiPhase: "setup",
    dalmutiHandNumber: 0,
    dalmutiLastPlay: null,
    dalmutiLeadRank: null,
    dalmutiLeadCount: 0,
    dalmutiPassCount: 0,
    dalmutiLastPlayerId: null,
    dalmutiFinishOrder: [],
    dalmutiTaxGreaterDone: false,
    dalmutiTaxLesserDone: false,
    dalmutiRevolution: null,
    dalmutiHasSeating: false,
  };

  const db = await database();
  await db
    .prepare(
      "INSERT INTO game_rooms (code, state, version, updated_at) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(code, JSON.stringify(state), 1, createdAt)
    .run();
  return { code, playerToken: player.secret, state: publicState(state, player.secret) };
}

export async function joinRoom(code: string, name: string) {
  return retryRoomConflict(() => joinRoomOnce(code, name));
}

async function joinRoomOnce(code: string, name: string) {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim().slice(0, 18);
  if (!cleanCode || !cleanName) throw new Error("방 코드와 닉네임을 입력해주세요.");
  const room = await readRoom(cleanCode);
  if (room.state.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  const capacity = room.state.gameType === "robo77" || room.state.gameType === "dalmuti" ? 8 : 4;
  if (room.state.players.length >= capacity) throw new Error("방이 가득 찼습니다.");
  if (room.state.kickedNames.includes(cleanName.toLocaleLowerCase("ko-KR"))) {
    throw new Error("이 방에서 추방된 닉네임입니다.");
  }

  const player: Player = {
    id: token().slice(0, 12),
    name: cleanName,
    secret: token(),
    hand: [],
    unplacedJokers: [],
    roboHand: [],
    rummikubHand: [],
    rummikubInitialMelded: false,
    rummikubScore: 0,
    watermelonScore: 0,
    watermelonDrops: 0,
    watermelonGameOver: false,
    dalmutiHand: [],
    dalmutiFinishPlace: null,
    chips: 3,
    eliminated: false,
    isHost: false,
  };
  room.state.players.push(player);
  room.state.aloneSince = null;
  addLog(room.state, `${player.name}님이 입장했습니다.`);
  await writeRoom(room);
  return {
    code: cleanCode,
    playerToken: player.secret,
    state: publicState(room.state, player.secret),
  };
}

export async function getRoom(code: string, secret: string) {
  const room = await readRoom(code.trim().toUpperCase());
  return publicState(room.state, secret);
}

export async function listOpenRooms() {
  await ensureSchema();
  const db = await database();
  const rows = await db
    .prepare(
      "SELECT state, version, updated_at FROM game_rooms WHERE datetime(updated_at) >= datetime('now', '-2 hours') ORDER BY updated_at DESC LIMIT 30",
    )
    .all<RoomListRow>();

  const openRooms: Array<{
    code: string;
    gameType: GameType;
    hostName: string;
    playerCount: number;
    capacity: number;
    updatedAt: string;
  }> = [];
  for (const row of rows.results) {
    try {
      const state = normalizeRoomState(JSON.parse(row.state) as RoomState, row.updated_at);
      if (roomIsExpired(state)) {
        await deleteRoomIfCurrentVersion(state.code, row.version);
        continue;
      }
      if (state.gameType !== "davinci" && state.gameType !== "robo77" && state.gameType !== "rummikub" && state.gameType !== "watermelon" && state.gameType !== "dalmuti") continue;
      const gameType: GameType = state.gameType === "robo77" ? "robo77" : state.gameType === "rummikub" ? "rummikub" : state.gameType === "watermelon" ? "watermelon" : state.gameType === "dalmuti" ? "dalmuti" : "davinci";
      const capacity = gameType === "robo77" || gameType === "dalmuti" ? 8 : 4;
      if (state.status !== "waiting" || state.players.length === 0 || state.players.length >= capacity) continue;
      const host = state.players.find((player) => player.id === state.hostId) ?? state.players[0];
      openRooms.push({
        code: state.code,
        gameType,
        hostName: host?.name ?? "방장",
        playerCount: state.players.length,
        capacity,
        updatedAt: row.updated_at,
      });
    } catch {
      continue;
    }
  }
  return openRooms;
}

export async function actOnRoom(code: string, secret: string, action: string, payload: Record<string, unknown>) {
  return retryRoomConflict(() => actOnRoomOnce(code, secret, action, payload));
}

async function actOnRoomOnce(
  code: string,
  secret: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const room = await readRoom(code.trim().toUpperCase());
  const state = room.state;
  const actor = requirePlayer(state, secret);

  if (action === "camera-enable") {
    state.cameraEnabledPlayerIds = Array.from(new Set([...state.cameraEnabledPlayerIds, actor.id]));
  } else if (action === "camera-disable") {
    state.cameraEnabledPlayerIds = state.cameraEnabledPlayerIds.filter((id) => id !== actor.id);
    state.cameraSignals = state.cameraSignals.filter((signal) => signal.fromPlayerId !== actor.id && signal.toPlayerId !== actor.id);
  } else if (action === "camera-signal" || action === "camera-signal-batch") {
    const rawSignals = action === "camera-signal-batch" && Array.isArray(payload.signals)
      ? payload.signals
      : [payload];
    if (rawSignals.length > 24) throw new Error("카메라 연결 정보가 너무 많습니다.");

    const createdAt = new Date().toISOString();
    const nextSignals: CameraSignal[] = [];
    for (const rawSignal of rawSignals) {
      const signal = rawSignal && typeof rawSignal === "object"
        ? rawSignal as Record<string, unknown>
        : {};
      const toPlayerId = String(signal.toPlayerId ?? "");
      const kind = signal.kind === "offer" || signal.kind === "answer" || signal.kind === "ice" ? signal.kind : null;
      const signalPayload = String(signal.signalPayload ?? "");
      if (!kind || !playerById(state, toPlayerId) || toPlayerId === actor.id) {
        throw new Error("카메라 연결 대상을 확인해주세요.");
      }
      if (!signalPayload || signalPayload.length > 16000) {
        throw new Error("카메라 연결 정보가 올바르지 않습니다.");
      }
      nextSignals.push({
        id: token().slice(0, 16),
        fromPlayerId: actor.id,
        toPlayerId,
        kind,
        payload: signalPayload,
        createdAt,
      });
    }
    state.cameraSignals.push(...nextSignals);
    state.cameraSignals = state.cameraSignals.slice(-240);
  } else if (action === "camera-ack") {
    const signalIds = Array.isArray(payload.signalIds) ? payload.signalIds.map(String).slice(0, 80) : [];
    const acknowledged = new Set(signalIds);
    state.cameraSignals = state.cameraSignals.filter((signal) => signal.toPlayerId !== actor.id || !acknowledged.has(signal.id));
  } else if (action === "leave") {
    if (state.status !== "waiting") throw new Error("게임 시작 전 로비에서만 퇴장할 수 있습니다.");
    state.players = state.players.filter((player) => player.id !== actor.id);
    state.aloneSince = state.players.length === 1 ? new Date().toISOString() : null;
    state.cameraEnabledPlayerIds = state.cameraEnabledPlayerIds.filter((id) => id !== actor.id);
    state.cameraSignals = state.cameraSignals.filter((signal) => signal.fromPlayerId !== actor.id && signal.toPlayerId !== actor.id);
    if (state.players.length === 0) {
      const db = await database();
      const result = await db
        .prepare("DELETE FROM game_rooms WHERE code = ?1 AND version = ?2")
        .bind(state.code, room.version)
        .run();
      if (result.meta?.changes !== 1) throw new RoomConflictError("방 상태가 변경되었습니다.");
      return { appVersion: APP_VERSION, left: true };
    }
    if (actor.isHost) {
      const nextHost = state.players[0];
      nextHost.isHost = true;
      state.hostId = nextHost.id;
      addLog(state, `${actor.name}님이 나갔습니다. ${nextHost.name}님이 새 방장입니다.`);
    } else {
      addLog(state, `${actor.name}님이 방에서 나갔습니다.`);
    }
    await writeRoom(room);
    return { appVersion: APP_VERSION, left: true };
  } else if (action === "send-chat") {
    addChat(state, actor, payload.message);
  } else if (action === "kick") {
    if (!actor.isHost) throw new Error("방장만 플레이어를 추방할 수 있습니다.");
    if (state.status !== "waiting") throw new Error("게임 시작 전 로비에서만 추방할 수 있습니다.");
    const targetId = String(payload.targetPlayerId ?? "");
    const target = playerById(state, targetId);
    if (!target || target.id === actor.id || target.isHost) throw new Error("추방할 플레이어를 선택해주세요.");
    state.players = state.players.filter((player) => player.id !== target.id);
    state.aloneSince = state.players.length === 1 ? new Date().toISOString() : null;
    state.cameraEnabledPlayerIds = state.cameraEnabledPlayerIds.filter((id) => id !== target.id);
    state.cameraSignals = state.cameraSignals.filter((signal) => signal.fromPlayerId !== target.id && signal.toPlayerId !== target.id);
    state.kickedNames = Array.from(new Set([
      ...state.kickedNames,
      target.name.toLocaleLowerCase("ko-KR"),
    ]));
    addLog(state, `${target.name}님이 방에서 추방되었습니다.`);
  } else if (action === "start") {
    if (!actor.isHost) throw new Error("방장만 게임을 시작할 수 있습니다.");
    if (state.status !== "waiting") throw new Error("게임이 이미 시작되었습니다.");
    if (state.players.length < 2) throw new Error("최소 2명이 모여야 시작할 수 있습니다.");
    if (state.gameType === "dalmuti") {
      if (state.players.length < 4) throw new Error("달무티는 최소 4명이 필요합니다.");
      if (state.dalmutiHasSeating) startDalmutiHand(state);
      else startDalmutiGame(state);
    }
    else if (state.gameType === "watermelon") startWatermelonGame(state);
    else if (state.gameType === "robo77") startRoboGame(state);
    else if (state.gameType === "rummikub") startRummikubGame(state);
    else prepareInitialDraw(state);
  } else if (action === "return-lobby" || action === "restart") {
    if (!actor.isHost) throw new Error("방장만 게임을 다시 시작할 수 있습니다.");
    if (state.status !== "finished") throw new Error("게임이 끝난 뒤에만 선택할 수 있습니다.");
    if (state.gameType === "dalmuti") {
      if (action === "restart") {
        if (state.dalmutiFinishOrder.length !== state.players.length) throw new Error("이번 판의 종료 순서를 확인할 수 없습니다.");
        startDalmutiNextHand(state);
      } else resetDalmutiRoom(state);
    }
    else if (state.gameType === "watermelon") resetWatermelonRoom(state);
    else if (state.gameType === "robo77") resetRoboRoom(state);
    else if (state.gameType === "rummikub") resetRummikubRoom(state);
    else resetRoundState(state);
    if (action === "restart" && state.gameType !== "dalmuti") {
      if (state.gameType === "watermelon") startWatermelonGame(state);
      else if (state.gameType === "robo77") startRoboGame(state);
      else if (state.gameType === "rummikub") startRummikubGame(state);
      else prepareInitialDraw(state);
    }
    if (action === "restart") {
      addLog(state, `${actor.name}님이 같은 플레이어로 게임을 다시 시작했습니다.`);
    } else {
      addLog(state, "게임이 끝났습니다. 같은 플레이어로 로비에 돌아왔습니다.");
    }
  } else if (state.gameType === "dalmuti") {
    if (state.status === "drawing" && state.dalmutiPhase === "setup") {
      if (action !== "dalmuti-draw-seat") throw new Error("먼저 첫 판의 자리 카드를 뽑아주세요.");
      if (state.dalmutiSetupDraws[actor.id]) throw new Error("자리 카드는 한 번만 뽑을 수 있습니다.");
      const seatCard = buildDalmutiDeck()[Math.floor(Math.random() * 80)];
      if (!seatCard) throw new Error("자리 카드를 뽑지 못했습니다.");
      state.dalmutiSetupDraws[actor.id] = { rank: seatCard.rank, name: seatCard.name };
      addLog(state, `${actor.name}님이 첫 판의 자리 카드를 뽑았습니다.`);
      if (Object.keys(state.dalmutiSetupDraws).length === state.players.length) {
        const sorted = [...state.players].sort((left, right) =>
          (state.dalmutiSetupDraws[left.id]?.rank ?? 13) - (state.dalmutiSetupDraws[right.id]?.rank ?? 13),
        );
        const ordered: Player[] = [];
        let cursor = 0;
        while (cursor < sorted.length) {
          const rank = state.dalmutiSetupDraws[sorted[cursor]?.id ?? ""]?.rank ?? 13;
          const group: Player[] = [];
          while (cursor < sorted.length && state.dalmutiSetupDraws[sorted[cursor]?.id ?? ""]?.rank === rank) {
            const player = sorted[cursor];
            if (player) group.push(player);
            cursor += 1;
          }
          ordered.push(...shuffle(group));
        }
        state.players = ordered;
        state.dalmutiHasSeating = true;
        addLog(state, "첫 판의 계급과 자리가 정해졌습니다. 이제 카드를 모두 배분합니다.");
        startDalmutiHand(state);
      }
    } else {
      if (state.status !== "playing") throw new Error("현재 진행 중인 달무티 판이 없습니다.");
      if (state.dalmutiPhase === "tax") {
        if (action === "dalmuti-revolution") {
          if (state.dalmutiTaxGreaterDone || state.dalmutiTaxLesserDone) throw new Error("세금 교환이 이미 시작되었습니다.");
          if (actor.dalmutiHand.filter((card) => card.kind === "joker").length < 2) throw new Error("광대 두 장을 가진 플레이어만 혁명을 선언할 수 있습니다.");
          const isGreaterPeon = state.players[state.players.length - 1]?.id === actor.id;
          state.dalmutiRevolution = isGreaterPeon ? "greater-revolution" : "revolution";
          state.dalmutiTaxGreaterDone = true;
          state.dalmutiTaxLesserDone = true;
          if (isGreaterPeon) state.players.reverse();
          addLog(state, isGreaterPeon ? `${actor.name}님이 대혁명을 선언해 계급을 뒤집었습니다.` : `${actor.name}님이 혁명을 선언해 세금을 없앴습니다.`);
          beginDalmutiPlay(state);
        } else if (action === "dalmuti-tax-greater" || action === "dalmuti-tax-lesser") {
          const cardIds = Array.isArray(payload.cardIds) ? payload.cardIds.map(String) : [];
          performDalmutiTax(state, actor, action === "dalmuti-tax-greater" ? "greater" : "lesser", cardIds);
        } else throw new Error("세금 카드를 교환하거나 광대 두 장으로 혁명을 선언해주세요.");
      } else if (state.dalmutiPhase === "play") {
        if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
        if (action === "dalmuti-play") {
          const cardIds = Array.isArray(payload.cardIds) ? payload.cardIds.map(String) : [];
          if (!cardIds.length || new Set(cardIds).size !== cardIds.length) throw new Error("낼 카드를 한 장 이상 선택해주세요.");
          if (state.dalmutiLeadCount > 0 && cardIds.length !== state.dalmutiLeadCount) throw new Error(`${state.dalmutiLeadCount}장으로 내야 합니다.`);
          const cards = cardIds.map((id) => actor.dalmutiHand.find((card) => card.id === id));
          if (cards.some((card) => !card)) throw new Error("내 손패에 있는 카드만 낼 수 있습니다.");
          const selected = cards as DalmutiCard[];
          const rank = dalmutiCardSetRank(selected);
          if (rank === null) throw new Error("같은 계급의 카드만 한 세트로 낼 수 있습니다.");
          if (state.dalmutiLeadRank !== null && rank >= state.dalmutiLeadRank) throw new Error("앞 세트보다 더 높은 계급(더 낮은 숫자)만 낼 수 있습니다.");
          actor.dalmutiHand = actor.dalmutiHand.filter((card) => !cardIds.includes(card.id));
          sortDalmutiHand(actor.dalmutiHand);
          state.dalmutiLastPlay = { playerId: actor.id, rank, count: selected.length, cards: selected };
          state.dalmutiLeadRank = rank;
          state.dalmutiLeadCount = selected.length;
          state.dalmutiPassCount = 0;
          state.dalmutiLastPlayerId = actor.id;
          addLog(state, `${actor.name}님이 ${rank === 13 ? "광대" : `${rank}계급`} ${selected.length}장을 냈습니다.`);
          if (actor.dalmutiHand.length === 0) {
            actor.dalmutiFinishPlace = state.dalmutiFinishOrder.length + 1;
            state.dalmutiFinishOrder = [...state.dalmutiFinishOrder, actor.id];
            addLog(state, `${actor.name}님이 ${actor.dalmutiFinishPlace}위로 손패를 모두 없앴습니다.`);
          }
          if (!dalmutiFinishHand(state)) {
            state.turnPlayerId = nextDalmutiPlayer(state, actor.id)?.id ?? null;
            state.turnNumber += 1;
          }
        } else if (action === "dalmuti-pass") {
          if (state.dalmutiLeadRank === null || state.dalmutiLeadCount === 0) throw new Error("새 세트에는 패스할 수 없습니다.");
          state.dalmutiPassCount += 1;
          const active = dalmutiActivePlayers(state);
          const lastPlayer = state.dalmutiLastPlayerId ? playerById(state, state.dalmutiLastPlayerId) : null;
          const lastStillActive = Boolean(lastPlayer && lastPlayer.dalmutiFinishPlace === null);
          const requiredPasses = lastStillActive ? Math.max(1, active.length - 1) : active.length;
          if (state.dalmutiPassCount >= requiredPasses) {
            const leader = lastPlayer && lastStillActive ? lastPlayer : nextDalmutiPlayer(state, actor.id);
            state.dalmutiLeadRank = null;
            state.dalmutiLeadCount = 0;
            state.dalmutiPassCount = 0;
            state.dalmutiLastPlay = null;
            state.turnPlayerId = leader?.id ?? null;
            state.turnNumber += 1;
            addLog(state, `${leader?.name ?? "다음 플레이어"}님이 새 세트를 시작합니다.`);
          } else {
            state.turnPlayerId = nextDalmutiPlayer(state, actor.id)?.id ?? null;
            state.turnNumber += 1;
          }
        } else throw new Error("달무티에서는 세트를 내거나 패스해주세요.");
      } else throw new Error("달무티의 현재 단계를 확인해주세요.");
    }
  } else if (state.gameType === "watermelon") {
    if (state.status !== "playing") throw new Error("진행 중인 수박 합성 대전이 아닙니다.");
    if (action !== "watermelon-progress") throw new Error("수박 합성 보드에서 플레이해주세요.");
    const score = Number(payload.score);
    const drops = Number(payload.drops);
    const gameOver = payload.gameOver === true;
    if (!Number.isInteger(score) || score < actor.watermelonScore || score > 1000000) throw new Error("점수 정보를 확인해주세요.");
    if (!Number.isInteger(drops) || drops < actor.watermelonDrops || drops > 100000) throw new Error("낙하 횟수를 확인해주세요.");
    actor.watermelonScore = score;
    actor.watermelonDrops = drops;
    actor.watermelonGameOver = actor.watermelonGameOver || gameOver;
    if (gameOver) addLog(state, `${actor.name}님의 보드가 넘쳤습니다. 최종 ${score}점입니다.`);
    const active = state.players.filter((player) => !player.watermelonGameOver);
    if (state.players.length > 1 && active.length <= 1) {
      const winner = active[0] ?? [...state.players].sort((a, b) => b.watermelonScore - a.watermelonScore)[0];
      state.status = "finished";
      state.winnerId = winner?.id ?? null;
      addLog(state, `${winner?.name ?? "승자"}님이 수박 합성 대전에서 승리했습니다.`);
    }
  } else if (state.gameType === "rummikub") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    const hand = actor.rummikubHand;
    if (action === "rummikub-draw") {
      const drawn = state.rummikubPool.pop();
      if (!drawn) throw new Error("풀에 남은 타일이 없습니다.");
      hand.push(drawn);
      state.turnPlayerId = nextPlayerBySeat(state, actor.id)?.id ?? null;
      state.turnNumber += 1;
      addLog(state, `${actor.name}님이 타일을 뽑고 턴을 넘겼습니다.`);
    } else if (action === "rummikub-commit") {
      const rawMelds = Array.isArray(payload.melds) ? payload.melds : [];
      const previousTiles = state.rummikubTable.flatMap((meld) => meld.tiles);
      const previousIds = new Set(previousTiles.map((tile) => tile.id));
      const handById = new Map(hand.map((tile) => [tile.id, tile]));
      const authoritativeById = new Map([...previousTiles, ...hand].map((tile) => [tile.id, tile]));
      const submittedMelds: RummikubMeld[] = rawMelds.map((raw, index) => {
        const item = raw as Record<string, unknown>;
        const tiles = Array.isArray(item.tiles) ? item.tiles.map((rawTile) => {
          const requested = rummikubTileFromPayload(rawTile);
          const authoritative = authoritativeById.get(requested.id);
          if (!authoritative) throw new Error("내 타일 또는 테이블의 타일만 사용할 수 있습니다.");
          return authoritative.kind === "joker"
            ? { ...authoritative, jokerValue: requested.jokerValue, jokerColor: requested.jokerColor }
            : { ...authoritative };
        }) : [];
        return { id: String(item.id ?? `meld-${index}`), tiles };
      });
      const submittedIds = submittedMelds.flatMap((meld) => meld.tiles.map((tile) => tile.id));
      if (new Set(submittedIds).size !== submittedIds.length) throw new Error("같은 타일을 두 번 사용할 수 없습니다.");
      if (previousTiles.some((tile) => !submittedIds.includes(tile.id))) throw new Error("테이블의 기존 타일은 턴이 끝날 때 모두 남아 있어야 합니다.");
      const allKnownIds = new Set([...previousIds, ...handById.keys()]);
      if (submittedIds.some((id) => !allKnownIds.has(id))) throw new Error("내 타일 또는 테이블의 타일만 사용할 수 있습니다.");
      const playedIds = submittedIds.filter((id) => handById.has(id));
      if (!playedIds.length) throw new Error("이번 턴에 손패에서 타일을 하나 이상 내야 합니다.");
      const initialMelds = submittedMelds.filter((meld) => meld.tiles.some((tile) => handById.has(tile.id)));
      if (!actor.rummikubInitialMelded) {
        if (previousTiles.length && submittedMelds.some((meld) => meld.tiles.some((tile) => previousIds.has(tile.id) && handById.has(tile.id)))) {
          throw new Error("첫 등록에서는 테이블 타일을 조합에 섞을 수 없습니다.");
        }
        const initialPoints = initialMelds.reduce((sum, meld) => sum + validateRummikubMeld(meld).points, 0);
        if (initialPoints < 30) throw new Error("첫 등록은 손패만으로 30점 이상이어야 합니다.");
      }
      submittedMelds.forEach((meld) => {
        if (!validateRummikubMeld(meld).valid) throw new Error("모든 조합은 같은 숫자 그룹 또는 같은 색의 연속 숫자여야 합니다.");
      });
      const invalidJoker = submittedMelds.flatMap((meld) => meld.tiles).some((tile) => tile.kind === "joker" && (tile.jokerValue === null || tile.jokerColor === null));
      if (invalidJoker) throw new Error("조커가 대신할 숫자와 색을 선택해주세요.");
      actor.rummikubHand = hand.filter((tile) => !playedIds.includes(tile.id));
      actor.rummikubInitialMelded = true;
      state.rummikubTable = submittedMelds;
      if (actor.rummikubHand.length === 0) {
        const losersTotal = state.players
          .filter((player) => player.id !== actor.id)
          .reduce((sum, player) => sum + rummikubRackPenalty(player.rummikubHand), 0);
        state.players.forEach((player) => {
          player.rummikubScore = player.id === actor.id ? losersTotal : -rummikubRackPenalty(player.rummikubHand);
        });
        state.status = "finished";
        state.winnerId = actor.id;
        state.turnPlayerId = null;
        addLog(state, `${actor.name}님이 손패를 모두 내려 루미큐브에서 승리했습니다.`);
      } else {
        state.turnPlayerId = nextPlayerBySeat(state, actor.id)?.id ?? null;
        state.turnNumber += 1;
        addLog(state, `${actor.name}님이 ${playedIds.length}개의 타일을 테이블에 등록했습니다.`);
      }
    } else {
      throw new Error("루미큐브에서는 조합 등록 또는 타일 뽑기를 선택해주세요.");
    }
  } else if (state.gameType === "robo77") {
    if (action !== "robo-play") throw new Error("로보77에서는 카드를 눌러 플레이해주세요.");
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    if (actor.eliminated) throw new Error("탈락한 플레이어는 카드를 낼 수 없습니다.");

    const cardId = String(payload.cardId ?? "");
    const cardIndex = actor.roboHand.findIndex((card) => card.id === cardId);
    if (cardIndex < 0) throw new Error("손에 있는 카드를 선택해주세요.");
    const card = actor.roboHand[cardIndex];
    if (!card) throw new Error("카드를 선택해주세요.");
    if (state.roboPendingCards === 2 && card.kind === "double") {
      throw new Error("×2 다음의 강제 두 장 중 첫 카드는 ×2를 낼 수 없습니다.");
    }

    actor.roboHand.splice(cardIndex, 1);
    state.roboDiscard.push(card);
    const forcedCardsBefore = state.roboPendingCards;
    let announcedTotal = state.roboTotal;
    if (card.kind === "number") announcedTotal += card.value ?? 0;
    else if (card.kind === "minus10") announcedTotal -= 10;
    else if (card.kind === "reverse") {
      state.roboDirection = state.roboDirection === "clockwise" ? "counterclockwise" : "clockwise";
    } else if (card.kind === "double") {
      state.roboPendingCards = 2;
    }
    state.roboTotal = announcedTotal;

    const isSchnapszahl = [11, 22, 33, 44, 55, 66, 77].includes(announcedTotal);
    const isTooHigh = announcedTotal >= 77;
    const causedPenalty = isSchnapszahl || isTooHigh;
    if (forcedCardsBefore > 0 && card.kind !== "double") {
      state.roboPendingCards = Math.max(0, state.roboPendingCards - 1);
    }

    if (causedPenalty) {
      const eliminated = applyRoboPenalty(actor);
      addLog(
        state,
        `${actor.name}님이 ${announcedTotal}을 선언해 칩을 잃었습니다.${eliminated ? " 칩이 없어 탈락했습니다." : ""}`,
      );
      state.roboPendingCards = 0;
      if (isTooHigh) {
        if (finishRoboIfOnePlayerRemains(state)) {
          state.roboTotal = announcedTotal;
        } else {
          const nextStarter = nextRoboPlayer(state, state.roboFirstPlayerId ?? actor.id, "clockwise");
          if (!nextStarter) throw new Error("다음 라운드를 시작할 플레이어가 없습니다.");
          beginRoboRound(state, nextStarter.id);
          addLog(state, `${nextStarter.name}님부터 새 라운드를 시작합니다.`);
        }
      } else if (eliminated && finishRoboIfOnePlayerRemains(state)) {
        // The game is over immediately when the penalty removes the last rival.
      } else {
        const drawn = !eliminated ? drawRoboCard(state) : null;
        if (drawn) actor.roboHand.push(drawn);
        const next = nextRoboPlayer(state, actor.id);
        state.turnPlayerId = next?.id ?? null;
        state.turnNumber += 1;
      }
    } else {
      const drawn = drawRoboCard(state);
      if (drawn) actor.roboHand.push(drawn);
      if (card.kind === "double") {
        const next = nextRoboPlayer(state, actor.id);
        state.turnPlayerId = next?.id ?? null;
        state.turnNumber += 1;
        addLog(state, `${actor.name}님이 ×2를 내고 ${next?.name ?? "다음 플레이어"}님에게 카드 두 장을 요구했습니다.`);
      } else if (state.roboPendingCards > 0) {
        state.turnPlayerId = actor.id;
        addLog(state, `${actor.name}님이 ${card.label}을 내고 현재 합계 ${announcedTotal}을 선언했습니다. 강제 카드 ${state.roboPendingCards}장을 더 냅니다.`);
      } else {
        const next = nextRoboPlayer(state, actor.id);
        state.turnPlayerId = next?.id ?? null;
        state.turnNumber += 1;
        addLog(state, `${actor.name}님이 ${card.label}을 내고 ${announcedTotal}을 선언했습니다. ${next?.name ?? "다음 플레이어"}님 차례입니다.`);
      }
    }
  } else if (action === "place-joker") {
    if (state.status !== "placing") throw new Error("지금은 조커를 배치하는 단계가 아닙니다.");
    if (state.setupPlayerId !== actor.id) throw new Error("현재 시작 패를 구성하는 플레이어가 아닙니다.");
    const position = Number(payload.position);
    if (!Number.isInteger(position) || position < 0 || position > actor.hand.length) {
      throw new Error("조커를 넣을 위치를 선택해주세요.");
    }
    const joker = actor.unplacedJokers.shift();
    if (!joker) throw new Error("배치할 조커가 없습니다.");
    actor.hand.splice(position, 0, joker);
    if (actor.unplacedJokers.length === 0) finishInitialSetupPlayer(state, actor);
  } else if (action === "draw-initial") {
    if (state.status !== "drawing") throw new Error("지금은 시작 패를 뽑는 단계가 아닙니다.");
    if (state.setupPlayerId !== actor.id) throw new Error("지금은 다른 플레이어가 시작 패를 고르고 있습니다.");
    if (state.setupDrawCount >= 4) throw new Error("시작 패 4장을 이미 골랐습니다.");
    const color = payload.color === "white" || payload.color === "black" ? payload.color : null;
    if (!color) throw new Error("흰색 또는 검정색을 선택해주세요.");
    const matchingIndexes = state.deck.reduce<number[]>((indexes, tile, index) => {
      if (tile.color === color) indexes.push(index);
      return indexes;
    }, []);
    if (!matchingIndexes.length) throw new Error(`${color === "black" ? "검정" : "흰색"} 타일이 모두 소진됐습니다.`);
    const pickedIndex = matchingIndexes[Math.floor(Math.random() * matchingIndexes.length)];
    const drawn = state.deck.splice(pickedIndex, 1)[0];
    if (!drawn) throw new Error("타일을 뽑지 못했습니다.");
    state.setupDrawCount += 1;
    state.setupDrawColors.push(color);
    if (drawn.kind === "joker") actor.unplacedJokers.push(drawn);
    else insertNumberTile(actor.hand, drawn);
    if (state.setupDrawCount === 4) finishInitialSetupPlayer(state, actor);
  } else if (action === "draw") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    if (state.penaltyPlayerId) throw new Error("먼저 공개할 자기 타일을 선택해주세요.");
    if (state.turnDrawn) throw new Error("이미 이번 턴을 준비했습니다. 추리해보세요.");
    const drawn = state.deck.pop();
    state.turnDrawn = true;
    state.turnDraw = drawn ?? null;
    state.turnDrawPosition = null;
    state.turnCanEnd = false;
    if (drawn?.kind === "number") insertNumberTile(actor.hand, drawn);
    addLog(state, drawn ? `${actor.name}님이 타일을 뽑았습니다.` : "남은 타일 없이 추리가 이어집니다.");
  } else if (action === "place-drawn-joker") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    if (state.penaltyPlayerId) throw new Error("먼저 공개할 자기 타일을 선택해주세요.");
    if (!state.turnDrawn || !state.turnDraw || state.turnDraw.kind !== "joker") {
      throw new Error("지금 배치할 조커가 없습니다.");
    }
    if (state.turnDrawPosition !== null) throw new Error("조커 위치는 한 번 정하면 바꿀 수 없습니다.");
    const position = Number(payload.position);
    if (!Number.isInteger(position) || position < 0 || position > actor.hand.length) {
      throw new Error("조커를 넣을 위치를 선택해주세요.");
    }
    if (!actor.hand.some((tile) => tile.id === state.turnDraw?.id)) {
      actor.hand.splice(position, 0, state.turnDraw);
    }
    state.turnDrawPosition = position;
  } else if (action === "end-turn") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    if (state.penaltyPlayerId) throw new Error("먼저 공개할 자기 타일을 선택해주세요.");
    if (!state.turnDrawn) throw new Error("먼저 이번 턴을 준비해주세요.");
    if (state.turnDraw?.kind === "joker" && state.turnDrawPosition === null) {
      throw new Error("먼저 조커를 넣을 위치를 선택해주세요.");
    }
    if (!state.turnCanEnd) throw new Error("먼저 상대 타일을 한 번 이상 맞혀야 턴을 끝낼 수 있습니다.");
    addLog(state, `${actor.name}님이 턴을 종료했습니다.`);
    finishTurn(state, actor);
  } else if (action === "reveal-penalty") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.penaltyPlayerId !== actor.id) throw new Error("지금 공개할 타일이 없습니다.");
    const slotIndex = Number(payload.slotIndex);
    const penaltyTile = actor.hand[slotIndex];
    if (!Number.isInteger(slotIndex) || !penaltyTile || penaltyTile.revealed) {
      throw new Error("아직 공개되지 않은 자기 타일을 선택해주세요.");
    }
    penaltyTile.revealed = true;
    state.penaltyPlayerId = null;
    const next = nextPlayer(state, actor.id);
    if (!finishIfOnePlayerRemains(state)) {
      state.turnPlayerId = next?.id ?? null;
      state.turnNumber += 1;
      addLog(state, `${actor.name}님의 ${tileLabel(penaltyTile)} 타일이 공개됐습니다. ${next?.name ?? "다음 플레이어"}님 차례입니다.`);
    }
  } else if (action === "guess") {
    if (state.status !== "playing") throw new Error("아직 진행 중인 게임이 아닙니다.");
    if (state.turnPlayerId !== actor.id) throw new Error("지금은 당신의 차례가 아닙니다.");
    if (state.penaltyPlayerId) throw new Error("먼저 공개할 자기 타일을 선택해주세요.");
    if (!state.turnDrawn) throw new Error("먼저 이번 턴을 준비해주세요.");
    if (state.turnDraw?.kind === "joker" && state.turnDrawPosition === null) {
      throw new Error("먼저 조커를 넣을 위치를 선택해주세요.");
    }

    const targetId = String(payload.targetPlayerId ?? "");
    const slotIndex = Number(payload.slotIndex);
    const guessedKind = payload.kind === "joker" ? "joker" : "number";
    const guessedNumber = Number(payload.number);
    const target = playerById(state, targetId);
    if (!target || target.id === actor.id) throw new Error("상대 타일을 선택해주세요.");
    if (!Number.isInteger(slotIndex) || !target.hand[slotIndex]) {
      throw new Error("추리할 타일을 선택해주세요.");
    }
    if (target.hand[slotIndex].revealed) throw new Error("이미 공개된 타일입니다.");
    if (guessedKind === "number" && (!Number.isInteger(guessedNumber) || guessedNumber < 0 || guessedNumber > 11)) {
      throw new Error("0부터 11 사이의 숫자를 선택해주세요.");
    }

    const targetTile = target.hand[slotIndex];
    const correct =
      targetTile.kind === guessedKind &&
      (guessedKind === "joker" || targetTile.number === guessedNumber);
    if (correct) {
      targetTile.revealed = true;
      state.turnCanEnd = true;
      addLog(state, `${actor.name}님이 ${target.name}님의 ${tileLabel(targetTile)} 타일을 맞혔습니다.`);
      finishIfOnePlayerRemains(state);
    } else {
      const hadDraw = Boolean(state.turnDraw);
      const keepDrawnPrivate = hadDraw && state.turnCanEnd;
      let revealedDrawLabel: string | null = null;
      if (state.turnDraw && !keepDrawnPrivate) {
        const drawnTile = actor.hand.find((tile) => tile.id === state.turnDraw?.id);
        if (drawnTile) {
          drawnTile.revealed = true;
          revealedDrawLabel = tileLabel(drawnTile);
        }
      }
      state.turnDraw = null;
      state.turnDrawn = false;
      state.turnDrawPosition = null;
      state.turnCanEnd = false;
      if (!hadDraw) {
        state.penaltyPlayerId = actor.id;
        addLog(state, `${actor.name}님이 빗나갔습니다. 자기 비공개 타일 하나를 공개해야 합니다.`);
      } else {
        const next = nextPlayer(state, actor.id);
        if (finishIfOnePlayerRemains(state)) {
          addLog(
            state,
            keepDrawnPrivate
              ? `${actor.name}님이 빗나갔지만 뽑은 타일은 공개되지 않았습니다.`
              : `${actor.name}님이 빗나가 ${revealedDrawLabel ?? "뽑은"} 타일이 공개됐습니다.`,
          );
        } else {
          state.turnPlayerId = next?.id ?? null;
          state.turnNumber += 1;
          addLog(
            state,
            keepDrawnPrivate
              ? `${actor.name}님이 빗나갔지만 뽑은 타일은 공개되지 않았습니다. ${next?.name ?? "다음 플레이어"}님 차례입니다.`
              : `${actor.name}님이 빗나가 ${revealedDrawLabel ?? "뽑은"} 타일이 공개됐습니다. ${next?.name ?? "다음 플레이어"}님 차례입니다.`,
          );
        }
      }
    }
  } else {
    throw new Error("알 수 없는 게임 동작입니다.");
  }

  const saved = await writeRoom(room);
  return publicState(saved.state, secret);
}
