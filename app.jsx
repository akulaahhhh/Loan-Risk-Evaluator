import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { AlertCircle, ArrowRight, Activity, DollarSign, Users, Calendar, Calculator, ChevronLeft, Zap, X, List } from 'lucide-react';

/**
 * FUZZY LOGIC CONSTANTS & HELPER FUNCTIONS
 */

const MFS = {
  age: {
    min: 18, max: 90, unit: 'yrs',
    sets: {
      Young: [18, 18, 25, 30],
      Adult: [20, 30, 55, 65],
      Senior: [60, 65, 100, 100]
    }
  },
  income: {
    min: 0, max: 10000, unit: '$',
    sets: {
      Low: [0, 0, 2500, 3500],
      Medium: [2500, 4500, 4500, 6500], 
      High: [5500, 7000, 10000, 10000]
    }
  },
  coIncome: {
    min: 0, max: 10000, unit: '$',
    sets: {
      Low: [0, 0, 2500, 3500],
      Medium: [2500, 4500, 4500, 6500],
      High: [5500, 7000, 10000, 10000]
    }
  },
  installment: {
    min: 0, max: 10000, unit: '$',
    sets: {
      Low: [0, 0, 2000, 3000],
      Medium: [2000, 3750, 3750, 5500],
      High: [4500, 5500, 10000, 10000]
    }
  },
  dependents: {
    min: 0, max: 6, unit: 'ppl',
    sets: {
      Low: [0, 0, 1, 2],
      Medium: [1, 2.5, 2.5, 4],
      High: [3, 4, 6, 6] 
    }
  },
  risk: { // Output
    min: 0, max: 100, unit: '%',
    sets: {
      Low: [0, 0, 20, 40],
      Medium: [30, 50, 50, 70],
      High: [60, 80, 100, 100]
    }
  }
};

// For Displaying pretty names in rules
const FIELD_LABELS = {
  age: 'Age',
  income: 'Monthly Income',
  coIncome: 'Co-Applicant Income',
  installment: 'Monthly Installment',
  dependents: 'Dependents'
};

const getMembership = (x, [a, b, c, d]) => {
  if (x <= a || x >= d) return 0;
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
};

const getRiskLabel = (score) => {
  if (score < 40) return "Low Risk";
  if (score < 70) return "Medium Risk";
  return "High Risk";
};

// Fuzzy Rules Base
const RULES = [
  // Original Rules
  { if: { income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Low income, High debt" },
  { if: { income: 'Low', dependents: 'High' }, then: { risk: 'High' }, desc: "Low income, High dependents" },
  { if: { age: 'Young', income: 'Low', coIncome: 'Low' }, then: { risk: 'High' }, desc: "Young, Low income, No co-signer" },
  { if: { age: 'Senior', installment: 'High' }, then: { risk: 'High' }, desc: "Senior with High Installment" },
  { if: { income: 'High', installment: 'Low' }, then: { risk: 'Low' }, desc: "High income, Low debt" },
  { if: { income: 'High', dependents: 'Low' }, then: { risk: 'Low' }, desc: "High income, Few dependents" },
  { if: { age: 'Adult', income: 'Medium', coIncome: 'High' }, then: { risk: 'Low' }, desc: "Adult, Medium income, Strong co-signer" },
  { if: { income: 'Medium', installment: 'Low', coIncome: 'Medium' }, then: { risk: 'Low' }, desc: "Medium stats with low debt" },
  { if: { income: 'Medium', installment: 'Medium', dependents: 'Medium' }, then: { risk: 'Medium' }, desc: "Average across board" },
  { if: { income: 'Low', coIncome: 'High' }, then: { risk: 'Medium' }, desc: "Low income but Rich co-signer" },
  { if: { age: 'Young', income: 'High', installment: 'High' }, then: { risk: 'Medium' }, desc: "Young, High income, High debt" },
  { if: { age: 'Senior', income: 'Medium', dependents: 'Low' }, then: { risk: 'Medium' }, desc: "Senior, Medium income, Few dependents" },
  
  // New Rules Added
  { if: { income: 'Medium', installment: 'High' }, then: { risk: 'High' }, desc: "Medium income, High debt (Insolvency Risk)" },
  { if: { age: 'Senior', income: 'Low' }, then: { risk: 'High' }, desc: "Senior Vulnerability (Fixed Income)" },
  { if: { installment: 'High', coIncome: 'High' }, then: { risk: 'Medium' }, desc: "High debt mitigated by Co-Signer" }
];

/**
 * COMPONENT: FIRE CANVAS (Particles)
 */
const FireCanvas = memo(({ intensity }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Resize
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const particleCount = intensity * 200; 

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.speed = Math.random() * 4 + 1;
        this.size = Math.random() * 8 + 4;
        this.color = `rgba(255, ${Math.random() * 100 + 100}, 50, ${Math.random() * 0.5 + 0.5})`; // Brighter/Oranger for dark mode
        this.decay = Math.random() * 0.02 + 0.01;
        this.life = 1;
      }
      update() {
        this.y -= this.speed;
        this.x += (Math.random() - 0.5) * 1.5;
        this.life -= this.decay;
        if (this.life <= 0) this.reset();
      }
      draw() {
        ctx.fillStyle = this.color.replace(/[\d\.]+\)$/g, `${this.life})`);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen'; 
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [intensity]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80 rounded-xl mix-blend-screen" />;
});

/**
 * COMPONENT: GRADIENT DEFS
 */
const GradientDefs = () => (
  <defs>
    <linearGradient id="grad-blue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
    </linearGradient>
    <linearGradient id="grad-green" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
    </linearGradient>
    <linearGradient id="grad-red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
    </linearGradient>
    <linearGradient id="grad-stroke-blue" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#60a5fa" />
      <stop offset="100%" stopColor="#3b82f6" />
    </linearGradient>
    {/* Final Graph Gradient */}
    <linearGradient id="grad-final" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
    </linearGradient>
  </defs>
);

/**
 * COMPONENT: MEMBERSHIP GRAPH (Input Dashboard)
 */
const MembershipGraph = memo(({ type, value, width = 300, height = 80, showValue = true }) => {
  const config = MFS[type];
  const { min, max, sets } = config;
  const range = max - min;
  
  const getX = (val) => ((val - min) / range) * width;
  const gradients = ['url(#grad-blue)', 'url(#grad-green)', 'url(#grad-red)'];
  const strokeColors = ['#60a5fa', '#34d399', '#f87171'];
  
  return (
    <div className="relative mt-4 mb-2 pointer-events-none select-none">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <GradientDefs />
        <line x1="0" y1={height} x2={width} y2={height} stroke="#374151" strokeWidth="1" />
        
        {Object.entries(sets).map(([name, coords], idx) => {
          const [a, b, c, d] = coords;
          const points = `${getX(a)},${height} ${getX(b)},0 ${getX(c)},0 ${getX(d)},${height}`;
          return (
            <g key={name}>
              <polygon points={points} fill={gradients[idx % 3]} stroke={strokeColors[idx % 3]} strokeWidth="2" strokeLinejoin="round" />
              <text x={getX((b+c)/2)} y="-8" textAnchor="middle" fontSize="10" fill={strokeColors[idx % 3]} fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {name}
              </text>
            </g>
          );
        })}

        {showValue && (
          <g transform={`translate(${getX(value)}, 0)`} className="transition-transform duration-100 ease-out">
            <line y1="-10" y2={height} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />
            <circle cy={height} r="4" fill="#fbbf24" stroke="#1f2937" strokeWidth="2" />
            <rect x="-12" y={height + 10} width="24" height="16" rx="4" fill="#fbbf24" />
            <text y={height + 21} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1f2937">
              {value}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});

/**
 * COMPONENT: MAMDANI ANTECEDENT GRAPH
 */
const AntecedentGraph = memo(({ varName, setName, value, membership, width = 180, height = 100 }) => {
  const config = MFS[varName];
  const { min, max, sets } = config;
  const range = max - min;
  const coords = sets[setName];

  const getX = (val) => ((val - min) / range) * width;
  const getY = (val) => height - (val * height);

  const points = `${getX(coords[0])},${height} ${getX(coords[1])},0 ${getX(coords[2])},0 ${getX(coords[3])},${height}`;
  const intersectY = getY(membership);
  const intersectX = getX(value);

  return (
    <div className="flex flex-col items-center">
        <div className="text-xs text-gray-400 font-mono mb-1">{FIELD_LABELS[varName] || varName} = {value}</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className="bg-gray-800 rounded border border-gray-700">
            <line x1="0" y1={height} x2={width} y2={height} stroke="#4b5563" strokeWidth="1" />
            <polygon points={points} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" />
            <line x1={intersectX} y1={height} x2={intersectX} y2={intersectY} stroke="#fbbf24" strokeWidth="2" />
            <circle cx={intersectX} cy={intersectY} r="3" fill="#fbbf24" />
            <line x1={intersectX} y1={intersectY} x2={width} y2={intersectY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill="#9ca3af">{setName}</text>
            <text x={intersectX + 5} y={intersectY - 5} fontSize="10" fill="#fbbf24" fontWeight="bold">μ={membership.toFixed(2)}</text>
        </svg>
    </div>
  );
});

/**
 * COMPONENT: MAMDANI CONSEQUENT GRAPH
 */
const ConsequentGraph = memo(({ outputSet, strength, width = 180, height = 100 }) => {
  const coords = MFS.risk.sets[outputSet];
  // Risk is 0-100
  const getX = (val) => (val / 100) * width;
  const getY = (val) => height - (val * height);
  
  const points = `${getX(coords[0])},${height} ${getX(coords[1])},0 ${getX(coords[2])},0 ${getX(coords[3])},${height}`;
  const clipY = getY(strength);

  return (
    <div className="flex flex-col items-center">
        <div className="text-xs text-gray-400 font-mono mb-1">Risk ({outputSet})</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className="bg-gray-800 rounded border border-gray-700">
            <line x1="0" y1={height} x2={width} y2={height} stroke="#4b5563" strokeWidth="1" />
            <polygon points={points} fill="none" stroke="#4b5563" strokeWidth="1" strokeDasharray="4" />
            <defs>
                <clipPath id={`clip-${outputSet}-${strength}`}>
                    <rect x="0" y={clipY} width={width} height={height} />
                </clipPath>
            </defs>
            <polygon points={points} fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="2" clipPath={`url(#clip-${outputSet}-${strength})`} />
            <line x1="0" y1={clipY} x2={width} y2={clipY} stroke="#fbbf24" strokeWidth="2" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill="#9ca3af">Output: {outputSet}</text>
            <text x={width - 5} y={clipY - 5} textAnchor="end" fontSize="10" fill="#fbbf24" fontWeight="bold">Strength={strength.toFixed(2)}</text>
        </svg>
    </div>
  );
});


/**
 * COMPONENT: BANKER ANIMATION
 */
const Banker = memo(({ riskScore }) => {
  let emotion = 'neutral';
  let borderColor = 'border-gray-700';
  let glowColor = 'shadow-none';
  let text = "Analyzing...";
  let textColor = 'text-gray-400';

  if (riskScore < 40) {
    emotion = 'happy';
    borderColor = 'border-green-500';
    glowColor = 'shadow-[0_0_30px_rgba(16,185,129,0.3)]';
    text = "Low Risk";
    textColor = 'text-green-400';
  } else if (riskScore < 70) {
    emotion = 'skeptical';
    borderColor = 'border-yellow-500';
    glowColor = 'shadow-[0_0_30px_rgba(234,179,8,0.3)]';
    text = "Medium Risk";
    textColor = 'text-yellow-400';
  } else {
    emotion = 'angry';
    borderColor = 'border-red-600';
    glowColor = 'shadow-[0_0_50px_rgba(239,68,68,0.4)]';
    text = "High Risk";
    textColor = 'text-red-500';
  }

  return (
    <div className={`relative w-full max-w-md aspect-square flex flex-col items-center justify-center p-8 border-4 rounded-3xl bg-gray-900 transition-all duration-500 ${borderColor} ${glowColor} overflow-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-950 -z-10"></div>
      {riskScore >= 60 && <FireCanvas intensity={riskScore / 100} />}
      <div className="relative z-10 w-48 h-48 transition-all duration-500 transform hover:scale-105 filter drop-shadow-xl">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="#fcd34d" stroke="#111827" strokeWidth="4" />
          {emotion === 'happy' && (
            <g>
              <path d="M60 80 Q70 70 80 80" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M120 80 Q130 70 140 80" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>
          )}
          {emotion === 'skeptical' && (
            <g>
              <circle cx="70" cy="80" r="6" fill="#111827" />
              <line x1="110" y1="75" x2="150" y2="85" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
            </g>
          )}
          {emotion === 'angry' && (
            <g>
              <path d="M50 75 L90 95" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
              <path d="M110 95 L150 75" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
              <circle cx="70" cy="100" r="6" fill="#111827" />
              <circle cx="130" cy="100" r="6" fill="#111827" />
            </g>
          )}
          {emotion === 'happy' && <path d="M60 120 Q100 150 140 120" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />}
          {emotion === 'skeptical' && <line x1="70" y1="130" x2="130" y2="130" stroke="#111827" strokeWidth="4" strokeLinecap="round" />}
          {emotion === 'angry' && <path d="M60 145 Q100 115 140 145" stroke="#111827" strokeWidth="4" fill="none" strokeLinecap="round" />}
          <path d="M100 180 L80 220 L120 220 Z" fill="#3b82f6" />
        </svg>
      </div>
      <div className="relative z-10 mt-6 text-center">
        <h2 className={`text-3xl font-black uppercase tracking-tight ${textColor} transition-colors duration-300`}>{text}</h2>
        <div className="mt-2 text-xl font-bold text-gray-400 font-mono">Risk Score: <span className="text-white">{riskScore.toFixed(1)}%</span></div>
      </div>
    </div>
  );
});

/**
 * COMPONENT: SLIDER ROW
 */
const SliderRow = memo(({ field, value, onChange }) => {
  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <label className="flex items-center gap-2 font-semibold text-gray-200">
          <div className="p-1.5 rounded-lg bg-gray-700 text-blue-400"><field.icon className="w-4 h-4" /></div>
          {field.label}
        </label>
        <span className="text-blue-400 font-mono font-bold bg-gray-900 px-3 py-1 rounded-md border border-gray-700">
          {value} <span className="text-gray-500 text-xs">{MFS[field.id].unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(field.id, Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all mb-4"
      />
      <MembershipGraph type={field.id} value={value} height={80} />
    </div>
  );
});

/**
 * COMPONENT: RULES LIST MODAL
 */
const RulesModal = ({ onClose, rules, ruleStrengths }) => {
  if (!rules) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 sticky top-0 z-10">
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
             <List className="text-blue-500" /> Active Rule Base
           </h3>
           <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-3">
          {rules.map((rule, idx) => {
             const strength = ruleStrengths[idx];
             const isActive = strength > 0;
             return (
               <div key={idx} className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-gray-800/50 border-gray-700 opacity-60'}`}>
                 <div className="flex justify-between items-start mb-1">
                   <div className="flex items-center gap-2">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>Rule {idx + 1}</span>
                     {isActive && <span className="text-xs font-bold text-blue-400 animate-pulse">ACTIVE (μ={strength.toFixed(2)})</span>}
                   </div>
                 </div>
                 <p className="text-sm font-mono text-gray-300">
                    <span className="text-blue-400 font-bold">IF</span> {Object.entries(rule.if).map(([k, v], i, arr) => (
                       <span key={k}>{FIELD_LABELS[k] || k} is <span className="text-white font-bold">{v}</span>{i < arr.length - 1 && " AND "}</span>
                    ))} <span className="text-purple-400 font-bold">THEN</span> Risk is <span className="text-white font-bold">{rule.then.risk}</span>
                 </p>
                 <p className="text-xs text-gray-500 mt-1 italic">"{rule.desc}"</p>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * MAIN APP COMPONENT
 */
export default function LoanRiskApp() {
  const [view, setView] = useState('input');
  const [showRules, setShowRules] = useState(false);
  const [inputs, setInputs] = useState({
    age: 30,
    income: 4500,
    coIncome: 0,
    installment: 2000,
    dependents: 1
  });

  // Computation Memo
  const computation = useMemo(() => {
    const fuzzified = {};
    Object.keys(inputs).forEach(key => {
      fuzzified[key] = {};
      Object.entries(MFS[key].sets).forEach(([setName, coords]) => {
        fuzzified[key][setName] = getMembership(inputs[key], coords);
      });
    });

    // We calculate ALL rules first to get strengths for the modal
    const allRulesCalculated = RULES.map(rule => {
      // Create detailed antecedent objects for visualization
      const antecedents = Object.entries(rule.if).map(([varName, setName]) => {
        return {
          varName,
          setName,
          value: inputs[varName], // Current crisp input
          membership: fuzzified[varName][setName] // Calculated mu
        };
      });

      // AND operation (Min)
      const strength = Math.min(...antecedents.map(a => a.membership));
      
      return { 
        ...rule, 
        antecedents, 
        strength, 
        outputSet: rule.then.risk 
      };
    });

    const activeRules = allRulesCalculated.filter(r => r.strength > 0);
    const ruleStrengths = allRulesCalculated.map(r => r.strength);

    const riskDomain = Array.from({ length: 101 }, (_, i) => i);
    const aggregatedCurve = riskDomain.map(x => {
      let maxMembership = 0;
      activeRules.forEach(rule => {
        const outputSetCoords = MFS.risk.sets[rule.outputSet];
        const shapeMembership = getMembership(x, outputSetCoords);
        const clippedValue = Math.min(shapeMembership, rule.strength);
        if (clippedValue > maxMembership) maxMembership = clippedValue;
      });
      return maxMembership;
    });

    let numerator = 0, denominator = 0;
    riskDomain.forEach((x, i) => {
      const mu = aggregatedCurve[i];
      numerator += x * mu;
      denominator += mu;
    });

    return {
      fuzzified,
      ruleResults: activeRules,
      ruleStrengths,
      aggregatedCurve,
      centroid: denominator === 0 ? 0 : numerator / denominator
    };
  }, [inputs]);

  const handleSliderChange = (id, val) => setInputs(prev => ({ ...prev, [id]: val }));

  const fields = [
      { id: 'age', label: 'Age', icon: Calendar, min: 18, max: 90, step: 1 },
      { id: 'income', label: 'Monthly Income', icon: DollarSign, min: 0, max: 10000, step: 100 },
      { id: 'coIncome', label: 'Co-Applicant Income', icon: Users, min: 0, max: 10000, step: 100 },
      { id: 'installment', label: 'Monthly Installment', icon: Activity, min: 0, max: 10000, step: 100 },
      { id: 'dependents', label: 'Dependents', icon: Users, min: 0, max: 6, step: 1 },
  ];

  return (
    <div className="bg-gray-950 min-h-screen text-gray-100 font-sans selection:bg-blue-500 selection:text-white relative">
      {/* Modal Layer */}
      {showRules && (
        <RulesModal 
          onClose={() => setShowRules(false)} 
          rules={RULES} 
          ruleStrengths={computation.ruleStrengths} 
        />
      )}

      {view === 'input' ? (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
          {/* Left Panel: Inputs */}
          <div className="w-full lg:w-1/2 p-6 lg:p-10 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <header className="mb-8">
              <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tighter">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-900/50">
                   <Zap className="w-6 h-6" />
                </div>
                RiskAI <span className="text-gray-600 text-lg font-medium self-end mb-1">Simulator v2.0</span>
              </h1>
              <p className="text-gray-400 mt-2 ml-1">Advanced fuzzy logic inference engine.</p>
            </header>

            <div className="space-y-6">
              {fields.map(field => (
                <SliderRow 
                  key={field.id}
                  field={field}
                  value={inputs[field.id]}
                  onChange={handleSliderChange}
                />
              ))}
            </div>
          </div>

          {/* Right Panel: Visualization */}
          <div className="w-full lg:w-1/2 bg-gray-900 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
             
             <div className="relative z-10 p-6 flex flex-col items-center gap-6 w-full max-w-md">
               <Banker riskScore={computation.centroid} />
               
               <div className="grid grid-cols-2 gap-4 w-full">
                  <button 
                    onClick={() => setShowRules(true)}
                    className="py-4 bg-gray-800 text-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-700 hover:text-white transition-all border border-gray-700 hover:border-gray-500 active:scale-[0.98]"
                  >
                    <List className="w-5 h-5" /> View Active Rules
                  </button>
                  <button 
                    onClick={() => setView('inference')}
                    className="py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                  >
                    Fuzzy Inference <ArrowRight className="w-5 h-5" />
                  </button>
               </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen p-6 lg:p-12 bg-gray-950">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-8">
                <button 
                  onClick={() => setView('input')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white font-medium transition-colors"
                >
                  <div className="p-2 bg-gray-800 rounded-lg"><ChevronLeft className="w-5 h-5" /></div>
                  Back to Simulator
                </button>
                <button 
                  onClick={() => setShowRules(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  <List className="w-5 h-5" /> View All Rules
                </button>
            </div>

            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">Inference Logic Trace</h1>
            <p className="text-gray-400 mb-12 text-lg">Mamdani-style breakdown of fuzzy implication for risk score <span className="text-blue-400 font-bold">{computation.centroid.toFixed(1)}%</span>.</p>

            {/* Phase 1: Fuzzification (Simplified View) */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 text-blue-400 flex items-center justify-center font-black text-xl shadow-lg">1</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Fuzzification Overview</h2>
                  <p className="text-gray-500 text-sm">Crisp inputs mapped to fuzzy degrees.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.keys(inputs).map(key => (
                  <div key={key} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase font-bold mb-1">{FIELD_LABELS[key] || key}</div>
                    <div className="text-xl font-bold text-white mb-2">{inputs[key]}</div>
                    <div className="space-y-1">
                         {Object.entries(computation.fuzzified[key]).map(([set, val]) => (
                             val > 0 && <div key={set} className="text-xs flex justify-between text-blue-400"><span>{set}</span><span>{val.toFixed(2)}</span></div>
                         ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Phase 2: Rule Evaluation (VISUAL UPGRADE) */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 text-purple-400 flex items-center justify-center font-black text-xl shadow-lg">2</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Rule Evaluation (Mamdani Style)</h2>
                  <p className="text-gray-500 text-sm">Visualizing Antecedents (AND) → Consequent Implication.</p>
                </div>
              </div>
              
              <div className="space-y-8">
                {computation.ruleResults.length === 0 ? (
                  <div className="p-6 bg-yellow-900/20 text-yellow-500 border border-yellow-800 rounded-xl">No rules fired for these inputs.</div>
                ) : (
                  computation.ruleResults.map((rule, idx) => (
                    <div key={idx} className="bg-gray-900 p-6 rounded-2xl border border-gray-700 shadow-xl overflow-x-auto relative">
                      <div className="flex flex-col gap-1 mb-6 sticky left-0 bg-gray-900/95 backdrop-blur py-2 z-10 border-b border-gray-800">
                          <div className="flex items-center gap-3">
                             <span className="bg-blue-900/30 text-blue-400 border border-blue-800 text-xs uppercase font-bold px-2 py-1 rounded">Rule {idx + 1}</span>
                             <span className="text-gray-500 text-xs italic">Description: "{rule.desc}"</span>
                          </div>
                          <div className="text-gray-300 font-mono text-sm leading-relaxed mt-1">
                             <span className="text-blue-400 font-bold">IF</span> {Object.entries(rule.if).map(([k, v], i, arr) => (
                                 <span key={k}>
                                     {FIELD_LABELS[k] || k} is <span className="text-white font-bold">{v}</span>
                                     {i < arr.length - 1 && <span className="text-blue-400 font-bold mx-1"> AND </span>}
                                 </span>
                             ))} <span className="text-purple-400 font-bold">THEN</span> Risk is <span className="text-white font-bold">{rule.outputSet}</span>
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4 min-w-max">
                        {/* Antecedents */}
                        {rule.antecedents.map((ant, i) => (
                            <React.Fragment key={i}>
                                <AntecedentGraph 
                                    varName={ant.varName} 
                                    setName={ant.setName} 
                                    value={ant.value} 
                                    membership={ant.membership} 
                                    width={200}
                                    height={120}
                                />
                                {/* Operator */}
                                {i < rule.antecedents.length - 1 && (
                                    <div className="flex flex-col items-center justify-center px-2">
                                        <span className="text-sm font-bold text-gray-600 mb-1">AND</span>
                                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-400">
                                            min
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}

                        {/* Implication Arrow */}
                        <div className="flex flex-col items-center justify-center px-4">
                            <ArrowRight className="w-8 h-8 text-purple-500" />
                            <span className="text-xs text-purple-400 font-bold mt-1">THEN</span>
                        </div>

                        {/* Consequent */}
                        <ConsequentGraph 
                            outputSet={rule.outputSet} 
                            strength={rule.strength} 
                            width={240}
                            height={120}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Phase 3 & 4: Aggregation */}
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 text-green-400 flex items-center justify-center font-black text-xl shadow-lg">3</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Aggregation & Defuzzification</h2>
                  <p className="text-gray-500 text-sm">Combining outputs (MAX) & finding the Centroid.</p>
                </div>
              </div>
              
              <div className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Activity className="w-64 h-64 text-white" />
                </div>

                <div className="w-full h-80 relative mb-8 z-10 pl-8 pb-8">
                  <svg width="100%" height="100%" viewBox="0 0 800 300" className="overflow-visible">
                    <GradientDefs />
                    {/* Grid */}
                    <line x1="0" y1="300" x2="800" y2="300" stroke="#4b5563" strokeWidth="1" />
                    <line x1="0" y1="0" x2="0" y2="300" stroke="#4b5563" strokeWidth="1" />

                    {/* X-Axis Labels */}
                    <text x="0" y="325" fill="#9ca3af" fontSize="14" textAnchor="middle">0%</text>
                    <text x="200" y="325" fill="#9ca3af" fontSize="14" textAnchor="middle">25%</text>
                    <text x="400" y="325" fill="#9ca3af" fontSize="14" textAnchor="middle">50%</text>
                    <text x="600" y="325" fill="#9ca3af" fontSize="14" textAnchor="middle">75%</text>
                    <text x="800" y="325" fill="#9ca3af" fontSize="14" textAnchor="middle">100%</text>

                    {/* Y-Axis Labels */}
                    <text x="-15" y="300" fill="#9ca3af" fontSize="14" textAnchor="end">0.0</text>
                    <text x="-15" y="150" fill="#9ca3af" fontSize="14" textAnchor="end">0.5</text>
                    <text x="-15" y="10" fill="#9ca3af" fontSize="14" textAnchor="end">1.0</text>
                    
                    {/* Draw Base Sets Ghosted - Solid faint lines instead of dots */}
                    {Object.entries(MFS.risk.sets).map(([name, coords]) => {
                      // Map 0-100 to 0-800 for X
                      // Map 0-1 to 300-0 for Y
                      const mapX = (val) => val * 8;
                      const points = `${mapX(coords[0])},300 ${mapX(coords[1])},0 ${mapX(coords[2])},0 ${mapX(coords[3])},300`;
                      return (
                        <g key={name}>
                          <polygon points={points} fill="none" stroke="#4b5563" strokeWidth="1" strokeOpacity="0.3" />
                          <text x={mapX((coords[1] + coords[2]) / 2)} y="280" textAnchor="middle" fill="#6b7280" fontSize="12">{name}</text>
                        </g>
                      )
                    })}

                    {/* Draw Aggregated Area */}
                    {(() => {
                      let pathD = "M 0,300 ";
                      computation.aggregatedCurve.forEach((val, x) => {
                        // x is 0-100 index, map to 0-800 pixel
                        const px = x * 8;
                        // val is 0-1, map to 300-0 pixel
                        const py = 300 - (val * 300);
                        pathD += `L ${px},${py} `;
                      });
                      pathD += "L 800,300 Z";
                      return (
                         <g>
                           <path d={pathD} fill="url(#grad-final)" stroke="#10b981" strokeWidth="3" />
                         </g>
                      )
                    })()}

                    {/* Center of Gravity Line - Solid, sharp */}
                    {(() => {
                        const cogX = computation.centroid * 8;
                        return (
                            <g>
                                <line 
                                x1={cogX} y1="0" x2={cogX} y2="300" 
                                stroke="#ef4444" strokeWidth="3"
                                />
                                <circle cx={cogX} cy="300" r="6" fill="#ef4444" stroke="white" strokeWidth="2"/>
                                <text x={cogX} y="-15" fill="#ef4444" fontSize="14" textAnchor="middle" fontWeight="bold">COG</text>
                            </g>
                        )
                    })()}
                  </svg>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-gray-800 rounded-lg text-green-400">
                        <Calculator className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="font-bold text-gray-200">Defuzzification Result</h4>
                        <p className="text-sm text-gray-500">Method: Center of Gravity (Centroid)</p>
                     </div>
                  </div>
                  <div className="text-right mt-4 md:mt-0">
                    <div className="text-sm text-gray-400 uppercase tracking-widest font-bold">Final Risk Score</div>
                    <div className="flex items-end justify-end gap-2">
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                            {computation.centroid.toFixed(2)}%
                        </div>
                        <div className="text-xl font-bold text-white mb-2">
                             ({getRiskLabel(computation.centroid)})
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}