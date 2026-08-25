import { actOnRoom, getRoom } from "../room-state";

type RouteContext = { params: Promise<{ code: string }> };

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  return Response.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const token = new URL(request.url).searchParams.get("token") ?? "";
    return Response.json(await getRoom(code, token), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const payload = (await request.json()) as {
      action?: string;
      token?: string;
      targetPlayerId?: string;
      slotIndex?: number;
      kind?: "number" | "joker";
      number?: number;
      color?: "black" | "white";
      position?: number;
      message?: string;
    };
    if (!payload.action || !payload.token) {
      return Response.json({ error: "게임 동작과 플레이어 토큰이 필요합니다." }, { status: 400 });
    }
    const state = await actOnRoom(code, payload.token, payload.action, payload);
    return Response.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
