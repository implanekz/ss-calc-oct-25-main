import {
  SCENARIO_SCHEMA_VERSION,
  PROVENANCE,
  SCENARIO_FIELDS,
  createScenario,
  scenarioReducer,
  serializeScenario,
  deserializeScenario,
  areScenariosComparable,
  planLabel
} from './scenario';

describe('createScenario', () => {
  it('applies documented defaults', () => {
    const s = createScenario();
    expect(s.inflation).toBe(0.025);
    expect(s.spouse1PreferredYear).toBe(67);
    expect(s.spouse2PreferredYear).toBe(65);
    expect(s.monthlyNeeds).toBe(7000);
    expect(s.isMarried).toBe(false);
  });

  it('starts as an estimate with no earnings records', () => {
    const s = createScenario();
    expect(s.provenance).toBe(PROVENANCE.ESTIMATED);
    expect(s.earnings.spouse1).toBeNull();
    expect(s.earnings.spouse2).toBeNull();
  });

  it('freezes the assumption set at creation time', () => {
    const s = createScenario({ inflation: 0.03 }, { bendPointsYear: 2026 });
    expect(s.assumptions.bendPointsYear).toBe(2026);
    expect(s.assumptions.colaRate).toBe(0.03);
    expect(s.schemaVersion).toBe(SCENARIO_SCHEMA_VERSION);
  });

  it('accepts overrides for any declared field', () => {
    const s = createScenario({ spouse1Pia: 3000, isMarried: true });
    expect(s.spouse1Pia).toBe(3000);
    expect(s.isMarried).toBe(true);
  });

  it('ignores unknown keys so view state cannot leak in', () => {
    const s = createScenario({ svgHeight: 700, isPlaying: true });
    expect(s.svgHeight).toBeUndefined();
    expect(s.isPlaying).toBeUndefined();
  });
});

describe('SCENARIO_FIELDS', () => {
  it('contains every field the projection memo depends on', () => {
    [
      'isMarried', 'spouse1Dob', 'spouse1Pia', 'spouse1PreferredYear',
      'spouse1PreferredMonth', 'spouse2Dob', 'spouse2Pia',
      'spouse2PreferredYear', 'spouse2PreferredMonth', 'inflation',
      'prematureDeath', 'deathAge', 'piaStrategy'
    ].forEach((f) => expect(SCENARIO_FIELDS).toContain(f));
  });

  it('excludes view state', () => {
    ['svgHeight', 'isPlaying', 'chartView', 'sidebarCollapsed', 'showYearModal']
      .forEach((f) => expect(SCENARIO_FIELDS).not.toContain(f));
  });
});

describe('scenarioReducer', () => {
  it('sets a single field without disturbing others', () => {
    const s = createScenario({ spouse1Pia: 2000 });
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'inflation', value: 0.03 });
    expect(next.inflation).toBe(0.03);
    expect(next.spouse1Pia).toBe(2000);
  });

  it('returns the same reference when the value is unchanged', () => {
    const s = createScenario({ inflation: 0.025 });
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'inflation', value: 0.025 });
    expect(next).toBe(s);
  });

  it('rejects fields outside SCENARIO_FIELDS', () => {
    const s = createScenario();
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'svgHeight', value: 900 });
    expect(next).toBe(s);
    expect(next.svgHeight).toBeUndefined();
  });

  it('attaches an earnings record and flips provenance to verified', () => {
    const s = createScenario();
    const record = { birthYear: 1965, rows: [{ year: 2020, earnings: 100000 }], pia: 3000 };
    const next = scenarioReducer(s, { type: 'SET_EARNINGS', person: 'spouse1', record });
    expect(next.earnings.spouse1).toEqual(record);
    expect(next.provenance).toBe(PROVENANCE.VERIFIED);
  });

  it('stays estimated when an earnings record is cleared', () => {
    const s = scenarioReducer(createScenario(), {
      type: 'SET_EARNINGS', person: 'spouse1', record: { birthYear: 1965, rows: [], pia: 1 }
    });
    const next = scenarioReducer(s, { type: 'SET_EARNINGS', person: 'spouse1', record: null });
    expect(next.provenance).toBe(PROVENANCE.ESTIMATED);
  });

  it('replaces the whole scenario on LOAD', () => {
    const s = createScenario({ spouse1Pia: 1000 });
    const loaded = createScenario({ spouse1Pia: 4000, isMarried: true });
    expect(scenarioReducer(s, { type: 'LOAD', scenario: loaded }).spouse1Pia).toBe(4000);
  });
});

describe('serialization', () => {
  it('round-trips without loss', () => {
    const s = createScenario({ spouse1Pia: 3000, isMarried: true, deathAge: 82 });
    expect(deserializeScenario(serializeScenario(s))).toEqual(s);
  });

  it('fills missing fields from defaults when reading an older payload', () => {
    const restored = deserializeScenario({ schemaVersion: 1, spouse1Pia: 2500 });
    expect(restored.spouse1Pia).toBe(2500);
    expect(restored.inflation).toBe(0.025);
  });

  it('preserves the recorded assumptions rather than reapplying current ones', () => {
    const restored = deserializeScenario({
      schemaVersion: 1,
      assumptions: { bendPointsYear: 2025, colaRate: 0.02 }
    });
    expect(restored.assumptions.bendPointsYear).toBe(2025);
  });
});

describe('areScenariosComparable', () => {
  it('is true when assumptions match', () => {
    const a = createScenario({ spouse1PreferredYear: 62 }, { bendPointsYear: 2026 });
    const b = createScenario({ spouse1PreferredYear: 70 }, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(true);
  });

  it('is false when COLA differs, since the lines would not be comparable', () => {
    const a = createScenario({ inflation: 0.025 }, { bendPointsYear: 2026 });
    const b = createScenario({ inflation: 0.030 }, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(false);
  });

  it('is false when bend point years differ', () => {
    const a = createScenario({}, { bendPointsYear: 2025 });
    const b = createScenario({}, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(false);
  });
});

describe('planLabel', () => {
  it('is "My Lifelong Plan" when single', () => {
    expect(planLabel(createScenario({ isMarried: false }))).toBe('My Lifelong Plan');
  });

  it('is "Our Lifelong Plan" when married', () => {
    expect(planLabel(createScenario({ isMarried: true }))).toBe('Our Lifelong Plan');
  });
});
