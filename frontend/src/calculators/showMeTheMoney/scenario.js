// The scenario is the complete set of inputs that determine what the chart shows.
// It is serializable, versioned, and deliberately excludes view state (chart
// dimensions, modal flags, playback position, drag flags).

export const SCENARIO_SCHEMA_VERSION = 1;

export const PROVENANCE = {
  ESTIMATED: 'estimated',
  VERIFIED: 'verified'
};

// Defaults mirror the values previously hardcoded in ShowMeTheMoneyCalculator's
// useState initializers, so behavior is unchanged by the extraction.
const DEFAULTS = {
  isMarried: false,

  spouse1Dob: '1965-02-03',
  spouse1Pia: '',
  spouse1PreferredYear: 67,
  spouse1PreferredMonth: 0,
  spouse1AlreadyFiled: false,
  spouse1CurrentBenefit: null,
  spouse1FiledAge: 65,

  spouse2Dob: '1965-06-18',
  spouse2Pia: '',
  spouse2PreferredYear: 65,
  spouse2PreferredMonth: 0,
  spouse2AlreadyFiled: false,
  spouse2CurrentBenefit: null,
  spouse2FiledAge: 65,

  inflation: 0.025,
  prematureDeath: false,
  deathAge: 75,
  piaStrategy: 'late',

  goGoEndAge: 75,
  slowGoEndAge: 85,
  spouseGoGoEndAge: 75,
  spouseSlowGoEndAge: 85,

  monthlyNeeds: 7000,
  flowAge: 70,
  bubbleAge: 70
};

export const SCENARIO_FIELDS = Object.keys(DEFAULTS);

const pickKnownFields = (source = {}) =>
  SCENARIO_FIELDS.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});

export const createScenario = (overrides = {}, assumptions = {}) => {
  const fields = { ...DEFAULTS, ...pickKnownFields(overrides) };
  return {
    ...fields,
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    provenance: PROVENANCE.ESTIMATED,
    earnings: { spouse1: null, spouse2: null },
    assumptions: {
      // Frozen at creation so a saved plan keeps reporting the tables it was
      // computed under, even after those tables are updated for a new year.
      bendPointsYear: assumptions.bendPointsYear ?? new Date().getFullYear(),
      colaRate: assumptions.colaRate ?? fields.inflation
    }
  };
};

const deriveProvenance = (earnings) =>
  earnings.spouse1 || earnings.spouse2 ? PROVENANCE.VERIFIED : PROVENANCE.ESTIMATED;

export const scenarioReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD': {
      if (!SCENARIO_FIELDS.includes(action.field)) return state;
      if (state[action.field] === action.value) return state;
      return { ...state, [action.field]: action.value };
    }
    case 'SET_EARNINGS': {
      if (action.person !== 'spouse1' && action.person !== 'spouse2') return state;
      const earnings = { ...state.earnings, [action.person]: action.record ?? null };
      return { ...state, earnings, provenance: deriveProvenance(earnings) };
    }
    case 'LOAD':
      return action.scenario;
    case 'RESET':
      return createScenario(action.overrides, action.assumptions);
    default:
      return state;
  }
};

export const serializeScenario = (scenario) => ({
  ...pickKnownFields(scenario),
  schemaVersion: scenario.schemaVersion,
  provenance: scenario.provenance,
  earnings: scenario.earnings,
  assumptions: scenario.assumptions
});

export const deserializeScenario = (raw = {}) => {
  const base = createScenario(raw);
  return {
    ...base,
    schemaVersion: raw.schemaVersion ?? SCENARIO_SCHEMA_VERSION,
    provenance: raw.provenance ?? base.provenance,
    earnings: raw.earnings ?? base.earnings,
    // Recorded assumptions win over freshly-derived ones.
    assumptions: raw.assumptions ?? base.assumptions
  };
};

export const areScenariosComparable = (a, b) =>
  a.assumptions.bendPointsYear === b.assumptions.bendPointsYear &&
  a.inflation === b.inflation;

export const planLabel = (scenario) =>
  scenario.isMarried ? 'Our Lifelong Plan' : 'My Lifelong Plan';
