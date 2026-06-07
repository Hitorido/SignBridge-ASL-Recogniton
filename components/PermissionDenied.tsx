import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface PermissionDeniedProps {
  permission: "camera" | "microphone";
  onRetry: () => void;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  permission,
  onRetry,
}) => {
  const permissionLabel = permission === "camera" ? "Camera" : "Microphone";
  const permissionDescription =
    permission === "camera"
      ? "SignBridge needs camera access to recognize sign language."
      : "SignBridge needs microphone access for audio features.";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Permission Required</Text>

        {/* Icon placeholder with neon glow */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconGlow, { backgroundColor: "#00d9ff" }]} />
          <Text style={styles.icon}>🔒</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{permissionLabel} Permission</Text>
        <Text style={styles.message}>{permissionDescription}</Text>

        {/* Retry Button */}
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Request Permission</Text>
        </Pressable>

        {/* Footer text */}
        <Text style={styles.footer}>
          You can enable this in Settings → Apps → SignBridge
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0e27",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.2,
  },
  icon: {
    fontSize: 60,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#00d9ff",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  description: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#b0b0b0",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#00d9ff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a0e27",
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 13,
    color: "#606060",
    textAlign: "center",
    lineHeight: 20,
  },
});
