// PredictionForm.jsx
import { useState } from 'react';
import { predictSalary } from '../services/api';
import ResultCard from './ResultCard';
import LoadingSpinner from './LoadingSpinner';

const countries = [
  "United States", "India", "United Kingdom", "Germany", "Canada",
  "Brazil", "France", "Spain", "Australia", "Netherlands",
  "Poland", "Italy", "Russian Federation", "Sweden"
];

export default function PredictionForm() {
  const [country, setCountry] = useState('United States');
  const [education, setEducation] = useState('Postgraduate');
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
      const response = await predictSalary({ country, education, experience });
      setPrediction(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Prediction failed");
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
        .accent-glow {
          accent-color: #38bdf8;
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
              {countries.map(c => <option key={c} value={c} className="bg-zinc-900">{c}</option>)}
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
                  onClick={() => setEducation(level)}
                  className={`py-3 rounded-2xl text-sm font-semibold transition-all border ${
                    education === level 
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
            <input
              type="range"
              min="0"
              max="50"
              value={experience}
              onChange={(e) => setExperience(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="animate-fade-slide w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)]"
            style={{ animationDelay: "0.15s" }}
          >
            Predict Salary
          </button>
        </form>

        {loading && <LoadingSpinner />}

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 text-red-400 text-sm animate-fade-slide">
            {error}
          </div>
        )}

        {prediction && (
          <div className="animate-fade-slide" style={{ animationDelay: "0.2s" }}>
            <ResultCard prediction={prediction} />
          </div>
        )}
      </div>
    </>
  );
}