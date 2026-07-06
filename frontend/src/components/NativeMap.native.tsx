// Native map wrapper — react-native-maps is only bundled for iOS/Android.
import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { colors } from "@/src/theme";

export type MapGroup = {
  id: string;
  name: string;
  field_lat: number;
  field_lng: number;
  distance_km?: number;
  members_count?: number;
  max_members?: number;
};

type Props = {
  region: Region;
  groups: MapGroup[];
  onSelect: (id: string) => void;
};

export default function NativeMap({ region, groups, onSelect }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={false}
      testID="native-map"
    >
      {groups.map((g) => (
        <Marker
          key={g.id}
          coordinate={{ latitude: g.field_lat, longitude: g.field_lng }}
          title={g.name}
          description={`${g.distance_km?.toFixed?.(1) ?? "?"} km · ${g.members_count ?? "?"}/${g.max_members ?? "?"}`}
          onCalloutPress={() => onSelect(g.id)}
          pinColor={colors.primary}
          testID={`map-marker-${g.id}`}
        />
      ))}
    </MapView>
  );
}
