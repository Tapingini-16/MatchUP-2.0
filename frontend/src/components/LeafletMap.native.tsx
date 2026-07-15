// LeafletMap (native) — Leaflet + OSM tiles rendered inside a WebView.
// 100% free & open-source. No API key required.
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
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

function buildHtml(opts: {
  lat: number;
  lng: number;
  zoom: number;
  interactive: boolean;
  draggableMarker: boolean;
  showSelectedMarker: boolean;
  markers: LeafletMarker[];
}) {
  const { lat, lng, zoom, interactive, draggableMarker, showSelectedMarker, markers } = opts;
  const markersJson = JSON.stringify(markers || []).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:#0b0d10;}
  .leaflet-container{background:#0b0d10;}
  .pin-dot{width:22px;height:22px;border-radius:50%;background:#1ED760;border:3px solid #090A0C;box-shadow:0 0 0 4px rgba(30,215,96,0.25);}
  .selected-pin{width:26px;height:26px;border-radius:50%;background:#1ED760;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(30,215,96,0.55),0 0 0 6px rgba(30,215,96,0.18);}
  .leaflet-control-attribution{background:rgba(9,10,12,0.75)!important;color:#9BA4B0!important;font-size:9px!important;}
  .leaflet-control-attribution a{color:#1ED760!important;}
  .leaflet-bar a{background:#1A1D22!important;color:#F5F7FA!important;border-color:#2A2E36!important;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
(function(){
  var post = function(msg){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }catch(e){} };
  var map = L.map('map', { zoomControl: ${interactive ? "true" : "false"}, dragging: ${interactive ? "true" : "false"}, tap: ${interactive}, scrollWheelZoom: ${interactive}, doubleClickZoom: ${interactive}, touchZoom: ${interactive}, boxZoom: false, keyboard: false }).setView([${lat}, ${lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '\u00a9 OpenStreetMap', maxZoom: 19 }).addTo(map);

  var selectedPinIcon = L.divIcon({ className: '', html: '<div class="selected-pin"></div>', iconSize: [26,26], iconAnchor:[13,13] });
  var pinIcon = L.divIcon({ className: '', html: '<div class="pin-dot"></div>', iconSize: [22,22], iconAnchor:[11,11] });

  var selectedMarker = null;
  if (${showSelectedMarker}) {
    selectedMarker = L.marker([${lat}, ${lng}], { icon: selectedPinIcon, draggable: ${draggableMarker} }).addTo(map);
    if (${draggableMarker}) {
      selectedMarker.on('dragend', function(e){
        var ll = e.target.getLatLng();
        post({ type: 'move', lat: ll.lat, lng: ll.lng });
      });
    }
  }

  if (${interactive}) {
    map.on('click', function(e){
      if (selectedMarker) selectedMarker.setLatLng(e.latlng);
      post({ type: 'move', lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }

  var extraLayer = L.layerGroup().addTo(map);
  function renderMarkers(list){
    extraLayer.clearLayers();
    (list||[]).forEach(function(m){
      var mk = L.marker([m.lat, m.lng], { icon: pinIcon }).addTo(extraLayer);
      if (m.title){ mk.bindTooltip(m.title, { direction:'top', offset:[0,-8], className:'leaflet-tooltip' }); }
      mk.on('click', function(){ post({ type:'marker', id: m.id }); });
    });
  }
  renderMarkers(${markersJson});

  window.__setCenter = function(lat, lng, z){ map.setView([lat,lng], z || map.getZoom(), { animate:true }); if (selectedMarker) selectedMarker.setLatLng([lat,lng]); };
  window.__setMarkers = function(list){ renderMarkers(list); };
  post({ type:'ready' });
})();
</script>
</body>
</html>`;
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

  const webRef = useRef<WebView>(null);

  const html = useMemo(
    () =>
      buildHtml({
        lat: latitude,
        lng: longitude,
        zoom,
        interactive,
        draggableMarker,
        showSelectedMarker,
        markers,
      }),
    // Build only once — subsequent updates go via injectJavaScript to avoid remount flicker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useImperativeHandle(ref, () => ({
    setCenter: (lat, lng, z) => {
      webRef.current?.injectJavaScript(
        `window.__setCenter && window.__setCenter(${lat}, ${lng}, ${z ?? "undefined"}); true;`,
      );
    },
    setMarkers: (list) => {
      const safe = JSON.stringify(list || []).replace(/</g, "\\u003c");
      webRef.current?.injectJavaScript(`window.__setMarkers && window.__setMarkers(${safe}); true;`);
    },
  }));

  // Push updates when props change (after initial mount)
  React.useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.__setCenter && window.__setCenter(${latitude}, ${longitude}, ${zoom}); true;`,
    );
  }, [latitude, longitude, zoom]);

  React.useEffect(() => {
    const safe = JSON.stringify(markers || []).replace(/</g, "\\u003c");
    webRef.current?.injectJavaScript(`window.__setMarkers && window.__setMarkers(${safe}); true;`);
  }, [markers]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === "move" && typeof msg.lat === "number" && typeof msg.lng === "number") {
        onLocationChange?.(msg.lat, msg.lng);
      } else if (msg?.type === "marker" && msg.id) {
        onMarkerPress?.(msg.id);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        androidHardwareAccelerationDisabled={Platform.OS === "android" ? false : undefined}
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </View>
  );
});

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
  web: { flex: 1, backgroundColor: "transparent" },
});
