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
  if (!user) return <Redirect href="/onboarding" />;
  return <Redirect href={user.role === "psychologist" ? "/psy-dashboard" : "/(tabs)"} />;
}
