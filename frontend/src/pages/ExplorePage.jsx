// frontend/src/pages/ExplorePage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchFilteredAnalytics, fetchAnalytics } from '../services/api';
import { motion } from 'framer-motion';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';

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

    const CONNECT_DIST = window.innerWidth < 768 ? 120 : 170;
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

const chartSections = [
  { id: 'meanSalaryByCountry', label: 'Mean Salary by Country' },
  { id: 'salaryVsExperience', label: 'Salary vs Experience' },
  { id: 'educationPie', label: 'Salary Distribution by Education' },
  { id: 'salaryGrowthArea', label: 'Salary Growth by Experience' },
  { id: 'countryDonut', label: 'Country-wise Employee Distribution' },
  { id: 'topPayingCountries', label: 'Top Paying Countries' },
  { id: 'stackedEducationByCountry', label: 'Education vs Salary by Country' },
  { id: 'experienceScatter', label: 'Experience vs Salary Correlation' },
];

const chartColors = [
  '#3b82f6', 
  '#10b981', 
  '#fbbf24', 
  '#a78bfa', 
  '#2dd4bf', 
  '#f472b6', 
  '#fb923c', 
  '#38bdf8', 
];

const formatCurrency = (value) =>
  value == null || Number.isNaN(value)
    ? '-'
    : `$${Number(value).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`;

const formatNumber = (value) =>
  value == null || Number.isNaN(value)
    ? '-'
    : Number(value).toLocaleString();

export default function ExplorePage() {
  const [allCountries, setAllCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');

  const [allEducationLevels, setAllEducationLevels] = useState([]);
  const [selectedEducationLevels, setSelectedEducationLevels] = useState([]);
  const [educationSearch, setEducationSearch] = useState('');

  const [experienceRange, setExperienceRange] = useState([0, 50]);

  const [analytics, setAnalytics] = useState({
    summary_stats: { average_salary: 0, highest_salary: 0, lowest_salary: 0, total_records: 0 },
    mean_salary_by_country: [],
    education_salary_distribution: [],
    country_distribution: [],
    experience_salary_points: [],
    education_salary_by_country: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [chartVisibility, setChartVisibility] = useState({
    meanSalaryByCountry: true,
    salaryVsExperience: true,
    educationPie: true,
    salaryGrowthArea: true,
    countryDonut: true,
    topPayingCountries: true,
    stackedEducationByCountry: true,
    experienceScatter: true,
  });

  const [modalChartId, setModalChartId] = useState(null);
  const abortControllerRef = useRef(null);

  const axisLabelConfig = { fill: '#f8fafc', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' };
  const gridConfig = { stroke: '#475569', strokeDasharray: '4 4', opacity: 0.6 };
  const tooltipBaseStyle = {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #38bdf8',
    padding: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    cursor: 'none' 
  };
  const tooltipItemStyle = { color: '#f8fafc', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)' };
  const tooltipLabelStyle = { color: '#38bdf8', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' };

  // Initial load configuration
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetchAnalytics();
        const data = res?.data || {};
        
        const countries = data.mean_salary_by_country?.map((item) => item.category || item.country) || [];
        const educationLevels = (data.education_salary_distribution || data.education_salary_comparison || [])
          .map((item) => item.category || item.EdLevel || item.education)
          .filter(Boolean);
        const uniqueEducation = Array.from(new Set(educationLevels)).sort();
        
        setAllCountries(countries);
        setSelectedCountries(countries);
        setAllEducationLevels(uniqueEducation);
        setSelectedEducationLevels(uniqueEducation);
        setAnalytics(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load initial analytics. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Filtered fetch execution
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (selectedCountries.length === 0 || selectedEducationLevels.length === 0) {
      setAnalytics({
        summary_stats: { average_salary: 0, highest_salary: 0, lowest_salary: 0, total_records: 0 },
        mean_salary_by_country: [],
        education_salary_distribution: [],
        country_distribution: [],
        experience_salary_points: [],
        education_salary_by_country: [],
      });
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const res = await fetchFilteredAnalytics(selectedCountries);
        if (res?.data) {
          setAnalytics(res.data);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError('Failed to load analytics. Please check your filters.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [selectedCountries, selectedEducationLevels, experienceRange]);

  const handleCountryToggle = (country) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((item) => item !== country) : [...prev, country]
    );
  };

  const handleEducationToggle = (education) => {
    setSelectedEducationLevels((prev) =>
      prev.includes(education) ? prev.filter((item) => item !== education) : [...prev, education]
    );
  };

  const handleSelectAllCountries = () => {
    setSelectedCountries([...allCountries]);
  };

  const handleSelectAllEducation = () => {
    setSelectedEducationLevels([...allEducationLevels]);
  };

  const openModal = (chartId) => setModalChartId(chartId);
  const closeModal = () => setModalChartId(null);

  const visibleCountries = useMemo(() => {
    return allCountries.filter((country) =>
      country?.toLowerCase().includes(countrySearch?.toLowerCase())
    );
  }, [allCountries, countrySearch]);

  const visibleEducationLevels = useMemo(() => {
    return allEducationLevels.filter((level) =>
      level?.toLowerCase().includes(educationSearch?.toLowerCase())
    );
  }, [allEducationLevels, educationSearch]);

  const hasValidData = !!analytics;
  const avgSalary = hasValidData ? analytics?.summary_stats?.average_salary ?? 0 : 0;
  const highestSalary = hasValidData ? analytics?.summary_stats?.highest_salary ?? 0 : 0;
  const lowestSalary = hasValidData ? analytics?.summary_stats?.lowest_salary ?? 0 : 0;
  const totalRecords = hasValidData ? analytics?.summary_stats?.total_records ?? 0 : 0;

  const educationPieData = useMemo(() => {
    const rawData = analytics?.education_salary_distribution || analytics?.education_salary_comparison || [];
    return rawData
      .map(item => ({
        ...item,
        category: item.category || item.EdLevel || item.education,
        mean_salary: item.mean_salary || item.salary || 0
      }))
      .filter((item) => selectedEducationLevels.includes(item?.category));
  }, [analytics, selectedEducationLevels]);

  const countryDistribution = useMemo(() => {
    return (analytics?.country_distribution || []).map(item => ({
      ...item,
      country: item.country || item.category,
      count: item.count || item.value || 0
    }));
  }, [analytics]);

  const experiencePoints = useMemo(() => {
    return (analytics?.experience_salary_points || []).map(item => ({
      ...item,
      experience: item.experience != null ? item.experience : item.category,
      mean_salary: item.mean_salary || item.salary || 0
    }));
  }, [analytics]);

  const filteredExperiencePoints = useMemo(() => {
    return experiencePoints.filter(
      (item) => item?.experience >= experienceRange[0] && item?.experience <= experienceRange[1]
    );
  }, [experiencePoints, experienceRange]);

  const topPayingCountries = useMemo(() => {
    const data = analytics?.mean_salary_by_country || [];
    return data
      .map(item => ({
        ...item,
        category: item.category || item.country || "Unknown",
        mean_salary: item.mean_salary || item.salary || 0
      }))
      .slice()
      .sort((a, b) => (b?.mean_salary ?? 0) - (a?.mean_salary ?? 0))
      .slice(0, 8);
  }, [analytics]);

  // FIX: Fixed item text parsing normalizers tracking precise capitalization strings
  const stackedEducationData = useMemo(() => {
    if (!analytics?.education_salary_by_country) return [];
    const grouped = {};
    analytics.education_salary_by_country.forEach((item) => {
      if (!item) return;
      const eduLevel = item.education || item.EdLevel || item.category;
      const ctry = item.country || item.category;
      const salary = item.mean_salary || item.salary || 0;
      
      if (!ctry || !eduLevel) return;
      
      if (!grouped[ctry]) {
        grouped[ctry] = { country: ctry };
      }
      grouped[ctry][eduLevel] = salary;
    });
    return Object.values(grouped);
  }, [analytics, selectedEducationLevels]);

  const renderChartContent = (chartId, isModal = false) => {
    const commonProps = { width: '100%', height: isModal ? '100%' : 320 };
    switch (chartId) {
      case 'meanSalaryByCountry':
        const barData = analytics?.mean_salary_by_country?.map(item => ({
          category: item.category || item.country,
          mean_salary: item.mean_salary || item.salary
        })) || [];
        return barData.length ? (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={barData}>
              <CartesianGrid {...gridConfig} />
              <XAxis dataKey="category" tick={axisLabelConfig} />
              <YAxis tick={axisLabelConfig} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Bar dataKey="mean_salary" fill="#38bdf8" radius={[10, 10, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'salaryVsExperience':
        return filteredExperiencePoints.length ? (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={filteredExperiencePoints}>
              <CartesianGrid {...gridConfig} />
              <XAxis dataKey="experience" tick={axisLabelConfig} />
              <YAxis tick={axisLabelConfig} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Line type="monotone" dataKey="mean_salary" stroke="#38bdf8" strokeWidth={4} activeDot={{ r: 8, strokeWidth: 0 }} dot={{ r: 4, strokeWidth: 0, fill: '#60a5fa' }} name="Mean Salary" />
            </LineChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'educationPie':
        return educationPieData.length ? (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie data={educationPieData} dataKey="mean_salary" nameKey="category" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {educationPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Legend formatter={(value) => <span className="text-slate-100 font-semibold text-xs">{value}</span>} layout="horizontal" verticalAlign="bottom" align="center" iconSize={12} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'salaryGrowthArea':
        return filteredExperiencePoints.length ? (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={filteredExperiencePoints}>
              <CartesianGrid {...gridConfig} />
              <XAxis dataKey="experience" tick={axisLabelConfig} />
              <YAxis tick={axisLabelConfig} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Area type="monotone" dataKey="mean_salary" fill="#1d4ed8" stroke="#60a5fa" strokeWidth={3} fillOpacity={0.45} name="Growth Vector" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'countryDonut':
        return countryDistribution.length ? (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie data={countryDistribution} dataKey="count" nameKey="country" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {countryDistribution.map((entry, index) => (
                  <Cell key={`cell-donut-${index}`} fill={chartColors[index % chartColors.length]} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Legend formatter={(value) => <span className="text-slate-100 font-semibold text-xs">{value}</span>} layout="horizontal" verticalAlign="bottom" align="center" iconSize={12} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'topPayingCountries':
        return topPayingCountries.length ? (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={topPayingCountries} layout="vertical">
              <CartesianGrid {...gridConfig} />
              <XAxis type="number" tick={axisLabelConfig} stroke="#f8fafc" tickFormatter={(val) => `$${val / 1000}k`} />
              <YAxis dataKey="category" type="category" width={110} tick={axisLabelConfig} stroke="#f8fafc" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Bar dataKey="mean_salary" fill="#fb923c" radius={[0, 8, 8, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'stackedEducationByCountry':
        return stackedEducationData.length ? (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={stackedEducationData}>
              <CartesianGrid {...gridConfig} />
              <XAxis dataKey="country" tick={axisLabelConfig} />
              <YAxis tick={axisLabelConfig} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.08)' }} formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Legend formatter={(value) => <span className="text-slate-100 font-semibold text-xs">{value}</span>} layout="horizontal" verticalAlign="bottom" align="center" iconSize={12} />
              {/* FIX: Ensure bars are dynamically generated from current tracked filters safely */}
              {allEducationLevels.filter(lvl => selectedEducationLevels.includes(lvl)).map((level, idx) => (
                <Bar key={level} dataKey={level} stackId="a" fill={chartColors[idx % chartColors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      case 'experienceScatter':
        return filteredExperiencePoints.length ? (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart>
              <CartesianGrid {...gridConfig} />
              <XAxis dataKey="experience" type="number" tick={axisLabelConfig} stroke="#f8fafc" name="Experience" unit="yrs" />
              <YAxis dataKey="mean_salary" type="number" tick={axisLabelConfig} stroke="#f8fafc" tickFormatter={(val) => `$${val / 1000}k`} name="Salary" />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#38bdf8' }} formatter={(value) => formatCurrency(value)} contentStyle={tooltipBaseStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
              <Scatter data={filteredExperiencePoints} fill="#2dd4bf" line={false} shape="circle" r={6} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : <div className="flex items-center justify-center h-full text-slate-400 font-semibold">No data available</div>;
      default:
        return null;
    }
  };

  const renderChartHeader = (title, description, chartId) => (
    <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => openModal(chartId)}
        className="rounded-full border border-zinc-700 bg-zinc-900/60 backdrop-blur-sm px-3 py-1 text-xs font-bold text-gray-200 hover:bg-zinc-800 hover:text-white transition shadow-sm"
      >
        Max
      </button>
    </div>
  );

  const showEmptyEducationMessage = selectedCountries.length > 0 && selectedEducationLevels.length === 0;
  const showNoCountryMessage = selectedCountries.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap');

        :root {
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'Manrope', sans-serif;
        }

        @media (hover:hover) and (pointer:fine) {
          *, html, body, a, button, select, input, label {
            cursor: none !important;
          }
          
          .recharts-wrapper,
          .recharts-surface,
          .recharts-wrapper *,
          .recharts-tooltip-wrapper,
          .recharts-active-dot {
            cursor: none !important;
          }
        }

        @keyframes float-in {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float {
          animation: float-in 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) both;
        }
        .animate-float-delay {
          animation: float-in 0.7s 0.15s both;
        }
        .animate-float-delay-2 {
          animation: float-in 0.7s 0.3s both;
        }

        .glass-panel {
          background: rgba(10, 15, 30, 0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        @media (pointer: fine) {
          .card-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-[#03060f] via-[#050b1a] to-[#070e24] flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 font-sans overflow-x-hidden relative">
        <NeuralCanvas />

        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <div className="animate-float inline-flex items-center gap-2 bg-sky-500/10 backdrop-blur-md rounded-full px-5 py-2 border border-sky-500/20 shadow-sm mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
              <span className="text-sm font-semibold text-sky-400 tracking-wide">Data Insights</span>
            </div>
            <h1 className="animate-float text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Salary Trends & {' '}
              <span className="bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
                Workforce Insights
              </span>
            </h1>
            <p className="animate-float-delay text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Explore salary analytics interactively using country, education, and experience filters.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
            <section className="space-y-6">
              <div className="glass-panel rounded-3xl p-5 shadow-sm card-hover">
                <h2 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Filters</h2>

                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <h3 className="text-sm font-bold text-slate-200">Countries</h3>
                    <button onClick={handleSelectAllCountries} className="text-[11px] px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition font-bold uppercase tracking-wide">Select All</button>
                  </div>
                  <input
                    type="search"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country"
                    className="w-full border border-zinc-800 rounded-2xl px-4 py-2 text-sm bg-zinc-950/50 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="max-h-64 overflow-y-auto mt-3 border border-zinc-800/60 rounded-3xl p-3 bg-zinc-950/40 backdrop-blur-sm select-none">
                    {visibleCountries.map((country) => (
                      <label key={country} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer">
                        <input type="checkbox" className="accent-sky-500 scale-110" checked={selectedCountries.includes(country)} onChange={() => handleCountryToggle(country)} />
                        <span className="text-sm font-medium text-gray-200">{country}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <h3 className="text-sm font-bold text-slate-200">Education</h3>
                    <button onClick={handleSelectAllEducation} className="text-[11px] px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition font-bold uppercase tracking-wide">Select All</button>
                  </div>
                  <input
                    type="search"
                    value={educationSearch}
                    onChange={(e) => setEducationSearch(e.target.value)}
                    placeholder="Search education"
                    className="w-full border border-zinc-800 rounded-2xl px-4 py-2 text-sm bg-zinc-950/50 text-white backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <div className="max-h-52 overflow-y-auto mt-3 border border-zinc-800/60 rounded-3xl p-3 bg-zinc-950/40 backdrop-blur-sm select-none">
                    {visibleEducationLevels.map((education) => (
                      <label key={education} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer">
                        <input type="checkbox" className="accent-sky-500 scale-110" checked={selectedEducationLevels.includes(education)} onChange={() => handleEducationToggle(education)} />
                        <span className="text-sm font-medium text-gray-200">{education}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border border-zinc-800/60 rounded-3xl p-4 bg-zinc-950/40 backdrop-blur-sm select-none">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-200">Experience Range</h3>
                    <span className="text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-full">{experienceRange[0]} - {experienceRange[1]} yrs</span>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-300">Minimum Experience</label>
                    <input type="range" min={0} max={50} value={experienceRange[0]} onChange={(e) => setExperienceRange([Math.min(Number(e.target.value), experienceRange[1]), experienceRange[1]])} className="w-full mt-2 accent-sky-500" />
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-300">Maximum Experience</label>
                    <input type="range" min={0} max={50} value={experienceRange[1]} onChange={(e) => setExperienceRange([experienceRange[0], Math.max(Number(e.target.value), experienceRange[0])])} className="w-full mt-2 accent-sky-500" />
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-3xl p-5 shadow-sm card-hover select-none">
                <h2 className="text-lg font-bold text-white mb-4 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Chart Visibility</h2>
                <div className="space-y-3">
                  {chartSections.map((section) => (
                    <label key={section.id} className="flex items-center gap-3 bg-zinc-950/40 backdrop-blur-sm border border-zinc-800/60 rounded-2xl px-4 py-3 hover:bg-white/5 transition cursor-pointer">
                      <input type="checkbox" className="accent-sky-500" checked={chartVisibility[section.id]} onChange={() => setChartVisibility((prev) => ({ ...prev, [section.id]: !prev[section.id] }))} />
                      <span className="text-sm font-medium text-gray-200">{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative flex flex-col justify-start items-start w-full group mx-auto">
                  <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)', filter: 'blur(45px)' }} />
                  <div className="self-stretch rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%) border-box' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between backdrop-blur-md">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Average Salary</p>
                      <p className="text-3xl font-extrabold mt-2 tracking-tight text-white">{formatCurrency(avgSalary)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative flex flex-col justify-start items-start w-full group mx-auto">
                  <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)', filter: 'blur(45px)' }} />
                  <div className="self-stretch rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%) border-box' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between backdrop-blur-md">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Highest Salary</p>
                      <p className="text-3xl font-extrabold mt-2 tracking-tight text-white">{formatCurrency(highestSalary)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative flex flex-col justify-start items-start w-full group mx-auto">
                  <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)', filter: 'blur(45px)' }} />
                  <div className="self-stretch rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%) border-box' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between backdrop-blur-md">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Lowest Salary</p>
                      <p className="text-3xl font-extrabold mt-2 tracking-tight text-white">{formatCurrency(lowestSalary)}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="relative flex flex-col justify-start items-start w-full group mx-auto">
                  <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: 'linear-gradient(137deg, #10b981 0%, #a7f3d0 45%, #059669 100%)', filter: 'blur(45px)' }} />
                  <div className="self-stretch rounded-[40px] z-10 overflow-hidden card-hover" style={{ border: '8px solid transparent', background: 'linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, linear-gradient(137deg, #10b981 0%, #a7f3d0 45%, #059669 100%) border-box' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between backdrop-blur-md">
                      <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Total Records</p>
                      <p className="text-3xl font-extrabold mt-2 tracking-tight text-white">{formatNumber(totalRecords)}</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {showNoCountryMessage && (
                <div className="rounded-[40px] border border-dashed border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-16 text-center animate-float">
                  <p className="text-2xl font-bold text-white">Please click F5 or refresh the page.</p>
                </div>
              )}

              {showEmptyEducationMessage && !showNoCountryMessage && (
                <div className="rounded-[40px] border border-dashed border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-16 text-center animate-float">
                  <p className="text-2xl font-bold text-white">Select at least one education level</p>
                  <p className="mt-2 text-slate-300">Choose education levels from the left sidebar to see data.</p>
                </div>
              )}

              {loading && !showNoCountryMessage && !showEmptyEducationMessage && (
                <div className="glass-panel rounded-[40px] p-16 text-center">
                  <div className="animate-spin h-10 w-10 border-b-2 border-sky-500 rounded-full mx-auto"></div>
                  <p className="mt-4 text-slate-300">Loading analytics...</p>
                </div>
              )}

              {error && !loading && !showNoCountryMessage && !showEmptyEducationMessage && (
                <div className="bg-red-950/30 border border-red-900/40 text-red-400 rounded-2xl p-4 backdrop-blur-sm">
                  {error}
                </div>
              )}

              {!loading && !showNoCountryMessage && !showEmptyEducationMessage && !error && analytics && (
                <div className="grid gap-6 xl:grid-cols-2">
                  {chartSections.map((section, idx) => {
                    if (!chartVisibility[section.id]) return null;
                    
                    const glows = [
                      'linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)',
                      'linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)',
                      'linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)',
                      'linear-gradient(137deg, #10b981 0%, #a7f3d0 45%, #059669 100%)'
                    ];
                    const activeGlow = glows[idx % glows.length];

                    return (
                      <div key={section.id} className="relative flex flex-col justify-start items-start w-full group mx-auto">
                        <div className="absolute w-full h-full opacity-35 rounded-[40px] pointer-events-none" style={{ background: activeGlow, filter: 'blur(45px)' }} />
                        <div className="self-stretch rounded-[40px] z-10 overflow-hidden w-full card-hover" style={{ border: '8px solid transparent', background: `linear-gradient(rgba(11,18,36,0.5), rgba(11,18,36,0.5)) padding-box, ${activeGlow} border-box` }}>
                          <div className="w-full h-full p-5 flex flex-col justify-between backdrop-blur-md">
                            {renderChartHeader(section.label, `Insights for ${section.label}`, section.id)}
                            <div className="h-[320px] w-full mt-4">
                              {renderChartContent(section.id, false)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Modal Focus Overlay */}
          {modalChartId !== null && (
            <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 backdrop-blur-md transition-all duration-300" onClick={closeModal}>
              <div className="relative bg-zinc-950/95 backdrop-blur-lg rounded-[40px] shadow-2xl w-[90vw] h-[85vh] p-6 flex flex-col border border-zinc-800/60" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {chartSections.find(s => s.id === modalChartId)?.label || 'Chart'}
                  </h2>
                  <button onClick={closeModal} className="rounded-full p-2 hover:bg-white/5 border border-transparent hover:border-white/10 text-slate-400 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 w-full min-h-0">
                  {renderChartContent(modalChartId, true)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}