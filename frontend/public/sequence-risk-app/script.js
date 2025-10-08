const RETURN_DATA = [
  { year: 2000, return: -0.1014 },
  { year: 2001, return: -0.1304 },
  { year: 2002, return: -0.2337 },
  { year: 2003, return: 0.2638 },
  { year: 2004, return: 0.0899 },
  { year: 2005, return: 0.030 },
  { year: 2006, return: 0.1362 },
  { year: 2007, return: 0.0353 },
  { year: 2008, return: -0.3849 },
  { year: 2009, return: 0.2345 },
  { year: 2010, return: 0.1278 },
  { year: 2011, return: -0.0000 },
  { year: 2012, return: 0.1341 },
  { year: 2013, return: 0.2960 },
  { year: 2014, return: 0.1139 },
  { year: 2015, return: -0.0073 },
  { year: 2016, return: 0.0954 },
  { year: 2017, return: 0.1942 },
  { year: 2018, return: -0.0624 },
  { year: 2019, return: 0.2888 },
  { year: 2020, return: 0.1626 },
  { year: 2021, return: 0.2689 },
  { year: 2022, return: -0.1944 },
  { year: 2023, return: 0.2423 },
  { year: 2024, return: 0.2331 },
];

const STRESS_SCENARIOS = {
  tech: {
    key: 'tech',
    label: 'Tech Wreck: 2000-2002',
    loss: -0.83,
    modal: {
      title: 'Tech Wreck (2000-2002)',
      body: `
        <p>The NASDAQ 100 peaked at <strong>4,704.73</strong> on March 27, 2000 before sliding to a trough of <strong>795.25</strong> on October 9, 2002.</p>
        <p>This collapse represented a loss of roughly <strong>83%</strong> from peak to trough, marking the end of the dot-com bubble.</p>
      `,
    },
  },
  gfc: {
    key: 'gfc',
    label: 'Financial Crisis: 2007-2009',
    loss: -0.57,
    modal: {
      title: 'Global Financial Crisis (2007-2009)',
      body: `
        <p>The S&P 500 reached its pre-crisis peak at <strong>1,565.15</strong> on October 9, 2007 and bottomed at <strong>676.53</strong> on March 9, 2009.</p>
        <p>The index shed nearly <strong>57%</strong> during the downturn before a prolonged recovery began.</p>
      `,
    },
  },
  covid: {
    key: 'covid',
    label: 'COVID Crisis: 2020',
    loss: -0.34,
    modal: {
      title: 'COVID Crisis (2020)',
      body: `
        <p>The S&P 500 hit a high of <strong>3,386.15</strong> on February 19, 2020 and plunged to <strong>2,237.40</strong> by March 23, 2020.</p>
        <p>This swift decline of around <strong>34%</strong> was one of the fastest major drawdowns in modern market history.</p>
      `,
    },
  },
};

const formatCurrency = (value) => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (value < 0) {
    return `(${formatter.format(Math.abs(value))})`;
  }
  return formatter.format(value);
};

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const identity = (r) => r;
const strategyOneReturn = (r) => (r < 0 ? 0 : r * 0.5);
const strategyTwoReturn = (r) => {
  if (r < -0.1) return -0.1;
  return r > 0 ? r * 0.75 : r;
};

let currentOrder = null;
let currentSpanKey = null;
const stressState = {
  enabled: false,
  scenarioKey: '',
  targetYear: '',
};
let latestScenarios = null;

const generateSpanKey = (returns) => {
  if (!returns.length) return 'empty';
  const base = `${returns[0].year}-${returns[returns.length - 1].year}-${returns.length}`;
  const stressSuffix = stressState.enabled ? `-stress-${stressState.scenarioKey || 'none'}-${stressState.targetYear || 'none'}` : '-stress-off';
  return `${base}${stressSuffix}`;
};

const shuffleReturns = (returns) => {
  const copy = [...returns];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getOrderedSequence = (baseReturns, { forceRandom = false } = {}) => {
  const spanKey = generateSpanKey(baseReturns);
  if (forceRandom) {
    currentOrder = shuffleReturns(baseReturns);
    currentSpanKey = spanKey;
    return currentOrder;
  }
  if (!currentOrder || currentSpanKey !== spanKey) {
    currentOrder = [...baseReturns];
    currentSpanKey = spanKey;
  }
  return [...currentOrder];
};

const getReturnsSlice = (startYear, endYear) => {
  const filtered = RETURN_DATA.filter((entry) => entry.year >= startYear && entry.year <= endYear);
  return filtered.length ? filtered : [...RETURN_DATA];
};

const simulateSequence = (initialBalance, annualWithdrawal, orderedReturns, transformFn) => {
  let balance = initialBalance;
  const rows = [];

  orderedReturns.forEach(({ year, return: rawReturn }) => {
    const appliedReturn = transformFn(rawReturn);
    const beginning = balance;
    const growth = beginning * appliedReturn;
    balance = beginning + growth - annualWithdrawal;

    rows.push({
      year,
      rawReturn,
      appliedReturn,
      beginning,
      growth,
      withdrawal: annualWithdrawal,
      ending: balance,
    });
  });

  return { rows, endingBalance: balance };
};

const expandedTables = {
  strategy1: false,
  strategy2: false,
};

const renderTables = (historicalScenario, strategyOneScenario, strategyTwoScenario) => {
  const wrapper = document.getElementById('tables-wrapper');
  wrapper.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'table-card grouped';

  const makeMiniTable = (heading, scenario, options = {}) => {
    const { collapsible = false, key } = options;
    const container = document.createElement('div');
    container.className = 'mini-table';
    if (collapsible) {
      container.classList.add('collapsible');
    } else {
      container.classList.add('expanded');
    }

    const headingElement = document.createElement(collapsible ? 'button' : 'h3');
    headingElement.textContent = heading;
    if (collapsible) {
      headingElement.type = 'button';
      headingElement.className = 'mini-table-toggle';
    } else {
      headingElement.className = 'mini-table-title';
    }
    container.appendChild(headingElement);

    const content = document.createElement('div');
    content.className = 'mini-table-content';

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const returnHeading = heading === 'Historical Sequence' ? 'Actual Return' : 'Credited Return';
    thead.innerHTML = `<tr><th>Year</th><th>${returnHeading}</th><th>With-<br/>drawal</th><th>Ending Balance</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    let totalWithdrawn = 0;
    scenario.rows.forEach((row) => {
      const tr = document.createElement('tr');
      const withdrawalAmount = row.withdrawal || 0;
      const withdrawalDisplay = withdrawalAmount ? formatCurrency(withdrawalAmount) : '$0';
      totalWithdrawn += withdrawalAmount;
      const endingClass = row.ending < 0 ? ' class="negative"' : '';

      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${(row.appliedReturn * 100).toFixed(2)}%</td>
        <td>${withdrawalDisplay}</td>
        <td${endingClass}>${formatCurrency(row.ending)}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    content.appendChild(table);

    const summary = document.createElement('div');
    summary.className = 'summary';
    const endingBalanceClass = scenario.endingBalance < 0 ? ' class="negative"' : '';
    summary.innerHTML = `
      Total Withdrawals: ${formatCurrency(totalWithdrawn)}<br />
      Ending Balance: <span${endingBalanceClass}>${formatCurrency(scenario.endingBalance)}</span>
    `;
    content.appendChild(summary);

    if (collapsible) {
      const expanded = expandedTables[key];
      if (!expanded) {
        content.style.display = 'none';
        headingElement.classList.remove('active');
      } else {
        headingElement.classList.add('active');
      }
      headingElement.addEventListener('click', () => {
        const isExpanded = expandedTables[key];
        expandedTables[key] = !isExpanded;
        headingElement.classList.toggle('active', !isExpanded);
        content.style.display = isExpanded ? 'none' : '';

        // Update chart visibility
        if (latestScenarios) {
          renderChart(latestScenarios.historical, latestScenarios.strategyOne, latestScenarios.strategyTwo);
        }
      });
    }

    container.appendChild(content);
    return container;
  };

  const inner = document.createElement('div');
  inner.className = 'table-group';
  inner.appendChild(makeMiniTable('Historical Sequence', historicalScenario));
  inner.appendChild(makeMiniTable('Strategy 1 Sequence', strategyOneScenario, { collapsible: true, key: 'strategy1' }));
  inner.appendChild(makeMiniTable('Strategy 2 Sequence', strategyTwoScenario, { collapsible: true, key: 'strategy2' }));
  card.appendChild(inner);

  wrapper.appendChild(card);
};

let sequenceChart = null;

const renderChart = (historicalScenario, strategyOneScenario, strategyTwoScenario) => {
  const ctx = document.getElementById('sequence-chart');
  const labels = historicalScenario.rows.map((row) => row.year);
  const data = {
    labels,
    datasets: [
      {
        label: 'Historical',
        data: historicalScenario.rows.map((row) => Math.round(row.ending)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: false,
        tension: 0.25,
        hidden: false,
      },
      {
        label: 'Strategy 1 Sequence',
        data: strategyOneScenario.rows.map((row) => Math.round(row.ending)),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: false,
        tension: 0.25,
        hidden: !expandedTables.strategy1,
      },
      {
        label: 'Strategy 2 Sequence',
        data: strategyTwoScenario.rows.map((row) => Math.round(row.ending)),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        fill: false,
        tension: 0.25,
        hidden: !expandedTables.strategy2,
      },
    ],
  };

  if (sequenceChart) {
    sequenceChart.data = data;
    sequenceChart.update();
    return;
  }

  sequenceChart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => formatCurrency(value),
          },
        },
      },
    },
  });
};

const withdrawalRates = Array.from({ length: 13 }, (_, idx) => idx / 100); // 0% through 12%

const DEFAULTS = {
  initialBalance: 250000,
  withdrawalRate: 0.04,
  startYear: 2000,
  endYear: 2012,
};

const populateWithdrawalSelect = () => {
  const select = document.getElementById('withdrawal-rate');
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select rate';
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  withdrawalRates.forEach((rate) => {
    const option = document.createElement('option');
    option.value = rate;
    option.textContent = `${(rate * 100).toFixed(1)}% of balance`;
    select.appendChild(option);
  });
};

const populateInitialBalanceOptions = () => {
  const dataList = document.getElementById('initial-balance-options');
  [100000, 250000, 500000, 750000, 1000000].forEach((value) => {
    const option = document.createElement('option');
    option.value = formatCurrency(value);
    dataList.appendChild(option);
  });
};

const sanitizeCurrencyInput = (input) => {
  const value = input.value.replace(/[^0-9.]/g, '');
  if (!value) {
    return 0;
  }
  const numericValue = Number(value);
  input.value = formatCurrency(numericValue);
  return numericValue;
};

const sanitizeNumberInput = (input, min, max) => {
  const value = clamp(Number(input.value || min), min, max);
  input.value = value;
  return value;
};

const computeStressReturns = (baseReturns) => {
  if (!stressState.enabled || !stressState.scenarioKey || !stressState.targetYear) {
    return baseReturns;
  }
  const scenario = STRESS_SCENARIOS[stressState.scenarioKey];
  return baseReturns.map((entry) => {
    if (entry.year === Number(stressState.targetYear)) {
      return { ...entry, return: scenario.loss };
    }
    return entry;
  });
};

const initStressControls = () => {
  const toggle = document.getElementById('stress-toggle');
  const controls = document.getElementById('stress-controls');
  const scenarioSelect = document.getElementById('stress-scenario');
  const yearSelect = document.getElementById('stress-year');
  const infoButton = document.getElementById('stress-info');
  const modal = document.getElementById('stress-modal');
  const modalClose = document.getElementById('stress-modal-close');
  const modalBody = document.getElementById('stress-modal-body');
  const modalTitle = document.getElementById('stress-modal-title');

  Object.values(STRESS_SCENARIOS).forEach((scenario) => {
    const option = document.createElement('option');
    option.value = scenario.key;
    option.textContent = scenario.label;
    scenarioSelect.appendChild(option);
  });

  toggle.addEventListener('click', () => {
    stressState.enabled = !stressState.enabled;
    toggle.setAttribute('aria-expanded', stressState.enabled.toString());
    controls.hidden = !stressState.enabled;
    infoButton.hidden = !stressState.enabled || !stressState.scenarioKey;
    yearSelect.disabled = !stressState.enabled;
    if (!stressState.enabled) {
      stressState.scenarioKey = '';
      stressState.targetYear = '';
      scenarioSelect.value = '';
      yearSelect.replaceChildren(new Option('Select year', '', true, true));
      yearSelect.disabled = true;
    }
    runSimulation();
  });

  scenarioSelect.addEventListener('change', () => {
    stressState.scenarioKey = scenarioSelect.value;
    infoButton.hidden = !stressState.scenarioKey;
    const years = getReturnsSlice(
      Number(document.getElementById('start-year').value),
      Number(document.getElementById('end-year').value),
    ).map((entry) => entry.year);

    yearSelect.replaceChildren(new Option('Select year', '', true, true));
    years.forEach((year) => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });
    yearSelect.disabled = false;
  });

  yearSelect.addEventListener('change', () => {
    stressState.targetYear = yearSelect.value;
    runSimulation();
  });

  infoButton.addEventListener('click', () => {
    if (!stressState.scenarioKey) return;
    const scenario = STRESS_SCENARIOS[stressState.scenarioKey];
    modalTitle.textContent = scenario.modal.title;
    modalBody.innerHTML = scenario.modal.body;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
  });

  const closeModal = () => {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  };

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.classList.contains('modal-backdrop')) {
      closeModal();
    }
  });
};

const runSimulation = () => {
  const initialBalanceInput = document.getElementById('initial-balance');
  const rawBalance = initialBalanceInput.value.trim();
  const sanitizedBalance = sanitizeCurrencyInput(initialBalanceInput);
  const initialBalance = rawBalance === '' ? DEFAULTS.initialBalance : sanitizedBalance;
  initialBalanceInput.value = formatCurrency(initialBalance);

  const withdrawalRateSelect = document.getElementById('withdrawal-rate');
  const withdrawalRate = withdrawalRateSelect.value === ''
    ? 0
    : Number(withdrawalRateSelect.value);

  const startYear = sanitizeNumberInput(document.getElementById('start-year'), 1926, 2024);
  const endYear = sanitizeNumberInput(document.getElementById('end-year'), startYear + 1, 2024);
  document.getElementById('end-year').min = startYear + 1;

  const annualWithdrawal = initialBalance * withdrawalRate;
  const returnsSlice = getReturnsSlice(startYear, endYear);
  const orderedReturns = getOrderedSequence(computeStressReturns(returnsSlice));

  const historical = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, identity);
  const strategyOne = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, strategyOneReturn);
  const strategyTwo = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, strategyTwoReturn);

  // Store scenarios for later use when toggling tables
  latestScenarios = { historical, strategyOne, strategyTwo };

  renderTables(historical, strategyOne, strategyTwo);
  renderChart(historical, strategyOne, strategyTwo);
};

const init = () => {
  populateWithdrawalSelect();
  populateInitialBalanceOptions();
  initStressControls();
  document.getElementById('stress-info').hidden = true;
  document.getElementById('stress-controls').hidden = true;
  runSimulation();

  document.getElementById('randomize').addEventListener('click', () => {
    const startYear = Number(document.getElementById('start-year').value);
    const endYear = Number(document.getElementById('end-year').value);
    const returnsSlice = getReturnsSlice(startYear, endYear);
    getOrderedSequence(returnsSlice, { forceRandom: true });
    runSimulation();
  });

  document.getElementById('reset').addEventListener('click', () => {
    currentOrder = null;
    stressState.enabled = false;
    stressState.scenarioKey = '';
    stressState.targetYear = '';
    expandedTables.strategy1 = false;
    expandedTables.strategy2 = false;
    document.getElementById('stress-toggle').setAttribute('aria-expanded', 'false');
    document.getElementById('stress-controls').hidden = true;
    document.getElementById('stress-info').hidden = true;
    document.getElementById('stress-scenario').value = '';
    document.getElementById('stress-year').replaceChildren(new Option('Select year', '', true, true));
    document.getElementById('stress-year').disabled = true;
    document.getElementById('initial-balance').value = formatCurrency(DEFAULTS.initialBalance);
    const withdrawalSelect = document.getElementById('withdrawal-rate');
    withdrawalSelect.value = '';
    withdrawalSelect.selectedIndex = 0;
    document.getElementById('start-year').value = DEFAULTS.startYear;
    document.getElementById('end-year').value = DEFAULTS.endYear;
    document.getElementById('end-year').min = DEFAULTS.startYear + 1;
    document.getElementById('stress-modal').hidden = true;
    document.getElementById('stress-modal').setAttribute('aria-hidden', 'true');
    runSimulation();
  });

  ['initial-balance', 'withdrawal-rate', 'start-year', 'end-year'].forEach((id) => {
    document.getElementById(id).addEventListener('change', runSimulation);
  });
};

document.addEventListener('DOMContentLoaded', init);
