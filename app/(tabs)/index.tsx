import { supabase } from "@/app/lib/supabase";
import HandLandmarkOverlay from "@/components/HandLandmarkOverlay";
import { PermissionDenied } from "@/components/PermissionDenied";
import { ScanningReticle } from "@/components/ScanningReticle";
import {
  DetectionMode,
  Prediction,
  useHandLandmarks,
} from "@/components/useHandLandmarks";
import { recordAttempt } from "@/lib/progress";
import { saveSession } from "@/lib/sessions";
import { speak, stopSpeaking } from "@/lib/speech";
import { getStreak, updateStreak } from "@/lib/streak";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from "react-native-vision-camera";
import LETTER_LABELS from "../../assets/models/labels.json";
import PHRASE_LABELS from "../../assets/models/phrase_labels.json";
import BackgroundAura from "../../components/BackgroundAura";

type Landmark = { x: number; y: number; z: number };

const HOLD_DURATION = 450;
const SPELL_THRESHOLD = 65;
const SPEAK_DEBOUNCE_MS = 1800;

// Word video mapping
const getWordVideo = (word: string) => {
  const videoMap: Record<string, any> = {
    "again": require("../../assets/videos/again.mp4"),
    "bad": require("../../assets/videos/bad.mp4"),
    "come": require("../../assets/videos/come.mp4"),
    "eat": require("../../assets/videos/eat.mp4"),
    "go": require("../../assets/videos/go.mp4"),
    "good": require("../../assets/videos/good.mp4"),
    "hello": require("../../assets/videos/hello.mp4"),
    "help": require("../../assets/videos/help.mp4"),
    "how": require("../../assets/videos/how.mp4"),
    "name": require("../../assets/videos/name.mp4"),
    "no": require("../../assets/videos/no.mp4"),
    "thank_you": require("../../assets/videos/thank_you.mp4"),
    "please": require("../../assets/videos/please.mp4"),
    "sorry": require("../../assets/videos/sorry.mp4"),
    "stop": require("../../assets/videos/stop.mp4"),
    "understand": require("../../assets/videos/understand.mp4"),
    "water": require("../../assets/videos/water.mp4"),
    "what": require("../../assets/videos/what.mp4"),
    "where": require("../../assets/videos/where.mp4"),
    "yes": require("../../assets/videos/yes.mp4"),
  };
  return videoMap[word] || null;
};

const MODES: {
  key: DetectionMode;
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
}[] = [
  { key: "alphabet", label: "Alphabet", icon: "abc" },
  { key: "words", label: "Words", icon: "record-voice-over" },
  { key: "practice", label: "Practice", icon: "school" },
];

export default function CameraScreen() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[][]>([]);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraPosition, setCameraPosition] = useState<"back" | "front">(
    "back",
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState<DetectionMode>("alphabet");
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);

  // Session tracking
  const [sessionSigns, setSessionSigns] = useState<string[]>([]);
  const [sessionConfidences, setSessionConfidences] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Practice mode
  const [targetSign, setTargetSign] = useState<string>("");
  const [practiceFeedback, setPracticeFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [practiceType, setPracticeType] = useState<"letter" | "word">("letter");

  // Spelling mode
  const [spellingMode, setSpellingMode] = useState(false);
  const [spelledWord, setSpelledWord] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef<{ letter: string; startTime: number } | null>(null);
  const spellArmedRef = useRef(true);
  const [spellLocked, setSpellLocked] = useState(false);
  const lastSpokenRef = useRef<{ text: string; time: number } | null>(null);

  const cameraRef = useRef<Camera>(null);
  const lastUiUpdate = useRef(0);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);
  const format = useCameraFormat(device, [
    { videoResolution: { width: 480, height: 360 } },
    { fps: 30 },
  ]);

  // Load both models
  const letterPlugin = useTensorflowModel(
    require("../../assets/models/asl_model.tflite"),
  );
  const phrasePlugin = useTensorflowModel(
    require("../../assets/models/phrase_model.tflite"),
  );

  const letterClassifier =
    letterPlugin.state === "loaded" ? letterPlugin.model : undefined;
  const phraseClassifier =
    phrasePlugin.state === "loaded" ? phrasePlugin.model : undefined;

  const letterReady = letterPlugin.state === "loaded";
  const phraseReady = phrasePlugin.state === "loaded";
  const modelReady = letterReady && phraseReady;

  const modelStatus =
    !letterReady || !phraseReady
      ? letterPlugin.state === "error" || phrasePlugin.state === "error"
        ? "🔴 MODEL ERROR"
        : "🟡 LOADING MODELS"
      : "🟢 MODELS READY";

  const trySpeak = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (
      lastSpokenRef.current?.text === trimmed &&
      now - lastSpokenRef.current.time < SPEAK_DEBOUNCE_MS
    ) {
      return;
    }
    lastSpokenRef.current = { text: trimmed, time: now };
    speak(trimmed);
  }, []);

  const lastPredUiRef = useRef<Prediction | null>(null);

  const handlePrediction = useCallback(
    (pred: Prediction) => {
      const now = Date.now();
      const isBuffering = pred.label === "…";
      if (isBuffering && now - lastUiUpdate.current < 250) return;
      if (
        !isBuffering &&
        lastPredUiRef.current?.label === pred.label &&
        lastPredUiRef.current?.confidence === pred.confidence &&
        lastPredUiRef.current?.source === pred.source
      ) {
        return;
      }
      lastUiUpdate.current = now;
      lastPredUiRef.current = pred;
      setPrediction(pred);

      // Record progress for confident detections
      if (userId && pred.confidence >= 50 && pred.label !== "…" && pred.label !== "?") {
        const signType = pred.source === "letter" ? "letter" : "word";
        recordAttempt(userId, pred.label, signType, true).catch(console.error);
        updateStreak(userId).catch(console.error);

        // Add to session tracking
        setSessionSigns((prev) => [...prev, pred.label]);
        setSessionConfidences((prev) => [...prev, pred.confidence]);

        // Practice mode - check if prediction matches target
        if (mode === "practice") {
          const matches = practiceType === "letter"
            ? pred.source === "letter" && pred.label === targetSign
            : pred.source === "word" && pred.label === targetSign;
          if (matches) {
            setPracticeFeedback("correct");
          }
        }
      }

      if (
        pred.source === "word" &&
        pred.label !== "…" &&
        pred.label !== "?" &&
        pred.confidence >= 28 &&
        !spellingMode
      ) {
        trySpeak(pred.label);
      }

      if (!spellingMode) return;

      const letter = pred.label;
      if (pred.source !== "letter") return;
      if (letter === "nothing" || letter === "none" || letter === "space") {
        holdRef.current = null;
        setHoldProgress(0);
        return;
      }
      if (pred.confidence < SPELL_THRESHOLD) {
        holdRef.current = null;
        setHoldProgress(0);
        return;
      }

      if (!spellArmedRef.current) return;

      if (holdRef.current?.letter !== letter) {
        holdRef.current = { letter, startTime: now };
        setHoldProgress(0);
      } else {
        const elapsed = now - holdRef.current.startTime;
        const progress = Math.min(elapsed / HOLD_DURATION, 1);
        setHoldProgress(progress);
        if (progress >= 1) {
          if (letter === "del") setSpelledWord((w) => w.slice(0, -1));
          else setSpelledWord((w) => w + letter);
          holdRef.current = null;
          setHoldProgress(0);
          spellArmedRef.current = false;
          setSpellLocked(true);
        }
      }
    },
    [spellingMode, trySpeak],
  );

  const handleLandmarks = useCallback((lms: Landmark[][]) => {
    setLandmarks(lms);
  }, []);

  useEffect(() => {
    if (mode === "words") setPrediction(null);
  }, [mode]);

  useEffect(() => {
    if (!spellingMode) return;
    if (landmarks.length === 0) {
      holdRef.current = null;
      setHoldProgress(0);
      spellArmedRef.current = true;
      setSpellLocked(false);
    }
  }, [landmarks.length, spellingMode]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const isFront = cameraPosition === "front";
  const isWordsMode = mode === "words" && !spellingMode;
  const wordPrediction =
    isWordsMode && prediction?.source === "word" ? prediction : null;

  const { frameProcessor } = useHandLandmarks({
    letterLabels: LETTER_LABELS,
    phraseLabels: PHRASE_LABELS,
    letterClassifier,
    phraseClassifier,
    onPrediction: handlePrediction,
    onLandmarks: handleLandmarks,
    enabled: cameraActive,
    threshold: 40,
    mode: spellingMode ? "alphabet" : mode,
    isFrontCamera: isFront,
  });

  const handleRequestPermission = useCallback(async () => {
    try {
      setPermissionRequested(true);
      await requestPermission();
    } catch (e) {
      console.error("Camera permission error:", e);
    }
  }, [requestPermission]);

  useEffect(() => {
    if (hasPermission === false && !permissionRequested && cameraActive)
      handleRequestPermission();
  }, [
    hasPermission,
    permissionRequested,
    handleRequestPermission,
    cameraActive,
  ]);

  // Get userId for progress tracking
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUserId(session?.user?.id ?? null);
    }).catch((error: any) => {
      console.warn("Auth error:", error.message);
      if (error.message?.includes("Refresh Token")) {
        import("../../lib/authSession").then(({ clearStaleAuth }) => {
          clearStaleAuth();
        });
      }
    });
  }, []);

  // Fetch streak when userId is available
  useEffect(() => {
    if (userId) {
      getStreak(userId).then((streakData: any) => {
        if (streakData) {
          setStreak(streakData.current_streak);
        }
      }).catch(console.error);
    }
  }, [userId]);

  // Session tracking - start when camera becomes active
  useEffect(() => {
    if (cameraActive && userId) {
      setSessionStartTime(Date.now());
      setSessionSigns([]);
      setSessionConfidences([]);
    }
  }, [cameraActive, userId]);

  // Session tracking - save when camera becomes inactive
  useEffect(() => {
    if (!cameraActive && sessionStartTime && userId && sessionSigns.length > 0) {
      const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
      saveSession(userId, sessionSigns, sessionConfidences, duration).catch(console.error);
      setSessionStartTime(null);
      setSessionSigns([]);
      setSessionConfidences([]);
    }
  }, [cameraActive, sessionStartTime, userId, sessionSigns, sessionConfidences]);

  // Practice mode - generate random target when practice mode is activated
  useEffect(() => {
    if (mode === "practice") {
      generateNewTarget();
    }
  }, [mode, practiceType]);

  const generateNewTarget = useCallback(() => {
    if (practiceType === "letter") {
      const randomLetter = LETTER_LABELS[Math.floor(Math.random() * LETTER_LABELS.length)];
      setTargetSign(randomLetter);
    } else {
      const randomWord = PHRASE_LABELS[Math.floor(Math.random() * PHRASE_LABELS.length)];
      setTargetSign(randomWord);
    }
    setPracticeFeedback(null);
  }, [practiceType]);

  if (hasPermission === false)
    return (
      <PermissionDenied permission="camera" onRetry={handleRequestPermission} />
    );

  if (hasPermission === undefined || !device) {
    return (
      <BackgroundAura>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
          <Text style={styles.loadingText}>Initializing Camera...</Text>
        </View>
      </BackgroundAura>
    );
  }

  const activePrediction = isWordsMode ? wordPrediction : prediction;
  const sourceColor =
    activePrediction?.source === "word" ? "#b4bbff" : "#00d9ff";
  const bufferingSign = isWordsMode && activePrediction?.label === "…";
  const listeningForSign = isWordsMode && activePrediction?.label === "?";

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
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              format={format}
              isActive
              pixelFormat="yuv"
              audio={false}
              frameProcessor={frameProcessor}
            />
          )}
          {cameraActive && containerSize.width > 0 && (
            <ScanningReticle
              isDetecting={
                modelReady && !!activePrediction && landmarks.length === 0
              }
              width={containerSize.width}
              height={containerSize.height}
            />
          )}
          {cameraActive && landmarks.length > 0 && (
            <HandLandmarkOverlay
              landmarks={landmarks}
              width={containerSize.width}
              height={containerSize.height}
              isFrontCamera={isFront}
            />
          )}

          {/* Prediction display */}
          <Animated.View
            style={styles.predictionDisplay}
            entering={FadeIn}
            exiting={FadeOut}
          >
            {spellingMode ? (
              <View style={styles.predictionContent}>
                <View style={styles.modeRow}>
                  <Text style={styles.labelText}>SPELLING MODE</Text>
                  <View style={styles.badge}>
                    <MaterialIcons
                      name="spellcheck"
                      size={11}
                      color="#0a0e27"
                    />
                    <Text style={styles.badgeText}>ON</Text>
                  </View>
                </View>
                <Text style={styles.spelledWord} numberOfLines={2}>
                  {spelledWord || "Start signing..."}
                </Text>
                {prediction?.source === "letter" &&
                  prediction.label !== "nothing" &&
                  prediction.label !== "none" && (
                    <View style={styles.holdRow}>
                      <Text style={[styles.holdLetter, { color: sourceColor }]}>
                        {prediction.label}
                      </Text>
                      <View style={styles.holdBarBg}>
                        <View
                          style={[
                            styles.holdBarFill,
                            { width: `${holdProgress * 100}%` as any },
                          ]}
                        />
                      </View>
                      <Text style={styles.holdHint}>
                        {spellLocked
                          ? "Lower hand from frame, then sign next letter"
                          : "Hold steady to add letter"}
                      </Text>
                    </View>
                  )}
                {spelledWord.length > 0 && (
                  <View style={styles.spellActions}>
                    <TouchableOpacity
                      style={styles.speakBtn}
                      onPress={() => trySpeak(spelledWord)}
                    >
                      <MaterialIcons
                        name="volume-up"
                        size={16}
                        color="#0a0e27"
                      />
                      <Text style={styles.speakBtnText}>Speak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.clearBtn}
                      onPress={() => {
                        setSpelledWord("");
                        stopSpeaking();
                      }}
                    >
                      <MaterialIcons name="clear" size={13} color="#ff4d6d" />
                      <Text style={styles.clearBtnText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.spellHint}>
                  Sign a letter → lower hand → next letter
                </Text>
              </View>
            ) : (
              <View style={styles.predictionContent}>
                {mode === "practice" && (
                  <View style={styles.practiceTarget}>
                    <View style={styles.practiceTypeToggle}>
                      <TouchableOpacity
                        style={[
                          styles.practiceTypeBtn,
                          practiceType === "letter" && styles.practiceTypeBtnActive,
                        ]}
                        onPress={() => setPracticeType("letter")}
                      >
                        <Text
                          style={[
                            styles.practiceTypeBtnText,
                            practiceType === "letter" && styles.practiceTypeBtnTextActive,
                          ]}
                        >
                          Alphabet
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.practiceTypeBtn,
                          practiceType === "word" && styles.practiceTypeBtnActive,
                        ]}
                        onPress={() => setPracticeType("word")}
                      >
                        <Text
                          style={[
                            styles.practiceTypeBtnText,
                            practiceType === "word" && styles.practiceTypeBtnTextActive,
                          ]}
                        >
                          Words
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.practiceLabel}>SIGN THIS:</Text>
                    {practiceType === "letter" ? (
                      <Text style={styles.practiceTargetSign}>{targetSign}</Text>
                    ) : (
                      <View style={styles.practiceWordContainer}>
                        <Text style={styles.practiceTargetSignWord}>{targetSign}</Text>
                        <View style={styles.practiceVideoContainer}>
                          <Video
                            source={getWordVideo(targetSign)}
                            style={styles.practiceVideo}
                            useNativeControls
                            isLooping
                            shouldPlay
                            resizeMode={ResizeMode.CONTAIN}
                          />
                        </View>
                      </View>
                    )}
                    {practiceFeedback === "correct" && (
                      <View style={styles.practiceFeedbackCorrect}>
                        <MaterialIcons name="check-circle" size={20} color="#00ff88" />
                        <Text style={styles.practiceFeedbackText}>Correct!</Text>
                        <TouchableOpacity
                          style={styles.practiceCloseBtn}
                          onPress={generateNewTarget}
                        >
                          <MaterialIcons name="close" size={16} color="#00ff88" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.modeRow}>
                  <Text style={styles.labelText}>DETECTED SIGN</Text>
                  {(isWordsMode || activePrediction?.source) && (
                    <View
                      style={[styles.badge, { backgroundColor: sourceColor }]}
                    >
                      <Text style={styles.badgeText}>
                        {isWordsMode || activePrediction?.source === "word"
                          ? "WORD"
                          : "LETTER"}
                      </Text>
                    </View>
                  )}
                </View>
                {activePrediction ? (
                  <>
                    <Text style={[styles.letterText, { color: sourceColor }]}>
                      {bufferingSign
                        ? "Recording…"
                        : listeningForSign
                          ? "Ready"
                          : activePrediction.label}
                    </Text>
                    <View style={styles.confidenceBar}>
                      <View
                        style={[
                          styles.confidenceFill,
                          {
                            width: `${activePrediction.confidence}%` as any,
                            backgroundColor: sourceColor,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.confidenceText, { color: sourceColor }]}
                    >
                      {bufferingSign
                        ? `Buffer ${activePrediction.confidence}% — perform the full sign`
                        : listeningForSign
                          ? activePrediction.confidence > 0
                            ? `Best guess ${activePrediction.confidence}% — keep signing`
                            : "Move your hand through the full sign (~2 sec)"
                          : `Confidence: ${activePrediction.confidence}% — speaking`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noDetectionText}>
                    {isWordsMode
                      ? "Sign a full word (~2 sec) — speech plays when detected"
                      : "Hold your hand steady in the reticle"}
                  </Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Mode switcher + status */}
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{modelStatus}</Text>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialIcons name="local-fire-department" size={14} color="#ff6b6b" />
                <Text style={styles.streakText}>{streak} day streak</Text>
              </View>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modeScroll}
              contentContainerStyle={styles.modeButtons}
            >
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.modeBtn,
                    mode === m.key && !spellingMode && styles.modeBtnActive,
                  ]}
                  onPress={() => {
                    setMode(m.key);
                    setSpellingMode(false);
                    if (m.key === "words") setPrediction(null);
                  }}
                >
                  <MaterialIcons
                    name={m.icon}
                    size={13}
                    color={
                      mode === m.key && !spellingMode ? "#0a0e27" : "#00d9ff"
                    }
                  />
                  <Text
                    style={[
                      styles.modeBtnText,
                      mode === m.key && !spellingMode && { color: "#0a0e27" },
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.modeBtn, spellingMode && styles.modeBtnSpell]}
                onPress={() => {
                  setSpellingMode((v) => !v);
                  setSpelledWord("");
                  holdRef.current = null;
                  setHoldProgress(0);
                  spellArmedRef.current = true;
                  setSpellLocked(false);
                  stopSpeaking();
                }}
              >
                <MaterialIcons
                  name="spellcheck"
                  size={13}
                  color={spellingMode ? "#0a0e27" : "#00d9ff"}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    spellingMode && { color: "#0a0e27" },
                  ]}
                >
                  Spell
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <Pressable
            style={styles.switchButton}
            onPress={() =>
              setCameraPosition((p) => (p === "back" ? "front" : "back"))
            }
          >
            <MaterialIcons name="flip-camera-ios" size={26} color="#0a0e27" />
          </Pressable>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0e27",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#00d9ff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
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
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  predictionContent: { alignItems: "center" },
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
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#00d9ff",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: "#0a0e27", fontSize: 9, fontWeight: "800" },
  letterText: {
    fontSize: 48,
    fontWeight: "900",
    marginVertical: 6,
    textShadowColor: "rgba(0,217,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  noDetectionText: {
    fontSize: 14,
    color: "#b0b0b0",
    fontStyle: "italic",
    marginTop: 8,
  },
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
  spelledWord: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    minHeight: 36,
    marginBottom: 8,
  },
  holdRow: { alignItems: "center", width: "100%", gap: 4 },
  holdLetter: { fontSize: 30, fontWeight: "900" },
  holdBarBg: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(0,217,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  holdBarFill: { height: "100%", backgroundColor: "#00d9ff", borderRadius: 3 },
  holdHint: { color: "#b0b0b0", fontSize: 11, marginTop: 2 },
  spellActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    alignItems: "center",
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#00d9ff",
  },
  speakBtnText: { color: "#0a0e27", fontSize: 12, fontWeight: "700" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.3)",
    backgroundColor: "rgba(255,77,109,0.08)",
  },
  clearBtnText: { color: "#ff4d6d", fontSize: 12, fontWeight: "600" },
  spellHint: {
    color: "#b0b0b0",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,107,107,0.15)",
  },
  streakText: {
    color: "#ff6b6b",
    fontSize: 11,
    fontWeight: "600",
  },
  practiceTarget: {
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "rgba(0,217,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.2)",
  },
  practiceTypeToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  practiceTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  practiceTypeBtnActive: {
    backgroundColor: "rgba(0,217,255,0.2)",
    borderColor: "rgba(0,217,255,0.4)",
  },
  practiceTypeBtnText: {
    color: "#b0b0b0",
    fontSize: 12,
    fontWeight: "600",
  },
  practiceTypeBtnTextActive: {
    color: "#00d9ff",
  },
  practiceLabel: {
    color: "#00d9ff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  practiceTargetSign: {
    fontFamily: "GallaudetRegular",
    fontSize: 48,
    color: "#ffffff",
  },
  practiceWordContainer: {
    alignItems: "center",
  },
  practiceTargetSignWord: {
    fontSize: 32,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 8,
  },
  practiceVideoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  practiceVideo: {
    width: "100%",
    height: "100%",
  },
  practiceFeedbackCorrect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  practiceFeedbackText: {
    color: "#00ff88",
    fontSize: 14,
    fontWeight: "600",
  },
  practiceCloseBtn: {
    marginLeft: 8,
    padding: 4,
  },
  statusBar: {
    position: "absolute",
    bottom: 104,
    left: 20,
    right: 20,
    backgroundColor: "rgba(10,14,39,0.85)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
    flexDirection: "column",
    gap: 6,
  },
  statusText: { fontSize: 11, color: "#00d9ff", fontWeight: "600" },
  modeScroll: { flexGrow: 0 },
  modeButtons: { flexDirection: "row", gap: 4, paddingHorizontal: 4 },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
    backgroundColor: "rgba(0,217,255,0.06)",
  },
  modeBtnActive: { backgroundColor: "#00d9ff", borderColor: "#00d9ff" },
  modeBtnSpell: { backgroundColor: "#b4bbff", borderColor: "#b4bbff" },
  modeBtnText: { color: "#00d9ff", fontSize: 10, fontWeight: "600" },
  switchButton: {
    position: "absolute",
    bottom: 164,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00d9ff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
  toggleButton: {
    position: "absolute",
    bottom: 164,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00d9ff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
});
