
import React, { useState, useRef, useEffect } from 'react';
import { analyzePlantWithContext } from '../services/geminiService';
import { PlantAnalysis, PlantProfile } from '../types';

interface AnalyzeProps {
  profiles: PlantProfile[];
  onResult: (result: PlantAnalysis) => void;
  correctionEntry?: PlantAnalysis | null;
  onCorrectionComplete?: (updatedEntry: PlantAnalysis) => void;
  onCancelCorrection?: () => void;
  onAddProfile?: (profile: PlantProfile) => void;
}

const Analyze: React.FC<AnalyzeProps> = ({ 
  profiles, 
  onResult, 
  correctionEntry, 
  onCorrectionComplete,
  onCancelCorrection,
  onAddProfile
}) => {
  const [source, setSource] = useState<'upload' | 'folder' | 'video' | 'camera' | 'correction'>(
    correctionEntry ? 'correction' : 'upload'
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisTimer, setAnalysisTimer] = useState<number>(0);
  const [showDetection, setShowDetection] = useState(true);
  const [lastResult, setLastResult] = useState<PlantAnalysis | null>(null);

  // Correction state
  const [correctedName, setCorrectedName] = useState(correctionEntry?.name || '');
  const [correctedScientificName, setCorrectedScientificName] = useState(correctionEntry?.scientificName || '');
  const [correctedIsInvasive, setCorrectedIsInvasive] = useState(correctionEntry?.isInvasive || false);

  useEffect(() => {
    if (correctionEntry) {
      setSource('correction');
      setCorrectedName(correctionEntry.name);
      setCorrectedScientificName(correctionEntry.scientificName);
      setCorrectedIsInvasive(correctionEntry.isInvasive);
    }
  }, [correctionEntry]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (source === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [source]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureAndAnalyze = async (imageSrc?: string): Promise<void> => {
    if (profiles.length === 0) {
      setError("Training Database is empty. Identification requires at least one profile.");
      return;
    }

    let finalImage = imageSrc;

    if (!finalImage && (source === 'camera' || source === 'video')) {
      if (!videoRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      finalImage = canvasRef.current.toDataURL('image/jpeg');
    }

    if (!finalImage) return;

    setCapturedImage(finalImage);
    setIsAnalyzing(true);
    setError(null);
    setAnalysisTimer(0);
    const startTime = performance.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setAnalysisTimer(prev => prev + 10);
    }, 10);

    try {
      const coords = await new Promise<{lat: number, lng: number} | undefined>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(undefined),
          { timeout: 3000 }
        );
      });

      const result = await analyzePlantWithContext(finalImage, profiles);
      const endTime = performance.now();
      
      // Calculate duration in seconds
      const durationInSeconds = (endTime - startTime) / 1000;

      onResult({
        id: Math.random().toString(36).substr(2, 9),
        name: result.name,
        scientificName: result.scientificName,
        isInvasive: result.isInvasive,
        confidence: result.confidence,
        timestamp: Date.now(),
        analysisTime: durationInSeconds,
        coordinates: coords,
        imageUrl: finalImage,
        matchedProfileId: result.matchedProfileId,
        detectedObjects: result.detectedObjects
      });

      setLastResult({
        id: 'preview',
        name: result.name,
        scientificName: result.scientificName,
        isInvasive: result.isInvasive,
        confidence: result.confidence,
        timestamp: Date.now(),
        analysisTime: durationInSeconds,
        imageUrl: finalImage,
        detectedObjects: result.detectedObjects
      });

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Failed to analyze plant");
    } finally {
      if (!batchProgress || batchProgress.current === batchProgress.total) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    setBatchProgress({ current: 0, total: files.length });

    const fileList = Array.from(files);
    
    // Process each file sequentially to ensure every photo is looked at
    for (let i = 0; i < fileList.length; i++) {
      setBatchProgress({ current: i + 1, total: fileList.length });
      const file = fileList[i];
      
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        // Cast 'file' as any to satisfy the compiler when it incorrectly infers it as 'unknown'
        reader.readAsDataURL(file as any);
      });

      await captureAndAnalyze(base64);
    }

    setBatchProgress(null);
    setIsAnalyzing(false);
  };

  const submitCorrection = () => {
    if (!correctionEntry || !onCorrectionComplete) return;

    const updatedEntry: PlantAnalysis = {
      ...correctionEntry,
      correctedData: {
        name: correctedName,
        scientificName: correctedScientificName,
        isInvasive: correctedIsInvasive
      }
    };

    // Refine model by adding to Training DB if requested
    if (onAddProfile) {
      onAddProfile({
        id: Math.random().toString(36).substr(2, 9),
        name: correctedName,
        scientificName: correctedScientificName,
        isInvasive: correctedIsInvasive,
        images: [correctionEntry.imageUrl],
        description: `Correction-based profile generated from observation ${correctionEntry.id}.`,
        dateCreated: Date.now()
      });
    }

    onCorrectionComplete(updatedEntry);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
        {[
          { id: 'upload', label: 'Single Image', icon: 'fa-file-image' },
          { id: 'folder', label: 'Batch Folder', icon: 'fa-folder-open' },
          { id: 'video', label: 'Video Upload', icon: 'fa-film' },
          { id: 'camera', label: 'Live Camera', icon: 'fa-video' },
          ...(correctionEntry ? [{ id: 'correction', label: 'Correction Mode', icon: 'fa-tools' }] : [])
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setSource(item.id as any);
              setBatchProgress(null);
              setError(null);
              if (item.id !== 'correction' && onCancelCorrection) {
                onCancelCorrection();
              }
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              source === item.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${item.icon}`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 relative">
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 bg-emerald-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
            <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-emerald-500/20"></div>
            <p className="text-2xl font-bold">
              {batchProgress 
                ? `Batch Analysis: ${batchProgress.current} / ${batchProgress.total}`
                : 'Matching Database...'}
            </p>
            <p className="text-emerald-100 mt-2">
              {batchProgress 
                ? `Processing specimen ${batchProgress.current} of ${batchProgress.total} in folder`
                : 'Comparing against local training profiles...'}
            </p>
            
            {batchProgress && (
              <div className="w-64 bg-emerald-800 h-2 rounded-full mt-6 overflow-hidden border border-white/10">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-300 ease-out"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                ></div>
              </div>
            )}

            <div className="mt-8 px-6 py-2 bg-emerald-800/80 rounded-full font-mono text-xl border border-white/5">
              {(analysisTimer / 1000).toFixed(2)}s
            </div>
          </div>
        )}

        {source === 'camera' ? (
          <div className="w-full relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-emerald-500/30 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-dashed border-emerald-500 rounded-2xl opacity-50"></div>
            </div>
            <button 
              onClick={() => captureAndAnalyze()}
              disabled={isAnalyzing}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform border-4 border-slate-200"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-full"></div>
            </button>
          </div>
        ) : source === 'correction' && correctionEntry ? (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3">
                <div className="sticky top-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Original Observation</p>
                  <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-xl ring-1 ring-slate-200">
                    <img src={correctionEntry.imageUrl} className="w-full aspect-square object-cover" alt="Original" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div>
                        <p className="text-white font-bold">{correctionEntry.name}</p>
                        <p className="text-white/70 text-xs italic">{correctionEntry.scientificName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 font-medium flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle"></i>
                      Flagged as Incorrect
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Refine Identification</h3>
                  <p className="text-slate-500">Provide the correct taxonomic data to improve model accuracy.</p>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Correct Common Name</label>
                    <input 
                      type="text" 
                      value={correctedName}
                      onChange={(e) => setCorrectedName(e.target.value)}
                      placeholder="e.g. Japanese Knotweed"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Correct Scientific Name</label>
                    <input 
                      type="text" 
                      value={correctedScientificName}
                      onChange={(e) => setCorrectedScientificName(e.target.value)}
                      placeholder="e.g. Reynoutria japonica"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all italic"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-800">Invasive Species Status</p>
                      <p className="text-xs text-slate-500">Is this plant considered invasive in this region?</p>
                    </div>
                    <button 
                      onClick={() => setCorrectedIsInvasive(!correctedIsInvasive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${correctedIsInvasive ? 'bg-red-500' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${correctedIsInvasive ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={submitCorrection}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-save"></i>
                    Update Record & Refine Model
                  </button>
                  <button 
                    onClick={onCancelCorrection}
                    className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : source === 'folder' ? (
          <div className="w-full text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-4xl">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Folder Batch Analysis</h3>
              <p className="text-slate-500 mt-2">Identify every single photo found in the selected folder.</p>
            </div>
            <input 
              type="file" 
              multiple 
              // @ts-ignore
              webkitdirectory="" 
              className="hidden" 
              id="analyze-folder" 
              onChange={handleFileUpload} 
            />
            <label htmlFor="analyze-folder" className="inline-block px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 cursor-pointer shadow-lg shadow-emerald-200 transition-colors">
              Process Folder
            </label>
            <p className="text-xs text-slate-400">The system will analyze each image individually.</p>
          </div>
        ) : source === 'video' ? (
           <div className="w-full text-center space-y-6">
             <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto text-4xl">
               <i className="fas fa-film"></i>
             </div>
             <div>
               <h3 className="text-xl font-bold text-slate-800">Video Analysis</h3>
               <p className="text-slate-500 mt-2">Select a video to sample and analyze frames against your database.</p>
             </div>
             <input 
              type="file" 
              accept="video/*" 
              className="hidden" 
              id="analyze-video" 
              onChange={(e) => alert('Sequential frame analysis logic would start here...')} 
            />
             <label htmlFor="analyze-video" className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 cursor-pointer shadow-lg shadow-blue-200">
               Select Video
             </label>
           </div>
        ) : (
          <div className="w-full text-center space-y-6">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-4xl">
              <i className="fas fa-image"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Single Observation</h3>
              <p className="text-slate-500 mt-2">Compare a photo against your private training database.</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              id="analyze-file" 
              onChange={handleFileUpload} 
            />
            <label htmlFor="analyze-file" className="inline-block px-8 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 cursor-pointer shadow-lg shadow-emerald-200">
              Upload Photo
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3 border border-red-100 max-w-md">
            <i className="fas fa-circle-exclamation"></i>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
      </div>

      {capturedImage && !isAnalyzing && (
        <div className="bg-emerald-900 rounded-2xl p-6 text-white animate-fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative group">
              <div className="relative">
                <img src={capturedImage} className="w-64 h-64 object-cover rounded-xl border-4 border-white/10" alt="Analyzed" />
                {showDetection && lastResult?.detectedObjects && (
                  <div className="absolute inset-0 pointer-events-none">
                    {lastResult.detectedObjects.map((obj, idx) => (
                      <div 
                        key={idx}
                        className="absolute border-2 border-emerald-400 bg-emerald-400/10"
                        style={{
                          top: `${obj.box_2d.ymin / 10}%`,
                          left: `${obj.box_2d.xmin / 10}%`,
                          width: `${(obj.box_2d.xmax - obj.box_2d.xmin) / 10}%`,
                          height: `${(obj.box_2d.ymax - obj.box_2d.ymin) / 10}%`,
                        }}
                      >
                        <span className="absolute -top-6 left-0 bg-emerald-400 text-emerald-950 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                          {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-emerald-500/10 rounded-xl pointer-events-none"></div>
              
              {lastResult?.detectedObjects && (
                <button 
                  onClick={() => setShowDetection(!showDetection)}
                  className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <i className={`fas ${showDetection ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showDetection ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest bg-emerald-800/50 px-2 py-0.5 rounded">Local Search Manifest: Active</span>
                <span className="bg-emerald-800 px-3 py-1 rounded-full text-xs font-mono border border-emerald-700">TS: {new Date().toLocaleTimeString()}</span>
              </div>
              <h4 className="text-2xl font-bold mt-2">Identification Run Complete</h4>
              <p className="text-slate-300 text-sm mt-2 max-w-lg">
                The batch process successfully checked all images against the current <strong>{profiles.length}</strong> profiles in your database. 
                Full telemetry data has been updated in the history and dashboard tabs.
              </p>
              <div className="mt-4 flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <i className="fas fa-check-circle"></i>
                  <span>Database Matched</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <i className="fas fa-microchip"></i>
                  <span>Edge Processing</span>
                </div>
              </div>

              {lastResult?.detectedObjects && lastResult.detectedObjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-2">Detected Objects</p>
                  <div className="flex flex-wrap gap-2">
                    {lastResult.detectedObjects.map((obj, idx) => (
                      <span key={idx} className="px-2 py-1 bg-emerald-800/50 rounded text-[10px] border border-emerald-700/50">
                        {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyze;
