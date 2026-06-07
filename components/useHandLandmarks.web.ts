import type { Landmark } from "./HandLandmarkOverlay";

export type Prediction = {
  label: string;
  confidence: number;
  source: "letter" | "word";
};
export type DetectionMode = "alphabet" | "words";

interface UseHandLandmarksProps {
  letterLabels: string[];
  phraseLabels: string[];
  letterClassifier: unknown;
  phraseClassifier: unknown;
  onPrediction: (p: Prediction) => void;
  onLandmarks?: (lms: Landmark[][]) => void;
  onError?: (msg: string) => void;
  enabled?: boolean;
  threshold?: number;
  mode?: DetectionMode;
  isFrontCamera?: boolean;
}

/** Web stub — frame processors and TFLite run only on native builds. */
export function useHandLandmarks(_props: UseHandLandmarksProps) {
  return { frameProcessor: undefined };
}
