import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

const CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [5, 9],
  [9, 13],
  [13, 17],
];

export type Landmark = { x: number; y: number; z: number };

interface Props {
  landmarks: Landmark[][];
  width: number;
  height: number;
  isFrontCamera?: boolean;
}

function HandLandmarkOverlay({ landmarks, width, height }: Props) {
  const elements = useMemo(() => {
    if (!landmarks?.length || width === 0 || height === 0) return null;

    const nodes: React.ReactNode[] = [];
    landmarks.forEach((handLandmarks, handIndex) => {
      if (!handLandmarks || handLandmarks.length !== 21) return;
      const color = handIndex === 0 ? "#00d9ff" : "#ff6b6b";

      CONNECTIONS.forEach(([a, b], i) => {
        const lmA = handLandmarks[a];
        const lmB = handLandmarks[b];
        if (!lmA || !lmB) return;
        nodes.push(
          <Line
            key={`b${handIndex}-${i}`}
            x1={lmA.x * width}
            y1={lmA.y * height}
            x2={lmB.x * width}
            y2={lmB.y * height}
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.85}
          />,
        );
      });

      handLandmarks.forEach((lm, i) => {
        nodes.push(
          <Circle
            key={`p${handIndex}-${i}`}
            cx={lm.x * width}
            cy={lm.y * height}
            r={i === 0 ? 5 : 3.5}
            fill={color}
            fillOpacity={i === 0 ? 0.95 : 0.8}
            stroke="#0a0e27"
            strokeWidth={0.5}
          />,
        );
      });
    });
    return nodes;
  }, [landmarks, width, height]);

  if (!elements) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" collapsable={false}>
      <Svg width={width} height={height}>
        {elements}
      </Svg>
    </View>
  );
}

export default React.memo(HandLandmarkOverlay);
