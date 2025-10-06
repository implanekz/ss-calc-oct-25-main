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

const generateSpanKey = (returns) => {
  if (!returns.length) return 'empty';
  return `${returns[0].year}-${returns[returns.length - 1].year}-${returns.length}`;
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

      let returnLabel;
      if (heading === 'Historical Sequence') {
        returnLabel = `${(row.rawReturn * 100).toFixed(1)}%`;
      } else {
        const applied = row.appliedReturn;
        returnLabel = `${(applied * 100).toFixed(1)}%`;
      }

      tr.innerHTML = `<td>${row.year}</td><td>${returnLabel}</td><td>${withdrawalDisplay}</td><td>${formatCurrency(row.ending)}</td>`;
      const endingCell = tr.querySelector('td:last-child');
      if (row.ending < 0) {
        endingCell.classList.add('negative');
      }
      tbody.appendChild(tr);
    });

    const totalRow = document.createElement('tr');
    totalRow.className = 'total-row';
    totalRow.innerHTML = `<td colspan="2">Total Withdrawn</td><td>${formatCurrency(totalWithdrawn)}</td><td></td>`;
    tbody.appendChild(totalRow);
    table.appendChild(tbody);

    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.textContent = `Ending balance: ${formatCurrency(scenario.endingBalance)}`;
    if (scenario.endingBalance < 0) {
      summary.classList.add('negative');
    }
    content.appendChild(table);
    content.appendChild(summary);
    container.appendChild(content);

    if (collapsible && key) {
      const updateExpansion = () => {
        const expanded = !!expandedTables[key];
        headingElement.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        headingElement.classList.toggle('active', expanded);
        container.classList.toggle('expanded', expanded);
        content.hidden = !expanded;
      };

      updateExpansion();
      headingElement.addEventListener('click', () => {
        expandedTables[key] = !expandedTables[key];
        updateExpansion();
        syncChartVisibility();
      });

      // Ensure chart visibility reflects initial state after tables render
      syncChartVisibility();
    }

    return container;
  };

  const group = document.createElement('div');
  group.className = 'table-group';
  group.appendChild(makeMiniTable('Historical Sequence', historicalScenario));
  group.appendChild(makeMiniTable('Strategy 1 Sequence', strategyOneScenario, { collapsible: true, key: 'strategy1' }));
  group.appendChild(makeMiniTable('Strategy 2 Sequence', strategyTwoScenario, { collapsible: true, key: 'strategy2' }));

  card.appendChild(group);
  wrapper.appendChild(card);
};

let chart;
const syncChartVisibility = () => {
  if (!chart || !chart.data || !Array.isArray(chart.data.datasets)) return;
  const datasets = chart.data.datasets;
  if (datasets[1]) datasets[1].hidden = !expandedTables.strategy1;
  if (datasets[2]) datasets[2].hidden = !expandedTables.strategy2;
  chart.update();
};

const renderChart = (labels, datasets) => {
  const ctx = document.getElementById('sequence-chart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => formatCurrency(val),
          },
        },
      },
    },
  });
  syncChartVisibility();
};

const datasetsForChart = (historical, strat1, strat2, initialBalance) => {
  const labels = ['Start', ...historical.rows.map((row) => row.year)];
  const buildSeries = (scenario) => [initialBalance, ...scenario.rows.map((row) => row.ending)];
  return {
    labels,
    datasets: [
      {
        label: 'Historical Sequence',
        data: buildSeries(historical),
        borderColor: 'rgba(220, 38, 127, 1)',
        backgroundColor: 'rgba(220, 38, 127, 0.12)',
        fill: false,
        tension: 0.28,
      },
      {
        label: 'Strategy 1',
        data: buildSeries(strat1),
        borderColor: 'rgba(37, 99, 235, 1)',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: false,
        tension: 0.28,
        hidden: !expandedTables.strategy1,
      },
      {
        label: 'Strategy 2',
        data: buildSeries(strat2),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: false,
        tension: 0.28,
        hidden: !expandedTables.strategy2,
      },
    ],
  };
};

const populateWithdrawalSelect = () => {
  const select = document.getElementById('withdrawal-rate');
  select.innerHTML = '';
  for (let rate = 0; rate <= 12; rate += 0.5) {
    const option = document.createElement('option');
    option.value = rate.toFixed(1);
    option.textContent = `${rate.toFixed(1)}%`;
    if (Math.abs(rate - 0) < 0.001) option.selected = true;
    select.appendChild(option);
  }
};

const getInputValues = () => {
  const rawBalance = document.getElementById('initial-balance').value || '0';
  const sanitised = rawBalance.replace(/[^0-9.]/g, '');
  const initialBalance = Number(sanitised) || 0;
  const withdrawalRate = Number(document.getElementById('withdrawal-rate').value) || 0;
  const startYear = Number(document.getElementById('start-year').value) || RETURN_DATA[0].year;
  const endYear = Number(document.getElementById('end-year').value) || RETURN_DATA[RETURN_DATA.length - 1].year;
  return { initialBalance, withdrawalRate, startYear, endYear };
};

const runSimulation = (forceNewRandom = false) => {
  const { initialBalance, withdrawalRate, startYear, endYear } = getInputValues();
  const baseReturns = getReturnsSlice(startYear, endYear);
  const orderedReturns = getOrderedSequence(baseReturns, { forceRandom: forceNewRandom });

  const annualWithdrawal = initialBalance * (withdrawalRate / 100);

  const historicalScenario = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, identity);
  const strategyOneScenario = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, strategyOneReturn);
  const strategyTwoScenario = simulateSequence(initialBalance, annualWithdrawal, orderedReturns, strategyTwoReturn);

  renderTables(historicalScenario, strategyOneScenario, strategyTwoScenario);

  const { labels, datasets } = datasetsForChart(historicalScenario, strategyOneScenario, strategyTwoScenario, initialBalance);
  renderChart(labels, datasets);
  const balanceInput = document.getElementById('initial-balance');
  if (balanceInput) {
    const sanitised = balanceInput.value.replace(/[^0-9.]/g, '');
    const value = Number(sanitised) || 0;
    balanceInput.value = value ? formatCurrency(value) : '$0';
  }
};

const resetForm = () => {
  document.getElementById('initial-balance').value = '$500,000';
  document.getElementById('withdrawal-rate').value = '0.0';
  document.getElementById('start-year').value = 2000;
  document.getElementById('end-year').value = 2012;
  currentOrder = null;
  currentSpanKey = null;
  expandedTables.strategy1 = false;
  expandedTables.strategy2 = false;
  runSimulation(false);
};

populateWithdrawalSelect();
const balanceInput = document.getElementById('initial-balance');
const formatBalanceDisplay = () => {
  const sanitised = balanceInput.value.replace(/[^0-9.]/g, '');
  const value = Number(sanitised) || 0;
  balanceInput.value = value ? formatCurrency(value) : '$0';
};
const prepareBalanceForEdit = () => {
  const sanitised = balanceInput.value.replace(/[^0-9.]/g, '');
  balanceInput.value = sanitised || '';
};
formatBalanceDisplay();

document.getElementById('reset').addEventListener('click', resetForm);
document.getElementById('randomize').addEventListener
  ('click', () => runSimulation(true));
balanceInput.addEventListener('blur', formatBalanceDisplay);
balanceInput.addEventListener('focus', prepareBalanceForEdit);
balanceInput.addEventListener('change', () => runSimulation());
document.getElementById('start-year').addEventListener('change', () => runSimulation());
document.getElementById('end-year').addEventListener('change', () => runSimulation());
document.getElementById('withdrawal-rate').addEventListener('change', () => runSimulation());
document.addEventListener('DOMContentLoaded', () => runSimulation());
