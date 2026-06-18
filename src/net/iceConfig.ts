/**
 * Builds the ICE server list for RTCPeerConnection.
 *
 * STUN lets each peer discover its public address — enough when at least one side
 * has a cone NAT. But mobile carriers (4G) almost always sit behind CGNAT /
 * symmetric NAT, where STUN fails and a TURN relay is mandatory. So the default
 * list pairs Google STUN with the public Open Relay TURN servers.
 *
 * Since this is a static, backend-less app we cannot mint short-lived TURN
 * credentials server-side — they must ship in the bundle. The Open Relay
 * credentials are public by design, so that is acceptable. For a private,
 * higher-reliability relay (e.g. your own Metered/Cloudflare app), set
 * NEXT_PUBLIC_ICE_SERVERS to a JSON array of RTCIceServer objects; it overrides
 * the default entirely. A malformed value falls back to the default rather than
 * breaking connection setup.
 */

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  {
    // Open Relay public TURN. 443 + turns: (TLS over 443) traverses strict firewalls
    // that block UDP and odd ports.
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function isIceServerArray(value: unknown): value is RTCIceServer[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((s) => s != null && typeof s === 'object' && 'urls' in s)
  );
}

export function buildIceServers(
  raw: string | undefined = process.env.NEXT_PUBLIC_ICE_SERVERS,
): RTCIceServer[] {
  if (!raw) return DEFAULT_ICE_SERVERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isIceServerArray(parsed) ? parsed : DEFAULT_ICE_SERVERS;
  } catch {
    return DEFAULT_ICE_SERVERS;
  }
}
