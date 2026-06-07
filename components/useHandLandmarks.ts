import { useEffect, useMemo } from "react";
import {
    VisionCameraProxy,
    runAtTargetFps,
    useFrameProcessor,
} from "react-native-vision-camera";
import { Worklets, useSharedValue } from "react-native-worklets-core";
import type { Landmark } from "./HandLandmarkOverlay";

export type Prediction = {
  label: string;
  confidence: number;
  source: "letter" | "word";
};
export type DetectionMode = "alphabet" | "words" | "practice";

const plugin = VisionCameraProxy.initFrameProcessorPlugin(
  "detectHandLandmarks",
  {},
);

interface UseHandLandmarksProps {
  letterLabels: string[];
  phraseLabels: string[];
  letterClassifier: any;
  phraseClassifier: any;
  onPrediction: (p: Prediction) => void;
  onLandmarks?: (lms: Landmark[][]) => void;
  onError?: (msg: string) => void;
  enabled?: boolean;
  threshold?: number;
  mode?: DetectionMode;
  isFrontCamera?: boolean;
}

const PHRASE_COLLECT = 14;
const PHRASE_MODEL_FRAMES = 30;
const RING_SIZE = 24;
const PROCESS_FPS = 16;
const PHRASE_MIN_WORDS = 28;
const INFER_EVERY = 2;

function usePhraseSlots() {
  return [
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
    useSharedValue(new Float32Array(63)),
  ];
}

function handSpread(flat: number[]): number {
  "worklet";
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

function flatToFrame63(flat: number[]): Float32Array {
  "worklet";
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

/** Native plugin returns flat [handCount, ...63 floats per hand]. JSI cannot read double[][]. */
function parsePluginHands(raw: unknown): number[][] | null {
  "worklet";
  if (raw == null) return null;

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "number") {
    const count = Math.min(Math.max(0, Math.floor(raw[0] as number)), 2);
    if (count === 0) return null;
    const hands: number[][] = [];
    let offset = 1;
    for (let h = 0; h < count; h++) {
      const slice = (raw as number[]).slice(offset, offset + 63);
      if (slice.length < 63) return hands.length > 0 ? hands : null;
      hands.push(slice);
      offset += 63;
    }
    return hands.length > 0 ? hands : null;
  }

  if (Array.isArray(raw) && Array.isArray(raw[0])) {
    return raw as number[][];
  }

  return null;
}

function flatToLandmarks(
  raw: number[][],
  mirror: boolean,
): Landmark[][] {
  "worklet";
  const out: Landmark[][] = [];
  for (let h = 0; h < raw.length; h++) {
    const flat = raw[h]!;
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

export function useHandLandmarks({
  letterLabels,
  phraseLabels,
  letterClassifier,
  phraseClassifier,
  onPrediction,
  onLandmarks,
  onError,
  enabled = true,
  threshold = 0,
  mode = "alphabet",
  isFrontCamera = false,
}: UseHandLandmarksProps) {
  const jsOnPrediction = useMemo(
    () => Worklets.createRunOnJS(onPrediction),
    [onPrediction],
  );
  const jsOnLandmarks = useMemo(
    () => (onLandmarks ? Worklets.createRunOnJS(onLandmarks) : null),
    [onLandmarks],
  );
  const jsOnError = useMemo(
    () =>
      Worklets.createRunOnJS((m: string) => {
        console.warn("[MediaPipe]", m);
        onError?.(m);
      }),
    [onError],
  );

  const letterLabelsShared = useSharedValue(letterLabels);
  const phraseLabelsShared = useSharedValue(phraseLabels);
  const modeShared = useSharedValue(mode);
  const frontShared = useSharedValue(isFrontCamera);
  letterLabelsShared.value = letterLabels;
  phraseLabelsShared.value = phraseLabels;
  modeShared.value = mode;
  frontShared.value = isFrontCamera;

  const slots = usePhraseSlots();
  const writeHead = useSharedValue(0);
  const countShared = useSharedValue(0);
  const frameTick = useSharedValue(0);
  const phraseVote0 = useSharedValue(-1);
  const phraseVote1 = useSharedValue(-1);
  const phraseVote2 = useSharedValue(-1);
  const phraseVotePos = useSharedValue(0);
  const lastPredLabel = useSharedValue("");
  const lastPredConf = useSharedValue(-1);
  const lastPredSource = useSharedValue("");

  useEffect(() => {
    writeHead.value = 0;
    countShared.value = 0;
    phraseVote0.value = -1;
    phraseVote1.value = -1;
    phraseVote2.value = -1;
    phraseVotePos.value = 0;
    lastPredLabel.value = "";
    lastPredConf.value = -1;
    lastPredSource.value = "";
  }, [mode]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!enabled || !plugin) return;

      runAtTargetFps(PROCESS_FPS, () => {
        "worklet";
        try {
          frameTick.value += 1;

          const rawFlat = parsePluginHands(plugin.call(frame));

          if (!rawFlat || rawFlat.length === 0) {
            countShared.value = 0;
            writeHead.value = 0;
            phraseVote0.value = -1;
            phraseVote1.value = -1;
            phraseVote2.value = -1;
            phraseVotePos.value = 0;
            if (jsOnLandmarks) {
              jsOnLandmarks([]);
            }
            return;
          }

          if (jsOnLandmarks) {
            jsOnLandmarks(flatToLandmarks(rawFlat, frontShared.value));
          }

          let primaryFlat = rawFlat[0]!;
          let bestSpread = handSpread(primaryFlat);
          for (let h = 1; h < rawFlat.length; h++) {
            const flat = rawFlat[h]!;
            if (!flat || flat.length < 63) continue;
            const spread = handSpread(flat);
            if (spread > bestSpread) {
              bestSpread = spread;
              primaryFlat = flat;
            }
          }

          if (!primaryFlat || primaryFlat.length < 63) return;

          const frame63 = flatToFrame63(primaryFlat);

          const slotIdx = writeHead.value;
          slots[slotIdx]!.value = frame63;
          writeHead.value = (slotIdx + 1) % RING_SIZE;
          countShared.value = Math.min(countShared.value + 1, RING_SIZE);

          const currentMode = modeShared.value;
          const isWordsMode = currentMode === "words";
          const isAlphabetMode = currentMode === "alphabet" || currentMode === "practice";
          let letterLabel = "?";
          let letterConf = 0;
          let phraseLabel = "?";
          let phraseConf = 0;

          const runInfer = frameTick.value % INFER_EVERY === 0;

          if (!runInfer) return;

          if (!isWordsMode && letterClassifier) {
            const clsOut = letterClassifier.runSync([frame63]);
            const probs = clsOut[0] as Float32Array;
            let topIdx = 0;
            let topVal = probs[0] ?? 0;
            for (let i = 1; i < probs.length; i++) {
              if ((probs[i] ?? 0) > topVal) {
                topVal = probs[i] ?? 0;
                topIdx = i;
              }
            }
            letterConf = Math.round(topVal * 100);
            letterLabel = letterLabelsShared.value[topIdx] ?? "?";
          }

          const frameCount = countShared.value;
          const bufferReady = frameCount >= PHRASE_COLLECT;
          const needsPhrase = !isAlphabetMode && isWordsMode;
          const shouldRunPhrase =
            needsPhrase && bufferReady && phraseClassifier;

          if (shouldRunPhrase) {
            const phraseIn = new Float32Array(PHRASE_MODEL_FRAMES * 63);
            const oldest = frameCount >= RING_SIZE ? writeHead.value : 0;

            for (let out = 0; out < PHRASE_MODEL_FRAMES; out++) {
              const srcFrame =
                PHRASE_MODEL_FRAMES === 1
                  ? 0
                  : Math.round(
                      (out * (frameCount - 1)) / (PHRASE_MODEL_FRAMES - 1),
                    );
              const idx = (oldest + srcFrame) % RING_SIZE;
              const slot = slots[idx]!.value;
              const base = out * 63;
              for (let j = 0; j < 63; j++) {
                phraseIn[base + j] = slot[j] ?? 0;
              }
            }

            let motion = 0;
            for (let f = 1; f < PHRASE_MODEL_FRAMES; f++) {
              const prevBase = (f - 1) * 63;
              const currBase = f * 63;
              for (let lm = 1; lm < 21; lm++) {
                const o = lm * 3;
                const dx = phraseIn[currBase + o]! - phraseIn[prevBase + o]!;
                const dy =
                  phraseIn[currBase + o + 1]! - phraseIn[prevBase + o + 1]!;
                motion += dx * dx + dy * dy;
              }
            }

            if (motion >= 0.00005) {
              const phraseOut = phraseClassifier.runSync([phraseIn]);
              const probs = phraseOut[0] as Float32Array;
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

              const margin = topVal - secondVal;
              if (topVal >= 0.22 && margin >= 0.03) {
                const voteSlot = phraseVotePos.value % 3;
                if (voteSlot === 0) phraseVote0.value = topIdx;
                else if (voteSlot === 1) phraseVote1.value = topIdx;
                else phraseVote2.value = topIdx;
                phraseVotePos.value += 1;

                const v0 = phraseVote0.value;
                const v1 = phraseVote1.value;
                const v2 = phraseVote2.value;
                let winnerIdx = topIdx;
                if (v0 >= 0 && v0 === v1) winnerIdx = v0;
                else if (v1 >= 0 && v1 === v2) winnerIdx = v1;
                else if (v0 >= 0 && v0 === v2) winnerIdx = v0;

                phraseConf = Math.round(topVal * 100);
                phraseLabel = phraseLabelsShared.value[winnerIdx] ?? "?";
              }
            }
          }

          const pushPrediction = (p: Prediction) => {
            if (
              p.label === lastPredLabel.value &&
              p.confidence === lastPredConf.value &&
              p.source === lastPredSource.value
            ) {
              return;
            }
            lastPredLabel.value = p.label;
            lastPredConf.value = p.confidence;
            lastPredSource.value = p.source;
            jsOnPrediction(p);
          };

          if (isAlphabetMode && letterConf >= threshold) {
            pushPrediction({
              label: letterLabel,
              confidence: letterConf,
              source: "letter",
            });
          } else if (isWordsMode) {
            if (!bufferReady) {
              const pct = Math.round((frameCount / PHRASE_COLLECT) * 100);
              pushPrediction({
                label: "…",
                confidence: pct,
                source: "word",
              });
            } else if (phraseConf >= PHRASE_MIN_WORDS && phraseLabel !== "?") {
              pushPrediction({
                label: phraseLabel,
                confidence: phraseConf,
                source: "word",
              });
            } else {
              pushPrediction({
                label: "?",
                confidence: phraseConf,
                source: "word",
              });
            }
          }
        } catch (e) {
          jsOnError(String(e));
        }
      });
    },
    [
      letterClassifier,
      phraseClassifier,
      enabled,
      threshold,
      modeShared,
      frontShared,
      letterLabelsShared,
      phraseLabelsShared,
      countShared,
      writeHead,
      frameTick,
      phraseVote0,
      phraseVote1,
      phraseVote2,
      phraseVotePos,
      lastPredLabel,
      lastPredConf,
      lastPredSource,
      ...slots,
      jsOnPrediction,
      jsOnLandmarks,
      jsOnError,
    ],
  );

  return { frameProcessor };
}
