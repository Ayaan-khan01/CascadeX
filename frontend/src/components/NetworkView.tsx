import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { NetworkData, AssetStatus } from '../types';
import { ZoomIn, ZoomOut, Maximize2, ShieldAlert } from 'lucide-react';

interface NetworkViewProps {
  networkData: NetworkData | null;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onSimulateFailure: (id: string) => void;
  assetStates?: Record<string, any>;
  theme?: 'light' | 'dark';
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  networkData,
  selectedAssetId,
  onSelectAsset,
  onSimulateFailure,
  assetStates,
  theme = 'light',
}) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstanceRef = useRef<Core | null>(null);
  const [layoutName, setLayoutName] = useState<string>('cose');
  const [filterType, setFilterType] = useState<string>('ALL');

  const isDark = theme === 'dark';

  const getStatusColor = (status: AssetStatus): string => {
    switch (status) {
      case 'OPERATIONAL': return isDark ? '#ffffff' : '#000000';
      case 'WARNING': return '#ea580c';
      case 'IMPACTED': return '#e11d48';
      case 'CRITICAL': return '#ff0000';
      case 'FAILED': return '#ff0000';
      case 'RECOVERING': return '#2563eb';
      default: return isDark ? '#a1a1aa' : '#71717a';
    }
  };

  const getNodeShape = (type: string): cytoscape.Css.NodeShape => {
    switch (type) {
      case 'POWER': return 'hexagon';
      case 'HOSPITAL': return 'round-rectangle';
      case 'EMERGENCY': return 'diamond';
      case 'WATER': return 'barrel';
      case 'BRIDGE': return 'triangle';
      case 'ROAD': return 'ellipse';
      default: return 'ellipse';
    }
  };

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!cyRef.current || !networkData) return;

    const filteredNodes = networkData.nodes.filter(
      (n) => filterType === 'ALL' || n.type === filterType
    );
    const nodeSet = new Set(filteredNodes.map((n) => n.id));

    const elements: cytoscape.ElementDefinition[] = [
      ...filteredNodes.map((n) => {
        const simState = assetStates && assetStates[n.id];
        const currentStatus = simState ? simState.status : n.status;
        const color = getStatusColor(currentStatus);
        const shape = getNodeShape(n.type);

        return {
          group: 'nodes' as const,
          data: {
            id: n.id,
            name: n.name,
            type: n.type,
            status: currentStatus,
            color,
            shape,
            is_spof: n.is_spof,
            criticality: n.criticality,
            capacity: n.capacity,
          },
        };
      }),
      ...networkData.edges
        .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
        .map((e, index) => {
          const edgeRelType = e.type || (e as any).relationship_type;
          let edgeColor = '#52525b';
          if (edgeRelType === 'POWER_SUPPLY') edgeColor = '#000000';
          else if (edgeRelType === 'EMERGENCY_ACCESS') edgeColor = '#ff0000';
          else if (edgeRelType === 'WATER_SUPPLY') edgeColor = '#2563eb';
          else if (edgeRelType === 'TRANSPORT') edgeColor = '#18181b';

          return {
            group: 'edges' as const,
            data: {
              id: `e-${index}-${e.source}-${e.target}`,
              source: e.source,
              target: e.target,
              type: edgeRelType,
              color: edgeColor,
            },
          };
        }),
    ];

    if (cyInstanceRef.current) {
      cyInstanceRef.current.destroy();
    }

    const cy = cytoscape({
      container: cyRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            shape: 'data(shape)' as any,
            label: 'data(name)',
            'font-family': 'Inter, sans-serif',
            'font-size': '10px',
            'font-weight': 'bold',
            color: isDark ? '#ffffff' : '#000000',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            width: 32,
            height: 32,
            'border-width': (ele) => (ele.data('is_spof') ? 3 : 1.5),
            'border-color': (ele) => (ele.data('is_spof') ? '#ff0000' : (isDark ? '#ffffff' : '#000000')),
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.2,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': isDark ? '#ffffff' : '#000000',
            width: 42,
            height: 42,
            color: isDark ? '#ffffff' : '#000000',
            'font-weight': 'bold',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.6,
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.7,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': isDark ? '#ffffff' : '#000000',
            'target-arrow-color': isDark ? '#ffffff' : '#000000',
            width: 3.5,
            opacity: 1,
            'z-index': 99,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.12,
          },
        },
      ],
      layout: {
        name: layoutName as any,
        animate: false,
        padding: 40,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const id = node.id();
      onSelectAsset(id);

      // Highlight neighborhood
      cy.elements().removeClass('highlighted dimmed');
      const neighborhood = node.neighborhood().add(node);
      cy.elements().difference(neighborhood).addClass('dimmed');
      neighborhood.addClass('highlighted');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('highlighted dimmed');
      }
    });

    cyInstanceRef.current = cy;

    return () => {
      if (cyInstanceRef.current) {
        try {
          cyInstanceRef.current.stop();
          cyInstanceRef.current.destroy();
        } catch (e) {}
        cyInstanceRef.current = null;
      }
    };
  }, [networkData, layoutName, filterType, assetStates, isDark]);

  // Select node if selectedAssetId changes
  useEffect(() => {
    if (cyInstanceRef.current && selectedAssetId) {
      const cy = cyInstanceRef.current;
      const node = cy.getElementById(selectedAssetId);
      if (node.length > 0) {
        cy.elements().removeClass('highlighted dimmed');
        node.select();
        const neighborhood = node.neighborhood().add(node);
        cy.elements().difference(neighborhood).addClass('dimmed');
        neighborhood.addClass('highlighted');
      }
    }
  }, [selectedAssetId]);

  const handleZoomIn = () => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyInstanceRef.current?.zoom(cyInstanceRef.current.zoom() * 0.8);
  const handleFit = () => cyInstanceRef.current?.fit();

  const selectedNode = networkData?.nodes.find((n) => n.id === selectedAssetId);
  const selectedSimState = selectedAssetId && assetStates ? assetStates[selectedAssetId] : null;

  return (
    <div className="glass-panel" style={{ padding: '0.85rem' }}>
      <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
        <div className="panel-title">
          <span>MULTI-LAYER NETWORK TOPOLOGY</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Dependency & Service Propagation Graph
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Layer filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#000000',
              border: '1.5px solid #000000',
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            <option value="ALL">All Layers ({networkData?.nodes.length || 0})</option>
            <option value="ROAD">Roads</option>
            <option value="BRIDGE">Bridges</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="POWER">Power Grid</option>
            <option value="WATER">Water Supply</option>
            <option value="EMERGENCY">Emergency Services</option>
          </select>

          {/* Layout selector */}
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            style={{
              background: '#ffffff',
              color: '#000000',
              border: '1.5px solid #000000',
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              fontWeight: 700,
            }}
          >
            <option value="cose">Force-Directed</option>
            <option value="concentric">Concentric</option>
            <option value="breadthfirst">Hierarchical</option>
            <option value="circle">Circular</option>
          </select>

          <button className="btn btn-secondary btn-sm" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleFit} title="Fit Graph">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div id="cy-container" ref={cyRef} />

        {/* Floating Quick Inspector Card */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              right: '1rem',
              width: '320px',
              background: '#ffffff',
              border: '2px solid #000000',
              padding: '1.25rem',
              boxShadow: '4px 4px 0px #000000',
              zIndex: 100,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#000000', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                  {selectedNode.name}
                </h4>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
                  {selectedNode.id} // {selectedNode.type}
                </div>
              </div>
              <span
                className="badge"
                style={{
                  background: getStatusColor(selectedSimState?.status || selectedNode.status) === '#ff0000' ? '#ff0000' : '#000000',
                  color: '#ffffff',
                  border: '1px solid #000000',
                }}
              >
                {selectedSimState?.status || selectedNode.status}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', borderTop: '1px solid #e4e4e7', paddingTop: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem' }}>Capacity:</span>
                <span className="mono" style={{ fontWeight: 800 }}>
                  {(selectedSimState ? selectedSimState.operational_capacity : selectedNode.operational_capacity).toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem' }}>Criticality:</span>
                <span className="mono" style={{ fontWeight: 900, color: '#000000' }}>
                  {selectedNode.criticality.toFixed(1)}/100
                </span>
              </div>
              {selectedNode.is_spof && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ffffff', background: '#000000', border: '1.5px solid #ff0000', padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase' }}>
                  <ShieldAlert size={14} color="#ff0000" /> SPOF: Zero-Redundancy Node
                </div>
              )}
              {selectedSimState?.failure_reason && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '0.4rem 0.6rem', fontSize: '0.72rem', color: '#b45309' }}>
                  <strong>Failure Reason:</strong> {selectedSimState.failure_reason}
                </div>
              )}
            </div>

            <button
              className="btn btn-danger btn-sm"
              style={{ width: '100%', fontWeight: 800 }}
              onClick={() => onSimulateFailure(selectedNode.id)}
            >
              SIMULATE FAILURE
            </button>
          </div>
        )}
      </div>

      {/* Network Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1rem', padding: '0.75rem 1rem', background: '#fafafa', border: '1.5px solid #000000', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
        <span style={{ color: '#000000', fontWeight: 900 }}>Topological Layer:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 14, height: 3, background: '#18181b' }} /> Transport
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 14, height: 3, background: '#000000' }} /> Power Grid
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 14, height: 3, background: '#ff0000' }} /> Emergency Route
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 14, height: 3, background: '#2563eb' }} /> Water Pipeline
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ff0000', fontWeight: 900 }}>
          <span style={{ width: 8, height: 8, border: '2px solid #ff0000' }} /> SPOF Choke Point
        </span>
      </div>
    </div>
  );
};
