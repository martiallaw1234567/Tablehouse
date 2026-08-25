export type TileColor = "black" | "white";
type TileKind = "number" | "joker";

export type Tile = {
  id: string;
  kind: TileKind;
  number: number | null;
  color: TileColor;
  revealed?: boolean;
};

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
};

type Player = {
  id: string;
  name: string;
  secret: string;
  hand: Tile[];
  unplacedJokers: Tile[];
  isHost: boolean;
};

export type RoomState = {
  code: string;
  hostId: string;
  status: "waiting" | "placing" | "playing" | "finished";
  players: Player[];
  deck: Tile[];
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
};

type StoredRoom = {
  state: RoomState;
  version: number;
};

type RoomRow = {
  state: string;
  version: number;
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T>() => Promise<T | null>;
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
};

type LegacyPlayer = Omit<Player, "hand" | "unplacedJokers"> & {
  hand: LegacyTile[];
  unplacedJokers?: LegacyTile[];
};

type LegacyRoomState = Omit<RoomState, "players" | "deck" | "turnDraw" | "turnDrawn" | "turnDrawPosition" | "turnCanEnd" | "penaltyPlayerId" | "chat"> & {
  players: LegacyPlayer[];
  deck: LegacyTile[];
  turnDraw: LegacyTile | null;
  turnDrawn?: boolean;
  turnDrawPosition?: number | null;
  turnCanEnd?: boolean;
  penaltyPlayerId?: string | null;
  chat?: ChatMessage[];
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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

function buildDeck() {
  const tiles: Tile[] = [];
  for (let number = 0; number <= 11; number += 1) {
    tiles.push(makeTile(number, "black"), makeTile(number, "white"));
  }
  tiles.push(makeJoker("black"), makeJoker("white"));
  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
  }
  return tiles;
}

function normalizeTile(tile: LegacyTile): Tile {
  const kind = tile.kind === "joker" ? "joker" : "number";
  return { ...tile, kind, number: kind === "joker" ? null : tile.number ?? null };
}

function normalizeRoomState(state: RoomState): RoomState {
  const legacy = state as unknown as LegacyRoomState;
  legacy.deck = legacy.deck.map(normalizeTile);
  legacy.players.forEach((player) => {
    player.hand = player.hand.map(normalizeTile);
    player.unplacedJokers = (player.unplacedJokers ?? []).map(normalizeTile);
  });
  legacy.turnDraw = legacy.turnDraw ? normalizeTile(legacy.turnDraw) : null;
  legacy.turnDrawn = legacy.turnDrawn ?? Boolean(legacy.turnDraw);
  legacy.turnDrawPosition = legacy.turnDrawPosition ?? null;
  legacy.turnCanEnd = legacy.turnCanEnd ?? false;
  legacy.penaltyPlayerId = legacy.penaltyPlayerId ?? null;
  legacy.chat = (legacy.chat ?? []).slice(-80);
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

function ensureVariantJokers(state: RoomState) {
  const knownTiles = [
    ...state.deck,
    ...state.players.flatMap((player) => [...player.hand, ...player.unplacedJokers]),
    ...(state.turnDraw ? [state.turnDraw] : []),
  ];
  for (const color of ["black", "white"] as TileColor[]) {
    if (!knownTiles.some((tile) => tile.kind === "joker" && tile.color === color)) {
      state.deck.push(makeJoker(color));
    }
  }
  for (let index = state.deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [state.deck[index], state.deck[swapIndex]] = [state.deck[swapIndex], state.deck[index]];
  }
}

function sortNumberTiles(hand: Tile[]) {
  hand.sort((left, right) => {
    if (left.number !== right.number) return left.number! - right.number!;
    return left.color === "black" ? -1 : 1;
  });
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

async function readRoom(code: string): Promise<StoredRoom> {
  await ensureSchema();
  const db = await database();
  const row = await db
    .prepare("SELECT state, version FROM game_rooms WHERE code = ?1")
    .bind(code)
    .first<RoomRow>();
  if (!row) throw new Error("방을 찾을 수 없습니다.");
  return { state: normalizeRoomState(JSON.parse(row.state) as RoomState), version: row.version };
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
    throw new Error("다른 플레이어가 먼저 움직였습니다. 화면을 새로 고쳐주세요.");
  }
  return { ...room, version: nextVersion };
}

function publicState(state: RoomState, secret: string) {
  const viewer = playerBySecret(state, secret);
  if (!viewer) throw new Error("플레이어 인증이 만료되었습니다.");

  return {
    code: state.code,
    status: state.status,
    turnPlayerId: state.turnPlayerId,
    winnerId: state.winnerId,
    turnNumber: state.turnNumber,
    deckCount: state.deck.length,
    chat: state.chat,
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
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      hand: player.hand.map((tile) => {
        if (player.id === viewer.id || tile.revealed) return tile;
        return { id: tile.id, kind: "hidden", number: null, color: tile.color, revealed: false };
      }),
    })),
    log: state.log,
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

function beginPlaying(state: RoomState) {
  state.status = "playing";
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

export async function createRoom(name: string) {
  const cleanName = name.trim().slice(0, 18);
  if (!cleanName) throw new Error("닉네임을 입력해주세요.");
  await ensureSchema();

  let code = makeCode();
  while (await roomExists(code)) code = makeCode();

  const player: Player = {
    id: token().slice(0, 12),
    name: cleanName,
    secret: token(),
    hand: [],
    unplacedJokers: [],
    isHost: true,
  };
  const state: RoomState = {
    code,
    hostId: player.id,
    status: "waiting",
    players: [player],
    deck: buildDeck(),
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
  };

  const db = await database();
  await db
    .prepare(
      "INSERT INTO game_rooms (code, state, version, updated_at) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(code, JSON.stringify(state), 1, new Date().toISOString())
    .run();
  return { code, playerToken: player.secret, state: publicState(state, player.secret) };
}

export async function joinRoom(code: string, name: string) {
  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim().slice(0, 18);
  if (!cleanCode || !cleanName) throw new Error("방 코드와 닉네임을 입력해주세요.");
  const room = await readRoom(cleanCode);
  if (room.state.status !== "waiting") throw new Error("이미 시작된 방입니다.");
  if (room.state.players.length >= 4) throw new Error("방이 가득 찼습니다.");

  const player: Player = {
    id: token().slice(0, 12),
    name: cleanName,
    secret: token(),
    hand: [],
    unplacedJokers: [],
    isHost: false,
  };
  room.state.players.push(player);
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

export async function actOnRoom(
  code: string,
  secret: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const room = await readRoom(code.trim().toUpperCase());
  const state = room.state;
  const actor = requirePlayer(state, secret);

  if (action === "send-chat") {
    addChat(state, actor, payload.message);
  } else if (action === "start") {
    if (!actor.isHost) throw new Error("방장만 게임을 시작할 수 있습니다.");
    if (state.status !== "waiting") throw new Error("게임이 이미 시작되었습니다.");
    if (state.players.length < 2) throw new Error("최소 2명이 모여야 시작할 수 있습니다.");
    ensureVariantJokers(state);
    const tilesPerPlayer = state.players.length === 4 ? 3 : 4;
    state.players.forEach((player) => {
      const dealt = state.deck.splice(0, tilesPerPlayer);
      player.hand = dealt.filter((tile) => tile.kind === "number");
      player.unplacedJokers = dealt.filter((tile) => tile.kind === "joker");
      sortNumberTiles(player.hand);
    });
    if (state.players.some((player) => player.unplacedJokers.length > 0)) {
      state.status = "placing";
      state.turnPlayerId = null;
      addLog(state, "조커를 원하는 위치에 배치해주세요.");
    } else {
      beginPlaying(state);
    }
  } else if (action === "place-joker") {
    if (state.status !== "placing") throw new Error("지금은 조커를 배치하는 단계가 아닙니다.");
    const position = Number(payload.position);
    if (!Number.isInteger(position) || position < 0 || position > actor.hand.length) {
      throw new Error("조커를 넣을 위치를 선택해주세요.");
    }
    const joker = actor.unplacedJokers.shift();
    if (!joker) throw new Error("배치할 조커가 없습니다.");
    actor.hand.splice(position, 0, joker);
    if (state.players.every((player) => player.unplacedJokers.length === 0)) {
      beginPlaying(state);
    }
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
      let revealedDrawLabel: string | null = null;
      if (state.turnDraw) {
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
          addLog(state, `${actor.name}님이 빗나가 ${revealedDrawLabel ?? "뽑은"} 타일이 공개됐습니다.`);
        } else {
          state.turnPlayerId = next?.id ?? null;
          state.turnNumber += 1;
          addLog(state, `${actor.name}님이 빗나가 ${revealedDrawLabel ?? "뽑은"} 타일이 공개됐습니다. ${next?.name ?? "다음 플레이어"}님 차례입니다.`);
        }
      }
    }
  } else {
    throw new Error("알 수 없는 게임 동작입니다.");
  }

  const saved = await writeRoom(room);
  return publicState(saved.state, secret);
}
