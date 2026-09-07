"use client";

import { useMemo, useState } from "react";

type DalmutiRole = "greater-dalmuti" | "lesser-dalmuti" | "merchant" | "lesser-peon" | "greater-peon";
type DalmutiCard = { id: string; kind: "number" | "joker"; rank: number; name: string };
type ChatMessage = { id: string; playerId: string; playerName: string; message: string };
type DalmutiPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  dalmutiHand: DalmutiCard[];
  dalmutiHandCount: number;
  dalmutiRole: DalmutiRole | null;
  dalmutiFinishPlace: number | null;
};
type DalmutiState = {
  phase: "setup" | "tax" | "play" | "hand-end";
  handNumber: number;
  setupDraws: Array<{ playerId: string; rank: number; name: string }>;
  lastPlay: { playerId: string; rank: number; count: number; cards: DalmutiCard[] } | null;
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
};
type DalmutiGameState = {
  status: "waiting" | "drawing" | "placing" | "playing" | "finished";
  turnPlayerId: string | null;
  turnNumber: number;
  you: { id: string };
  players: DalmutiPlayer[];
  dalmuti: DalmutiState | null;
};

const roleLabels: Record<DalmutiRole, string> = {
  "greater-dalmuti": "위대한 달무티",
  "lesser-dalmuti": "총리대신",
  merchant: "상인",
  "lesser-peon": "광부",
  "greater-peon": "농노",
};

const rankNames: Record<number, string> = {
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

function rankLabel(rank: number) {
  return rank === 13 ? "광대" : `${rank} · ${rankNames[rank] ?? "계급"}`;
}

function roleLabel(role: DalmutiRole | null) {
  return role ? roleLabels[role] : "자리 미정";
}

function CardFace({ card, selected, onClick, disabled = false }: { card: DalmutiCard; selected?: boolean; onClick?: () => void; disabled?: boolean }) {
  const content = (
    <>
      <span className="dalmuti-card-rank">{card.rank === 13 ? "★" : card.rank}</span>
      <strong>{card.name}</strong>
      <small>{card.kind === "joker" ? "WILD JOKER" : "DALMUTI"}</small>
    </>
  );
  if (!onClick) return <div className={`dalmuti-card ${card.kind === "joker" ? "dalmuti-card-joker" : ""}`}>{content}</div>;
  return <button type="button" className={`dalmuti-card dalmuti-card-button ${card.kind === "joker" ? "dalmuti-card-joker" : ""} ${selected ? "dalmuti-card-selected" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={selected}>{content}</button>;
}

export default function DalmutiGame({
  game,
  busy,
  chatBubbles,
  onAction,
}: {
  game: DalmutiGameState;
  busy: boolean;
  chatBubbles: ChatMessage[];
  onAction: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const dalmuti = game.dalmuti;
  const me = game.players.find((player) => player.id === game.you.id);
  const selectedPlayer = me?.id ?? "";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const effectiveSelectedIds = useMemo(() => selectedIds.filter((id) => me?.dalmutiHand.some((card) => card.id === id)), [me?.dalmutiHand, selectedIds]);
  const selectedCards = useMemo(() => (me?.dalmutiHand ?? []).filter((card) => effectiveSelectedIds.includes(card.id)), [me?.dalmutiHand, effectiveSelectedIds]);
  const isMyTurn = game.turnPlayerId === game.you.id;
  const isSetupDrawn = Boolean(dalmuti?.setupDraws.some((draw) => draw.playerId === game.you.id));
  const isGreaterDalmuti = dalmuti?.tax.greaterDalmutiId === game.you.id;
  const isLesserDalmuti = dalmuti?.tax.lesserDalmutiId === game.you.id;
  const taxKind = isGreaterDalmuti && !dalmuti?.tax.greaterDone ? "greater" : isLesserDalmuti && !dalmuti?.tax.lesserDone ? "lesser" : null;
  const taxCount = taxKind === "greater" ? 2 : taxKind === "lesser" ? 1 : 0;
  const canSubmitSet = selectedCards.length > 0 && (dalmuti?.leadCount === 0 || selectedCards.length === dalmuti?.leadCount);
  const currentPlayer = game.players.find((player) => player.id === game.turnPlayerId);
  const lastPlayer = game.players.find((player) => player.id === dalmuti?.lastPlay?.playerId);
  const finishPlayers = (dalmuti?.finishOrder ?? []).map((id) => game.players.find((player) => player.id === id)).filter((player): player is DalmutiPlayer => Boolean(player));

  const toggleCard = (cardId: string) => {
    setSelectedIds((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  };

  return (
    <div className="dalmuti-game">
      <div className="dalmuti-headline">
        <div>
          <span className="eyebrow">DALMUTI · HAND {String(dalmuti?.handNumber ?? 0).padStart(2, "0")}</span>
          <h2>{dalmuti?.phase === "setup" ? "Draw your seat." : dalmuti?.phase === "tax" ? "Pay the table." : dalmuti?.phase === "hand-end" ? "The hierarchy is set." : "Empty your hand."}</h2>
        </div>
        <div className="dalmuti-rule-note"><strong>LOW NUMBER = HIGH RANK</strong><span>같은 장수의 더 낮은 숫자만 이깁니다.</span></div>
      </div>

      <div className="dalmuti-player-grid">
        {game.players.map((player) => {
          const chats = chatBubbles.filter((chat) => chat.playerId === player.id);
          const active = player.id === game.turnPlayerId;
          return (
            <article className={`dalmuti-player ${active ? "dalmuti-player-active" : ""} ${player.dalmutiFinishPlace ? "dalmuti-player-finished" : ""}`} key={player.id}>
              {chats.map((chat) => <div className="chat-bubble" role="status" key={chat.id}><strong>{chat.playerName}</strong><span>{chat.message}</span></div>)}
              <div className="dalmuti-player-name"><span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span><strong>{player.name}</strong>{player.id === selectedPlayer ? <small>YOU</small> : null}</div>
              <span className="dalmuti-role">{roleLabel(player.dalmutiRole)}</span>
              <b>{player.dalmutiFinishPlace ? `${player.dalmutiFinishPlace}위` : `${player.dalmutiHandCount}장`}</b>
              <small>{active ? "YOUR MOVE" : player.dalmutiFinishPlace ? "FINISHED" : "IN THE TABLE"}</small>
            </article>
          );
        })}
      </div>

      <section className="dalmuti-table">
        <div className="dalmuti-table-topline"><span className="eyebrow">CURRENT SET</span><span>{dalmuti?.leadCount ? `${dalmuti.leadCount} CARDS · ${rankLabel(dalmuti.leadRank ?? 13)}` : "OPENING SET"}</span></div>
        {dalmuti?.lastPlay ? (
          <div className="dalmuti-last-play"><div><strong>{lastPlayer?.name ?? "플레이어"}</strong><span>{rankLabel(dalmuti.lastPlay.rank)} · {dalmuti.lastPlay.count}장</span></div><div className="dalmuti-played-cards">{dalmuti.lastPlay.cards.map((card) => <CardFace card={card} key={card.id} />)}</div></div>
        ) : <div className="dalmuti-empty-table"><span>✦</span><p>아직 낸 카드가 없습니다.<br />선이 된 플레이어가 새로운 세트를 시작합니다.</p></div>}
        <div className="dalmuti-table-footer"><span>{dalmuti?.passCount ?? 0} PASSES</span><span>{currentPlayer ? `${currentPlayer.name} 차례` : "다음 판을 준비 중"}</span></div>
      </section>

      {game.status === "drawing" && dalmuti?.phase === "setup" ? (
        <section className="dalmuti-action-panel dalmuti-setup-panel">
          <div><span className="eyebrow">FIRST HAND · SEAT DRAW</span><h3>한 장을 뽑아 첫 계급을 정합니다.</h3><p>가장 낮은 숫자를 뽑은 플레이어가 위대한 달무티가 됩니다. 같은 숫자는 자동으로 순서를 섞습니다.</p></div>
          <div className="dalmuti-setup-draws">{game.players.map((player) => { const draw = dalmuti.setupDraws.find((item) => item.playerId === player.id); return <span key={player.id}><b>{player.name}</b>{draw ? `${draw.rank} · ${draw.name}` : "DRAWING"}</span>; })}</div>
          {isSetupDrawn ? <p className="dalmuti-waiting-copy">자리 카드를 뽑았습니다. 다른 플레이어를 기다리는 중입니다.</p> : <button className="primary-button" onClick={() => onAction("dalmuti-draw-seat")} disabled={busy}>DRAW ONE SEAT CARD <span>↓</span></button>}
        </section>
      ) : null}

      {game.status === "playing" && dalmuti?.phase === "tax" ? (
        <section className="dalmuti-action-panel">
          <div><span className="eyebrow">TAX & REVOLUTION</span><h3>{dalmuti.revolution ? (dalmuti.revolution === "greater-revolution" ? "대혁명으로 계급이 뒤집혔습니다." : "혁명으로 세금이 사라졌습니다.") : "농노가 가장 좋은 카드를 상납합니다."}</h3><p>위대한 달무티는 농노에게 2장, 총리대신은 광부에게 1장을 돌려줍니다. 받는 플레이어는 원하는 카드를 고릅니다.</p></div>
          <div className="dalmuti-tax-status"><span className={dalmuti.tax.greaterDone ? "done" : ""}>2장 세금 · {dalmuti.tax.greaterDone ? "완료" : "대기"}</span><span className={dalmuti.tax.lesserDone ? "done" : ""}>1장 세금 · {dalmuti.tax.lesserDone ? "완료" : "대기"}</span></div>
          {dalmuti.tax.revolutionEligible && !dalmuti.tax.greaterDone && !dalmuti.tax.lesserDone ? <button className="outline-button" onClick={() => onAction("dalmuti-revolution")} disabled={busy}>DECLARE {dalmuti.tax.greaterPeonId === game.you.id ? "GREATER REVOLUTION" : "REVOLUTION"} <span>✦</span></button> : null}
          {taxKind ? <div className="dalmuti-tax-picker"><strong>{taxCount}장의 카드를 골라 농노와 교환하세요.</strong><div className="dalmuti-hand-row">{me?.dalmutiHand.map((card) => <CardFace card={card} key={card.id} selected={effectiveSelectedIds.includes(card.id)} onClick={() => effectiveSelectedIds.length < taxCount || effectiveSelectedIds.includes(card.id) ? toggleCard(card.id) : undefined} />)}</div><button className="primary-button" onClick={() => onAction(taxKind === "greater" ? "dalmuti-tax-greater" : "dalmuti-tax-lesser", { cardIds: effectiveSelectedIds })} disabled={busy || effectiveSelectedIds.length !== taxCount}>EXCHANGE TAX CARDS <span>↔</span></button></div> : <p className="dalmuti-waiting-copy">세금 교환이 완료되면 첫 세트가 시작됩니다.</p>}
        </section>
      ) : null}

      {game.status === "playing" && dalmuti?.phase === "play" ? (
        <section className="dalmuti-action-panel dalmuti-play-panel">
          <div className="dalmuti-play-intro"><div><span className="eyebrow">YOUR HAND · {me?.dalmutiHandCount ?? 0} CARDS</span><h3>{isMyTurn ? (dalmuti.leadCount ? `${dalmuti.leadCount}장을 더 낮은 숫자로 내세요.` : "새 세트를 시작하세요.") : `${currentPlayer?.name ?? "상대"}님이 세트를 내는 중입니다.`}</h3></div><span className="dalmuti-selection-count">{effectiveSelectedIds.length}{dalmuti.leadCount ? ` / ${dalmuti.leadCount}` : " selected"}</span></div>
          <div className="dalmuti-hand-row">{me?.dalmutiHand.map((card) => <CardFace card={card} key={card.id} selected={effectiveSelectedIds.includes(card.id)} onClick={() => isMyTurn ? toggleCard(card.id) : undefined} disabled={!isMyTurn} />)}</div>
          <div className="dalmuti-play-actions"><button className="primary-button" onClick={() => onAction("dalmuti-play", { cardIds: effectiveSelectedIds })} disabled={busy || !isMyTurn || !canSubmitSet}>PLAY SET <span>→</span></button><button className="outline-button" onClick={() => onAction("dalmuti-pass")} disabled={busy || !isMyTurn || !dalmuti.leadCount}>PASS</button><button className="text-button" onClick={() => setSelectedIds([])} disabled={!effectiveSelectedIds.length}>CLEAR</button></div>
        </section>
      ) : null}

      {game.status === "finished" && dalmuti?.phase === "hand-end" ? (
        <section className="dalmuti-action-panel dalmuti-finish-panel"><span className="eyebrow">HAND COMPLETE</span><h3>다음 판 자리 순서</h3><div className="dalmuti-finish-order">{finishPlayers.map((player, index) => <span key={player.id}><b>{String(index + 1).padStart(2, "0")}</b>{player.name}<small>{roleLabel(player.dalmutiRole)}</small></span>)}</div><p>카드를 먼저 비운 순서대로 다음 판의 계급과 자리가 정해집니다.</p><div className="dalmuti-reveal-heading"><span className="eyebrow">EVERYONE&apos;S FINAL HAND</span><span>FINISH ORDER MARKED</span></div><div className="dalmuti-reveal-grid">{game.players.map((player) => <article key={player.id}><strong>{player.name}</strong><small>{player.dalmutiFinishPlace ? `${player.dalmutiFinishPlace}위 · ${roleLabel(player.dalmutiRole)}` : "남은 패"}</small><div className="dalmuti-reveal-cards">{player.dalmutiHand.length ? player.dalmutiHand.map((card) => <CardFace card={card} key={card.id} />) : <span className="dalmuti-empty-hand">EMPTY HAND</span>}</div></article>)}</div></section>
      ) : null}
    </div>
  );
}
