/* ==========================================
        FEE DASHBOARD JS
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    const paymentForm = document.querySelector(".payment-card form");

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

            amountError.innerText = "Amount must be greater than 0";
            return false;

        } else {

            amountError.innerText = "";
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
        paymentModeError.className = "text-danger";
        paymentMode.insertAdjacentElement("afterend", paymentModeError);

    }

    function validatePaymentMode() {

        if (!paymentMode || !paymentModeError) return true;

        if (!paymentMode.value) {

            paymentModeError.innerText = "Please select a payment mode";
            return false;

        } else {

            paymentModeError.innerText = "";
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

        }

    }

    if (paymentMode && referenceInput) {

        toggleReference();

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
        referenceError.className = "text-danger";
        referenceInput.insertAdjacentElement("afterend", referenceError);

    }

    function validateReference() {

        if (!referenceInput || !referenceError) return true;

        if (referenceInput.required && referenceInput.value.trim() === "") {

            referenceError.innerText = "Reference ID is required for " + paymentMode.value + " payments";
            return false;

        } else {

            referenceError.innerText = "";
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
        studentError.className = "text-danger";
        studentSelect.insertAdjacentElement("afterend", studentError);

    }

    function validateStudent() {

        if (!studentSelect || !studentError) return true;

        if (!studentSelect.value) {

            studentError.innerText = "Please select a student";
            return false;

        } else {

            studentError.innerText = "";
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
            FUTURE CHART PLACEHOLDER
    =========================================*/

    console.log("Fee Dashboard Loaded Successfully.");

});