import { useState } from 'react';
import { predictSalary } from '../services/api';
import ResultCard from './ResultCard';
import LoadingSpinner from './LoadingSpinner';

const countries = [
  "United States", "India", "United Kingdom", "Germany", "Canada",
  "Brazil", "France", "Spain", "Australia", "Netherlands",
  "Poland", "Italy", "Russian Federation", "Sweden"
];

// ─── ML MODEL MAPPING OBJECTS ──────────────────────────────────────────────
const EDUCATION_MAPPING = {
  'Undergraduate': "Bachelor’s degree",
  'Postgraduate': "Master’s degree"
};

export default function PredictionForm() {
  const [country, setCountry] = useState('United States');
  const [uiEducation, setUiEducation] = useState('Postgraduate');
  const [experience, setExperience] = useState(5);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);
    
    try {
      const mappedEducation = EDUCATION_MAPPING[uiEducation] || uiEducation;

      const payload = {
        country: country,
        education: mappedEducation,
        experience: parseFloat(experience) // 🌟 FIXED: Changed float() to native parseFloat()
      };

      const response = await predictSalary(payload);
      setPrediction(response.data);
    } catch (err) {
      console.error("Prediction Handshake Error:", err);
      setError(err.response?.data?.detail || "Prediction failed. Check network pipelines or server status keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .input-glass {
          background: rgba(10, 15, 30, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        .input-glass:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
        }
        
        @keyframes fade-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-slide {
          animation: fade-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        
        select option {
          background-color: #0d1527;
          color: #ffffff;
        }
      `}</style>

      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Country Select */}
          <div className="animate-fade-slide">
            <label className="block text-sm font-semibold text-slate-300 mb-2">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full input-glass rounded-2xl px-4 py-3 text-white focus:outline-none transition-all"
            >
              {countries.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Education Level Pills */}
          <div className="animate-fade-slide" style={{ animationDelay: "0.05s" }}>
            <label className="block text-sm font-semibold text-slate-300 mb-3">Education Level</label>
            <div className="grid grid-cols-2 gap-3">
              {['Undergraduate', 'Postgraduate'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUiEducation(level)}
                  className={`py-3 rounded-2xl text-sm font-semibold transition-all border ${
                    uiEducation === level 
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                      : 'bg-zinc-900/40 border-zinc-800 text-gray-400 hover:bg-zinc-800/50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Slider */}
          <div className="animate-fade-slide" style={{ animationDelay: "0.1s" }}>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-semibold text-slate-300">Years of Experience</label>
              <span className="text-sm font-bold text-sky-400">{experience} years</span>
            </div>
            <div className="w-full bg-zinc-900/20 border border-white/5 rounded-2xl p-4 flex items-center">
              <input
                type="range"
                min="0"
                max="50"
                value={experience}
                onChange={(e) => setExperience(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="animate-fade-slide w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] disabled:opacity-50"
            style={{ animationDelay: "0.15s" }}
          >
            {loading ? "Calculating..." : "Predict Salary"}
          </button>
        </form>

        {loading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 text-red-400 text-sm animate-fade-slide">
            <div className="flex gap-2 items-start">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {prediction && !loading && (
          <div className="animate-fade-slide" style={{ animationDelay: "0.2s" }}>
            <ResultCard prediction={prediction} />
          </div>
        )}
      </div>
    </>
  );
}