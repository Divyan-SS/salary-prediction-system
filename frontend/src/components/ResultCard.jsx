//frontend/src/components/ResultCard.jsx
import { useState, useEffect } from "react";
import { convertSalary, getSupportedCurrencies, submitFeedback } from "../services/api";
import toast from 'react-hot-toast';

export default function ResultCard({ prediction }) {
  const [showConverter, setShowConverter] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState(prediction.currency || 'USD');
  const [convertedAmount, setConvertedAmount] = useState(prediction.predicted_salary || 0);
  const [supportedCurrencies, setSupportedCurrencies] = useState({});
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionError, setConversionError] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isLiked, setIsLiked] = useState(null);
  const [dislikeReason, setDislikeReason] = useState("");
  const [textExplanation, setTextExplanation] = useState("");
  const [improvementSuggestion, setImprovementSuggestion] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (isLiked === false && !dislikeReason) {
      setFeedbackError("Please select a reason for your dislike.");
      return;
    }
    
    setFeedbackLoading(true);
    setFeedbackError("");
    
    try {
      const payload = {
        prediction_id: prediction.prediction_id || null,
        country: prediction.country || "United States",
        education: prediction.education || "Postgraduate",
        experience: prediction.experience !== undefined ? prediction.experience : 5.0,
        predicted_salary_usd: prediction.predicted_salary_usd || prediction.predicted_salary || 0.0,
        is_liked: isLiked,
        dislike_reason: isLiked ? null : dislikeReason,
        text_explanation: textExplanation.trim() || null,
        improvement_suggestion: improvementSuggestion.trim() || null
      };
      
      await submitFeedback(payload);
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (err) {
      setFeedbackError(err.response?.data?.detail || "Feedback submission failed");
    } finally {
      setFeedbackLoading(false);
    }
  };

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
    setFeedbackSubmitted(false);
    setIsLiked(null);
    setDislikeReason("");
    setTextExplanation("");
    setImprovementSuggestion("");
    setFeedbackError("");
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

        /* Safe fallback to ensure select fields operate cleanly on mobile */
        @media (max-width: 1023px), (pointer: coarse) {
          .result-container *, .converter-panel * { cursor: auto !important; }
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

      <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 animate-fade-slide text-white result-container w-full max-w-full">
        {/* Original Salary: Neon Pink/Blue Glow Card */}
        <div className="relative flex flex-col justify-start items-start w-full group mx-auto">
          <div className="absolute w-full h-full opacity-35 rounded-[28px] sm:rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FF3D77 0%, #4361EE 100%)', filter: 'blur(40px) sm:blur(50px)' }} />
          
          <div className="self-stretch rounded-[28px] sm:rounded-[40px] z-10 overflow-hidden" style={{ border: '5px solid transparent', sm: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FF3D77 0%, #4361EE 100%) border-box' }}>
            <div className="w-full h-full p-5 sm:p-8 bg-[#1A1A1C]/90 backdrop-blur-md relative">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm uppercase tracking-widest font-semibold text-slate-300">Original Predicted Salary</p>
              </div>
              <p className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2 text-white font-mono break-words leading-tight" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                {formatCurrency(prediction.predicted_salary, prediction.currency)}
              </p>
              <p className="text-xs sm:text-sm text-slate-400">Based on your inputs in {prediction.currency}</p>
            </div>
          </div>
        </div>

        {/* Currency Converter Toggle */}
        <button
          onClick={() => setShowConverter(!showConverter)}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 sm:px-6 sm:py-4 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-800/80 text-white rounded-xl sm:rounded-[24px] transition-all duration-300 font-semibold text-xs sm:text-sm backdrop-blur-sm active:scale-[0.99]"
        >
          {showConverter ? "Hide Currency Converter" : "Convert to Another Currency"}
        </button>

        {/* Converter Panel */}
        {showConverter && (
          <div className="rounded-xl sm:rounded-[24px] bg-zinc-900/30 border border-zinc-800/80 shadow-md overflow-hidden animate-fade-slide converter-panel w-full">
            <div className="bg-zinc-950/40 px-5 py-3 sm:px-6 sm:py-4 border-b border-zinc-800/60">
              <h3 className="text-sm sm:text-base font-semibold text-white">Currency Converter</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl sm:rounded-[24px] px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {Object.entries(supportedCurrencies).map(([code, name]) => (
                  <option key={code} value={code} className="bg-zinc-900">{code} - {name}</option>
                ))}
              </select>
              
              <button
                onClick={handleConvert}
                disabled={conversionLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 sm:py-3.5 text-xs sm:text-sm rounded-xl sm:rounded-[24px] transition-all shadow-md disabled:opacity-50 active:scale-[0.99]"
              >
                {conversionLoading ? "Converting..." : "Convert Salary"}
              </button>
              
              {conversionError && (
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl sm:rounded-[24px] p-3 text-red-400 text-xs sm:text-sm break-words">{conversionError}</div>
              )}
            </div>
          </div>
        )}

        {/* Converted Salary Result */}
        {convertedAmount !== prediction.predicted_salary && targetCurrency !== prediction.currency && (
          <div className="relative flex flex-col justify-start items-start w-full group mx-auto animate-fade-slide">
            <div className="absolute w-full h-full opacity-35 rounded-[28px] sm:rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #10b981 0%, #06B6D4 100%)', filter: 'blur(35px)' }} />
            
            <div className="self-stretch rounded-[28px] sm:rounded-[40px] z-10 overflow-hidden" style={{ border: '5px solid transparent', sm: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #10b981 0%, #06B6D4 100%) border-box' }}>
              <div className="w-full h-full p-5 sm:p-8 bg-[#1A1A1C]/90 relative">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8" />
                  </svg>
                  <p className="text-xs sm:text-sm uppercase tracking-widest font-semibold text-slate-300">Converted Salary</p>
                </div>
                <p className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2 text-emerald-400 font-mono break-words leading-tight" style={{ fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)" }}>
                  {formatCurrency(convertedAmount, targetCurrency)}
                </p>
                <p className="text-xs sm:text-sm text-slate-400">Converted from {prediction.currency}</p>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Widget Panel */}
        <div className="rounded-xl sm:rounded-[24px] bg-zinc-900/30 border border-zinc-800/80 shadow-md overflow-hidden animate-fade-slide w-full p-4 sm:p-6 space-y-4">
          <div className="border-b border-zinc-800/60 pb-3">
            <h3 className="text-sm sm:text-base font-semibold text-white">Was this prediction accurate?</h3>
          </div>
          
          {feedbackSubmitted ? (
            <div className="text-center py-4 text-emerald-400 font-semibold text-xs sm:text-sm animate-fade-slide">
              ✓ Thank you for helping us improve our prediction models!
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsLiked(true); setDislikeReason(""); setFeedbackError(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                    isLiked === true 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-zinc-950/40 border-zinc-800 text-gray-400 hover:bg-zinc-800/30'
                  }`}
                >
                  👍 Yes, Looks Right
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLiked(false); setFeedbackError(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                    isLiked === false 
                      ? 'bg-red-500/20 border-red-500 text-red-400' 
                      : 'bg-zinc-950/40 border-zinc-800 text-gray-400 hover:bg-zinc-800/30'
                  }`}
                >
                  👎 No, Seems Wrong
                </button>
              </div>

              {isLiked === false && (
                <div className="space-y-3.5 animate-fade-slide">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">Why does this look incorrect? (Mandatory)</label>
                    <select
                      value={dislikeReason}
                      onChange={(e) => { setDislikeReason(e.target.value); setFeedbackError(""); }}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                      <option value="">-- Select Reason --</option>
                      <option value="Too High">Too High</option>
                      <option value="Too Low">Too Low</option>
                      <option value="Incorrect Data Mapping">Incorrect Data Mapping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">Explain details (Optional)</label>
                    <textarea
                      value={textExplanation}
                      onChange={(e) => setTextExplanation(e.target.value)}
                      rows={2}
                      placeholder="Share details about why this prediction seems wrong..."
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {isLiked !== null && (
                <div className="space-y-3.5 animate-fade-slide">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1.5">Improvement suggestions (Optional)</label>
                    <textarea
                      value={improvementSuggestion}
                      onChange={(e) => setImprovementSuggestion(e.target.value)}
                      rows={2}
                      placeholder="How can we make these predictions better?"
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={feedbackLoading || (isLiked === false && !dislikeReason)}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 text-xs sm:text-sm rounded-xl transition disabled:opacity-40"
                  >
                    {feedbackLoading ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}

              {feedbackError && (
                <div className="text-red-400 text-[11px] sm:text-xs bg-red-950/30 border border-red-900/40 rounded-xl p-2.5 animate-fade-slide">
                  ⚠️ {feedbackError}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}