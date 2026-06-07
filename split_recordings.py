"""
Splits long recording videos into individual sign clips.
Processes frame-by-frame to avoid loading full video into RAM.
"""

import os
import cv2
import numpy as np
from collections import Counter

INPUT_DIR  = r"D:\Santos_BSIS\SignLanguageTrain\videosasltraining"
OUTPUT_DIR = r"D:\Santos_BSIS\SignLanguageTrain\WLASL\start_kit\videos"

MOTION_THRESHOLD  = 25
ACTIVE_PIXEL_FRAC = 0.01
MIN_CLIP_FRAMES   = 10
MAX_CLIP_FRAMES   = 150
PAUSE_FRAMES      = 8

TOP_20 = {
    "hello", "thank you", "please", "sorry", "yes", "no",
    "help", "good", "bad", "name", "what", "where",
    "how", "understand", "again", "stop", "go", "come",
    "eat", "water"
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_label(filename):
    stem = os.path.splitext(filename)[0].lower().replace("_", " ")
    return stem if stem in TOP_20 else None

def split_video(video_path, label, output_dir):
    # ── Pass 1: detect motion scores (no frame storage) ──────────────────
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"  {label}: {total} frames @ {fps:.0f}fps ({total/fps:.0f}s) {w}x{h}")

    motion = []
    prev_gray = None
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        # Resize to 320x240 for motion detection — saves memory
        small = cv2.resize(frame, (320, 240))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            diff = cv2.absdiff(prev_gray, gray)
            score = np.sum(diff > MOTION_THRESHOLD) / diff.size
            motion.append(score)
        else:
            motion.append(0)
        prev_gray = gray
        frame_idx += 1

    cap.release()
    motion.append(0)  # pad

    # ── Find segments ─────────────────────────────────────────────────────
    active = [s > ACTIVE_PIXEL_FRAC for s in motion]
    segments = []
    in_seg = False
    start = 0
    still_count = 0

    for i, is_active in enumerate(active):
        if not in_seg:
            if is_active:
                in_seg = True
                start = i
                still_count = 0
        else:
            if not is_active:
                still_count += 1
                if still_count >= PAUSE_FRAMES:
                    end = i - still_count
                    if MIN_CLIP_FRAMES <= (end - start) <= MAX_CLIP_FRAMES:
                        segments.append((start, end))
                    in_seg = False
                    still_count = 0
            else:
                still_count = 0

    if in_seg:
        end = frame_idx - 1
        if MIN_CLIP_FRAMES <= (end - start) <= MAX_CLIP_FRAMES:
            segments.append((start, end))

    print(f"  Found {len(segments)} segments")
    if not segments:
        return 0

    # ── Pass 2: write clips (stream frame by frame) ───────────────────────
    existing = [f for f in os.listdir(output_dir)
                if f.startswith(f"custom_{label.replace(' ','_')}_")]
    start_idx = len(existing)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    seg_idx = 0
    current_writer = None
    current_seg = None
    saved = 0

    # Sort segments
    seg_queue = list(segments)
    seg_ptr = 0

    cap = cv2.VideoCapture(video_path)
    frame_idx = 0

    while seg_ptr < len(seg_queue):
        ret, frame = cap.read()
        if not ret:
            break

        seg_start, seg_end = seg_queue[seg_ptr]

        if frame_idx == seg_start:
            fname = f"custom_{label.replace(' ','_')}_{start_idx + seg_ptr:03d}.mp4"
            out_path = os.path.join(output_dir, fname)
            current_writer = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

        if current_writer and seg_start <= frame_idx <= seg_end:
            current_writer.write(frame)

        if frame_idx == seg_end and current_writer:
            current_writer.release()
            current_writer = None
            saved += 1
            seg_ptr += 1

        frame_idx += 1

    if current_writer:
        current_writer.release()

    cap.release()
    print(f"  Saved {saved} clips")
    return saved

# ── Process all videos ────────────────────────────────────────────────────
total_saved = 0
for fname in sorted(os.listdir(INPUT_DIR)):
    if not fname.endswith('.mp4'):
        continue
    label = get_label(fname)
    if not label:
        print(f"Skipping {fname}")
        continue
    print(f"\nProcessing: {fname} → '{label}'")
    saved = split_video(os.path.join(INPUT_DIR, fname), label, OUTPUT_DIR)
    total_saved += saved

print(f"\n{'='*50}")
print(f"Total clips saved: {total_saved}")

counts = Counter()
for f in os.listdir(OUTPUT_DIR):
    if f.startswith("custom_") and f.endswith(".mp4"):
        parts = f[7:].split("_")
        for i in range(len(parts)-1, 0, -1):
            if parts[i].isdigit():
                counts[" ".join(parts[:i])] += 1
                break

print("\nCustom clips per word:")
for word, count in sorted(counts.items()):
    print(f"  {word:<15} {count}")
