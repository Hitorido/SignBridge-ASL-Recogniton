import React from "react";
import { View } from "react-native";

export const Camera = View;
export function useCameraDevice() {
  return undefined;
}
export function useCameraFormat() {
  return undefined;
}
export function useCameraPermission() {
  return { hasPermission: false, requestPermission: async () => false };
}
export function useFrameProcessor() {
  return undefined;
}
export const VisionCameraProxy = {
  initFrameProcessorPlugin: () => undefined,
};
export function runAtTargetFps(_fps: number, fn: () => void) {
  fn();
}
