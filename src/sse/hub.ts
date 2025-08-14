// src/sse/hub.ts
import type { Response } from "express";

export class SSEHub {
  private clients = new Map<string, Set<Response>>();
  private readonly heartbeatMs = 25_000; // Heroku-ystävällinen

  add(deviceId: string, res: Response) {
    let set = this.clients.get(deviceId);
    if (!set) this.clients.set(deviceId, (set = new Set()));
    set.add(res);

    // keepalive-kommentti 25s välein
    const timer = setInterval(() => {
      if (!this.safeWrite(res, `:ka ${Date.now()}\n\n`)) {
        clearInterval(timer);
        set!.delete(res);
        try { res.end(); } catch {}
      }
    }, this.heartbeatMs);

    // siivoa kun yhteys sulkeutuu
    res.on("close", () => {
      clearInterval(timer);
      set!.delete(res);
      if (set!.size === 0) this.clients.delete(deviceId);
      try { res.end(); } catch {}
    });
  }

  // Lähetä snapshot heti (kun client liittyy)
  snapshot(deviceId: string, payload: any) {
    this.safeBroadcast(deviceId, `data: ${JSON.stringify(payload)}\n\n`);
  }

  // Lähetä normaali update (MQTT-viestistä tms.)
  broadcast(deviceId: string, payload: any) {
    this.safeBroadcast(deviceId, `data: ${JSON.stringify(payload)}\n\n`);
  }

  private safeBroadcast(deviceId: string, frame: string) {
    const set = this.clients.get(deviceId);
    if (!set) return;
    for (const res of set) {
      if (!this.safeWrite(res, frame)) {
        set.delete(res);
        try { res.end(); } catch {}
      }
    }
    if (set.size === 0) this.clients.delete(deviceId);
  }

  private safeWrite(res: Response, chunk: string) {
    try {
      // @ts-ignore
      if (res.writableEnded || res.destroyed) return false;
      res.write(chunk);
      return true;
    } catch {
      return false;
    }
  }
}

// Yksi globaali instanssi
export const hub = new SSEHub();
