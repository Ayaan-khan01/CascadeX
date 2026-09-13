import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Asset, Edge, AssetStatus } from '../types';
import { Info, Layers } from 'lucide-react';

interface MapViewProps {
  assets: Asset[];
  edges: Edge[];
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onSimulateFailure: (id: string) => void;
  assetStates?: Record<string, any>;
}

export const MapView: React.FC<MapViewProps> = ({
  assets,
  edges,
  selectedAssetId,
  onSelectAsset,
  onSimulateFailure,
  assetStates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const [mapStyle, setMapStyle] = useState<'dark' | 'street'>('dark');

  // Function to get current status of asset (from active simulation or default)
  const getAssetStatus = (asset: Asset): AssetStatus => {
    if (assetStates && assetStates[asset.id]) {
      return assetStates[asset.id].status;
    }
    return asset.status;
  };

  const getStatusColor = (status: AssetStatus): string => {
    switch (status) {
      case 'OPERATIONAL': return '#10b981';
      case 'WARNING': return '#f59e0b';
      case 'IMPACTED': return '#f97316';
      case 'CRITICAL': return '#ef4444';
      case 'FAILED': return '#dc2626';
      case 'RECOVERING': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getTypeIconSymbol = (type: string): string => {
    switch (type) {
      case 'HOSPITAL': return '🏥';
      case 'POWER': return '⚡';
      case 'WATER': return '💧';
      case 'EMERGENCY': return '🚑';
      case 'BRIDGE': return '🌉';
      case 'ROAD': return '🛣️';
      default: return '📍';
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

        let edgeColor = 'rgba(56, 189, 248, 0.4)'; // cyan transport
        let dashArray = undefined;

        if (edge.relationship_type === 'POWER_SUPPLY') {
          edgeColor = 'rgba(168, 85, 247, 0.55)';
        } else if (edge.relationship_type === 'EMERGENCY_ACCESS') {
          edgeColor = 'rgba(239, 68, 68, 0.55)';
        } else if (edge.relationship_type === 'WATER_SUPPLY') {
          edgeColor = 'rgba(6, 182, 212, 0.55)';
        }

        if (isFailed) {
          edgeColor = 'rgba(220, 38, 38, 0.85)';
          dashArray = '5, 8';
        } else if (isImpacted) {
          edgeColor = 'rgba(249, 115, 22, 0.75)';
        }

        const polyline = L.polyline(
          [
            [sourceAsset.latitude, sourceAsset.longitude],
            [targetAsset.latitude, targetAsset.longitude],
          ],
          {
            color: edgeColor,
            weight: isFailed ? 2.5 : 1.8,
            opacity: 0.85,
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

      const iconHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '38px' : '30px'};
          height: ${isSelected ? '38px' : '30px'};
          border-radius: 50%;
          background: #0f172a;
          border: 2.5px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isSelected ? '16px' : '13px'};
          box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color};
          cursor: pointer;
          transition: transform 0.2s ease;
          ${isFailed ? 'animation: pulse-ring 1.5s infinite;' : ''}
        ">
          ${getTypeIconSymbol(asset.type)}
          ${asset.is_spof ? '<div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:1.5px solid #fff;" title="Single Point of Failure"></div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: iconHtml,
        iconSize: isSelected ? [38, 38] : [30, 30],
        iconAnchor: isSelected ? [19, 19] : [15, 15],
      });

      const marker = L.marker([asset.latitude, asset.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          onSelectAsset(asset.id);
        });

      // Rich popup content
      const simInfo = assetStates && assetStates[asset.id];
      const currentCap = simInfo ? simInfo.operational_capacity.toFixed(0) : asset.operational_capacity.toFixed(0);

      const popupContent = document.createElement('div');
      popupContent.style.cssText = 'color:#0f172a; font-family: Inter, sans-serif; min-width: 220px; padding: 4px;';
      popupContent.innerHTML = `
        <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #0284c7;">
          ${getTypeIconSymbol(asset.type)} ${asset.name}
        </div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          ID: ${asset.id} | Layer: ${asset.type}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>Status:</span>
          <span style="font-weight: 700; color: ${color};">${status}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>Operational Capacity:</span>
          <strong>${currentCap}%</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span>Criticality Index:</span>
          <strong>${asset.criticality.toFixed(1)}/100</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
          <span>Citizens Dependent:</span>
          <strong>${asset.population_served.toLocaleString()}</strong>
        </div>
        ${asset.is_spof ? '<div style="background:#fee2e2; color:#b91c1c; font-size:11px; padding:4px 6px; border-radius:4px; font-weight:700; margin-bottom:8px; text-align:center;">⚠️ Single Point of Failure (SPOF)</div>' : ''}
        ${simInfo && simInfo.failure_reason ? `<div style="background:#fef3c7; color:#92400e; font-size:11px; padding:4px 6px; border-radius:4px; margin-bottom:8px;"><strong>Reason:</strong> ${simInfo.failure_reason}</div>` : ''}
        <button id="btn-popup-fail-${asset.id}" style="
          width: 100%;
          background: #dc2626;
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        ">
          💥 Simulate Failure
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
  }, [assets, edges, selectedAssetId, assetStates]);

  // Pan to selected asset when selected in another view
  useEffect(() => {
    if (selectedAssetId && markersRef.current[selectedAssetId] && mapInstanceRef.current) {
      const marker = markersRef.current[selectedAssetId];
      mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
      marker.openPopup();
    }
  }, [selectedAssetId]);

  return (
    <div className="glass-panel" style={{ padding: '0.85rem' }}>
      <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
        <div className="panel-title">
          <span>🗺️ Synthetic City Infrastructure Map</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {assets.length} Monitored Assets • {edges.length} Dependencies
          </span>
        </div>

        {/* Map Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Basemap Switcher */}
          <div style={{ display: 'flex', background: 'rgba(2, 6, 23, 0.6)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn-style-pill ${mapStyle === 'dark' ? 'active' : ''}`}
              onClick={() => setMapStyle('dark')}
              title="Dark Mode Basemap"
            >
              Dark Grid
            </button>
            <button
              className={`btn-style-pill ${mapStyle === 'street' ? 'active' : ''}`}
              onClick={() => setMapStyle('street')}
              title="Standard Street Basemap"
            >
              Street Map
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
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
          gap: '0.45rem',
          padding: '0.35rem 0.65rem',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '6px',
          fontSize: '0.72rem',
          color: '#93c5fd',
          marginBottom: '0.65rem',
        }}
      >
        <Info size={13} />
        <span>
          <strong>Simulated Infrastructure Model:</strong> Geographic basemap used for visualization only. All asset coordinates, dependencies, and capacities are synthetic.
        </span>
      </div>

      <div className={`map-wrapper ${mapStyle === 'street' ? 'leaflet-light-mode' : ''}`} ref={mapContainerRef} />
    </div>
  );
};
