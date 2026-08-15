import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function run(fn: () => unknown): Promise<Response> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ok(data))
    .catch((e: any) => {
      if (e?.digest && e.digest.startsWith("NEXT_")) throw e;
      const status = typeof e?.status === "number" ? e.status : 500;
      const message = e?.message || "Erro interno";
      console.error("[api]", message, e);
      return fail(status, message);
    });
}
