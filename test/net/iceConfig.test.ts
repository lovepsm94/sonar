import { describe, it, expect } from 'vitest';
import { buildIceServers } from '@/net/iceConfig';

function urlsOf(servers: RTCIceServer[]): string[] {
  return servers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]));
}

describe('buildIceServers', () => {
  it('default (no env) includes both STUN and TURN', () => {
    const urls = urlsOf(buildIceServers(undefined));
    expect(urls.some((u) => u.startsWith('stun:'))).toBe(true);
    expect(urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:'))).toBe(true);
  });

  it('default carries TURN credentials', () => {
    const turn = buildIceServers(undefined).find((s) =>
      urlsOf([s]).some((u) => u.startsWith('turn')),
    );
    expect(turn?.username).toBeTruthy();
    expect(turn?.credential).toBeTruthy();
  });

  it('uses a valid JSON env override verbatim', () => {
    const custom: RTCIceServer[] = [
      { urls: 'turn:my.relay:3478', username: 'u', credential: 'p' },
    ];
    expect(buildIceServers(JSON.stringify(custom))).toEqual(custom);
  });

  it('falls back to default on malformed JSON', () => {
    expect(buildIceServers('not json {')).toEqual(buildIceServers(undefined));
  });

  it('falls back to default when JSON is not an ice-server array', () => {
    expect(buildIceServers('{"urls":"turn:x"}')).toEqual(buildIceServers(undefined));
    expect(buildIceServers('[]')).toEqual(buildIceServers(undefined));
    expect(buildIceServers('[{"foo":1}]')).toEqual(buildIceServers(undefined));
  });
});
