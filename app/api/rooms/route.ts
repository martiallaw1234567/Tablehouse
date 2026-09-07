import { createRoom, joinRoom, listOpenRooms, type GameType } from "./room-state";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  try {
    return Response.json({ rooms: await listOpenRooms() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: string;
      name?: string;
      code?: string;
      gameType?: GameType;
    };
    if (payload.action === "create") {
      return Response.json(await createRoom(payload.name ?? "", payload.gameType), {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (payload.action === "join") {
      return Response.json(await joinRoom(payload.code ?? "", payload.name ?? ""), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    return Response.json({ error: "create 또는 join 동작이 필요합니다." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
