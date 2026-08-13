import { apiFetch, authHeaders } from './apiClient';

// The API addresses people as 'self'/'partner'; the calculator uses spouse1/spouse2.
const PERSON_TO_API = { spouse1: 'self', spouse2: 'partner' };
const API_TO_PERSON = { self: 'spouse1', partner: 'spouse2' };

const toCamelRow = (row) => ({
  year: row.year,
  earnings: row.earnings,
  isProjected: Boolean(row.is_projected)
});

const toSnakeRow = (row) => ({
  year: row.year,
  earnings: row.earnings,
  is_projected: Boolean(row.isProjected)
});

const toCamelRecord = (record) => ({
  birthYear: record.birth_year,
  rows: (record.rows || []).map(toCamelRow)
});

export async function fetchEarnings(token) {
  const data = await apiFetch('/api/earnings', { headers: authHeaders(token) });
  const result = { spouse1: null, spouse2: null };
  (data.earnings || []).forEach((record) => {
    const person = API_TO_PERSON[record.person];
    if (person) result[person] = toCamelRecord(record);
  });
  return result;
}

export async function saveEarnings(token, person, record) {
  const apiPerson = PERSON_TO_API[person];
  if (!apiPerson) throw new Error(`Unknown person: ${person}`);

  const saved = await apiFetch(`/api/earnings/${apiPerson}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({
      birth_year: record.birthYear,
      rows: (record.rows || []).map(toSnakeRow)
    })
  });
  return toCamelRecord(saved);
}

export async function fetchWorkStopLadder({ birthYear, rows, stopAges }) {
  const data = await apiFetch('/api/work-stop-ladder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      birth_year: birthYear,
      earnings_history: (rows || []).map(toSnakeRow),
      stop_ages: stopAges
    })
  });
  return (data.rungs || []).map((rung) => ({
    stopAge: rung.stop_age,
    stopYear: rung.stop_year,
    aime: rung.aime,
    pia: rung.pia
  }));
}
