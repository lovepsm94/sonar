import { deflate, inflate } from 'pako';

export interface SignalPayload {
  role: 'offer' | 'answer';
  seed: number;          // map seed (only meaningful on the offer)
  sdp: string;           // full SDP with bundled (non-trickle) ICE candidates
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = (typeof btoa !== 'undefined' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64'));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = (typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeSignal(p: SignalPayload): string {
  const json = JSON.stringify(p);
  return toBase64Url(deflate(json));
}

export function decodeSignal(s: string): SignalPayload {
  const json = inflate(fromBase64Url(s), { to: 'string' });
  return JSON.parse(json) as SignalPayload;
}
