import React from 'react';
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaChartLine, FaChartPie, FaChartBar, FaArrowUp, FaDollarSign, FaPercentage, FaClock, FaFire, FaInfoCircle } from 'react-icons/fa';
import './PortfolioAnalytics.css';

const PortfolioAnalytics = ({ userPositions, pools }) => {
  
  // Color palette for charts
  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
  
  // Calculate total portfolio metrics
  const calculateMetrics = () => {
    const totalDeposited = userPositions.reduce((sum, pos) => sum + (pos.amount || 0), 0);
    const totalCurrentValue = userPositions.reduce((sum, pos) => sum + (pos.currentValue || 0), 0);
    const totalEarned = userPositions.reduce((sum, pos) => sum + (pos.earned || 0), 0);
    const totalROI = totalDeposited > 0 ? ((totalCurrentValue - totalDeposited) / totalDeposited) * 100 : 0;
    const weightedAPY = userPositions.reduce((sum, pos) => {
      const weight = pos.currentValue / totalCurrentValue;
      return sum + (pos.apy * weight);
    }, 0);
    
    return {
      totalDeposited,
      totalCurrentValue,
      totalEarned,
      totalROI,
      weightedAPY: weightedAPY || 0,
      positionCount: userPositions.length
    };
  };

  const metrics = calculateMetrics();

  // Prepare asset allocation data for pie chart
  const assetAllocationData = userPositions.map((pos, index) => ({
    name: `${pos.token} (${pos.chain})`,
    value: pos.currentValue,
    percentage: ((pos.currentValue / metrics.totalCurrentValue) * 100).toFixed(1),
    color: COLORS[index % COLORS.length]
  }));

  // Prepare earnings by asset data for bar chart
  const earningsData = userPositions.map((pos, index) => ({
    name: pos.token,
    earned: pos.earned,
    apy: pos.apy,
    chain: pos.chain,
    color: COLORS[index % COLORS.length]
  })).sort((a, b) => b.earned - a.earned);

  // Prepare APY comparison data
  const apyComparisonData = pools.map((pool, index) => ({
    name: `${pool.token} (${pool.chain})`,
    apy: pool.apy,
    tvl: pool.tvl / 1000000, // Convert to millions
    color: COLORS[index % COLORS.length]
  })).sort((a, b) => b.apy - a.apy).slice(0, 8); // Top 8 pools

  // Chain distribution data
  const chainDistribution = userPositions.reduce((acc, pos) => {
    const existing = acc.find(item => item.name === pos.chain);
    if (existing) {
      existing.value += pos.currentValue;
      existing.count += 1;
    } else {
      acc.push({
        name: pos.chain,
        value: pos.currentValue,
        count: 1
      });
    }
    return acc;
  }, []);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label, valuePrefix = '$', valueSuffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {valuePrefix}{entry.value.toFixed(4)}{valueSuffix}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="pie-label">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  if (userPositions.length === 0) {
    return (
      <div className="analytics-empty">
        <div className="empty-state">
          <FaChartLine className="empty-icon" />
          <h3>No Portfolio Data Yet</h3>
          <p>Make your first deposit to see detailed analytics and insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-analytics">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <FaChartLine className="header-icon" />
          <div>
            <h2 className="analytics-title">Portfolio Analytics</h2>
            <p className="analytics-subtitle">Comprehensive insights into your DeFi investments</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card metric-primary">
          <div className="metric-icon-wrapper">
            <FaDollarSign className="metric-icon" />
          </div>
          <div className="metric-content">
            <p className="metric-label">
              Total Portfolio Value 
              <span className="metric-badge live">● LIVE</span>
            </p>
            <h3 className="metric-value">${metrics.totalCurrentValue.toFixed(2)}</h3>
            <p className="metric-change positive">
              <FaArrowUp className="change-icon" />
              +${metrics.totalEarned.toFixed(2)} earned
            </p>
          </div>
        </div>

        <div className="metric-card metric-success">
          <div className="metric-icon-wrapper">
            <FaFire className="metric-icon" />
          </div>
          <div className="metric-content">
            <p className="metric-label">
              Total Earnings 
              <span className="metric-badge live">● LIVE</span>
            </p>
            <h3 className="metric-value">${metrics.totalEarned.toFixed(4)}</h3>
            <p className="metric-change positive">
              {metrics.totalROI.toFixed(2)}% ROI
            </p>
          </div>
        </div>

        <div className="metric-card metric-info">
          <div className="metric-icon-wrapper">
            <FaPercentage className="metric-icon" />
          </div>
          <div className="metric-content">
            <p className="metric-label">
              Weighted APY 
              <span className="metric-badge live">● LIVE</span>
            </p>
            <h3 className="metric-value">{metrics.weightedAPY.toFixed(2)}%</h3>
            <p className="metric-change">Portfolio average</p>
          </div>
        </div>

        <div className="metric-card metric-purple">
          <div className="metric-icon-wrapper">
            <FaClock className="metric-icon" />
          </div>
          <div className="metric-content">
            <p className="metric-label">
              Active Positions 
              <span className="metric-badge live">● LIVE</span>
            </p>
            <h3 className="metric-value">{metrics.positionCount}</h3>
            <p className="metric-change">{chainDistribution.length} chains</p>
          </div>
        </div>
      </div>

      {/* Asset Allocation Pie Chart - Full Width */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title-wrapper">
            <FaChartPie className="chart-icon" />
            <div>
              <h3 className="chart-title">Asset Allocation <span className="data-badge real">LIVE</span></h3>
              <p className="chart-subtitle-small">Real-time portfolio distribution</p>
            </div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={assetAllocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={85}
                fill="#8884d8"
                dataKey="value"
              >
                {assetAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip valuePrefix="$" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {assetAllocationData.map((item, index) => (
              <div key={index} className="legend-item">
                <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings by Asset Bar Chart - Full Width */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title-wrapper">
            <FaChartBar className="chart-icon" />
            <div>
              <h3 className="chart-title">Earnings by Asset <span className="data-badge real">LIVE</span></h3>
              <p className="chart-subtitle-small">Actual earnings from blockchain</p>
            </div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart 
              data={earningsData} 
              margin={{ top: 5, right: 15, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.5)" 
                style={{ fontSize: '11px' }}
                type="category"
                scale="point"
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '11px' }} />
              <Tooltip content={<CustomTooltip valuePrefix="$" />} />
              <Bar dataKey="earned" name="Earned" radius={[6, 6, 0, 0]} maxBarSize={120}>
                {earningsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* APY Comparison Chart - Compact */}
      <div className="chart-section chart-section-compact">
        <div className="chart-header">
          <div className="chart-title-wrapper">
            <FaChartBar className="chart-icon" />
            <h3 className="chart-title">Available Pools - APY Comparison</h3>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart 
              data={apyComparisonData} 
              margin={{ top: 5, right: 15, left: 5, bottom: 40 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.5)" 
                angle={-45}
                textAnchor="end"
                height={80}
                style={{ fontSize: '10px' }}
                type="category"
                scale="point"
              />
              <YAxis stroke="rgba(255,255,255,0.5)" style={{ fontSize: '11px' }} label={{ value: 'APY %', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip content={<CustomTooltip valuePrefix="" valueSuffix="%" />} />
              <Bar dataKey="apy" name="APY" radius={[6, 6, 0, 0]} maxBarSize={100}>
                {apyComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chain Distribution */}
      {chainDistribution.length > 1 && (
        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-title-wrapper">
              <FaChartPie className="chart-icon" />
              <h3 className="chart-title">Distribution by Chain</h3>
            </div>
          </div>
          <div className="chain-distribution">
            {chainDistribution.map((chain, index) => {
              const percentage = ((chain.value / metrics.totalCurrentValue) * 100).toFixed(1);
              return (
                <div key={index} className="chain-item">
                  <div className="chain-info">
                    <img 
                      src={`/${chain.name === 'Ethereum' ? 'eth' : chain.name === 'Base' ? 'base' : chain.name === 'BNB Chain' ? 'bnb' : 'eth'}.png`}
                      alt={chain.name}
                      className="chain-icon"
                    />
                    <div>
                      <h4 className="chain-name">{chain.name}</h4>
                      <p className="chain-count">{chain.count} position{chain.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="chain-stats">
                    <p className="chain-value">${chain.value.toFixed(2)}</p>
                    <p className="chain-percentage">{percentage}%</p>
                  </div>
                  <div className="chain-progress">
                    <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="insights-section">
        <h3 className="insights-title">
          <FaFire className="insights-icon" />
          Performance Insights
        </h3>
        <div className="insights-grid">
          <div className="insight-card real-data">
            <div className="insight-icon">🎯</div>
            <h4>Best Performer <span className="data-badge real">LIVE</span></h4>
            <p>{earningsData[0]?.name || 'N/A'} with ${earningsData[0]?.earned.toFixed(4) || '0'} earned</p>
          </div>
          <div className="insight-card real-data">
            <div className="insight-icon">⚡</div>
            <h4>Highest APY <span className="data-badge real">LIVE</span></h4>
            <p>{apyComparisonData[0]?.name || 'N/A'} at {apyComparisonData[0]?.apy.toFixed(2) || '0'}%</p>
          </div>
          <div className="insight-card projected-data">
            <div className="insight-icon">💰</div>
            <h4>Daily Earnings <span className="data-badge projected">EST.</span></h4>
            <p>${((metrics.totalCurrentValue * metrics.weightedAPY / 100) / 365).toFixed(4)} per day</p>
          </div>
          <div className="insight-card projected-data">
            <div className="insight-icon">📈</div>
            <h4>Projected Annual <span className="data-badge projected">EST.</span></h4>
            <p>${(metrics.totalCurrentValue * metrics.weightedAPY / 100).toFixed(2)} at current rates</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioAnalytics;

