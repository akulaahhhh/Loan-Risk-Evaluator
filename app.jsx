import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
  AlertCircle, ArrowRight, Activity, DollarSign, Users, Calendar, 
  Calculator, ChevronLeft, Zap, X, List, Info, TrendingUp, 
  ShieldCheck, Brain, Target, BarChart3, CheckCircle2, Menu,
  Github, Twitter, Linkedin, ChevronRight, LayoutDashboard, PlayCircle,
  Briefcase, LineChart, Lock, FileText, Globe, Landmark, Scale, BookOpen,
  Map, Rocket, Flag, Server, Database, Lightbulb, GraduationCap, AlertTriangle, Search,
  Sun, Moon, CreditCard, Coins, Wallet, Sparkles
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
    min: 0, max: 10000, unit: 'RM',
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
    min: 0, max: 10000, unit: 'RM',
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
    min: 0, max: 150000, unit: 'RM',
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
    min: 0, max: 10000, unit: 'RM',
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
  { if: { income: 'Medium', installment: 'Medium', dependents: 'High' }, then: { risk: 'High' }, desc: "Disposable income evaporated by dependents despite medium income." },
  
  // 2. The "Retiree Trap"
  { if: { age: 'Senior', income: 'Low', loanAmount: 'Large' }, then: { risk: 'High' }, desc: "Senior applicant with low cash flow taking large debt." },
  
  // 3. The "Ambitions Youth"
  { if: { age: 'Young', income: 'Low', loanAmount: 'Medium', coIncome: 'Low' }, then: { risk: 'High' }, desc: "Young, low income, no support, significant debt." },

  // 4. "Co-Signer isn't a Magic Bullet"
  { if: { loanAmount: 'Large', income: 'Low', coIncome: 'Medium' }, then: { risk: 'High' }, desc: "Primary borrower too weak for Large loan; Medium co-signer insufficient." },

  // 5. The "Double Burden"
  { if: { installment: 'High', dependents: 'High', income: 'Medium' }, then: { risk: 'High' }, desc: "Cannot support high debt and large family on medium income." },
  { if: { installment: 'High', dependents: 'High', income: 'Low' }, then: { risk: 'High' }, desc: "Guaranteed insolvency." },

  // 6. The "Rich Family" Exception
  { if: { income: 'High', dependents: 'High', installment: 'Medium' }, then: { risk: 'Low' }, desc: "High income creates enough buffer for family and debt." },

  // 7. Small Loan Sensitivity
  { if: { loanAmount: 'Small', income: 'Low', installment: 'High' }, then: { risk: 'High' }, desc: "Predatory lending scenario: Small loan with crushing terms." }
];

/**
 * ------------------------------------------------------------------
 * HIGH-END UI COMPONENTS
 * ------------------------------------------------------------------
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
        <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#475569" : "#e2e8f0"} strokeWidth="1" />
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
        <div className={`text-[10px] font-semibold mb-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{FIELD_LABELS[varName] || varName} = {value}</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded border`}>
            <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1" />
            <polygon points={points} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" />
            <line x1={intersectX} y1={height} x2={intersectX} y2={intersectY} stroke="#fbbf24" strokeWidth="2" />
            <circle cx={intersectX} cy={intersectY} r="3" fill="#fbbf24" />
            <line x1={intersectX} y1={intersectY} x2={width} y2={intersectY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill={isDark ? "#94a3b8" : "#64748b"}>{setName}</text>
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
        <div className={`text-[10px] font-semibold mb-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Risk ({outputSet})</div>
        <svg width={width} height={height} viewBox={`0 -15 ${width} ${height + 30}`} className={`${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded border`}>
            <line x1="0" y1={height} x2={width} y2={height} stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1" />
            <polygon points={points} fill="none" stroke={isDark ? "#475569" : "#cbd5e1"} strokeWidth="1" strokeDasharray="4" />
            <defs><clipPath id={`clip-${outputSet}-${strength.toFixed(3)}`}><rect x="0" y={clipY} width={width} height={height} /></clipPath></defs>
            <polygon points={points} fill="rgba(168, 85, 247, 0.4)" stroke="#a855f7" strokeWidth="2" clipPath={`url(#clip-${outputSet}-${strength.toFixed(3)})`} />
            <line x1="0" y1={clipY} x2={width} y2={clipY} stroke="#fbbf24" strokeWidth="2" />
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="10" fill={isDark ? "#94a3b8" : "#64748b"}>{outputSet}</text>
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
        <div className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full border-4 ${config.border} flex flex-col items-center justify-center ${isDark ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl ${config.shadow} transition-all duration-500 overflow-hidden`}>
          
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
            
            <div className={`text-4xl md:text-5xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tighter tabular-nums mb-1 font-sans`}>
              {riskScore.toFixed(1)}<span className="text-xl md:text-2xl text-slate-500">%</span>
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
        <div className="text-slate-500 text-xs md:text-sm font-medium tracking-wide uppercase">
          {config.desc}
        </div>
      </div>
    </div>
  );
});

const SliderRow = memo(({ field, value, onChange, isDark }) => {
  const unit = MFS[field.id].unit;
  return (
    <div className={`${isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-indigo-500/50 shadow-sm'} p-6 rounded-2xl border transition-all duration-300 group`}>
      <div className="flex justify-between items-center mb-4">
        <label className={`flex items-center gap-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
          <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} group-hover:scale-110 transition-transform`}><field.icon className="w-5 h-5" /></div>
          {field.label}
        </label>
        <span className={`text-indigo-500 font-bold ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-indigo-50 border-indigo-100'} px-3 py-1 rounded-md border text-sm`}>
          {unit === 'RM' ? (
            <>
              <span className="text-slate-400 text-xs mr-1">{unit}</span>
              {value}
            </>
          ) : (
            <>
              {value}
              <span className="text-slate-400 text-xs ml-1">{unit}</span>
            </>
          )}
        </span>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(field.id, Number(e.target.value))}
        className="w-full h-2 bg-slate-300 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all mb-4 dark:bg-slate-700"
      />
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">
        <MembershipGraph type={field.id} value={value} height={60} isDark={isDark} />
      </div>
    </div>
  );
});

const Navbar = ({ onViewChange, currentView, isDark, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className={`fixed top-4 left-4 right-4 z-50 rounded-2xl backdrop-blur-xl border shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => onViewChange('home')}
        >
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:rotate-6 transition-transform">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <span className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>RiskAI<span className="text-indigo-500">.</span></span>
        </div>

        <div className={`hidden md:flex items-center gap-1`}>
          {[
            { id: 'home', label: 'Home', icon: Brain },
            { id: 'input', label: 'Simulator', icon: PlayCircle },
            { id: 'market', label: 'Market Strategy', icon: Globe },
            { id: 'docs', label: 'Documentation', icon: BookOpen },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                currentView === item.id 
                ? 'bg-indigo-100 text-indigo-700 font-bold' 
                : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <item.icon className={`w-4 h-4 ${currentView === item.id ? 'text-indigo-600' : ''}`} /> {item.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            className={`md:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className={`md:hidden absolute top-20 left-0 right-0 border rounded-2xl backdrop-blur-xl p-4 flex flex-col gap-2 shadow-2xl mx-4 ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
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
                ? 'bg-indigo-600 text-white' 
                : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
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
  <footer className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-t py-12 md:py-16 mt-auto transition-colors duration-300`}>
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center gap-2 mb-6">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
             <Landmark className="w-4 h-4" />
           </div>
           <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>RiskAI.</span>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
          Empowering financial institutions with explainable AI and fuzzy logic decision engines.
        </p>
        <div className="flex gap-4">
          {[Twitter, Github, Linkedin].map((Icon, i) => (
            <a key={i} href="#" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'}`}>
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
          <h4 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>{col.title}</h4>
          <ul className="space-y-4">
            {col.links.map(link => (
              <li key={link}>
                <a href="#" className="text-slate-500 hover:text-indigo-500 transition-colors text-sm font-medium">{link}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className={`max-w-7xl mx-auto px-6 mt-12 pt-8 border-t text-center md:text-left text-xs font-medium text-slate-500 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
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
  <div className={`min-h-screen pt-32 pb-20 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
    {/* Soft Organic Background Blobs */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-30 ${isDark ? 'bg-indigo-900' : 'bg-indigo-200'}`}></div>
        <div className={`absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-20 ${isDark ? 'bg-teal-900' : 'bg-teal-200'}`}></div>
        <div className={`absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full blur-[140px] opacity-20 ${isDark ? 'bg-purple-900' : 'bg-purple-200'}`}></div>
    </div>
    
    <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        
        {/* Pill Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-10 shadow-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600'}`}>
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Next Gen Banking AI</span>
        </div>
        
        {/* Hero Title */}
        <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Intelligent Loan <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400">Risk Assessment</span>
        </h1>
        
        {/* Description */}
        <p className={`text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Go beyond simple 'Yes/No' checks. This system utilizes <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Fuzzy Logic</span> to calculate a precise risk score, evaluating applicant nuances that binary models ignore.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <button 
            onClick={onStart}
            className="px-8 py-4 font-bold text-lg rounded-2xl transition-all flex items-center gap-3 bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] shadow-xl shadow-indigo-600/20 w-full sm:w-auto justify-center"
          >
            Start Simulation <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={onViewDocs}
            className={`px-8 py-4 font-bold text-lg rounded-2xl border transition-all flex items-center gap-3 w-full sm:w-auto justify-center ${isDark ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            <BookOpen className="w-5 h-5" /> View Documentation
          </button>
        </div>

        {/* Feature Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full">
            {[
                { icon: Brain, title: "White Box AI", desc: "Transparent logic rules you can read and verify." },
                { icon: ShieldCheck, title: "Risk Grading", desc: "Granular risk scores, not just binary rejections." },
                { icon: SlidersHorizontal, title: "Adjustable", desc: "Simulate scenarios by tweaking input variables." }
            ].map((f, i) => (
                <div key={i} className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-slate-200'} backdrop-blur-sm`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <f.icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{f.desc}</p>
                </div>
            ))}
        </div>
    </div>
  </div>
);

// Helper for LandingView icon
const SlidersHorizontal = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>
)

const MarketView = ({ isDark }) => (
    <div className={`min-h-screen pt-32 pb-20 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-20">
                <h2 className={`text-4xl md:text-5xl font-bold tracking-tight mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Market Potential & Strategy
                </h2>
                <p className={`text-xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Turning fuzzy sets into a scalable business opportunity.</p>
            </div>

            <div className="space-y-32">
                
                {/* 1. Target Audience - Profile Cards */}
                <section>
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-10 w-2 rounded-full bg-indigo-500"></div>
                        <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Target Audience</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1: The First-Time Borrower */}
                        <div className={`relative p-8 rounded-[2rem] transition-all hover:-translate-y-2 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600 shadow-xl shadow-slate-200/50'}`}>
                            <div className="absolute -top-6 left-8 w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 rotate-3">
                                <GraduationCap className="w-7 h-7" />
                            </div>
                            <h4 className={`text-2xl font-bold mt-6 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>The First-Time Borrower</h4>
                            <div className="space-y-6">
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                    <span className="font-bold text-blue-500 text-xs uppercase tracking-wider block mb-2">Profile</span>
                                    <ul className="space-y-1 text-sm">
                                        <li><span className="font-semibold">Age:</span> 18–25 years old.</li>
                                        <li><span className="font-semibold">Role:</span> Student or Fresh Graduate.</li>
                                        <li><span className="font-semibold">Industry:</span> Gig Economy or Entry-level Retail.</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-wider block mb-2">Pain Points</span>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Limited credit history leads to automatic rejections.</li>
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Does not understand how existing commitments (like PTPTN) affect new loan chances.</li>
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Intimidated by formal bank processes.</li>
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                     <p className={`text-sm italic font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>"To pre-check their loan eligibility and understand their risk level privately before applying to a bank."</p>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: The Self-Employed Applicant */}
                        <div className={`relative p-8 rounded-[2rem] transition-all hover:-translate-y-2 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600 shadow-xl shadow-slate-200/50'}`}>
                            <div className="absolute -top-6 left-8 w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/30 -rotate-2">
                                <Rocket className="w-7 h-7" />
                            </div>
                            <h4 className={`text-2xl font-bold mt-6 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>The Self-Employed Applicant</h4>
                             <div className="space-y-6">
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                    <span className="font-bold text-purple-500 text-xs uppercase tracking-wider block mb-2">Profile</span>
                                    <ul className="space-y-1 text-sm">
                                        <li><span className="font-semibold">Age:</span> 25–40 years old.</li>
                                        <li><span className="font-semibold">Role:</span> Small Business Owner / Entrepreneur.</li>
                                        <li><span className="font-semibold">Industry:</span> E-commerce or SME.</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-wider block mb-2">Pain Points</span>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Income fluctuates, making them look "risky" to standard banking algorithms.</li>
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Needs to know if adding a co-applicant is necessary to get approved.</li>
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Frustrated by lack of transparency on why high loan amounts are rejected.</li>
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                     <p className={`text-sm italic font-medium ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>"To simulate different scenarios (e.g., adding a co-applicant or lowering the loan amount) to find a 'Low Risk' result."</p>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: The Financial Educator */}
                        <div className={`relative p-8 rounded-[2rem] transition-all hover:-translate-y-2 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-600 shadow-xl shadow-slate-200/50'}`}>
                            <div className="absolute -top-6 left-8 w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-500/30 rotate-1">
                                <BookOpen className="w-7 h-7" />
                            </div>
                            <h4 className={`text-2xl font-bold mt-6 mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>The Financial Educator</h4>
                             <div className="space-y-6">
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                    <span className="font-bold text-teal-500 text-xs uppercase tracking-wider block mb-2">Profile</span>
                                    <ul className="space-y-1 text-sm">
                                        <li><span className="font-semibold">Age:</span> 30–60 years old.</li>
                                        <li><span className="font-semibold">Role:</span> Finance Lecturer.</li>
                                        <li><span className="font-semibold">Industry:</span> Higher Education.</li>
                                    </ul>
                                </div>
                                <div>
                                    <span className="font-bold text-slate-400 text-xs uppercase tracking-wider block mb-2">Pain Points</span>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Theoretical "Risk Assessment" is difficult for students to visualize.</li>
                                        <li className="flex gap-2"><X className="w-4 h-4 text-red-400 shrink-0" /> Lacks interactive tools to demonstrate how variables (like Income vs. Debt) interact in real-time.</li>
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                     <p className={`text-sm italic font-medium ${isDark ? 'text-teal-300' : 'text-teal-600'}`}>"To use the system as a teaching aid to visually demonstrate how Fuzzy Logic processes multiple inputs to determine a final risk score."</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Revenue Models */}
                <section>
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-10 w-2 rounded-full bg-teal-500"></div>
                        <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Revenue Model</h3>
                    </div>

                    <div className={`p-10 rounded-[2.5rem] border ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                        <div className="flex flex-col md:flex-row gap-12 items-start">
                            <div className="flex-shrink-0 bg-teal-100 dark:bg-teal-900/50 p-8 rounded-[2rem]">
                                <Briefcase className="w-20 h-20 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Freemium Strategy</h4>
                                <div className={`text-lg leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <p className="mb-8">
                                        The core Loan Risk Evaluator is a free educational tool. Revenue is generated through a Premium Plan which converts the system from a passive simulator into an active financial planning assistant.
                                    </p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { title: "Specific Risk Diagnosis", desc: "Identifies exactly which variable (e.g., High Monthly Installments) is triggering the 'High Risk' result." },
                                            { title: "\"Path to Approval\" Advice", desc: "Calculates specific actions to lower risk (e.g., 'Decrease loan amount by RM 5,000 to reach Medium Risk')." },
                                            { title: "Downloadable Report", desc: "Generates a professional PDF summary of the user's financial profile for record-keeping." }
                                        ].map((benefit, i) => (
                                            <div key={i} className={`p-5 rounded-2xl ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                                                    <h5 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{benefit.title}</h5>
                                                </div>
                                                <p className="text-sm">{benefit.desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-8 font-medium">
                                        This converts the system from a passive simulator into an active financial planning assistant.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Fuzzy SWOT Analysis */}
                <section>
                     <div className="flex items-center gap-4 mb-10">
                        <div className="h-10 w-2 rounded-full bg-purple-500"></div>
                        <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Fuzzy SWOT Analysis</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`p-8 rounded-[2rem] border-t-8 border-emerald-500 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                            <h4 className="font-bold text-emerald-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Strengths (Internal)
                            </h4>
                            <ul className="space-y-4">
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Nuanced Decision Making</span> 
                                    Unlike rigid "Yes/No" bank systems, Fuzzy Logic handles vague data (like "Medium" income) to provide a realistic risk assessment.
                                </li>
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Explainable Logic (White Box)</span> 
                                    The system's rules are transparent. Users can see exactly why they were classified as "High Risk," unlike "Black Box" AI models.
                                </li>
                            </ul>
                        </div>
                        <div className={`p-8 rounded-[2rem] border-t-8 border-amber-500 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                            <h4 className="font-bold text-amber-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Weaknesses (Internal)
                            </h4>
                            <ul className="space-y-4">
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Dependency on Expert Tuning</span> 
                                    The accuracy of the system relies entirely on how well the membership functions (ranges for Low/Medium/High) are defined.
                                </li>
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Scalability Issues</span> 
                                    Adding more variables (e.g., Credit Score, Employment History) increases the number of rules exponentially, making the system complex to manage.
                                </li>
                            </ul>
                        </div>
                        <div className={`p-8 rounded-[2rem] border-t-8 border-blue-500 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                            <h4 className="font-bold text-blue-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                <Lightbulb className="w-5 h-5" /> Opportunities (External)
                            </h4>
                            <ul className="space-y-4">
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Financial Education Market</span> 
                                    Can be positioned as a primary teaching tool for universities to demonstrate "White Box" AI concepts.
                                </li>
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Integration Potential</span> 
                                    Could evolve into a plugin for existing banking apps to give customers a "pre-check" before they apply for real loans.
                                </li>
                            </ul>
                        </div>
                        <div className={`p-8 rounded-[2rem] border-t-8 border-rose-500 ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
                            <h4 className="font-bold text-rose-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5" /> Threats (External)
                            </h4>
                            <ul className="space-y-4">
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Advanced AI Competition</span> 
                                    Modern Machine Learning models (like Neural Networks) are often more accurate at predicting risk, even if they are less explainable.
                                </li>
                                <li className={`flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Simpler Alternatives</span> 
                                    Users might prefer simple "Loan Calculators" that just give a monthly payment number without the complex risk analysis.
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 4. Growth Roadmap - Vertical Timeline */}
                <section>
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-10 w-2 rounded-full bg-orange-500"></div>
                        <h3 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>The Growth Roadmap</h3>
                    </div>

                    <div className="relative pl-8 md:pl-0">
                         {/* Vertical Line */}
                        <div className={`absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                        
                        <div className="space-y-12">
                            {[
                                { 
                                    phase: "Phase 1", 
                                    title: "Knowledge Acquisition", 
                                    subtitle: "Rule Base Definition", 
                                    desc: "Conducting domain research to define linguistic variables and constructing the initial fuzzy rule base matrix.",
                                    color: "bg-blue-500"
                                },
                                { 
                                    phase: "Phase 2", 
                                    title: "Core Development", 
                                    subtitle: "Inference Engine Implementation",
                                    desc: "Developing the core Fuzzy Inference System and integrating it with the interactive HTML5 Canvas frontend.",
                                    color: "bg-purple-500"
                                },
                                { 
                                    phase: "Phase 3", 
                                    title: "System Calibration", 
                                    subtitle: "Membership Function Tuning",
                                    desc: "Iterative adjustment of fuzzy membership function shapes and rule weights to match expert reasoning.",
                                    color: "bg-indigo-500"
                                },
                                { 
                                    phase: "Phase 4", 
                                    title: "Validation & Testing", 
                                    subtitle: "Scenario & User Testing",
                                    desc: "Running test cases with diverse user profiles (students, entrepreneurs) to verify logic stability.",
                                    color: "bg-orange-500"
                                },
                                { 
                                    phase: "Phase 5", 
                                    title: "Deployment & Scaling", 
                                    subtitle: "Commercial Launch",
                                    desc: "Final deployment to live web environment, optimization for mobile responsiveness, and API development.",
                                    color: "bg-green-500"
                                }
                            ].map((step, i) => (
                                <div key={i} className={`relative flex flex-col md:flex-row items-center gap-8 ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                                    {/* Timeline Node */}
                                    <div className={`absolute left-8 md:left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-4 ${isDark ? 'border-slate-900' : 'border-white'} ${step.color}`}></div>
                                    
                                    {/* Content Card */}
                                    <div className="w-full md:w-[calc(50%-2rem)]">
                                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-lg'} transition-all hover:scale-[1.02]`}>
                                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-3 ${step.color}`}>{step.phase}</div>
                                            <h4 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{step.title}</h4>
                                            <div className="text-sm font-semibold text-slate-500 mb-3">{step.subtitle}</div>
                                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{step.desc}</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block w-[calc(50%-2rem)]"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    </div>
);

const DocsView = ({ isDark }) => (
  <div className={`min-h-screen pt-32 pb-20 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-bold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Documentation</h2>
              <p className={`text-xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Technical specifications and logic definitions.</p>
          </div>

          <div className="space-y-12">
              {/* System Overview */}
              <section className={`p-8 rounded-[2rem] ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-200'}`}>
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400"><Zap className="w-6 h-6" /></div>
                      System Overview
                  </h3>
                  <div className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <p className="mb-4">
                          RiskAI utilizes a <strong className={isDark ? "text-white" : "text-slate-900"}>Mamdani Fuzzy Inference System (FIS)</strong> to evaluate loan applicant risk. 
                          Unlike traditional binary systems (Approved/Rejected), our engine maps inputs to continuous fuzzy sets, 
                          applies a ruleset to determine risk consequence, and defuzzifies the result into a precise risk percentage.
                      </p>
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                          <ul className="space-y-3">
                              <li className="flex gap-3"><span className="font-bold text-indigo-500">1. Fuzzification:</span> Converts crisp inputs (e.g., Age: 25) into fuzzy degrees (e.g., Young: 0.8, Adult: 0.2).</li>
                              <li className="flex gap-3"><span className="font-bold text-indigo-500">2. Inference:</span> Evaluates "IF-THEN" rules using the Min-Max method.</li>
                              <li className="flex gap-3"><span className="font-bold text-indigo-500">3. Defuzzification:</span> Calculates the Center of Gravity (Centroid) of the aggregated shape.</li>
                          </ul>
                      </div>
                  </div>
              </section>

              {/* Technologies */}
              <section>
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400"><Brain className="w-6 h-6" /></div>
                      Technologies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>React 18</h4>
                          <p className="text-sm text-slate-500">Component-based UI with efficient state management for real-time calculation.</p>
                      </div>
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Tailwind CSS</h4>
                          <p className="text-sm text-slate-500">Utility-first styling for responsive, glassmorphic financial aesthetics.</p>
                      </div>
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Lucide Icons</h4>
                          <p className="text-sm text-slate-500">Clean, consistent visual language for banking interfaces.</p>
                      </div>
                  </div>
              </section>

              {/* Rules Table */}
              <section className={`rounded-[2rem] overflow-hidden border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-slate-200 bg-white shadow-sm'}`}>
                  <div className={`p-8 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                     <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg text-green-600 dark:text-green-400"><List className="w-6 h-6" /></div>
                      Rule Base Definition
                    </h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-500">
                          <thead className={`${isDark ? 'bg-slate-900/50 text-slate-300' : 'bg-slate-50 text-slate-600'} uppercase font-bold text-xs`}>
                              <tr>
                                  <th className="p-6">ID</th>
                                  <th className="p-6">Logic (IF ... THEN)</th>
                                  <th className="p-6">Description</th>
                              </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
                              {RULES.map((rule, idx) => (
                                  <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                      <td className="p-6 font-mono text-indigo-500 font-bold">R{idx + 1}</td>
                                      <td className="p-6">
                                          {Object.entries(rule.if).map(([k, v], i) => (
                                              <span key={i} className="block mb-1">
                                                  <span className="text-slate-400">{k} is</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{v}</span>
                                              </span>
                                          ))}
                                          <span className="block mt-2 text-purple-500 font-bold bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded w-fit text-xs">Risk is {rule.then.risk}</span>
                                      </td>
                                      <td className="p-6 italic">{rule.desc}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </section>
          </div>
      </div>
  </div>
);

const SimulatorView = ({ inputs, onInputChange, computation, setShowRules, setView, isDark }) => (
  <div className={`min-h-screen pt-28 pb-12 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
    
    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
      <div className="flex flex-col-reverse xl:flex-row gap-8 lg:gap-12 items-start">
        
        {/* Input Column */}
        <div className="w-full xl:w-3/4 space-y-8">
          <div>
            <h2 className={`text-3xl font-bold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Input Variables</h2>
            <p className="text-slate-500">Adjust the sliders to simulate an applicant profile.</p>
          </div>
          
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

        {/* Visualization Column */}
        <div className="w-full xl:w-1/4 xl:sticky xl:top-28 flex flex-col items-center justify-start gap-8">
          
          <div className="relative group">
            <Banker riskScore={computation.centroid} isDark={isDark} />
            
            {computation.centroid < 40 && (
              <div className={`absolute -right-16 top-0 border px-4 py-2 rounded-xl shadow-lg backdrop-blur-md hidden md:block animate-bounce delay-100 ${isDark ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-emerald-200'}`}>
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Safe Zone</span>
              </div>
            )}
            {computation.centroid >= 70 && (
              <div className={`absolute -right-16 top-0 border px-4 py-2 rounded-xl shadow-lg backdrop-blur-md hidden md:block animate-bounce delay-100 ${isDark ? 'bg-slate-900 border-rose-500/30' : 'bg-white border-rose-200'}`}>
                <span className="text-rose-500 text-xs font-bold uppercase tracking-wider">Warning</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button 
              onClick={() => setShowRules(true)}
              className={`py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'}`}
            >
              <List className={`w-5 h-5 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}`} /> Active Rules
            </button>
            <button 
              onClick={() => setView('inference')}
              className="py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
            >
              View Logic <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  </div>
);

const DashboardView = ({ inputs, computation, setView, isDark }) => (
  <div className={`min-h-screen pt-28 pb-20 transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
    <div className="max-w-7xl mx-auto px-6">
      
      {/* Navigation Back */}
      <div className="mb-8">
        <button 
          onClick={() => setView('input')} 
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <div className={`p-2 rounded-full ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-200'}`}><ChevronLeft className="w-4 h-4" /></div>
          Back to Simulator
        </button>
      </div>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-1 bg-indigo-500 w-12 rounded-full" />
          <span className="text-indigo-500 font-bold text-sm tracking-widest uppercase">System Trace</span>
        </div>
        <h2 className={`text-4xl md:text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Logic Dashboard</h2>
      </div>

      {/* Step 1 */}
      <div className="mb-20">
         <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm text-white font-bold">01</span>
              Fuzzification
            </h3>
            <span className="text-slate-500 text-sm font-medium hidden sm:block">INPUTS → FUZZY SETS</span>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.keys(inputs).map(key => (
              <div key={key} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">{FIELD_LABELS[key]}</div>
                <div className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{inputs[key]}</div>
                <div className={`space-y-1.5 border-t pt-3 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    {Object.entries(computation.fuzzified[key]).map(([set, val]) => (
                        val > 0 && <div key={set} className="text-xs flex justify-between items-center text-indigo-500 font-semibold">
                          <span>{set}</span>
                          <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>{val.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
              </div>
            ))}
         </div>
      </div>

      {/* Step 2 */}
      <div className="mb-20">
         <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm text-white font-bold">02</span>
              Rule Evaluation
            </h3>
            <span className="text-slate-500 text-sm font-medium hidden sm:block">ANTECEDENTS → CONSEQUENTS</span>
         </div>
         <div className="space-y-4">
            {computation.ruleResults.length === 0 ? (
               <div className={`p-8 border rounded-2xl text-center font-medium ${isDark ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
                 NO RULES TRIGGERED FOR CURRENT INPUT STATE
               </div>
            ) : (
              computation.ruleResults.map((rule, idx) => (
                <div key={idx} className={`rounded-2xl border overflow-hidden transition-colors group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                   <div className={`p-4 border-b flex flex-wrap items-center gap-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>RULE {idx + 1}</span>
                      <span className="text-slate-500 text-sm italic">"{rule.desc}"</span>
                      <span className="ml-auto text-xs font-semibold text-slate-500">STRENGTH: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.strength.toFixed(2)}</span></span>
                   </div>
                   <div className="p-6 overflow-x-auto">
                     <div className="flex items-center gap-6 min-w-max">
                        {rule.antecedents.map((ant, i) => (
                           <React.Fragment key={i}>
                              <AntecedentGraph varName={ant.varName} setName={ant.setName} value={ant.value} membership={ant.membership} isDark={isDark} />
                              {i < rule.antecedents.length - 1 && <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDark ? 'text-slate-400 bg-slate-700' : 'text-slate-500 bg-slate-100'}`}>AND</span>}
                           </React.Fragment>
                        ))}
                        <ArrowRight className="text-slate-400 w-6 h-6" />
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
        <div className={`flex items-end justify-between mb-8 border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-sm text-white font-bold">03</span>
              Aggregation & Defuzzification
            </h3>
            <span className="text-slate-500 text-sm font-medium hidden sm:block">CENTROID CALCULATION</span>
         </div>
         <div className={`rounded-3xl border p-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`rounded-[20px] p-6 md:p-12 relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
               
               <div className="h-64 w-full mb-8 relative z-10">
                  <svg width="100%" height="100%" viewBox="0 0 800 300" className="overflow-visible">
                     <GradientDefs />
                     <line x1="0" y1="300" x2="800" y2="300" stroke={isDark ? "#334155" : "#cbd5e1"} strokeWidth="1" />
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

               <div className={`flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 p-6 rounded-2xl backdrop-blur-md border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div>
                    <h4 className={`font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>Final Calculated Risk</h4>
                    <div className="text-xs text-slate-500">Centroid Method (COG)</div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-green-400">
                      {computation.centroid.toFixed(2)}%
                    </div>
                    <div className={`font-bold tracking-widest text-sm mt-1 uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{getRiskLabel(computation.centroid)}</div>
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
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-500 ${isDark ? 'bg-slate-900 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200' : 'bg-slate-50 text-slate-900 selection:bg-indigo-200 selection:text-indigo-900'}`}>
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className={`w-full max-w-2xl max-h-[80vh] rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
          <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
             <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
               <List className="text-indigo-500" /> System Rules
             </h3>
             <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
               <X className="w-5 h-5" />
             </button>
          </div>
          <div className="overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {rules.map((rule, idx) => {
               const strength = ruleStrengths[idx];
               const isActive = strength > 0;
               return (
                 <div key={idx} className={`p-4 rounded-2xl border transition-all ${isActive ? 'bg-indigo-500/10 border-indigo-500/30' : isDark ? 'bg-slate-800/50 border-slate-800 opacity-50' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                   <div className="flex justify-between items-start mb-1">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>Rule {idx + 1}</span>
                     {isActive && <span className="text-xs font-bold text-indigo-500">ACTIVE ({strength.toFixed(2)})</span>}
                   </div>
                   <p className={`text-sm mt-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="text-indigo-500 font-bold">IF</span> {Object.entries(rule.if).map(([k, v], i, arr) => (
                         <span key={k}>{k} is <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{v}</span>{i < arr.length - 1 && " AND "}</span>
                      ))} <span className="text-purple-500 font-bold">THEN</span> Risk is <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{rule.then.risk}</span>
                   </p>
                 </div>
               )
            })}
          </div>
        </div>
      </div>
    );
};