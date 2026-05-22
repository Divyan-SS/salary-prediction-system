import { useState, useEffect } from "react";
import { convertSalary, getSupportedCurrencies } from "../services/api";

export default function ResultCard({ prediction }) {
  const [showConverter, setShowConverter] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState(prediction.currency || 'USD');
  const [convertedAmount, setConvertedAmount] = useState(prediction.predicted_salary || 0);
  const [supportedCurrencies, setSupportedCurrencies] = useState({});
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState("");

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await getSupportedCurrencies();
        setSupportedCurrencies(response.data || {});
      } catch (err) {
        console.error("Failed to fetch supported currencies:", err);
      }
    };
    fetchCurrencies();
  }, []);

  useEffect(() => {
    setConvertedAmount(prediction.predicted_salary || 0);
    setTargetCurrency(prediction.currency || 'USD');
    setShowConverter(false);
  }, [prediction]);

  const handleConvert = async () => {
    if (targetCurrency === prediction.currency) {
      setConvertedAmount(prediction.predicted_salary);
      return;
    }
    setConversionLoading(true);
    setConversionError("");
    try {
      const usdAmount = prediction.predicted_salary_usd || prediction.predicted_salary;
      const response = await convertSalary(usdAmount, targetCurrency);
      setConvertedAmount(response.data.converted_salary);
    } catch (err) {
      setConversionError(err.response?.data?.detail || "Conversion failed");
    } finally {
      setConversionLoading(false);
    }
  };

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  return (
    <>
      <style>{`
        /* Global interaction consistency */
        @media (hover:hover) and (pointer:fine) {
          .result-container *, .converter-panel * { cursor: none !important; }
        }

        @keyframes fade-slide-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide { animation: fade-slide-up 0.4s cubic-bezier(0.2, 0.9, 0.4, 1.1) both; }

        .glass-panel-dark {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        
        select option {
          background-color: #0d1527;
          color: #ffffff;
        }
      `}</style>

      <div className="mt-8 space-y-6 animate-fade-slide text-white result-container">
        {/* Original Salary: Neon Pink/Blue Glow Card */}
        <div className="relative flex flex-col justify-start items-start w-full group mx-auto">
          <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FF3D77 0%, #4361EE 100%)', filter: 'blur(50px)' }} />
          
          <div className="self-stretch rounded-[40px] z-10 overflow-hidden" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FF3D77 0%, #4361EE 100%) border-box' }}>
            <div className="w-full h-full p-8 bg-[#1A1A1C]/90 backdrop-blur-md relative">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm uppercase tracking-widest font-semibold text-slate-300">Original Predicted Salary</p>
              </div>
              <p className="text-4xl md:text-5xl font-bold mb-2 text-white" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                {formatCurrency(prediction.predicted_salary, prediction.currency)}
              </p>
              <p className="text-sm text-slate-400">Based on your inputs in {prediction.currency}</p>
            </div>
          </div>
        </div>

        {/* Currency Converter Toggle */}
        <button
          onClick={() => setShowConverter(!showConverter)}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/80 text-white rounded-[24px] transition-all duration-300 font-semibold text-sm backdrop-blur-sm"
        >
          {showConverter ? "Hide Currency Converter" : "Convert to Another Currency"}
        </button>

        {/* Converter Panel */}
        {showConverter && (
          <div className="rounded-[24px] bg-zinc-900/30 border border-zinc-800/80 shadow-md overflow-hidden animate-fade-slide converter-panel">
            <div className="bg-zinc-950/40 px-6 py-4 border-b border-zinc-800/60">
              <h3 className="font-semibold text-white">Currency Converter</h3>
            </div>
            <div className="p-6 space-y-4">
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-[24px] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {Object.entries(supportedCurrencies).map(([code, name]) => (
                  <option key={code} value={code} className="bg-zinc-900">{code} - {name}</option>
                ))}
              </select>
              
              <button
                onClick={handleConvert}
                disabled={conversionLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-[24px] transition-all shadow-md disabled:opacity-50"
              >
                {conversionLoading ? "Converting..." : "Convert Salary"}
              </button>
              
              {conversionError && (
                <div className="bg-red-950/30 border border-red-900/40 rounded-[24px] p-3 text-red-400 text-sm">{conversionError}</div>
              )}
            </div>
          </div>
        )}

        {/* Converted Salary Result */}
        {convertedAmount !== prediction.predicted_salary && targetCurrency !== prediction.currency && (
          <div className="relative flex flex-col justify-start items-start w-full group mx-auto animate-fade-slide">
            <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #10b981 0%, #06B6D4 100%)', filter: 'blur(30px)' }} />
            
            <div className="self-stretch rounded-[40px] z-10 overflow-hidden" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #10b981 0%, #06B6D4 100%) border-box' }}>
              <div className="w-full h-full p-8 bg-[#1A1A1C]/90 relative">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                  </svg>
                  <p className="text-sm uppercase tracking-widest font-semibold text-slate-300">Converted Salary</p>
                </div>
                <p className="text-4xl md:text-5xl font-bold mb-2 text-emerald-400" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  {formatCurrency(convertedAmount, targetCurrency)}
                </p>
                <p className="text-sm text-slate-400">Converted from {prediction.currency}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}