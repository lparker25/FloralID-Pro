
import React, { useState } from 'react';
import { PlantAnalysis } from '../types';

interface HistoryProps {
  history: PlantAnalysis[];
  onClear: () => void;
  onUpdateHistory: (history: PlantAnalysis[]) => void;
}

const History: React.FC<HistoryProps> = ({ history, onClear, onUpdateHistory }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the entire identification log? This will reset all dashboard statistics and cannot be undone.")) {
      onClear();
      setSelectedIds(new Set());
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const applyBulkAction = (action: 'favorite' | 'incorrect' | 'delete') => {
    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected entries?`)) return;
      const newHistory = history.filter(item => !selectedIds.has(item.id));
      onUpdateHistory(newHistory);
      setSelectedIds(new Set());
      return;
    }

    const newHistory = history.map(item => {
      if (selectedIds.has(item.id)) {
        if (action === 'favorite') return { ...item, isFavorite: !item.isFavorite };
        if (action === 'incorrect') return { ...item, isIncorrect: !item.isIncorrect };
      }
      return item;
    });

    onUpdateHistory(newHistory);
    // Don't clear selection for tagging actions to allow consecutive tagging
  };

  const exportToCSV = () => {
    const dataToExport = selectedIds.size > 0 
      ? history.filter(item => selectedIds.has(item.id))
      : history;

    const headers = ['ID', 'Name', 'Scientific Name', 'Invasive', 'Confidence', 'Analysis Time (s)', 'Lat', 'Lng', 'Timestamp', 'Favorite', 'Incorrect'];
    const rows = dataToExport.map(item => [
      item.id,
      `"${item.name}"`,
      `"${item.scientificName}"`,
      item.isInvasive ? 'Yes' : 'No',
      `${(item.confidence * 100).toFixed(1)}%`,
      item.analysisTime.toFixed(2),
      item.coordinates?.lat || 'N/A',
      item.coordinates?.lng || 'N/A',
      new Date(item.timestamp).toLocaleString(),
      item.isFavorite ? 'Yes' : 'No',
      item.isIncorrect ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flora_analytics_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Identification Log</h2>
          <p className="text-slate-500">Manage and audit your plant discovery history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClear}
            disabled={history.length === 0}
            className="px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <i className="fas fa-trash-alt"></i>
            Wipe All
          </button>
          <button 
            onClick={exportToCSV}
            disabled={history.length === 0}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            <i className="fas fa-file-excel"></i>
            {selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export All CSV'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm bg-emerald-700 px-3 py-1 rounded-full">
              {selectedIds.size} Selected
            </span>
            <div className="h-6 w-px bg-emerald-500 mx-2"></div>
            <button 
              onClick={() => applyBulkAction('favorite')}
              className="flex items-center gap-2 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
            >
              <i className="fas fa-star"></i> Toggle Favorite
            </button>
            <button 
              onClick={() => applyBulkAction('incorrect')}
              className="flex items-center gap-2 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
            >
              <i className="fas fa-times-circle"></i> Toggle Incorrect
            </button>
          </div>
          <button 
            onClick={() => applyBulkAction('delete')}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg transition-colors text-sm font-bold shadow-sm"
          >
            <i className="fas fa-trash-alt"></i> Delete Selected
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={history.length > 0 && selectedIds.size === history.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plant</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Speed (s)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Coordinates</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => {
                const isUnknown = item.name === "No Database Match Found";
                const isSelected = selectedIds.has(item.id);
                
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''} ${item.isIncorrect ? 'opacity-60' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200" alt={item.name} />
                          {item.isFavorite && (
                            <div className="absolute -top-1 -right-1 bg-amber-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-sm ring-1 ring-white">
                              <i className="fas fa-star"></i>
                            </div>
                          )}
                          {item.isIncorrect && (
                            <div className="absolute -bottom-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shadow-sm ring-1 ring-white">
                              <i className="fas fa-exclamation"></i>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold leading-tight ${isUnknown ? 'text-slate-500' : 'text-slate-800'} ${item.isIncorrect ? 'line-through' : ''}`}>
                              {item.name}
                            </p>
                            {item.isFavorite && <i className="fas fa-star text-amber-400 text-[10px]"></i>}
                          </div>
                          <p className="text-xs text-slate-400 italic">{item.scientificName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.isIncorrect ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full">
                          <i className="fas fa-ban"></i> Invalidated
                        </span>
                      ) : isUnknown ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">
                          <i className="fas fa-question-circle"></i> Unknown Specimen
                        </span>
                      ) : item.isInvasive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          <i className="fas fa-radiation"></i> Invasive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                          <i className="fas fa-check"></i> Non-Invasive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isUnknown ? 'bg-slate-400' : item.confidence > 0.95 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                            style={{ width: `${item.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-mono text-slate-600">
                          {(item.confidence * 100).toFixed(1)}%
                          {item.confidence === 1.0 && <i className="fas fa-shield-alt text-[10px] ml-1 text-emerald-600" title="Absolute Certainty"></i>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {item.analysisTime.toFixed(2)}s
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {item.coordinates ? `${item.coordinates.lat.toFixed(4)}, ${item.coordinates.lng.toFixed(4)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No records found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;
