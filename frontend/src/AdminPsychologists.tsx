import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { adminApi } from "@/src/api";
import { AppText, Card, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Psy = { id: string; name: string; login_phone: string; specializations: string[]; languages: string[]; price: number };

export function AdminPsychologists({ token }: { token: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [list, setList] = useState<Psy[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [quals, setQuals] = useState("");
  const [specs, setSpecs] = useState("");
  const [langs, setLangs] = useState("English, Hindi");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("1000");
  const [days, setDays] = useState<number[]>([0, 2, 4]);
  const [hours, setHours] = useState("10, 11, 12, 19");

  const load = useCallback(async () => {
    try { const d = await adminApi(token).get("/admin/psychologists"); setList(d.psychologists || []); }
    catch {}
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const reset = () => { setName(""); setPhone(""); setQuals(""); setSpecs(""); setBio(""); setPrice("1000"); setDays([0, 2, 4]); setHours("10, 11, 12, 19"); setErr(""); };

  const toggleDay = (i: number) => { Haptics.selectionAsync(); setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i]); };

  const submit = async () => {
    setErr("");
    if (!name.trim() || phone.trim().length !== 10) { setErr("Name and a valid 10-digit phone are required."); return; }
    setSaving(true);
    try {
      await adminApi(token).post("/admin/psychologists", {
        name: name.trim(),
        login_phone: `+91${phone.trim()}`,
        qualifications: quals.trim(),
        specializations: specs.split(",").map((s) => s.trim()).filter(Boolean),
        languages: langs.split(",").map((s) => s.trim()).filter(Boolean),
        bio: bio.trim(),
        price: parseInt(price) || 1000,
        short_call_price: parseInt(price) || 1000,
        session_types: ["15-min Call"],
        available_days: days,
        slot_hours: hours.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n)),
        verified: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset(); setOpen(false); await load();
    } catch (e: any) { setErr(e?.message || "Could not save"); }
    finally { setSaving(false); }
  };

  const remove = async (p: Psy) => {
    Haptics.selectionAsync();
    try { await adminApi(token).del(`/admin/psychologists/${p.id}`); await load(); } catch {}
  };

  return (
    <View>
      <View style={styles.headRow}>
        <AppText style={styles.section}>Psychologists</AppText>
        <Pressable testID="psy-add-toggle" onPress={() => { Haptics.selectionAsync(); setOpen((o) => !o); reset(); }} style={[styles.addBtn, { backgroundColor: colors.indigo }]}>
          <Feather name={open ? "x" : "plus"} size={16} color="#fff" />
          <AppText style={styles.addText}>{open ? "Close" : "Add doctor"}</AppText>
        </Pressable>
      </View>
      <AppText style={styles.hint}>Each doctor logs in with their phone (+91) and gets booking alerts.</AppText>

      {open && (
        <Card style={{ marginBottom: spacing.md }}>
          <Field label="Full name *" value={name} onChangeText={setName} placeholder="Dr. Jane Doe" styles={styles} colors={colors} testID="psy-name" />
          <Field label="Login mobile (10-digit) *" value={phone} onChangeText={(v: string) => setPhone(v.replace(/\D/g, "").slice(0, 10))} placeholder="9876543210" keyboardType="number-pad" styles={styles} colors={colors} testID="psy-phone" />
          <Field label="Qualifications" value={quals} onChangeText={setQuals} placeholder="Clinical Psychologist, RCI" styles={styles} colors={colors} testID="psy-quals" />
          <Field label="Specializations (comma-separated)" value={specs} onChangeText={setSpecs} placeholder="Anxiety, Stress, Relationships" styles={styles} colors={colors} testID="psy-specs" />
          <Field label="Languages (comma-separated)" value={langs} onChangeText={setLangs} styles={styles} colors={colors} testID="psy-langs" />
          <Field label="Short bio" value={bio} onChangeText={setBio} placeholder="Evidence-based support…" styles={styles} colors={colors} testID="psy-bio" />
          <Field label="Price (₹ per 15-min call)" value={price} onChangeText={(v: string) => setPrice(v.replace(/\D/g, ""))} keyboardType="number-pad" styles={styles} colors={colors} testID="psy-price" />

          <AppText style={styles.fieldLabel}>Available days</AppText>
          <View style={styles.dayRow}>
            {DAYS.map((d, i) => (
              <Pressable key={d} testID={`psy-day-${i}`} onPress={() => toggleDay(i)} style={[styles.dayChip, { borderColor: colors.border }, days.includes(i) && { backgroundColor: colors.indigo, borderColor: colors.indigo }]}>
                <AppText style={[styles.dayText, { color: days.includes(i) ? "#fff" : colors.onSurfaceSecondary }]}>{d}</AppText>
              </Pressable>
            ))}
          </View>
          <Field label="Slot hours (24h, comma-separated)" value={hours} onChangeText={setHours} placeholder="10, 11, 12, 19" keyboardType="number-pad" styles={styles} colors={colors} testID="psy-hours" />

          {!!err && <AppText style={styles.err}>{err}</AppText>}
          <Pressable testID="psy-save" disabled={saving} onPress={submit} style={[styles.saveBtn, { backgroundColor: colors.amber }]}>
            {saving ? <ActivityIndicator color="#2C2416" /> : <AppText style={styles.saveText}>Save doctor</AppText>}
          </Pressable>
        </Card>
      )}

      {list.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm }} testID={`psy-row-${p.id}`}>
          <View style={styles.psyRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.psyName}>{p.name}</AppText>
              <AppText style={styles.psyMeta}>{p.login_phone} · ₹{p.price}</AppText>
              <AppText style={styles.psyMeta}>{(p.specializations || []).slice(0, 3).join(" · ")}</AppText>
            </View>
            <Pressable testID={`psy-del-${p.id}`} onPress={() => remove(p)} hitSlop={8} style={styles.delBtn}>
              <Feather name="trash-2" size={18} color={colors.rose} />
            </Pressable>
          </View>
        </Card>
      ))}
    </View>
  );
}

function Field({ label, styles, colors, ...props }: any) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <TextInput placeholderTextColor={colors.onSurfaceSecondary} style={styles.input} {...props} />
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl },
  section: { fontSize: T.xl, fontWeight: "700", color: colors.onSurface },
  hint: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.md, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, height: 38, borderRadius: radius.pill },
  addText: { color: "#fff", fontWeight: "700", fontSize: T.sm },
  fieldLabel: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginBottom: 4, marginTop: spacing.xs },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: T.base, color: colors.onSurface },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  dayText: { fontSize: T.sm, fontWeight: "600" },
  err: { color: colors.rose, marginVertical: spacing.sm, fontWeight: "600" },
  saveBtn: { height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  saveText: { color: "#2C2416", fontWeight: "700", fontSize: T.base },
  psyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  psyName: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  psyMeta: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 1 },
  delBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
