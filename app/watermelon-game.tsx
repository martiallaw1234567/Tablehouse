"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Fruit = { id: number; level: number; x: number; y: number; vx: number; vy: number };

const WIDTH = 360;
const HEIGHT = 560;
const WALL = 12;
const FLOOR = 548;
const DANGER_Y = 82;
const OVERFLOW_GRACE_MS = 1200;
const radii = [15, 19, 24, 31, 39, 49, 60, 73, 87, 102, 117];
const colors = ["#e95562", "#f3768d", "#7a4aa8", "#f39a45", "#ef713f", "#d84938", "#b4cf54", "#f28d82", "#dfb946", "#8fc657", "#4fa95e"];
const faces = ["🍒", "🍓", "🍇", "🍊", "🟠", "🍎", "🍐", "🍑", "🍍", "🍈", "🍉"];
const names = ["체리", "딸기", "포도", "한라봉", "감", "사과", "배", "복숭아", "파인애플", "멜론", "수박"];
const mergePoints = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66];

function randomDropLevel() {
  const roll = Math.random();
  return roll < .28 ? 0 : roll < .52 ? 1 : roll < .72 ? 2 : roll < .89 ? 3 : 4;
}

export type WatermelonProgress = { score: number; drops: number; gameOver: boolean };

export default function WatermelonGame({ disabled = false, onProgress }: { disabled?: boolean; onProgress?: (progress: WatermelonProgress) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const idRef = useRef(1);
  const aimXRef = useRef(WIDTH / 2);
  const currentRef = useRef(randomDropLevel());
  const nextRef = useRef(randomDropLevel());
  const scoreRef = useRef(0);
  const dropsRef = useRef(0);
  const gameOverRef = useRef(false);
  const lastDropRef = useRef(0);
  const dangerSinceRef = useRef<number | null>(null);
  const [hud, setHud] = useState({ score: 0, drops: 0, current: 0, next: 0, gameOver: false });

  const publish = useCallback(() => {
    const progress = { score: scoreRef.current, drops: dropsRef.current, gameOver: gameOverRef.current };
    setHud({ ...progress, current: currentRef.current, next: nextRef.current });
    onProgress?.(progress);
  }, [onProgress]);

  const restart = useCallback(() => {
    fruitsRef.current = [];
    scoreRef.current = 0;
    dropsRef.current = 0;
    gameOverRef.current = false;
    dangerSinceRef.current = null;
    currentRef.current = randomDropLevel();
    nextRef.current = randomDropLevel();
    publish();
  }, [publish]);

  useEffect(() => { publish(); }, [publish]);

  const drop = useCallback(() => {
    const now = performance.now();
    if (disabled || gameOverRef.current || now - lastDropRef.current < 420) return;
    lastDropRef.current = now;
    const level = currentRef.current;
    const radius = radii[level];
    const x = Math.max(WALL + radius, Math.min(WIDTH - WALL - radius, aimXRef.current));
    fruitsRef.current.push({ id: idRef.current++, level, x, y: 42, vx: 0, vy: 0 });
    dropsRef.current += 1;
    currentRef.current = nextRef.current;
    nextRef.current = randomDropLevel();
    publish();
  }, [disabled, publish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let previous = performance.now();

    const drawFruit = (fruit: Fruit, alpha = 1) => {
      const radius = radii[fruit.level];
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = colors[fruit.level];
      context.beginPath();
      context.arc(fruit.x, fruit.y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,.55)";
      context.lineWidth = Math.max(1, radius * .05);
      context.stroke();
      context.fillStyle = "#fff";
      context.font = `${Math.max(14, radius * 1.08)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(faces[fruit.level], fruit.x, fruit.y + 1);
      context.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(1.6, (now - previous) / 16.667);
      previous = now;
      const fruits = fruitsRef.current;
      if (!gameOverRef.current && !disabled) {
        for (const fruit of fruits) {
          const radius = radii[fruit.level];
          fruit.vy += .34 * dt;
          fruit.x += fruit.vx * dt;
          fruit.y += fruit.vy * dt;
          fruit.vx *= Math.pow(.992, dt);
          if (fruit.x - radius < WALL) { fruit.x = WALL + radius; fruit.vx = Math.abs(fruit.vx) * .48; }
          if (fruit.x + radius > WIDTH - WALL) { fruit.x = WIDTH - WALL - radius; fruit.vx = -Math.abs(fruit.vx) * .48; }
          if (fruit.y + radius > FLOOR) { fruit.y = FLOOR - radius; fruit.vy = -Math.abs(fruit.vy) * .2; fruit.vx *= .93; }
        }

        const merged = new Set<number>();
        const additions: Fruit[] = [];
        for (let i = 0; i < fruits.length; i += 1) {
          for (let j = i + 1; j < fruits.length; j += 1) {
            const a = fruits[i];
            const b = fruits[j];
            if (merged.has(a.id) || merged.has(b.id)) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.max(.01, Math.hypot(dx, dy));
            const minimum = radii[a.level] + radii[b.level];
            if (distance >= minimum) continue;
            if (a.level === b.level) {
              merged.add(a.id); merged.add(b.id);
              scoreRef.current += mergePoints[a.level];
              if (a.level < radii.length - 1) additions.push({ id: idRef.current++, level: a.level + 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: (a.vx + b.vx) * .22, vy: -1.2 });
              publish();
              continue;
            }
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = minimum - distance;
            const total = radii[a.level] + radii[b.level];
            a.x -= nx * overlap * (radii[b.level] / total);
            a.y -= ny * overlap * (radii[b.level] / total);
            b.x += nx * overlap * (radii[a.level] / total);
            b.y += ny * overlap * (radii[a.level] / total);
            const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (relative < 0) {
              const impulse = -relative * .42;
              a.vx -= impulse * nx; a.vy -= impulse * ny;
              b.vx += impulse * nx; b.vy += impulse * ny;
            }
          }
        }
        if (merged.size) fruitsRef.current = fruits.filter((fruit) => !merged.has(fruit.id)).concat(additions);

        // A crowded stack keeps tiny collision velocities forever, so velocity cannot be
        // used as a "settled" gate. Continuous occupancy above the line is the rule.
        const above = fruitsRef.current.some((fruit) => fruit.y - radii[fruit.level] < DANGER_Y);
        if (above) {
          dangerSinceRef.current ??= now;
          if (now - dangerSinceRef.current >= OVERFLOW_GRACE_MS) { gameOverRef.current = true; publish(); }
        } else dangerSinceRef.current = null;
      }

      context.clearRect(0, 0, WIDTH, HEIGHT);
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, "#26302d"); gradient.addColorStop(1, "#171b1a");
      context.fillStyle = gradient; context.fillRect(0, 0, WIDTH, HEIGHT);
      context.strokeStyle = "rgba(235,229,218,.22)"; context.lineWidth = 3;
      context.strokeRect(WALL, 0, WIDTH - WALL * 2, FLOOR);
      context.setLineDash([7, 6]); context.strokeStyle = "#ef795b"; context.lineWidth = 2;
      context.beginPath(); context.moveTo(WALL, DANGER_Y); context.lineTo(WIDTH - WALL, DANGER_Y); context.stroke(); context.setLineDash([]);
      context.fillStyle = "rgba(239,121,91,.8)"; context.font = "700 9px sans-serif"; context.textAlign = "left"; context.fillText("DANGER", WALL + 7, DANGER_Y - 7);
      fruitsRef.current.forEach((fruit) => drawFruit(fruit));
      if (!gameOverRef.current && !disabled) drawFruit({ id: 0, level: currentRef.current, x: Math.max(WALL + radii[currentRef.current], Math.min(WIDTH - WALL - radii[currentRef.current], aimXRef.current)), y: 40, vx: 0, vy: 0 }, .58);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [disabled, publish]);

  const aim = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    aimXRef.current = (clientX - rect.left) * (WIDTH / rect.width);
  };

  return (
    <div className="watermelon-game">
      <div className="watermelon-hud">
        <div><small>SCORE</small><strong>{hud.score.toLocaleString()}</strong></div>
        <div className="watermelon-next"><small>NEXT</small><i style={{ background: colors[hud.next] }} title={names[hud.next]}>{faces[hud.next]}</i></div>
        <div><small>DROPS</small><strong>{hud.drops}</strong></div>
      </div>
      <div className="watermelon-canvas-wrap">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} onPointerMove={(event) => aim(event.clientX)} onPointerDown={(event) => { aim(event.clientX); drop(); }} aria-label="과일을 떨어뜨리는 수박 합성 보드" />
        {(hud.gameOver || disabled) ? <div className="watermelon-over"><small>{disabled && !hud.gameOver ? "MATCH FINISHED" : "BOX OVERFLOW"}</small><strong>{hud.gameOver ? "GAME OVER" : "ROUND OVER"}</strong><span>{hud.score.toLocaleString()} PTS</span>{!disabled ? <button type="button" onClick={restart}>PLAY AGAIN ↻</button> : null}</div> : null}
      </div>
      <p>포인터를 움직여 위치를 정하고 클릭하거나 탭해 과일을 떨어뜨리세요. 같은 과일끼리 닿으면 한 단계 커집니다.</p>
    </div>
  );
}
