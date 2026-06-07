import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface AURAButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function AURAButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: AURAButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        className="bg-[#00d9ff] rounded-full px-8 py-4 items-center justify-center"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={{ opacity: disabled || loading ? 0.5 : 1 }}
      >
        <Text className="text-[#0a0e27] font-bold text-lg">
          {loading ? "Loading..." : title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
