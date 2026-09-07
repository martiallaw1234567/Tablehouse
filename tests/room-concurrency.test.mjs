import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const rows = new Map();
let conflicts = 0;
let updates = 0;
const db = { prepare(sql) {
  let args = [];
  return {
    bind(...values) { args = values; return this; },
    async first() { return rows.has(args[0]) ? { ...rows.get(args[0]) } : null; },
    async all() { return { results: [...rows.values()] }; },
    async run() {
      if (sql.startsWith('CREATE')) return { meta: { changes: 0 } };
      if (sql.startsWith('INSERT')) {
        rows.set(args[0], { state: args[1], version: args[2], updated_at: args[3] });
      } else if (sql.startsWith('UPDATE')) {
        updates++;
        const current = rows.get(args[3]);
        if (!current || current.version !== args[4]) { conflicts++; return { meta: { changes: 0 } }; }
        rows.set(args[3], { state: args[0], version: args[1], updated_at: args[2] });
      } else if (sql.startsWith('DELETE')) {
        if (rows.get(args[0])?.version !== args[1]) return { meta: { changes: 0 } };
        rows.delete(args[0]);
      } else throw new Error(sql);
      return { meta: { changes: 1 } };
    },
  };
} };
globalThis.__roomTestDb = db;
const source = await readFile(new URL('../app/api/rooms/room-state.ts', import.meta.url), 'utf8');
const js = stripTypeScriptTypes(source.replace('(await import("cloudflare:workers"))', '({ env: { DB: globalThis.__roomTestDb } })'));
const api = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('concurrent joins and chat/camera writes preserve every successful action', async () => {
  const host = await api.createRoom('host', 'dalmuti');
  const guests = await Promise.all(['a', 'b', 'c'].map(name => api.joinRoom(host.code, name)));
  assert.equal((await api.getRoom(host.code, host.playerToken)).players.length, 4);
  await Promise.all([
    api.actOnRoom(host.code, host.playerToken, 'send-chat', { message: 'hello' }),
    api.actOnRoom(host.code, guests[0].playerToken, 'camera-enable', {}),
    api.actOnRoom(host.code, guests[1].playerToken, 'send-chat', { message: 'world' }),
  ]);
  const state = await api.getRoom(host.code, host.playerToken);
  assert.deepEqual(state.chat.map(x => x.message).sort(), ['hello', 'world']);
  assert.equal(state.camera.enabledPlayerIds.length, 1);
  assert.ok(conflicts > 0, 'must exercise real optimistic-write conflicts');
  const before = updates;
  await assert.rejects(api.actOnRoom(host.code, guests[0].playerToken, 'start', {}), /방장/);
  assert.equal(updates, before, 'validation failures must not be retried or persisted');
});

test('expired rooms disappear for all participants while active games remain', async () => {
  const host = await api.createRoom('expiry');
  const row = rows.get(host.code);
  const state = JSON.parse(row.state);
  state.aloneSince = new Date(Date.now() - 11 * 60_000).toISOString();
  row.state = JSON.stringify(state);
  await assert.rejects(api.getRoom(host.code, host.playerToken), /자동 종료/);
  await assert.rejects(api.getRoom(host.code, host.playerToken), /방을 찾을 수 없습니다/);
  const active = await api.createRoom('active', 'watermelon');
  await api.joinRoom(active.code, 'guest');
  await api.actOnRoom(active.code, active.playerToken, 'start', {});
  const activeRow = rows.get(active.code);
  const activeState = JSON.parse(activeRow.state);
  activeState.aloneSince = activeState.waitingSince = new Date(0).toISOString();
  activeRow.state = JSON.stringify(activeState);
  assert.equal((await api.getRoom(active.code, active.playerToken)).status, 'playing');
});
