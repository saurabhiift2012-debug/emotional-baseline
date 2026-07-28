import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { adminApi } from "@/src/api";
import { AppText, Card, spacing, radius, T, useTheme, useThemedStyles } from "@/src/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const stripPrefix = (phone: string) => (phone || "").replace(/^\+?91/, "").replace(/\D/g, "").slice(0, 10);

export function AdminPsychologists({ token }: { token: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [list, setList] = useState<any[]>([]);
  const [mode, setMode] = useState<null | "new" | string>(null); // null | 'new' | <psyId>
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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

  const resetFields = () => {
    setName(""); setPhone(""); setQuals(""); setSpecs(""); setLangs("English, Hindi");
    setBio(""); setPrice("1000"); setDays([0, 2, 4]); setHours("10, 11, 12, 19");
    setErr(""); setOk("");
  };

  const openNew = () => { Haptics.selectionAsync(); resetFields(); setMode(mode === "new" ? null : "new"); };

  const openEdit = (p: any) => {
    Haptics.selectionAsync();
    setErr(""); setOk("");
    setName(p.name || "");
    setPhone(stripPrefix(p.login_phone || ""));
    setQuals(p.qualifications || "");
    setSpecs((p.specializations || []).join(", "));
    setLangs((p.languages || []).join(", "));
    setBio(p.bio || "");
    setPrice(String(p.price ?? 1000));
    setDays(Array.isArray(p.available_days) ? p.available_days : [0, 2, 4]);
    setHours((p.slot_hours || []).join(", "));
    setMode(p.id);
  };

  const toggleDay = (i: number) => { Haptics.selectionAsync(); setDays((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i]); };

  const submit = async () => {
    setErr(""); setOk("");
    if (!name.trim() || phone.trim().length !== 10) { setErr("Name and a valid 10-digit phone are required."); return; }
    const payload = {
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
    };
    setSaving(true);
    try {
      if (mode === "new") {
        await adminApi(token).post("/admin/psychologists", payload);
        setOk("Doctor added.");
      } else {
        await adminApi(token).put(`/admin/psychologists/${mode}`, payload);
        setOk("Changes saved.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
      setMode(null);
      resetFields();
    } catch (e: any) {
      setErr(e?.message || "Could not save. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setSaving(false); }
  };

  const remove = async (p: any) => {
    Haptics.selectionAsync();
    try { await adminApi(token).del(`/admin/psychologists/${p.id}`); await load(); } catch {}
  };

  const editing = mode !== null;

  return (
    <View>
      <View style={styles.headRow}>
        <AppText style={styles.section}>Psychologists</AppText>
        <Pressable testID="psy-add-toggle" onPress={openNew} style={[styles.addBtn, { backgroundColor: colors.indigo }]}>
          <Feather name={mode === "new" ? "x" : "plus"} size={16} color="#fff" />
          <AppText style={styles.addText}>{mode === "new" ? "Close" : "Add doctor"}</AppText>
        </Pressable>
      </View>
      <AppText style={styles.hint}>Each doctor logs in with their phone (+91) and gets booking alerts. Tap a doctor to edit.</AppText>

      {!!ok && <AppText style={styles.ok} testID="psy-ok">✓ {ok}</AppText>}

      {editing && (
        <Card style={{ marginBottom: spacing.md }} testID="psy-form">
          <AppText style={styles.formTitle}>{mode === "new" ? "New doctor" : "Edit doctor"}</AppText>
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

          {!!err && <AppText style={styles.err} testID="psy-err">{err}</AppText>}
          <View style={styles.formBtns}>
            <Pressable testID="psy-cancel" onPress={() => { setMode(null); resetFields(); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <AppText style={[styles.cancelText, { color: colors.onSurfaceSecondary }]}>Cancel</AppText>
            </Pressable>
            <Pressable testID="psy-save" disabled={saving} onPress={submit} style={[styles.saveBtn, { backgroundColor: colors.amber, opacity: saving ? 0.6 : 1 }]}>
              {saving ? <ActivityIndicator color="#2C2416" /> : <AppText style={styles.saveText}>{mode === "new" ? "Add doctor" : "Save changes"}</AppText>}
            </Pressable>
          </View>
        </Card>
      )}

      {list.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm }} testID={`psy-row-${p.id}`}>
          <View style={styles.psyRow}>
            <Pressable style={{ flex: 1 }} testID={`psy-edit-${p.id}`} onPress={() => openEdit(p)}>
              <AppText style={styles.psyName}>{p.name}</AppText>
              <AppText style={styles.psyMeta}>{p.login_phone} · ₹{p.price}</AppText>
              <AppText style={styles.psyMeta}>{(p.specializations || []).slice(0, 3).join(" · ")}</AppText>
            </Pressable>
            <Pressable testID={`psy-edit-icon-${p.id}`} onPress={() => openEdit(p)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="edit-2" size={17} color={colors.indigo} />
            </Pressable>
            <Pressable testID={`psy-del-${p.id}`} onPress={() => remove(p)} hitSlop={8} style={styles.iconBtn}>
              <Feather name="trash-2" size={17} color={colors.rose} />
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
  ok: { color: colors.sage, fontWeight: "700", marginBottom: spacing.sm },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, height: 38, borderRadius: radius.pill },
  addText: { color: "#fff", fontWeight: "700", fontSize: T.sm },
  formTitle: { fontSize: T.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  fieldLabel: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginBottom: 4, marginTop: spacing.xs },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: T.base, color: colors.onSurface },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  dayText: { fontSize: T.sm, fontWeight: "600" },
  err: { color: colors.rose, marginVertical: spacing.sm, fontWeight: "600" },
  formBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: { flex: 1, height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cancelText: { fontWeight: "600", fontSize: T.base },
  saveBtn: { flex: 2, height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#2C2416", fontWeight: "700", fontSize: T.base },
  psyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  psyName: { fontSize: T.lg, fontWeight: "600", color: colors.onSurface },
  psyMeta: { fontSize: T.sm, color: colors.onSurfaceSecondary, marginTop: 1 },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
