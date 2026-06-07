import type { Landmark } from "@/components/HandLandmarkOverlay";

export const PHRASE_COLLECT = 14;
export const PHRASE_MODEL_FRAMES = 30;
export const RING_SIZE = 24;
export const PHRASE_MIN_WORDS = 28;

export function handSpread(flat: number[]): number {
  const wx = flat[0] ?? 0;
  const wy = flat[1] ?? 0;
  let spread = 0;
  for (let i = 1; i < 21; i++) {
    const o = i * 3;
    const dx = (flat[o] ?? 0) - wx;
    const dy = (flat[o + 1] ?? 0) - wy;
    spread += dx * dx + dy * dy;
  }
  return spread;
}

export function flatToFrame63(flat: number[]): Float32Array {
  const wx = flat[0] ?? 0;
  const wy = flat[1] ?? 0;
  const wz = flat[2] ?? 0;
  const frame63 = new Float32Array(63);
  for (let i = 0; i < 21; i++) {
    const o = i * 3;
    frame63[o] = (flat[o] ?? 0) - wx;
    frame63[o + 1] = (flat[o + 1] ?? 0) - wy;
    frame63[o + 2] = (flat[o + 2] ?? 0) - wz;
  }
  return frame63;
}

export function mediapipeToFlat(landmarks: { x: number; y: number; z: number }[]): number[] {
  const flat: number[] = [];
  for (const lm of landmarks) {
    flat.push(lm.x, lm.y, lm.z);
  }
  return flat;
}

export function flatToLandmarks(
  hands: number[][],
  mirror: boolean,
): Landmark[][] {
  const out: Landmark[][] = [];
  for (const flat of hands) {
    if (!flat || flat.length < 63) continue;
    const hand: Landmark[] = [];
    for (let i = 0; i < 21; i++) {
      const o = i * 3;
      hand.push({
        x: mirror ? 1 - (flat[o] ?? 0) : (flat[o] ?? 0),
        y: flat[o + 1] ?? 0,
        z: flat[o + 2] ?? 0,
      });
    }
    out.push(hand);
  }
  return out;
}

export function pickPrimaryHand(hands: number[][]): number[] | null {
  if (hands.length === 0) return null;
  let primary = hands[0]!;
  let best = handSpread(primary);
  for (let h = 1; h < hands.length; h++) {
    const flat = hands[h]!;
    if (flat.length < 63) continue;
    const spread = handSpread(flat);
    if (spread > best) {
      best = spread;
      primary = flat;
    }
  }
  return primary.length >= 63 ? primary : null;
}

export function argmaxProbs(probs: Float32Array | number[]): {
  idx: number;
  conf: number;
  topVal: number;
  secondVal: number;
} {
  let topIdx = 0;
  let topVal = probs[0] ?? 0;
  let secondVal = 0;
  for (let i = 1; i < probs.length; i++) {
    const v = probs[i] ?? 0;
    if (v > topVal) {
      secondVal = topVal;
      topVal = v;
      topIdx = i;
    } else if (v > secondVal) {
      secondVal = v;
    }
  }
  return {
    idx: topIdx,
    conf: Math.round(topVal * 100),
    topVal,
    secondVal,
  };
}
