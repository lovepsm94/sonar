import type { WireMessage } from '@/game/protocol';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

/** Resolve once ICE gathering is complete so the SDP carries all candidates (non-trickle). */
function waitForIce(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, 3000);
  });
}

export class PeerLink {
  private pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  onMessage: (m: WireMessage) => void = () => {};
  onOpen: () => void = () => {};
  onClose: () => void = () => {};

  constructor() {
    this.pc = new RTCPeerConnection(ICE_CONFIG);
    this.pc.onconnectionstatechange = () => {
      // 'disconnected' is transient — ICE can recover to 'connected', and the browser
      // promotes a genuinely-dead link to 'failed' on its own. Only treat terminal
      // states as a lost connection so a brief network blip doesn't kill the game.
      if (['failed', 'closed'].includes(this.pc.connectionState)) this.onClose();
    };
  }

  private bindChannel(ch: RTCDataChannel) {
    this.channel = ch;
    ch.onopen = () => this.onOpen();
    ch.onclose = () => this.onClose();
    ch.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data) as WireMessage);
      } catch {
        // ignore malformed frames
      }
    };
  }

  /** Host: create the data channel + offer; returns the SDP string to encode into QR/link. */
  async createOffer(): Promise<string> {
    this.bindChannel(this.pc.createDataChannel('game', { ordered: true }));
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Guest: consume the host offer SDP, produce an answer SDP. */
  async acceptOfferCreateAnswer(offerSdp: string): Promise<string> {
    this.pc.ondatachannel = (e) => this.bindChannel(e.channel);
    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Host: finish the handshake with the guest answer SDP. */
  async acceptAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  send(m: WireMessage): void {
    if (this.channel && this.channel.readyState === 'open') this.channel.send(JSON.stringify(m));
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}
