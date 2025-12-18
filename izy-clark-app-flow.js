
        (() => {
            // --- Variables ---
            const percentSelect = document.getElementById('percentSelect');
            const customPct = document.getElementById('customPct');
            const selectedPctEl = document.getElementById('selectedPct');
            const daysBody = document.getElementById('daysBody');
            const monthNameEl = document.getElementById('monthName');
            const addDayBtns = document.querySelectorAll('.add-day');
            const calcBtn = document.getElementById('calcBtn');
            const totalSalesEl = document.getElementById('totalSales');
            const totalEarnedEl = document.getElementById('totalEarned');
            const clearMonthBtn = document.getElementById('clearMonthBtn');
            const exportBtn = document.getElementById('exportData');
            const importInput = document.getElementById('importData');

            function monthKeyForDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

            const today = new Date();
            let currentMonthKey = monthKeyForDate(today);
            let storageKey = `izydon:${currentMonthKey}`;
            let state = { monthKey: currentMonthKey, percent: 10, entries: [] };
            const money = v => '₦' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
            function parseNumberInput(raw) {
                if (!raw) return '';
                const cleaned = String(raw).replace(/\s/g, '').replace(/,/g, '');
                const m = cleaned.match(/^-?\d*(?:\.\d*)?/);
                return m && m[0] ? Number(m[0]) : NaN;
            }
            function formatForDisplay(num) { if (num === '' || num === null || isNaN(num)) return ''; const hasFraction = (Math.round(num) !== Number(num)); return Number(num).toLocaleString(undefined, { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 }); }

            function ensureDaysUpToToday() {
                const now = new Date(); const daysTo = now.getDate();
                if (state.entries.length === 0) {
                    for (let d = 1; d <= daysTo; d++) { const dt = new Date(now.getFullYear(), now.getMonth(), d); state.entries.push({ day: d, dateStr: dt.toISOString().slice(0, 10), sale: '', commission: 0 }); }
                    const dt2 = new Date(now.getFullYear(), now.getMonth(), daysTo + 1); state.entries.push({ day: daysTo + 1, dateStr: dt2.toISOString().slice(0, 10), sale: '', commission: 0 });
                }
            }

            function recompute() { state.entries.forEach(e => { e.commission = +(Number(e.sale || 0) * (state.percent / 100)); }); }

            function buildTable() {
                daysBody.innerHTML = ''; state.entries.forEach((e, idx) => {
                    const tr = document.createElement('tr');
                    const dateLabel = new Date(e.dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    tr.innerHTML = `<td><div style="font-weight:700">${dateLabel}</div></td>
      <td><input type="text" class="sale-input" data-idx="${idx}" inputmode="decimal" autocomplete="off" value="${e.sale === '' ? '' : formatForDisplay(e.sale)}" placeholder="0"/></td>
      <td class="comm">${money(e.commission)}</td>
      <td class="run"></td>`;
                    daysBody.appendChild(tr);

                    const input = tr.querySelector('.sale-input'); const commEl = tr.querySelector('.comm');
                    input.addEventListener('focus', ev => { ev.target.value = String(ev.target.value || '').replace(/,/g, ''); ev.target.select(); ev.target.classList.remove('input-error'); });
                    input.addEventListener('input', ev => {
                        const val = ev.target.value;
                        if (/[A-Za-z]/.test(val)) { ev.target.classList.add('input-error'); return; } else ev.target.classList.remove('input-error');
                        const parsed = parseNumberInput(val);
                        if (isNaN(parsed)) { state.entries[idx].sale = ''; state.entries[idx].commission = 0; } else { state.entries[idx].sale = parsed; state.entries[idx].commission = +(parsed * (state.percent / 100)); }
                        commEl.textContent = money(state.entries[idx].commission);
                        updateRunningTotals(); updateSummary(); save();
                    });
                    input.addEventListener('blur', ev => {
                        const val = parseNumberInput(ev.target.value);
                        if (isNaN(val)) { ev.target.value = ''; state.entries[idx].sale = ''; state.entries[idx].commission = 0; commEl.textContent = money(0); }
                        else { ev.target.value = formatForDisplay(val); state.entries[idx].sale = val; state.entries[idx].commission = +(val * (state.percent / 100)); commEl.textContent = money(state.entries[idx].commission); }
                        updateRunningTotals(); updateSummary(); save();
                    });
                });
                updateRunningTotals(); updateSummary();
            }

            function updateRunningTotals() { const rows = daysBody.querySelectorAll('tr'); let running = 0; state.entries.forEach((e, i) => { running += Number(e.commission || 0); const row = rows[i]; if (row) { row.querySelector('.run').textContent = '₦' + Number(running).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } }); }
            function updateSummary() { const totalSales = state.entries.reduce((s, e) => s + (Number(e.sale) || 0), 0); const totalEarned = state.entries.reduce((s, e) => s + (Number(e.commission) || 0), 0); totalSalesEl.textContent = '₦' + formatForDisplay(totalSales); totalEarnedEl.textContent = '₦' + Number(totalEarned).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

            // percent select
            percentSelect.addEventListener('change', e => { if (e.target.value === 'custom') { customPct.style.display = 'inline-block'; customPct.focus(); } else { customPct.style.display = 'none'; state.percent = Number(e.target.value); recompute(); buildTable(); selectedPctEl.textContent = state.percent + '%'; save(); } });
            customPct.addEventListener('input', e => { const v = Number(e.target.value) || 0; state.percent = v; percentSelect.value = v; recompute(); buildTable(); selectedPctEl.textContent = state.percent + '%'; save(); });

            // add-day buttons
            addDayBtns.forEach(btn => btn.addEventListener('click', () => {
                const last = state.entries[state.entries.length - 1];
                const nextDay = new Date(last.dateStr);
                nextDay.setDate(nextDay.getDate() + 1);
                state.entries.push({ day: state.entries.length + 1, dateStr: nextDay.toISOString().slice(0, 10), sale: '', commission: 0 });
                save(); buildTable();
            }));

            calcBtn.addEventListener('click', () => { recompute(); save(); updateSummary(); });
            clearMonthBtn.addEventListener('click', () => { if (confirm('Clear data for this month?')) { state.entries = []; save(); ensureDaysUpToToday(); buildTable(); } });

            // Export JSON
            exportBtn.addEventListener('click', () => {
                const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `IZYDON_Clark_${state.monthKey}.json`; a.click(); URL.revokeObjectURL(url); alert('Data exported!');
            });

            // Import JSON
            importInput.addEventListener('change', e => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                    try { const imported = JSON.parse(ev.target.result); state.percent = imported.percent || 10; state.entries = imported.entries || []; save(); buildTable(); alert('Data restored!'); } catch (err) { alert('Invalid file!'); }
                };
                reader.readAsText(file);
            });

            // Init
            function init() {
                const raw = localStorage.getItem(storageKey);
                if (raw) { try { state = JSON.parse(raw); } catch (e) { state = { monthKey: currentMonthKey, percent: 10, entries: [] }; } if (state.monthKey !== currentMonthKey) state = { monthKey: currentMonthKey, percent: 10, entries: [] }; }
                ensureDaysUpToToday(); recompute(); buildTable();
                monthNameEl.textContent = today.toLocaleString(undefined, { month: 'long', year: 'numeric' }); selectedPctEl.textContent = state.percent + '%';
            }
            init();

            window.izydon = { getState: () => JSON.parse(JSON.stringify(state)), setPercent: p => { state.percent = Number(p); recompute(); save(); buildTable(); selectedPctEl.textContent = state.percent + '%'; } };
        })();
