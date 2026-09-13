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
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  networkData,
  selectedAssetId,
  onSelectAsset,
  onSimulateFailure,
  assetStates,
}) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstanceRef = useRef<Core | null>(null);
  const [layoutName, setLayoutName] = useState<string>('cose');
  const [filterType, setFilterType] = useState<string>('ALL');

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
          let edgeColor = '#334155';
          if (edgeRelType === 'POWER_SUPPLY') edgeColor = '#a855f7';
          else if (edgeRelType === 'EMERGENCY_ACCESS') edgeColor = '#ef4444';
          else if (edgeRelType === 'WATER_SUPPLY') edgeColor = '#06b6d4';
          else if (edgeRelType === 'TRANSPORT') edgeColor = '#38bdf8';

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
            color: '#cbd5e1',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            width: 34,
            height: 34,
            'border-width': (ele) => (ele.data('is_spof') ? 3 : 1.5),
            'border-color': (ele) => (ele.data('is_spof') ? '#ef4444' : '#0f172a'),
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 0.3,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3.5,
            'border-color': '#38bdf8',
            width: 44,
            height: 44,
            color: '#38bdf8',
            'font-weight': 'bold',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.8,
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.65,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            width: 3.5,
            opacity: 1,
            'z-index': 99,
          },
        },
        {
          selector: '.dimmed',
          style: {
            opacity: 0.15,
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
  }, [networkData, layoutName, filterType, assetStates]);

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
          <span>🕸️ Multi-Layer Network Graph Topology</span>
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
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.75rem',
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
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.75rem',
            }}
          >
            <option value="cose">Force-Directed (Cose)</option>
            <option value="concentric">Concentric</option>
            <option value="breadthfirst">Hierarchical (Tree)</option>
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
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-glow)',
              borderRadius: '10px',
              padding: '1rem',
              boxShadow: 'var(--shadow-glow-cyan)',
              zIndex: 100,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{selectedNode.name}</h4>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {selectedNode.id} • {selectedNode.type}
                </div>
              </div>
              <span
                className="badge"
                style={{
                  background: `${getStatusColor(selectedSimState?.status || selectedNode.status)}22`,
                  color: getStatusColor(selectedSimState?.status || selectedNode.status),
                  border: `1px solid ${getStatusColor(selectedSimState?.status || selectedNode.status)}`,
                }}
              >
                {selectedSimState?.status || selectedNode.status}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Capacity:</span>
                <span className="mono font-semibold">
                  {(selectedSimState ? selectedSimState.operational_capacity : selectedNode.operational_capacity).toFixed(0)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Criticality Score:</span>
                <span className="mono font-semibold" style={{ color: '#fbbf24' }}>
                  {selectedNode.criticality.toFixed(1)}/100
                </span>
              </div>
              {selectedNode.is_spof && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ShieldAlert size={14} /> Single Point of Failure (SPOF)
                </div>
              )}
              {selectedSimState?.failure_reason && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', color: '#fca5a5' }}>
                  <strong>Failure Reason:</strong> {selectedSimState.failure_reason}
                </div>
              )}
            </div>

            <button
              className="btn btn-danger btn-sm"
              style={{ width: '100%' }}
              onClick={() => onSimulateFailure(selectedNode.id)}
            >
              Simulate Failure
            </button>
          </div>
        )}
      </div>

      {/* Network Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(2, 6, 23, 0.5)', borderRadius: '8px', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Edge Relationships:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 14, height: 3, background: '#38bdf8' }} /> Transport Road
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 14, height: 3, background: '#a855f7' }} /> Power Grid
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 14, height: 3, background: '#ef4444' }} /> Emergency Route
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: 14, height: 3, background: '#06b6d4' }} /> Water Pipeline
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
          <span style={{ width: 8, height: 8, border: '2px solid #ef4444', borderRadius: '50%' }} /> SPOF Red Border
        </span>
      </div>
    </div>
  );
};
