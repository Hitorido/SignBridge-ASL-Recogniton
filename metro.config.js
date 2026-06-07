const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("tflite", "task");

const webStubs = {
  "react-native-vision-camera": path.resolve(
    __dirname,
    "stubs/vision-camera.web.tsx",
  ),
  "react-native-fast-tflite": path.resolve(
    __dirname,
    "stubs/fast-tflite.web.ts",
  ),
  "react-native-worklets-core": path.resolve(
    __dirname,
    "stubs/worklets-core.web.ts",
  ),
};

const webAliases = {
  "@tensorflow/tfjs-tflite": path.resolve(
    __dirname,
    "node_modules/@tensorflow/tfjs-tflite/dist/tf-tflite.fesm.js",
  ),
  "@mediapipe/tasks-vision": path.resolve(
    __dirname,
    "node_modules/@mediapipe/tasks-vision/vision_bundle.cjs",
  ),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    if (webStubs[moduleName]) {
      return { type: "sourceFile", filePath: webStubs[moduleName] };
    }
    if (webAliases[moduleName]) {
      return { type: "sourceFile", filePath: webAliases[moduleName] };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./globals.css" });
