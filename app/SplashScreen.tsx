import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconWrapper}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.icon}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>SIGNBRIDGE</Text>
        <Text style={styles.subtitle}>BRIDGING THE SILENCE.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0e27",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { alignItems: "center" },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(0,217,255,0.4)",
    marginBottom: 24,
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  icon: { width: "100%", height: "100%" },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 4,
  },
  subtitle: {
    color: "#b0b0b0",
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 8,
    textTransform: "uppercase",
  },
});
