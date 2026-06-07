import * as Speech from "expo-speech";

export function stopSpeaking() {
  Speech.stop();
}

/** Speak plain text (letters, words, or spelled strings). */
export function speak(text: string, rate = 0.92) {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "…" || trimmed === "?") return;
  Speech.stop();
  Speech.speak(trimmed, {
    language: "en-US",
    pitch: 1.0,
    rate,
  });
}
