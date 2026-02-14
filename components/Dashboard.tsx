
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PlantAnalysis } from '../types';

interface DashboardProps {
  history: PlantAnalysis[];
}

const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const totalAnalyzed = history.length;
  const invasiveCount = history.filter(p => p.isInvasive).length;
  // avgConfidence is in decimal (0-1), multiplied by 100 for percentage
  const avgConfidence = history.length ? (history.reduce((sum, p) => sum + p.confidence, 0) / history.length) * 100 : 0;
  // avgTime is already stored in seconds in PlantAnalysis
  const avgTime = history.length ? history.reduce((sum, p) => sum + p.analysisTime, 0) / history.length : 0;

  const plantCounts = history.reduce((acc, curr) => {
    acc[curr.name] = (acc[curr.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(plantCounts)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Analyzed', value: totalAnalyzed, icon: 'fa-seedling', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Invasive Detected', value: invasiveCount, icon: 'fa-exclamation-triangle', color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Avg Confidence', value: `${avgConfidence.toFixed(1)}%`, icon: 'fa-check-double', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Time', value: `${avgTime.toFixed(2)}s`, icon: 'fa-bolt', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center text-xl`}>
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Frequency Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-6 text-slate-800">Top Identified Species</h2>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data available for visualization.
              </div>
            )}
          </div>
        </div>

        {/* Mock Heatmap */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">Geographic Heatmap</h2>
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded">Google Maps Layer</span>
          </div>
          <div className="relative h-[300px] rounded-lg overflow-hidden bg-slate-200">
            <img 
              src="https://picsum.photos/seed/map/800/400" 
              className="w-full h-full object-cover opacity-60 grayscale" 
              alt="Map Background" 
            />
            {history.filter(p => p.coordinates).map((point, i) => {
              const x = ((point.coordinates!.lng + 180) % 360) / 3.6;
              const y = ((90 - point.coordinates!.lat) % 180) / 1.8;
              return (
                <div 
                  key={point.id} 
                  className={`absolute w-3 h-3 rounded-full blur-[1px] transform -translate-x-1/2 -translate-y-1/2 ${point.isInvasive ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-emerald-500 shadow-[0_0_10px_emerald]'}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={`${point.name} @ ${point.coordinates?.lat.toFixed(4)}, ${point.coordinates?.lng.toFixed(4)}`}
                />
              );
            })}
            <div className="absolute inset-0 flex items-center justify-center bg-white/10 pointer-events-none">
              {history.length === 0 && <span className="text-slate-600 font-medium">Analyze plants to see coordinates on map</span>}
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Heatmap shows intensity of plant discoveries based on captured coordinates. Red indicators highlight invasive clusters.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
