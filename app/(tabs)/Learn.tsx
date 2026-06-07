import { supabase } from "@/app/lib/supabase";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const CARD_SIZE = (width - 56) / 4;

const ASL_ALPHABET = [
  {
    letter: "A",
    fingers: "Fist, thumb to side",
    description:
      "Make a fist with your thumb resting on the side of your index finger.",
    tip: "Thumb should be visible on the side, not tucked under.",
  },
  {
    letter: "B",
    fingers: "4 fingers up, thumb in",
    description:
      "Hold all four fingers straight up together, thumb tucked across palm.",
    tip: "Keep fingers pressed tightly together.",
  },
  {
    letter: "C",
    fingers: "All fingers curved",
    description: "Curve all fingers and thumb to form a C shape.",
    tip: "Imagine holding a cup — that's the C shape.",
  },
  {
    letter: "D",
    fingers: "Index + thumb circle, 3 up",
    description:
      "Touch your index finger to your thumb forming a circle, other fingers up.",
    tip: "The circle made by index and thumb is the key.",
  },
  {
    letter: "E",
    fingers: "All fingers bent to thumb",
    description: "Curl all fingers down so fingertips touch the thumb.",
    tip: "Looks like a claw — fingertips meet the thumb.",
  },
  {
    letter: "F",
    fingers: "Index + thumb touch, 3 spread",
    description: "Touch index finger to thumb, other three fingers spread up.",
    tip: "Similar to D but the other fingers are spread apart.",
  },
  {
    letter: "G",
    fingers: "Index sideways, thumb parallel",
    description:
      "Point index finger sideways, thumb parallel pointing same direction.",
    tip: "Like pointing a gun sideways.",
  },
  {
    letter: "H",
    fingers: "2 fingers pointing sideways",
    description:
      "Point index and middle fingers sideways together, thumb tucked.",
    tip: "Two fingers together pointing horizontally.",
  },
  {
    letter: "I",
    fingers: "Pinky up, others curled",
    description: "Raise only your pinky finger, all others curled into fist.",
    tip: "The classic 'pinky up' gesture.",
  },
  {
    letter: "J",
    fingers: "Pinky up, trace J motion",
    description: "Start with I (pinky up) then draw a J shape in the air.",
    tip: "Motion sign — trace the letter J downward then hook.",
  },
  {
    letter: "K",
    fingers: "V shape with thumb between",
    description: "Index and middle fingers up in a V, thumb between them.",
    tip: "Thumb touches the middle finger from below.",
  },
  {
    letter: "L",
    fingers: "Index up, thumb out",
    description: "Extend index finger up and thumb out to the side — L shape.",
    tip: "Classic L shape — like an L-square.",
  },
  {
    letter: "M",
    fingers: "3 fingers over thumb",
    description: "Tuck three fingers (index, middle, ring) over thumb.",
    tip: "Three fingers tucked over the thumb.",
  },
  {
    letter: "N",
    fingers: "2 fingers over thumb",
    description: "Tuck two fingers (index, middle) over thumb.",
    tip: "Like M but with only two fingers.",
  },
  {
    letter: "O",
    fingers: "All fingers form circle",
    description: "Curve all fingers and thumb to meet at tips, forming an O.",
    tip: "All fingertips touch the thumb tip.",
  },
  {
    letter: "P",
    fingers: "K shape pointing down",
    description: "Like K but rotated downward — index and middle point down.",
    tip: "Point the K shape toward the floor.",
  },
  {
    letter: "Q",
    fingers: "G shape pointing down",
    description: "Like G but pointing downward.",
    tip: "Index and thumb pointing down.",
  },
  {
    letter: "R",
    fingers: "Index + middle crossed",
    description: "Cross index and middle fingers, others curled.",
    tip: "Like crossing your fingers for luck.",
  },
  {
    letter: "S",
    fingers: "Fist, thumb over fingers",
    description: "Make a fist with thumb over fingers.",
    tip: "Thumb wraps over the front of the curled fingers.",
  },
  {
    letter: "T",
    fingers: "Thumb between index + middle",
    description: "Tuck thumb between index and middle fingers in a fist.",
    tip: "Thumb peeks out between index and middle.",
  },
  {
    letter: "U",
    fingers: "2 fingers up together",
    description: "Hold index and middle fingers up together, others curled.",
    tip: "Two fingers straight up, pressed together.",
  },
  {
    letter: "V",
    fingers: "2 fingers spread in V",
    description: "Hold index and middle fingers up in a V/peace sign.",
    tip: "Classic peace sign — fingers spread apart.",
  },
  {
    letter: "W",
    fingers: "3 fingers spread up",
    description: "Hold index, middle, and ring fingers up spread apart.",
    tip: "Three fingers spread like a W shape.",
  },
  {
    letter: "X",
    fingers: "Index finger hooked",
    description: "Bend index finger into a hook, others curled.",
    tip: "Like beckoning someone with a curved index finger.",
  },
  {
    letter: "Y",
    fingers: "Thumb + pinky out",
    description: "Extend thumb and pinky out, other fingers curled.",
    tip: "Classic 'hang loose' / shaka sign.",
  },
  {
    letter: "Z",
    fingers: "Index traces Z",
    description: "Use index finger to trace a Z shape in the air.",
    tip: "Draw the letter Z in the air with your index finger.",
  },
];

const ASL_WORDS = [
  {
    word: "again",
    fingers: "Fist, index finger moves",
    description:
      "Make a fist with your index finger extended. Move your hand forward and then back toward yourself in a curved motion.",
    tip: "The motion is like pulling something back toward you.",
    videoUrl: require("../../assets/videos/again.mp4"),
  },
  {
    word: "bad",
    fingers: "Flat hand, palm down",
    description:
      "Hold your hand flat with palm facing down. Move it away from your body in a downward motion.",
    tip: "Similar to pushing something bad away.",
    videoUrl: require("../../assets/videos/bad.mp4"),
  },
  {
    word: "come",
    fingers: "Index finger beckoning",
    description:
      "Extend your index finger and curl it toward yourself repeatedly in a beckoning motion.",
    tip: "Like calling someone to come closer.",
    videoUrl: require("../../assets/videos/come.mp4"),
  },
  {
    word: "eat",
    fingers: "Fingers to mouth",
    description:
      "Bring your fingertips to your mouth and move them away as if putting food in your mouth.",
    tip: "Simulate the action of eating.",
    videoUrl: require("../../assets/videos/eat.mp4"),
  },
  {
    word: "go",
    fingers: "Index finger pointing forward",
    description:
      "Point your index finger forward and move it in the direction you want to indicate.",
    tip: "Pointing in the direction of movement.",
    videoUrl: require("../../assets/videos/go.mp4"),
  },
  {
    word: "good",
    fingers: "Flat hand, palm up",
    description:
      "Hold your hand flat with palm facing up. Move it away from your body in an upward motion.",
    tip: "Similar to pulling something good toward you.",
    videoUrl: require("../../assets/videos/good.mp4"),
  },
  {
    word: "hello",
    fingers: "Hand wave",
    description:
      "Raise your hand and wave it side to side near your head.",
    tip: "Standard greeting gesture.",
    videoUrl: require("../../assets/videos/hello.mp4"),
  },
  {
    word: "help",
    fingers: "Flat hand, thumb up",
    description:
      "Hold one hand flat with thumb extended. Move it up and down.",
    tip: "Like asking for assistance.",
    videoUrl: require("../../assets/videos/help.mp4"),
  },
  {
    word: "how",
    fingers: "Fingers curved, palm up",
    description:
      "Curve your fingers with palm facing up. Move your hand in a questioning motion.",
    tip: "Used to ask how something is done.",
    videoUrl: require("../../assets/videos/how.mp4"),
  },
  {
    word: "name",
    fingers: "Index fingers tap",
    description:
      "Tap your index fingers together twice.",
    tip: "Used to ask someone's name.",
    videoUrl: require("../../assets/videos/name.mp4"),
  },
  {
    word: "no",
    fingers: "Index and middle fingers snap",
    description:
      "Snap your index and middle fingers together twice.",
    tip: "Used to say no or deny something.",
    videoUrl: require("../../assets/videos/no.mp4"),
  },
  {
    word: "please",
    fingers: "Flat hand circles",
    description:
      "Hold your hand flat and make circular motions on your chest.",
    tip: "Polite gesture for requesting.",
    videoUrl: require("../../assets/videos/please.mp4"),
  },
  {
    word: "sorry",
    fingers: "Fist circles chest",
    description:
      "Make a fist and move it in circular motions on your chest.",
    tip: "Used to apologize.",
    videoUrl: require("../../assets/videos/sorry.mp4"),
  },
  {
    word: "stop",
    fingers: "Flat hand, palm forward",
    description:
      "Hold your hand flat with palm facing forward.",
    tip: "Universal stop gesture.",
    videoUrl: require("../../assets/videos/stop.mp4"),
  },
  {
    word: "thank you",
    fingers: "Flat hand moves from chin",
    description:
      "Start with hand near chin and move it forward and down.",
    tip: "Express gratitude.",
    videoUrl: require("../../assets/videos/thank_you.mp4"),
  },
  {
    word: "understand",
    fingers: "Index finger points to head",
    description:
      "Point your index finger to your forehead.",
    tip: "Used to indicate understanding.",
    videoUrl: require("../../assets/videos/understand.mp4"),
  },
  {
    word: "water",
    fingers: "W hand taps chin",
    description:
      "Make a W shape with your fingers and tap your chin.",
    tip: "The W shape represents water.",
    videoUrl: require("../../assets/videos/water.mp4"),
  },
  {
    word: "what",
    fingers: "Index finger circles",
    description:
      "Extend your index finger and make circular motions.",
    tip: "Used to ask what something is.",
    videoUrl: require("../../assets/videos/what.mp4"),
  },
  {
    word: "where",
    fingers: "Index finger points around",
    description:
      "Point your index finger and move it around as if searching.",
    tip: "Used to ask where something is.",
    videoUrl: require("../../assets/videos/where.mp4"),
  },
  {
    word: "yes",
    fingers: "Fist, thumb up moves",
    description:
      "Make a fist with thumb up and move it up and down.",
    tip: "Used to say yes or agree.",
    videoUrl: require("../../assets/videos/yes.mp4"),
  },
];

type Letter = (typeof ASL_ALPHABET)[0];
type Word = (typeof ASL_WORDS)[0];

export default function LearnScreen() {
  const [selected, setSelected] = useState<Letter | Word | null>(null);
  const [selectedType, setSelectedType] = useState<"letter" | "word" | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);

  const openModal = (item: Letter | Word, type: "letter" | "word") => {
    setSelected(item);
    setSelectedType(type);
    setModalVisible(true);
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 220 });
  };

  const closeModal = () => {
    scale.value = withTiming(0.88, { duration: 160 });
    opacity.value = withTiming(0, { duration: 160 });
    setTimeout(() => {
      setModalVisible(false);
      setSelected(null);
      setSelectedType(null);
    }, 170);
  };

  // Fetch userId on mount
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

  // Check if selected item is favorited when modal opens
  useEffect(() => {
    if (modalVisible && selected && selectedType && userId) {
      const sign = selectedType === "letter" ? (selected as Letter).letter : (selected as Word).word;
      isFavorite(userId, sign, selectedType).then(setIsFavorited).catch(console.error);
    }
  }, [modalVisible, selected, selectedType, userId]);

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!selected || !selectedType || !userId) return;
    const sign = selectedType === "letter" ? (selected as Letter).letter : (selected as Word).word;
    const favorited = await toggleFavorite(userId, sign, selectedType);
    setIsFavorited(favorited);
  };

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <LinearGradient colors={["#0a0e27", "#0d1540"]} style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Alphabet Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.headerTitle}>Alphabets</Text>
            <Text style={styles.headerSub}>
              Tap a letter to see its hand sign
            </Text>
          </View>

          <FlatList
            data={ASL_ALPHABET}
            keyExtractor={(item) => item.letter}
            numColumns={4}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <LetterCard item={item} onPress={() => openModal(item, "letter")} />
            )}
          />

          {/* Words Section */}
          <View style={[styles.sectionHeader, styles.sectionHeaderMargin]}>
            <Text style={styles.headerTitle}>Words</Text>
            <Text style={styles.headerSub}>
              Tap a word to see its hand sign
            </Text>
          </View>

          <FlatList
            data={ASL_WORDS}
            keyExtractor={(item) => item.word}
            numColumns={4}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <WordCard item={item} onPress={() => openModal(item, "word")} />
            )}
          />
        </ScrollView>
      </SafeAreaView>

      <Modal
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          </Animated.View>

          <Animated.View style={[styles.modalCard, modalStyle]}>
            {selected && selectedType && (
              <ModalContent
                item={selected}
                type={selectedType}
                onClose={closeModal}
                isFavorited={isFavorited}
                onToggleFavorite={handleToggleFavorite}
                onPrev={() => {
                  if (selectedType === "letter") {
                    const idx = ASL_ALPHABET.findIndex(
                      (l) => l.letter === (selected as Letter).letter,
                    );
                    if (idx > 0) setSelected(ASL_ALPHABET[idx - 1]!);
                  } else {
                    const idx = ASL_WORDS.findIndex(
                      (w) => w.word === (selected as Word).word,
                    );
                    if (idx > 0) setSelected(ASL_WORDS[idx - 1]!);
                  }
                }}
                onNext={() => {
                  if (selectedType === "letter") {
                    const idx = ASL_ALPHABET.findIndex(
                      (l) => l.letter === (selected as Letter).letter,
                    );
                    if (idx < ASL_ALPHABET.length - 1)
                      setSelected(ASL_ALPHABET[idx + 1]!);
                  } else {
                    const idx = ASL_WORDS.findIndex(
                      (w) => w.word === (selected as Word).word,
                    );
                    if (idx < ASL_WORDS.length - 1)
                      setSelected(ASL_WORDS[idx + 1]!);
                  }
                }}
              />
            )}
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function LetterCard({ item, onPress }: { item: Letter; onPress: () => void }) {
  const s = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={() => {
          s.value = withSpring(0.9);
        }}
        onPressOut={() => {
          s.value = withSpring(1);
        }}
        activeOpacity={1}
      >
        {/* Gallaudet font renders the ASL handshape for each letter */}
        <Text style={styles.handSign}>{item.letter}</Text>
        <Text style={styles.cardLabel}>{item.letter}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function WordCard({ item, onPress }: { item: Word; onPress: () => void }) {
  const s = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={() => {
          s.value = withSpring(0.9);
        }}
        onPressOut={() => {
          s.value = withSpring(1);
        }}
        activeOpacity={1}
      >
        <Text style={styles.wordSign}>{item.word}</Text>
        <Text style={styles.cardLabel}>{item.word}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ModalContent({
  item,
  type,
  onClose,
  onPrev,
  onNext,
  isFavorited,
  onToggleFavorite,
}: {
  item: Letter | Word;
  type: "letter" | "word";
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const isLetter = type === "letter";
  const idx = isLetter
    ? ASL_ALPHABET.findIndex((l) => l.letter === (item as Letter).letter)
    : ASL_WORDS.findIndex((w) => w.word === (item as Word).word);
  const total = isLetter ? ASL_ALPHABET.length : ASL_WORDS.length;
  const label = isLetter ? (item as Letter).letter : (item as Word).word;

  return (
    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <MaterialIcons name="close" size={22} color="#b0b0b0" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.favoriteBtn} onPress={onToggleFavorite}>
        <MaterialIcons
          name={isFavorited ? "favorite" : "favorite-border"}
          size={22}
          color={isFavorited ? "#ff6b6b" : "#b0b0b0"}
        />
      </TouchableOpacity>

      {/* Large hand sign using Gallaudet font for letters, blue badge for words */}
      <View style={styles.signContainer}>
        {isLetter ? (
          <>
            <Text style={styles.bigHandSign}>{label}</Text>
            <View style={styles.letterBadge}>
              <Text style={styles.letterBadgeText}>{label}</Text>
            </View>
          </>
        ) : (
          <View style={styles.wordBadge}>
            <Text style={styles.wordBadgeText}>{label}</Text>
          </View>
        )}
      </View>

      {/* Embedded video for words */}
      {!isLetter && (item as Word).videoUrl && (
        <View style={styles.videoContainer}>
          <Video
            source={(item as Word).videoUrl}
            style={styles.video}
            useNativeControls
            isLooping
            shouldPlay
            resizeMode={ResizeMode.CONTAIN}
          />
        </View>
      )}

      {/* Hand shape */}
      <View style={styles.infoRow}>
        <MaterialIcons name="back-hand" size={18} color="#00d9ff" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.infoLabel}>HAND SHAPE</Text>
          <Text style={styles.infoValue}>{isLetter ? (item as Letter).fingers : (item as Word).fingers}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.descBox}>
        <Text style={styles.descTitle}>HOW TO SIGN</Text>
        <Text style={styles.descText}>{isLetter ? (item as Letter).description : (item as Word).description}</Text>
      </View>

      {/* Tip */}
      <View style={styles.tipBox}>
        <MaterialIcons
          name="lightbulb"
          size={16}
          color="#ffd700"
          style={{ marginRight: 8, marginTop: 1 }}
        />
        <Text style={styles.tipText}>{isLetter ? (item as Letter).tip : (item as Word).tip}</Text>
      </View>

      {/* Prev / Next */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, idx === 0 && styles.navBtnDisabled]}
          onPress={onPrev}
          disabled={idx === 0}
        >
          <MaterialIcons
            name="chevron-left"
            size={22}
            color={idx === 0 ? "#444" : "#00d9ff"}
          />
          <Text style={[styles.navText, idx === 0 && { color: "#444" }]}>
            Prev
          </Text>
        </TouchableOpacity>

        <Text style={styles.navCounter}>
          {idx + 1} / {total}
        </Text>

        <TouchableOpacity
          style={[
            styles.navBtn,
            idx === total - 1 && styles.navBtnDisabled,
          ]}
          onPress={onNext}
          disabled={idx === total - 1}
        >
          <Text
            style={[
              styles.navText,
              idx === total - 1 && { color: "#444" },
            ]}
          >
            Next
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={idx === total - 1 ? "#444" : "#00d9ff"}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 },
  sectionHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  sectionHeaderMargin: { marginTop: 32 },
  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerSub: { color: "#b0b0b0", fontSize: 13, marginTop: 2 },
  grid: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 10 },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE + 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
    gap: 2,
  },
  // Gallaudet font — renders ASL handshape for the typed letter
  handSign: {
    fontFamily: "GallaudetRegular",
    fontSize: 38,
    color: "#ffffff",
  },
  wordSign: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
    textAlign: "center",
  },
  cardLabel: {
    color: "#00d9ff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,8,25,0.88)",
  },
  modalCard: {
    width: "100%",
    maxHeight: height * 0.84,
    backgroundColor: "#0d1540",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.2)",
    padding: 24,
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  closeBtn: { alignSelf: "flex-end", padding: 4, marginBottom: 8 },
  favoriteBtn: { alignSelf: "flex-end", padding: 4, marginBottom: 8, marginRight: 8 },
  signContainer: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  // Large Gallaudet handshape in modal
  bigHandSign: {
    fontFamily: "GallaudetRegular",
    fontSize: 140,
    color: "#ffffff",
    lineHeight: 160,
  },
  bigWordSign: {
    fontSize: 48,
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
  },
  letterBadge: {
    position: "absolute",
    bottom: 0,
    right: "25%",
    backgroundColor: "rgba(0,217,255,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  letterBadgeText: {
    color: "#00d9ff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  wordBadge: {
    backgroundColor: "rgba(0,217,255,0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.3)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: "center",
  },
  wordBadgeText: {
    color: "#00d9ff",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.1)",
    padding: 14,
    marginBottom: 10,
  },
  infoLabel: {
    color: "#b0b0b0",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  descBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.1)",
    padding: 14,
    marginBottom: 10,
  },
  descTitle: {
    color: "#00d9ff",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 6,
  },
  descText: { color: "#e0e0e0", fontSize: 14, lineHeight: 21 },
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255,215,0,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.15)",
    padding: 12,
    marginBottom: 20,
  },
  tipText: { color: "#e0e0e0", fontSize: 13, lineHeight: 19, flex: 1 },
  videoContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#000",
    width: "100%",
  },
  video: { 
    width: "100%", 
    height: "100%",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(0,217,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,217,255,0.2)",
    gap: 2,
  },
  navBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.06)",
  },
  navText: { color: "#00d9ff", fontSize: 13, fontWeight: "600" },
  navCounter: { color: "#b0b0b0", fontSize: 12 },
});
