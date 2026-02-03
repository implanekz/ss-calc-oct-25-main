import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { useUser } from '../contexts/UserContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// CDC United States Life Tables, 2022 - q(x) per 1,000
const QX = {
    male: {
        60: 10.80, 61: 11.85, 62: 13.05, 63: 14.42, 64: 15.95, 65: 17.68, 66: 19.61, 67: 21.78, 68: 24.22, 69: 26.96,
        70: 30.07, 71: 33.58, 72: 37.56, 73: 42.06, 74: 47.11, 75: 52.79, 76: 59.14, 77: 66.24, 78: 74.12, 79: 82.87,
        80: 92.56, 81: 103.28, 82: 115.10, 83: 128.11, 84: 142.41, 85: 158.09, 86: 175.22, 87: 193.87, 88: 214.14, 89: 236.11,
        90: 259.85, 91: 285.44, 92: 312.96, 93: 342.49, 94: 374.11, 95: 407.88, 96: 443.85, 97: 482.07, 98: 522.58, 99: 565.44,
        100: 610.67, 101: 658.33, 102: 708.49, 103: 761.20, 104: 816.52, 105: 874.50
    },
    female: {
        60: 6.27, 61: 6.89, 62: 7.60, 63: 8.40, 64: 9.32, 65: 10.36, 66: 11.55, 67: 12.90, 68: 14.45, 69: 16.22,
        70: 18.26, 71: 20.60, 72: 23.28, 73: 26.34, 74: 29.82, 75: 33.78, 76: 38.25, 77: 43.30, 78: 48.96, 79: 55.30,
        80: 62.38, 81: 70.27, 82: 79.03, 83: 88.74, 84: 99.47, 85: 111.30, 86: 124.31, 87: 138.58, 88: 154.18, 89: 171.19,
        90: 189.70, 91: 209.79, 92: 231.55, 93: 255.08, 94: 280.49, 95: 307.87, 96: 337.32, 97: 368.94, 98: 402.83, 99: 439.08,
        100: 477.78, 101: 519.04, 102: 562.97, 103: 609.68, 104: 659.21, 105: 711.70
    }
};

// Pre-computed joint mortality multipliers
const MULTIPLIERS = {
    never: {
        college: { excellent: 0.41, good: 0.52, fair: 0.76 },
        some: { excellent: 0.49, good: 0.67, fair: 0.93 },
        high_school: { excellent: 0.59, good: 0.87, fair: 1.06 }
    },
    former: {
        college: { excellent: 0.49, good: 0.67, fair: 0.99 },
        some: { excellent: 0.59, good: 0.81, fair: 1.22 },
        high_school: { excellent: 0.71, good: 1.06, fair: 1.51 }
    },
    current: {
        college: { excellent: 0.63, good: 1.06, fair: 1.51 },
        some: { excellent: 0.76, good: 1.22, fair: 1.89 },
        high_school: { excellent: 0.93, good: 1.40, fair: 2.22 }
    }
};

const getMultiplier = (profile) => MULTIPLIERS[profile.smoking][profile.education][profile.health];

const cumulativeSurvival = (gender, startAge, targetAge, multiplier = 1.0) => {
    let p = 1;
    for (let a = startAge; a < targetAge; a++) {
        const qx = QX[gender][a];
        if (qx == null) { p *= 0.3; continue; }
        p *= (1 - Math.min(qx * multiplier, 999) / 1000);
    }
    return p;
};

const buildCurve = (gender, startAge, multiplier) => {
    const curve = [];
    for (let age = startAge; age <= 106; age++) {
        curve.push({ age, prob: cumulativeSurvival(gender, startAge, age, multiplier) });
    }
    return curve;
};

const buildEitherCurve = (g1, a1, g2, a2, m1, m2) => {
    const start = Math.min(a1, a2);
    const curve = [];
    for (let age = start; age <= 106; age++) {
        const pA = cumulativeSurvival(g1, a1, age, m1);
        const pB = cumulativeSurvival(g2, a2, age, m2);
        curve.push({ age, prob: 1 - (1 - pA) * (1 - pB) });
    }
    return curve;
};

const buildBothCurve = (g1, a1, g2, a2, m1, m2) => {
    const start = Math.min(a1, a2);
    const curve = [];
    for (let age = start; age <= 106; age++) {
        curve.push({ age, prob: cumulativeSurvival(g1, a1, age, m1) * cumulativeSurvival(g2, a2, age, m2) });
    }
    return curve;
};

const findThresholdAge = (curve, threshold) => {
    for (let i = 1; i < curve.length; i++) {
        if (curve[i].prob <= threshold) {
            const prev = curve[i - 1], curr = curve[i];
            const frac = (prev.prob - threshold) / (prev.prob - curr.prob);
            return Math.round(prev.age + frac);
        }
    }
    return curve[curve.length - 1].age;
};

const LifeExpectancyCalculator = () => {
    const { preferences, updatePreferences, user } = useUser();

    // State - will be initialized from preferences if available
    const [calcType, setCalcType] = useState('individual');
    const [myGender, setMyGender] = useState('male');
    const [myAge, setMyAge] = useState(65);
    const [spGender, setSpGender] = useState('female');
    const [spAge, setSpAge] = useState(65);
    const [myHealth, setMyHealth] = useState({ smoking: 'never', education: 'college', health: 'good' });
    const [spHealth, setSpHealth] = useState({ smoking: 'never', education: 'college', health: 'good' });
    const [currentView, setCurrentView] = useState('graph');
    const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef(null);

    const [results, setResults] = useState({ age75: 0, age50: 0, age25: 0, insight: '' });
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    // Load saved preferences on mount
    useEffect(() => {
        if (preferences?.lifeExpectancy && !hasLoadedPrefs) {
            const le = preferences.lifeExpectancy;
            if (le.calcType) setCalcType(le.calcType);
            if (le.myGender) setMyGender(le.myGender);
            if (le.myAge) setMyAge(le.myAge);
            if (le.spGender) setSpGender(le.spGender);
            if (le.spAge) setSpAge(le.spAge);
            if (le.myHealth) setMyHealth(le.myHealth);
            if (le.spHealth) setSpHealth(le.spHealth);
            setHasLoadedPrefs(true);
        }
    }, [preferences, hasLoadedPrefs]);

    // Save preferences with debounce (auto-save after 1 second of no changes)
    const saveSettings = useCallback(() => {
        if (!user || !updatePreferences) return;

        const lifeExpectancy = {
            calcType, myGender, myAge, spGender, spAge, myHealth, spHealth
        };

        setIsSaving(true);
        updatePreferences({ lifeExpectancy })
            .then(() => setIsSaving(false))
            .catch((err) => {
                console.error('Failed to save life expectancy settings:', err);
                setIsSaving(false);
            });
    }, [user, updatePreferences, calcType, myGender, myAge, spGender, spAge, myHealth, spHealth]);

    // Debounced save when settings change
    useEffect(() => {
        if (!hasLoadedPrefs) return; // Don't save while still loading

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveSettings();
        }, 1000); // Save 1 second after last change

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [calcType, myGender, myAge, spGender, spAge, myHealth, spHealth, hasLoadedPrefs, saveSettings]);

    useEffect(() => {
        if (calcType === 'individual') {
            const mMult = getMultiplier(myHealth);
            const curve = buildCurve(myGender, myAge, mMult);
            const age75 = findThresholdAge(curve, 0.75);
            const age50 = findThresholdAge(curve, 0.50);
            const age25 = findThresholdAge(curve, 0.25);

            const gLabel = myGender === 'male' ? 'a man' : 'a woman';
            const insight = `At age ${myAge}, ${gLabel} has a 50% chance of living to age ${age50} — not 78. There's a 25% chance (1 in 4) of reaching age ${age25}, which is ${age25 - age50} years beyond the median. The "headline" life expectancy of ~78 includes infant and childhood deaths that no longer apply to you. Each year you survive, every one of these numbers moves up. This is why waiting to claim Social Security is so powerful — you're very likely to live longer than you think.`;

            setResults({ age75, age50, age25, insight, labels: ['75% Chance You Live To', '50% Chance You Live To', '25% Chance You Live To'] });

            const labels = curve.filter(d => d.age <= 101).map(d => d.age);
            setChartData({
                labels,
                datasets: [{
                    label: myGender === 'male' ? 'Male' : 'Female',
                    data: curve.filter(d => d.age <= 101).map(d => d.prob * 100),
                    borderColor: myGender === 'male' ? '#4a90d9' : '#e8735a',
                    backgroundColor: myGender === 'male' ? 'rgba(74, 144, 217, 0.1)' : 'rgba(232, 115, 90, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                }]
            });
        } else {
            const mMult = getMultiplier(myHealth);
            const sMult = getMultiplier(spHealth);
            const curveP1 = buildCurve(myGender, myAge, mMult);
            const curveP2 = buildCurve(spGender, spAge, sMult);
            const curveEither = buildEitherCurve(myGender, myAge, spGender, spAge, mMult, sMult);
            const curveBoth = buildBothCurve(myGender, myAge, spGender, spAge, mMult, sMult);

            const age75 = findThresholdAge(curveEither, 0.75);
            const age50 = findThresholdAge(curveEither, 0.50);
            const age25 = findThresholdAge(curveEither, 0.25);

            const indivMax = Math.max(findThresholdAge(curveP1, 0.50), findThresholdAge(curveP2, 0.50));
            const g1 = myGender === 'male' ? 'husband' : 'wife';
            const g2 = spGender === 'male' ? 'husband' : 'wife';

            const insight = `For this couple (${g1} age ${myAge}, ${g2} age ${spAge}), the longer-lived spouse's individual 50% expectancy is age ${indivMax}. But there's a 50% chance at least one of you lives to age ${age50} — that's ${age50 - indivMax} years beyond that. And there's a 25% chance (1 in 4) one of you reaches age ${age25}. This is the real planning horizon for Social Security: you're not planning for one lifetime, you're planning for the survivor. The gap between individual and "either survives" is exactly why waiting to claim is so valuable for couples.`;

            setResults({ age75, age50, age25, insight, labels: ['75% Chance One Survives To', '50% Chance One Survives To', '25% Chance One Survives To'] });

            const startAge = Math.min(myAge, spAge);
            const labels = [];
            for (let age = startAge; age <= 106; age++) labels.push(age);

            const p1Label = myGender === 'male' ? 'Male' : 'Female';
            const p2Label = spGender === 'male' ? 'Male' : 'Female';
            const l1 = p1Label === p2Label ? 'You' : p1Label;
            const l2 = p1Label === p2Label ? 'Spouse' : p2Label;

            const toMap = (curve) => { const m = {}; curve.forEach(d => m[d.age] = d.prob); return m; };
            const m1 = toMap(curveP1), m2 = toMap(curveP2), mE = toMap(curveEither), mB = toMap(curveBoth);

            setChartData({
                labels,
                datasets: [
                    { label: 'Both Partners', data: labels.map(a => (mB[a] || 0) * 100), borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)', fill: false, tension: 0.3, pointRadius: 0 },
                    { label: l1, data: labels.map(a => (m1[a] || 0) * 100), borderColor: '#4a90d9', backgroundColor: 'rgba(74, 144, 217, 0.1)', fill: false, tension: 0.3, pointRadius: 0 },
                    { label: l2, data: labels.map(a => (m2[a] || 0) * 100), borderColor: '#e8735a', backgroundColor: 'rgba(232, 115, 90, 0.1)', fill: false, tension: 0.3, pointRadius: 0 },
                    { label: 'Either Partner', data: labels.map(a => (mE[a] || 0) * 100), borderColor: '#f5a623', backgroundColor: 'rgba(245, 166, 35, 0.1)', fill: false, tension: 0.3, pointRadius: 0 },
                ]
            });
        }
    }, [calcType, myGender, myAge, spGender, spAge, myHealth, spHealth]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
                }
            }
        },
        scales: {
            x: { title: { display: true, text: 'Age' } },
            y: { title: { display: true, text: 'Probability of Survival (%)' }, min: 0, max: 100 }
        }
    };

    const HealthSelector = ({ person, health, setHealth }) => (
        <div className="space-y-3">
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Smoking Status</label>
                <div className="flex gap-1">
                    {[{ key: 'never', label: 'Never Smoked' }, { key: 'former', label: 'Former' }, { key: 'current', label: 'Current' }].map(opt => (
                        <button key={opt.key} onClick={() => setHealth({ ...health, smoking: opt.key })}
                            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all ${health.smoking === opt.key ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Education</label>
                <div className="flex gap-1">
                    {[{ key: 'college', label: 'College+' }, { key: 'some', label: 'Some College' }, { key: 'high_school', label: 'High School−' }].map(opt => (
                        <button key={opt.key} onClick={() => setHealth({ ...health, education: opt.key })}
                            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all ${health.education === opt.key ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current Health</label>
                <div className="flex gap-1">
                    {[{ key: 'excellent', label: 'Excellent' }, { key: 'good', label: 'Good' }, { key: 'fair', label: 'Fair or Poor' }].map(opt => (
                        <button key={opt.key} onClick={() => setHealth({ ...health, health: opt.key })}
                            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-all ${health.health === opt.key ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 to-purple-700 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">📊 Life Expectancy Reality Check</h1>
                    <p className="text-lg opacity-90">The longer you live, the longer you're expected to live</p>
                    {user && (
                        <div className="mt-2 text-sm opacity-75">
                            {isSaving ? (
                                <span className="inline-flex items-center gap-1">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : (
                                <span>✓ Settings saved</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Calculation Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Calculation Type</label>
                            <div className="flex gap-2">
                                <button onClick={() => setCalcType('individual')}
                                    className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${calcType === 'individual' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                    Individual
                                </button>
                                <button onClick={() => setCalcType('couple')}
                                    className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${calcType === 'couple' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                    Married Couple
                                </button>
                            </div>
                        </div>

                        {/* Your Gender */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Gender</label>
                            <div className="flex gap-2">
                                <button onClick={() => setMyGender('male')}
                                    className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${myGender === 'male' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                    Male
                                </button>
                                <button onClick={() => setMyGender('female')}
                                    className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${myGender === 'female' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                    Female
                                </button>
                            </div>
                        </div>

                        {/* Your Age */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Current Age</label>
                            <input type="range" min="60" max="99" value={myAge} onChange={e => setMyAge(parseInt(e.target.value))}
                                className="w-full h-2 bg-gradient-to-r from-primary-400 to-purple-400 rounded-lg appearance-none cursor-pointer" />
                            <div className="text-center text-4xl font-bold text-primary-600 mt-2">{myAge}</div>
                        </div>

                        {/* Placeholder or Spouse Gender */}
                        {calcType === 'couple' ? (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Spouse Gender</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setSpGender('male')}
                                        className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${spGender === 'male' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                        Male
                                    </button>
                                    <button onClick={() => setSpGender('female')}
                                        className={`flex-1 py-3 px-4 font-semibold rounded-xl border-2 transition-all ${spGender === 'female' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}>
                                        Female
                                    </button>
                                </div>
                            </div>
                        ) : <div></div>}
                    </div>

                    {/* Spouse Age (if couple) */}
                    {calcType === 'couple' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-4 border-t border-gray-200">
                            <div></div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Spouse Current Age</label>
                                <input type="range" min="60" max="99" value={spAge} onChange={e => setSpAge(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gradient-to-r from-primary-400 to-purple-400 rounded-lg appearance-none cursor-pointer" />
                                <div className="text-center text-4xl font-bold text-primary-600 mt-2">{spAge}</div>
                            </div>
                        </div>
                    )}

                    {/* Health Profile */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-bold text-gray-800">Your Health Profile</h3>
                            <span className="text-xs font-semibold bg-gradient-to-r from-primary-600 to-purple-600 text-white px-2 py-0.5 rounded-full">ADJUSTS SURVIVAL CURVES</span>
                        </div>
                        <div className={`grid gap-6 ${calcType === 'couple' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
                            <div>
                                {calcType === 'couple' && <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 pb-1 border-b-2 border-primary-600">You</div>}
                                <HealthSelector person="my" health={myHealth} setHealth={setMyHealth} />
                            </div>
                            {calcType === 'couple' && (
                                <div>
                                    <div className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 pb-1 border-b-2 border-primary-600">Spouse</div>
                                    <HealthSelector person="sp" health={spHealth} setHealth={setSpHealth} />
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-4 italic">These factors adjust your mortality rates using published actuarial research. Effects are multiplicative, not additive — the combined benefit of being a non-smoking college graduate is already built into the math.</p>
                    </div>

                    {/* Results Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 rounded-xl p-4 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-green-500"></div>
                            <div className="text-sm font-semibold text-gray-600 mb-1">{results.labels?.[0] || '75% Chance'}</div>
                            <div className="text-4xl font-bold text-gray-900">{results.age75}</div>
                            <div className="text-sm text-gray-600">years old</div>
                            <div className="text-xs text-gray-500 mt-1 italic">3 in 4 exceed this age</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-purple-500"></div>
                            <div className="text-sm font-semibold text-gray-600 mb-1">{results.labels?.[1] || '50% Chance'}</div>
                            <div className="text-4xl font-bold text-gray-900">{results.age50}</div>
                            <div className="text-sm text-gray-600">years old</div>
                            <div className="text-xs text-gray-500 mt-1 italic">Median life expectancy</div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-4 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500"></div>
                            <div className="text-sm font-semibold text-gray-600 mb-1">{results.labels?.[2] || '25% Chance'}</div>
                            <div className="text-4xl font-bold text-gray-900">{results.age25}</div>
                            <div className="text-sm text-gray-600">years old</div>
                            <div className="text-xs text-gray-500 mt-1 italic">1 in 4 reach this age</div>
                        </div>
                    </div>

                    {/* Insight Box */}
                    <div className="bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl p-5 mb-6">
                        <h2 className="text-lg font-bold mb-2">💡 The Wake-Up Call</h2>
                        <p className="text-sm leading-relaxed opacity-95">{results.insight}</p>
                    </div>

                    {/* Chart/Table Toggle */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">📈 Survival Probability Curves</h3>
                        <div className="flex bg-gray-100 rounded-lg overflow-hidden">
                            <button onClick={() => setCurrentView('graph')}
                                className={`px-4 py-2 text-sm font-semibold transition-all ${currentView === 'graph' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                Graph
                            </button>
                            <button onClick={() => setCurrentView('table')}
                                className={`px-4 py-2 text-sm font-semibold transition-all ${currentView === 'table' ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                                Table
                            </button>
                        </div>
                    </div>

                    {/* Chart */}
                    {currentView === 'graph' && (
                        <div className="bg-gray-50 rounded-xl p-4" style={{ height: '400px' }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    )}

                    {/* Table */}
                    {currentView === 'table' && (
                        <div className="bg-gray-50 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-primary-600 to-purple-600 text-white sticky top-0">
                                    <tr>
                                        <th className="py-3 px-4 text-left font-semibold">Age</th>
                                        {chartData.datasets?.map((ds, i) => (
                                            <th key={i} className="py-3 px-4 text-center font-semibold">{ds.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.labels?.map((age, idx) => (
                                        <tr key={age} className={`border-b border-gray-200 ${idx === 0 ? 'bg-yellow-50' : 'hover:bg-gray-100'}`}>
                                            <td className="py-2 px-4 font-semibold">{age}</td>
                                            {chartData.datasets?.map((ds, i) => (
                                                <td key={i} className="py-2 px-4 text-center">{ds.data[idx]?.toFixed(1)}%</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Source Note */}
                    <p className="text-xs text-gray-500 mt-4 text-center italic">
                        Data from the Center for Disease Control United States Life Tables, 2022. Survival probabilities calculated from published q(x) mortality rates.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LifeExpectancyCalculator;
