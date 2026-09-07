"use client";

import { FormEvent, Fragment, useCallback, useEffect, useRef, useState } from "react";
import DalmutiGame from "./dalmuti-game";
import WatermelonGame, { WatermelonProgress } from "./watermelon-game";

type TileColor = "black" | "white";
type GameType = "davinci" | "robo77" | "rummikub" | "watermelon" | "dalmuti";
type RummikubColor = "red" | "blue" | "black" | "yellow";

type ApiRummikubTile = {
  id: string;
  kind: "number" | "joker";
  number: number | null;
  color: RummikubColor;
  jokerValue?: number | null;
  jokerColor?: RummikubColor | null;
};

type ApiRummikubMeld = { id: string; tiles: ApiRummikubTile[] };

type ApiDalmutiCard = { id: string; kind: "number" | "joker"; rank: number; name: string };
type DalmutiRole = "greater-dalmuti" | "lesser-dalmuti" | "merchant" | "lesser-peon" | "greater-peon";

type ApiTile = {
  id: string;
  kind: "number" | "joker" | "hidden";
  number: number | null;
  color: TileColor | null;
  revealed?: boolean;
  revealedAtEnd?: boolean;
};

type ApiPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  hand: ApiTile[];
  roboHand: ApiRoboCard[];
  roboHandCount: number;
  rummikubHand: ApiRummikubTile[];
  rummikubHandCount: number;
  rummikubInitialMelded: boolean;
  rummikubScore: number;
  watermelonScore: number;
  watermelonDrops: number;
  watermelonGameOver: boolean;
  dalmutiHand: ApiDalmutiCard[];
  dalmutiHandCount: number;
  dalmutiRole: DalmutiRole | null;
  dalmutiFinishPlace: number | null;
  chips: number;
  eliminated: boolean;
};

type ApiRoboCard = {
  id: string;
  kind: "number" | "minus10" | "double" | "reverse";
  value: number | null;
  label: string;
};

type ChatMessage = {
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

type PublicRoom = {
  code: string;
  gameType: GameType;
  hostName: string;
  playerCount: number;
  capacity: number;
  updatedAt: string;
};

type GameState = {
  appVersion: string;
  code: string;
  gameType: GameType;
  status: "waiting" | "drawing" | "placing" | "playing" | "finished";
  setupPlayerId: string | null;
  setupDrawCount: number;
  setupDrawColors: TileColor[];
  initialColorCounts: { black: number; white: number };
  turnPlayerId: string | null;
  winnerId: string | null;
  turnNumber: number;
  deckCount: number;
  turnDrawn: boolean;
  turnCanEnd: boolean;
  penaltyPending: boolean;
  turnDrawPosition: number | null;
  turnDraw: ApiTile | null;
  pendingJokers: ApiTile[];
  you: { id: string; name: string; isHost: boolean };
  players: ApiPlayer[];
  log: string[];
  chat: ChatMessage[];
  camera: { enabledPlayerIds: string[]; signals: CameraSignal[] };
  robo: {
    total: number;
    direction: "clockwise" | "counterclockwise";
    pendingCards: number;
    lastCard: ApiRoboCard | null;
    discard: ApiRoboCard[];
    deckCount: number;
    roundNumber: number;
    firstPlayerId: string | null;
  } | null;
  rummikub: { table: ApiRummikubMeld[]; poolCount: number } | null;
  dalmuti: {
    phase: "setup" | "tax" | "play" | "hand-end";
    handNumber: number;
    setupDraws: Array<{ playerId: string; rank: number; name: string }>;
    lastPlay: { playerId: string; rank: number; count: number; cards: ApiDalmutiCard[] } | null;
    leadRank: number | null;
    leadCount: number;
    passCount: number;
    finishOrder: string[];
    revolution: "revolution" | "greater-revolution" | null;
    tax: {
      greaterDone: boolean;
      lesserDone: boolean;
      greaterDalmutiId: string | null;
      lesserDalmutiId: string | null;
      greaterPeonId: string | null;
      lesserPeonId: string | null;
      revolutionEligible: boolean;
    };
  } | null;
};

const SESSION_CODE = "davinci-room-code";
const SESSION_TOKEN = "davinci-player-token";
const CLIENT_APP_VERSION = "tablehouse-dalmuti-v1";
const ROOM_EXPIRED_MESSAGE = "방이 대기 시간 초과로 자동 종료되었습니다.";

function clearSavedSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_CODE);
  window.sessionStorage.removeItem(SESSION_TOKEN);
  window.localStorage.removeItem(SESSION_CODE);
  window.localStorage.removeItem(SESSION_TOKEN);
}

function getSavedSession() {
  if (typeof window === "undefined") return null;
  const tabCode = window.sessionStorage.getItem(SESSION_CODE);
  const tabToken = window.sessionStorage.getItem(SESSION_TOKEN);
  if (tabCode && tabToken) return { code: tabCode, token: tabToken };

  const legacyCode = window.localStorage.getItem(SESSION_CODE);
  const legacyToken = window.localStorage.getItem(SESSION_TOKEN);
  if (!legacyCode || !legacyToken) return null;
  window.sessionStorage.setItem(SESSION_CODE, legacyCode);
  window.sessionStorage.setItem(SESSION_TOKEN, legacyToken);
  window.localStorage.removeItem(SESSION_CODE);
  window.localStorage.removeItem(SESSION_TOKEN);
  return { code: legacyCode, token: legacyToken };
}

async function readJson(response: Response) {
  const body = (await response.json()) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  return body;
}

function TileFace({ tile, small = false }: { tile: ApiTile; small?: boolean }) {
  const hidden = tile.kind === "hidden";
  const joker = tile.kind === "joker";
  const colorClass = tile.color === "black" ? "tile-black" : "tile-white";
  return (
    <div
      className={`tile ${colorClass} ${hidden ? "tile-hidden" : ""} ${joker ? "tile-joker" : ""} ${tile.revealed ? "tile-revealed" : ""}
      ${small ? "tile-small" : ""}`}
      aria-label={hidden ? `${tile.color === "black" ? "검정" : "흰색"} 숫자 비공개 타일` : joker ? `${tile.color === "black" ? "검정" : "흰색"} 조커` : `${tile.color === "black" ? "검정" : "흰색"} ${tile.number}`}
    >
      {hidden ? <span className="tile-mark">?</span> : joker ? (
        <>
          <span className="joker-mark">J</span>
          <small className="joker-color-label">{tile.color === "black" ? "BLACK" : "WHITE"}</small>
        </>
      ) : <span>{tile.number}</span>}
      {!hidden && <i className="tile-dot" aria-hidden="true" />}
    </div>
  );
}

function ColorOnlyTile({ color, small = false }: { color: TileColor; small?: boolean }) {
  return (
    <div className={`initial-color-tile initial-color-tile-${color} ${small ? "initial-color-tile-small" : ""}`} aria-hidden="true">
      <span>{color === "black" ? "BLACK" : "WHITE"}</span>
      <i />
    </div>
  );
}

function PlayerBadge({ name, active, isYou }: { name: string; active: boolean; isYou?: boolean }) {
  return (
    <div className={`player-badge ${active ? "player-badge-active" : ""}`}>
      <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
      <span className="player-badge-name">
        {name}
        {isYou ? <small>YOU</small> : null}
      </span>
      {active ? <span className="live-dot" aria-label="현재 차례" /> : null}
    </div>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function gameName(gameType: GameType) {
  if (gameType === "dalmuti") return "DALMUTI";
  if (gameType === "watermelon") return "WATERMELON MERGE";
  if (gameType === "robo77") return "ROBO 77";
  if (gameType === "rummikub") return "RUMMIKUB";
  return "DA VINCI CODE";
}

function gameDescription(gameType: GameType) {
  if (gameType === "dalmuti") return "카드를 가장 빨리 비워 계급을 올라가세요. 세금, 혁명, 광대가 매 판의 질서를 바꿉니다.";
  if (gameType === "watermelon") return "같은 과일을 합쳐 수박을 만들고, 상자 밖으로 넘치지 않게 최고 점수에 도전하세요.";
  if (gameType === "robo77") return "카드를 내며 합계를 올리고, 77과 같은 숫자를 피하세요.";
  if (gameType === "rummikub") return "같은 숫자 그룹과 색깔 연속을 조합해 손패를 먼저 비우세요.";
  return "색은 보이고 숫자는 숨겨진 타일을 추리해 코드를 완성하세요.";
}

function ChatBubble({ chat }: { chat: ChatMessage }) {
  return (
    <div className="chat-bubble" role="status" aria-label={`${chat.playerName}님의 새 채팅`}>
      <strong>{chat.playerName}</strong>
      <span>{chat.message}</span>
    </div>
  );
}

function CameraVideo({ stream, muted, label }: { stream: MediaStream; muted: boolean; label: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted={muted} aria-label={`${label} 카메라`} />;
}

const rummikubColorLabels: Record<RummikubColor, string> = { red: "빨강", blue: "파랑", black: "검정", yellow: "노랑" };

function RummikubTileFace({ tile, selected = false, onClick }: { tile: ApiRummikubTile; selected?: boolean; onClick?: () => void }) {
  const content = tile.kind === "joker" ? "★" : tile.number;
  const representation = tile.kind === "joker" && tile.jokerValue && tile.jokerColor
    ? `${tile.jokerValue} ${rummikubColorLabels[tile.jokerColor]}`
    : "JOKER";
  return (
    <button type="button" className={`rummikub-tile rummikub-tile-${tile.color} ${tile.kind === "joker" ? "rummikub-joker" : ""} ${selected ? "rummikub-tile-selected" : ""}`} onClick={onClick} disabled={!onClick} aria-label={tile.kind === "joker" ? `조커 ${representation}` : `${rummikubColorLabels[tile.color]} ${tile.number}`}>
      <strong>{content}</strong>
      {tile.kind === "joker" ? <small>{representation}</small> : null}
    </button>
  );
}

type RummikubDraftProps = {
  game: GameState;
  me?: ApiPlayer;
  isMyTurn: boolean;
  chatBubbles: ChatMessage[];
  draftMelds: ApiRummikubMeld[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
};

function RummikubTable({ game, me, isMyTurn, chatBubbles, draftMelds, selectedIds, onSelect }: RummikubDraftProps) {
  const melds = isMyTurn ? draftMelds : game.rummikub?.table ?? [];
  const toggle = (id: string) => onSelect(selectedIds.includes(id) ? selectedIds.filter((current) => current !== id) : [...selectedIds, id]);
  return (
    <div className="table-panel rummikub-table-panel">
      <div className="rummikub-board-head"><span>TABLE MELDS</span><small>{game.rummikub?.poolCount ?? 0} TILES IN POOL · {melds.length} SETS</small></div>
      <div className="rummikub-meld-board">
        {melds.length ? melds.map((meld) => (
          <div className="rummikub-meld" key={meld.id}>
            {meld.tiles.map((tile) => <RummikubTileFace tile={tile} selected={isMyTurn && selectedIds.includes(tile.id)} onClick={isMyTurn ? () => toggle(tile.id) : undefined} key={tile.id} />)}
          </div>
        )) : <div className="rummikub-empty-board">아직 테이블에 조합이 없습니다. 첫 등록은 손패만으로 30점 이상이어야 합니다.</div>}
      </div>
      <div className="rummikub-player-grid">
        {game.players.map((player) => (
          <article className={`rummikub-player-card ${game.turnPlayerId === player.id ? "rummikub-player-active" : ""}`} key={player.id}>
            {chatBubbles.filter((chat) => chat.playerId === player.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
            <PlayerBadge name={player.name} active={game.turnPlayerId === player.id} isYou={player.id === game.you.id} />
            <span className="rummikub-rack-count">{game.status === "finished" && player.id === game.you.id ? player.rummikubHand.length : player.rummikubHandCount} TILES · {player.rummikubScore > 0 ? "+" : ""}{player.rummikubScore}</span>
            {player.id === game.you.id && me ? <div className="rummikub-own-rack-summary">{game.status === "finished" ? `SCORE ${me.rummikubScore > 0 ? "+" : ""}${me.rummikubScore}` : me.rummikubInitialMelded ? "INITIAL MELD COMPLETE" : "INITIAL MELD · 30 POINTS"}</div> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

type RummikubMoveProps = {
  game: GameState;
  me?: ApiPlayer;
  busy: boolean;
  isMyTurn: boolean;
  draftMelds: ApiRummikubMeld[];
  selectedIds: string[];
  jokerSettings: Record<string, { value: number; color: RummikubColor }>;
  onSelect: (ids: string[]) => void;
  onDraft: (melds: ApiRummikubMeld[]) => void;
  onJokerSettings: (settings: Record<string, { value: number; color: RummikubColor }>) => void;
  onCommit: (melds: ApiRummikubMeld[]) => void;
  onDraw: () => void;
};

function RummikubMovePanel({ game, me, busy, isMyTurn, draftMelds, selectedIds, jokerSettings, onSelect, onDraft, onJokerSettings, onCommit, onDraw }: RummikubMoveProps) {
  const [notice, setNotice] = useState("");
  if (!me || !game.rummikub) return <p className="rail-copy">루미큐브 테이블을 준비하는 중입니다.</p>;
  if (!isMyTurn) return <p className="rail-copy">상대가 조합을 만드는 동안 테이블의 모든 조합을 확인할 수 있습니다.</p>;

  const hand = me.rummikubHand;
  const selectedFromHand = hand.filter((tile) => selectedIds.includes(tile.id));
  const selectedFromTable = draftMelds.flatMap((meld) => meld.tiles).filter((tile) => selectedIds.includes(tile.id));
  const selectedTiles = [...selectedFromTable, ...selectedFromHand];
  const toggle = (id: string) => onSelect(selectedIds.includes(id) ? selectedIds.filter((current) => current !== id) : [...selectedIds, id]);
  const makeMeld = () => {
    if (selectedTiles.length < 3) {
      setNotice("조합은 최소 3개의 타일로 만들어야 합니다.");
      return;
    }
    const nextMelds = draftMelds
      .map((meld) => ({ ...meld, tiles: meld.tiles.filter((tile) => !selectedIds.includes(tile.id)) }))
      .filter((meld) => meld.tiles.length > 0);
    nextMelds.push({ id: `meld-${Date.now()}-${Math.random().toString(16).slice(2)}`, tiles: selectedTiles });
    onDraft(nextMelds);
    onSelect([]);
    setNotice("임시 조합을 만들었습니다. 모든 조합이 올바른지 확인하세요.");
  };
  const commit = () => {
    const melds = draftMelds.map((meld) => ({
      ...meld,
      tiles: meld.tiles.map((tile) => {
        if (tile.kind !== "joker") return tile;
        const setting = jokerSettings[tile.id] ?? (tile.jokerValue && tile.jokerColor ? { value: tile.jokerValue, color: tile.jokerColor } : null);
        return { ...tile, jokerValue: setting?.value ?? null, jokerColor: setting?.color ?? null };
      }),
    }));
    const missingJoker = melds.flatMap((meld) => meld.tiles).some((tile) => tile.kind === "joker" && (!tile.jokerValue || !tile.jokerColor));
    if (missingJoker) {
      setNotice("조커가 대신할 숫자와 색을 먼저 선택하세요.");
      return;
    }
    onCommit(melds);
  };
  return (
    <div className="rummikub-move-panel">
      <div className="rummikub-move-head"><span>YOUR RACK</span><small>{hand.length} TILES · {me.rummikubInitialMelded ? "OPEN" : "NEED 30 POINTS"}</small></div>
      <div className="rummikub-rack">
        {hand.map((tile) => <RummikubTileFace tile={tile} selected={selectedIds.includes(tile.id)} onClick={() => toggle(tile.id)} key={tile.id} />)}
      </div>
      <div className="rummikub-selected-row">
        <div className="rummikub-selected-head"><span>SELECTED TILES</span><small>{selectedTiles.length} SELECTED</small></div>
        {selectedTiles.length ? selectedTiles.map((tile) => (
          <div className="rummikub-selected-item" key={tile.id}>
            <RummikubTileFace tile={tile} />
            {tile.kind === "joker" ? (
              <div className="rummikub-joker-settings">
                <select value={jokerSettings[tile.id]?.value ?? tile.jokerValue ?? ""} onChange={(event) => onJokerSettings({ ...jokerSettings, [tile.id]: { value: Number(event.target.value), color: jokerSettings[tile.id]?.color ?? tile.jokerColor ?? "red" } })} aria-label="조커 숫자">
                  <option value="">숫자</option>{Array.from({ length: 13 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}
                </select>
                <select value={jokerSettings[tile.id]?.color ?? tile.jokerColor ?? ""} onChange={(event) => onJokerSettings({ ...jokerSettings, [tile.id]: { value: jokerSettings[tile.id]?.value ?? tile.jokerValue ?? 1, color: event.target.value as RummikubColor } })} aria-label="조커 색">
                  <option value="">색</option>{(Object.keys(rummikubColorLabels) as RummikubColor[]).map((color) => <option value={color} key={color}>{rummikubColorLabels[color]}</option>)}
                </select>
              </div>
            ) : null}
          </div>
        )) : <span className="rummikub-selection-empty">손패나 테이블 타일을 눌러 조합을 구성하세요.</span>}
      </div>
      <div className="rummikub-action-row">
        <button type="button" className="outline-button" onClick={makeMeld} disabled={busy || selectedTiles.length < 3}>MAKE MELD <span>＋</span></button>
        <button type="button" className="outline-button" onClick={() => { onDraft(game.rummikub?.table ?? []); onSelect([]); setNotice("현재 테이블 상태로 되돌렸습니다."); }} disabled={busy}>RESET DRAFT</button>
      </div>
      {notice ? <p className="rummikub-notice">{notice}</p> : null}
      <button type="button" className="primary-button full-button" onClick={commit} disabled={busy}>COMMIT MELDS <span>→</span></button>
      <button type="button" className="rummikub-draw-button" onClick={onDraw} disabled={busy}>DRAW ONE TILE · END TURN <span>↓</span></button>
      <p className="rummikub-rule-copy">첫 등록은 손패만으로 30점 이상. 이후에는 테이블 조합을 자유롭게 재배열하되, 턴 종료 시 모든 조합이 유효해야 합니다.</p>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "room" | "watermelon-solo">("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [token, setToken] = useState("");
  const [resume, setResume] = useState<{ code: string; token: string; game: GameState } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [guessedKind, setGuessedKind] = useState<"number" | "joker">("number");
  const [guessedNumber, setGuessedNumber] = useState<number | null>(null);
  const [rummikubDraftMelds, setRummikubDraftMelds] = useState<ApiRummikubMeld[]>([]);
  const [rummikubSelectedIds, setRummikubSelectedIds] = useState<string[]>([]);
  const [rummikubJokerSettings, setRummikubJokerSettings] = useState<Record<string, { value: number; color: RummikubColor }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBubbles, setChatBubbles] = useState<ChatMessage[]>([]);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType>("davinci");
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [progressPopup, setProgressPopup] = useState<string | null>(null);
  const [progressTone, setProgressTone] = useState<"update" | "danger">("update");
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<Record<string, MediaStream>>({});
  const [cameraStarting, setCameraStarting] = useState(false);
  const lastLogFingerprint = useRef("");
  const revealedOwnTileIds = useRef<Set<string>>(new Set());
  const progressTimer = useRef<number | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const chatSeenIds = useRef<Set<string>>(new Set());
  const chatBubblesHydrated = useRef(false);
  const chatBubbleTimers = useRef<Record<string, number>>({});
  const versionReloadTriggered = useRef(false);
  const lobbyLeaveSent = useRef(false);
  const watermelonPending = useRef<WatermelonProgress | null>(null);
  const watermelonTimer = useRef<number | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const tokenRef = useRef("");
  const localCameraStreamRef = useRef<MediaStream | null>(null);
  const cameraPeers = useRef<Record<string, RTCPeerConnection>>({});
  const cameraOffersSent = useRef<Set<string>>(new Set());
  const pendingIce = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const cameraActionChain = useRef<Promise<unknown>>(Promise.resolve());
  const outgoingIce = useRef<Array<{ toPlayerId: string; candidate: RTCIceCandidateInit }>>([]);
  const outgoingIceTimer = useRef<number | null>(null);
  const outgoingIceFlushing = useRef(false);
  const flushIceCandidatesRef = useRef<(() => Promise<void>) | null>(null);
  const cameraReconnectTimers = useRef<Record<string, number>>({});
  const processingCameraSignalIds = useRef<Set<string>>(new Set());
  const handledCameraSignalIds = useRef<Set<string>>(new Set());
  const cameraRefreshInFlight = useRef(false);
  const latestLog = game?.log[0] ?? "";
  const logFingerprint = game?.log.slice(0, 3).join("\u0000") ?? "";
  const latestChatId = game?.chat[game.chat.length - 1]?.id ?? "";

  const reportWatermelonProgress = useCallback((progress: WatermelonProgress) => {
    const room = gameRef.current;
    const playerToken = tokenRef.current;
    if (!room || room.gameType !== "watermelon" || room.status !== "playing" || !playerToken) return;
    watermelonPending.current = progress;
    const send = () => {
      const pending = watermelonPending.current;
      watermelonPending.current = null;
      watermelonTimer.current = null;
      if (!pending) return;
      void fetch(`/api/rooms/${room.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "watermelon-progress", token: playerToken, ...pending }),
      }).then(readJson).then((state) => setGame(state as unknown as GameState)).catch(() => undefined);
    };
    if (progress.gameOver) {
      if (watermelonTimer.current !== null) window.clearTimeout(watermelonTimer.current);
      send();
    } else if (watermelonTimer.current === null) {
      watermelonTimer.current = window.setTimeout(send, 650);
    }
  }, []);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const postCameraAction = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    const run = async () => {
      const room = gameRef.current;
      const playerToken = tokenRef.current;
      if (!room || !playerToken) return null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(`/api/rooms/${room.code}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, token: playerToken, ...payload }),
          });
          return (await readJson(response)) as unknown as GameState;
        } catch (caught) {
          const conflict = caught instanceof Error && caught.message.includes("먼저 움직였습니다");
          if (!conflict || attempt === 2) throw caught;
        }
      }
      return null;
    };
    const next = cameraActionChain.current.then(run, run);
    cameraActionChain.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const flushIceCandidates = useCallback(async () => {
    if (outgoingIceFlushing.current || !outgoingIce.current.length) return;
    outgoingIceFlushing.current = true;
    const batch = outgoingIce.current.splice(0, 24);
    try {
      await postCameraAction("camera-signal-batch", {
        signals: batch.map(({ toPlayerId, candidate }) => ({
          toPlayerId,
          kind: "ice",
          signalPayload: JSON.stringify(candidate),
        })),
      });
    } catch {
      outgoingIce.current.unshift(...batch);
    } finally {
      outgoingIceFlushing.current = false;
      if (outgoingIce.current.length && outgoingIceTimer.current === null) {
        outgoingIceTimer.current = window.setTimeout(() => {
          outgoingIceTimer.current = null;
          void flushIceCandidatesRef.current?.();
        }, 35);
      }
    }
  }, [postCameraAction]);

  useEffect(() => {
    flushIceCandidatesRef.current = flushIceCandidates;
  }, [flushIceCandidates]);

  const queueIceCandidate = useCallback((playerId: string, candidate: RTCIceCandidateInit) => {
    outgoingIce.current.push({ toPlayerId: playerId, candidate });
    if (outgoingIceFlushing.current) return;
    if (outgoingIce.current.length >= 12) {
      if (outgoingIceTimer.current !== null) {
        window.clearTimeout(outgoingIceTimer.current);
        outgoingIceTimer.current = null;
      }
      void flushIceCandidates();
      return;
    }
    if (outgoingIceTimer.current === null) {
      outgoingIceTimer.current = window.setTimeout(() => {
        outgoingIceTimer.current = null;
        void flushIceCandidates();
      }, 45);
    }
  }, [flushIceCandidates]);

  const closeCameraPeer = useCallback((playerId: string) => {
    const reconnectTimer = cameraReconnectTimers.current[playerId];
    if (reconnectTimer !== undefined) {
      window.clearTimeout(reconnectTimer);
      delete cameraReconnectTimers.current[playerId];
    }
    cameraPeers.current[playerId]?.close();
    delete cameraPeers.current[playerId];
    delete pendingIce.current[playerId];
    cameraOffersSent.current.delete(playerId);
    outgoingIce.current = outgoingIce.current.filter((item) => item.toPlayerId !== playerId);
    setRemoteCameraStreams((current) => {
      if (!current[playerId]) return current;
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }, []);

  const ensureCameraPeer = useCallback((playerId: string) => {
    const existing = cameraPeers.current[playerId];
    if (existing && existing.connectionState !== "closed") return existing;
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
      ],
      iceCandidatePoolSize: 10,
    });
    localCameraStreamRef.current?.getTracks().forEach((track) => peer.addTrack(track, localCameraStreamRef.current!));
    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteCameraStreams((current) => ({ ...current, [playerId]: stream }));
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      queueIceCandidate(playerId, event.candidate.toJSON());
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "failed" || peer.connectionState === "closed") closeCameraPeer(playerId);
      if (peer.connectionState === "connected") {
        const reconnectTimer = cameraReconnectTimers.current[playerId];
        if (reconnectTimer !== undefined) {
          window.clearTimeout(reconnectTimer);
          delete cameraReconnectTimers.current[playerId];
        }
      } else if (peer.connectionState === "disconnected" && cameraReconnectTimers.current[playerId] === undefined) {
        cameraReconnectTimers.current[playerId] = window.setTimeout(() => {
          delete cameraReconnectTimers.current[playerId];
          if (cameraPeers.current[playerId] === peer && peer.connectionState === "disconnected") closeCameraPeer(playerId);
        }, 2600);
      }
    };
    cameraPeers.current[playerId] = peer;
    return peer;
  }, [closeCameraPeer, queueIceCandidate]);

  const stopCamera = useCallback((notifyServer = true) => {
    localCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    localCameraStreamRef.current = null;
    setLocalCameraStream(null);
    if (outgoingIceTimer.current !== null) {
      window.clearTimeout(outgoingIceTimer.current);
      outgoingIceTimer.current = null;
    }
    outgoingIce.current = [];
    outgoingIceFlushing.current = false;
    Object.values(cameraReconnectTimers.current).forEach((timer) => window.clearTimeout(timer));
    cameraReconnectTimers.current = {};
    processingCameraSignalIds.current.clear();
    handledCameraSignalIds.current.clear();
    Object.keys(cameraPeers.current).forEach(closeCameraPeer);
    setRemoteCameraStreams({});
    if (notifyServer) void postCameraAction("camera-disable").catch(() => undefined);
  }, [closeCameraPeer, postCameraAction]);

  const toggleCamera = useCallback(async () => {
    if (localCameraStreamRef.current) {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 카메라를 사용할 수 없습니다.");
      return;
    }
    setCameraStarting(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 10, max: 15 } }, audio: false });
      localCameraStreamRef.current = stream;
      setLocalCameraStream(stream);
      const next = await postCameraAction("camera-enable");
      if (next) setGame(next);
    } catch {
      stopCamera(false);
      setError("카메라 권한이 필요합니다. 브라우저 권한을 허용해주세요.");
    } finally {
      setCameraStarting(false);
    }
  }, [postCameraAction, stopCamera]);

  const showProgress = useCallback((message: string, tone: "update" | "danger" = "update") => {
    if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    setProgressTone(tone);
    setProgressPopup(message);
    progressTimer.current = window.setTimeout(() => {
      setProgressPopup(null);
      progressTimer.current = null;
    }, 4200);
  }, []);

  const fetchRoomState = useCallback(async (code: string, playerToken: string) => {
    const response = await fetch(`/api/rooms/${code}?token=${encodeURIComponent(playerToken)}`, {
      cache: "no-store",
    });
    const payload = (await readJson(response)) as unknown as GameState;
    return payload;
  }, []);

  const refreshRoom = useCallback(async (code: string, playerToken: string) => {
    const payload = await fetchRoomState(code, playerToken);
    setGame(payload);
    return payload;
  }, [fetchRoomState]);

  const resetChatBubbles = useCallback(() => {
    Object.values(chatBubbleTimers.current).forEach((timer) => window.clearTimeout(timer));
    chatBubbleTimers.current = {};
    chatSeenIds.current.clear();
    chatBubblesHydrated.current = false;
    setChatBubbles([]);
  }, []);

  const loadPublicRooms = useCallback(async () => {
    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const payload = (await readJson(response)) as unknown as { rooms: PublicRoom[] };
      setPublicRooms(payload.rooms);
    } catch {
      setPublicRooms([]);
    } finally {
      setLobbyLoading(false);
    }
  }, []);

  const pushRoomHistory = useCallback((code: string) => {
    const nextUrl = new URL(window.location.href);
    if (window.history.state?.davinciRoom && nextUrl.searchParams.get("room") === code) return;
    nextUrl.searchParams.set("room", code);
    window.history.pushState({ ...window.history.state, davinciRoom: true }, "", nextUrl.toString());
  }, []);

  const sendLobbyLeave = useCallback((room: GameState, playerToken: string) => {
    if (room.status !== "waiting" || !playerToken || lobbyLeaveSent.current) return;
    lobbyLeaveSent.current = true;
    void fetch(`/api/rooms/${room.code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave", token: playerToken }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  const resetToHome = useCallback((message = "") => {
    clearSavedSession();
    setGame(null);
    setToken("");
    setResume(null);
    setScreen("home");
    setError(message);
    setChatDraft("");
    resetChatBubbles();
    setProgressPopup(null);
    lastLogFingerprint.current = "";
    revealedOwnTileIds.current = new Set();
  }, [resetChatBubbles]);

  const handleExpiredRoom = useCallback(() => {
    stopCamera(false);
    resetToHome(ROOM_EXPIRED_MESSAGE);
    const homeUrl = new URL(window.location.href);
    homeUrl.searchParams.delete("room");
    window.history.replaceState({}, "", homeUrl.toString());
  }, [resetToHome, stopCamera]);

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved) return;
    void fetchRoomState(saved.code, saved.token)
      .then((payload) => setResume({ code: saved.code, token: saved.token, game: payload }))
      .catch(clearSavedSession);
  }, [fetchRoomState]);

  useEffect(() => {
    const serverVersion = game?.appVersion ?? resume?.game.appVersion;
    if (!serverVersion || serverVersion === CLIENT_APP_VERSION || versionReloadTriggered.current) return;
    versionReloadTriggered.current = true;
    if (game && token) {
      window.sessionStorage.setItem(SESSION_CODE, game.code);
      window.sessionStorage.setItem(SESSION_TOKEN, token);
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("app", serverVersion);
    window.location.replace(nextUrl.toString());
  }, [game, resume, token]);

  useEffect(() => {
    if (screen !== "room" || !game || !token) return;
    const interval = window.setInterval(() => {
      if (cameraRefreshInFlight.current) return;
      cameraRefreshInFlight.current = true;
      void refreshRoom(game.code, token)
        .catch((caught) => {
          const message = caught instanceof Error ? caught.message : "";
          if (message.includes(ROOM_EXPIRED_MESSAGE) || message.includes("방을 찾을 수 없습니다")) {
            handleExpiredRoom();
            return;
          }
          if (!message.includes("인증이 만료")) return;
          resetToHome("방장에 의해 방에서 추방되었습니다.");
          const homeUrl = new URL(window.location.href);
          homeUrl.searchParams.delete("room");
          window.history.replaceState({}, "", homeUrl.toString());
        })
        .finally(() => {
          cameraRefreshInFlight.current = false;
        });
    }, game.camera.enabledPlayerIds.length ? 450 : 2200);
    return () => window.clearInterval(interval);
  }, [game, handleExpiredRoom, refreshRoom, resetToHome, screen, token]);

  useEffect(() => {
    if (screen !== "room" || !game || !localCameraStream || !game.camera.enabledPlayerIds.includes(game.you.id)) return;
    const otherEnabled = game.camera.enabledPlayerIds.filter((id) => id !== game.you.id && game.players.some((player) => player.id === id));
    Object.keys(cameraPeers.current).filter((id) => !otherEnabled.includes(id)).forEach(closeCameraPeer);
    otherEnabled.forEach((playerId) => {
      const peer = ensureCameraPeer(playerId);
      if (game.you.id.localeCompare(playerId) >= 0 || cameraOffersSent.current.has(playerId) || peer.signalingState !== "stable") return;
      cameraOffersSent.current.add(playerId);
      void peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer).then(() => offer))
        .then((offer) => postCameraAction("camera-signal", { toPlayerId: playerId, kind: "offer", signalPayload: JSON.stringify(offer) }))
        .catch(() => cameraOffersSent.current.delete(playerId));
    });
  }, [closeCameraPeer, ensureCameraPeer, game, localCameraStream, postCameraAction, screen]);

  useEffect(() => {
    if (screen !== "room" || !game?.camera.signals.length || !localCameraStream) return;
    let cancelled = false;
    const processSignals = async () => {
      const processed: string[] = [];
      const activeSignalIds = new Set(game.camera.signals.map((signal) => signal.id));
      handledCameraSignalIds.current.forEach((signalId) => {
        if (!activeSignalIds.has(signalId)) handledCameraSignalIds.current.delete(signalId);
      });
      for (const signal of game.camera.signals) {
        if (cancelled) return;
        if (handledCameraSignalIds.current.has(signal.id)) {
          processed.push(signal.id);
          continue;
        }
        if (processingCameraSignalIds.current.has(signal.id)) continue;
        processingCameraSignalIds.current.add(signal.id);
        try {
          const peer = ensureCameraPeer(signal.fromPlayerId);
          if (signal.kind === "offer") {
            await peer.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            for (const candidate of pendingIce.current[signal.fromPlayerId] ?? []) await peer.addIceCandidate(candidate);
            pendingIce.current[signal.fromPlayerId] = [];
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await postCameraAction("camera-signal", { toPlayerId: signal.fromPlayerId, kind: "answer", signalPayload: JSON.stringify(answer) });
          } else if (signal.kind === "answer") {
            if (peer.signalingState === "have-local-offer") await peer.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
            for (const candidate of pendingIce.current[signal.fromPlayerId] ?? []) await peer.addIceCandidate(candidate);
            pendingIce.current[signal.fromPlayerId] = [];
          } else {
            const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
            if (peer.remoteDescription) await peer.addIceCandidate(candidate);
            else pendingIce.current[signal.fromPlayerId] = [...(pendingIce.current[signal.fromPlayerId] ?? []), candidate];
          }
          handledCameraSignalIds.current.add(signal.id);
          processed.push(signal.id);
        } catch {
          // Keep failed signals on the server so the next poll can retry them.
        } finally {
          processingCameraSignalIds.current.delete(signal.id);
        }
      }
      if (processed.length) await postCameraAction("camera-ack", { signalIds: processed }).catch(() => undefined);
    };
    void processSignals();
    return () => { cancelled = true; };
  }, [ensureCameraPeer, game, localCameraStream, postCameraAction, screen]);

  useEffect(() => () => stopCamera(false), [stopCamera]);

  const rummikubTurnKey = game?.gameType === "rummikub" ? `${game.code}:${game.turnNumber}` : "";

  useEffect(() => {
    if (!rummikubTurnKey || game?.gameType !== "rummikub") return;
    const table = game.rummikub?.table ? structuredClone(game.rummikub.table) : [];
    const timer = window.setTimeout(() => {
      setRummikubDraftMelds(table);
      setRummikubSelectedIds([]);
      setRummikubJokerSettings({});
    }, 0);
    return () => window.clearTimeout(timer);
  // The turn key intentionally controls draft resets; polling the same turn must preserve local edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rummikubTurnKey]);

  useEffect(() => {
    if (screen !== "room" || !game) return;
    const handleBack = () => {
      sendLobbyLeave(game, token);
      resetToHome();
    };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [game, resetToHome, screen, sendLobbyLeave, token]);

  useEffect(() => {
    if (screen !== "home") return;
    const initial = window.setTimeout(() => void loadPublicRooms(), 0);
    const interval = window.setInterval(() => void loadPublicRooms(), 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loadPublicRooms, screen]);

  useEffect(() => {
    if (screen !== "room" || !latestLog) return;
    if (lastLogFingerprint.current === logFingerprint) return;
    lastLogFingerprint.current = logFingerprint;
    showProgress(latestLog);
  }, [latestLog, logFingerprint, screen, showProgress]);

  useEffect(() => {
    if (screen !== "room" || !latestChatId || !chatListRef.current) return;
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [latestChatId, screen]);

  useEffect(() => {
    if (screen !== "room" || !game) return;
    if (!chatBubblesHydrated.current) {
      game.chat.forEach((chat) => chatSeenIds.current.add(chat.id));
      chatBubblesHydrated.current = true;
      return;
    }

    const freshMessages = game.chat.filter((chat) => !chatSeenIds.current.has(chat.id));
    game.chat.forEach((chat) => chatSeenIds.current.add(chat.id));
    freshMessages.forEach((chat) => {
      const existingTimer = chatBubbleTimers.current[chat.playerId];
      if (existingTimer !== undefined) window.clearTimeout(existingTimer);
      setChatBubbles((current) => [
        ...current.filter((bubble) => bubble.playerId !== chat.playerId),
        chat,
      ]);
      chatBubbleTimers.current[chat.playerId] = window.setTimeout(() => {
        setChatBubbles((current) => current.filter((bubble) => bubble.id !== chat.id));
        delete chatBubbleTimers.current[chat.playerId];
      }, 4200);
    });
  }, [game, latestChatId, screen]);

  useEffect(() => () => {
    if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    if (watermelonTimer.current !== null) window.clearTimeout(watermelonTimer.current);
    Object.values(chatBubbleTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const enterRoom = (payload: { code: string; playerToken: string; state: GameState }) => {
    window.sessionStorage.setItem(SESSION_CODE, payload.code);
    window.sessionStorage.setItem(SESSION_TOKEN, payload.playerToken);
    window.localStorage.removeItem(SESSION_CODE);
    window.localStorage.removeItem(SESSION_TOKEN);
    setRoomCode(payload.code);
    setToken(payload.playerToken);
    setGame(payload.state);
    setResume(null);
    setScreen("room");
    setError("");
    setChatDraft("");
    lobbyLeaveSent.current = false;
    pushRoomHistory(payload.code);
    resetChatBubbles();
    lastLogFingerprint.current = "";
    revealedOwnTileIds.current = new Set();
  };

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, gameType: selectedGame }),
      });
      enterRoom((await readJson(response)) as unknown as { code: string; playerToken: string; state: GameState });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoomByCode = async (code: string) => {
    if (!name.trim()) {
      setError("공개 로비에 입장하려면 닉네임을 먼저 입력해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name, code }),
      });
      enterRoom((await readJson(response)) as unknown as { code: string; playerToken: string; state: GameState });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방에 들어가지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (event: FormEvent) => {
    event.preventDefault();
    await joinRoomByCode(roomCode);
  };

  const doAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!game) return;
    if (!token) {
      setError("플레이어 세션을 다시 연결하지 못했습니다. 화면을 새로고침해주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${game.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token, ...payload }),
      });
      setGame((await readJson(response)) as unknown as GameState);
      if (action === "guess" || action === "restart" || action === "return-lobby") {
        setSelectedTarget("");
        setSelectedSlot(null);
        setGuessedKind("number");
        setGuessedNumber(null);
        if (action === "restart" || action === "return-lobby") setProgressPopup(null);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "동작을 처리하지 못했습니다.";
      if (message.includes(ROOM_EXPIRED_MESSAGE) || message.includes("방을 찾을 수 없습니다")) handleExpiredRoom();
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message || busy) return;
    setChatDraft("");
    await doAction("send-chat", { message });
  };

  const leaveRoom = () => {
    if (!game) return;
    const hasRoomHistory = Boolean(window.history.state?.davinciRoom);
    stopCamera();
    sendLobbyLeave(game, token);
    resetToHome();
    if (hasRoomHistory) {
      window.history.back();
    } else {
      const homeUrl = new URL(window.location.href);
      homeUrl.searchParams.delete("room");
      window.history.replaceState({}, "", homeUrl.toString());
    }
  };

  const copyCode = async () => {
    if (!game) return;
    await navigator.clipboard?.writeText(game.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const me = game?.players.find((player) => player.id === game.you.id);
  const opponents = game?.players.filter((player) => player.id !== game.you.id) ?? [];
  const isRobo = game?.gameType === "robo77";
  const isRummikub = game?.gameType === "rummikub";
  const isWatermelon = game?.gameType === "watermelon";
  const isDalmuti = game?.gameType === "dalmuti";
  const roomCapacity = game?.gameType === "robo77" || game?.gameType === "dalmuti" ? 8 : 4;
  const isMyTurn = Boolean(game && game.turnPlayerId === game.you.id);
  const selectedOpponent = opponents.find((player) => player.id === selectedTarget);
  const winner = game?.players.find((player) => player.id === game.winnerId);
  const setupPlayer = game?.players.find((player) => player.id === game.setupPlayerId);
  const statusLabel = game?.status === "waiting" ? "LOBBY" : game?.status === "drawing" ? "INITIAL DRAW" : game?.status === "placing" ? "JOKER SETUP" : game?.status === "finished" ? "FINISHED" : "LIVE GAME";
  const exposedTileCount = me?.hand.filter((tile) => tile.revealed).length ?? 0;

  useEffect(() => {
    if (screen !== "room" || !me) return;
    const currentIds = new Set(me.hand.filter((tile) => tile.revealed).map((tile) => tile.id));
    const newlyExposed = me.hand.filter((tile) => tile.revealed && !revealedOwnTileIds.current.has(tile.id));
    revealedOwnTileIds.current = currentIds;
    if (!newlyExposed.length) return;
    const descriptions = newlyExposed.map((tile) => `${tile.color === "black" ? "검정" : "흰색"} ${tile.kind === "joker" ? "조커" : tile.number}`).join(", ");
    showProgress(`내 ${descriptions} 타일이 공개되었습니다.`, "danger");
  }, [me, screen, showProgress]);

  const helperCopy = (() => {
    if (!game) return "";
    if (game.gameType === "dalmuti") {
      const dalmuti = game.dalmuti;
      if (game.status === "finished") return `${winner?.name ?? "승자"}님이 이번 판의 위대한 달무티가 되었습니다.`;
      if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 달무티를 시작하세요." : "방장이 게임을 시작할 때까지 기다려주세요.";
      if (game.status === "drawing") return dalmuti?.setupDraws.some((draw) => draw.playerId === game.you.id) ? "자리 카드를 뽑았습니다. 모두의 추첨을 기다리는 중입니다." : "첫 판의 자리 카드를 한 장 뽑으세요.";
      if (dalmuti?.phase === "tax") {
        if (dalmuti.tax.revolutionEligible && !dalmuti.tax.greaterDone && !dalmuti.tax.lesserDone) return "광대 두 장을 가졌다면 혁명을 선언할 수 있습니다.";
        if (dalmuti.tax.greaterDalmutiId === game.you.id && !dalmuti.tax.greaterDone) return "농노에게 줄 카드 2장을 고르세요.";
        if (dalmuti.tax.lesserDalmutiId === game.you.id && !dalmuti.tax.lesserDone) return "광부에게 줄 카드 1장을 고르세요.";
        return "계급 세금이 모두 교환되면 첫 세트가 시작됩니다.";
      }
      if (isMyTurn) return dalmuti?.leadCount ? `${dalmuti.leadCount}장의 더 낮은 계급을 내거나 패스하세요.` : "같은 계급의 카드 한 장 이상으로 새 세트를 시작하세요.";
      return `${game.players.find((player) => player.id === game.turnPlayerId)?.name ?? "상대"}님이 세트를 고르는 중입니다.`;
    }
    if (game.gameType === "watermelon") {
      if (game.status === "finished") return `${winner?.name ?? "승자"}님이 수박 합성 대전에서 승리했습니다.`;
      if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 수박 합성 대전을 시작하세요." : "방장이 대전을 시작할 때까지 기다려주세요.";
      return me?.watermelonGameOver ? `보드가 넘쳤습니다. ${me.watermelonScore.toLocaleString()}점으로 다른 플레이어를 지켜보세요.` : "과일을 합쳐 수박을 만들고 끝까지 살아남으세요.";
    }
    if (game.gameType === "rummikub") {
      if (game.status === "finished") return `${winner?.name ?? "승자"}님이 루미큐브에서 승리했습니다.`;
      if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 루미큐브를 시작하세요." : "방장이 게임을 시작할 때까지 기다려주세요.";
      if (isMyTurn) return me?.rummikubInitialMelded ? "조합을 재배열하거나 손패를 추가한 뒤 등록하세요." : "손패에서 30점 이상을 만들어 첫 등록하세요.";
      return `${game.players.find((player) => player.id === game.turnPlayerId)?.name ?? "상대"}님이 조합을 만드는 중입니다.`;
    }
    if (game.gameType === "robo77") {
      if (game.status === "finished") return `${winner?.name ?? "승자"}님이 마지막까지 살아남았습니다.`;
      if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 로보77을 시작하세요." : "방장이 게임을 시작할 때까지 기다려주세요.";
      if (isMyTurn) {
        if ((game.robo?.pendingCards ?? 0) > 0) return `×2 효과: 강제 두 장 중 ${(game.robo?.pendingCards ?? 0) === 2 ? "첫 번째" : "두 번째"} 카드를 내세요.`;
        return "카드 한 장을 내고 현재 합계를 선언하세요.";
      }
      return `${game.players.find((player) => player.id === game.turnPlayerId)?.name ?? "상대"}님이 카드를 고르는 중입니다.`;
    }
    if (game.status === "finished") return `${winner?.name ?? "승자"}님이 코드를 완성했습니다.`;
    if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 게임을 시작하세요." : "방장이 게임을 시작할 때까지 기다려주세요.";
    if (game.status === "drawing") return game.setupPlayerId === game.you.id ? "흰색과 검정색으로 시작 패를 고르세요." : `${setupPlayer?.name ?? "상대"}님이 시작 패를 고르는 중입니다.`;
    if (game.status === "placing") return game.setupPlayerId === game.you.id ? "조커를 원하는 위치에 넣으세요." : `${setupPlayer?.name ?? "상대"}님이 조커 위치를 정하는 중입니다.`;
    if (game.penaltyPending) return "오답입니다. 자기 비공개 타일 하나를 공개하세요.";
    if (isMyTurn && !game.turnDrawn) return "먼저 타일을 하나 뽑으세요.";
    if (isMyTurn) return "상대 타일을 고르고 숨겨진 숫자를 추리하세요.";
    return `${game.players.find((player) => player.id === game.turnPlayerId)?.name ?? "상대"}님이 생각 중입니다.`;
  })();

  if (screen === "watermelon-solo") {
    return (
      <main className="app-shell watermelon-solo-shell">
        <header className="topbar room-topbar"><button className="wordmark wordmark-button" onClick={() => setScreen("home")}><span className="wordmark-mark">WM</span><span>WATERMELON MERGE</span></button><span className="status-pill status-pill-live"><i /> SOLO PLAY</span></header>
        <section className="watermelon-solo-stage"><div className="stage-heading"><div><span className="eyebrow">SOLO FRUIT LAB</span><h1>합치고, 굴리고,<br />수박까지 키우세요.</h1></div></div><WatermelonGame /></section>
      </main>
    );
  }

  if (screen === "room" && game) {
    return (
      <main className="app-shell room-shell">
        <header className="topbar room-topbar">
          <button className="wordmark wordmark-button" onClick={leaveRoom} aria-label="홈으로 돌아가기">
            <span className="wordmark-mark">{isDalmuti ? "D" : isRobo ? "77" : isRummikub ? "R" : isWatermelon ? "WM" : "DC"}</span>
            <span>{gameName(game.gameType)}</span>
          </button>
          <div className="room-topbar-right">
            <span className={`status-pill ${game.status !== "waiting" && game.status !== "finished" ? "status-pill-live" : ""}`}>
              <i /> {statusLabel}
            </span>
            <span className="room-code-label">ROOM <strong>{game.code}</strong></span>
            <button className="ghost-button compact-button" onClick={copyCode}>
              {copied ? "COPIED" : "COPY CODE"}
            </button>
          </div>
        </header>

        <div className="room-layout">
          <section className="game-stage">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">{isDalmuti ? `DALMUTI · HAND ${String(game.dalmuti?.handNumber ?? 0).padStart(2, "0")}` : isWatermelon ? "WATERMELON MERGE · LIVE RANK" : isRobo ? `ROBO 77 · ROUND ${String(game.robo?.roundNumber ?? 0).padStart(2, "0")}` : isRummikub ? `RUMMIKUB · TURN ${String(game.turnNumber).padStart(2, "0")}` : game.status === "drawing" || game.status === "placing" ? "INITIAL HAND · 4 TILES" : `DEDUCTION TABLE · TURN ${String(game.turnNumber).padStart(2, "0")}`}</span>
              <h1>{helperCopy}</h1>
            </div>
              <div className="deck-counter"><span className="deck-icon">{isDalmuti ? "♠" : isWatermelon ? "●" : "▦"}</span><span>{isDalmuti ? me?.dalmutiHandCount ?? 0 : isWatermelon ? me?.watermelonScore ?? 0 : isRobo ? game.robo?.deckCount ?? 0 : isRummikub ? game.rummikub?.poolCount ?? 0 : game.deckCount}<small>{isDalmuti ? " cards in hand" : isWatermelon ? " points" : isRobo ? " cards left" : " tiles left"}</small></span></div>
            </div>

            {game.status === "waiting" ? (
              <div className="lobby-panel">
                <div className="lobby-intro">
                  <span className="lobby-kicker">YOUR PRIVATE TABLE</span>
                  <h2>Invite your fellow<br /><em>{isDalmuti ? "rank climbers." : isWatermelon ? "fruit makers." : isRobo ? "risk takers." : isRummikub ? "tile shapers." : "code breakers."}</em></h2>
                  <p>{isDalmuti ? "80장의 카드를 모두 나누고, 세금과 혁명을 거쳐 손패를 가장 먼저 비우세요. 4명부터 8명까지 함께할 수 있습니다." : isWatermelon ? "각자 독립된 과일 상자에서 동시에 플레이합니다. 가장 오래 살아남거나 가장 높은 점수를 만드세요." : isRobo ? "카드를 내며 합계를 관리하세요. 2명부터 8명까지 함께할 수 있습니다." : isRummikub ? "14장의 타일로 시작해 조합을 만들고 손패를 가장 먼저 비우세요. 2명부터 4명까지 함께할 수 있습니다." : "Share the five-letter room code. Once two to four players are seated, the host can deal the first hand."}</p>
                  <button className="share-code" onClick={copyCode}><span>{game.code}</span><small>{copied ? "Copied" : "Tap to copy"} ↗</small></button>
                </div>
                <div className="seat-grid">
                  {game.players.map((player, index) => (
                    <div className="seat occupied" key={player.id}>
                      {chatBubbles.filter((chat) => chat.playerId === player.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
                      <span className="seat-number">0{index + 1}</span>
                      <PlayerBadge name={player.name} active={false} isYou={player.id === game.you.id} />
                      {player.isHost ? <span className="host-tag">HOST</span> : null}
                      {game.you.isHost && !player.isHost ? (
                        <button
                          type="button"
                          className="kick-player-button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`${player.name}님을 방에서 추방할까요?`)) {
                              void doAction("kick", { targetPlayerId: player.id });
                            }
                          }}
                          aria-label={`${player.name}님 추방`}
                        >KICK ×</button>
                      ) : null}
                    </div>
                  ))}
                  {Array.from({ length: roomCapacity - game.players.length }).map((_, index) => (
                    <div className="seat seat-open" key={`open-${index}`}>
                      <span className="seat-number">0{game.players.length + index + 1}</span>
                      <span className="open-seat-mark">＋</span>
                      <span>OPEN SEAT</span>
                    </div>
                  ))}
                </div>
                <div className="lobby-footer">
                  <span><i className="live-dot" /> Waiting for players · {game.players.length}/{roomCapacity} seated</span>
                  {game.you.isHost ? (
                    <button className="primary-button" onClick={() => void doAction("start")} disabled={busy || game.players.length < (isDalmuti ? 4 : 2)}>
                      START GAME <span>→</span>
                    </button>
                  ) : <span className="waiting-note">The host will start the game.</span>}
                </div>
              </div>
            ) : isDalmuti ? (
              <DalmutiGame game={game} busy={busy} chatBubbles={chatBubbles} onAction={(action, payload) => void doAction(action, payload)} />
            ) : isWatermelon ? (
              <div className="watermelon-multiplayer">
                <WatermelonGame disabled={game.status === "finished" || Boolean(me?.watermelonGameOver)} onProgress={reportWatermelonProgress} />
                <div className="watermelon-leaderboard"><span className="eyebrow">LIVE SCOREBOARD</span>{[...game.players].sort((a, b) => b.watermelonScore - a.watermelonScore).map((player, index) => <div className={`watermelon-rank ${player.id === game.you.id ? "watermelon-rank-me" : ""}`} key={player.id}><strong>{String(index + 1).padStart(2, "0")}</strong><span>{player.name}<small>{player.watermelonGameOver ? "OVERFLOW" : "PLAYING"}</small></span><b>{player.watermelonScore.toLocaleString()}</b></div>)}</div>
              </div>
            ) : isRummikub ? (
              <RummikubTable game={game} me={me} isMyTurn={isMyTurn} chatBubbles={chatBubbles} draftMelds={rummikubDraftMelds} selectedIds={rummikubSelectedIds} onSelect={setRummikubSelectedIds} />
            ) : isRobo ? (
              <RoboTable game={game} chatBubbles={chatBubbles} isMyTurn={isMyTurn} />
            ) : (
              <div className="table-panel">
                <div className="opponent-list">
                  {opponents.map((player, index) => {
                    const targetable = isMyTurn && !game.penaltyPending && game.turnDrawn && (game.turnDraw?.kind !== "joker" || game.turnDrawPosition !== null);
                    const selected = selectedTarget === player.id;
                    return (
                      <article className={`opponent-card ${selected ? "opponent-card-selected" : ""}`} key={player.id}>
                        {chatBubbles.filter((chat) => chat.playerId === player.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
                        <div className="opponent-head">
                          <PlayerBadge name={player.name} active={game.turnPlayerId === player.id} />
                          <span className="hidden-count">{game.status === "finished" ? `${player.hand.length} REVEALED` : `${player.hand.filter((tile) => tile.kind === "hidden").length} HIDDEN`}</span>
                        </div>
                        <div className="opponent-hand" aria-label={`${player.name}님의 타일`}>
                          {player.hand.map((tile, slotIndex) => (
                            <button
                              className={`tile-button ${selectedTarget === player.id && selectedSlot === slotIndex ? "tile-button-selected" : ""}`}
                              key={tile.id}
                              onClick={() => {
                                if (!targetable || tile.kind !== "hidden") return;
                                setSelectedTarget(player.id);
                                setSelectedSlot(slotIndex);
                              }}
                              disabled={!targetable || tile.kind !== "hidden"}
                              aria-label={tile.kind === "hidden" ? `${player.name}의 ${slotIndex + 1}번째 타일 선택` : `${player.name}의 공개된 타일`}
                            >
                              <TileFace tile={tile} />
                              {game.status === "finished" && tile.revealed ? <span className="exposed-label tile-status-label">EXPOSED</span> : null}
                              {game.status === "finished" && tile.revealedAtEnd ? <span className="end-reveal-label tile-status-label">END REVEAL</span> : null}
                              {selectedTarget === player.id && selectedSlot === slotIndex ? <span className="target-corner">TARGET</span> : null}
                            </button>
                          ))}
                        </div>
                        {targetable ? <span className="opponent-hint">Select a hidden tile to investigate</span> : null}
                        {index === 0 && opponents.length > 1 ? <div className="card-rule" /> : null}
                      </article>
                    );
                  })}
                </div>
                {game.status === "finished" ? (
                  <div className="finish-legend" aria-label="게임 종료 공개 표시 안내">
                    <span><i className="legend-exposed" /> EXPOSED · 게임 중 공개</span>
                    <span><i className="legend-end-reveal" /> END REVEAL · 종료 후 공개</span>
                  </div>
                ) : null}
                <div className="your-hand">
                  {chatBubbles.filter((chat) => chat.playerId === game.you.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
                  <div className="your-hand-heading">
                    <div><span className="eyebrow">YOUR CODE</span><strong>{me?.name}</strong></div>
                    <div className="hand-status">
                      <span className={`code-security ${exposedTileCount ? "code-security-breached" : ""}`}>{exposedTileCount ? `${exposedTileCount} EXPOSED` : "CODE SECURE"}</span>
                      <span className={`hand-note ${game.penaltyPending ? "hand-note-alert" : ""}`}>{game.status === "finished" ? "EXPOSED / END REVEAL marked below." : game.penaltyPending ? "Choose one hidden tile to reveal." : "Your tiles are always visible to you."}</span>
                    </div>
                  </div>
                  <div className="your-tiles">
                    {me?.hand.map((tile, slotIndex) => {
                      const isDrawn = tile.id === game.turnDraw?.id;
                      const canReveal = game.penaltyPending && !tile.revealed;
                      return (
                        <div
                          className={`own-tile-wrap ${isDrawn ? "own-tile-drawn" : ""} ${canReveal ? "own-tile-revealable" : ""} ${tile.revealed ? "own-tile-exposed" : ""}`}
                          key={tile.id}
                          role={canReveal ? "button" : undefined}
                          tabIndex={canReveal ? 0 : undefined}
                          aria-label={canReveal ? `${slotIndex + 1}번째 자기 타일 공개` : undefined}
                          onClick={() => { if (canReveal && !busy) void doAction("reveal-penalty", { slotIndex }); }}
                          onKeyDown={(event) => {
                            if (canReveal && !busy && (event.key === "Enter" || event.key === " ")) {
                              event.preventDefault();
                              void doAction("reveal-penalty", { slotIndex });
                            }
                          }}
                        >
                          {isDrawn ? <span className="drawn-label">DRAWN</span> : null}
                          <TileFace tile={tile} />
                          {canReveal ? <span className="reveal-label">REVEAL</span> : null}
                          {tile.revealed ? <span className="exposed-label">EXPOSED</span> : null}
                          {game.status === "finished" && tile.revealedAtEnd ? <span className="end-reveal-label">END REVEAL</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="control-rail">
            <div className="rail-section turn-section">
              <span className="eyebrow">YOUR MOVE</span>
              <div className="turn-title-row"><h2>{game.status === "finished" ? "Game over" : game.status === "drawing" ? "Initial draw" : game.status === "placing" ? "Joker setup" : isMyTurn ? "Your turn" : "Watch the table"}</h2><span className={`turn-orb ${isMyTurn ? "turn-orb-active" : ""}`} /></div>
              {game.status === "finished" ? (
                <div className="winner-card">
                  <span className="winner-star">✦</span>
                  <strong>{winner?.name ?? "Winner"}</strong>
                  <span className="winner-caption">{isDalmuti ? "claimed the highest seat" : isWatermelon ? "grew the best fruit box" : isRobo ? "survived the table" : isRummikub ? "emptied the rack" : "cracked the code"}</span>
                  {game.you.isHost ? (
                    <div className="finish-actions">
                      <button className="primary-button full-button" onClick={() => void doAction("restart")} disabled={busy}>RESTART GAME <span>↻</span></button>
                      <button className="outline-button full-button" onClick={() => void doAction("return-lobby")} disabled={busy}>RETURN TO LOBBY <span>↗</span></button>
                    </div>
                  ) : <p className="finish-waiting">방장이 다음 게임을 선택할 때까지 기다려주세요.</p>}
                </div>
              ) : game.status === "waiting" ? (
                <p className="rail-copy">The table is ready when everyone has a seat. Keep this tab open while you share the code.</p>
              ) : isDalmuti ? (
                <div className="dalmuti-rail"><p className="rail-copy">같은 장수의 더 낮은 숫자만 이깁니다. 모두가 패스하면 마지막으로 낸 사람이 새 세트를 엽니다.</p><p className="dalmuti-rail-note">광대는 혼자 내면 13, 다른 계급과 함께 내면 그 계급으로 변합니다.</p></div>
              ) : isWatermelon ? (
                <div className="watermelon-rail"><p className="rail-copy">모든 플레이어가 동시에 진행합니다. 위험선 위에 과일이 오래 머물면 탈락하며, 마지막 생존자가 승리합니다.</p><div className="watermelon-evolution"><span>FRUIT EVOLUTION</span><p>🍒 → 🍓 → 🍇 → 🍊 → 🟠 → 🍎 → 🍐 → 🍑 → 🍍 → 🍈 → 🍉</p><small>같은 크기의 과일 두 개가 닿으면 다음 단계로 합쳐집니다.</small></div></div>
              ) : isRummikub ? (
                <RummikubMovePanel
                  game={game}
                  me={me}
                  busy={busy}
                  isMyTurn={isMyTurn}
                  draftMelds={rummikubDraftMelds}
                  selectedIds={rummikubSelectedIds}
                  jokerSettings={rummikubJokerSettings}
                  onSelect={setRummikubSelectedIds}
                  onDraft={setRummikubDraftMelds}
                  onJokerSettings={setRummikubJokerSettings}
                  onCommit={(melds) => void doAction("rummikub-commit", { melds })}
                  onDraw={() => void doAction("rummikub-draw")}
                />
              ) : isRobo ? (
                <RoboMovePanel game={game} me={me} isMyTurn={isMyTurn} busy={busy} onPlay={(cardId) => void doAction("robo-play", { cardId })} />
              ) : game.status === "drawing" && game.setupPlayerId === game.you.id ? (
                <InitialDrawPanel
                  drawCount={game.setupDrawCount}
                  drawnColors={game.setupDrawColors}
                  colorCounts={game.initialColorCounts}
                  onDraw={(color) => void doAction("draw-initial", { color })}
                  busy={busy}
                />
              ) : game.status === "placing" && game.setupPlayerId === game.you.id && me && game.pendingJokers[0] ? (
                <JokerPlacementPanel
                  hand={me.hand}
                  joker={game.pendingJokers[0]}
                  onPlace={(position) => void doAction("place-joker", { position })}
                  busy={busy}
                />
              ) : game.status === "drawing" || game.status === "placing" ? (
                <SetupWaitingPanel
                  playerName={setupPlayer?.name ?? "상대"}
                />
              ) : !isMyTurn ? (
                <p className="rail-copy">You can watch the revealed tiles and update your theory while the active player makes a move.</p>
              ) : game.penaltyPending ? (
                <p className="rail-copy penalty-copy">The deck is empty and your guess missed. Select one unrevealed tile in <em>your code</em> to expose it.</p>
              ) : !game.turnDrawn ? (
                <>
                  <p className="rail-copy">Every turn begins with one blind draw. If your guess misses, that tile joins your code.</p>
                  <button className="primary-button full-button" onClick={() => void doAction("draw")} disabled={busy}>DRAW A TILE <span>↓</span></button>
                </>
              ) : game.turnDraw?.kind === "joker" && game.turnDrawPosition === null && me ? (
                <JokerPlacementPanel
                  hand={me.hand}
                  joker={game.turnDraw}
                  onPlace={(position) => void doAction("place-drawn-joker", { position })}
                  busy={busy}
                  drawMode
                />
              ) : (
                <GuessPanel
                  selectedOpponent={selectedOpponent}
                  selectedSlot={selectedSlot}
                  guessedKind={guessedKind}
                  guessedNumber={guessedNumber}
                  onKind={(kind) => {
                    setGuessedKind(kind);
                    setGuessedNumber(null);
                  }}
                  onNumber={setGuessedNumber}
                  onGuess={() => void doAction("guess", { targetPlayerId: selectedTarget, slotIndex: selectedSlot, kind: guessedKind, number: guessedKind === "number" ? guessedNumber : null })}
                  onEndTurn={() => void doAction("end-turn")}
                  guessDisabled={busy || !selectedOpponent || selectedSlot === null || (guessedKind === "number" && guessedNumber === null)}
                  endTurnDisabled={busy || !game.turnCanEnd}
                />
              )}
            </div>

            <section className="chat-section" aria-label="방 채팅">
              <div className="chat-heading">
                <span className="eyebrow">ROOM CHAT</span>
                <span>{game.chat.length ? `${game.chat.length} MESSAGES` : "LIVE"}</span>
              </div>
              <div className="chat-list" ref={chatListRef} aria-live="polite">
                {game.chat.length ? game.chat.map((chat) => (
                  <article className={`chat-message ${chat.playerId === game.you.id ? "chat-message-me" : ""}`} key={chat.id}>
                    <div className="chat-message-meta"><strong>{chat.playerId === game.you.id ? "YOU" : chat.playerName}</strong><time>{formatChatTime(chat.createdAt)}</time></div>
                    <p>{chat.message}</p>
                  </article>
                )) : <p className="chat-empty">첫 메시지를 남겨보세요.</p>}
              </div>
              <form className="chat-form" onSubmit={sendChat}>
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="메시지 입력..."
                  aria-label="채팅 메시지 입력"
                  maxLength={240}
                  disabled={busy}
                />
                <button type="submit" aria-label="채팅 보내기" disabled={busy || !chatDraft.trim()}>↗</button>
              </form>
            </section>

            <button className="leave-button" onClick={leaveRoom}>LEAVE TABLE <span>↗</span></button>
          </aside>
        </div>
        <aside className="camera-dock" aria-label="플레이어 카메라">
          <div className="camera-dock-head">
            <span><i /> PLAYER CAM</span>
            <button type="button" onClick={() => void toggleCamera()} disabled={cameraStarting}>
              {cameraStarting ? "STARTING…" : localCameraStream ? "CAM OFF" : "CAM ON"}
            </button>
          </div>
          <div className="camera-grid">
            {localCameraStream ? (
              <div className="camera-tile camera-tile-local">
                <CameraVideo stream={localCameraStream} muted label={game.you.name} />
                <span>{game.you.name} · YOU</span>
              </div>
            ) : (
              <div className="camera-tile camera-tile-off"><strong>{game.you.name.slice(0, 1).toUpperCase()}</strong><span>{game.you.name} · CAM OFF</span></div>
            )}
            {game.camera.enabledPlayerIds.filter((id) => id !== game.you.id).map((playerId) => {
              const player = game.players.find((candidate) => candidate.id === playerId);
              const stream = remoteCameraStreams[playerId];
              if (!player) return null;
              return stream ? (
                <div className="camera-tile" key={playerId}><CameraVideo stream={stream} muted={false} label={player.name} /><span>{player.name}</span></div>
              ) : (
                <div className="camera-tile camera-tile-connecting" key={playerId}><strong>···</strong><span>{player.name} · CONNECTING</span></div>
              );
            })}
          </div>
        </aside>
        {progressPopup ? (
          <div className={`game-progress-popup ${progressTone === "danger" ? "progress-popup-danger" : ""}`} role="status" aria-live="assertive">
            <div className="progress-popup-head"><span className="live-dot" /><span>{progressTone === "danger" ? "CODE EXPOSED" : "TABLE UPDATE"}</span><small>TURN {String(game.turnNumber).padStart(2, "0")}</small></div>
            <p>{progressPopup}</p>
            <button onClick={() => setProgressPopup(null)} aria-label="게임 진행 팝업 닫기">×</button>
            <span className="progress-popup-timer" aria-hidden="true" />
          </div>
        ) : null}
        {error ? <div className="toast error-toast" role="alert">{error}<button onClick={() => setError("")}>×</button></div> : null}
      </main>
    );
  }

  return (
    <main className="app-shell home-shell">
      <header className="topbar">
          <div className="wordmark"><span className="wordmark-mark">TH</span><span>TABLEHOUSE</span></div>
          <div className="topbar-meta"><span className="live-dot" /> MULTIPLAYER GAMES <span className="topbar-slash">/</span> DA VINCI · ROBO 77 · RUMMIKUB · WATERMELON · DALMUTI</div>
      </header>

      <div className="hero-grid">
        <section className="hero-copy">
          <span className="eyebrow hero-eyebrow">A MODERN DEDUCTION TABLE</span>
          <h1>Read the room.<br /><em>Crack the code.</em></h1>
          <p className="hero-lede">A shared table for sharp minds, hidden numbers, and the one card you should never play.</p>
          <div className="hero-details"><span>01</span><p>Hide your sequence.<br />Study every reveal.</p><span className="hero-line" /></div>
        </section>

        <section className="hero-art" aria-label="A stack of game tiles">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="art-caption art-caption-top">THE TABLE IS<br /><strong>ALWAYS WATCHING</strong></div>
          <div className="art-tile art-tile-back"><span>?</span></div>
          <div className="art-tile art-tile-mid"><small>BLACK</small><strong>7</strong><i /></div>
          <div className="art-tile art-tile-front"><small>WHITE</small><strong>4</strong><i /></div>
          <div className="art-caption art-caption-bottom"><span>NO LUCK.</span><strong>JUST LOGIC.</strong></div>
          <span className="art-plus plus-a">+</span><span className="art-plus plus-b">+</span>
        </section>
      </div>

      <section className="game-selector" aria-label="게임 선택">
        <div>
          <span className="eyebrow">CHOOSE YOUR TABLE</span>
          <p>{gameDescription(selectedGame)}</p>
        </div>
        <div className="game-selector-buttons">
          {(["davinci", "robo77", "rummikub", "watermelon", "dalmuti"] as GameType[]).map((gameType) => (
            <button key={gameType} type="button" className={selectedGame === gameType ? "game-selector-active" : ""} onClick={() => setSelectedGame(gameType)}>
              <span>{gameType === "dalmuti" ? "D" : gameType === "robo77" ? "77" : gameType === "rummikub" ? "R" : gameType === "watermelon" ? "WM" : "DC"}</span><strong>{gameName(gameType)}</strong><small>{gameType === "watermelon" ? "SOLO · 2—4 MULTI" : gameType === "robo77" || gameType === "dalmuti" ? "4—8 PLAYERS" : "2—4 PLAYERS"}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="entry-grid">
        <form className="entry-card create-card" onSubmit={createRoom}>
          <div className="entry-card-top"><span className="entry-index">01</span><span className="entry-status">NEW TABLE</span></div>
          <h2>Deal a new<br /><em>{selectedGame === "davinci" ? "hand." : "round."}</em></h2>
          <label>YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ada" maxLength={18} /></label>
          <button className="primary-button full-button" disabled={busy || !name.trim()}>CREATE {gameName(selectedGame)} <span>→</span></button>
          {selectedGame === "watermelon" ? <button type="button" className="outline-button full-button watermelon-solo-button" onClick={() => setScreen("watermelon-solo")}>PLAY SOLO NOW <span>●</span></button> : null}
        </form>
        <form className="entry-card join-card" onSubmit={joinRoom}>
          <div className="entry-card-top"><span className="entry-index">02</span><span className="entry-status">JOIN A TABLE</span></div>
          <h2>Step into<br /><em>the room.</em></h2>
          <label>YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Grace" maxLength={18} /></label>
          <label>ROOM CODE<input className="code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="ABCDE" maxLength={5} /></label>
          <button className="outline-button full-button" disabled={busy || !name.trim() || roomCode.length !== 5}>JOIN ROOM <span>→</span></button>
        </form>
      </section>

      <section className="public-lobby" aria-labelledby="public-lobby-title">
        <div className="public-lobby-head">
          <div>
            <span className="eyebrow">PUBLIC LOBBY</span>
            <h2 id="public-lobby-title">코드 없이 바로 참가</h2>
          </div>
          <button type="button" onClick={() => void loadPublicRooms()} disabled={lobbyLoading}>REFRESH ↻</button>
        </div>
        <p className="public-lobby-note">닉네임을 입력한 뒤 대기 중인 방을 선택하세요.</p>
        <div className="public-room-list" aria-live="polite">
          {lobbyLoading ? (
            <div className="public-room-empty">대기 중인 방을 불러오는 중입니다.</div>
          ) : publicRooms.filter((room) => room.gameType === selectedGame).length ? publicRooms.filter((room) => room.gameType === selectedGame).map((room) => (
            <article className="public-room-card" key={room.code}>
              <div className="public-room-status"><i className="live-dot" /><span>WAITING</span></div>
              <span className="public-room-game">{gameName(room.gameType)}</span>
              <strong>{room.hostName}님의 방</strong>
              <span className="public-room-code">ROOM {room.code}</span>
              <div className="public-room-footer">
                <span>{room.playerCount} / {room.capacity} PLAYERS</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGame(room.gameType);
                    setRoomCode(room.code);
                    void joinRoomByCode(room.code);
                  }}
                  disabled={busy || !name.trim()}
                >JOIN →</button>
              </div>
            </article>
          )) : (
            <div className="public-room-empty">{gameName(selectedGame)} 대기 방이 없습니다. 새 방을 만들어보세요.</div>
          )}
        </div>
      </section>

      {resume ? (
        <button className="resume-card" onClick={() => {
          setGame(resume.game);
          setRoomCode(resume.code);
          setToken(resume.token);
          setResume(null);
          setScreen("room");
          setError("");
          lobbyLeaveSent.current = false;
          pushRoomHistory(resume.code);
          resetChatBubbles();
          lastLogFingerprint.current = "";
          revealedOwnTileIds.current = new Set();
        }}>
          <span className="resume-mark">↗</span><span><small>LAST TABLE</small><strong>{resume.code} · {resume.game.players.length} players</strong></span><span className="resume-arrow">CONTINUE →</span>
        </button>
      ) : null}

      <footer className="home-footer"><span>BUILT FOR THE SUSPICIOUS</span><span>© 2026 · KEEP YOUR CODE CLOSE</span><span className="footer-symbol">✦</span></footer>
      {error ? <div className="toast error-toast" role="alert">{error}<button onClick={() => setError("")}>×</button></div> : null}
    </main>
  );
}

function RoboCardFace({ card, small = false }: { card: ApiRoboCard; small?: boolean }) {
  const isSpecial = card.kind !== "number";
  return (
    <div className={`robo-card robo-card-${card.kind} ${small ? "robo-card-small" : ""}`} aria-label={`로보77 ${card.label} 카드`}>
      <span>{card.label}</span>
      <small>{isSpecial ? card.kind === "minus10" ? "SUBTRACT" : card.kind === "double" ? "DOUBLE" : "TURN" : "ADD"}</small>
      <i aria-hidden="true" />
    </div>
  );
}

function RoboChips({ chips, eliminated }: { chips: number; eliminated: boolean }) {
  return (
    <span className="robo-chips" aria-label={`${chips}개 칩${eliminated ? ", 탈락" : ""}`}>
      {[0, 1, 2].map((index) => <i className={index < chips ? "robo-chip-filled" : "robo-chip-empty"} key={index} />)}
      {eliminated ? <small>OUT</small> : chips === 0 ? <small>SWIMMING</small> : null}
    </span>
  );
}

function RoboTable({
  game,
  chatBubbles,
  isMyTurn,
}: {
  game: GameState;
  chatBubbles: ChatMessage[];
  isMyTurn: boolean;
}) {
  const robo = game.robo;
  return (
    <div className="table-panel robo-table-panel">
      <div className="robo-topline">
        <div className="robo-total-card">
          <span>CURRENT TOTAL</span>
          <strong>{robo?.total ?? 0}</strong>
          <small>{robo?.direction === "counterclockwise" ? "↶ COUNTERCLOCKWISE" : "↷ CLOCKWISE"}</small>
        </div>
        <div className="robo-discard-card">
          <span>LAST CARD</span>
          {robo?.lastCard ? <RoboCardFace card={robo.lastCard} small /> : <div className="robo-empty-card">START</div>}
          <small>{robo?.discard.length ?? 0} IN DISCARD</small>
        </div>
      </div>
      {robo?.pendingCards ? <div className="robo-double-banner">×2 EFFECT · 현재 플레이어가 카드 {robo.pendingCards}장을 더 냅니다.</div> : null}
      <div className="robo-player-grid">
        {game.players.map((player) => {
          const active = game.turnPlayerId === player.id;
          const visibleHand = game.status === "finished" ? player.roboHand : [];
          const handCount = game.status === "finished" ? visibleHand.length : player.roboHandCount;
          return (
            <article className={`robo-player-card ${active ? "robo-player-active" : ""} ${player.eliminated ? "robo-player-out" : ""}`} key={player.id}>
              {chatBubbles.filter((chat) => chat.playerId === player.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
              <div className="robo-player-head">
                <PlayerBadge name={player.name} active={active} isYou={player.id === game.you.id} />
                <RoboChips chips={player.chips} eliminated={player.eliminated} />
              </div>
              <div className="robo-hidden-hand" aria-label={`${player.name}님의 로보77 손패 ${handCount}장`}>
                {visibleHand.length ? visibleHand.map((card) => <RoboCardFace card={card} small key={card.id} />) : Array.from({ length: handCount }).map((_, index) => <span className="robo-card-back" key={`${player.id}-${index}`}>?</span>)}
              </div>
              <div className="robo-player-foot">
                <span>{player.id === game.you.id ? "YOUR HAND" : `${handCount} CARDS`}</span>
                {active ? <strong>{isMyTurn && player.id === game.you.id ? "YOUR MOVE" : "THINKING"}</strong> : null}
              </div>
            </article>
          );
        })}
      </div>
      <div className="robo-rule-note"><span>ROBO 77</span><p>합계가 77 이상이 되거나 같은 숫자 두 자리 수를 선언하면 칩을 잃습니다. 칩이 없을 때 또 잃으면 탈락합니다.</p></div>
    </div>
  );
}

function RoboMovePanel({
  game,
  me,
  isMyTurn,
  busy,
  onPlay,
}: {
  game: GameState;
  me?: ApiPlayer;
  isMyTurn: boolean;
  busy: boolean;
  onPlay: (cardId: string) => void;
}) {
  const pending = game.robo?.pendingCards ?? 0;
  if (!isMyTurn) {
    return <p className="rail-copy">현재 합계는 <strong className="robo-rail-total">{game.robo?.total ?? 0}</strong>입니다. 차례인 플레이어의 선택을 지켜보세요.</p>;
  }
  return (
    <div className="robo-move-panel">
      <p className="rail-copy">{pending ? `×2 효과: 같은 플레이어가 ${pending}장을 더 내야 합니다.` : "손패에서 카드 한 장을 골라 바로 플레이하세요."}</p>
      <div className="robo-hand-label"><span>YOUR CARDS</span><small>{me?.roboHand.length ?? 0} IN HAND</small></div>
      <div className="robo-hand-grid">
        {me?.roboHand.map((card) => {
          const blocked = pending === 2 && card.kind === "double";
          return (
            <button type="button" className={`robo-hand-button ${blocked ? "robo-card-blocked" : ""}`} key={card.id} disabled={busy || blocked} onClick={() => onPlay(card.id)} title={blocked ? "×2 다음 강제 두 장의 첫 카드로는 낼 수 없습니다." : `${card.label} 내기`}>
              <RoboCardFace card={card} />
            </button>
          );
        })}
      </div>
      <p className="robo-move-note">카드를 내면 자동으로 한 장을 보충합니다. 숫자는 서버가 합산합니다.</p>
    </div>
  );
}

function InitialDrawPanel({
  drawCount,
  drawnColors,
  colorCounts,
  onDraw,
  busy,
}: {
  drawCount: number;
  drawnColors: TileColor[];
  colorCounts: { black: number; white: number };
  onDraw: (color: TileColor) => void;
  busy: boolean;
}) {
  return (
    <div className="initial-draw-panel">
      <p className="rail-copy">숫자는 숨긴 채 색만 골라 시작 패를 구성합니다. 흰색과 검정색 비율은 원하는 대로 선택할 수 있습니다.</p>
      <div className="initial-draw-progress"><span>STARTING HAND</span><strong>{drawCount} / 4</strong></div>
      <div className="initial-draw-slots" aria-label="선택한 시작 타일">
        {Array.from({ length: 4 }, (_, index) => drawnColors[index] ? (
          <ColorOnlyTile color={drawnColors[index]} key={`${drawnColors[index]}-${index}`} small />
        ) : <span className="initial-draw-slot" key={`empty-${index}`}>{index + 1}</span>)}
      </div>
      <div className="initial-color-grid">
        <button
          type="button"
          className="initial-color-button initial-color-button-black"
          onClick={() => onDraw("black")}
          disabled={busy || drawCount >= 4 || colorCounts.black === 0}
        >
          <ColorOnlyTile color="black" />
          <span><strong>BLACK</strong><small>{colorCounts.black} AVAILABLE</small></span>
        </button>
        <button
          type="button"
          className="initial-color-button initial-color-button-white"
          onClick={() => onDraw("white")}
          disabled={busy || drawCount >= 4 || colorCounts.white === 0}
        >
          <ColorOnlyTile color="white" />
          <span><strong>WHITE</strong><small>{colorCounts.white} AVAILABLE</small></span>
        </button>
      </div>
      <p className="initial-draw-note">4장을 고른 뒤 조커가 나오면 원하는 위치에 배치합니다.</p>
    </div>
  );
}

function SetupWaitingPanel({ playerName }: { playerName: string }) {
  return (
    <div className="setup-waiting-panel">
      <span className="setup-kicker">INITIAL DRAW</span>
      <strong>{playerName}님이 시작 패를 고르는 중입니다.</strong>
      <p>선택이 끝나면 알려드립니다.</p>
    </div>
  );
}

function GuessPanel({
  selectedOpponent,
  selectedSlot,
  guessedKind,
  guessedNumber,
  onKind,
  onNumber,
  onGuess,
  onEndTurn,
  guessDisabled,
  endTurnDisabled,
}: {
  selectedOpponent?: ApiPlayer;
  selectedSlot: number | null;
  guessedKind: "number" | "joker";
  guessedNumber: number | null;
  onKind: (kind: "number" | "joker") => void;
  onNumber: (number: number) => void;
  onGuess: () => void;
  onEndTurn: () => void;
  guessDisabled: boolean;
  endTurnDisabled: boolean;
}) {
  const selectedTile = selectedOpponent && selectedSlot !== null ? selectedOpponent.hand[selectedSlot] : null;
  const targetColor = selectedTile?.color === "black" ? "BLACK" : selectedTile?.color === "white" ? "WHITE" : null;
  return (
    <div className="guess-panel">
      <p className="rail-copy">The tile color is public. Deduce only the hidden <em>number</em> or joker.</p>
      <div className="guess-target"><span>TARGET</span><strong>{selectedOpponent ? `${selectedOpponent.name} · ${targetColor ?? ""} tile ${(selectedSlot ?? 0) + 1}` : "Select a hidden tile"}</strong></div>
      <div className="guess-label"><span>WHAT TILE?</span><small>CHOOSE ONE</small></div>
      <div className="guess-kind-grid">
        <button className={`guess-kind-button ${guessedKind === "number" ? "guess-kind-selected" : ""}`} onClick={() => onKind("number")}>NUMBER</button>
        <button className={`guess-kind-button ${guessedKind === "joker" ? "guess-kind-selected" : ""}`} onClick={() => onKind("joker")}>JOKER</button>
      </div>
      {guessedKind === "number" ? (
        <>
          <div className="guess-label number-label"><span>NUMBER</span><small>0—11</small></div>
          <div className="number-grid">{Array.from({ length: 12 }, (_, number) => <button className={guessedNumber === number ? "number-selected" : ""} key={number} onClick={() => onNumber(number)}>{number}</button>)}</div>
        </>
      ) : <p className="joker-guess-note">Joker can be placed anywhere in a code.</p>}
      <button className="outline-button full-button end-turn-button" onClick={onEndTurn} disabled={endTurnDisabled}>END TURN <span>↗</span></button>
      <button className="primary-button full-button guess-button" onClick={onGuess} disabled={guessDisabled}>LOCK IN GUESS <span>→</span></button>
    </div>
  );
}

function JokerPlacementPanel({
  hand,
  joker,
  onPlace,
  busy,
  drawMode = false,
}: {
  hand: ApiTile[];
  joker: ApiTile;
  onPlace: (position: number) => void;
  busy: boolean;
  drawMode?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [keyboardPosition, setKeyboardPosition] = useState(0);
  const [pointerGhost, setPointerGhost] = useState<{ x: number; y: number } | null>(null);

  const placeAt = (position: number) => {
    if (busy) return;
    setDragging(false);
    setPointerGhost(null);
    onPlace(position);
  };

  const positionAtPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const zone = element?.closest<HTMLElement>("[data-joker-position]");
    const position = Number(zone?.dataset.jokerPosition);
    return Number.isInteger(position) ? position : null;
  };

  return (
    <div className="joker-placement-panel">
      <p className="rail-copy">{drawMode ? "Drag your drawn joker into the code before making a guess." : "Drag the joker into any gap. Once placed, it cannot move."}</p>
      <div
        className={`joker-drag-source ${dragging ? "joker-dragging" : ""}`}
        draggable={!busy}
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        aria-label={`${drawMode ? "뽑은" : "받은"} 조커. 원하는 위치로 드래그하세요.`}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", joker.id);
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        onPointerDown={(event) => {
          if (busy || event.pointerType === "mouse") return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setPointerGhost({ x: event.clientX, y: event.clientY });
        }}
        onPointerMove={(event) => {
          if (pointerGhost) setPointerGhost({ x: event.clientX, y: event.clientY });
        }}
        onPointerUp={(event) => {
          if (!pointerGhost) return;
          const position = positionAtPoint(event.clientX, event.clientY);
          setPointerGhost(null);
          setDragging(false);
          if (position !== null) placeAt(position);
        }}
        onPointerCancel={() => {
          setPointerGhost(null);
          setDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setKeyboardPosition((position) => Math.max(0, position - 1));
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            setKeyboardPosition((position) => Math.min(hand.length, position + 1));
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            placeAt(keyboardPosition);
          }
        }}
      >
        <TileFace tile={joker} />
        <span>{drawMode ? "DRAWN JOKER" : "YOUR JOKER"}</span>
        <small>DRAG ME</small>
      </div>
      {pointerGhost ? <div className="joker-pointer-ghost" style={{ left: pointerGhost.x, top: pointerGhost.y }}><TileFace tile={joker} /></div> : null}
      <div className="guess-label"><span>DROP INTO CODE</span><small>{hand.length + 1} GAPS</small></div>
      <div className={`joker-drop-board ${dragging ? "drop-board-active" : ""}`}>
        {Array.from({ length: hand.length + 1 }, (_, position) => (
          <Fragment key={position}>
            <div
              className={`joker-drop-zone ${keyboardPosition === position ? "joker-drop-keyboard" : ""}`}
              data-joker-position={position}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                placeAt(position);
              }}
            ><span>＋</span></div>
            {hand[position] ? <TileFace tile={hand[position]} small /> : null}
          </Fragment>
        ))}
      </div>
      <p className="drag-help">Drag and drop · touch supported · arrow keys + Enter</p>
    </div>
  );
}
