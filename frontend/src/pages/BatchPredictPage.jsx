// frontend/src/pages/BatchPredictPage.jsx
import { useEffect, useRef, useState } from 'react';
import CsvUploader from '../components/CsvUploader';
import { uploadCSV, convertSalary, convertSalariesBulk, getSupportedCurrencies } from '../services/api';
import toast from 'react-hot-toast';

// ─── Zoom-Adaptive Deep Navy Neural Matrix Background ────────
function NeuralCanvas() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let particles = [];
    let speedLines = [];
    let scrollY = window.scrollY;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    const handleMouseMove = (e) => {
      mouseRef.current.tx = e.clientX;
      mouseRef.current.ty = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll);

    const N = Math.min(65, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.4 + 0.8,
        life: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.004,
        depth: Math.random() * 0.7 + 0.3,
      });
    }

    const lineCount = window.innerWidth < 768 ? 5 : 12;
    for (let i = 0; i < lineCount; i++) {
      speedLines.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 0.4 + 0.15,
        alpha: Math.random() * 0.2 + 0.05,
      });
    }

    const CONNECT_DIST = window.innerWidth < 768 ? 100 : 170;
    const PRIMARY_HSL = "199, 100%, 65%"; 
    const ACCENT_HSL = "260, 90%, 70%";   

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const mouse = mouseRef.current;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      for (let sl of speedLines) {
        sl.y -= sl.speed;
        if (sl.y < -sl.length) {
          sl.y = window.innerHeight + sl.length;
          sl.x = Math.random() * window.innerWidth;
        }
        ctx.strokeStyle = `hsla(199, 100%, 75%, ${sl.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x, sl.y + sl.length);
        ctx.stroke();
      }

      for (let p of particles) {
        p.life += p.speed;

        let forceX = 0;
        let forceY = 0;
        if (mouse.active) {
          const dxMouse = mouse.x - p.x;
          const dyMouse = mouse.y - p.y;
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
          if (distMouse > 0 && distMouse < 250) {
            const pull = (1 - distMouse / 250) * 8 * p.depth;
            forceX = (dxMouse / distMouse) * pull;
            forceY = (dyMouse / distMouse) * pull;
          }
        }

        const parallaxX = (mouse.x - window.innerWidth / 2) * 0.012 * p.depth + forceX;
        const parallaxY = (mouse.y - window.innerHeight / 2) * 0.012 * p.depth - (scrollY * 0.06 * p.depth) + forceY;

        const currentX = p.x + parallaxX;
        const currentY = p.y + parallaxY;

        p.x += p.vx + Math.sin(p.life * 0.4) * 0.05;
        p.y += p.vy + Math.cos(p.life * 0.3) * 0.05;

        if (p.x < -40) p.x = window.innerWidth + 40;
        if (p.x > window.innerWidth + 40) p.x = -40;
        if (p.y < -40) p.y = window.innerHeight + 40;
        if (p.y > window.innerHeight + 40) p.y = -40;

        const edgeFadeX = Math.min(currentX, window.innerWidth - currentX) / 100;
        const edgeFadeY = Math.min(currentY, window.innerHeight - currentY) / 100;
        const boundaryAlpha = Math.max(0, Math.min(1, Math.min(edgeFadeX, edgeFadeY)));

        p.computedX = currentX;
        p.computedY = currentY;
        p.alphaFactor = boundaryAlpha;
      }

      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          
          const dx = pi.computedX - pj.computedX;
          const dy = pi.computedY - pj.computedY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECT_DIST) {
            const proximityAlpha = 1 - dist / CONNECT_DIST;
            const combinedAlpha = proximityAlpha * 0.22 * pi.alphaFactor * pj.alphaFactor;
            
            if (combinedAlpha > 0) {
              const useAccent = (i + j) % 6 === 0;
              const hsl = useAccent ? ACCENT_HSL : PRIMARY_HSL;

              ctx.strokeStyle = `hsla(${hsl}, ${combinedAlpha})`;
              ctx.lineWidth = proximityAlpha * 0.65;
              ctx.beginPath();
              ctx.moveTo(pi.computedX, pi.computedY);
              ctx.lineTo(pj.computedX, pj.computedY);
              ctx.stroke();
            }
          }
        }
      }

      for (let p of particles) {
        if (p.alphaFactor <= 0) continue;

        const pulse = 0.75 + 0.25 * Math.sin(p.life * 1.6);
        const finalAlpha = p.alphaFactor * pulse;

        ctx.beginPath();
        ctx.arc(p.computedX, p.computedY, p.r * 2.8 * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199, 100%, 65%, ${0.14 * finalAlpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.computedX, p.computedY, p.r * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(199, 100%, 85%, ${0.7 * finalAlpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

export default function BatchPredictPage() {
  const [file, setFile] = useState(null);
  const [batchData, setBatchData] = useState(null); 
  const [convertedResults, setConvertedResults] = useState(null); 
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [supportedCurrencies, setSupportedCurrencies] = useState({ USD: 'United States Dollar' });
  const [loading, setLoading] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState(null);
  const [error, setError] = useState(null);
  const [showAcceptedFormats, setShowAcceptedFormats] = useState(false);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await getSupportedCurrencies();
        if (response.data) setSupportedCurrencies(response.data);
      } catch (err) {
        console.error('Failed to parse remote currency options payload maps', err);
      }
    };
    fetchCurrencies();
  }, []);

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
  };

  const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!file) {
      setError("Please select a valid CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError(null);
      setConvertedResults(null);
      setTargetCurrency('USD');
      setShowAcceptedFormats(false);
      
      const response = await uploadCSV(formData);
      setBatchData(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Network error: Connection to prediction service failed.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchConvert = async () => {
    if (!batchData || !batchData.results) return;
    setConversionLoading(true);
    setConversionError(null);

    try {
      if (targetCurrency === 'USD') {
        setConvertedResults(null); 
        return;
      }

      // Collect all USD prediction values for bulk conversion
      const salariesUsd = batchData.results.map((row) => {
        const baseUsd = row.Predicted_Salary_USD ?? row.PredictedSalary;
        return typeof baseUsd === 'number' ? baseUsd : null;
      });

      const response = await convertSalariesBulk(salariesUsd, targetCurrency);
      const convertedSalaries = response.data.converted_salaries;

      const converted = batchData.results.map((row, idx) => {
        const baseUsd = row.Predicted_Salary_USD ?? row.PredictedSalary;
        return {
          ...row,
          Converted_Salary: typeof baseUsd === 'number' ? convertedSalaries[idx] : null,
        };
      });

      setConvertedResults(converted);
      toast.success(`Batch successfully mapped to ${targetCurrency}`);
    } catch (err) {
      setConversionError(err.response?.data?.detail || err.message || 'Batch conversion system fault.');
    } finally {
      setConversionLoading(false);
    }
  };

  const downloadResultsCSV = () => {
    const activeRows = convertedResults || batchData?.results;
    if (!activeRows || activeRows.length === 0) return;

    const headers = ["Country", "EdLevel", "YearsCodePro", `PredictedSalary_${targetCurrency}\n`];
    const rows = activeRows.map(row => {
      const country = row.Country || "Unknown";
      const education = row.EdLevel || "Unspecified";
      const experience = row.YearsCodePro || "0";
      const displayVal = targetCurrency === 'USD' 
        ? (row.Predicted_Salary_USD ?? 0) 
        : (row.Converted_Salary ?? "—");
      return `"${country}","${education}",${experience},${displayVal}\n`;
    });

    const blob = new Blob([headers.join(','), ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `salary_predictions_${targetCurrency.toLowerCase()}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        @keyframes float-in {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) both; }
        .animate-float-delay { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) 0.15s both; }
        .animate-float-delay-2 { animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) 0.3s both; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) both; }

        .glass-panel {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }
        
        select option { background-color: #0d1527; color: #ffffff; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#03060f] via-[#050b1a] to-[#070e24] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 font-sans overflow-x-hidden relative">
        <NeuralCanvas />

        <main className="w-full max-w-4xl mx-auto py-4 sm:py-6 relative z-10">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="animate-float text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4 px-2" style={{ fontFamily: "var(--font-display)", lineHeight: 1.2 }}>Batch Salary Prediction</h1>
            <p className="animate-float-delay text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto px-4 sm:px-0">
              Upload a CSV file and get instant salary predictions for your entire team.
            </p>
          </div>

          <div className="relative flex flex-col w-full max-w-2xl group mx-auto animate-float-delay-2">
            <div className="self-stretch rounded-[28px] sm:rounded-[40px] z-10 overflow-hidden border-[6px] sm:border-[8px] border-transparent border-solid" style={{ background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #10b981 0%, #7DD3FC 50%, #06B6D4 100%) border-box' }}>
              <div className="p-4 sm:p-6 md:p-8 backdrop-blur-md">
                <CsvUploader 
                  onFileSelect={handleFileChange}
                  onUploadSubmit={handleUploadSubmit}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="animate-float glass-panel mt-6 rounded-2xl border-red-500/20 bg-red-500/5 p-4 text-red-400 text-xs sm:text-sm flex items-start sm:items-center gap-3 max-w-4xl w-full mx-auto">
              <span className="shrink-0">⚠️</span>
              <p><strong>Upload Failed:</strong> {error}</p>
            </div>
          )}

          {batchData && (
            <div className="space-y-6 mt-6 sm:mt-8 animate-float w-full mx-auto">
              <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full border border-white/10 text-white">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Processed Predictions Matrix</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1.5 text-xs sm:text-sm">
                      <span className="text-emerald-400 font-medium">✅ Successful: {batchData.successful_predictions} / {batchData.total_rows}</span>
                      {batchData.rows_dropped_due_to_education > 0 && (
                        <span className="text-yellow-400 font-medium">⚠️ {batchData.rows_dropped_due_to_education} Skipped Rows (Invalid EdLevel)</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={downloadResultsCSV}
                    className="w-full md:w-auto justify-center bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition duration-200 shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <span>📥</span> Export Completed CSV
                  </button>
                </div>

                {batchData.errors && batchData.errors.length > 0 && (
                  <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-4 mb-4 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <p className="text-xs sm:text-sm font-semibold text-red-400">Skipped Matrix Records ({batchData.errors.length})</p>
                      
                      <button
                        type="button"
                        onClick={() => setShowAcceptedFormats(!showAcceptedFormats)}
                        className="text-[11px] sm:text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition text-sky-400 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {showAcceptedFormats ? "Hide Accepted Layout Guide" : "View Accepted Formats & Examples"}
                      </button>
                    </div>

                    {showAcceptedFormats && (
                      <div className="mb-4 p-3 sm:p-4 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] sm:text-xs text-slate-300 space-y-3 sm:space-y-0 animate-slide-down">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
                          <div>
                            <strong className="text-white block mb-0.5 sm:mb-1">1. Country (Exact Strings)</strong>
                            <code className="text-emerald-400 block font-mono text-[10px] sm:text-[11px] break-words">United States, India, Germany, Canada</code>
                          </div>
                          <div>
                            <strong className="text-white block mb-0.5 sm:mb-1">2. EdLevel (Mapped Tiers)</strong>
                            <code className="text-emerald-400 block font-mono text-[10px] sm:text-[11px] break-words">Bachelor’s degree, Master’s degree</code>
                          </div>
                          <div>
                            <strong className="text-white block mb-0.5 sm:mb-1">3. YearsCodePro (Tenure)</strong>
                            <code className="text-emerald-400 block font-mono text-[10px] sm:text-[11px] break-words">3, 12, Less than 1 year</code>
                          </div>
                        </div>
                      </div>
                    )}

                    <ul className="text-[11px] sm:text-xs text-red-300 list-disc list-inside max-h-32 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                      {batchData.errors.map((err, i) => (
                        <li key={i} className="break-words">Row {err.row}: {err.country || "Data Syntax Fault"} — {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20 custom-scrollbar max-h-[380px] w-full">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px] sm:min-w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#0f1626] text-slate-300 font-semibold sticky top-0 z-10 text-[11px] sm:text-xs">
                        <th className="p-3 sm:p-4">Country</th>
                        <th className="p-3 sm:p-4">Education Level</th>
                        <th className="p-3 sm:p-4">Experience</th>
                        <th className="p-3 sm:p-4 text-emerald-400">Base Salary (USD)</th>
                        <th className="p-3 sm:p-4 text-sky-400">Converted Salary ({targetCurrency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium text-slate-200">
                      {(convertedResults || batchData.results).map((row, index) => {
                        const baseSalary = row.Predicted_Salary_USD || row.PredictedSalary;
                        return (
                          <tr key={index} className="hover:bg-white/[0.02] transition">
                            <td className="p-3 sm:p-4 truncate max-w-[140px]">{row.Country || "Unknown"}</td>
                            <td className="p-3 sm:p-4">
                              <span className="inline-block bg-white/5 px-2 py-0.5 rounded text-[11px] sm:text-xs text-slate-300 border border-white/5 truncate max-w-[180px]">
                                {row.EdLevel || "Unspecified"}
                              </span>
                            </td>
                            <td className="p-3 sm:p-4 whitespace-nowrap">{row.YearsCodePro || "0"} Years</td>
                            <td className="p-3 sm:p-4 font-bold text-emerald-400 font-mono whitespace-nowrap">
                              {baseSalary ? `$${parseFloat(baseSalary).toLocaleString()}` : '❌ Error'}
                            </td>
                            <td className="p-3 sm:p-4 font-bold text-sky-400 font-mono whitespace-nowrap">
                              {typeof row.Converted_Salary === 'number'
                                ? `${row.Converted_Salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${targetCurrency}`
                                : targetCurrency === 'USD' && baseSalary ? `$${parseFloat(baseSalary).toLocaleString()}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Currency Converter Controller Block Area */}
              <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/10 text-white w-full">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:flex-1">
                    <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2">Map Evaluation Target Currency</label>
                    <select
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                      className="w-full sm:w-64 bg-slate-900 border border-white/10 text-white rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 backdrop-blur-sm"
                    >
                      {Object.entries(supportedCurrencies).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto sm:shrink-0">
                    <button
                      onClick={handleBatchConvert}
                      disabled={conversionLoading}
                      className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-600/10"
                    >
                      {conversionLoading ? "Transforming Vector Matrix..." : "Convert Complete Batch"}
                    </button>
                    <button
                      onClick={() => { setConvertedResults(null); setTargetCurrency('USD'); }}
                      disabled={!convertedResults}
                      className="w-full sm:w-auto justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-medium text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl transition disabled:opacity-30"
                    >
                      Reset Base view
                    </button>
                  </div>
                </div>
                {conversionError && (
                  <div className="mt-3 text-xs sm:text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl p-3">{conversionError}</div>
                )}
              </div>
            </div>
          )}

          <div className="animate-float-delay-2 mt-8 sm:mt-12 text-center px-4">
            <div className="inline-flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-300 font-medium w-full">
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 backdrop-blur-sm px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm">Template: country, education, experience</span>
              <span className="text-zinc-800 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 backdrop-blur-sm px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm">Process up to 1000 rows</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}