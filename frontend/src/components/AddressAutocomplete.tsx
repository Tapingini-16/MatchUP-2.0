// AddressAutocomplete — debounced Nominatim-backed search input with dropdown.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { searchAddress, type GeoResult } from "@/src/services/geocoding";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (result: GeoResult) => void;
  placeholder?: string;
  testID?: string;
  disabled?: boolean;
  minChars?: number;
};

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Rechercher une adresse...",
  testID,
  disabled = false,
  minChars = 3,
}: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const skipNextSearchRef = useRef(false);
  const debounceRef = useRef<any>(null);
  const reqIdRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const myId = ++reqIdRef.current;
    setLoading(true);
    try {
      const list = await searchAddress(q, 6);
      if (myId !== reqIdRef.current) return; // stale
      setResults(Array.isArray(list) ? list : []);
      setOpen(true);
    } catch {
      if (myId === reqIdRef.current) setResults([]);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (!value || value.trim().length < minChars) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(value.trim());
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, minChars, runSearch]);

  const handleSelect = (r: GeoResult) => {
    skipNextSearchRef.current = true;
    onSelect(r);
    setOpen(false);
    setResults([]);
  };

  const clear = () => {
    onChangeText("");
    setResults([]);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, disabled && { opacity: 0.5 }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Delay close so a tap on the item registers
            setTimeout(() => setOpen(false), 180);
          }}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : value.length > 0 ? (
          <Pressable onPress={clear} hitSlop={12} testID={testID ? `${testID}-clear` : undefined}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {open && (results.length > 0 || (loading && value.length >= minChars)) && (
        <View style={styles.dropdown}>
          {results.length === 0 && loading ? (
            <View style={styles.emptyRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.emptyText}>Recherche...</Text>
            </View>
          ) : (
            (Array.isArray(results) ? results : []).map((r) => (
              <Pressable
                key={r.place_id}
                onPress={() => handleSelect(r)}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.surfaceHigh }]}
                testID={testID ? `${testID}-result-${r.place_id}` : undefined}
              >
                <Ionicons name="location" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.itemPrimary} numberOfLines={1}>
                    {r.primary || r.formatted_address}
                  </Text>
                  <Text style={styles.itemSecondary} numberOfLines={2}>
                    {r.formatted_address}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", zIndex: 1000, ...Platform.select({ web: { zIndex: 1000 } }) },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },
  inputWrapFocused: { borderColor: colors.primary },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: "DMSans-Medium",
    fontSize: 15,
    paddingVertical: 4,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    zIndex: 1000,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 8 },
      web: { boxShadow: "0 12px 32px rgba(0,0,0,0.45)" } as any,
    }),
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPrimary: { color: colors.text, fontFamily: "DMSans-Bold", fontSize: 14 },
  itemSecondary: { color: colors.textSecondary, fontFamily: "DMSans-Regular", fontSize: 12, marginTop: 2 },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md },
  emptyText: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 13 },
  attribution: { padding: 6, alignItems: "center", backgroundColor: colors.surface },
  attributionText: { color: colors.textMuted, fontSize: 10, fontFamily: "DMSans-Regular" },
});
