import React, { useState } from "react";
import { TextInput, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface SurgicalInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export default function SurgicalInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
}: SurgicalInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0.2);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderBottomColor: `rgba(0, 217, 255, ${borderOpacity.value})`,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0.2, { duration: 300 });
  };

  return (
    <View className="mb-8">
      <TextInput
        className="text-white text-base pb-2"
        placeholder={placeholder}
        placeholderTextColor="#b0b0b0"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{ borderBottomWidth: 1 }}
      />
      <Animated.View
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d9ff]"
        style={animatedBorderStyle}
      />
    </View>
  );
}
