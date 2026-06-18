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
});
