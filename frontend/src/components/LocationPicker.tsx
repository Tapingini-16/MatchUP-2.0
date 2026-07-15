// LocationPicker — reusable geocode-autocomplete + Leaflet map picker.
// 100% free & open-source (OpenStreetMap Nominatim + Leaflet).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import LeafletMap, { type LeafletMapHandle } from "@/src/components/LeafletMap";
import AddressAutocomplete from "@/src/components/AddressAutocomplete";
import { reverseGeocode, type GeoResult, type PickedLocation } from "@/src/services/geocoding";
import { colors, radius, spacing } from "@/src/theme";

type Props = {
  label?: string;
  hint?: string;
  value?: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  placeholder?: string;
  mapHeight?: number;
  testIDPrefix?: string;
  defaultCenter?: { latitude: number; longitude: number };
  required?: boolean;
};

const DEFAULT_CENTER = { latitude: 48.8566, longitude: 2.3522 }; // Paris

export default function LocationPicker({
  label,
  hint,
  value,
  onChange,
  placeholder = "Rechercher une adresse (ex: Parc des Princes)",
  mapHeight = 240,
  testIDPrefix = "location-picker",
  defaultCenter,
  required,
}: Props) {
  const [query, setQuery] = useState<string>(value?.formatted_address ?? "");
  const [busy, setBusy] = useState(false);
  const mapRef = useRef<LeafletMapHandle>(null);

  // Sync when parent updates value
  useEffect(() => {
    setQuery(value?.formatted_address ?? "");
  }, [value?.formatted_address]);

  const center = value
    ? { latitude: value.latitude, longitude: value.longitude }
    : defaultCenter || DEFAULT_CENTER;

  const handleAutocompleteSelect = (r: GeoResult) => {
    const picked: PickedLocation = {
      formatted_address: r.formatted_address,
      latitude: r.latitude,
      longitude: r.longitude,
      city: r.city,
      country: r.country,
    };
    onChange(picked);
    setQuery(r.formatted_address);
    mapRef.current?.setCenter(r.latitude, r.longitude, 15);
  };

  const handleMapMove = useCallback(
    async (lat: number, lng: number) => {
      // Optimistic update with coords; then reverse-geocode for a nice address
      const nextLat = Math.round(lat * 1e6) / 1e6;
      const nextLng = Math.round(lng * 1e6) / 1e6;
      onChange({
        formatted_address: value?.formatted_address || `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`,
        latitude: nextLat,
        longitude: nextLng,
        city: value?.city,
        country: value?.country,
      });
      setBusy(true);
      try {
        const rev = await reverseGeocode(nextLat, nextLng);
        if (rev) {
          onChange({
            formatted_address: rev.formatted_address,
            latitude: nextLat,
            longitude: nextLng,
            city: rev.city,
            country: rev.country,
          });
          setQuery(rev.formatted_address);
        }
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value?.formatted_address, value?.city, value?.country],
  );

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refus\u00e9e", "Active la localisation dans les r\u00e9glages pour utiliser ta position actuelle.");
        return;
      }
      setBusy(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      mapRef.current?.setCenter(lat, lng, 15);
      await handleMapMove(lat, lng);
    } catch (e) {
      console.log("getCurrentPosition failed", e);
    } finally {
      setBusy(false);
    }
  };

  const clearSelection = () => {
    onChange(null);
    setQuery("");
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? " *" : ""}
          </Text>
          {value && (
            <Pressable onPress={clearSelection} hitSlop={8} testID={`${testIDPrefix}-clear`}>
              <Text style={styles.clearText}>Effacer</Text>
            </Pressable>
          )}
        </View>
      )}

      <AddressAutocomplete
        value={query}
        onChangeText={setQuery}
        onSelect={handleAutocompleteSelect}
        placeholder={placeholder}
        testID={`${testIDPrefix}-search`}
      />

      <View style={styles.mapWrap}>
        <LeafletMap
          ref={mapRef}
          latitude={center.latitude}
          longitude={center.longitude}
          zoom={value ? 15 : 12}
          interactive
          draggableMarker
          showSelectedMarker
          height={mapHeight}
          onLocationChange={handleMapMove}
        />
        {busy && (
          <View style={styles.busyBadge} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.busyText}>Recherche adresse…</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={useCurrentLocation}
          style={styles.locBtn}
          testID={`${testIDPrefix}-current`}
          disabled={Platform.OS === "web" && !navigator?.geolocation}
        >
          <Ionicons name="locate" size={16} color={colors.primary} />
          <Text style={styles.locBtnText}>Utiliser ma position</Text>
        </Pressable>
        {value && (
          <View style={styles.coordChip}>
            <Ionicons name="navigate" size={12} color={colors.textSecondary} />
            <Text style={styles.coordText}>
              {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      {hint && !value && <Text style={styles.hint}>{hint}</Text>}
      {value && (
        <View style={styles.selectedBox}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={styles.selectedText} numberOfLines={2}>
            {value.formatted_address}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: {
    fontFamily: "DMSans-Bold",
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  clearText: { fontFamily: "DMSans-Medium", color: colors.primary, fontSize: 12 },
  mapWrap: { position: "relative" },
  busyBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(9,10,12,0.85)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  busyText: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 11 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  locBtnText: { color: colors.primary, fontFamily: "DMSans-Bold", fontSize: 12 },
  coordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coordText: { color: colors.textSecondary, fontFamily: "DMSans-Medium", fontSize: 11 },
  hint: { color: colors.textMuted, fontFamily: "DMSans-Regular", fontSize: 12 },
  selectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  selectedText: { flex: 1, color: colors.text, fontFamily: "DMSans-Medium", fontSize: 13 },
});
