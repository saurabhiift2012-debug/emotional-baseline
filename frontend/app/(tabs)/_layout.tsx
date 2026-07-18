import React from "react";
import { Tabs } from "expo-router";
import { GlassTabBar } from "@/src/GlassTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "shift" }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="support" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
