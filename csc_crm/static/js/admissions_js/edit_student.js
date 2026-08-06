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
        paymentModeError.className = "text-danger";
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
        referenceError.className = "text-danger";
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
        studentError.className = "text-danger";
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
            FUTURE CHART PLACEHOLDER
    =========================================*/

    console.log("Fee Dashboard Loaded Successfully.");

});
//Name Valdiation

function validateName(input,error,message){

let value=input.value.trim();

value=value.replace(/[^A-Za-z ]/g,"");

input.value=value;

if(value===""){

showError(input,error,message);

return false;

}

clearError(input,error);

return true;

}

//phone validation

function validatePhone(input,error){

let phone=input.value.replace(/\D/g,'');

input.value=phone;

if(phone.length!=10){

showError(input,error,"Phone number must contain exactly 10 digits.");

return false;

}

if(!/^[6-9]/.test(phone)){

showError(input,error,"Phone number must start with 6, 7, 8 or 9.");

return false;

}

clearError(input,error);

return true;

}
 // Email Validation

 function validateEmail(input,error){

let email=input.value.trim();

const pattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if(!pattern.test(email)){

showError(input,error,"Enter a valid email address.");

return false;

}

clearError(input,error);

return true;

}

// DOB Validation
function validateDOB(input,error){

const dob=new Date(input.value);

const today=new Date();

if(dob>=today){

showError(input,error,"Future date is not allowed.");

return false;

}

let age=today.getFullYear()-dob.getFullYear();

const month=today.getMonth()-dob.getMonth();

if(month<0 || (month===0 && today.getDate()<dob.getDate())){

age--;

}

if(age<18){

showError(input,error,"Student must be at least 18 years old.");

return false;

}

clearError(input,error);

return true;

}

// Admission Date Validation

const today=new Date().toISOString().split("T")[0];

startDate.value=today;

startDate.min=today;

startDate.max=today;


// Address Validation

if(address.value.trim().length<10){

showError(address,addressError,"Enter complete address.");

}
// Course Validation

if(course.value==""){

showError(course,courseError,"Please select a course.");

}

// Batch Valdiation

if(course.value==""){

showError(course,courseError,"Please select a course.");

}

//Gender Validation

if(gender.value==""){

showError(gender,genderError,"Please select gender.");

}

// First Name Validation
firstName.addEventListener("input",()=>{

validateName(firstName,firstNameError,"First Name is required.");

});

const courseSelect = document.getElementById("id_course");
const durationInput = document.getElementById("duration");
const feeInput = document.getElementById("fee");

function updateCourseDetails() {

    if (!courseSelect) return;

    const option = courseSelect.options[courseSelect.selectedIndex];

    durationInput.value = option.dataset.duration || "";
    feeInput.value = option.dataset.fee || "";
}

// Change Course
courseSelect.addEventListener("change", updateCourseDetails);

// Load Existing Data
updateCourseDetails();

function loadCourseDetails() {

    const selected = courseSelect.options[courseSelect.selectedIndex];

    durationInput.value = selected.dataset.duration || "";
    feeInput.value = selected.dataset.fee || "";

}

if (courseSelect) {

    courseSelect.addEventListener("change", loadCourseDetails);

    loadCourseDetails();

}