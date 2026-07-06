// Advanced filters bottom-sheet for Discover.
import React from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/Button";
import { colors, spacing, radius } from "@/src/theme";

export type AdvancedFilters = {
  radius_km: number;
  day: string | null;
  position: string | null;
};

const DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

const POSITIONS = [
  { key: "GK", label: "Gardien" },
  { key: "DEF", label: "Défenseur" },
  { key: "MID", label: "Milieu" },
  { key: "FWD", label: "Attaquant" },
];

type Props = {
  visible: boolean;
  value: AdvancedFilters;
  onChange: (v: AdvancedFilters) => void;
  onClose: () => void;
  onReset: () => void;
};

export function AdvancedFiltersSheet({ visible, value, onChange, onClose, onReset }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet} testID="advanced-filters-sheet">
          <View style={styles.grip} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Filtres avancés</Text>
              <Text style={styles.sub}>Trouve le groupe qui te correspond parfaitement</Text>
            </View>
            <Pressable onPress={onReset} testID="filters-reset" hitSlop={8}>
              <Text style={styles.reset}>Réinitialiser</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Rayon max</Text>
                <View style={styles.valuePill}>
                  <Text style={styles.valuePillText}>{value.radius_km === 30 ? "30+ km" : `${value.radius_km} km`}</Text>
                </View>
              </View>
              <Slider
                minimumValue={1}
                maximumValue={30}
                step={1}
                value={value.radius_km}
                onValueChange={(v) => onChange({ ...value, radius_km: Math.round(v) })}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                testID="filter-radius-slider"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1 km</Text>
                <Text style={styles.sliderLabel}>30+ km</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Jour préféré</Text>
              <View style={styles.chipRow}>
                {DAYS.map((d) => {
                  const active = value.day === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => onChange({ ...value, day: active ? null : d.key })}
                      style={[styles.dayChip, active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                      testID={`filter-day-${d.key}`}
                    >
                      <Text style={{ color: active ? colors.primary : colors.textSecondary, fontFamily: "DMSans-Bold", fontSize: 12 }}>
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Poste recherché par le groupe</Text>
              <Text style={styles.sectionSub}>Cherche les groupes qui recrutent ton poste</Text>
              <View style={styles.chipRow}>
                {POSITIONS.map((p) => {
                  const active = value.position === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => onChange({ ...value, position: active ? null : p.key })}
                      style={[styles.posChip, active && { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                      testID={`filter-position-${p.key}`}
                    >
                      <Text style={{ color: active ? colors.primary : colors.text, fontFamily: "DMSans-Bold", fontSize: 12 }}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <Button
            label="Appliquer les filtres"
            onPress={onClose}
            fullWidth
            size="lg"
            style={{ marginTop: 8 } as any}
            testID="filters-apply-button"
            icon={<Ionicons name="funnel" size={16} color={colors.textOnPrimary} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  title: { fontFamily: "BarlowCondensed-Bold", fontSize: 26, color: colors.text, letterSpacing: -0.4 },
  sub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 13, marginTop: 2, maxWidth: 240 },
  reset: { fontFamily: "DMSans-Bold", color: colors.primary, fontSize: 13 },
  section: { marginTop: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sectionTitle: { fontFamily: "BarlowCondensed-Bold", fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  sectionSub: { fontFamily: "DMSans-Regular", color: colors.textSecondary, fontSize: 12, marginTop: 2, marginBottom: 8 },
  valuePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  valuePillText: { fontFamily: "BarlowCondensed-Bold", color: colors.primary, fontSize: 14 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  sliderLabel: { fontFamily: "DMSans-Regular", color: colors.textMuted, fontSize: 11 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  dayChip: {
    width: 46,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  posChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
