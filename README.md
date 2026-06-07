# SignBridge: American Sign Language (ASL) Recognition Mobile App

SignBridge is a cross-platform mobile application designed to bridge the communication gap between the Deaf and hearing communities. The system leverages mobile computer vision and deep learning models to capture and interpret real-time hand gestures directly from a smartphone camera, converting American Sign Language (ASL) signs into text.

## 🚀 Features

- **Mobile-First Real-Time Detection:** Smooth camera-based gesture processing optimized for mobile devices.
- **Cross-Platform Accessibility:** Built to run instantly on both Android and iOS devices using the Expo Go environment.
- **Cloud-Accelerated Intelligence:** Uses an optimized machine learning model trained efficiently using cloud hardware.

## 🛠️ Tech Stack & Ecosystem

### Frontend (Mobile App)

- **Framework:** React Native
- **Development Environment:** [Expo Go](https://expo.dev)
- **Camera Handling:** Expo Camera / VisionCamera

### Backend & Machine Learning

- **Core Language:** Python
- **Libraries:** OpenCV, TensorFlow / Keras, MediaPipe, NumPy
- **Training Environment:** Google Colab (leveraging cloud GPUs for accelerated training)

## 🧠 Hybrid Workflow & Architecture

This project utilizes a simultaneous hybrid workflow to balance resource-heavy training with a lightweight mobile frontend:

1. **Local Python & MediaPipe:** Used for initial dataset preparation, data augmentation, and extracting 2D/3D hand landmark coordinates.
2. **Google Colab Training:** The preprocessed landmark datasets are uploaded to Google Colab. By utilizing free cloud-hosted GPUs, the deep learning classification models (TensorFlow/Keras) are trained rapidly without exhausting local hardware resources.
3. **Mobile Deployment:** The finalized, lightweight trained model weights are exported and integrated into the React Native application. Users can launch the app instantly via **Expo Go** to test real-time inference using their mobile device's camera feed.

## 📦 Installation & Local Development

Because this project utilizes specialized native packages (such as camera or frame processors) that require custom native code syncing, **it cannot be run inside the standard Expo Go app**. You must generate a local development build instead.

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org) installed.
- Set up [Android Studio](https://android.com) (for Android Emulators) or [Xcode](https://apple.com) (for iOS Simulators) to build native code locally.

### 1. Clone & Install Dependencies

```bash
git clone https://github.com
cd SignBridge-ASL-Recogniton
npm install
```

### 2. Run the Native Prebuild

Generate the native `/android` and `/ios` directories containing your bundled packages:

```bash
npx expo prebuild
```

### 3. Run Locally on an Emulator or Connected Device

Compile the native code and boot the application locally:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

## 👥 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Feel free to fork this project, open issues, or submit pull requests to improve gesture translation speed, model architecture, or mobile UI/UX.
