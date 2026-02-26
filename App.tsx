
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Analyze from './components/Analyze';
import TrainingDB from './components/TrainingDB';
import History from './components/History';
import MapView from './components/MapView';
import { AppView, PlantAnalysis, PlantProfile } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [history, setHistory] = useState<PlantAnalysis[]>([]);
  const [profiles, setProfiles] = useState<PlantProfile[]>([]);
  const [correctionEntry, setCorrectionEntry] = useState<PlantAnalysis | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('flora_history');
    const savedProfiles = localStorage.getItem('flora_profiles');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
  }, []);

  useEffect(() => {
    localStorage.setItem('flora_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('flora_profiles', JSON.stringify(profiles));
  }, [profiles]);

  const handleAnalysisResult = (result: PlantAnalysis) => {
    setHistory(prev => [result, ...prev]);
  };

  const addProfile = (profile: PlantProfile) => {
    setProfiles(prev => [profile, ...prev]);
  };

  const deleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const editProfile = (id: string, updates: Partial<PlantProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const updateHistory = (newHistory: PlantAnalysis[]) => {
    setHistory(newHistory);
  };

  const handleStartCorrection = (entry: PlantAnalysis) => {
    setCorrectionEntry(entry);
    setCurrentView(AppView.ANALYZE);
  };

  const handleCorrectionComplete = (updatedEntry: PlantAnalysis) => {
    setHistory(prev => prev.map(item => item.id === updatedEntry.id ? updatedEntry : item));
    setCorrectionEntry(null);
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView}>
      {currentView === AppView.DASHBOARD && (
        <Dashboard history={history} />
      )}
      {currentView === AppView.ANALYZE && (
        <Analyze 
          profiles={profiles} 
          onResult={handleAnalysisResult} 
          correctionEntry={correctionEntry}
          onCorrectionComplete={handleCorrectionComplete}
          onCancelCorrection={() => setCorrectionEntry(null)}
          onAddProfile={addProfile}
        />
      )}
      {currentView === AppView.TRAINING && (
        <TrainingDB 
          profiles={profiles} 
          onAdd={addProfile} 
          onDelete={deleteProfile} 
          onEdit={editProfile} 
        />
      )}
      {currentView === AppView.HISTORY && (
        <History 
          history={history} 
          onClear={clearHistory} 
          onUpdateHistory={updateHistory}
          onStartCorrection={handleStartCorrection}
        />
      )}
      {currentView === AppView.MAP && (
        <MapView history={history} />
      )}
    </Layout>
  );
};

export default App;
