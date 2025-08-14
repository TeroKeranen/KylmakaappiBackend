// src/state/store.ts
const lastState = new Map<string, any>();
const lastSeen  = new Map<string, number>();

export function setState(deviceId: string, state: any) {
  lastState.set(deviceId, state);
  lastSeen.set(deviceId, Date.now());
}

export const getLastState = (id: string) => lastState.get(id);
export const getLastSeen  = (id: string) => lastSeen.get(id);
