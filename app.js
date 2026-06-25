const MAX_COMPARE = 4;
let selected = [];
let currentFilter = "All";
let currentSort = "brand";
let searchQuery = "";

// ── Utility ──────────────────────────────────────────────────
function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getCategories() {
  const cats = [...new Set(WATCHES.map(w => w.category))].sort();
  return ["All", ...cats];
}

function filterAndSort() {
  let list = WATCHES.filter(w => {
    const matchCat = currentFilter === "All" || w.category === currentFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || w.brand.toLowerCase().includes(q) || w.model.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  list.sort((a, b) => {
    if (currentSort === "brand") return (a.brand + a.model).localeCompare(b.brand + b.model);
    if (currentSort === "price-asc") return a.price - b.price;
    if (currentSort === "price-desc") return b.price - a.price;
    if (currentSort === "diameter") return b.caseDiameter - a.caseDiameter;
    if (currentSort === "power") return b.powerReserve - a.powerReserve;
    if (currentSort === "water") return b.waterResistance - a.waterResistance;
    return 0;
  });

  return list;
}

// ── Score: a rough "value score" across key specs ────────────
function scoreWatch(w, pool) {
  const maxWR = Math.max(...pool.map(p => p.waterResistance));
  const maxPR = Math.max(...pool.map(p => p.powerReserve));
  const minPrice = Math.min(...pool.map(p => p.price));
  const maxComps = Math.max(...pool.map(p => p.complications.length));

  let s = 0;
  s += (w.waterResistance / (maxWR || 1)) * 25;
  s += (w.powerReserve / (maxPR || 1)) * 25;
  s += (minPrice / w.price) * 25;
  s += (w.complications.length / (maxComps || 1)) * 15;
  if (w.crystal === "Sapphire") s += 5;
  if (w.caseback === "Exhibition") s += 5;
  return Math.round(s);
}

// ── Render ────────────────────────────────────────────────────
function renderGrid() {
  const list = filterAndSort();
  const grid = document.getElementById("watch-grid");
  const countEl = document.getElementById("watch-count");
  countEl.textContent = `${list.length} watch${list.length !== 1 ? "es" : ""}`;

  grid.innerHTML = list.map(w => {
    const isSelected = selected.includes(w.id);
    return `
    <div class="watch-card ${isSelected ? "selected" : ""}" data-id="${w.id}">
      <div class="card-img-wrap">
        <img src="${w.image}" alt="${w.brand} ${w.model}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&h=300&fit=crop&q=80'">
        <span class="card-category">${w.category}</span>
        <span class="select-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
      </div>
      <div class="card-body">
        <div class="card-brand">${w.brand}</div>
        <div class="card-model">${w.model}</div>
        <div class="card-ref">${w.ref}</div>
        <div class="card-specs">
          <div class="spec-pill">
            <div class="spec-label">Diameter</div>
            <div class="spec-value">${w.caseDiameter}mm</div>
          </div>
          <div class="spec-pill">
            <div class="spec-label">Water Res.</div>
            <div class="spec-value">${w.waterResistance}m</div>
          </div>
          <div class="spec-pill">
            <div class="spec-label">Year</div>
            <div class="spec-value">${w.year}</div>
          </div>
          <div class="spec-pill">
            <div class="spec-label">Power Res.</div>
            <div class="spec-value">${w.powerReserve}h</div>
          </div>
        </div>
        <div class="card-footer">
          <div class="card-price">${fmt(w.price)}</div>
          <div class="complication-tags">
            ${w.complications.slice(0,2).map(c => `<span class="complication-tag">${c}</span>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
  }).join("") || `
    <div class="no-results">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <p>No watches match your search</p>
    </div>`;
}

function renderCompareBar() {
  const bar = document.getElementById("compare-bar");
  const slots = document.getElementById("compare-slots");
  const btn = document.getElementById("compare-btn");
  const hint = document.getElementById("compare-hint");

  if (selected.length === 0) {
    bar.classList.remove("visible");
    return;
  }

  bar.classList.add("visible");
  btn.disabled = selected.length < 2;

  const remaining = MAX_COMPARE - selected.length;
  hint.textContent = remaining > 0
    ? `Add ${remaining} more to compare`
    : "Ready to compare!";

  slots.innerHTML = selected.map(id => {
    const w = WATCHES.find(x => x.id === id);
    return `
    <div class="compare-slot">
      <img src="${w.image}" alt="${w.brand}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=80&h=80&fit=crop&q=80'">
      <div>
        <div class="compare-slot-brand">${w.brand}</div>
        <div class="compare-slot-name">${w.model}</div>
      </div>
      <button class="slot-remove" data-remove="${w.id}" aria-label="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>`;
  }).join("");
}

function renderCompareModal() {
  const watches = selected.map(id => WATCHES.find(w => w.id === id));
  const scores = watches.map(w => scoreWatch(w, watches));
  const maxScore = Math.max(...scores);

  const maxWR = Math.max(...watches.map(w => w.waterResistance));
  const maxPR = Math.max(...watches.map(w => w.powerReserve));
  const minPrice = Math.min(...watches.map(w => w.price));

  function winClass(vals, idx, higherBetter = true) {
    const best = higherBetter ? Math.max(...vals) : Math.min(...vals);
    return vals[idx] === best ? "winner" : vals[idx] !== Math.max(...vals) && vals[idx] !== Math.min(...vals) ? "" : "loser";
  }

  const headers = watches.map((w, i) => `
    <th>
      <div class="th-watch-header">
        <img class="th-watch-img" src="${w.image}" alt="${w.brand}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=160&h=160&fit=crop&q=80'">
        <div class="th-brand">${w.brand}</div>
        <div class="th-model">${w.model}</div>
        <div class="th-ref">${w.ref}</div>
      </div>
    </th>`).join("");

  const rows = [
    { label: "Price (MSRP)", render: (w, i) => `<span class="${winClass(watches.map(x => x.price), i, false)} price-cell">${fmt(w.price)}</span>` },
    { label: "Origin", render: w => w.origin },
    { label: "Founded", render: w => w.founded },
    { label: "Category", render: w => w.category },
    { label: "Case Diameter", render: (w, i) => `<span class="${winClass(watches.map(x => x.caseDiameter), i, false)}">${w.caseDiameter}mm</span>` },
    { label: "Thickness", render: (w, i) => `<span class="${winClass(watches.map(x => x.thickness), i, false)}">${w.thickness}mm</span>` },
    { label: "Lug-to-Lug", render: (w, i) => `<span class="${winClass(watches.map(x => x.lug), i, false)}">${w.lug}mm</span>` },
    { label: "Case Material", render: w => w.caseMaterial },
    { label: "Crystal", render: w => w.crystal },
    { label: "Caseback", render: w => w.caseback },
    { label: "Dial Color", render: w => w.dial },
    { label: "Bracelet / Strap", render: w => w.bracelet },
    { label: "Bezel", render: w => `<span style="font-size:0.78rem">${w.bezel}</span>` },
    { label: "Movement", render: w => w.movement },
    { label: "Caliber", render: w => w.caliber },
    { label: "Power Reserve", render: (w, i) => {
      const pct = Math.round((w.powerReserve / maxPR) * 100);
      return `<div class="pr-bar">
        <div class="pr-track"><div class="pr-fill" style="width:${pct}%"></div></div>
        <span class="${winClass(watches.map(x => x.powerReserve), i)}">${w.powerReserve}h</span>
      </div>`;
    }},
    { label: "Frequency", render: (w, i) => `<span class="${winClass(watches.map(x => x.frequency), i)}">${(w.frequency/3600).toFixed(1)} Hz</span>` },
    { label: "Jewels", render: (w, i) => `<span class="${winClass(watches.map(x => x.jewels), i)}">${w.jewels}</span>` },
    { label: "Water Resistance", render: (w, i) => {
      const pct = Math.round((w.waterResistance / maxWR) * 100);
      return `<div class="wr-bar">
        <div class="wr-track"><div class="wr-fill" style="width:${pct}%"></div></div>
        <span class="${winClass(watches.map(x => x.waterResistance), i)}">${w.waterResistance}m</span>
      </div>`;
    }},
    { label: "Complications", render: w => `<div class="complications-cell">${w.complications.length ? w.complications.map(c => `<span class="complication-tag">${c}</span>`).join("") : '<span style="color:var(--muted);font-size:0.8rem">None</span>'}</div>` },
    { label: "Certified By", render: w => `<span style="font-size:0.78rem">${w.certified}</span>` },
    { label: "Warranty", render: w => w.warranty },
  ];

  const tableRows = rows.map(r => `
    <tr>
      <td>${r.label}</td>
      ${watches.map((w, i) => `<td>${r.render(w, i)}</td>`).join("")}
    </tr>`).join("");

  const scoreRow = `
    <tr class="score-row" style="background:rgba(201,168,76,0.03)">
      <td style="font-weight:700;color:var(--text);font-size:0.8rem;text-transform:uppercase;letter-spacing:.5px">Overall Score</td>
      ${scores.map((s, i) => `
      <td class="score-cell">
        <div class="score-badge ${s === maxScore ? "best" : ""}">
          <span class="score-number">${s}</span>
          <span class="score-label">${s === maxScore ? "Best Pick" : "Score"}</span>
        </div>
      </td>`).join("")}
    </tr>`;

  document.getElementById("compare-table-body").innerHTML = `
    <thead>
      <tr>
        <th><div class="row-label-header"><div class="row-label-title">Specification</div></div></th>
        ${headers}
      </tr>
    </thead>
    <tbody>
      ${scoreRow}
      ${tableRows}
    </tbody>`;
}

// ── Event Handlers ────────────────────────────────────────────
function toggleSelect(id) {
  if (selected.includes(id)) {
    selected = selected.filter(s => s !== id);
  } else {
    if (selected.length >= MAX_COMPARE) {
      showToast(`You can compare up to ${MAX_COMPARE} watches at a time.`);
      return;
    }
    selected.push(id);
  }
  renderGrid();
  renderCompareBar();
}

function openModal() {
  renderCompareModal();
  document.getElementById("compare-modal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("compare-modal").classList.remove("open");
  document.body.style.overflow = "";
}

function clearAll() {
  selected = [];
  renderGrid();
  renderCompareBar();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = `
      position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#1a1a26;border:1px solid #2a2a3a;border-radius:8px;padding:10px 18px;
      font-size:0.875rem;color:#f0f0f5;z-index:500;opacity:0;
      transition:all 0.25s ease;pointer-events:none;white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateX(-50%) translateY(0)"; });
  setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(-50%) translateY(20px)"; }, 2500);
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  // Populate filter
  const filterEl = document.getElementById("category-filter");
  getCategories().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    filterEl.appendChild(opt);
  });

  filterEl.addEventListener("change", e => {
    currentFilter = e.target.value;
    renderGrid();
  });

  document.getElementById("sort-select").addEventListener("change", e => {
    currentSort = e.target.value;
    renderGrid();
  });

  document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    renderGrid();
  });

  document.getElementById("watch-grid").addEventListener("click", e => {
    const card = e.target.closest(".watch-card");
    if (!card) return;
    toggleSelect(Number(card.dataset.id));
  });

  document.getElementById("compare-slots").addEventListener("click", e => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    toggleSelect(Number(btn.dataset.remove));
  });

  document.getElementById("compare-btn").addEventListener("click", openModal);
  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.getElementById("modal-close").addEventListener("click", closeModal);

  document.getElementById("compare-modal").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });

  renderGrid();
  renderCompareBar();
}

document.addEventListener("DOMContentLoaded", init);
