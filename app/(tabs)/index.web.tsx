import BackgroundAura from "@/components/BackgroundAura";
import HandLandmarkOverlay from "@/components/HandLandmarkOverlay";
import { ScanningReticle } from "@/components/ScanningReticle";
import type { Prediction } from "@/components/useHandLandmarks";
import { useWebSignDetection } from "@/hooks/useWebSignDetection";
import { speak } from "@/lib/speech";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LETTER_LABELS from "../../assets/models/labels.json";
import PHRASE_LABELS from "../../assets/models/phrase_labels.json";

type DetectionMode = "alphabet" | "words";

export default function CameraScreenWeb() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<DetectionMode>("alphabet");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const lastSpoken = useRef<{ text: string; time: number } | null>(null);

  const handlePrediction = useCallback(
    (pred: Prediction) => {
      setPrediction(pred);
      if (
        pred.source === "word" &&
        pred.label !== "…" &&
        pred.label !== "?" &&
        pred.confidence >= 28
      ) {
        const now = Date.now();
        if (
          lastSpoken.current?.text === pred.label &&
          now - lastSpoken.current.time < 1800
        ) {
          return;
        }
        lastSpoken.current = { text: pred.label, time: now };
        speak(pred.label);
      }
    },
    [],
  );

  const { landmarks, modelStatus } = useWebSignDetection({
    videoRef,
    letterLabels: LETTER_LABELS,
    phraseLabels: PHRASE_LABELS,
    mode,
    enabled: cameraActive,
    threshold: 40,
    mirror: true,
    onPrediction: handlePrediction,
  });

  const modelLabel =
    modelStatus === "loading"
      ? "🟡 LOADING MODELS"
      : modelStatus === "error"
        ? "🔴 MODEL ERROR"
        : "🟢 MODELS READY";

  const isWordsMode = mode === "words";
  const activePrediction =
    isWordsMode && prediction?.source === "word" ? prediction : prediction;
  const sourceColor =
    activePrediction?.source === "word" ? "#b4bbff" : "#00d9ff";

  return (
    <BackgroundAura>
      <SafeAreaView style={styles.container}>
        <View
          style={styles.cameraContainer}
          onLayout={(e) =>
            setContainerSize({
              width: e.nativeEvent.layout.width,
              height: e.nativeEvent.layout.height,
            })
          }
        >
          {cameraActive && (
            <video
              autoPlay
              playsInline
              muted
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                backgroundColor: "#0a0e27",
              }}
              ref={(el) => {
                videoRef.current = el;
                if (el && !el.srcObject) {
                  navigator.mediaDevices
                    ?.getUserMedia({
                      video: { facingMode: "user", width: 640, height: 480 },
                    })
                    .then((stream) => {
                      el.srcObject = stream;
                    })
                    .catch((e) => console.warn("Web camera:", e));
                }
              }}
            />
          )}

          {cameraActive && containerSize.width > 0 && (
            <ScanningReticle
              isDetecting={
                modelStatus === "ready" &&
                !!activePrediction &&
                landmarks.length === 0
              }
              width={containerSize.width}
              height={containerSize.height}
            />
          )}

          {cameraActive && landmarks.length > 0 && containerSize.width > 0 && (
            <HandLandmarkOverlay
              landmarks={landmarks}
              width={containerSize.width}
              height={containerSize.height}
              isFrontCamera
            />
          )}

          <View style={styles.predictionDisplay}>
            <View style={styles.modeRow}>
              <Text style={styles.labelText}>DETECTED SIGN</Text>
              <View style={[styles.badge, { backgroundColor: sourceColor }]}>
                <Text style={styles.badgeText}>
                  {isWordsMode ? "WORD" : "LETTER"}
                </Text>
              </View>
            </View>
            {modelStatus === "loading" ? (
              <ActivityIndicator color="#00d9ff" style={{ marginVertical: 12 }} />
            ) : activePrediction ? (
              <>
                <Text style={[styles.letterText, { color: sourceColor }]}>
                  {activePrediction.label === "…"
                    ? "Recording…"
                    : activePrediction.label === "?"
                      ? "Ready"
                      : activePrediction.label}
                </Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      {
                        width: `${activePrediction.confidence}%`,
                        backgroundColor: sourceColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.confidenceText, { color: sourceColor }]}>
                  Confidence: {activePrediction.confidence}%
                </Text>
              </>
            ) : (
              <Text style={styles.hint}>
                {isWordsMode
                  ? "Sign a full word (~2 sec)"
                  : "Hold your hand in frame"}
              </Text>
            )}
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{modelLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.modeButtons}>
                {(
                  [
                    { key: "alphabet" as const, label: "Alphabet", icon: "abc" },
                    {
                      key: "words" as const,
                      label: "Words",
                      icon: "record-voice-over",
                    },
                  ] as const
                ).map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.modeBtn,
                      mode === m.key && styles.modeBtnActive,
                    ]}
                    onPress={() => {
                      setMode(m.key);
                      setPrediction(null);
                    }}
                  >
                    <MaterialIcons
                      name={m.icon}
                      size={13}
                      color={mode === m.key ? "#0a0e27" : "#00d9ff"}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        mode === m.key && { color: "#0a0e27" },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <Pressable
            style={styles.toggleButton}
            onPress={() => setCameraActive((v) => !v)}
          >
            <MaterialIcons
              name={cameraActive ? "pause" : "play-arrow"}
              size={26}
              color="#0a0e27"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </BackgroundAura>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e27" },
  cameraContainer: { flex: 1, position: "relative", overflow: "hidden" },
  predictionDisplay: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10,14,39,0.9)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#00d9ff",
    padding: 16,
    alignItems: "center",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00d9ff",
    letterSpacing: 1.5,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#0a0e27", fontSize: 9, fontWeight: "800" },
  letterText: { fontSize: 42, fontWeight: "900", marginVertical: 6 },
  confidenceBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(0,217,255,0.2)",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  confidenceFill: { height: "100%", borderRadius: 3 },
  confidenceText: { fontSize: 12, marginTop: 6, fontWeight: "600" },
  hint: { fontSize: 14, color: "#b0b0b0", fontStyle: "italic", marginTop: 8 },
  statusBar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10,14,39,0.85)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
  },
  statusText: { fontSize: 11, color: "#00d9ff", fontWeight: "600", marginBottom: 6 },
  modeButtons: { flexDirection: "row", gap: 6 },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
  },
  modeBtnActive: { backgroundColor: "#00d9ff", borderColor: "#00d9ff" },
  modeBtnText: { color: "#00d9ff", fontSize: 11, fontWeight: "600" },
  toggleButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00d9ff",
    justifyContent: "center",
    alignItems: "center",
  },
});
