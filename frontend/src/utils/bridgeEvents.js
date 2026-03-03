import { ENV } from "../config/env";

export const REMIT_EVENT_SOURCE = ENV.REMIT_EVENT_SOURCE;

export function emitRemitEvent(type, payload = {}) {
  window.postMessage(
    {
      source: REMIT_EVENT_SOURCE,
      type,
      ...payload,
    },
    window.location.origin
  );
}
