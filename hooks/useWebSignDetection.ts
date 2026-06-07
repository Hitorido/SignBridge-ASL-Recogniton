import type { Landmark } from "@/components/HandLandmarkOverlay";
import type { DetectionMode, Prediction } from "@/components/useHandLandmarks";
import {
  PHRASE_COLLECT,
  PHRASE_MIN_WORDS,
  PHRASE_MODEL_FRAMES,
  RING_SIZE,
  argmaxProbs,
  flatToFrame63,
  flatToLandmarks,
  mediapipeToFlat,
  pickPrimaryHand,
} from "@/lib/signMath";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "react-native";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const TFLITE_WASM =
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.10/dist/";

type HandLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { landmarks: { x: number; y: number; z: number }[][] };
  close: () => void;
};

type TfliteModel = {
  predict: (input: unknown) => { data: () => Promise<Float32Array>; dispose?: () => void };
};

async function loadModelBuffer(moduleId: number): Promise<ArrayBuffer> {
  const src = Image.resolveAssetSource(moduleId);
  if (!src?.uri) {
    throw new Error("Model asset URI not found");
  }
  const res = await fetch(src.uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch model: ${res.status}`);
  }
  return res.arrayBuffer();
}

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  letterLabels: string[];
  phraseLabels: string[];
  mode: DetectionMode;
  enabled?: boolean;
  threshold?: number;
  mirror?: boolean;
  onPrediction: (p: Prediction) => void;
};

export function useWebSignDetection({
  videoRef,
  letterLabels,
  phraseLabels,
  mode,
  enabled = true,
  threshold = 40,
  mirror = true,
  onPrediction,
}: Props) {
  const [landmarks, setLandmarks] = useState<Landmark[][]>([]);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const handRef = useRef<HandLandmarkerInstance | null>(null);
  const letterModelRef = useRef<TfliteModel | null>(null);
  const phraseModelRef = useRef<TfliteModel | null>(null);
  const tfRef = useRef<typeof import("@tensorflow/tfjs") | null>(null);
  const slotsRef = useRef<Float32Array[]>(
    Array.from({ length: RING_SIZE }, () => new Float32Array(63)),
  );
  const writeHeadRef = useRef(0);
  const countRef = useRef(0);
  const frameTickRef = useRef(0);
  const phraseVotesRef = useRef([-1, -1, -1]);
  const phraseVotePosRef = useRef(0);
  const lastPredRef = useRef<Prediction | null>(null);
  const onPredictionRef = useRef(onPrediction);
  onPredictionRef.current = onPrediction;

  const pushPrediction = useCallback((p: Prediction) => {
    const last = lastPredRef.current;
    if (
      last?.label === p.label &&
      last?.confidence === p.confidence &&
      last?.source === p.source
    ) {
      return;
    }
    lastPredRef.current = p;
    onPredictionRef.current(p);
  }, []);

  useEffect(() => {
    writeHeadRef.current = 0;
    countRef.current = 0;
    phraseVotesRef.current = [-1, -1, -1];
    phraseVotePosRef.current = 0;
    lastPredRef.current = null;
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      try {
        const [tf, tflite, vision] = await Promise.all([
          import("@tensorflow/tfjs"),
          import("@tensorflow/tfjs-tflite"),
          import("@mediapipe/tasks-vision"),
        ]);

        await tf.setBackend("webgl");
        await tf.ready();
        await tflite.setWasmPath(TFLITE_WASM);
        tfRef.current = tf;

        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const handLandmarker = await vision.HandLandmarker.createFromOptions(
          fileset,
          {
            baseOptions: { modelAssetPath: HAND_MODEL, delegate: "GPU" },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.35,
            minHandPresenceConfidence: 0.35,
            minTrackingConfidence: 0.35,
          },
        );

        const letterBuffer = await loadModelBuffer(
          require("../assets/models/asl_model.tflite"),
        );
        const phraseBuffer = await loadModelBuffer(
          require("../assets/models/phrase_model.tflite"),
        );
        const letterModel = await tflite.loadTFLiteModel(letterBuffer);
        const phraseModel = await tflite.loadTFLiteModel(phraseBuffer);

        if (cancelled) return;
        handRef.current = handLandmarker;
        letterModelRef.current = letterModel;
        phraseModelRef.current = phraseModel;
        setModelStatus("ready");
      } catch (e) {
        console.error("[WebSign]", e);
        if (!cancelled) setModelStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      handRef.current?.close();
      handRef.current = null;
      letterModelRef.current = null;
      phraseModelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled || modelStatus !== "ready") return;

    let raf = 0;
    let lastProcess = 0;
    const fps = 14;

    const processFrame = async (now: number) => {
      const video = videoRef.current;
      const handLandmarker = handRef.current;
      const letterModel = letterModelRef.current;
      const phraseModel = phraseModelRef.current;
      const tf = tfRef.current;
      if (
        !video ||
        video.readyState < 2 ||
        !handLandmarker ||
        !letterModel ||
        !phraseModel ||
        !tf
      ) {
        return;
      }

      try {
        frameTickRef.current += 1;
        const result = handLandmarker.detectForVideo(video, now);
        const hands: number[][] = [];
        for (const hand of result.landmarks) {
          hands.push(mediapipeToFlat(hand));
        }

        if (hands.length === 0) {
          countRef.current = 0;
          writeHeadRef.current = 0;
          phraseVotesRef.current = [-1, -1, -1];
          phraseVotePosRef.current = 0;
          setLandmarks([]);
          return;
        }

        setLandmarks(flatToLandmarks(hands, mirror));
        const primary = pickPrimaryHand(hands);
        if (!primary) return;

        const frame63 = flatToFrame63(primary);
        const slotIdx = writeHeadRef.current;
        slotsRef.current[slotIdx] = frame63;
        writeHeadRef.current = (slotIdx + 1) % RING_SIZE;
        countRef.current = Math.min(countRef.current + 1, RING_SIZE);

        if (frameTickRef.current % 2 !== 0) return;

        const isWords = mode === "words";
        const isAlphabet = mode === "alphabet";

        if (isAlphabet) {
          const input = tf.tensor(frame63, [1, 63]);
          const out = letterModel.predict(input);
          const probs = await out.data();
          input.dispose();
          out.dispose?.();
          const { idx: topIdx, conf } = argmaxProbs(probs);
          if (conf >= threshold) {
            pushPrediction({
              label: letterLabels[topIdx] ?? "?",
              confidence: conf,
              source: "letter",
            });
          }
        } else if (isWords) {
          const frameCount = countRef.current;
          if (frameCount < PHRASE_COLLECT) {
            pushPrediction({
              label: "…",
              confidence: Math.round((frameCount / PHRASE_COLLECT) * 100),
              source: "word",
            });
            return;
          }

          const phraseIn = new Float32Array(PHRASE_MODEL_FRAMES * 63);
          const oldest = frameCount >= RING_SIZE ? writeHeadRef.current : 0;
          for (let outI = 0; outI < PHRASE_MODEL_FRAMES; outI++) {
            const srcFrame =
              PHRASE_MODEL_FRAMES === 1
                ? 0
                : Math.round(
                    (outI * (frameCount - 1)) / (PHRASE_MODEL_FRAMES - 1),
                  );
            const ringIdx = (oldest + srcFrame) % RING_SIZE;
            phraseIn.set(slotsRef.current[ringIdx], outI * 63);
          }

          const input = tf.tensor(phraseIn, [1, PHRASE_MODEL_FRAMES * 63]);
          const out = phraseModel.predict(input);
          const probs = await out.data();
          input.dispose();
          out.dispose?.();

          const { idx: topIdx, topVal, secondVal } = argmaxProbs(probs);
          const margin = topVal - secondVal;

          if (topVal >= 0.22 && margin >= 0.03) {
            const voteSlot = phraseVotePosRef.current % 3;
            phraseVotesRef.current[voteSlot] = topIdx;
            phraseVotePosRef.current += 1;
            const [v0, v1, v2] = phraseVotesRef.current;
            let winnerIdx = topIdx;
            if (v0 >= 0 && v0 === v1) winnerIdx = v0;
            else if (v1 >= 0 && v1 === v2) winnerIdx = v1;
            else if (v0 >= 0 && v0 === v2) winnerIdx = v0;

            const phraseConf = Math.round(topVal * 100);
            const phraseLabel = phraseLabels[winnerIdx] ?? "?";
            if (phraseConf >= PHRASE_MIN_WORDS && phraseLabel !== "?") {
              pushPrediction({
                label: phraseLabel,
                confidence: phraseConf,
                source: "word",
              });
              return;
            }
          }
          pushPrediction({ label: "?", confidence: 0, source: "word" });
        }
      } catch (e) {
        console.warn("[WebSign] frame", e);
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - lastProcess < 1000 / fps) return;
      lastProcess = now;
      void processFrame(now);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    enabled,
    modelStatus,
    mode,
    mirror,
    letterLabels,
    phraseLabels,
    threshold,
    pushPrediction,
    videoRef,
  ]);

  return { landmarks, modelStatus };
}
