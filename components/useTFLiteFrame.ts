import { useMemo } from "react";
import { useTensorflowModel } from "react-native-fast-tflite";
import { runAtTargetFps, useFrameProcessor } from "react-native-vision-camera";
import { Worklets, useSharedValue } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";
import type { Landmark } from "./HandLandmarkOverlay";

export type Prediction = { label: string; confidence: number };

interface UseTFLiteFrameProps {
  labels: string[];
  onPrediction: (p: Prediction) => void;
  onLandmarks?: (lms: Landmark[]) => void;
  onError?: (msg: string) => void;
  enabled?: boolean;
  threshold?: number;
  containerWidth?: number;
  containerHeight?: number;
}

export function useTFLiteFrame({
  labels,
  onPrediction,
  onLandmarks,
  onError,
  enabled = true,
  threshold = 0,
}: UseTFLiteFrameProps) {
  const lmPlugin = useTensorflowModel(
    require("../assets/models/hand_landmarks_detector.tflite"),
  );
  const clsPlugin = useTensorflowModel(
    require("../assets/models/asl_model.tflite"),
  );
  const lmModel = lmPlugin.state === "loaded" ? lmPlugin.model : undefined;
  const clsModel = clsPlugin.state === "loaded" ? clsPlugin.model : undefined;
  const modelReady = !!lmModel && !!clsModel;
  const modelState =
    lmPlugin.state === "error" || clsPlugin.state === "error"
      ? "error"
      : modelReady
        ? "loaded"
        : "loading";

  const { resize } = useResizePlugin();
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
        console.warn("[TFLite]", m);
        onError?.(m);
      }),
    [],
  );
  const labelsShared = useSharedValue(labels);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!enabled || !lmModel || !clsModel) return;
      runAtTargetFps(6, () => {
        "worklet";
        try {
          const lmRaw = resize(frame, {
            scale: { width: 224, height: 224 },
            pixelFormat: "rgb",
            dataType: "float32",
          }) as Float32Array;

          const lmOut = lmModel.runSync([lmRaw]);
          const rawLms = lmOut[0] as Float32Array;
          if (!rawLms || rawLms.length < 63) return;

          // Wrist-relative normalisation
          const wx = (rawLms[0] ?? 0) / 224;
          const wy = (rawLms[1] ?? 0) / 224;
          const wz = (rawLms[2] ?? 0) / 224;
          const clsIn = new Float32Array(63);
          for (let i = 0; i < 21; i++) {
            clsIn[i * 3] = (rawLms[i * 3] ?? 0) / 224 - wx;
            clsIn[i * 3 + 1] = (rawLms[i * 3 + 1] ?? 0) / 224 - wy;
            clsIn[i * 3 + 2] = (rawLms[i * 3 + 2] ?? 0) / 224 - wz;
          }

          const clsOut = clsModel.runSync([clsIn]);
          const probs = clsOut[0] as Float32Array;
          let topIdx = 0,
            topVal = probs[0] ?? 0;
          for (let i = 1; i < probs.length; i++) {
            if ((probs[i] ?? 0) > topVal) {
              topVal = probs[i] ?? 0;
              topIdx = i;
            }
          }
          const confidence = Math.round(topVal * 100);
          const label = labelsShared.value[topIdx] ?? "?";
          if (confidence >= threshold) jsOnPrediction({ label, confidence });

          if (jsOnLandmarks) {
            const lms: Landmark[] = [];
            for (let i = 0; i < 21; i++) {
              lms.push({
                x: (rawLms[i * 3] ?? 0) / 224,
                y: (rawLms[i * 3 + 1] ?? 0) / 224,
                z: rawLms[i * 3 + 2] ?? 0,
              });
            }
            jsOnLandmarks(lms);
          }
        } catch (e) {
          jsOnError(String(e));
        }
      });
    },
    [
      lmModel,
      clsModel,
      enabled,
      threshold,
      labelsShared,
      jsOnPrediction,
      jsOnLandmarks,
      jsOnError,
    ],
  );

  return { frameProcessor, modelReady, modelState };
}
