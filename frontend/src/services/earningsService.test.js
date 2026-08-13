import { fetchEarnings, saveEarnings, fetchWorkStopLadder } from './earningsService';

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.resetAllMocks(); });

const jsonResponse = (body) => Promise.resolve({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body)
});

describe('fetchEarnings', () => {
  it('maps self/partner onto spouse1/spouse2 in camelCase', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      earnings: [
        { person: 'self', birth_year: 1965, rows: [{ year: 2020, earnings: 90000, is_projected: false }] },
        { person: 'partner', birth_year: 1968, rows: [] }
      ]
    }));

    const result = await fetchEarnings('tok');
    expect(result.spouse1.birthYear).toBe(1965);
    expect(result.spouse1.rows[0]).toEqual({ year: 2020, earnings: 90000, isProjected: false });
    expect(result.spouse2.birthYear).toBe(1968);
  });

  it('returns nulls when the user has no records', async () => {
    global.fetch.mockReturnValue(jsonResponse({ earnings: [] }));
    expect(await fetchEarnings('tok')).toEqual({ spouse1: null, spouse2: null });
  });
});

describe('saveEarnings', () => {
  it('PUTs to the person-specific route in snake_case', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      person: 'self', birth_year: 1965, rows: [], updated_at: '2026-08-13'
    }));

    await saveEarnings('tok', 'spouse1', {
      birthYear: 1965,
      rows: [{ year: 2020, earnings: 90000, isProjected: false }]
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/earnings/self');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({
      birth_year: 1965,
      rows: [{ year: 2020, earnings: 90000, is_projected: false }]
    });
  });

  it('maps spouse2 onto the partner route', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      person: 'partner', birth_year: 1968, rows: [], updated_at: '2026-08-13'
    }));
    await saveEarnings('tok', 'spouse2', { birthYear: 1968, rows: [] });
    expect(global.fetch.mock.calls[0][0]).toContain('/api/earnings/partner');
  });
});

describe('fetchWorkStopLadder', () => {
  it('returns camelCase rungs', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      rungs: [{ stop_age: 62, stop_year: 2027, aime: 5000, pia: 2873 }]
    }));

    const rungs = await fetchWorkStopLadder({
      birthYear: 1965,
      rows: [{ year: 2020, earnings: 90000, isProjected: false }],
      stopAges: [62]
    });

    expect(rungs).toEqual([{ stopAge: 62, stopYear: 2027, aime: 5000, pia: 2873 }]);
  });
});
