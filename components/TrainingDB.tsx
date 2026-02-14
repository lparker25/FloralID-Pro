
import React, { useState } from 'react';
import { PlantProfile } from '../types';

interface TrainingDBProps {
  profiles: PlantProfile[];
  onAdd: (profile: PlantProfile) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<PlantProfile>) => void;
}

const TrainingDB: React.FC<TrainingDBProps> = ({ profiles, onAdd, onDelete, onEdit }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const images: string[] = [];
    
    // Attempt to get folder name from first file's webkitRelativePath
    const firstPath = files[0].webkitRelativePath;
    const folderName = firstPath ? firstPath.split('/')[0] : "New Plant Species";

    const readers = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        // Cast 'file' as any to satisfy the compiler when it incorrectly infers it as 'unknown'
        reader.readAsDataURL(file as any);
      });
    });

    const results = await Promise.all(readers);
    
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: folderName,
      scientificName: "Pending Scientific Classification",
      isInvasive: false,
      images: results,
      description: `Training dataset with ${results.length} samples.`,
      dateCreated: Date.now()
    });
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Training Database</h2>
          <p className="text-slate-500 max-w-xl">
            Upload folders of photos to create specific plant profiles. The AI will strictly limit identification to these profiles.
          </p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            id="folder-upload" 
            className="hidden" 
            multiple
            // @ts-ignore
            webkitdirectory=""
            onChange={handleFolderUpload} 
          />
          <label htmlFor="folder-upload" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 cursor-pointer shadow-lg shadow-emerald-100 flex items-center gap-2">
            <i className="fas fa-folder-plus"></i>
            Upload Plant Folder
          </label>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-4 text-emerald-700">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-medium">Building new plant profile from folder...</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex p-4 gap-4">
              <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden relative flex-shrink-0 border border-slate-200">
                <img src={profile.images[0]} className="w-full h-full object-cover" alt="" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-0.5 text-center font-bold">
                  {profile.images.length} IMAGES
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <input 
                    className="font-bold text-slate-800 border-none p-0 focus:ring-0 w-full truncate bg-transparent"
                    value={profile.name}
                    onChange={(e) => onEdit(profile.id, { name: e.target.value })}
                  />
                  <button onClick={() => onDelete(profile.id)} className="text-slate-300 hover:text-red-500 p-1">
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
                <input 
                  className="text-xs text-slate-400 italic border-none p-0 focus:ring-0 w-full bg-transparent"
                  value={profile.scientificName}
                  onChange={(e) => onEdit(profile.id, { scientificName: e.target.value })}
                />
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => onEdit(profile.id, { isInvasive: !profile.isInvasive })}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${profile.isInvasive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {profile.isInvasive ? 'Invasive' : 'Safe Species'}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-4 py-2 flex justify-between items-center text-[10px] text-slate-400">
              <span>Added {new Date(profile.dateCreated).toLocaleDateString()}</span>
              <span className="font-mono">{profile.id}</span>
            </div>
          </div>
        ))}
        
        {profiles.length === 0 && !isProcessing && (
          <div className="col-span-full py-20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white">
            <i className="fas fa-layer-group text-5xl mb-4 opacity-10"></i>
            <p className="font-medium">No plant profiles created yet.</p>
            <p className="text-sm">Upload a folder of images to define a new species.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingDB;
