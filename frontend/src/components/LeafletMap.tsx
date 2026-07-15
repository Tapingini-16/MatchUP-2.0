// Re-export — Metro will resolve LeafletMap.native.tsx on iOS/Android and
// LeafletMap.web.tsx on Web automatically. This file is only a type surface.
export { default } from "./LeafletMap.native";
export type { LeafletMapHandle, LeafletMarker } from "./LeafletMap.native";
