import { CIRCLE_TOPIC_RE } from './circle-presence.types';

/** Canonical topic: circle:{uuid} */
export function circleTopic(circleId: string): string {
  return `circle:${circleId}`;
}

/** Returns circle UUID or null if topic is invalid / tampered */
export function parseCircleTopic(topic: string): string | null {
  if (!CIRCLE_TOPIC_RE.test(topic)) return null;
  const id = topic.slice('circle:'.length);
  return id || null;
}

export function assertCircleTopic(topic: string): string {
  const id = parseCircleTopic(topic);
  if (!id) {
    throw new Error('Invalid circle presence topic');
  }
  return id;
}
