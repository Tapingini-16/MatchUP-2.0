// LeafletMap (web) — direct DOM integration with Leaflet loaded from CDN.
// 100% free & open-source. No API key required.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius } from "@/src/theme";

export type LeafletMarker = {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
};

export type LeafletMapHandle = {
  setCenter: (lat: number, lng: number, zoom?: number) => void;
  setMarkers: (markers: LeafletMarker[]) => void;
};

type Props = {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: LeafletMarker[];
  interactive?: boolean;
  draggableMarker?: boolean;
  showSelectedMarker?: boolean;
  height?: number;
  onLocationChange?: (lat: number, lng: number) => void;
  onMarkerPress?: (id: string) => void;
};

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

let _leafletLoader: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (_leafletLoader) return _leafletLoader;
  _leafletLoader = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[data-leaflet]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    // Inject styles once
    if (!document.querySelector(`style[data-leaflet-custom]`)) {
      const s = document.createElement("style");
      s.setAttribute("data-leaflet-custom", "1");
      s.textContent = `
        .lm-pin-dot{width:22px;height:22px;border-radius:50%;background:#1ED760;border:3px solid #090A0C;box-shadow:0 0 0 4px rgba(30,215,96,0.25);}
        .lm-selected-pin{width:26px;height:26px;border-radius:50%;background:#1ED760;border:3px solid #fff;box-shadow:0 6px 16px rgba(30,215,96,0.55),0 0 0 6px rgba(30,215,96,0.18);}
        .leaflet-container{background:#0b0d10;font-family:inherit;border-radius:20px;}
        .leaflet-control-attribution{background:rgba(9,10,12,0.75)!important;color:#9BA4B0!important;font-size:10px!important;}
        .leaflet-control-attribution a{color:#1ED760!important;}
        .leaflet-bar a{background:#1A1D22!important;color:#F5F7FA!important;border-color:#2A2E36!important;}
      `;
      document.head.appendChild(s);
    }
    // JS
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(w.L);
    script.onerror = () => reject(new Error("leaflet failed to load"));
    document.body.appendChild(script);
  });
  return _leafletLoader;
}

const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(props, ref) {
  const {
    latitude = 48.8566,
    longitude = 2.3522,
    zoom = 13,
    markers = [],
    interactive = true,
    draggableMarker = false,
    showSelectedMarker = true,
    height = 260,
    onLocationChange,
    onMarkerPress,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // Refs for latest callbacks (avoid re-init map on callback change)
  const onLocationChangeRef = useRef(onLocationChange);
  const onMarkerPressRef = useRef(onMarkerPress);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);
  useEffect(() => {
    onMarkerPressRef.current = onMarkerPress;
  }, [onMarkerPress]);

  // Initial mount
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !L || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        boxZoom: false,
        keyboard: false,
      }).setView([latitude, longitude], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "\u00a9 OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const selectedPinIcon = L.divIcon({
        className: "",
        html: '<div class="lm-selected-pin"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const pinIcon = L.divIcon({
        className: "",
        html: '<div class="lm-pin-dot"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      (map as any).__pinIcon = pinIcon;

      if (showSelectedMarker) {
        const sm = L.marker([latitude, longitude], {
          icon: selectedPinIcon,
          draggable: draggableMarker,
        }).addTo(map);
        if (draggableMarker) {
          sm.on("dragend", (e: any) => {
            const ll = e.target.getLatLng();
            onLocationChangeRef.current?.(ll.lat, ll.lng);
          });
        }
        selectedMarkerRef.current = sm;
      }

      if (interactive) {
        map.on("click", (e: any) => {
          if (selectedMarkerRef.current) selectedMarkerRef.current.setLatLng(e.latlng);
          onLocationChangeRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }

      const layer = L.layerGroup().addTo(map);
      markersLayerRef.current = layer;
      renderMarkers(L, layer, markers, pinIcon, (id: string) => onMarkerPressRef.current?.(id));

      mapRef.current = map;
      // Fix rendering when the container mounts inside a hidden/deferred parent
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {
          /* ignore */
        }
      }, 60);
    });
    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove?.();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      selectedMarkerRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([latitude, longitude], zoom, { animate: true });
    if (selectedMarkerRef.current) selectedMarkerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude, zoom]);

  // Sync extra markers list
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    const w = window as any;
    if (!map || !layer || !w.L) return;
    renderMarkers(w.L, layer, markers, (map as any).__pinIcon, (id: string) => onMarkerPressRef.current?.(id));
  }, [markers]);

  useImperativeHandle(ref, () => ({
    setCenter: (lat: number, lng: number, z?: number) => {
      const map = mapRef.current;
      if (!map) return;
      map.setView([lat, lng], z ?? map.getZoom(), { animate: true });
      if (selectedMarkerRef.current) selectedMarkerRef.current.setLatLng([lat, lng]);
    },
    setMarkers: (list: LeafletMarker[]) => {
      const map = mapRef.current;
      const layer = markersLayerRef.current;
      const w = window as any;
      if (!map || !layer || !w.L) return;
      renderMarkers(w.L, layer, list, (map as any).__pinIcon, (id: string) => onMarkerPressRef.current?.(id));
    },
  }));

  return (
    <View style={[styles.wrap, { height }]}>
      {/* @ts-ignore RN Web supports raw divs but we type-cast for TS */}
      <div ref={containerRef as any} style={{ width: "100%", height: "100%", borderRadius: radius.xl } as any} />
    </View>
  );
});

function renderMarkers(L: any, layer: any, list: LeafletMarker[], icon: any, onClick: (id: string) => void) {
  layer.clearLayers();
  (list || []).forEach((m) => {
    const mk = L.marker([m.lat, m.lng], { icon }).addTo(layer);
    if (m.title) mk.bindTooltip(m.title, { direction: "top", offset: [0, -8] });
    mk.on("click", () => onClick(m.id));
  });
}

export default LeafletMap;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
