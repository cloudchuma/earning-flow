(() => {

    const percentSelect = document.getElementById('percentSelect');
    const customPct = document.getElementById('customPct');
    const selectedPctEl = document.getElementById('selectedPct');
    const daysBody = document.getElementById('daysBody');
    const addDayBtns = document.querySelectorAll('.add-day');
    const totalSalesEl = document.getElementById('totalSales');
    const totalEarnedEl = document.getElementById('totalEarned');
    const clearMonthBtn = document.getElementById('clearMonthBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const monthNameEl = document.getElementById('monthName');
    const calcBtn = document.getElementById('calcBtn');

    let state = { percent: 10, entries: [], lastAddedDate: null };

    const money = v => '₦' + (Number(v || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function parseNumberInput(raw) {
        if (!raw) return 0;
        const cleaned = String(raw).replace(/\s/g, '').replace(/,/g, '');
        const m = cleaned.match(/^\d*\.?\d*$/);
        if (!m) return NaN;
        return Number(cleaned);
    }

    function formatForDisplay(num) {
        if (num === '' || num === null || isNaN(num)) return '0.00';
        return Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function recompute() {
        state.entries.forEach(e => {
            e.commission = +((Number(e.sale) || 0) * (state.percent / 100));
        });
    }

    function recomputeYouOwe() {
        let runningOwe = 0;
        state.entries.forEach(e => {
            const sale = Number(e.sale || 0);
            const paid = Number(e.paidIn || 0);
            runningOwe = runningOwe + sale - paid;
            e.youOwe = runningOwe;
        });
    }

    function updateMonthBanner(d) {
        monthNameEl.textContent = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    function buildTable() {
        daysBody.innerHTML = '';
        let lastMonth = null;

        state.entries.forEach((e, idx) => {

            const dt = new Date(e.dateStr);
            const mn = dt.getMonth();

            if (lastMonth !== null && mn !== lastMonth) {
                const trM = document.createElement('tr');
                trM.classList.add('new-month');
                trM.innerHTML = `<td colspan="5">New month<br>${dt.toLocaleString(undefined, { month: 'long' })}</td>`;
                daysBody.appendChild(trM);
                updateMonthBanner(dt);
            }
            lastMonth = mn;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                <td><input type="text" class="sale-input" data-idx="${idx}" value="${formatForDisplay(e.sale)}"></td>
                <td><input type="text" class="paid-input" data-idx="${idx}" value="${formatForDisplay(e.paidIn)}"></td>
                <td class="comm">${money(e.commission)}
                    <span class="delete-btn" data-idx="${idx}">🗑</span>
                    <button class="daily-account-btn">Details</button>
                    <div class="daily-account"></div>
                </td>
                <td class="run"></td>`;

            daysBody.appendChild(tr);

            const saleInput = tr.querySelector('.sale-input');
            const paidInput = tr.querySelector('.paid-input');
            const commEl = tr.querySelector('.comm');
            const dailyAccount = tr.querySelector('.daily-account');

            // delete
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('Delete this day?')) {
                    state.entries.splice(idx, 1);
                    recompute();
                    recomputeYouOwe();
                    buildTable();
                }
            });

            // SALE input
            saleInput.addEventListener('input', () => {
                const cleaned = saleInput.value.replace(/[^0-9.]/g, '');
                saleInput.value = cleaned;
                const val = parseNumberInput(cleaned);
                if (isNaN(val)) return;

                state.entries[idx].sale = val;
                recompute();
                recomputeYouOwe();
                commEl.childNodes[0].textContent = money(state.entries[idx].commission);
                updateRunningTotals();
                updateSummary();


            });

            saleInput.addEventListener('blur', () => {
                saleInput.value = formatForDisplay(state.entries[idx].sale);
            });

            // PAID input
            paidInput.addEventListener('input', () => {
                const cleaned = paidInput.value.replace(/[^0-9.]/g, '');
                paidInput.value = cleaned;
                const val = parseNumberInput(cleaned);
                if (isNaN(val)) return;

                state.entries[idx].paidIn = val;
                recomputeYouOwe();
                updateRunningTotals();
                updateSummary();
            });

            paidInput.addEventListener('blur', () => {
                paidInput.value = formatForDisplay(state.entries[idx].paidIn);
            });

            // Details
            tr.querySelector('.daily-account-btn').addEventListener('click', () => {

                const sale = Number(state.entries[idx].sale || 0);
                const paid = Number(state.entries[idx].paidIn || 0);
                const com = Number(state.entries[idx].commission || 0);
                const short = Math.max(0, sale - paid);
                const excess = Math.max(0, paid - sale);
                const youOwe = Number(state.entries[idx].youOwe || 0);

                const runCommission = state.entries.slice(0, idx + 1)
                    .reduce((a, b) => a + b.commission, 0);

                const companyOwes = Math.max(0, runCommission - youOwe);

                dailyAccount.innerHTML = `
                You sold: ${money(sale)}<br>
                    You earned: ${money(com)}<br>
                        You paid: ${money(paid)}<br>
                            Short Payment: ${money(short)}<br>
                                Excess Payment: ${money(excess)}<br>
                                    You owe: ${money(youOwe)}<br>
                                        Company owes you: ${money(companyOwes)}<br>`;

                dailyAccount.style.display =
                    dailyAccount.style.display === 'block' ? 'none' : 'block';

            });

        });

        updateRunningTotals();
        updateSummary();

    }

    function updateRunningTotals() {
        let r = 0;
        const rows = daysBody.querySelectorAll("tr:not(.new-month)");

        state.entries.forEach((e, i) => {
            r += Number(e.commission || 0);

            if (rows[i]) {
                rows[i].querySelector('.run').textContent = money(r);
            }
        });
    }



    function updateSummary() {
        const totalSales = state.entries.reduce((s, e) => s + (+e.sale || 0), 0);
        const totalCom = state.entries.reduce((s, e) => s + (+e.commission || 0), 0);
        const latestOwe = state.entries.length > 0 ? state.entries[state.entries.length - 1].youOwe : 0;

        totalSalesEl.textContent = money(totalSales);
        // totalEarnedEl.textContent = money(Math.max(0, totalCom - latestOwe));
        totalEarnedEl.textContent = money(totalCom);

    }

    // 🔥 INSERTED HERE EXACTLY  
    percentSelect.addEventListener('change', e => {
        if (e.target.value === "custom") {
            customPct.style.display = "inline-block";
            customPct.focus();
        } else {
            customPct.style.display = "none";
            state.percent = Number(e.target.value);
            recompute();
            recomputeYouOwe();
            buildTable();
            selectedPctEl.textContent = state.percent + "%";
        }
    });

    // 🔥 INSERTED HERE EXACTLY  
    customPct.addEventListener('input', e => {
        const v = Number(customPct.value) || 0;
        state.percent = v;
        recompute();
        recomputeYouOwe();
        buildTable();
        selectedPctEl.textContent = state.percent + "%";
    });

    function addNextDate() {
        let next;
        if (state.lastAddedDate) {
            next = new Date(
                state.lastAddedDate.getFullYear(),
                state.lastAddedDate.getMonth(),
                state.lastAddedDate.getDate() + 1
            );
        } else {
            const now = new Date();
            next = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        state.lastAddedDate = next;

        state.entries.push({
            dateStr: next.toISOString().slice(0, 10),
            sale: 0,
            paidIn: 0,
            commission: 0,
            youOwe: 0
        });

        recompute();
        recomputeYouOwe();
        buildTable();
    }

    addDayBtns.forEach(b => b.addEventListener('click', addNextDate));

    clearMonthBtn.addEventListener('click', () => {
        if (confirm('Clear?')) initTableFromFirstOfMonth();
    });

    function initTableFromFirstOfMonth() {
        const now = new Date();
        const f = new Date(now.getFullYear(), now.getMonth(), 1);
        state.entries = [];
        state.lastAddedDate = null;

        for (let d = 0; d < 7; d++) {
            const dt = new Date(f.getFullYear(), f.getMonth(), f.getDate() + d);
            state.entries.push({
                dateStr: dt.toISOString().slice(0, 10),
                sale: 0,
                paidIn: 0,
                commission: 0,
                youOwe: 0
            });
            state.lastAddedDate = dt;
        }

        recompute();
        recomputeYouOwe();
        buildTable();
        updateMonthBanner(f);
    }

    exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "clark-data.json";
        a.click();
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                state = JSON.parse(ev.target.result);
                recompute();
                recomputeYouOwe();
                buildTable();
            } catch (err) { alert("Invalid JSON"); }
        }
        reader.readAsText(f);
    });

    calcBtn.addEventListener('click', () => {
        recompute();
        recomputeYouOwe();
        buildTable();
    });

    function init() {
        initTableFromFirstOfMonth();
        selectedPctEl.textContent = state.percent + "%";
    }

    init();

})();

    (() => {

        const percentSelect = document.getElementById('percentSelect');
        const customPct = document.getElementById('customPct');
        const selectedPctEl = document.getElementById('selectedPct');

        const daysBody = document.getElementById('daysBody');
        const addDayBtns = document.querySelectorAll('.add-day');

        const totalSalesEl = document.getElementById('totalSales');
        const totalEarnedEl = document.getElementById('totalEarned');

        const clearMonthBtn = document.getElementById('clearMonthBtn');
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        const importFile = document.getElementById('importFile');

        const monthNameEl = document.getElementById('monthName');
        const calcBtn = document.getElementById('calcBtn');


        let state = { percent: 10, entries: [], lastAddedDate: null };


        const money = v => '₦' + (Number(v || 0))
            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        function parseNumberInput(raw) {
            if (!raw) return 0;
            const cleaned = raw.replace(/[ ,]/g, '');
            return Number(cleaned);
        }

        function formatForDisplay(num) {
            return Number(num || 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function recomputeYouOwe() {
            let running = 0;
            state.entries.forEach(e => {
                running += Number(e.sale || 0) - Number(e.paidIn || 0);
                e.youOwe = running;
            });
        }

        function recomputeCommission() {
            state.entries.forEach(e => {
                e.commission = Number(e.sale || 0) * (state.percent / 100);
            });
        }

        function updateSummary() {

            const ts = state.entries.reduce((a, b) => a + Number(b.sale || 0), 0);
            totalSalesEl.textContent = money(ts);

            const tc = state.entries.reduce((a, b) => a + Number(b.commission || 0), 0);
            const owe = state.entries.length ? Number(state.entries[state.entries.length - 1].youOwe || 0) : 0;

            totalEarnedEl.textContent = money(Math.max(tc - owe, 0));
        }

        function updateRunningTotals() {

            let running = 0;

            state.entries.forEach((e, idx) => {
                running += Number(e.commission || 0);

                const row = daysBody.querySelectorAll("tr")[idx + (idx > 0 ? 1 : 0)];

                if (row)
                    row.querySelector(".run").textContent = money(running);
            });
        }

        function buildTable() {

            daysBody.innerHTML = "";
            recomputeCommission();
            recomputeYouOwe();

            let lastMonth = null;

            state.entries.forEach((e, idx) => {

                const dt = new Date(e.dateStr);

                const tr = document.createElement("tr");
                tr.innerHTML = `
<td>${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>

<td>
<input type="text" class="sale-input" value="${formatForDisplay(e.sale)}">
</td>

<td>
<input type="text" class="paid-input" value="${formatForDisplay(e.paidIn)}">
</td>

<td class="comm">
${money(e.commission)}
<span class="delete-btn" data-idx="${idx}">🗑</span>
<button class="daily-account-btn">Details</button>
<div class="daily-account"></div>
</td>

<td class="run"></td>
`;

                daysBody.appendChild(tr);

                const saleInput = tr.querySelector(".sale-input");
                const paidInput = tr.querySelector(".paid-input");
                const commEl = tr.querySelector(".comm");

                saleInput.addEventListener("input", () => {

                    const val = parseNumberInput(saleInput.value);

                    e.sale = isNaN(val) ? 0 : val;

                    recomputeCommission();
                    recomputeYouOwe();
                    saleInput.value = saleInput.value;

                    commEl.childNodes[0].textContent = money(e.commission);

                    updateRunningTotals();
                    updateSummary();
                });

                paidInput.addEventListener("input", () => {

                    const val = parseNumberInput(paidInput.value);

                    e.paidIn = isNaN(val) ? 0 : val;

                    recomputeYouOwe();
                    updateRunningTotals();
                    updateSummary();
                });

                tr.querySelector(".delete-btn").addEventListener("click", () => {
                    state.entries.splice(idx, 1);
                    buildTable();
                });

            });

            updateRunningTotals();
            updateSummary();
        }


        function addNextDate() {
            let next;
            if (state.lastAddedDate)
                next = new Date(state.lastAddedDate.getFullYear(), state.lastAddedDate.getMonth(), state.lastAddedDate.getDate() + 1);
            else {
                let now = new Date();
                next = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            state.entries.push({
                dateStr: next.toISOString().slice(0, 10),
                sale: 0, paidIn: 0, commission: 0, youOwe: 0
            });

            state.lastAddedDate = next;

            buildTable();
        }

        addDayBtns.forEach(b => b.addEventListener('click', addNextDate));

        calcBtn.addEventListener("click", () => {
            recomputeCommission();
            recomputeYouOwe();
            updateRunningTotals();
            updateSummary();
        });

        function init() {
            addNextDate();
        }

        init();

    })();
