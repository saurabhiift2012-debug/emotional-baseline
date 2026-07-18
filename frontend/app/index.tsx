import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useApp } from "@/src/AppContext";
import { Loading, Screen } from "@/src/ui";

export default function Index() {
  const { ready, user } = useApp();
  if (!ready) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  return <Redirect href={user ? "/(tabs)" : "/onboarding"} />;
}
