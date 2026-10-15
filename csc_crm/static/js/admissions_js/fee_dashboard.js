/* ==========================================
        FEE DASHBOARD JS
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    const paymentForm = document.querySelector(".payment-card form");

    /*=========================================
            ERROR HELPERS
            (same red-border + message pattern
            used on register / edit student pages)
    =========================================*/

    function showError(input, errorEl, message) {

        if (input) input.classList.add("error-input");
        if (errorEl) errorEl.innerText = message;

    }

    function clearError(input, errorEl) {

        if (input) input.classList.remove("error-input");
        if (errorEl) errorEl.innerText = "";

    }

    /*=========================================
            AMOUNT VALIDATION (real-time)
    =========================================*/

    const amountInput = document.getElementById("amount");
    const amountError = document.getElementById("amount-error");

    function validateAmount() {

        if (!amountInput || !amountError) return true;

        const raw = amountInput.value.trim();
        const value = parseFloat(raw);

        if (raw === "" || isNaN(value) || value <= 0) {

            showError(amountInput, amountError, "Amount must be greater than 0");
            return false;

        } else {

            clearError(amountInput, amountError);
            return true;

        }

    }

    if (amountInput && amountError) {

        // block "-", "+", "e" keys so negative / exponent values can't be typed
        amountInput.addEventListener("keydown", function (e) {

            if (["-", "+", "e", "E"].includes(e.key)) {
                e.preventDefault();
            }

        });

        amountInput.addEventListener("input", function () {

            // strip any negative sign that slipped in via paste
            if (this.value.includes("-")) {
                this.value = this.value.replace(/-/g, "");
            }

            validateAmount();

        });

        amountInput.addEventListener("blur", validateAmount);

    }


    /*=========================================
            PAYMENT MODE (real-time)
    =========================================*/

    const paymentMode = document.getElementById("paymentMode");
    const referenceInput = document.getElementById("reference");

    // create an error slot for payment mode if one isn't already in the HTML
    let paymentModeError = document.getElementById("paymentMode-error");

    if (paymentMode && !paymentModeError) {

        paymentModeError = document.createElement("small");
        paymentModeError.id = "paymentMode-error";
        paymentModeError.className = "error";
        paymentMode.insertAdjacentElement("afterend", paymentModeError);

    }

    function validatePaymentMode() {

        if (!paymentMode || !paymentModeError) return true;

        if (!paymentMode.value) {

            showError(paymentMode, paymentModeError, "Please select a payment mode");
            return false;

        } else {

            clearError(paymentMode, paymentModeError);
            return true;

        }

    }

    function toggleReference() {

        if (!paymentMode || !referenceInput) return;

        if (paymentMode.value === "UPI" || paymentMode.value === "CARD") {

            referenceInput.required = true;
            referenceInput.placeholder = "Enter Transaction ID";

        } else {

            referenceInput.required = false;
            referenceInput.value = "";
            referenceInput.placeholder = "Not Required for Cash";
            clearError(referenceInput, referenceError);

        }

    }

    if (paymentMode && referenceInput) {

        paymentMode.addEventListener("change", function () {

            toggleReference();
            validatePaymentMode();
            validateReference();

        });

    }


    /*=========================================
            REFERENCE VALIDATION (real-time)
    =========================================*/

    // create an error slot for reference if one isn't already in the HTML
    let referenceError = document.getElementById("reference-error");

    if (referenceInput && !referenceError) {

        referenceError = document.createElement("small");
        referenceError.id = "reference-error";
        referenceError.className = "error";
        referenceInput.insertAdjacentElement("afterend", referenceError);

    }

    // toggleReference() references referenceError, so run it only after
    // referenceError has been created above
    if (paymentMode && referenceInput) {
        toggleReference();
    }

    function validateReference() {

        if (!referenceInput || !referenceError) return true;

        if (referenceInput.required && referenceInput.value.trim() === "") {

            showError(
                referenceInput,
                referenceError,
                "Reference ID is required for " + paymentMode.value + " payments"
            );
            return false;

        } else {

            clearError(referenceInput, referenceError);
            return true;

        }

    }

    if (referenceInput) {

        referenceInput.addEventListener("input", function () {

            this.value = this.value.replace(/[^A-Za-z0-9]/g, "");
            validateReference();

        });

        referenceInput.addEventListener("blur", validateReference);

    }


    /*=========================================
            STUDENT VALIDATION (real-time)
    =========================================*/

    const studentSelect = document.querySelector('select[name="student"]');
    let studentError = document.getElementById("student-error");

    if (studentSelect && !studentError) {

        studentError = document.createElement("small");
        studentError.id = "student-error";
        studentError.className = "error";
        studentSelect.insertAdjacentElement("afterend", studentError);

    }

    function validateStudent() {

        if (!studentSelect || !studentError) return true;

        if (!studentSelect.value) {

            showError(studentSelect, studentError, "Please select a student");
            return false;

        } else {

            clearError(studentSelect, studentError);
            return true;

        }

    }

    if (studentSelect) {

        studentSelect.addEventListener("change", validateStudent);

    }


    /*=========================================
            REMARKS VALIDATION
    =========================================*/

    const remarksInput = document.getElementById("remarks");

    if (remarksInput) {

        remarksInput.addEventListener("input", function () {

            this.value = this.value.replace(/[^A-Za-z ]/g, "");

        });

    }


    /*=========================================
            FORM SUBMIT — block save if invalid
    =========================================*/

    if (paymentForm) {

        paymentForm.addEventListener("submit", function (e) {

            const validAmount = validateAmount();
            const validMode = validatePaymentMode();
            const validReference = validateReference();
            const validStudent = validateStudent();

            if (!validAmount || !validMode || !validReference || !validStudent) {

                e.preventDefault();

                // same "jump to first error" behaviour as register / edit student
                const firstError = paymentForm.querySelector(".error-input");
                if (firstError) {
                    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
                    firstError.focus();
                }

            }

        });

    }


    /*=========================================
            BUTTON RIPPLE EFFECT
    =========================================*/

    document.querySelectorAll(".save-payment-btn").forEach(button => {

        button.addEventListener("click", function () {

            this.style.transform = "scale(0.97)";

            setTimeout(() => {

                this.style.transform = "scale(1)";

            }, 150);

        });

    });


    /*=========================================
            CARD HOVER EFFECT
    =========================================*/

    document.querySelectorAll(".dashboard-card").forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.style.transform = "translateY(-8px)";

        });

        card.addEventListener("mouseleave", () => {

            card.style.transform = "translateY(0px)";

        });

    });


    /*=========================================
            TABLE ROW HOVER
    =========================================*/

    document.querySelectorAll(".payment-table tbody tr, .status-table tbody tr").forEach(row => {

        row.addEventListener("mouseenter", () => {

            row.style.transition = ".3s";

        });

    });


    /*=========================================
            STUDENT PRESELECT FEEDBACK
            (landed here via the "+" action on
            Student Fee Status — make it obvious
            the form below is now theirs)
    =========================================*/

    const paymentCard = document.querySelector(".payment-card");
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedStudentId = urlParams.get("student_id");

    if (preselectedStudentId && paymentCard && studentSelect) {

        // scroll the "Add Payment" form into view
        paymentCard.scrollIntoView({ behavior: "smooth", block: "start" });

        // pulse the card border so the landing is visible
        paymentCard.classList.add("payment-card-highlight");
        setTimeout(() => {
            paymentCard.classList.remove("payment-card-highlight");
        }, 2200);

        // show which student the form is now filling a payment for
        const selectedOption = studentSelect.options[studentSelect.selectedIndex];

        if (selectedOption && selectedOption.value) {

            const banner = document.createElement("div");
            banner.className = "student-selected-banner";
            banner.innerHTML = '<i class="fa-solid fa-circle-info"></i> Adding payment for <strong>' +
                selectedOption.textContent.trim() + "</strong>";

            const cardBody = paymentCard.querySelector(".card-body");
            if (cardBody) cardBody.insertBefore(banner, cardBody.firstChild);

        }

    }


    /*=========================================
            FUTURE CHART PLACEHOLDER
    =========================================*/

    console.log("Fee Dashboard Loaded Successfully.");

});

document.addEventListener("DOMContentLoaded", function () {
    const select = document.getElementById("batchFilterSelect");
    if (!select) return;

    async function loadBatch(batchId) {
        const url = new URL(window.location.href);

        if (batchId) {
            url.searchParams.set("batch", batchId);
        } else {
            url.searchParams.delete("batch");
        }
        url.searchParams.delete("student_id");

        const wrapper = document.getElementById("statusTableWrapper");
        wrapper.style.opacity = "0.5";

        try {
            const res = await fetch(url.toString(), {
                headers: { "X-Requested-With": "XMLHttpRequest" }
            });
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            // Table replace
            const newWrapper = doc.getElementById("statusTableWrapper");
            wrapper.innerHTML = newWrapper.innerHTML;

            // Header (Clear button) replace
            const newHeader = doc.getElementById("statusSectionHeader");
            const oldHeader = document.getElementById("statusSectionHeader");
            const newForm = newHeader.querySelector(".batch-filter-form");
            const oldForm = oldHeader.querySelector(".batch-filter-form");
            const newClear = newForm.querySelector(".clear-filter-btn");
            let oldClear = oldForm.querySelector(".clear-filter-btn");

            if (newClear && !oldClear) {
                oldForm.appendChild(newClear);
                oldClear = newClear;
            } else if (!newClear && oldClear) {
                oldClear.remove();
            }

            // URL update (refresh panna kooda filter irukkum), scroll maaradhu
            window.history.replaceState({}, "", url.toString());
        } catch (e) {
            console.error("Filter failed", e);
        } finally {
            wrapper.style.opacity = "1";
        }
    }

    select.addEventListener("change", function () {
        loadBatch(this.value);
    });

    // Clear button (dynamic-a add aagura button-kum work aaga)
    document.getElementById("statusSectionHeader").addEventListener("click", function (e) {
        const clearBtn = e.target.closest(".clear-filter-btn");
        if (!clearBtn) return;
        e.preventDefault();
        select.value = "";
        loadBatch("");
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const dataEl = document.getElementById("feeChartData");
    if (!dataEl || typeof Chart === "undefined") return;

    const data = JSON.parse(dataEl.textContent);
    const inr = n => "₹" + Number(n).toLocaleString("en-IN");

    Chart.defaults.font.family = "'Poppins', sans-serif";

    // Collection Rate
    const ringEl = document.getElementById("collectionRateChart");
    if (ringEl) {
        const c = data.collection;
        const empty = c.collected + c.outstanding === 0;

        new Chart(ringEl, {
            type: "doughnut",
            data: {
                labels: ["Collected", "Outstanding"],
                datasets: [{
                    data: empty ? [0, 1] : [c.collected, c.outstanding],
                    backgroundColor: ["#FFC800", "#D9DBEF"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "76%",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.label + ": " + inr(ctx.raw)
                        }
                    }
                }
            }
        });
    }

    // Paid vs Pending by Batch
    const batchEl = document.getElementById("batchFeeChart");
    if (batchEl) {
        new Chart(batchEl, {
            type: "bar",
            data: {
                labels: data.batches.map(b => b.label),
                datasets: [
                    {
                        label: "Paid",
                        data: data.batches.map(b => b.paid),
                        backgroundColor: "#16A34A",
                        borderRadius: 4
                    },
                    {
                        label: "Pending",
                        data: data.batches.map(b => b.pending),
                        backgroundColor: "#EF4444",
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: {
                        stacked: true,
                        ticks: { callback: v => "₹" + Number(v).toLocaleString("en-IN") }
                    }
                },
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ": " + inr(ctx.raw)
                        }
                    }
                }
            }
        });
    }
});