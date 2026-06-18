import { describe, it, expect } from 'vitest';
import { encodeSignal, decodeSignal, readPeerCode, type SignalPayload } from '@/net/signaling';

const sample: SignalPayload = {
  role: 'offer',
  seed: 123456,
  sdp: 'v=0\r\no=- 46117 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\n'.repeat(8),
};

describe('signaling', () => {
  it('round-trips an offer payload', () => {
    const s = encodeSignal(sample);
    expect(decodeSignal(s)).toEqual(sample);
  });

  it('produces a URL-safe base64 string (no +,/,= or whitespace)', () => {
    const s = encodeSignal(sample);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('compresses: encoded length is shorter than raw JSON', () => {
    const raw = JSON.stringify(sample).length;
    expect(encodeSignal(sample).length).toBeLessThan(raw);
  });

  // decodeSignal handles untrusted input (anyone can craft a QR/link). It must reject
  // structurally invalid payloads loudly rather than letting a bad seed/sdp flow on.
  it('rejects a payload with an unknown role', () => {
    const encoded = encodeSignal({ role: 'bogus', seed: 1, sdp: 'x=0' } as unknown as SignalPayload);
    expect(() => decodeSignal(encoded)).toThrow();
  });

  it('rejects a payload with a non-finite seed (NaN round-trips to null)', () => {
    const encoded = encodeSignal({ role: 'offer', seed: NaN, sdp: 'x=0' } as SignalPayload);
    expect(() => decodeSignal(encoded)).toThrow();
  });

  it('rejects a payload missing required fields', () => {
    const encoded = encodeSignal({ foo: 'bar' } as unknown as SignalPayload);
    expect(() => decodeSignal(encoded)).toThrow();
  });

  it('rejects a payload whose sdp is not a string', () => {
    const encoded = encodeSignal({ role: 'answer', seed: 7, sdp: 42 } as unknown as SignalPayload);
    expect(() => decodeSignal(encoded)).toThrow();
  });
});

describe('readPeerCode', () => {
  const offer = encodeSignal(sample);
  const answer = encodeSignal({ role: 'answer', seed: 99, sdp: sample.sdp });

  it('accepts a valid code of the expected role', () => {
    const res = readPeerCode(offer, 'offer');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload.role).toBe('offer');
  });

  it('extracts the code after the last # of a link', () => {
    const res = readPeerCode(`https://x.app/play#${answer}`, 'answer');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.payload.seed).toBe(99);
  });

  it('flags empty / whitespace input as bad-code', () => {
    expect(readPeerCode('', 'offer')).toEqual({ ok: false, error: 'bad-code' });
    expect(readPeerCode('   ', 'offer')).toEqual({ ok: false, error: 'bad-code' });
  });

  it('flags a corrupt code as bad-code', () => {
    expect(readPeerCode('not-a-real-code!!', 'offer')).toEqual({ ok: false, error: 'bad-code' });
  });

  it('flags a valid code of the wrong role as wrong-role', () => {
    expect(readPeerCode(offer, 'answer')).toEqual({ ok: false, error: 'wrong-role' });
    expect(readPeerCode(answer, 'offer')).toEqual({ ok: false, error: 'wrong-role' });
  });
});
