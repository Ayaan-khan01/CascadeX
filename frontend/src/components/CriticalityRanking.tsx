import React, { useState } from 'react';
import { Asset, AssetType } from '../types';
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowUpDown, Play } from 'lucide-react';

interface CriticalityRankingProps {
  assets: Asset[];
  onSelectAsset: (id: string) => void;
  onSimulateFailure: (id: string) => void;
}

export const CriticalityRanking: React.FC<CriticalityRankingProps> = ({
  assets,
  onSelectAsset,
  onSimulateFailure,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'criticality' | 'population' | 'condition'>('criticality');
  const [spofOnly, setSpofOnly] = useState<boolean>(false);

  const filteredAssets = assets
    .filter((a) => (filterType === 'ALL' || a.type === filterType))
    .filter((a) => (!spofOnly || a.is_spof))
    .sort((a, b) => {
      if (sortBy === 'criticality') return b.criticality - a.criticality;
      if (sortBy === 'population') return b.population_served - a.population_served;
      if (sortBy === 'condition') return a.condition - b.condition; // lowest condition first
      return 0;
    });

  const getRedundancyBadge = (level?: string) => {
    switch (level) {
      case 'HIGH':
        return <span className="badge badge-operational">High</span>;
      case 'MEDIUM':
        return <span className="badge badge-warning">Medium</span>;
      case 'LOW':
        return <span className="badge badge-critical">Low (Vulnerable)</span>;
      default:
        return <span className="badge">Unknown</span>;
    }
  };

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <span>🎯 Infrastructure Criticality & SPOF Vulnerability Matrix</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Multi-dimensional risk scoring combining betweenness centrality, population dependency, topological redundancy, and structural condition.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#fca5a5', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={spofOnly}
              onChange={(e) => setSpofOnly(e.target.checked)}
              style={{ accentColor: '#ef4444' }}
            />
            <span>SPOF Only</span>
          </label>

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
            <option value="ALL">All Categories</option>
            <option value="ROAD">Roads</option>
            <option value="BRIDGE">Bridges</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="POWER">Power Grid</option>
            <option value="WATER">Water Supply</option>
            <option value="EMERGENCY">Emergency Services</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.75rem',
            }}
          >
            <option value="criticality">Sort: Highest Criticality</option>
            <option value="population">Sort: Population Served</option>
            <option value="condition">Sort: Worst Condition</option>
          </select>
        </div>
      </div>

      {/* Criticality Table */}
      <div style={{ maxHeight: '550px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Asset Name</th>
              <th>Type</th>
              <th>Criticality Score</th>
              <th>SPOF Status</th>
              <th>Redundancy</th>
              <th>Physical Condition</th>
              <th>Citizens Served</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset, index) => (
              <tr
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                style={{ cursor: 'pointer' }}
              >
                <td className="mono" style={{ color: index < 3 ? '#ef4444' : 'var(--text-muted)', fontWeight: 700 }}>
                  #{index + 1}
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{asset.name}</div>
                  <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    ID: {asset.id}
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
                    {asset.type}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '45px',
                        height: '6px',
                        background: '#1e293b',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${asset.criticality}%`,
                          height: '100%',
                          background: asset.criticality > 75 ? '#ef4444' : asset.criticality > 50 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                    <span className="mono font-bold" style={{ color: asset.criticality > 75 ? '#f87171' : '#fbbf24' }}>
                      {asset.criticality.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td>
                  {asset.is_spof ? (
                    <span className="badge badge-spof">⚠️ SPOF</span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No</span>
                  )}
                </td>
                <td>{getRedundancyBadge(asset.redundancy)}</td>
                <td>
                  <span
                    className="mono"
                    style={{
                      color: asset.condition < 60 ? '#f87171' : asset.condition < 80 ? '#fbbf24' : '#34d399',
                    }}
                  >
                    {asset.condition.toFixed(0)}%
                  </span>
                </td>
                <td className="mono font-medium">
                  {asset.population_served.toLocaleString()}
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSimulateFailure(asset.id);
                    }}
                  >
                    <Play size={11} /> Test Failure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
