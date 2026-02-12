import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
  AlertCircle, ArrowRight, Activity, DollarSign, Users, Calendar, 
  Calculator, ChevronLeft, Zap, X, List, Info, TrendingUp, 
  ShieldCheck, Brain, Target, BarChart3, CheckCircle2, Menu,
  Github, Twitter, Linkedin, ChevronRight, LayoutDashboard, PlayCircle,
  Briefcase, LineChart, Lock, FileText, Globe, Landmark, Scale, BookOpen,
  Map, Rocket, Flag, Server, Database, Lightbulb, GraduationCap, AlertTriangle, Search,
  Sun, Moon, CreditCard, Coins, Wallet
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * FUZZY LOGIC ENGINE (PHASE 1: CORE LOGIC)
 * ------------------------------------------------------------------
 */

const MFS = {
  age: {
    min: 18, max: 100, unit: 'yrs',
    step: 1,
    icon: Calendar,
    label: 'Applicant Age',
    sets: {
      Young: [18, 18, 25, 30],
      Adult: [20, 30, 55, 65],
      Senior: [60, 65, 100, 100]
    }
  },
  income: {
    min: 0, max: 10000, unit: '$',
    step: 100,
    icon: DollarSign,
    label: 'Monthly Income',
    sets: {
      Low: [0, 0, 2500, 3500],
      Medium: [2500, 4500, 4500, 6500], 
      High: [5500, 7000, 10000, 10000]
    }
  },
  coIncome: {
    min: 0, max: 10000, unit: '$',
    step: 100,
    icon: Users,
    label: 'Co-Applicant Income',
    sets: {
      Low: [0, 0, 2500, 3500],
      Medium: [2500, 4500, 4500, 6500],
      High: [5500, 7000, 10000, 10000]
    }
  },
  loanAmount: {
    min: 0, max: 150000, unit: '$',
    step: 1000,
    icon: Wallet,
    label: 'Loan Amount',
    sets: {
      Small: [-5000, 0, 10000, 30000],
      Medium: [20000, 45000, 45000, 70000],
      Large: [60000, 80000, 150000, 150000]
    }
  },
  installment: {
    min: 0, max: 10000, unit: '$',
    step: 50,
    icon: Calculator,
    label: 'Monthly Installment',
    sets: {
      Low: [0, 0, 1000, 2000],
      Medium: [1000, 2500, 2500, 4000],
      High: [3000, 4500, 10000, 10000]
    }
  },
  dependents: {
    min: 0, max: 6, unit: 'ppl',
    step: 1,
    icon: Users,
    label: 'Dependents',
    sets: {
      Low: [0, 0, 1, 2],
      Medium: [1, 2.5, 2.5, 4],
      High: [3, 4, 6, 6] 
    }
  },
  risk: {
    min: 0, max: 100, unit: '%',
    sets: {
      Low: [0, 0, 20, 40],
      Medium: [30, 50, 50, 70],
      High: [60, 80, 100, 100]
    }
  }
};

const FIELD_LABELS = {
  age: 'Age',
  income: 'Monthly Income',
  coIncome: 'Co-Applicant Income',
  loanAmount: 'Loan Amount',
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

const RULES = [
  // Base combinations of LoanAmount, Income, and Installment (27 Core Rules)
  { if: { loanAmount: 'Small', income: 'Low', installment: 'Low' }, then: { risk: 'Medium' }, desc: "Small loan, low income but manageable installment." },
  { if: { loanAmount: 'Small', income: 'Low', installment: 'Medium' }, then: { risk: 'High' }, desc: "Small loan but installment is too high for low income." },
  { if: { loanAmount: 'Small', income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Severe debt burden on low income." },
  { if: { loanAmount: 'Small', income: 'Medium', installment: 'Low' }, then: { risk: 'Low' }, desc: "Easily affordable small loan." },
  { if: { loanAmount: 'Small', income: 'Medium', installment: 'Medium' }, then: { risk: 'Low' }, desc: "Balanced small loan for medium income." },
  { if: { loanAmount: 'Small', income: 'Medium', installment: 'High' }, then: { risk: 'Medium' }, desc: "High installment strains medium income, even for small loan." },
  { if: { loanAmount: 'Small', income: 'High', installment: 'Low' }, then: { risk: 'Low' }, desc: "Very safe proposition." },
  { if: { loanAmount: 'Small', income: 'High', installment: 'Medium' }, then: { risk: 'Low' }, desc: "Easily manageable." },
  { if: { loanAmount: 'Small', income: 'High', installment: 'High' }, then: { risk: 'Low' }, desc: "High income absorbs the installment shock." },
  
  { if: { loanAmount: 'Medium', income: 'Low', installment: 'Low' }, then: { risk: 'Medium' }, desc: "Stretching low income for a medium loan." },
  { if: { loanAmount: 'Medium', income: 'Low', installment: 'Medium' }, then: { risk: 'High' }, desc: "High risk of default." },
  { if: { loanAmount: 'Medium', income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Insolvent combination." },
  { if: { loanAmount: 'Medium', income: 'Medium', installment: 'Low' }, then: { risk: 'Low' }, desc: "Good capacity for medium loan." },
  { if: { loanAmount: 'Medium', income: 'Medium', installment: 'Medium' }, then: { risk: 'Medium' }, desc: "Perfectly average risk profile." },
  { if: { loanAmount: 'Medium', income: 'Medium', installment: 'High' }, then: { risk: 'High' }, desc: "Installment pushes medium income into risk." },
  { if: { loanAmount: 'Medium', income: 'High', installment: 'Low' }, then: { risk: 'Low' }, desc: "Excellent capacity." },
  { if: { loanAmount: 'Medium', income: 'High', installment: 'Medium' }, then: { risk: 'Low' }, desc: "Comfortable serviceability." },
  { if: { loanAmount: 'Medium', income: 'High', installment: 'High' }, then: { risk: 'Medium' }, desc: "High income offset by high debt obligations." },

  { if: { loanAmount: 'Large', income: 'Low', installment: 'Low' }, then: { risk: 'High' }, desc: "Low income cannot sustain large principal." },
  { if: { loanAmount: 'Large', income: 'Low', installment: 'Medium' }, then: { risk: 'High' }, desc: "Guaranteed default territory." },
  { if: { loanAmount: 'Large', income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Extreme risk." },
  { if: { loanAmount: 'Large', income: 'Medium', installment: 'Low' }, then: { risk: 'Medium' }, desc: "Large loan stretches medium income over time." },
  { if: { loanAmount: 'Large', income: 'Medium', installment: 'Medium' }, then: { risk: 'High' }, desc: "Too much leverage for medium income." },
  { if: { loanAmount: 'Large', income: 'Medium', installment: 'High' }, then: { risk: 'High' }, desc: "Debt burden far exceeds capacity." },
  { if: { loanAmount: 'Large', income: 'High', installment: 'Low' }, then: { risk: 'Low' }, desc: "Wealthy applicant taking standard large loan." },
  { if: { loanAmount: 'Large', income: 'High', installment: 'Medium' }, then: { risk: 'Medium' }, desc: "Substantial leverage, requires monitoring." },
  { if: { loanAmount: 'Large', income: 'High', installment: 'High' }, then: { risk: 'High' }, desc: "Even high income is choked by massive installments." },

  // Supplementary modifiers (Co-Income, Dependents, Age)
  { if: { loanAmount: 'Large', coIncome: 'High' }, then: { risk: 'Medium' }, desc: "Large loan offset by strong co-signer." },
  { if: { income: 'Low', coIncome: 'High', loanAmount: 'Medium' }, then: { risk: 'Medium' }, desc: "Co-signer rescues medium loan application." },
  { if: { dependents: 'High', income: 'Medium', loanAmount: 'Medium' }, then: { risk: 'High' }, desc: "Family expenses ruin medium loan viability." },
  { if: { dependents: 'High', income: 'Low' }, then: { risk: 'High' }, desc: "Critical vulnerability with dependents." },
  { if: { dependents: 'High', income: 'High', loanAmount: 'Large' }, then: { risk: 'Medium' }, desc: "High income supports large family and loan, but reserves are thinner." },
  { if: { dependents: 'High', income: 'High', loanAmount: 'Small' }, then: { risk: 'Low' }, desc: "High income easily absorbs small loan even with large family." },
  { if: { dependents: 'High', installment: 'High' }, then: { risk: 'High' }, desc: "High fixed family costs plus high loan installments is a severe risk." },
  { if: { dependents: 'Medium', income: 'Medium', installment: 'High' }, then: { risk: 'High' }, desc: "Average family size cannot sustain high installments on medium income." },
  { if: { dependents: 'Medium', income: 'Low', loanAmount: 'Small' }, then: { risk: 'Medium' }, desc: "Average family on low income is stretched even by small loans." },
  { if: { dependents: 'Low', income: 'Medium', installment: 'Medium' }, then: { risk: 'Low' }, desc: "Low family expenses allow medium income to comfortably service debt." },
  { if: { dependents: 'Low', income: 'Low', installment: 'Low' }, then: { risk: 'Low' }, desc: "Lack of dependents reduces risk for low-income, low-installment loans." },
  { if: { age: 'Young', loanAmount: 'Large', coIncome: 'Low' }, then: { risk: 'High' }, desc: "Young applicant seeking massive leverage alone." },
  { if: { age: 'Senior', loanAmount: 'Large' }, then: { risk: 'High' }, desc: "Retiree taking on massive new debt." },
  { if: { age: 'Young', loanAmount: 'Small', income: 'Medium' }, then: { risk: 'Low' }, desc: "Young professional building credit safely." },
  { if: { age: 'Adult', coIncome: 'Medium', loanAmount: 'Large', income: 'Medium' }, then: { risk: 'Medium' }, desc: "Dual-income household taking a large mortgage." },

  // Co-Applicant Specific Logic
  { if: { income: 'Low', installment: 'High', coIncome: 'High' }, then: { risk: 'Medium' }, desc: "High co-applicant income mitigates high installment risk for low earner." },
  { if: { income: 'Low', installment: 'Medium', coIncome: 'High' }, then: { risk: 'Low' }, desc: "Strong co-signer makes medium installment very safe for low earner." },
  { if: { income: 'Medium', loanAmount: 'Large', coIncome: 'Medium' }, then: { risk: 'Medium' }, desc: "Dual medium incomes support large loan better than one." },
  { if: { income: 'Medium', loanAmount: 'Large', coIncome: 'Low' }, then: { risk: 'High' }, desc: "Single medium income struggles with large loan without backup." },
  { if: { income: 'High', installment: 'High', coIncome: 'High' }, then: { risk: 'Low' }, desc: "High joint income easily absorbs high installments." },
  { if: { income: 'High', installment: 'High', coIncome: 'Low' }, then: { risk: 'Medium' }, desc: "High earner carrying heavy debt load alone has moderate risk." },
  { if: { age: 'Young', income: 'Low', coIncome: 'High' }, then: { risk: 'Low' }, desc: "Young applicant fully backed by wealthy guarantor." },
  { if: { loanAmount: 'Small', income: 'Low', coIncome: 'Low' }, then: { risk: 'Medium' }, desc: "Low income with no backup is risky even for small loans." },
  { if: { dependents: 'High', income: 'Medium', coIncome: 'Medium' }, then: { risk: 'Low' }, desc: "Co-applicant income offsets costs of large family." },
  { if: { loanAmount: 'Medium', income: 'Low', coIncome: 'Medium' }, then: { risk: 'Medium' }, desc: "Co-signer provides partial stability for medium loan." },
  
  // NEW RULE: Fix for Medium Income + High Installment + High Co-Applicant
  { if: { loanAmount: 'Medium', income: 'Medium', installment: 'High', coIncome: 'High' }, then: { risk: 'Low' }, desc: "High co-applicant income completely mitigates high installment risk for medium earner." },

  // --- CRITICAL NEW RULES ---

  // 1. The "Squeezed Middle Class" Logic
  // Medium income with medium installment is usually fine, but High Dependents drains the disposable income.
  { if: { income: 'Medium', installment: 'Medium', dependents: 'High' }, then: { risk: 'High' }, desc: "Disposable income evaporated by dependents despite medium income." },
  
  // 2. The "Retiree Trap"
  // Seniors with low monthly income taking large loans represent a specific solvency risk, even if installments look low (duration risk).
  { if: { age: 'Senior', income: 'Low', loanAmount: 'Large' }, then: { risk: 'High' }, desc: "Senior applicant with low cash flow taking large debt." },
  
  // 3. The "Ambitions Youth"
  // Young applicants with low income taking medium loans without support.
  { if: { age: 'Young', income: 'Low', loanAmount: 'Medium', coIncome: 'Low' }, then: { risk: 'High' }, desc: "Young, low income, no support, significant debt." },

  // 4. "Co-Signer isn't a Magic Bullet"
  // If the primary borrower is very weak (Low Income) and the loan is Large, a 'Medium' co-signer isn't enough.
  { if: { loanAmount: 'Large', income: 'Low', coIncome: 'Medium' }, then: { risk: 'High' }, desc: "Primary borrower too weak for Large loan; Medium co-signer insufficient." },

  // 5. The "Double Burden"
  // High Installment AND High Dependents is a recipe for disaster unless Income is strictly High.
  { if: { installment: 'High', dependents: 'High', income: 'Medium' }, then: { risk: 'High' }, desc: "Cannot support high debt and large family on medium income." },
  { if: { installment: 'High', dependents: 'High', income: 'Low' }, then: { risk: 'High' }, desc: "Guaranteed insolvency." },

  // 6. The "Rich Family" Exception
  // High income scales better with dependents than Medium income does.
  { if: { income: 'High', dependents: 'High', installment: 'Medium' }, then: { risk: 'Low' }, desc: "High income creates enough buffer for family and debt." },

  // 7. Small Loan Sensitivity
  // Even small loans are risky if they take up too much of a low income.
  { if: { loanAmount: 'Small', income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Predatory lending scenario: Small loan with crushing terms." }
];

/**
 * ------------------------------------------------------------------
 * HIGH-END UI COMPONENTS
 * ------------------------------------------------------------------
 */

// Enhanced Financial Particles: Now draws currency symbols instead of circles
const FinancialParticles = memo(({ intensity = 0.5, isDark }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    const handleResize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    window.addEventListener('resize', handleResize);
    handleResize();

    const symbols = ['$', '€', '£', '%', '¥', '↑', '↓'];
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 12 + 8,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      opacity: Math.random() * 0.2
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '12px monospace';
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = isDark ? '#3b82f6' : '#2563eb';
        ctx.fillText(p.symbol, p.x, p.y);
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => { window.removeEventListener('resize', handleResize); cancelAnimationFrame(animationFrameId); };
  }, [isDark]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-20" />;
});

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
    <linearGradient id="grad-final" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
    </linearGradient>
  </defs>
);

const MembershipGraph = memo(({ type, value, width = 300, height = 80, showValue = true, isDark = true }) => {
  const config = MFS[type];
  const { min, max, sets } = config;
  const range = max - min;
  const getX = (val) => ((val - min) / range) * width;
  const gradients = ['url(#grad-blue)', 'url(#grad-green)', 'url(#grad-red)'];
  const strokeColors = ['#60a5fa', '#34d399', '#f87171'];
  
  return (
    <div className="relative mt-4 mb-2 pointer-events-none select-none w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="none">
        <GradientDefs />
        <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#374151" : "#e5e7eb"} strokeWidth="1" />
        {Object.entries(sets).map(([name, coords], idx) => {
          const [a, b, c, d] = coords;
          const points = `${getX(a)},${height} ${getX(b)},0 ${getX(c)},0 ${getX(d)},${height}`;
          return (
            <g key={name}>
              <polygon points={points} fill={gradients[idx % 3]} stroke={strokeColors[idx % 3]} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
              <text x={getX((b+c)/2)} y="-8" textAnchor="middle" fontSize="10" fill={strokeColors[idx % 3]} fontWeight="bold">{name}</text>
            </g>
          );
        })}
        {showValue && (
          <g transform={`translate(${getX(value)}, 0)`} className="transition-transform duration-100 ease-out">
            <line y1="-10" y2={height} stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />
            <circle cy={height} r="4" fill="#fbbf24" stroke="#1f2937" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
});

const AntecedentGraph = memo(({ varName, setName, value, membership, width = 180, height = 100, isDark }) => {
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
        <div className={`text-[10px] font-mono mb-1 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{FIELD_LABELS[varName] || varName} = {value}</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} rounded border`}>
            <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#4b5563" : "#d1d5db"} strokeWidth="1" />
            <polygon points={points} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" />
            <line x1={intersectX} y1={height} x2={intersectX} y2={intersectY} stroke="#fbbf24" strokeWidth="2" />
            <circle cx={intersectX} cy={intersectY} r="3" fill="#fbbf24" />
            <line x1={intersectX} y1={intersectY} x2={width} y2={intersectY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill={isDark ? "#9ca3af" : "#6b7280"}>{setName}</text>
            <text x={intersectX + 5} y={intersectY - 5} fontSize="10" fill="#fbbf24" fontWeight="bold">μ={membership.toFixed(2)}</text>
        </svg>
    </div>
  );
});

const ConsequentGraph = memo(({ outputSet, strength, width = 180, height = 100, isDark }) => {
  const coords = MFS.risk.sets[outputSet];
  const getX = (val) => (val / 100) * width;
  const getY = (val) => height - (val * height);
  const points = `${getX(coords[0])},${height} ${getX(coords[1])},0 ${getX(coords[2])},0 ${getX(coords[3])},${height}`;
  const clipY = getY(strength);

  return (
    <div className="flex flex-col items-center">
        <div className={`text-[10px] font-mono mb-1 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Risk ({outputSet})</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} rounded border`}>
            <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#4b5563" : "#d1d5db"} strokeWidth="1" />
            <polygon points={points} fill="none" stroke={isDark ? "#4b5563" : "#d1d5db"} strokeWidth="1" strokeDasharray="4" />
            <defs><clipPath id={`clip-${outputSet}-${strength.toFixed(3)}`}><rect x="0" y={clipY} width={width} height={height} /></clipPath></defs>
            <polygon points={points} fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="2" clipPath={`url(#clip-${outputSet}-${strength.toFixed(3)})`} />
            <line x1="0" y1={clipY} x2={width} y2={clipY} stroke="#fbbf24" strokeWidth="2" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill={isDark ? "#9ca3af" : "#6b7280"}>{outputSet}</text>
            <text x={width - 5} y={clipY - 5} textAnchor="end" fontSize="10" fill="#fbbf24" fontWeight="bold">S={strength.toFixed(2)}</text>
        </svg>
    </div>
  );
});

const Banker = memo(({ riskScore, isDark }) => {
  const getState = (score) => {
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  };
  const state = getState(riskScore);

  const styles = {
    low: {
      color: 'text-emerald-500',
      border: 'border-emerald-500/50',
      ring: 'border-emerald-500/20',
      shadow: isDark ? 'shadow-[0_0_60px_-10px_rgba(16,185,129,0.3)]' : 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]',
      bg: isDark ? 'bg-emerald-900/10' : 'bg-emerald-50',
      icon: ShieldCheck,
      label: 'LOW RISK',
      sublabel: 'Safe',
      desc: 'High Probability of Acceptance'
    },
    medium: {
      color: 'text-amber-500',
      border: 'border-amber-500/50',
      ring: 'border-amber-500/20',
      shadow: isDark ? 'shadow-[0_0_60px_-10px_rgba(245,158,11,0.3)]' : 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]',
      bg: isDark ? 'bg-amber-900/10' : 'bg-amber-50',
      icon: Search,
      label: 'MEDIUM RISK',
      sublabel: 'Caution',
      desc: 'Manual Review Likely Required'
    },
    high: {
      color: 'text-rose-600',
      border: 'border-rose-600/50',
      ring: 'border-rose-500/20',
      shadow: isDark ? 'shadow-[0_0_80px_-10px_rgba(225,29,72,0.5)]' : 'shadow-[0_0_40px_-10px_rgba(225,29,72,0.3)]',
      bg: isDark ? 'bg-rose-900/10' : 'bg-rose-50',
      icon: AlertTriangle,
      label: 'HIGH RISK',
      sublabel: 'Critical',
      desc: 'Low Probability of Acceptance'
    }
  };

  const config = styles[state];
  const Icon = config.icon;

  return (
    <div className="relative flex flex-col items-center">
      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes float-up {
          0% { transform: translateY(0px) scale(0.8); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
        }
        @keyframes shake-hard {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-4px) rotate(-2deg); }
          30% { transform: translateX(4px) rotate(2deg); }
          50% { transform: translateX(-4px) rotate(-2deg); }
          70% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes glitch-skew {
          0% { transform: skew(0deg); }
          20% { transform: skew(-20deg); }
          40% { transform: skew(20deg); }
          60% { transform: skew(-5deg); }
          100% { transform: skew(0deg); }
        }
        .animate-scan { animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-float-1 { animation: float-up 3s ease-out infinite; animation-delay: 0s; }
        .animate-float-2 { animation: float-up 3s ease-out infinite; animation-delay: 1s; }
        .animate-float-3 { animation: float-up 3s ease-out infinite; animation-delay: 2s; }
        .animate-shake-hard { animation: shake-hard 0.5s ease-in-out infinite; }
        .animate-glitch { animation: glitch-skew 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite both; }
      `}</style>

      {/* Main Reactor Container */}
      <div className={`relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center transition-all duration-700 ${state === 'high' ? 'animate-shake-hard' : ''}`}>
        
        {/* Background Glow */}
        <div className={`absolute inset-0 rounded-full blur-[60px] opacity-40 transition-colors duration-500 ${config.bg.replace('/10', '/40')}`}></div>

        {/* Outer Ring */}
        <div className={`absolute inset-0 rounded-full border-2 ${config.ring} transition-all duration-700 
          ${state === 'low' ? 'animate-[spin_10s_linear_infinite]' : ''} 
          ${state === 'medium' ? 'animate-[spin_4s_linear_infinite] border-dashed' : ''}
          ${state === 'high' ? 'border-4 border-dashed opacity-50' : ''}
        `}></div>

        {/* Middle Ring */}
        <div className={`absolute inset-4 rounded-full border ${isDark ? 'border-white/5' : 'border-gray-200'} transition-all duration-700
          ${state === 'low' ? 'animate-[spin_15s_linear_infinite_reverse]' : ''}
          ${state === 'medium' ? 'animate-pulse' : ''}
          ${state === 'high' ? 'hidden' : ''}
        `}></div>

        {/* Core Circle */}
        <div className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full border-4 ${config.border} flex flex-col items-center justify-center ${isDark ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-xl ${config.shadow} transition-all duration-500 overflow-hidden`}>
          
          {/* STATE: LOW RISK */}
          {state === 'low' && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute left-1/4 top-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-float-1"></div>
              <div className="absolute left-1/2 top-2/3 w-3 h-3 bg-emerald-500/50 rounded-full animate-float-2"></div>
              <div className="absolute right-1/3 top-1/2 w-2 h-2 bg-teal-400 rounded-full animate-float-3"></div>
            </div>
          )}

          {/* STATE: MEDIUM RISK */}
          {state === 'medium' && (
            <div className="absolute inset-0 w-full h-1 bg-amber-500/30 blur-sm animate-scan shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
          )}

          {/* STATE: HIGH RISK */}
          {state === 'high' && (
            <>
              <div className="absolute inset-0 bg-rose-500/10 animate-pulse"></div>
              <div className="absolute top-10 left-0 w-full h-1 bg-rose-500/50 animate-glitch"></div>
              <div className="absolute bottom-10 left-0 w-full h-2 bg-rose-600/30 animate-glitch" style={{ animationDelay: '0.1s' }}></div>
            </>
          )}

          {/* Core Content */}
          <div className="relative z-10 flex flex-col items-center">
            <Icon className={`w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3 transition-colors duration-300 ${config.color} ${state === 'medium' ? 'animate-bounce' : ''}`} />
            
            <div className={`text-4xl md:text-5xl font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tighter tabular-nums mb-1 font-mono`}>
              {riskScore.toFixed(1)}<span className="text-xl md:text-2xl text-gray-500">%</span>
            </div>
            
            <div className={`text-xs md:text-sm font-bold tracking-[0.2em] uppercase ${config.color}`}>
              {config.sublabel}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-6 md:mt-8 text-center space-y-1">
        <div className={`text-2xl md:text-3xl font-black tracking-tighter transition-colors duration-300 ${config.color}`}>
          {config.label}
        </div>
        <div className="text-gray-500 text-xs md:text-sm font-medium tracking-wide uppercase">
          {config.desc}
        </div>
      </div>
    </div>
  );
});

const SliderRow = memo(({ field, value, onChange, isDark }) => {
  return (
    <div className={`${isDark ? 'bg-white/5 border-white/10 hover:border-blue-500/30' : 'bg-white border-gray-200 hover:border-blue-500/50 shadow-sm'} p-6 rounded-2xl border transition-all duration-300 group`}>
      <div className="flex justify-between items-center mb-4">
        <label className={`flex items-center gap-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'} group-hover:scale-110 transition-transform`}><field.icon className="w-5 h-5" /></div>
          {field.label}
        </label>
        <span className={`text-blue-500 font-mono font-bold ${isDark ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'} px-3 py-1 rounded-md border`}>
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
        className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all mb-4 dark:bg-gray-700"
      />
      <div className="opacity-60 group-hover:opacity-100 transition-opacity">
        <MembershipGraph type={field.id} value={value} height={60} isDark={isDark} />
      </div>
    </div>
  );
});

const Navbar = ({ onViewChange, currentView, isDark, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b transition-colors duration-300 ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-gray-200'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => onViewChange('home')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>RiskAI<span className="text-blue-500">.</span></h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Banking Intelligence</p>
          </div>
        </div>

        <div className={`hidden md:flex items-center gap-1 p-1 rounded-full border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
          {[
            { id: 'home', label: 'Home', icon: Brain },
            { id: 'input', label: 'Simulator', icon: PlayCircle },
            { id: 'market', label: 'Market Strategy', icon: Globe },
            { id: 'docs', label: 'Documentation', icon: BookOpen },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                currentView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                : isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-all ${isDark ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            className={`md:hidden p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className={`md:hidden absolute top-20 left-0 right-0 border-b backdrop-blur-xl p-4 flex flex-col gap-2 shadow-2xl ${isDark ? 'bg-black/95 border-white/10' : 'bg-white/95 border-gray-200'}`}>
           {[
            { id: 'home', label: 'Home', icon: Brain },
            { id: 'input', label: 'Simulator', icon: PlayCircle },
            { id: 'market', label: 'Market Strategy', icon: Globe },
            { id: 'docs', label: 'Documentation', icon: BookOpen },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                setIsOpen(false);
              }}
              className={`px-4 py-3 rounded-xl text-left font-medium flex items-center gap-3 transition-all ${
                currentView === item.id 
                ? 'bg-blue-600 text-white' 
                : isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

const Footer = ({ isDark }) => (
  <footer className={`${isDark ? 'bg-black border-white/10' : 'bg-white border-gray-200'} border-t py-12 md:py-20 mt-auto transition-colors duration-300`}>
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-2 mb-6">
           <Landmark className="w-6 h-6 text-blue-500" />
           <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>RiskAI.</span>
        </div>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Empowering financial institutions with explainable AI and fuzzy logic decision engines.
        </p>
        <div className="flex gap-4">
          {[Twitter, Github, Linkedin].map((Icon, i) => (
            <a key={i} href="#" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}>
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
      
      {[
        { title: "Product", links: ["Features", "Simulator", "Documentation", "API"] },
        { title: "Company", links: ["About Us", "Banking Partners", "Blog", "Contact"] },
        { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Compliance", "Security"] }
      ].map((col, i) => (
        <div key={i}>
          <h4 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>{col.title}</h4>
          <ul className="space-y-4">
            {col.links.map(link => (
              <li key={link}>
                <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors text-sm">{link}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className={`max-w-7xl mx-auto px-6 mt-12 pt-8 border-t text-center md:text-left text-xs text-gray-600 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
      © 2024 RiskAI Banking Solutions. All rights reserved.
    </div>
  </footer>
);

/**
 * ------------------------------------------------------------------
 * VIEW COMPONENTS
 * ------------------------------------------------------------------
 */

const LandingView = ({ onStart, onViewDocs, isDark }) => (
  <div className={`min-h-screen pt-20 transition-colors duration-500 ${isDark ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black' : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-gray-50'}`}>
    {/* Grid Pattern Background */}
    <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none ${isDark ? 'opacity-20' : 'opacity-30'}`}></div>
    
    {/* Hero */}
    <div className="relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
      <FinancialParticles isDark={isDark} />
      
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10 text-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium mb-8 animate-fade-in-up ${isDark ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white border-gray-200 text-blue-600 shadow-sm'}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Next Gen Banking AI
        </div>
        
        <h1 className={`text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1] ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Intelligent Loan <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Risk Assessment</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
          Go beyond simple 'Yes/No' checks. This system utilizes <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fuzzy Logic</span> to calculate a precise risk score, evaluating applicant nuances that binary models ignore.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStart}
            className={`px-8 py-4 font-bold text-lg rounded-full transition-all flex items-center gap-2 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:scale-105 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            Start Simulation <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={onViewDocs}
            className={`px-8 py-4 font-bold text-lg rounded-full border transition-all flex items-center gap-2 ${isDark ? 'bg-white/5 text-white border-white/10 hover:bg-white/10' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            View Documentation
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MarketView = ({ isDark }) => (
    <div className={`min-h-screen pt-24 pb-20 transition-colors duration-500 ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className={`text-4xl md:text-5xl font-black tracking-tighter mb-4 text-transparent bg-clip-text ${isDark ? 'bg-gradient-to-br from-white to-gray-500' : 'bg-gradient-to-br from-gray-900 to-gray-600'}`}>
                    Market Potential & Strategy
                </h2>
                <p className="text-xl text-gray-500">Turning fuzzy sets into a scalable business opportunity.</p>
            </div>

            <div className="space-y-24">
                
                {/* 1. Target Audience */}
                <section>
                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                        <Users className="text-blue-500" /> Target Audience
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`p-6 rounded-2xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:border-blue-500/50 shadow-sm'}`}>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                                <GraduationCap className="w-6 h-6 text-blue-400" />
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Students & Borrowers</h4>
                            <p className="text-gray-500">
                                Individuals with limited credit history seeking to understand loan approval odds without a credit check.
                            </p>
                        </div>
                        <div className={`p-6 rounded-2xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-purple-500/50' : 'bg-white border-gray-200 hover:border-purple-500/50 shadow-sm'}`}>
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                                <Rocket className="w-6 h-6 text-purple-400" />
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Aspiring Entrepreneurs</h4>
                            <p className="text-gray-500">
                                Startup founders needing to simulate how business income and co-applicant variables affect funding eligibility.
                            </p>
                        </div>
                        <div className={`p-6 rounded-2xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:border-green-500/50' : 'bg-white border-gray-200 hover:border-green-500/50 shadow-sm'}`}>
                             <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-green-400" />
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Educators</h4>
                            <p className="text-gray-500">
                                Financial literacy instructors using the system as an interactive teaching aid.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 2. Revenue Models */}
                <section>
                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 border-l-4 border-green-500 pl-4">
                        <DollarSign className="text-green-500" /> Revenue Model
                    </h3>
                    <div className={`p-8 rounded-3xl border ${isDark ? 'bg-gradient-to-br from-green-900/10 to-blue-900/10 border-white/10' : 'bg-white border-gray-200 shadow-md'}`}>
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-shrink-0 bg-green-500/20 p-6 rounded-full">
                                <Briefcase className="w-16 h-16 text-green-400" />
                            </div>
                            <div>
                                <h4 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Freemium SaaS Strategy</h4>
                                <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    The core Loan Risk Evaluator is offered as a free educational tool to build user trust and traffic. 
                                    Revenue is generated through a <span className="text-green-500 font-bold">Premium Optimization Service</span>. 
                                    While free users see their risk level (Low/Medium/High), paid users unlock specific, actionable insights on how to improve their standing (e.g., "Increasing co-applicant income by $500 shifts your risk profile from High to Medium"). This converts the system from a passive simulator into an active financial planning assistant.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Fuzzy SWOT Analysis */}
                <section>
                     <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 border-l-4 border-purple-500 pl-4">
                        <Scale className="text-purple-500" /> Fuzzy SWOT Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-2xl border-l-4 border-green-500 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <h4 className="font-bold text-green-500 uppercase mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Strengths</h4>
                            <ul className="space-y-3">
                                <li className={`flex gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transparent Logic:</span> Unlike "black box" AI, the fuzzy logic system visually explains why a decision was made.</li>
                                <li className={`flex gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Nuanced Assessment:</span> Provides gradual risk feedback (e.g., "Medium-High") rather than binary rejections.</li>
                            </ul>
                        </div>
                        <div className={`p-6 rounded-2xl border-l-4 border-yellow-500 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <h4 className="font-bold text-yellow-500 uppercase mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Weaknesses</h4>
                            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Calibration Sensitivity:</span> The fuzzy rule base requires manual tuning by domain experts to remain accurate against changing economic policies.</p>
                        </div>
                        <div className={`p-6 rounded-2xl border-l-4 border-blue-500 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <h4 className="font-bold text-blue-500 uppercase mb-4 flex items-center gap-2"><Lightbulb className="w-5 h-5" /> Opportunities</h4>
                            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Integration:</span> Can be embedded as a widget on real estate, automotive, or university financial aid websites.</p>
                        </div>
                        <div className={`p-6 rounded-2xl border-l-4 border-red-500 ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                            <h4 className="font-bold text-red-500 uppercase mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Threats</h4>
                            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}><span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Regulatory Changes:</span> Shifts in lending laws may require significant updates to the underlying fuzzy inference engine.</p>
                        </div>
                    </div>
                </section>

                {/* 4. Growth Roadmap */}
                <section>
                    <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 border-l-4 border-orange-500 pl-4">
                        <Map className="text-orange-500" /> The Growth Roadmap
                    </h3>
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className={`absolute top-8 left-0 w-full h-1 hidden md:block ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { 
                                    phase: "Phase 1", 
                                    title: "Knowledge Acquisition", 
                                    subtitle: "Rule Base Definition",
                                    desc: "Conducting domain research to define linguistic variables and constructing the initial fuzzy rule base matrix.",
                                    color: "blue"
                                },
                                { 
                                    phase: "Phase 2", 
                                    title: "Core Development", 
                                    subtitle: "Inference Engine Implementation",
                                    desc: "Developing the core Fuzzy Inference System and integrating it with the interactive HTML5 Canvas frontend.",
                                    color: "purple"
                                },
                                { 
                                    phase: "Phase 3", 
                                    title: "System Calibration", 
                                    subtitle: "Membership Function Tuning",
                                    desc: "Iterative adjustment of fuzzy membership function shapes and rule weights to match expert reasoning.",
                                    color: "indigo"
                                },
                                { 
                                    phase: "Phase 4", 
                                    title: "Validation & Testing", 
                                    subtitle: "Scenario & User Testing",
                                    desc: "Running test cases with diverse user profiles (students, entrepreneurs) to verify logic stability.",
                                    color: "orange"
                                },
                                { 
                                    phase: "Phase 5", 
                                    title: "Deployment & Scaling", 
                                    subtitle: "Commercial Launch",
                                    desc: "Final deployment to live web environment, optimization for mobile responsiveness, and API development.",
                                    color: "green"
                                }
                            ].map((step, i) => (
                                <div key={i} className={`relative border p-4 rounded-2xl z-10 flex flex-col items-center text-center group hover:border-${step.color}-500 transition-colors h-full ${isDark ? 'bg-black border-white/20' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className={`w-12 h-12 bg-${step.color}-600 rounded-full flex items-center justify-center text-white font-black text-lg mb-4 border-4 group-hover:scale-110 transition-transform ${isDark ? 'border-black' : 'border-white'}`}>{i+1}</div>
                                    <div className={`text-xs font-bold text-${step.color}-500 uppercase tracking-widest mb-1`}>{step.phase}</div>
                                    <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{step.title}</h4>
                                    <div className="text-xs text-gray-500 font-mono mb-2">{step.subtitle}</div>
                                    <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    </div>
)

const DocsView = ({ isDark }) => (
  <div className={`min-h-screen pt-24 pb-20 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-black tracking-tighter mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Documentation</h2>
              <p className="text-xl text-gray-500">Technical specifications and logic definitions.</p>
          </div>

          <div className="space-y-12">
              {/* System Overview */}
              <section>
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Zap className="text-blue-500" /> System Overview
                  </h3>
                  <div className={`p-8 rounded-3xl border prose max-w-none ${isDark ? 'bg-white/5 border-white/10 prose-invert' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <p>
                          RiskAI utilizes a <strong>Mamdani Fuzzy Inference System (FIS)</strong> to evaluate loan applicant risk. 
                          Unlike traditional binary systems (Approved/Rejected), our engine maps inputs to continuous fuzzy sets, 
                          applies a ruleset to determine risk consequence, and defuzzifies the result into a precise risk percentage.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-500">
                          <li><strong>Fuzzification:</strong> Converts crisp inputs (e.g., Age: 25) into fuzzy degrees (e.g., Young: 0.8, Adult: 0.2).</li>
                          <li><strong>Inference:</strong> Evaluates "IF-THEN" rules using the Min-Max method.</li>
                          <li><strong>Defuzzification:</strong> Calculates the Center of Gravity (Centroid) of the aggregated shape.</li>
                      </ul>
                  </div>
              </section>

              {/* Technologies */}
              <section>
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <Brain className="text-purple-500" /> Technologies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>React 18</h4>
                          <p className="text-sm text-gray-500">Component-based UI with efficient state management for real-time calculation.</p>
                      </div>
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tailwind CSS</h4>
                          <p className="text-sm text-gray-500">Utility-first styling for responsive, glassmorphic financial aesthetics.</p>
                      </div>
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Lucide Icons</h4>
                          <p className="text-sm text-gray-500">Clean, consistent visual language for banking interfaces.</p>
                      </div>
                  </div>
              </section>

              {/* Rules Table */}
              <section>
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <List className="text-green-500" /> Rule Base Definition
                  </h3>
                  <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-gray-500">
                              <thead className={`${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} uppercase font-bold text-xs`}>
                                  <tr>
                                      <th className="p-4">ID</th>
                                      <th className="p-4">Logic (IF ... THEN)</th>
                                      <th className="p-4">Description</th>
                                  </tr>
                              </thead>
                              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                                  {RULES.map((rule, idx) => (
                                      <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                          <td className="p-4 font-mono text-blue-500">R{idx + 1}</td>
                                          <td className="p-4">
                                              {Object.entries(rule.if).map(([k, v], i) => (
                                                  <span key={i} className="block">
                                                      {k} is <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{v}</span>
                                                  </span>
                                              ))}
                                              <span className="block mt-1 text-purple-500 font-bold">Risk is {rule.then.risk}</span>
                                          </td>
                                          <td className="p-4 italic">{rule.desc}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </section>
          </div>
      </div>
  </div>
);

const SimulatorView = ({ inputs, onInputChange, computation, setShowRules, setView, isDark }) => (
  <div className={`min-h-screen pt-24 pb-12 transition-colors duration-500 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
    {/* Background Grid Pattern */}
    <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none ${isDark ? 'opacity-20' : 'opacity-10'}`}></div>

    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
      <div className="flex flex-col-reverse xl:flex-row gap-8 lg:gap-12 items-start">
        
        {/* Input Column - Reorganized into a Grid */}
        {/* Expanded width to 3/4 to accommodate 3-column grid better */}
        <div className="w-full xl:w-3/4 space-y-8">
          <div>
            <h2 className={`text-3xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Input Variables</h2>
            <p className="text-gray-500">Adjust the sliders to simulate an applicant profile.</p>
          </div>
          
          {/* Grid Layout: 1 col (mobile), 2 col (tablet), 2 col (desktop) - Creates 3 rows for 6 items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {[
              { id: 'loanAmount', label: 'Loan Amount', icon: Wallet, min: 0, max: 150000, step: 1000 },
              { id: 'age', label: 'Age', icon: Calendar, min: 18, max: 90, step: 1 },
              { id: 'income', label: 'Monthly Income', icon: DollarSign, min: 0, max: 10000, step: 100 },
              { id: 'coIncome', label: 'Co-Applicant Income', icon: Users, min: 0, max: 10000, step: 100 },
              { id: 'installment', label: 'Monthly Installment', icon: Activity, min: 0, max: 10000, step: 100 },
              { id: 'dependents', label: 'Dependents', icon: Users, min: 0, max: 6, step: 1 },
            ].map(field => (
              <SliderRow 
                key={field.id}
                field={field}
                value={inputs[field.id]}
                onChange={onInputChange}
                isDark={isDark}
              />
            ))}
          </div>
        </div>

        {/* Visualization Column - Sticky Sidebar */}
        {/* Reduced width to 1/4 to balance with the wider input column */}
        <div className="w-full xl:w-1/4 xl:sticky xl:top-28 flex flex-col items-center justify-start gap-8">
          
          <div className="relative group">
            <Banker riskScore={computation.centroid} isDark={isDark} />
            
            {/* Floating Labels - Dynamic based on risk score */}
            {computation.centroid < 40 && (
              <div className={`absolute -right-16 top-0 border px-4 py-2 rounded-xl shadow-lg backdrop-blur-md hidden md:block animate-bounce delay-100 ${isDark ? 'bg-gray-900 border-emerald-500/30' : 'bg-white border-emerald-200'}`}>
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Safe Zone</span>
              </div>
            )}
            {computation.centroid >= 70 && (
              <div className={`absolute -right-16 top-0 border px-4 py-2 rounded-xl shadow-lg backdrop-blur-md hidden md:block animate-bounce delay-100 ${isDark ? 'bg-gray-900 border-rose-500/30' : 'bg-white border-rose-200'}`}>
                <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">Warning</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button 
              onClick={() => setShowRules(true)}
              className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all group ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm'}`}
            >
              <List className={`w-5 h-5 ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`} /> Active Rules
            </button>
            <button 
              onClick={() => setView('inference')}
              className="py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 hover:scale-[1.02] transition-all"
            >
              View Inference Process <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  </div>
);

const DashboardView = ({ inputs, computation, setView, isDark }) => (
  <div className={`min-h-screen pt-24 pb-20 transition-colors duration-500 ${isDark ? 'bg-black' : 'bg-gray-50'}`}>
    <div className="max-w-7xl mx-auto px-6">
      
      {/* Navigation Back */}
      <div className="mb-8">
        <button 
          onClick={() => setView('input')} 
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          <div className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-white shadow-sm border border-gray-200'}`}><ChevronLeft className="w-4 h-4" /></div>
          Back to Simulator
        </button>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px bg-blue-500 w-12" />
          <span className="text-blue-500 font-mono text-sm tracking-widest uppercase">System Trace</span>
        </div>
        <h2 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>Inference Logic</h2>
      </div>

      {/* Step 1 */}
      <div className="mb-20">
         <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm text-white">01</span>
              Fuzzification
            </h3>
            <span className="text-gray-500 text-sm font-mono hidden sm:block">INPUTS → FUZZY SETS</span>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.keys(inputs).map(key => (
              <div key={key} className={`p-5 rounded-2xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">{FIELD_LABELS[key]}</div>
                <div className={`text-2xl font-bold mb-3 font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>{inputs[key]}</div>
                <div className={`space-y-1.5 border-t pt-3 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    {Object.entries(computation.fuzzified[key]).map(([set, val]) => (
                        val > 0 && <div key={set} className="text-xs flex justify-between items-center text-blue-500 font-mono">
                          <span>{set}</span>
                          <span className={`px-1.5 rounded ${isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>{val.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* Step 2 */}
      <div className="mb-20">
         <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm text-white">02</span>
              Rule Evaluation
            </h3>
            <span className="text-gray-500 text-sm font-mono hidden sm:block">ANTECEDENTS → CONSEQUENTS</span>
         </div>
         <div className="space-y-4">
            {computation.ruleResults.length === 0 ? (
               <div className={`p-8 border rounded-2xl text-center font-mono ${isDark ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                 NO RULES TRIGGERED FOR CURRENT INPUT STATE
               </div>
            ) : (
              computation.ruleResults.map((rule, idx) => (
                <div key={idx} className={`rounded-2xl border overflow-hidden transition-colors group ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/[0.07]' : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm'}`}>
                   <div className={`p-4 border-b flex flex-wrap items-center gap-4 ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>RULE {idx + 1}</span>
                      <span className="text-gray-500 text-sm italic">"{rule.desc}"</span>
                      <span className="ml-auto text-xs font-mono text-gray-500">STRENGTH: <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rule.strength.toFixed(2)}</span></span>
                   </div>
                   <div className="p-6 overflow-x-auto">
                     <div className="flex items-center gap-6 min-w-max">
                        {rule.antecedents.map((ant, i) => (
                           <React.Fragment key={i}>
                              <AntecedentGraph varName={ant.varName} setName={ant.setName} value={ant.value} membership={ant.membership} isDark={isDark} />
                              {i < rule.antecedents.length - 1 && <span className={`text-xs font-bold px-2 py-1 rounded ${isDark ? 'text-gray-600 bg-black/40' : 'text-gray-400 bg-gray-100'}`}>AND</span>}
                           </React.Fragment>
                        ))}
                        <ArrowRight className="text-gray-400 w-6 h-6" />
                        <ConsequentGraph outputSet={rule.outputSet} strength={rule.strength} width={200} isDark={isDark} />
                     </div>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>

      {/* Step 3 */}
      <div className="mb-20">
        <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-sm text-white">03</span>
              Aggregation & Defuzzification
            </h3>
            <span className="text-gray-500 text-sm font-mono hidden sm:block">CENTROID CALCULATION</span>
         </div>
         <div className={`rounded-3xl border p-1 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`rounded-[22px] p-6 md:p-12 relative overflow-hidden ${isDark ? 'bg-black/50' : 'bg-gray-50'}`}>
               {/* Grid BG inside Chart */}
               <div className={`absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none ${isDark ? 'opacity-20' : 'opacity-10'}`}></div>
               
               <div className="h-64 w-full mb-8 relative z-10">
                  <svg width="100%" height="100%" viewBox="0 0 800 300" className="overflow-visible">
                     <GradientDefs />
                     <line x1="0" y1="300" x2="800" y2="300" stroke={isDark ? "#333" : "#d1d5db"} strokeWidth="1" />
                     {/* Aggregated Shape */}
                     {(() => {
                        let pathD = "M 0,300 ";
                        computation.aggregatedCurve.forEach((val, x) => pathD += `L ${x * 8},${300 - (val * 300)} `);
                        pathD += "L 800,300 Z";
                        return <path d={pathD} fill="url(#grad-final)" stroke="#10b981" strokeWidth="3" className="drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />;
                     })()}
                     {/* Centroid */}
                     <g>
                        <line x1={computation.centroid * 8} y1="0" x2={computation.centroid * 8} y2="300" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 4" />
                        <circle cx={computation.centroid * 8} cy="300" r="8" fill="#ef4444" className="animate-pulse" />
                     </g>
                  </svg>
               </div>

               <div className={`flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 p-6 rounded-2xl backdrop-blur-md border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div>
                    <h4 className={`font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>Final Calculated Risk</h4>
                    <div className="text-xs text-gray-500">Centroid Method (COG)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 font-mono">
                      {computation.centroid.toFixed(2)}%
                    </div>
                    <div className={`font-bold tracking-widest text-sm mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{getRiskLabel(computation.centroid)}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  </div>
);

/**
 * ------------------------------------------------------------------
 * MAIN APP CONTAINER
 * ------------------------------------------------------------------
 */

export default function LoanRiskApp() {
  const [view, setView] = useState('home');
  const [showRules, setShowRules] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [inputs, setInputs] = useState({
    loanAmount: 35000,
    age: 30,
    income: 4500,
    coIncome: 0,
    installment: 2000,
    dependents: 1
  });

  const toggleTheme = () => setIsDark(!isDark);

  // Inference Logic
  const computation = useMemo(() => {
    // 1. Fuzzify
    const fuzzified = {};
    Object.keys(inputs).forEach(key => {
      fuzzified[key] = {};
      Object.entries(MFS[key].sets).forEach(([setName, coords]) => {
        fuzzified[key][setName] = getMembership(inputs[key], coords);
      });
    });

    // 2. Evaluate
    const allRules = RULES.map(rule => {
      const antecedents = Object.entries(rule.if).map(([k, v]) => ({
        varName: k, setName: v, value: inputs[k], membership: fuzzified[k][v]
      }));
      const strength = Math.min(...antecedents.map(a => a.membership));
      return { ...rule, antecedents, strength, outputSet: rule.then.risk };
    });
    const activeRules = allRules.filter(r => r.strength > 0);
    const ruleStrengths = allRules.map(r => r.strength);

    // 3. Aggregate
    const riskDomain = Array.from({ length: 101 }, (_, i) => i);
    const aggregatedCurve = riskDomain.map(x => {
      let max = 0;
      activeRules.forEach(r => {
        const shape = getMembership(x, MFS.risk.sets[r.outputSet]);
        const clip = Math.min(shape, r.strength);
        if (clip > max) max = clip;
      });
      return max;
    });

    // 4. Defuzzify
    let num = 0, den = 0;
    riskDomain.forEach((x, i) => { num += x * aggregatedCurve[i]; den += aggregatedCurve[i]; });
    
    return { fuzzified, ruleResults: activeRules, ruleStrengths, aggregatedCurve, centroid: den === 0 ? 0 : num / den };
  }, [inputs]);

  const handleInputChange = (id, val) => setInputs(prev => ({ ...prev, [id]: val }));

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-500 ${isDark ? 'bg-black text-gray-100 selection:bg-blue-500/30 selection:text-blue-200' : 'bg-gray-50 text-gray-900 selection:bg-blue-200 selection:text-blue-900'}`}>
      <Navbar currentView={view} onViewChange={setView} isDark={isDark} toggleTheme={toggleTheme} />
      
      {showRules && <RulesModal onClose={() => setShowRules(false)} rules={RULES} ruleStrengths={computation.ruleStrengths} isDark={isDark} />}

      <main className="flex-grow">
        {view === 'home' && <LandingView onStart={() => setView('input')} onViewDocs={() => setView('docs')} isDark={isDark} />}
        {view === 'market' && <MarketView isDark={isDark} />}
        {view === 'docs' && <DocsView isDark={isDark} />}
        {view === 'input' && (
          <SimulatorView 
            inputs={inputs} 
            onInputChange={handleInputChange} 
            computation={computation} 
            setShowRules={setShowRules}
            setView={setView}
            isDark={isDark}
          />
        )}
        {view === 'inference' && <DashboardView inputs={inputs} computation={computation} setView={setView} isDark={isDark} />}
      </main>

      <Footer isDark={isDark} />
    </div>
  );
}

// Re-using the Modal Component from previous version but styling it
const RulesModal = ({ onClose, rules, ruleStrengths, isDark }) => {
    if (!rules) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
        <div className={`w-full max-w-2xl max-h-[80vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
          <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-black/40' : 'border-gray-100 bg-gray-50'}`}>
             <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
               <List className="text-blue-500" /> System Rules
             </h3>
             <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'}`}>
               <X className="w-5 h-5" />
             </button>
          </div>
          <div className="overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {rules.map((rule, idx) => {
               const strength = ruleStrengths[idx];
               const isActive = strength > 0;
               return (
                 <div key={idx} className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-blue-500/10 border-blue-500/30' : isDark ? 'bg-white/5 border-white/5 opacity-50' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                   <div className="flex justify-between items-start mb-1">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>Rule {idx + 1}</span>
                     {isActive && <span className="text-xs font-bold text-blue-500">ACTIVE ({strength.toFixed(2)})</span>}
                   </div>
                   <p className={`text-sm font-mono mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="text-blue-500">IF</span> {Object.entries(rule.if).map(([k, v], i, arr) => (
                         <span key={k}>{k} is <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{v}</span>{i < arr.length - 1 && " AND "}</span>
                      ))} <span className="text-purple-500">THEN</span> Risk is <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{rule.then.risk}</span>
                   </p>
                 </div>
               )
            })}
          </div>
        </div>
      </div>
    )
  }