# SignBridge Setup & Configuration Guide

## ✅ What's Been Fixed

### 1. Auth Flow ✅

- **Before**: Camera was showing without login
- **After**: Proper splash → login/signup → tabs flow
- Root `app/index.tsx` now redirects based on session status

### 2. Pause Button ✅

- **Before**: Clicking pause showed infinite loading
- **After**: Camera properly toggles on/off with state management fixed
- Camera component is in `app/(tabs)/index.tsx`

### 3. Database Schema ✅

- Created complete SQL schema in `DATABASE_SCHEMA.sql`
- Ready to run in Supabase
- Includes tables for: users, signs, conversations, messages, progress, settings, feedback

### 4. Tab Navigation ✅

- **Order**: AI (left) → 📷 Camera (middle) → Profile (right)
- Camera tab is the default when authenticated
- Each tab has proper icon and labels

---

## 📋 Setup Instructions

### Step 1: Add Your Splash Logo & App Icon

**Option A: Use Same Image for Both**

1. Create your logo/image file (recommended: `logo.png` or `logo.jpg`)
   - Dimensions: 1024x1024px (will be scaled)
   - Storage location: `assets/images/logo.png`

2. Update `app/SplashScreen.tsx`:

   ```tsx
   import { Image } from "react-native";

   // Replace the View placeholder with:
   <Image
     source={require("@/assets/images/logo.png")}
     style={{ width: 200, height: 200, marginBottom: 8 }}
     resizeMode="contain"
   />;
   ```

3. Update app icons in `app.json`:
   ```json
   {
     "expo": {
       "icon": "./assets/images/logo.png",
       "plugins": [
         [
           "expo-splash-screen",
           {
             "image": "./assets/images/logo.png",
             "resizeMode": "contain",
             "backgroundColor": "#0a0e27"
           }
         ]
       ]
     }
   }
   ```

### Step 2: Setup Database (Supabase)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Copy entire content of `DATABASE_SCHEMA.sql`
5. Paste and run the SQL
6. Verify all tables created successfully

### Step 3: Test the App

```bash
npm run android
# or
expo start -c
```

**Expected Flow**:

1. Splash screen shows with logo
2. Login/Signup screen appears
3. After login → Camera tab is default
4. Bottom nav shows 3 tabs correctly
5. Pause button (⏸) works to pause camera
6. Can navigate to AI and Profile tabs

---

## 🤖 Hand Scanning Setup

The camera is now ready. To enable hand scanning:

1. **Get TFLite Model**: You'll need a hand pose detection model
   - Option: Google MediaPipe HandPose model
   - Or: Train your own sign language model

2. **Add Model to App**:

   ```
   assets/
   └── model.tflite  (your hand detection model)
   ```

3. **Uncomment Hand Detection** in `app/(tabs)/index.tsx`:
   - Look for the commented `useTFLiteFrame` hook
   - Provide your model path
   - Implement prediction callbacks

---

## 🤖 Gemini AI Integration

The AI Screen is ready for Gemini API:

1. **Get Gemini API Key**:
   - Go to [Google AI Studio](https://ai.google.dev/)
   - Create API key

2. **Add to Environment**:

   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
   ```

3. **Update AI Screen** in `app/(tabs)/AIScreen.tsx`:
   - Replace the mock response with actual Gemini API call
   - Use `@google/generative-ai` package

---

## 📱 Current App Structure

```
app/
├── index.tsx                    # Root - Redirects based on auth
├── SplashScreen.tsx             # Splash with logo (update with image)
├── (auth)/
│   ├── _layout.tsx             # Auth stack
│   ├── Login.tsx
│   └── Signup.tsx
└── (tabs)/
    ├── _layout.tsx             # Tab stack with custom bar
    ├── index.tsx               # Camera screen ✅ FIXED
    ├── AIScreen.tsx            # AI chat (ready for Gemini)
    └── Profile.tsx

components/
├── CustomTabBar.tsx            # Bottom nav with 3 tabs ✅ FIXED
├── PermissionDenied.tsx        # Camera permission UI
├── ScanningReticle.tsx         # Camera overlay
└── ...

DATABASE_SCHEMA.sql             # ✅ Complete schema
```

---

## 🔄 Flow Diagram

```
Splash Screen
    ↓
Check Session
    ├─→ No Session → Login/Signup
    └─→ Has Session → Camera Tab
         ├─ AI Tab (Gemini ready)
         ├─ Camera Tab (Hand scanning ready)
         └─ Profile Tab (Logout)
```

---

## 🐛 Common Issues & Fixes

| Issue                             | Fix                                                                       |
| --------------------------------- | ------------------------------------------------------------------------- |
| Infinite "Initializing Camera..." | Check camera permissions granted in device settings                       |
| Pause button doesn't work         | Already fixed ✅                                                          |
| Can't login                       | Ensure Supabase project URL and anon key are correct in `lib/supabase.ts` |
| Model not detected                | Add TFLite model to assets/ and uncomment hook in camera screen           |
| AI doesn't respond                | Add Gemini API key and uncomment API call in AIScreen.tsx                 |

---

## ✨ Next Features to Add

- [ ] Add splash logo image
- [ ] Run database schema in Supabase
- [ ] Integrate Gemini API
- [ ] Add TFLite hand pose model
- [ ] Implement confidence threshold settings
- [ ] Add sign history saving
- [ ] User profile customization
- [ ] Learning progress tracking

---

## 📞 Support

If you encounter issues:

1. Check the console for error messages
2. Verify internet connection
3. Ensure all dependencies installed: `npm install`
4. Clear cache: `expo start -c`
