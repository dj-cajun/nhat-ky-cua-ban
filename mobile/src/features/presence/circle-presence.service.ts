import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  CirclePresenceMap,
  CirclePresencePayload,
  RealtimeConnectionState,
} from './circle-presence.types';
import { normalizePresenceState } from './normalize-presence-state';
import { circleTopic, parseCircleTopic } from './topic';

type Listener = (map: CirclePresenceMap, connection: RealtimeConnectionState) => void;

/**
 * At most one open circle channel.
 * Production: private Realtime Presence.
 * Demo (no Supabase): in-memory local track only — never writes last_seen to DB.
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

    // Already on this circle with same user
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
      return this.joinLocal(input.circleId, input.userId);
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

    this.channel = channel;

    return new Promise((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const payload: CirclePresencePayload = {
            userId: input.userId,
            circleId: input.circleId,
            state: 'present',
            sessionId: this.sessionId!,
          };
          try {
            await channel.track(payload);
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

  private joinLocal(circleId: string, userId: string): RealtimeConnectionState {
    const payload: CirclePresencePayload = {
      userId,
      circleId,
      state: 'present',
      sessionId: this.sessionId!,
    };
    this.localSessions = [payload];
    this.setMap(normalizePresenceState(this.localSessions));
    this.setConnection('connected');
    return 'connected';
  }

  /** Demo helper: simulate another device/session for the same user */
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
