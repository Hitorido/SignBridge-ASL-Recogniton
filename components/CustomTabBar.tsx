import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const getIcon = (routeName: string): IconName => {
  switch (routeName) {
    case "Home":
      return "home";
    case "Learn":
      return "school";
    case "index":
      return "photo-camera";
    case "AIScreen":
      return "smart-toy";
    case "Profile":
      return "person";
    default:
      return "circle";
  }
};

// Camera is always the middle tab (index 2 of 5)
const MIDDLE_INDEX = 2;

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={[styles.container, { paddingBottom: insets.bottom || 12 }]}
    >
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;
          const isMiddle = index === MIDDLE_INDEX;
          const icon = getIcon(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isMiddle) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.middleTab}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                <View
                  style={[
                    styles.middleCircle,
                    isFocused && styles.middleCircleActive,
                  ]}
                >
                  <MaterialIcons
                    name={icon}
                    size={26}
                    color={isFocused ? "#0a0e27" : "#b0b0b0"}
                  />
                </View>
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <MaterialIcons
                name={icon}
                size={22}
                color={isFocused ? "#00d9ff" : "#b0b0b0"}
              />
              <Text style={[styles.label, isFocused && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,217,255,0.1)",
    backgroundColor: "rgba(10,14,39,0.85)",
  },
  inner: {
    flexDirection: "row",
    height: 60,
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  middleTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    gap: 4,
  },
  middleCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(0,217,255,0.15)",
    borderWidth: 2,
    borderColor: "rgba(0,217,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  middleCircleActive: {
    backgroundColor: "#00d9ff",
    borderColor: "#00d9ff",
    shadowColor: "#00d9ff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  label: {
    fontSize: 9,
    color: "#b0b0b0",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: "#00d9ff",
  },
});
