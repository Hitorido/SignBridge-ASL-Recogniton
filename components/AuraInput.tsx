import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useState } from "react";
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface AuraInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}

export default function AuraInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  ...props
}: AuraInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;
  const active = isFocused || value.length > 0;

  const glow = useSharedValue(0.2);

  const borderStyle = useAnimatedStyle(() => ({
    borderBottomColor: `rgba(0, 217, 255, ${glow.value})`,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(active ? -18 : 0, { duration: 200 }) },
    ],
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: "600",
    color: withTiming(active ? "#00d9ff" : "#b0b0b0", { duration: 200 }),
  }));

  const handleFocus = () => {
    setIsFocused(true);
    glow.value = withTiming(1, { duration: 250 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    glow.value = withTiming(0.2, { duration: 250 });
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <Animated.View
        style={[styles.inputRow, { borderBottomWidth: 1 }, borderStyle]}
      >
        <TextInput
          style={styles.input}
          placeholder=""
          placeholderTextColor="rgba(176,176,176,0.5)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name={showPassword ? "visibility" : "visibility-off"}
              size={20}
              color="#b0b0b0"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 17,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingBottom: 4,
  },
});
