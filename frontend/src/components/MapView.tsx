import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Asset, Edge, AssetStatus } from '../types';
import { Info } from 'lucide-react';

interface MapViewProps {
  assets: Asset[];
  edges: Edge[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onSimulateFailure: (id: string) => void;
  assetStates?: Record<string, any>;
  className?: string;
  style?: React.CSSProperties;
  wrapperHeight?: string;
  theme?: 'light' | 'dark';
}

export const MapView: React.FC<MapViewProps> = ({
  assets,
  edges,
  selectedAssetId,
  onSelectAsset,
  onSimulateFailure,
  assetStates,
  className,
  style,
  wrapperHeight,
  theme,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const [mapStyle, setMapStyle] = useState<'mono' | 'street'>('mono');

  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark');

  // Function to get current status of asset (from active simulation or default)
  const getAssetStatus = (asset: Asset): AssetStatus => {
    if (assetStates && assetStates[asset.id]) {
      return assetStates[asset.id].status;
    }
    return asset.status;
  };

  const getStatusColor = (status: AssetStatus): string => {
    switch (status) {
      case 'OPERATIONAL': return isDark ? '#ffffff' : '#000000';
      case 'WARNING': return '#ea580c';
      case 'IMPACTED': return '#e11d48';
      case 'CRITICAL': return '#ff0000';
      case 'FAILED': return '#ff0000';
      case 'RECOVERING': return '#2563eb';
      default: return '#71717a';
    }
  };

  const getTypeTag = (type: string): string => {
    switch (type) {
      case 'HOSPITAL': return '[HOSPITAL]';
      case 'POWER': return '[POWER]';
      case 'WATER': return '[WATER]';
      case 'EMERGENCY': return '[EMERGENCY]';
      case 'BRIDGE': return '[BRIDGE]';
      case 'ROAD': return '[ROAD]';
      default: return `[${type}]`;
    }
  };

  const getLayerCode = (type: string): string => {
    switch (type) {
      case 'HOSPITAL': return 'H';
      case 'POWER': return 'P';
      case 'WATER': return 'W';
      case 'EMERGENCY': return 'E';
      case 'BRIDGE': return 'B';
      case 'ROAD': return 'R';
      default: return type.charAt(0) || 'A';
    }
  };

  // 1. Initialize Leaflet Map lifecycle with full cleanup & dimension invalidation
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Destroy any stale instance on re-render
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Map cleanup warning:', e);
      }
      mapInstanceRef.current = null;
    }

    // Compute center coordinates
    const centerLat = assets.length ? assets.reduce((sum, a) => sum + a.latitude, 0) / assets.length : 19.076;
    const centerLng = assets.length ? assets.reduce((sum, a) => sum + a.longitude, 0) / assets.length : 72.877;

    const map = L.map(container, {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true,
      fadeAnimation: true,
    });

    // Use free, public OpenStreetMap tile layer (styled dark via CSS filter)
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '©️ OpenStreetMap',
      subdomains: 'abc',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Multiple staggered invalidations ensure proper rendering regardless of flexbox paint timing
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    // Watch for panel resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapStyle]);

  // 2. Render Markers and Connections
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || assets.length === 0) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    const assetMap = new Map<string, Asset>();
    assets.forEach((a) => assetMap.set(a.id, a));

    // Draw dependency and connection edges
    edges.forEach((edge) => {
      const sourceAsset = assetMap.get(edge.source);
      const targetAsset = assetMap.get(edge.target);

      if (sourceAsset && targetAsset) {
        const sourceStatus = getAssetStatus(sourceAsset);
        const targetStatus = getAssetStatus(targetAsset);

        const isFailed = sourceStatus === 'FAILED' || targetStatus === 'FAILED';
        const isImpacted = sourceStatus === 'CRITICAL' || targetStatus === 'CRITICAL';

        let edgeColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
        let dashArray = undefined;

        if (edge.relationship_type === 'POWER_SUPPLY') {
          edgeColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)';
        } else if (edge.relationship_type === 'EMERGENCY_ACCESS') {
          edgeColor = 'rgba(255, 0, 0, 0.75)';
        } else if (edge.relationship_type === 'WATER_SUPPLY') {
          edgeColor = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.55)';
        }

        if (isFailed) {
          edgeColor = '#ff0000';
          dashArray = '6, 6';
        } else if (isImpacted) {
          edgeColor = '#e11d48';
        }

        const polyline = L.polyline(
          [
            [sourceAsset.latitude, sourceAsset.longitude],
            [targetAsset.latitude, targetAsset.longitude],
          ],
          {
            color: edgeColor,
            weight: isFailed ? 3 : 1.8,
            opacity: isFailed ? 1 : 0.75,
            dashArray,
          }
        ).addTo(map);

        polylinesRef.current.push(polyline);
      }
    });

    // Create custom interactive markers for each asset
    assets.forEach((asset) => {
      const status = getAssetStatus(asset);
      const color = getStatusColor(status);
      const isSelected = asset.id === selectedAssetId;
      const isFailed = status === 'FAILED' || status === 'CRITICAL';
      const bg = isFailed ? '#ff0000' : (isDark ? '#0c0c0e' : '#ffffff');
      const fg = isFailed ? '#ffffff' : (isDark ? '#ffffff' : '#000000');
      const borderColor = isFailed ? (isDark ? '#ffffff' : '#000000') : color;
      const shadow = isSelected ? (isDark ? '3px 3px 0px #ffffff' : '3px 3px 0px #000000') : (isDark ? '2px 2px 0px #ffffff' : '2px 2px 0px rgba(0,0,0,0.8)');

      const iconHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '36px' : '28px'};
          height: ${isSelected ? '36px' : '28px'};
          border-radius: 0px;
          background: ${bg};
          color: ${fg};
          border: 2px solid ${borderColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: JetBrains Mono, monospace;
          font-weight: 900;
          font-size: ${isSelected ? '16px' : '13px'};
          box-shadow: ${shadow};
          cursor: pointer;
          transition: transform 0.15s ease;
          ${isFailed ? 'animation: pulse-square 1.2s infinite;' : ''}
        ">
          ${getLayerCode(asset.type)}
          ${asset.is_spof ? `<div style="position:absolute;top:-4px;right:-4px;width:9px;height:9px;background:#ff0000;border:1.5px solid ${isDark ? '#ffffff' : '#000000'};" title="Single Point of Failure"></div>` : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: iconHtml,
        iconSize: isSelected ? [36, 36] : [28, 28],
        iconAnchor: isSelected ? [18, 18] : [14, 14],
      });

      const marker = L.marker([asset.latitude, asset.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          onSelectAsset(asset.id);
        });

      // Rich popup content - Architectural Minimalist
      const simInfo = assetStates && assetStates[asset.id];
      const currentCap = simInfo ? simInfo.operational_capacity.toFixed(0) : asset.operational_capacity.toFixed(0);

      const popupContent = document.createElement('div');
      popupContent.style.cssText = `color:${isDark ? '#ffffff' : '#000000'}; font-family: Inter, sans-serif; min-width: 240px; padding: 8px; background:${isDark ? '#000000' : '#ffffff'};`;
      popupContent.innerHTML = `
        <div style="font-family: Outfit, sans-serif; font-weight: 900; font-size: 16px; margin-bottom: 4px; color: ${isDark ? '#ffffff' : '#000000'}; text-transform: uppercase; letter-spacing: -0.02em;">
          ${getTypeTag(asset.type)} ${asset.name}
        </div>
        <div style="font-size: 11px; color: ${isDark ? '#a1a1aa' : '#71717a'}; margin-bottom: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;">
          ID: ${asset.id} // LAYER: ${asset.type}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid ${isDark ? '#27272a' : '#e4e4e7'}; padding-bottom: 4px;">
          <span style="font-weight: 700; text-transform: uppercase; color: ${isDark ? '#ffffff' : '#000000'};">Status:</span>
          <span style="font-weight: 900; color: ${color}; text-transform: uppercase;">${status}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid ${isDark ? '#27272a' : '#e4e4e7'}; padding-bottom: 4px;">
          <span style="font-weight: 700; text-transform: uppercase; color: ${isDark ? '#ffffff' : '#000000'};">Capacity:</span>
          <strong style="color: ${isDark ? '#ffffff' : '#000000'};">${currentCap}%</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; border-bottom: 1px solid ${isDark ? '#27272a' : '#e4e4e7'}; padding-bottom: 4px;">
          <span style="font-weight: 700; text-transform: uppercase; color: ${isDark ? '#ffffff' : '#000000'};">Criticality:</span>
          <strong style="color: ${isDark ? '#ffffff' : '#000000'};">${asset.criticality.toFixed(1)}/100</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid ${isDark ? '#27272a' : '#e4e4e7'}; padding-bottom: 4px;">
          <span style="font-weight: 700; text-transform: uppercase; color: ${isDark ? '#ffffff' : '#000000'};">Citizens:</span>
          <strong style="color: ${isDark ? '#ffffff' : '#000000'};">${asset.population_served.toLocaleString()}</strong>
        </div>
        ${asset.is_spof ? '<div style="background:#000000; color:#ff0000; border: 1.5px solid #ff0000; font-size:11px; padding:5px 7px; font-weight:900; margin-bottom:8px; text-align:center; text-transform:uppercase; letter-spacing:0.06em;">CRITICAL: SINGLE POINT OF FAILURE (SPOF)</div>' : ''}
        ${simInfo && simInfo.failure_reason ? `<div style="background:${isDark ? '#1c1917' : '#fffbeb'}; border:1px solid #f59e0b; color:#f59e0b; font-size:11px; padding:5px 7px; margin-bottom:8px;"><strong>Reason:</strong> ${simInfo.failure_reason}</div>` : ''}
        <button id="btn-popup-fail-${asset.id}" style="
          width: 100%;
          background: #ff0000;
          color: white;
          border: 1.5px solid ${isDark ? '#ffffff' : '#000000'};
          padding: 8px 12px;
          border-radius: 0;
          cursor: pointer;
          font-weight: 800;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          box-shadow: 2px 2px 0px ${isDark ? '#ffffff' : '#000000'};
        ">
          SIMULATE FAILURE
        </button>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-popup-fail-${asset.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onSimulateFailure(asset.id);
            map.closePopup();
          };
        }
      });

      markersRef.current[asset.id] = marker;
    });
  }, [assets, edges, selectedAssetId, assetStates, isDark]);

  // Pan to selected asset when selected in another view
  useEffect(() => {
    if (selectedAssetId && markersRef.current[selectedAssetId] && mapInstanceRef.current) {
      const marker = markersRef.current[selectedAssetId];
      mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
      marker.openPopup();
    }
  }, [selectedAssetId]);

  // Fit bounds when assets are first loaded into the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || assets.length === 0) return;
    if (!selectedAssetId) {
      try {
        const bounds = L.latLngBounds(assets.map((a) => [a.latitude, a.longitude]));
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
      } catch (e) {
        console.warn('Map fitBounds warning:', e);
      }
    }
  }, [assets.length]);

  return (
    <div
      className={`glass-panel map-card-container ${className || ''}`}
      style={{
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...style,
      }}
    >
      <div
        className="panel-header map-panel-header"
        style={{
          marginBottom: '0.75rem',
          paddingBottom: '0.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.65rem',
        }}
      >
        <div
          className="panel-title"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.2rem',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span>CITY INFRASTRUCTURE MAP</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {assets.length} Monitored Assets • {edges.length} Dependencies
          </span>
        </div>

        {/* Map Controls */}
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          {/* Basemap Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-card)',
              padding: '2px',
              border: '1.5px solid var(--border-bold)',
              flexShrink: 0,
            }}
          >
            <button
              className={`btn-style-pill ${mapStyle === 'mono' ? 'active' : ''}`}
              onClick={() => setMapStyle('mono')}
              title="Architectural Monochrome Basemap"
            >
              Architectural
            </button>
            <button
              className={`btn-style-pill ${mapStyle === 'street' ? 'active' : ''}`}
              onClick={() => setMapStyle('street')}
              title="Standard Street Basemap"
            >
              Standard
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-operational">Operational</span>
            <span className="badge badge-warning">Warning</span>
            <span className="badge badge-critical">Critical</span>
            <span className="badge badge-failed">Failed</span>
          </div>
        </div>
      </div>

      {/* Synthetic Data Disclaimer Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.45rem 0.85rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-bold)',
          fontSize: '0.74rem',
          color: 'var(--text-primary)',
          marginBottom: '0.75rem',
          flexShrink: 0,
        }}
      >
        <Info size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>SYNTHETIC URBAN MODEL:</strong> Architectural basemap used for visualization only. All asset coordinates, dependency graph topologies, and capacities are deterministic models.
        </span>
      </div>

      <div
        className={`map-wrapper ${mapStyle === 'street' ? 'leaflet-light-mode' : ''}`}
        style={wrapperHeight ? { height: wrapperHeight, minHeight: wrapperHeight } : undefined}
        ref={mapContainerRef}
      />
    </div>
  );
};
