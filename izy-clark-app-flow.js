(() => {

    const percentSelect = document.getElementById('percentSelect');
    const customPct = document.getElementById('customPct');
    const selectedPctEl = document.getElementById('selectedPct');

    const daysBody = document.getElementById('daysBody');
    const addDayBtns = document.querySelectorAll('.add-day');

    const totalSalesEl = document.getElementById('totalSales');
    const totalPaidEl = document.getElementById('totalPaid');
    const totalEarnedEl = document.getElementById('totalEarned');
    const totalEarnedBalanceEl = document.getElementById('totalEarnedBalance');


    const clearMonthBtn = document.getElementById('clearMonthBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');

    const monthNameEl = document.getElementById('monthName');
    const calcBtn = document.getElementById('calcBtn');

    let state = { percent: 10, entries: [], lastAddedDate: null };

    // Format money
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

    function toLocalDateStr(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // Recompute commissions
    function recompute() {
        state.entries.forEach(e => {
            e.commission = +((Number(e.sale) || 0) * (state.percent / 100));
        });
    }

    // Recompute running "you owe"
    function recomputeYouOwe() {
        let runningOwe = 0;
        state.entries.forEach(e => {
            const sale = Number(e.sale || 0);
            const paid = Number(e.paidIn || 0);
            runningOwe = runningOwe + sale - paid;
            e.youOwe = runningOwe;
        });
    }

    // Update Month banner
    function updateMonthBanner(d) {
        monthNameEl.textContent = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }

    // Build table rows
    function buildTable() {
        daysBody.innerHTML = '';
        let lastMonth = null;

        state.entries.forEach((e, idx) => {
            const dt = new Date(e.dateStr);
            const mn = dt.getMonth();

            // Month separator
            if (lastMonth !== null && mn !== lastMonth) {
                const trM = document.createElement('tr');
                trM.classList.add('new-month');
                trM.innerHTML = `<td colspan="5">New month<br>${dt.toLocaleString(undefined, { month: 'long' })}</td>`;
                daysBody.appendChild(trM);
            }
            lastMonth = mn;

            // Main row
            const tr = document.createElement('tr');
            tr.innerHTML = `
    <td>${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
    <td>
        <input type="text" class="sale-input" data-idx="${idx}" value="${formatForDisplay(e.sale)}">
    </td>
    <td>
        <input type="text" class="paid-input" data-idx="${idx}" value="${formatForDisplay(e.paidIn)}">
    </td>
    <td class="comm">
        ${money(e.commission)}
        <span class="delete-btn" data-idx="${idx}">❌</span>
        <button class="daily-account-btn">Details</button>
    </td>
    <td class="run"></td>
`;

            daysBody.appendChild(tr);

            // ---- DETAILS ROW (appears under the main row)
            const detailsRow = document.createElement('tr');
            detailsRow.classList.add('details-row');

            detailsRow.innerHTML = `
    <td colspan="5">
        <div class="daily-account">
            <div>You sold: <strong class="d-sale"></strong></div>
            <div>You earned: <strong class="d-earned"></strong></div>
            <div>You paid: <strong class="d-paid"></strong></div>

            <div>Short Payment: <strong class="d-short"></strong></div>
            <div>Excess Payment: <strong class="d-excess"></strong></div>

            <div>You owe: <strong class="d-owe"></strong></div>
            <div>Company owes you: <strong class="d-company"></strong></div>
        </div>
    </td>
`;

            daysBody.appendChild(detailsRow);


            /* ---- TOGGLE DETAILS (IMPORTANT FIX) ---- */
            const detailsBtn = tr.querySelector('.daily-account-btn');
            const dailyAccount = detailsRow.querySelector('.daily-account');


            // new
            function updateDetails() {
                // Totals up to this day
                const totals = state.entries.slice(0, idx + 1).reduce(
                    (acc, x) => {
                        acc.sales += Number(x.sale || 0);
                        acc.paid += Number(x.paidIn || 0);
                        acc.commission += Number(x.commission || 0);
                        return acc;
                    },
                    { sales: 0, paid: 0, commission: 0 }
                );

                // Base differences
                const shortPayment = Math.max(0, totals.sales - totals.paid);
                const excessPayment = Math.max(0, totals.paid - totals.sales);

                // Net after earnings
                let balance = totals.paid + totals.commission - totals.sales;

                // Who owes who (FINAL TRUTH)
                const youOwe = balance < 0 ? Math.abs(balance) : 0;
                const companyOwesYou = balance > 0 ? balance : 0;

                // Update UI
                dailyAccount.querySelector('.d-sale').textContent = money(totals.sales);
                dailyAccount.querySelector('.d-earned').textContent = money(totals.commission);
                dailyAccount.querySelector('.d-paid').textContent = money(totals.paid);

                dailyAccount.querySelector('.d-short').textContent = money(shortPayment);
                dailyAccount.querySelector('.d-excess').textContent = money(excessPayment);

                dailyAccount.querySelector('.d-owe').textContent = money(youOwe);
                dailyAccount.querySelector('.d-company').textContent = money(companyOwesYou);
            }


            updateDetails();


            detailsBtn.addEventListener('click', () => {
                dailyAccount.classList.toggle('open');
            });


            // Delete row
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('Delete this day?')) {
                    state.entries.splice(idx, 1);
                    recompute();
                    recomputeYouOwe();
                    buildTable();
                }
            });

            // Sale input
            tr.querySelector('.sale-input').addEventListener('input', e => {
                const val = parseNumberInput(e.target.value);
                if (isNaN(val)) return;

                state.entries[idx].sale = val;
                recompute();
                recomputeYouOwe();
                updateRunningTotals();
                updateSummary();

                tr.querySelector('.comm').childNodes[0].textContent =
                    money(state.entries[idx].commission);

                updateDetails();
            });


            tr.querySelector('.sale-input').addEventListener('blur', e => {
                e.target.value = formatForDisplay(state.entries[idx].sale);
            });

            // Paid input
            tr.querySelector('.paid-input').addEventListener('input', e => {
                const val = parseNumberInput(e.target.value);
                if (isNaN(val)) return;

                state.entries[idx].paidIn = val;
                recomputeYouOwe();
                updateRunningTotals();
                updateSummary();

                updateDetails();
            });

            tr.querySelector('.paid-input').addEventListener('blur', e => {
                e.target.value = formatForDisplay(state.entries[idx].paidIn);
            });


        });


        updateRunningTotals();
        updateSummary();
    }

    // Update running totals column
    function updateRunningTotals() {
        let running = 0;
        const mainRows = Array.from(daysBody.querySelectorAll('tr')).filter(r => !r.classList.contains('details-row'));
        mainRows.forEach((row, idx) => {
            const e = state.entries[idx];
            running += Number(e.commission || 0);
            row.querySelector('.run').textContent = money(running);
        });
    }

    // Update summary at footer
    function updateSummary() {
        let runningBalance = 0; // this will carry forward
        let totalSales = 0;
        let totalPaid = 0;
        let totalEarned = 0;

        state.entries.forEach(e => {
            const sale = Number(e.sale || 0);
            const paid = Number(e.paidIn || 0);
            const earned = Number(e.commission || 0);

            totalSales += sale;
            totalPaid += paid;
            totalEarned += earned;

            // Carry-forward balance: company owes you or you owe company
            runningBalance += earned + paid - sale;
        });

        totalSalesEl.textContent = money(totalSales);
        totalPaidEl.textContent = money(totalPaid);
        totalEarnedEl.textContent = money(totalEarned);

        // Set Earned Balance as the final running balance
        totalEarnedBalanceEl.textContent = money(Math.abs(runningBalance));
        totalEarnedBalanceEl.style.color = runningBalance < 0 ? 'red' : 'green';
    }




    // Handle percent select
    percentSelect.addEventListener('change', e => {
        if (e.target.value === 'custom') {
            customPct.style.display = 'inline-block';
            customPct.focus();
        } else {
            customPct.style.display = 'none';
            state.percent = Number(e.target.value);
            recompute();
            recomputeYouOwe();
            updateRunningTotals();
            updateSummary();

            selectedPctEl.textContent = state.percent + '%';
        }
    });

    customPct.addEventListener('input', e => {
        const v = Number(customPct.value) || 0;
        state.percent = v;
        recompute();
        recomputeYouOwe();
        buildTable();
        selectedPctEl.textContent = state.percent + '%';
    });

    // Add next date
    function addNextDate() {
        let next;
        if (state.lastAddedDate) {
            next = new Date(state.lastAddedDate.getFullYear(), state.lastAddedDate.getMonth(), state.lastAddedDate.getDate() + 1);
        } else {
            const now = new Date();
            next = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        state.lastAddedDate = next;

        state.entries.push({
            dateStr: toLocalDateStr(next),
            sale: 0,
            paidIn: 0,
            commission: 0,
            youOwe: 0
        });

        recompute();
        recomputeYouOwe();
        updateRunningTotals();
        updateSummary();
        buildTable();
        updateMonthBanner(next); // update banner each time
    }

    // ✅ ADD DAY BUTTONS — ATTACH ONCE ONLY
    addDayBtns.forEach(btn => {
        btn.addEventListener('click', addNextDate);
    });

    // Clear month
    clearMonthBtn.addEventListener('click', () => {
        if (confirm('Clear all dates?')) initTableFromFirstOfMonth();
    });

    function initTableFromFirstOfMonth() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        state.entries = [];
        state.lastAddedDate = null;

        for (let i = 0; i < 7; i++) {
            const dt = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + i);
            state.entries.push({
                dateStr: toLocalDateStr(dt),
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
        updateMonthBanner(firstDay);
    }

    // Export JSON
    exportBtn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'clark-data.json';
        a.click();
    });

    // Import JSON
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
            } catch (err) { alert('Invalid JSON'); }
        }
        reader.readAsText(f);
    });

    // Calculate button
    calcBtn.addEventListener('click', () => {
        recompute();
        recomputeYouOwe();
        buildTable();
    });

    // Initialize
    function init() {
        initTableFromFirstOfMonth();
        selectedPctEl.textContent = state.percent + '%';
    }

    // calculate month
    function showMonthlySummary() {
        const totals = state.entries.reduce(
            (acc, e) => {
                acc.sales += Number(e.sale || 0);
                acc.paid += Number(e.paidIn || 0);
                acc.earned += Number(e.commission || 0);
                return acc;
            },
            { sales: 0, paid: 0, earned: 0 }
        );

        const balance = totals.paid + totals.earned - totals.sales;

        // Update UI
        document.getElementById('msSales').textContent = money(totals.sales);
        document.getElementById('msPaid').textContent = money(totals.paid);
        document.getElementById('msEarned').textContent = money(totals.earned);
        document.getElementById('msBalance').textContent = money(Math.abs(balance));

        const verdict = document.getElementById('paymentVerdict');
        verdict.className = 'verdict';

        if (balance > 0) {
            verdict.classList.add('positive');
            verdict.textContent = `Company will pay you ${money(balance)}`;
        } else if (balance < 0) {
            verdict.classList.add('negative');
            verdict.textContent = `You owe the company ${money(Math.abs(balance))}`;
        } else {
            verdict.textContent = 'All balances are settled';
        }

        // Month label
        const firstDate = new Date(state.entries[0].dateStr);
        document.getElementById('summaryMonth').textContent =
            firstDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

        // Toggle views
        document.querySelector('table').classList.add('hidden');
        document.querySelector('footer').classList.add('hidden');
        document.getElementById('monthSummary').classList.remove('hidden');
    }

    // --- Connect the calculate month button ---
    calcBtn.addEventListener('click', showMonthlySummary);

    // --- Back to table button listener ---
    document.getElementById('backToTable').addEventListener('click', () => {
        document.getElementById('monthSummary').classList.add('hidden');
        document.querySelector('table').classList.remove('hidden');
        document.querySelector('footer').classList.remove('hidden');
    });


    init();



})();