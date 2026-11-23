/* global vega */

const controls = document.querySelector('#controls'),
      chart = document.querySelector('#chart'),
      status = document.querySelector('#status'),
      error = document.querySelector('#error'),
      labels = document.querySelector('#labels'),
      count = document.querySelector('#count'),
      legendKind = document.querySelector('#legend-kind');

const data = [
  {month: 'Ocak', revenue: 32, region: 'Marmara'},
  {month: 'Şubat', revenue: 47, region: 'Ege'},
  {month: 'Mart', revenue: 38, region: 'İç Anadolu'},
  {month: 'Nisan', revenue: 64, region: 'Marmara'},
  {month: 'Mayıs', revenue: 55, region: 'Ege'},
  {month: 'Haziran', revenue: 72, region: 'İç Anadolu'},
  {month: 'Temmuz', revenue: 81, region: 'Marmara'},
  {month: 'Ağustos', revenue: 69, region: 'Ege'},
  {month: 'Eylül', revenue: 76, region: 'İç Anadolu'},
  {month: 'Ekim', revenue: 92, region: 'Marmara'}
];

let view, turkish, language = 'tr';

function specification() {
  const boundaries = legendKind.value === 'boundaries',
        colorField = boundaries ? 'revenue' : 'region';
  return {
    width: 620,
    height: 260,
    padding: 10,
    description: 'Aylara ve bölgelere göre gelir grafiği',
    title: {text: 'Aylık gelir', subtitle: '2026 · Bin Türk lirası', anchor: 'start'},
    data: [{name: 'table', values: data.slice(0, +count.value)}],
    scales: [
      {name: 'x', type: 'band', domain: {data: 'table', field: 'month'}, range: 'width', padding: 0.2},
      {name: 'y', type: 'linear', domain: [0, 100], range: 'height', nice: false},
      boundaries
        ? {name: 'color', type: 'threshold', domain: [40, 70], range: ['#136b9b', '#a94622', '#7154a1']}
        : {name: 'color', type: 'ordinal', domain: {data: 'table', field: 'region'}, range: ['#136b9b', '#a94622', '#7154a1']}
    ],
    axes: [
      {scale: 'x', orient: 'bottom', title: 'Ay'},
      {scale: 'y', orient: 'left', title: 'Gelir (bin TL)', grid: true}
    ],
    legends: [{fill: 'color', stroke: 'color', title: boundaries ? 'Gelir aralığı' : 'Bölge'}],
    marks: [{
      name: 'revenue-bars',
      type: 'rect',
      from: {data: 'table'},
      encode: {
        update: {
          x: {scale: 'x', field: 'month'},
          width: {scale: 'x', band: 1},
          y: {scale: 'y', field: 'revenue'},
          y2: {scale: 'y', value: 0},
          fill: {scale: 'color', field: colorField},
          stroke: {scale: 'color', field: colorField},
          description: {signal: "datum.month + ': ' + datum.revenue + ' bin Türk lirası, ' + datum.region"}
        }
      }
    }]
  };
}

function inspect() {
  const nodes = [chart, ...chart.querySelectorAll('[aria-label], [aria-roledescription]')];
  labels.replaceChildren();
  for (const node of nodes) {
    const row = document.createElement('tr');
    for (const value of [
      node === chart ? 'Chart container' : node.getAttribute('class') || node.tagName,
      node.getAttribute('aria-roledescription') || '',
      node.getAttribute('aria-label') || ''
    ]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    labels.appendChild(row);
  }
  chart.lang = labels.lang = language;
  for (const button of controls.querySelectorAll('[data-language]')) {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  }
  status.textContent = `${language === 'tr' ? 'Turkish' : 'English'} ARIA labels · ${count.value} categories · ${nodes.length} elements inspected`;
}

async function update(action) {
  controls.disabled = true;
  error.hidden = true;
  try {
    await action();
    inspect();
  } catch (err) {
    error.textContent = `Unable to render the localization harness: ${err.message}`;
    error.hidden = false;
    status.textContent = 'Rendering failed.';
  } finally {
    controls.disabled = false;
  }
}

async function createView() {
  if (view) view.finalize();
  view = new vega.View(vega.parse(specification()), {
    renderer: 'svg',
    ariaLocale: language === 'tr' ? turkish : {},
    logLevel: vega.Warn
  });
  await view.initialize(chart).runAsync();
}

for (const button of controls.querySelectorAll('[data-language]')) {
  button.addEventListener('click', () => update(async () => {
    language = button.dataset.language;
    await view.ariaLocale(language === 'tr' ? turkish : {}).runAsync();
  }));
}
count.addEventListener('change', () => update(createView));
legendKind.addEventListener('change', () => update(createView));
window.addEventListener('pagehide', () => view?.finalize());

update(async () => {
  if (typeof vega === 'undefined' || typeof vega.ariaLocale !== 'function') {
    throw new Error('Build this branch first: npx lerna run build --scope vega --include-dependencies');
  }
  const response = await fetch('aria-locale-tr.json');
  if (!response.ok) throw new Error(`Loading the Turkish locale failed (HTTP ${response.status}).`);
  turkish = await response.json();
  document.querySelector('#definition').textContent = JSON.stringify(turkish, null, 2);
  await createView();
});
