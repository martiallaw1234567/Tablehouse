"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

type TileColor = "black" | "white";

type ApiTile = {
  id: string;
  kind: "number" | "joker" | "hidden";
  number: number | null;
  color: TileColor | null;
  revealed?: boolean;
};

type ApiPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  hand: ApiTile[];
};

type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
};

type GameState = {
  code: string;
  status: "waiting" | "placing" | "playing" | "finished";
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
};

const SESSION_CODE = "davinci-room-code";
const SESSION_TOKEN = "davinci-player-token";

function getSavedSession() {
  if (typeof window === "undefined") return null;
  const code = window.localStorage.getItem(SESSION_CODE);
  const token = window.localStorage.getItem(SESSION_TOKEN);
  return code && token ? { code, token } : null;
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
      {hidden ? <span className="tile-mark">?</span> : joker ? <span className="joker-mark">J</span> : <span>{tile.number}</span>}
      {!hidden && <i className="tile-dot" aria-hidden="true" />}
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

function ChatBubble({ chat }: { chat: ChatMessage }) {
  return (
    <div className="chat-bubble" role="status" aria-label={`${chat.playerName}님의 새 채팅`}>
      <strong>{chat.playerName}</strong>
      <span>{chat.message}</span>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "room">("home");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [game, setGame] = useState<GameState | null>(null);
  const [token, setToken] = useState("");
  const [resume, setResume] = useState<{ code: string; game: GameState } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [guessedKind, setGuessedKind] = useState<"number" | "joker">("number");
  const [guessedNumber, setGuessedNumber] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBubbles, setChatBubbles] = useState<ChatMessage[]>([]);
  const [progressPopup, setProgressPopup] = useState<string | null>(null);
  const [progressTone, setProgressTone] = useState<"update" | "danger">("update");
  const lastLogFingerprint = useRef("");
  const revealedOwnTileIds = useRef<Set<string>>(new Set());
  const progressTimer = useRef<number | null>(null);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const chatSeenIds = useRef<Set<string>>(new Set());
  const chatBubblesHydrated = useRef(false);
  const chatBubbleTimers = useRef<Record<string, number>>({});
  const latestLog = game?.log[0] ?? "";
  const logFingerprint = game?.log.slice(0, 3).join("\u0000") ?? "";
  const latestChatId = game?.chat[game.chat.length - 1]?.id ?? "";

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

  useEffect(() => {
    const saved = getSavedSession();
    if (!saved) return;
    void fetchRoomState(saved.code, saved.token)
      .then((payload) => setResume({ code: saved.code, game: payload }))
      .catch(() => {
        window.localStorage.removeItem(SESSION_CODE);
        window.localStorage.removeItem(SESSION_TOKEN);
      });
  }, [fetchRoomState]);

  useEffect(() => {
    if (screen !== "room" || !game || !token) return;
    const interval = window.setInterval(() => {
      void refreshRoom(game.code, token).catch(() => undefined);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [game, refreshRoom, screen, token]);

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
    Object.values(chatBubbleTimers.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const enterRoom = (payload: { code: string; playerToken: string; state: GameState }) => {
    window.localStorage.setItem(SESSION_CODE, payload.code);
    window.localStorage.setItem(SESSION_TOKEN, payload.playerToken);
    setRoomCode(payload.code);
    setToken(payload.playerToken);
    setGame(payload.state);
    setResume(null);
    setScreen("room");
    setError("");
    setChatDraft("");
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
        body: JSON.stringify({ action: "create", name }),
      });
      enterRoom((await readJson(response)) as unknown as { code: string; playerToken: string; state: GameState });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방을 만들지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name, code: roomCode }),
      });
      enterRoom((await readJson(response)) as unknown as { code: string; playerToken: string; state: GameState });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방에 들어가지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const doAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!game || !token) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${game.code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token, ...payload }),
      });
      setGame((await readJson(response)) as unknown as GameState);
      if (action === "guess") {
        setSelectedTarget("");
        setSelectedSlot(null);
        setGuessedKind("number");
        setGuessedNumber(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "동작을 처리하지 못했습니다.");
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
    window.localStorage.removeItem(SESSION_CODE);
    window.localStorage.removeItem(SESSION_TOKEN);
    setGame(null);
    setToken("");
    setResume(null);
    setScreen("home");
    setError("");
    setChatDraft("");
    resetChatBubbles();
    setProgressPopup(null);
    lastLogFingerprint.current = "";
    revealedOwnTileIds.current = new Set();
  };

  const copyCode = async () => {
    if (!game) return;
    await navigator.clipboard?.writeText(game.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const me = game?.players.find((player) => player.id === game.you.id);
  const opponents = game?.players.filter((player) => player.id !== game.you.id) ?? [];
  const isMyTurn = Boolean(game && game.turnPlayerId === game.you.id);
  const selectedOpponent = opponents.find((player) => player.id === selectedTarget);
  const winner = game?.players.find((player) => player.id === game.winnerId);
  const statusLabel = game?.status === "waiting" ? "LOBBY" : game?.status === "placing" ? "PLACE JOKER" : game?.status === "finished" ? "FINISHED" : "LIVE GAME";
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

  const helperCopy = useMemo(() => {
    if (!game) return "";
    if (game.status === "finished") return `${winner?.name ?? "승자"}님이 코드를 완성했습니다.`;
    if (game.status === "waiting") return game.you.isHost ? "친구가 들어오면 게임을 시작하세요." : "방장이 게임을 시작할 때까지 기다려주세요.";
    if (game.status === "placing") return game.pendingJokers.length ? "조커를 원하는 위치에 넣어주세요." : "다른 플레이어가 조커를 배치하고 있습니다.";
    if (game.penaltyPending) return "오답입니다. 자기 비공개 타일 하나를 공개하세요.";
    if (isMyTurn && !game.turnDrawn) return "먼저 타일을 하나 뽑으세요.";
    if (isMyTurn) return "상대 타일을 고르고 숨겨진 숫자를 추리하세요.";
    return `${game.players.find((player) => player.id === game.turnPlayerId)?.name ?? "상대"}님이 생각 중입니다.`;
  }, [game, isMyTurn, winner]);

  if (screen === "room" && game) {
    return (
      <main className="app-shell room-shell">
        <header className="topbar room-topbar">
          <button className="wordmark wordmark-button" onClick={leaveRoom} aria-label="홈으로 돌아가기">
            <span className="wordmark-mark">DC</span>
            <span>DA VINCI CODE</span>
          </button>
          <div className="room-topbar-right">
            <span className={`status-pill ${game.status === "playing" ? "status-pill-live" : ""}`}>
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
                <span className="eyebrow">DEDUCTION TABLE · TURN {String(game.turnNumber).padStart(2, "0")}</span>
                <h1>{helperCopy}</h1>
              </div>
              <div className="deck-counter"><span className="deck-icon">▦</span><span>{game.deckCount}<small> tiles left</small></span></div>
            </div>

            {game.status === "waiting" ? (
              <div className="lobby-panel">
                <div className="lobby-intro">
                  <span className="lobby-kicker">YOUR PRIVATE TABLE</span>
                  <h2>Invite your fellow<br /><em>code breakers.</em></h2>
                  <p>Share the five-letter room code. Once two to four players are seated, the host can deal the first hand.</p>
                  <button className="share-code" onClick={copyCode}><span>{game.code}</span><small>{copied ? "Copied" : "Tap to copy"} ↗</small></button>
                </div>
                <div className="seat-grid">
                  {game.players.map((player, index) => (
                    <div className="seat occupied" key={player.id}>
                      {chatBubbles.filter((chat) => chat.playerId === player.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
                      <span className="seat-number">0{index + 1}</span>
                      <PlayerBadge name={player.name} active={false} isYou={player.id === game.you.id} />
                      {player.isHost ? <span className="host-tag">HOST</span> : null}
                    </div>
                  ))}
                  {Array.from({ length: 4 - game.players.length }).map((_, index) => (
                    <div className="seat seat-open" key={`open-${index}`}>
                      <span className="seat-number">0{game.players.length + index + 1}</span>
                      <span className="open-seat-mark">＋</span>
                      <span>OPEN SEAT</span>
                    </div>
                  ))}
                </div>
                <div className="lobby-footer">
                  <span><i className="live-dot" /> Waiting for players · {game.players.length}/4 seated</span>
                  {game.you.isHost ? (
                    <button className="primary-button" onClick={() => void doAction("start")} disabled={busy || game.players.length < 2}>
                      START GAME <span>→</span>
                    </button>
                  ) : <span className="waiting-note">The host will start the game.</span>}
                </div>
              </div>
            ) : game.status === "placing" ? (
              <div className="joker-setup-panel">
                <div className="lobby-intro">
                  <span className="lobby-kicker">JOKERS IN PLAY</span>
                  <h2>Place your<br /><em>wild card.</em></h2>
                  <p>Jokers can sit anywhere in your code. Choose the gap that makes your sequence hardest to read.</p>
                </div>
                {game.pendingJokers.length > 0 && me ? (
                  <JokerPlacementPanel
                    hand={me.hand}
                    joker={game.pendingJokers[0]}
                    onPlace={(position) => void doAction("place-joker", { position })}
                    busy={busy}
                  />
                ) : <div className="joker-waiting"><span className="turn-orb" /><strong>Waiting for the other players</strong><span>Everyone must place their joker before the first turn.</span></div>}
              </div>
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
                          <span className="hidden-count">{player.hand.filter((tile) => tile.kind === "hidden").length} HIDDEN</span>
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
                <div className="your-hand">
                  {chatBubbles.filter((chat) => chat.playerId === game.you.id).map((chat) => <ChatBubble chat={chat} key={chat.id} />)}
                  <div className="your-hand-heading">
                    <div><span className="eyebrow">YOUR CODE</span><strong>{me?.name}</strong></div>
                    <div className="hand-status">
                      <span className={`code-security ${exposedTileCount ? "code-security-breached" : ""}`}>{exposedTileCount ? `${exposedTileCount} EXPOSED` : "CODE SECURE"}</span>
                      <span className={`hand-note ${game.penaltyPending ? "hand-note-alert" : ""}`}>{game.penaltyPending ? "Choose one hidden tile to reveal." : "Your tiles are always visible to you."}</span>
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
              <div className="turn-title-row"><h2>{game.status === "finished" ? "Game over" : isMyTurn ? "Your turn" : "Watch the table"}</h2><span className={`turn-orb ${isMyTurn ? "turn-orb-active" : ""}`} /></div>
              {game.status === "finished" ? (
                <div className="winner-card"><span className="winner-star">✦</span><strong>{winner?.name ?? "Winner"}</strong><span>cracked the code</span></div>
              ) : game.status === "waiting" ? (
                <p className="rail-copy">The table is ready when everyone has a seat. Keep this tab open while you share the code.</p>
              ) : game.status === "placing" ? (
                <p className="rail-copy">Place your joker in any gap in your code. The first turn starts randomly after everyone is ready.</p>
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
        <div className="wordmark"><span className="wordmark-mark">DC</span><span>DA VINCI CODE</span></div>
        <div className="topbar-meta"><span className="live-dot" /> MULTIPLAYER TABLES <span className="topbar-slash">/</span> 02—04 PLAYERS</div>
      </header>

      <div className="hero-grid">
        <section className="hero-copy">
          <span className="eyebrow hero-eyebrow">A MODERN DEDUCTION TABLE</span>
          <h1>Read the room.<br /><em>Crack the code.</em></h1>
          <p className="hero-lede">A private, fast-moving number deduction game for the people who notice everything.</p>
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

      <section className="entry-grid">
        <form className="entry-card create-card" onSubmit={createRoom}>
          <div className="entry-card-top"><span className="entry-index">01</span><span className="entry-status">NEW TABLE</span></div>
          <h2>Deal a new<br /><em>hand.</em></h2>
          <label>YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ada" maxLength={18} /></label>
          <button className="primary-button full-button" disabled={busy || !name.trim()}>CREATE ROOM <span>→</span></button>
        </form>
        <form className="entry-card join-card" onSubmit={joinRoom}>
          <div className="entry-card-top"><span className="entry-index">02</span><span className="entry-status">JOIN A TABLE</span></div>
          <h2>Step into<br /><em>the room.</em></h2>
          <label>YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Grace" maxLength={18} /></label>
          <label>ROOM CODE<input className="code-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))} placeholder="ABCDE" maxLength={5} /></label>
          <button className="outline-button full-button" disabled={busy || !name.trim() || roomCode.length !== 5}>JOIN ROOM <span>→</span></button>
        </form>
      </section>

      {resume ? (
        <button className="resume-card" onClick={() => { setGame(resume.game); setRoomCode(resume.code); setScreen("room"); }}>
          <span className="resume-mark">↗</span><span><small>LAST TABLE</small><strong>{resume.code} · {resume.game.players.length} players</strong></span><span className="resume-arrow">CONTINUE →</span>
        </button>
      ) : null}

      <footer className="home-footer"><span>BUILT FOR THE SUSPICIOUS</span><span>© 2026 · KEEP YOUR CODE CLOSE</span><span className="footer-symbol">✦</span></footer>
      {error ? <div className="toast error-toast" role="alert">{error}<button onClick={() => setError("")}>×</button></div> : null}
    </main>
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
