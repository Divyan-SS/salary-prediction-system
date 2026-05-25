// frontend/src/components/CsvUploader.jsx
import { useState, useRef } from 'react';

export default function CsvUploader({ onFileSelect, onUploadSubmit, loading }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // Helper logic to cleanly parse numeric bytes into highly readable string expressions
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (onFileSelect) onFileSelect(selectedFile); // Hooks data into parent pipeline mapping context
    }
  };

  const clearSelectedFile = (e) => {
    if (e) e.preventDefault();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileSelect) onFileSelect(null);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Country', 'EdLevel', 'YearsCodePro'],
      ['United States', 'B.Sc Computer Science', '8'],
      ['India', 'B.Tech Information Technology', '3'],
      ['United Kingdom', 'M.Sc Artificial Intelligence', '12'],
      ['Germany', 'MBA Finance', '5'],
      ['Canada', 'PhD Data Science', '2'],
      ['France', 'M.Tech AI', '15'],
      ['Australia', 'Postgraduate', '10'],
      ['Netherlands', 'Undergraduate', '4'],
      ['Poland', 'Master’s degree', '7'],
      ['Sweden', 'Bachelor’s degree', '1'],
      ['Brazil', 'MBA', '6'],
      ['Italy', 'Professional degree', '0.5'],
      ['Spain', 'Professional degree', '50'],
      ['Russian Federation', 'Other doctoral', '20']
    ];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_predictions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        @keyframes float-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes card-slide {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .animate-float { animation: float-in 0.5s ease-out both; }
        .animate-card-slide { animation: card-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="space-y-6 text-white w-full">
        <div className="overflow-hidden animate-float">
          <div className="pb-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  Inference Data Ingestion
                </h3>
                <p className="text-sm text-slate-400">
                  Select clean data configurations structured down explicit schema layouts.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-5">
            <div className="flex flex-wrap gap-3">
              <label className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-5 py-2.5 transition flex items-center gap-2 text-gray-200 cursor-pointer select-none">
                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-semibold">Choose CSV File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2 select-none"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Get Format Framework
              </button>

              <button
                type="button"
                onClick={onUploadSubmit}
                disabled={loading || !file}
                className={`font-bold px-6 py-2.5 rounded-xl transition disabled:opacity-40 flex items-center gap-2 select-none ${
                  file 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:opacity-95' 
                    : 'bg-white/5 text-white/40 border border-white/5'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing Matrix Data...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Execute Bulk Prediction
                  </>
                )}
              </button>
            </div>

            {file && (
              <div className="w-full bg-slate-950/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 animate-card-slide backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate pr-2">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">{formatFileSize(file.size)}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-medium select-none">
                        ✓ Configuration Target Locked
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg text-slate-400 hover:text-white transition flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}