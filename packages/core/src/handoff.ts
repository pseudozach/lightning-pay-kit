export type HandoffMethod = "lightning_uri" | "copy" | "provider_https";

export interface HandoffEvent {
  readonly status: "handed_off";
  readonly method: HandoffMethod;
  readonly providerId?: string;
}

export function createHandoffEvent(
  method: HandoffMethod,
  providerId?: string
): HandoffEvent {
  return providerId === undefined
    ? { status: "handed_off", method }
    : { status: "handed_off", method, providerId };
}

