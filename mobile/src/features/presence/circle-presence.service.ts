import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  CirclePresenceMap,
  CirclePresencePayload,
  RealtimeConnectionState,
} from './circle-presence.types';
import { normalizePresenceState } from './normalize-presence-state';
import { circleTopic, parseCircleTopic } from './topic';
import { parseVerifiedBroadcastPayload } from './verified-response.bus';
import { useVerifiedResponseStore } from './verified-response.store';

type Listener = (map: CirclePresenceMap, connection: RealtimeConnectionState) => void;

/**
 * At most one open circle channel.
 * Phase 6.5: Presence = present only. Orange comes from verified-response map.
 */
class CirclePresenceService {
  private channel: RealtimeChannel | null = null;
  private circleId: string | null = null;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private connection: RealtimeConnectionState = 'idle';
  private localSessions: CirclePresencePayload[] = [];
  private listeners = new Set<Listener>();
  private map: CirclePresenceMap = {};

  getConnectionState(): RealtimeConnectionState {
    return this.connection;
  }

  getMap(): CirclePresenceMap {
    return this.map;
  }

  getChannel(): RealtimeChannel | null {
    return this.channel;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.map, this.connection);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l(this.map, this.connection);
  }

  private setConnection(next: RealtimeConnectionState) {
    this.connection = next;
    this.emit();
  }

  private setMap(map: CirclePresenceMap) {
    this.map = map;
    this.emit();
  }

  private buildPayload(): CirclePresencePayload {
    return {
      userId: this.userId!,
      circleId: this.circleId!,
      state: 'present',
      sessionId: this.sessionId!,
    };
  }

  private bindBroadcast(channel: RealtimeChannel) {
    channel
      .on('broadcast', { event: 'circle_response_verified' }, ({ payload }) => {
        const parsed = parseVerifiedBroadcastPayload(payload);
        if (parsed?.type === 'circle_response_verified') {
          useVerifiedResponseStore.getState().applyVerified(parsed);
        }
      })
      .on('broadcast', { event: 'circle_post_closed' }, ({ payload }) => {
        const parsed = parseVerifiedBroadcastPayload({
          ...(payload as object),
          type: 'circle_post_closed',
        });
        if (parsed?.type === 'circle_post_closed') {
          useVerifiedResponseStore.getState().applyClosed(parsed);
        }
      });
  }

  async join(input: {
    circleId: string;
    userId: string;
    isMember: boolean;
  }): Promise<RealtimeConnectionState> {
    if (!input.isMember) {
      await this.leave();
      this.setConnection('forbidden');
      return 'forbidden';
    }

    const topic = circleTopic(input.circleId);
    if (!parseCircleTopic(topic)) {
      this.setConnection('error');
      return 'error';
    }

    if (
      this.channel &&
      this.circleId === input.circleId &&
      this.userId === input.userId &&
      this.connection === 'connected'
    ) {
      return 'connected';
    }

    await this.leave();

    this.circleId = input.circleId;
    this.userId = input.userId;
    this.sessionId = `${input.userId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    this.setConnection('connecting');

    if (!isSupabaseConfigured) {
      return this.joinLocal();
    }

    const channel = supabase.channel(topic, {
      config: {
        private: true,
        presence: { key: this.sessionId },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState<CirclePresencePayload>();
        this.setMap(normalizePresenceState(state as Record<string, CirclePresencePayload[]>));
      });

    this.bindBroadcast(channel);
    this.channel = channel;

    return new Promise((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track(this.buildPayload());
            this.setConnection('connected');
            resolve('connected');
          } catch {
            this.setConnection('error');
            resolve('error');
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.setConnection('forbidden');
          resolve('forbidden');
        } else if (status === 'CLOSED') {
          this.setConnection('idle');
        }
      });
    });
  }

  private joinLocal(): RealtimeConnectionState {
    const payload = this.buildPayload();
    this.localSessions = [payload];
    this.setMap(normalizePresenceState(this.localSessions));
    this.setConnection('connected');
    return 'connected';
  }

  /**
   * @deprecated Phase 6.5 — orange comes from verified-response map, not Presence.
   * Kept as no-op so callers do not accidentally reintroduce spoofable orange.
   */
  async trackResponded(activePostId: string): Promise<void> {
    void activePostId;
    /* intentional no-op — orange from verified-response map only */
  }

  async trackPresent(activePostId?: string | null): Promise<void> {
    void activePostId;
    if (!this.circleId || !this.userId || this.connection !== 'connected') return;
    if (!isSupabaseConfigured) {
      this.setMap(normalizePresenceState(this.localSessions));
      return;
    }
    if (this.channel) {
      await this.channel.track(this.buildPayload());
    }
  }

  /** Demo: extra session for same user (still present-only) */
  trackLocalExtraSession(userId: string): void {
    if (!this.circleId || isSupabaseConfigured) return;
    this.localSessions.push({
      userId,
      circleId: this.circleId,
      state: 'present',
      sessionId: `${userId}:extra:${Date.now()}`,
    });
    this.setMap(normalizePresenceState(this.localSessions));
  }

  /**
   * Demo attack helper — simulates spoofed responded payload.
   * Must NOT create orange badges after 6.5.
   */
  trackLocalSpoofedResponded(userId: string, _postId: string): void {
    if (!this.circleId || isSupabaseConfigured) return;
    this.localSessions.push({
      userId,
      circleId: this.circleId,
      state: 'present',
      sessionId: `${userId}:spoof:${Date.now()}`,
    });
    // Even if attacker sent responded in raw bag, normalizer ignores it:
    const spoofBag = {
      [`${userId}:spoof`]: [
        {
          userId,
          circleId: this.circleId,
          state: 'responded',
          activePostId: _postId,
          sessionId: `${userId}:spoof`,
        },
      ],
    };
    this.setMap(
      normalizePresenceState(spoofBag as Record<string, CirclePresencePayload[]>),
    );
  }

  async leave(): Promise<void> {
    const ch = this.channel;
    this.channel = null;
    this.localSessions = [];
    this.setMap({});
    this.circleId = null;
    this.userId = null;
    this.sessionId = null;

    if (ch) {
      try {
        await ch.untrack();
      } catch {
        /* ignore */
      }
      try {
        await supabase.removeChannel(ch);
      } catch {
        /* ignore */
      }
    }
    this.setConnection('idle');
  }

  async onAppBackground(): Promise<void> {
    await this.leave();
  }

  async onAppForeground(input: {
    circleId: string;
    userId: string;
    isMember: boolean;
  }): Promise<void> {
    await this.join(input);
  }
}

export const circlePresenceService = new CirclePresenceService();
