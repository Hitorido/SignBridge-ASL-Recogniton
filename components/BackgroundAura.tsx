import React from "react";
import { View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

interface BackgroundAuraProps {
  children: React.ReactNode;
}

export default function BackgroundAura({ children }: BackgroundAuraProps) {
  return (
    <View
      style={{ flex: 1, backgroundColor: "#0a0e27" }}
      className="flex-1 bg-[#0a0e27]"
    >
      <Svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        width="100%"
        height="100%"
      >
        <Defs>
          <RadialGradient
            id="auraGradient"
            cx="50%"
            cy="50%"
            r="50%"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor="#00d9ff" stopOpacity={0.1} />
            <Stop offset="50%" stopColor="#00d9ff" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#0a0e27" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#auraGradient)"
        />
      </Svg>
      {children}
    </View>
  );
}
