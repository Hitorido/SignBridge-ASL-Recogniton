import {
    Canvas,
    Circle,
    Group,
    Line,
    Shadow,
} from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import {
    Easing,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

interface ScanningReticleProps {
  isDetecting?: boolean;
  width: number;
  height: number;
}

export const ScanningReticle: React.FC<ScanningReticleProps> = ({
  isDetecting = false,
  width,
  height,
}) => {
  const scanProgress = useSharedValue(0);
  const reticleSize = Math.min(width, height) * 0.42;
  const centerX = width / 2;
  const centerY = height / 2;

  useEffect(() => {
    if (isDetecting) {
      scanProgress.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      scanProgress.value = 0;
    }
  }, [isDetecting]);

  const scanLineP1 = useDerivedValue(() => ({
    x: centerX - reticleSize,
    y: centerY - reticleSize + scanProgress.value * (reticleSize * 2),
  }));
  const scanLineP2 = useDerivedValue(() => ({
    x: centerX + reticleSize,
    y: centerY - reticleSize + scanProgress.value * (reticleSize * 2),
  }));

  const cyan = "#00D9FF";
  const cyanDim = "#00D9FF20";
  const purple = "#8A2BE2";
  const r = reticleSize;

  if (width === 0 || height === 0) return null;

  return (
    <Canvas style={{ position: "absolute", top: 0, left: 0, width, height }}>
      <Group>
        <Circle
          cx={centerX}
          cy={centerY}
          r={r + 20}
          color={cyanDim}
          style="stroke"
          strokeWidth={8}
        >
          <Shadow dx={0} dy={0} blur={20} color={cyanDim} />
        </Circle>
        <Circle
          cx={centerX}
          cy={centerY}
          r={r}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={r - 40}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />

        {/* Corner brackets */}
        <Line
          p1={{ x: centerX - r, y: centerY - r }}
          p2={{ x: centerX - r + 30, y: centerY - r }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX - r, y: centerY - r }}
          p2={{ x: centerX - r, y: centerY - r + 30 }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX + r, y: centerY - r }}
          p2={{ x: centerX + r - 30, y: centerY - r }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX + r, y: centerY - r }}
          p2={{ x: centerX + r, y: centerY - r + 30 }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX - r, y: centerY + r }}
          p2={{ x: centerX - r + 30, y: centerY + r }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX - r, y: centerY + r }}
          p2={{ x: centerX - r, y: centerY + r - 30 }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX + r, y: centerY + r }}
          p2={{ x: centerX + r - 30, y: centerY + r }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />
        <Line
          p1={{ x: centerX + r, y: centerY + r }}
          p2={{ x: centerX + r, y: centerY + r - 30 }}
          color={cyan}
          style="stroke"
          strokeWidth={3}
        />

        {/* Crosshair */}
        <Line
          p1={{ x: centerX - 20, y: centerY }}
          p2={{ x: centerX + 20, y: centerY }}
          color={purple}
          style="stroke"
          strokeWidth={2}
        />
        <Line
          p1={{ x: centerX, y: centerY - 20 }}
          p2={{ x: centerX, y: centerY + 20 }}
          color={purple}
          style="stroke"
          strokeWidth={2}
        />
        <Circle cx={centerX} cy={centerY} r={4} color={cyan} />

        {isDetecting && (
          <Line
            p1={scanLineP1}
            p2={scanLineP2}
            color="#00D9FF66"
            style="stroke"
            strokeWidth={2}
          />
        )}
      </Group>
    </Canvas>
  );
};
