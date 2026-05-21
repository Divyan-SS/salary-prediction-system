// CsvUploader.jsx
import { useState, useRef, useEffect } from 'react';
import { uploadCSV, convertSalary, getSupportedCurrencies } from '../services/api';
import toast from 'react-hot-toast';

export default function CsvUploader({ onPredictionComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [convertedResults, setConvertedResults] = useState(null);
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [supportedCurrencies, setSupportedCurrencies] = useState({ USD: 'United States Dollar' });
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState('');
  const fileInputRef = useRef(null);

  // Helper logic to cleanly parse numeric bytes into highly readable string expressions
  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const downloadResultsCSV = (data, isConverted = false) => {
    try {
      if (!data || data.length === 0) {
        toast.error("No prediction records available to export.");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(fieldName => {
            const value = row[fieldName] ?? '';
            const stringified = typeof value === 'object' ? JSON.stringify(value) : String(value);
            const sanitized = stringified.replace(/"/g, '""');
            return sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')
              ? `"${sanitized}"`
              : sanitized;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const fileName = isConverted 
        ? `salary_predictions_${targetCurrency.toLowerCase()}.csv` 
        : 'salary_predictions.csv';

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Results downloaded successfully");
    } catch (error) {
      toast.error("Failed to export dataset records. Ensure valid layout matrix configurations.");
      console.error(error);
    }
  };

  const parseCsv = (text) => {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
    return lines.map((line) => {
      const cells = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          cells.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current);
      return cells.map((cell) => cell.trim().replace(/^"|"$/g, ''));
    });
  };

  const validateCsv = (file) =>
    new Promise((resolve, reject) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject('Please select a .csv file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== 'string') {
          reject('Could not read the CSV file.');
          return;
        }

        const rows = parseCsv(text);
        if (rows.length === 0) {
          reject('CSV file is empty.');
          return;
        }

        const expectedHeader = ['Country', 'EdLevel', 'YearsCodePro'];
        const header = rows[0].map((cell) => cell.trim());

        if (header.length !== expectedHeader.length || !expectedHeader.every((col, index) => col === header[index])) {
          reject('CSV must contain exactly these columns: Country, EdLevel, YearsCodePro. Refer the sample.csv file given above for format.');
          return;
        }

        for (let i = 1; i < rows.length; i += 1) {
          const row = rows[i];
          if (row.length !== expectedHeader.length) {
            reject(`CSV row ${i + 1} must contain exactly 3 columns.`);
            return;
          }
        }

        resolve();
      };
      reader.onerror = () => reject('Failed to read the CSV file.');
      reader.readAsText(file);
    });

  const handleFileChange = (e) => {
    setResult(null);
    setConvertedResults(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
    if (onPredictionComplete) onPredictionComplete([]);
  };

  // Safe manual clear pipeline resetting bound element state metrics
  const clearSelectedFile = (e) => {
    if (e) e.preventDefault();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);
    setConversionError('');
    setConvertedResults(null);
    try {
      await validateCsv(file);
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadCSV(formData);
      
      setResult(response.data);
      setTargetCurrency('USD');
      
      if (onPredictionComplete) {
        onPredictionComplete(response.data.results || []);
      }
      
      toast.success(`Predictions completed: ${response.data.successful_predictions} successful`);
    } catch (err) {
      const errorMsg = typeof err === 'string'
        ? err
        : err.response?.data?.detail || err.message || 'Upload failed. Make sure the file is closed and a valid CSV is selected.';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ['Country', 'EdLevel', 'YearsCodePro'],
      ['United States', 'Master’s degree', '8'],
      ['India', 'Bachelor’s degree', '3'],
      ['United Kingdom', 'Professional degree', '12'],
      ['Germany', 'Master’s degree', '5'],
      ['Canada', 'Bachelor’s degree', '2'],
      ['France', 'Other doctoral', '15'],
      ['Australia', 'Master’s degree', '10'],
      ['Netherlands', 'Bachelor’s degree', '4'],
      ['Poland', 'Master’s degree', '7'],
      ['Sweden', 'Bachelor’s degree', '1'],
      ['Brazil', 'Master’s degree', '6'],
      ['Italy', 'Bachelor’s degree', '0.5'],
      ['Spain', 'Master’s degree', '50'],
      ['Russian Federation', 'Bachelor’s degree', '20']
    ];
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_predictions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchConvert = async () => {
    if (!result || !result.results) {
      return;
    }
    setConversionLoading(true);
    setConversionError('');

    try {
      if (targetCurrency === 'USD') {
        const resetResults = result.results.map((row) => ({ ...row, Converted_Salary: row.Predicted_Salary_USD }));
        setConvertedResults(resetResults);
        if (onPredictionComplete) onPredictionComplete(resetResults);
        return;
      }

      const converted = await Promise.all(
        result.results.map(async (row) => {
          if (typeof row.Predicted_Salary_USD !== 'number') {
            return { ...row, Converted_Salary: null };
          }

          const response = await convertSalary(row.Predicted_Salary_USD, targetCurrency);
          return {
            ...row,
            Converted_Salary: response.data.converted_salary,
          };
        })
      );

      setConvertedResults(converted);
      
      if (onPredictionComplete) {
        onPredictionComplete(converted);
      }
    } catch (err) {
      setConversionError(err.response?.data?.detail || err.message || 'Batch conversion failed.');
      console.error(err);
    } finally {
      setConversionLoading(false);
    }
  };

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await getSupportedCurrencies();
        const fetched = response.data || {};
        setSupportedCurrencies(Object.keys(fetched).length ? fetched : { USD: 'United States Dollar' });
      } catch (err) {
        console.error('Failed to load currencies', err);
        setSupportedCurrencies({ USD: 'United States Dollar' });
      }
    };
    fetchCurrencies();
  }, []);

  const canConvert = result?.results?.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        /* CRITICAL CSS FIX: Override native cursors for global custom cursor support */
        @media (hover:hover) and (pointer:fine) {
          *, html, body, a, button, select, input, label {
            cursor: none !important;
          }
        }

        @keyframes float-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes card-slide {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .animate-float {
          animation: float-in 0.5s ease-out both;
        }
        
        .animate-card-slide {
          animation: card-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .glass-panel-dark {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }
        
        select option {
          background-color: #0d1527;
          color: #ffffff;
        }
      `}</style>

      <div className="space-y-6 text-white">
        {/* Upload Section */}
        <div className="glass-panel-dark rounded-[40px] shadow-sm transition-all duration-300 overflow-hidden animate-float">
          <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8v8" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  Batch Predictions (CSV)
                </h3>
                <p className="text-sm text-slate-300">
                  Upload a CSV with columns: <code className="bg-zinc-950/60 border border-zinc-800/80 px-1.5 py-0.5 rounded text-gray-300 font-mono">Country, EdLevel, YearsCodePro</code>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Control Layout Array Trigger Buttons */}
            <div className="flex flex-wrap gap-3">
              <label className="bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 rounded-xl px-4 py-2 transition flex items-center gap-2 shadow-sm text-gray-200">
                <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm font-medium">Choose CSV file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={downloadSampleCSV}
                className="bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 text-gray-200 font-medium px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample CSV
              </button>

              <button
                onClick={handleUpload}
                disabled={uploading || !file}
                className={`font-semibold px-6 py-2 rounded-xl transition disabled:opacity-40 flex items-center gap-2 shadow-md ${
                  file 
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white animate-pulse ring-1 ring-sky-400/30' 
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white/90'
                }`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {file ? 'Ready to Upload' : 'Upload & Predict'}
                  </>
                )}
              </button>
            </div>

            {/* Premium Attachment Preview Card Display Space */}
            {file && (
              <div className="w-full max-w-xl bg-zinc-950/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 animate-card-slide backdrop-blur-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate pr-2">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-slate-400">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium">
                        ✓ File selected successfully
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={clearSelectedFile}
                  className="p-1.5 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg text-slate-400 hover:text-white transition flex-shrink-0"
                  title="Remove selected file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="mt-3 text-sky-400 bg-sky-950/30 border border-sky-900/40 rounded-xl p-3 flex items-start gap-2 backdrop-blur-sm">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">Tip: If upload fails, close the CSV file and select it again. Ensure correct column headers.</span>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Original Predictions Container */}
            <div className="glass-panel-dark rounded-[40px] shadow-sm transition-all duration-300 overflow-hidden animate-float-delay">
              <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                      Original Predicted Salaries (USD)
                    </h4>
                    <p className="text-sm text-slate-300">The original predictions below in USD. Use the converter to see salaries in different currencies.</p>
                  </div>
                </div>
                
                {/* Header Action Button A: Original CSV Exporter */}
                <button
                  onClick={() => downloadResultsCSV(result.results, false)}
                  className="sm:self-center flex items-center gap-1.5 bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm hover:scale-105"
                >
                  <svg className="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Results CSV
                </button>
              </div>

              <div className="p-6">
                <div className="text-sm text-gray-300 mb-4 flex flex-wrap gap-3">
                  <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 px-2.5 py-1 rounded-full font-medium">
                    ✅ Successful: {result.successful_predictions} / {result.total_rows}
                  </span>
                  {result.rows_dropped_due_to_education > 0 && (
                    <span className="bg-yellow-950/40 text-yellow-400 border border-yellow-900/50 px-2.5 py-1 rounded-full font-medium">
                      ⚠️ {result.rows_dropped_due_to_education} rows dropped (unrecognized education)
                    </span>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 mb-4 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-red-400 mb-2">Errors</p>
                    <ul className="text-sm text-red-300 list-disc list-inside max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>Row {err.row}: {err.country} - {err.error}</li>
                      ))}
                      {result.errors.length > 5 && <li>... and {result.errors.length - 5} more</li>}
                    </ul>
                  </div>
                )}

                <div className="overflow-auto max-h-96 border border-zinc-800/60 rounded-xl">
                  <table className="min-w-full text-sm text-gray-300">
                    <thead className="bg-zinc-900/80 sticky top-0 text-gray-200 backdrop-blur-sm">
                      <tr>
                        <th className="p-3 text-left font-semibold">Country</th>
                        <th className="p-3 text-left font-semibold">Education</th>
                        <th className="p-3 text-left font-semibold">Experience</th>
                        <th className="p-3 text-left font-semibold">Predicted Salary (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40 bg-[#141416]/50">
                      {result?.results?.map((row, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30 transition">
                          <td className="p-3">{row.Country}</td>
                          <td className="p-3">{row.EdLevel}</td>
                          <td className="p-3">{row.YearsCodePro}</td>
                          <td className="p-3 font-mono text-emerald-400">
                            {typeof row.Predicted_Salary_USD === 'number'
                              ? `$${row.Predicted_Salary_USD.toLocaleString()}`
                              : '❌ Error'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Currency Conversion Controller Area */}
            <div className="glass-panel-dark rounded-[40px] shadow-sm transition-all duration-300 overflow-hidden">
              <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                      Convert to Another Currency
                    </h4>
                    <p className="text-sm text-slate-300">Convert all predictions to your preferred currency using real‑time exchange rates.</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Target currency</label>
                    <select
                      value={targetCurrency}
                      onChange={(e) => {
                        setTargetCurrency(e.target.value);
                        setConvertedResults(null);
                      }}
                      className="w-full sm:w-64 bg-zinc-950/40 border border-zinc-800 text-white rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-sm"
                    >
                      {Object.entries(supportedCurrencies).map(([code, name]) => (
                        <option key={code} value={code}>
                          {`${code} - ${name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleBatchConvert}
                      disabled={conversionLoading || !canConvert}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-xl transition disabled:opacity-50 flex items-center gap-2 shadow-md"
                    >
                      {conversionLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Converting...
                        </>
                      ) : (
                        'Convert Batch'
                      )}
                    </button>
                    <button
                      onClick={() => setConvertedResults(null)}
                      disabled={!convertedResults}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-gray-200 font-medium px-5 py-2 rounded-xl transition disabled:opacity-50 shadow-sm"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {conversionError && (
                  <div className="mt-3 text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl p-3 backdrop-blur-sm">
                    {conversionError}
                  </div>
                )}
              </div>
            </div>

            {/* Converted Results Section Container */}
            {convertedResults && (
              <div className="glass-panel-dark rounded-[40px] shadow-sm transition-all duration-300 overflow-hidden">
                <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                        Converted Salaries ({targetCurrency})
                      </h4>
                      <p className="text-sm text-slate-300">Original USD predictions converted to {targetCurrency}</p>
                    </div>
                  </div>

                  {/* Header Action Button B: Converted CSV Exporter */}
                  <button
                    onClick={() => downloadResultsCSV(convertedResults, true)}
                    className="sm:self-center flex items-center gap-1.5 bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800/60 text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm hover:scale-105"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Results CSV
                  </button>
                </div>

                <div className="p-6">
                  <div className="overflow-auto max-h-96 border border-zinc-800/60 rounded-xl">
                    <table className="min-w-full text-sm text-gray-300">
                      <thead className="bg-zinc-900/80 sticky top-0 text-gray-200 backdrop-blur-sm">
                        <tr>
                          <th className="p-3 text-left font-semibold">Country</th>
                          <th className="p-3 text-left font-semibold">Education</th>
                          <th className="p-3 text-left font-semibold">Experience</th>
                          <th className="p-3 text-left font-semibold">Original (USD)</th>
                          <th className="p-3 text-left font-semibold">Converted ({targetCurrency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40 bg-[#141416]/50">
                        {convertedResults.map((row, i) => (
                          <tr key={i} className="hover:bg-zinc-800/30 transition">
                            <td className="p-3">{row.Country}</td>
                            <td className="p-3">{row.EdLevel}</td>
                            <td className="p-3">{row.YearsCodePro}</td>
                            <td className="p-3 font-mono text-gray-400">
                              {typeof row.Predicted_Salary_USD === 'number'
                                ? `$${row.Predicted_Salary_USD.toLocaleString()}`
                                : '❌ Error'}
                            </td>
                            <td className="p-3 font-mono text-sky-400">
                              {typeof row.Converted_Salary === 'number'
                                ? `${row.Converted_Salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetCurrency}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}