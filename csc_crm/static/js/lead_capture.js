document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const form = document.getElementById('leadForm') || document.querySelector('form');
    const phoneInput = document.getElementById('phone_no');
    const phoneError = document.getElementById('phoneError');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const submitBtn = document.getElementById('submit-btn');
    
    const leadId = document.getElementById('leadId')?.value || '';
    const leadNameInput = document.getElementById('id_lead_name');
    const initialFormData = form ? new FormData(form) : null;

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const strictPhoneRegex = /^\+91\d{10}$/;

    // Lead name validation (Only letters and spaces)
    if (leadNameInput) {
        leadNameInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }

    // Email validation function
    function validateEmail() {
        if (!emailInput) return true;

        const val = emailInput.value.trim().toLowerCase();

        if (!val) {
            emailError.innerText = "Email is required.";
            return false;
        }

        if (!emailPattern.test(val)) {
            emailError.innerText = "Please enter a valid email address.";
            return false;
        }

        emailError.innerText = "";
        return true;
    }

    // Check duplicate email via API
    async function duplicateEmail() {
        if (!emailInput || !validateEmail()) {
            return false;
        }

        const current = emailInput.value.trim();

        try {
            const response = await fetch(`/staff/check-email/?email=${encodeURIComponent(current)}`);
            const data = await response.json();

            if (data.exists) {
                emailError.innerText = "This email already exists!";
                return false;
            }

            emailError.innerText = "";
            return true;

        } catch (e) {
            console.error(e);
            return true;
        }
    }

    // Phone input live validation
    if (phoneInput && phoneError) {
        phoneInput.addEventListener('input', function () {
            let value = this.value;

            if (value.length > 0 && !value.startsWith('+91')) {
                phoneError.innerText = "Phone number must start with +91";
            } else if (value.length > 13) {
                phoneError.innerText = "Maximum 13 characters allowed!";
            } else {
                phoneError.innerText = "";
            }
        });
    }

    // Email live input listener
    if (emailInput) {
        emailInput.addEventListener("input", async function () {
            if (validateEmail()) {
                await duplicateEmail();
            }
            toggleSubmitButton();
        });
    }

    // Form submission validation
    if (form) {
        form.addEventListener('submit', async function (e) {
            let phoneVal = phoneInput ? phoneInput.value.trim() : "";

            if (phoneVal.length > 0 && !strictPhoneRegex.test(phoneVal)) {
                e.preventDefault();
                if (phoneError) {
                    phoneError.innerText = "Phone number should start with +91 and contain a valid 10-digit number.";
                }
            }

            let isEmailValid = await duplicateEmail();
            if (!isEmailValid) {
                e.preventDefault();
            }
        });
    }

    // Check form changes for edit page state
    function hasFormChanged() {
        if (!initialFormData || !form) return true;
        const currentFormData = new FormData(form);

        for (let [key, value] of initialFormData.entries()) {
            if (currentFormData.get(key) !== value) {
                return true;
            }
        }
        return false;
    }

    // Enable/Disable Submit Button
    window.toggleSubmitButton = function () {
        if (!submitBtn) return;

        const hasDuplicate = 
            (emailError && emailError.innerText !== "") ||
            (phoneError && phoneError.innerText !== "");

        const changed = hasFormChanged();

        if (hasDuplicate || !changed) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.6";
            submitBtn.style.cursor = "not-allowed";
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            submitBtn.style.cursor = "pointer";
        }
    };

    // Check lead exists (email / phone backend validation)
    window.checkLeadExists = async function (field, value) {
        if (!value.trim()) return;

        try {
            const response = await fetch(`/leads/check-lead/?${field}=${encodeURIComponent(value)}&lead_id=${leadId}`);
            const data = await response.json();

            if (field === 'email' && emailError) {
                if (data.email_exists) {
                    emailError.innerText = "This email already exists";
                    emailInput.style.border = "1px solid red";
                } else {
                    emailError.innerText = "";
                    emailInput.style.border = "";
                }
            }

            if (field === 'phone' && phoneError) {
                if (data.phone_exists) {
                    phoneError.innerText = "This number already exists";
                    phoneInput.style.border = "1px solid red";
                } else {
                    phoneError.innerText = "";
                    phoneInput.style.border = "";
                }
            }

            toggleSubmitButton();
        } catch (error) {
            console.log(error);
        }
    };

    // Blur events for server-side duplicate checks
    if (emailInput) {
        emailInput.addEventListener('blur', function () {
            checkLeadExists('email', this.value);
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('blur', function () {
            checkLeadExists('phone', this.value);
        });
    }

    if (form) {
        form.addEventListener('input', toggleSubmitButton);
    }

    // Initial button state check
    toggleSubmitButton();
});

// Clear button function
function clearForm() {
    const form = document.getElementById('leadForm');
    if (form) form.reset();

    const phoneError = document.getElementById('phoneError');
    const emailError = document.getElementById('emailError');
    const phoneInput = document.getElementById('phone_no');
    const emailInput = document.getElementById('email');

    if (phoneError) phoneError.innerText = "";
    if (emailError) emailError.innerText = "";

    if (phoneInput) phoneInput.style.border = "";
    if (emailInput) emailInput.style.border = "";

    if (typeof toggleSubmitButton === 'function') {
        toggleSubmitButton();
    }
}

// Calendar pickers
const enquiryDate = document.getElementById("enquiryDate");
if (enquiryDate) {
    enquiryDate.addEventListener("click", function () {
        this.showPicker();
    });
}

const nextFollowUpDate = document.getElementById('nextFollowUpDate');
if (nextFollowUpDate) {
    nextFollowUpDate.addEventListener("click", function () {
        this.showPicker();
    });
}