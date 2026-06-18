import { describe, it, expect } from 'vitest';
import { encodeSignal, decodeSignal, type SignalPayload } from '@/net/signaling';

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
