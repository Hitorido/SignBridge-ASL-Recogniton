import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function AuraLogo() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.icon}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.brand}>SIGNBRIDGE</Text>
      <Text style={styles.tagline}>BRIDGING THE SILENCE.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 36,
    paddingTop: 16,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 217, 255, 0.2)",
  },
  icon: {
    width: "100%",
    height: "100%",
  },
  brand: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
    textShadowColor: "rgba(0, 217, 255, 0.25)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tagline: {
    color: "#b0b0b0",
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
