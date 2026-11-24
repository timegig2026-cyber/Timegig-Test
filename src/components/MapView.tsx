import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoLocationData, MapTileStyle, GigPost, ItemForSale } from '../types';
import { MAP_TILES } from '../utils/geo';

interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  timestamp: number;
}

interface MapViewProps {
  userLocation: GeoLocationData;
  selectedTile?: MapTileStyle;
  flyToTarget?: FlyToTarget | null;
  mapRef: React.MutableRefObject<L.Map | null>;
  onUserInteract?: () => void;
  onMapClick?: () => void;
  gigs?: GigPost[];
  items?: ItemForSale[];
  onSelectGig?: (gig: GigPost) => void;
  onSelectItem?: (item: ItemForSale) => void;
  navigationRouteCoords?: [number, number][] | null;
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  selectedTile = 'satellite',
  flyToTarget,
  mapRef,
  onUserInteract,
  onMapClick,
  gigs = [],
  items = [],
  onSelectGig,
  onSelectItem,
  navigationRouteCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const isProgrammaticMoveRef = useRef(false);
  const onUserInteractRef = useRef(onUserInteract);
  const onMapClickRef = useRef(onMapClick);
  const onSelectGigRef = useRef(onSelectGig);
  const onSelectItemRef = useRef(onSelectItem);
  onUserInteractRef.current = onUserInteract;
  onMapClickRef.current = onMapClick;
  onSelectGigRef.current = onSelectGig;
  onSelectItemRef.current = onSelectItem;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: userLocation.source !== 'preset' ? 16 : 13,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      wheelDebounceTime: 25,
      wheelPxPerZoomLevel: 70,
      doubleClickZoom: true,
      boxZoom: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3000,
      easeLinearity: 0.25,
      preferCanvas: true,
    });

    const config = MAP_TILES[selectedTile];
    const tileLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      maxNativeZoom: config.maxNativeZoom ?? config.maxZoom,
      keepBuffer: 4,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    map.on('dragstart', () => onUserInteractRef.current?.());
    map.on('click', () => onMapClickRef.current?.());
    map.on('zoomstart', () => {
      if (!isProgrammaticMoveRef.current) {
        onUserInteractRef.current?.();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    isProgrammaticMoveRef.current = true;
    if (typeof flyToTarget.zoom === 'number') {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom, {
        duration: 0.75,
        easeLinearity: 0.25,
      });
    } else {
      map.panTo([flyToTarget.lat, flyToTarget.lng], {
        animate: true,
        duration: 0.45,
      });
    }
    const timer = window.setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [flyToTarget]);

  // Update user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const locationIcon = L.divIcon({
      className: 'custom-user-location-marker',
      html: `
        <div style="
          position: relative;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.3);
            animation: pulse 2s infinite;
          "></div>
          <div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #2563eb;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.5);
          "></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: locationIcon,
      }).addTo(map);
    }
  }, [userLocation.lat, userLocation.lng]);

  // Update Gigs and Items markers on map with gorgeous attractive styling
  useEffect(() => {
    const group = markersLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // Add Gig markers shaped into realistic money banknotes
    gigs.forEach((gig) => {
      const gigIcon = L.divIcon({
        className: 'custom-gig-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55));
            transform-origin: bottom center;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          ">
            <!-- Banknote / Money Bill -->
            <div style="
              position: relative;
              width: 88px;
              height: 44px;
              background: linear-gradient(135deg, #134e4a 0%, #15803d 45%, #166534 80%, #0f3d23 100%);
              border: 2px solid #86efac;
              border-radius: 6px;
              box-shadow: inset 0 0 0 1.5px #064e3b, 0 3px 0 #0d3820, 0 4px 1px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 2px 6px;
              color: #f0fdf4;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              box-sizing: border-box;
            ">
              <!-- Corner currency marks -->
              <span style="font-size: 8px; font-weight: 900; color: #bbf7d0; position: absolute; top: 2px; left: 4px; line-height: 1;">$</span>
              <span style="font-size: 8px; font-weight: 900; color: #bbf7d0; position: absolute; top: 2px; right: 4px; line-height: 1;">$</span>
              <span style="font-size: 8px; font-weight: 900; color: #bbf7d0; position: absolute; bottom: 2px; left: 4px; line-height: 1;">$</span>
              <span style="font-size: 8px; font-weight: 900; color: #bbf7d0; position: absolute; bottom: 2px; right: 4px; line-height: 1;">$</span>

              <!-- Left decorative bill medallion -->
              <div style="
                width: 22px;
                height: 22px;
                border-radius: 50%;
                border: 1.5px dashed #86efac;
                background: radial-gradient(circle, rgba(6,78,59,0.8) 0%, rgba(2,44,34,0.95) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                flex-shrink: 0;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
              ">
                💵
              </div>

              <!-- Center Money Amount / Title -->
              <div style="
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                overflow: hidden;
              ">
                <span style="
                  font-size: 7px;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.6px;
                  color: #a7f3d0;
                  line-height: 1;
                  margin-bottom: 2px;
                ">GIG PAY</span>
                <span style="
                  font-size: 13px;
                  font-weight: 900;
                  color: #ffffff;
                  text-shadow: 0 1px 3px rgba(0,0,0,0.85);
                  letter-spacing: -0.3px;
                  line-height: 1;
                  white-space: nowrap;
                ">${gig.budget}</span>
              </div>
            </div>

            <!-- Money Pointer Arrow -->
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid #134e4a;
              margin-top: -1px;
              filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
            "></div>
          </div>
        `,
        iconSize: [88, 50],
        iconAnchor: [44, 50],
      });

      const marker = L.marker([gig.lat, gig.lng], { icon: gigIcon });
      marker.on('click', () => {
        onSelectGigRef.current?.(gig);
      });
      group.addLayer(marker);
    });

    // Add Item markers (attractive emerald gradient badge)
    items.forEach((item) => {
      const itemIcon = L.divIcon({
        className: 'custom-item-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff;
            font-weight: 900;
            font-size: 11px;
            padding: 6px 10px;
            border-radius: 24px;
            border: 2.5px solid #ffffff;
            box-shadow: 0 6px 16px rgba(5, 150, 105, 0.45);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            cursor: pointer;
          ">
            <span>🏷️</span>
            <span>${item.price}</span>
          </div>
        `,
        iconSize: [75, 32],
        iconAnchor: [37, 16],
      });

      const marker = L.marker([item.lat, item.lng], { icon: itemIcon });
      marker.on('click', () => {
        onSelectItemRef.current?.(item);
      });
      group.addLayer(marker);
    });
  }, [gigs, items]);

  // Render navigation route line if active
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (navigationRouteCoords && navigationRouteCoords.length > 0) {
      const polyline = L.polyline(navigationRouteCoords, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      routePolylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [60, 60], maxZoom: 16 });
    }
  }, [navigationRouteCoords]);

  return (
    <div className="h-full w-full relative z-0">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};
