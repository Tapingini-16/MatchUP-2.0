// Web stub for the native map — never renders (web falls back to the stylized mock).
import React from "react";

export type MapGroup = {
  id: string;
  name: string;
  field_lat: number;
  field_lng: number;
  distance_km?: number;
  members_count?: number;
  max_members?: number;
};

type Props = { region: any; groups: MapGroup[]; onSelect: (id: string) => void };

export default function NativeMap(_: Props) {
  return null;
}
