document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("studentForm");
    if (!form) return;

    // ===========================
    // INPUTS
    // ===========================

    const studentIdInput = document.getElementById("student_id");

    const firstNameInput = document.getElementsByName("first_name")[0];
    const lastNameInput = document.getElementsByName("last_name")[0];
    const guardianNameInput = document.getElementsByName("guardian_name")[0];

    const emailInput = document.getElementsByName("email")[0];
    const phoneInput = document.getElementsByName("phone_no")[0];
    const guardianPhoneInput = document.getElementsByName("guardian_phone_no")[0];

    const dobInput = document.getElementsByName("dob")[0];
    const startDateInput = document.getElementsByName("start_date")[0];

    const genderInput = document.getElementsByName("gender")[0];
    const addressInput = document.getElementsByName("address")[0];

    const courseInput = document.getElementById("id_course");
    const batchInput = document.getElementById("id_batch");

    const durationInput = document.getElementById("duration");
    const feeInput = document.getElementById("fee");

    const photoInput = document.getElementById("id_photo");
    const idProofInput = document.getElementById("id_id_proof");
    const certificateInput = document.getElementById("id_certificate");

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    const photoProgressBar = document.getElementById("photoProgressBar");
    const PhotoProgressText = document.getElementById("PhotoProgressText");
    const removePhotoBtn = document.getElementById("removePhotoBtn");

    const idProofProgressBar = document.getElementById("idProofProgressBar");
    const idProofProgressText = document.getElementById("idProofProgressText");
    const removeIdProofBtn = document.getElementById("removeIdProofBtn");

    const certificateProgressBar = document.getElementById("certificateProgressBar");
    const certificateProgressText = document.getElementById("certificateProgressText");
    const removeCertificateBtn = document.getElementById("removeCertificateBtn");

    const submitBtn = form.querySelector('button[type="submit"]');

    // ===========================
    // REGEX
    // ===========================

    const nameRegex = /^[A-Za-z ]+$/;

    // ===========================
    // ERROR HELPERS
    // ===========================
    // Reuses the static error spans already present in the template
    // (firstNameError, lastNameError, emailError, ... ) so the markup
    // and CSS stay untouched.

    const staticErrorIds = {
        first_name: "firstNameError",
        last_name: "lastNameError",
        guardian_name: "guardianNameError",
        email: "emailError",
        phone_no: "phoneError",
        guardian_phone_no: "guardianPhoneError",
        dob: "dobError",
        gender: "genderError",
        address: "addressError",
        start_date: "startDateError",
        course_name: "courseError",
        batch: "batchError",
        photo: "photoError",
        id_proof: "idProofError",
        certificate: "certificateError"
    };

    function getStaticErrorSpan(input) {
        const id = staticErrorIds[input.name];
        return id ? document.getElementById(id) : null;
    }

    function showError(input, message) {

        input.classList.add("error-input");

        const staticSpan = getStaticErrorSpan(input);

        if (staticSpan) {
            staticSpan.textContent = message;
            return;
        }

        let error = input.parentElement.querySelector(".custom-error");

        if (!error) {
            error = document.createElement("span");
            error.className = "custom-error error";
            input.parentElement.appendChild(error);
        }

        error.textContent = message;
    }

    function clearError(input) {

        input.classList.remove("error-input");

        const staticSpan = getStaticErrorSpan(input);

        if (staticSpan) {
            staticSpan.textContent = "";
            return;
        }

        const error = input.parentElement.querySelector(".custom-error");

        if (error) {
            error.textContent = "";
        }
    }

    // ===========================
    // COURSE AUTO FILL
    // ===========================

    function updateCourseDetails() {
        const selected = courseInput.options[courseInput.selectedIndex];
        durationInput.value = (selected && selected.dataset.duration) || "";
        feeInput.value = (selected && selected.dataset.fee) || "";
    }

    courseInput.addEventListener("change", updateCourseDetails);
    updateCourseDetails();

    // ===========================
    // COURSE -> BATCH (AJAX)
    // ===========================
    // Batch list should only ever show batches that belong to the
    // currently selected course.

    courseInput.addEventListener("change", async () => {

        batchInput.innerHTML = '<option>Loading...</option>';

        if (!courseInput.value) {
            batchInput.innerHTML = '<option value="">Select Batch</option>';
            return;
        }

        try {
            const response = await fetch(`/api/get-batches/?course_id=${courseInput.value}`);
            const batches = await response.json();

            batchInput.innerHTML = '<option value="">Select Batch</option>';

            batches.forEach(b => {
                batchInput.innerHTML += `<option value="${b.id}">${b.batch_name}</option>`;
            });

        } catch (err) {
            console.log(err);
            batchInput.innerHTML = '<option value="">Unable to load batches</option>';
        }
    });

    // ===========================
    // NAME VALIDATION
    // ===========================

    function validateName(input, label) {

        const value = input.value.trim();

        if (value === "") {
            showError(input, `${label} is required.`);
            return false;
        }

        if (!nameRegex.test(value)) {
            showError(input, `${label} should contain only alphabets.`);
            return false;
        }

        clearError(input);
        return true;
    }

    function bindLetterOnly(input, label) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^A-Za-z ]/g, "");
            validateName(input, label);
        });
        input.addEventListener("blur", () => validateName(input, label));
    }

    bindLetterOnly(firstNameInput, "First Name");
    bindLetterOnly(lastNameInput, "Last Name");
    bindLetterOnly(guardianNameInput, "Guardian Name");

    // ===========================
    // EMAIL VALIDATION
    // ===========================

    const allowedDomainEndings = [
        ".com", ".in", ".co.in", ".org", ".org.in",
        ".net", ".edu", ".edu.in", ".ac.in"
    ];

    function validateEmailFormat() {

        const email = emailInput.value.trim().toLowerCase();

        if (email === "") {
            showError(emailInput, "Email is required.");
            return false;
        }

        if (!email.includes("@")) {
            showError(emailInput, "Email must contain '@' symbol.");
            return false;
        }

        const parts = email.split("@");

        if (parts.length !== 2) {
            showError(emailInput, "Email can contain only one '@' symbol.");
            return false;
        }

        const username = parts[0];
        const domain = parts[1];

        if (username === "") {
            showError(emailInput, "Enter characters before '@'.");
            return false;
        }

        if (domain === "") {
            showError(emailInput, "Enter a domain after '@'.");
            return false;
        }

        if (!domain.includes(".")) {
            showError(emailInput, "Domain must contain '.' .com, .in, .co.in, .org, .org.in, .net.");
            return false;
        }

        if (domain.startsWith(".")) {
            showError(emailInput, "Domain cannot start with '.'.");
            return false;
        }

        if (domain.endsWith(".")) {
            showError(emailInput, "Domain cannot end with '.'.");
            return false;
        }

        const basicEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!basicEmailPattern.test(email)) {
            showError(emailInput, "Please enter a valid email address.");
            return false;
        }

        const isAllowedDomain = allowedDomainEndings.some(end => domain.endsWith(end));

        if (!isAllowedDomain) {
            showError(
                emailInput,
                "Allowed domains: .com, .in, .co.in, .org, .org.in, .net, .edu, .edu.in, .ac.in."
            );
            return false;
        }

        clearError(emailInput);
        return true;
    }

    async function checkDuplicateEmail() {

        if (!validateEmailFormat()) return false;

        try {
            const excludeId = studentIdInput ? studentIdInput.value : "";
            const response = await fetch(
                `/admission/check-email/?email=${encodeURIComponent(emailInput.value.trim())}&exclude_id=${encodeURIComponent(excludeId)}`
            );
            const data = await response.json();

            if (data.exists) {
                showError(emailInput, "Email already exists.");
                return false;
            }

            clearError(emailInput);
            return true;

        } catch (err) {
            console.log(err);
            showError(emailInput, "Unable to verify email right now.");
            return false;
        }
    }

    emailInput.addEventListener("input", validateEmailFormat);
    emailInput.addEventListener("blur", async () => { await checkDuplicateEmail(); });

    // ===========================
    // PHONE VALIDATION
    // ===========================

    function validatePhoneFormat() {

        const phone = phoneInput.value.trim();

        if (phone === "") {
            showError(phoneInput, "Phone number is required.");
            return false;
        }

        if (!/^\d{10}$/.test(phone)) {
            showError(phoneInput, "Phone number must contain exactly 10 digits.");
            return false;
        }

        if (!/^[6-9]/.test(phone)) {
            showError(phoneInput, "Phone number should start with 6, 7, 8 or 9.");
            return false;
        }

        clearError(phoneInput);
        return true;
    }

    async function checkDuplicatePhone() {

        if (!validatePhoneFormat()) return false;

        try {
            const excludeId = studentIdInput ? studentIdInput.value : "";
            const response = await fetch(
                `/admission/check-phone/?phone=${encodeURIComponent(phoneInput.value.trim())}&exclude_id=${encodeURIComponent(excludeId)}`
            );
            const data = await response.json();

            if (data.exists) {
                showError(phoneInput, "Phone number already exists.");
                return false;
            }

            clearError(phoneInput);
            return true;

        } catch (err) {
            console.log(err);
            showError(phoneInput, "Unable to verify phone number right now.");
            return false;
        }
    }

    phoneInput.addEventListener("input", () => {
        phoneInput.value = phoneInput.value.replace(/\D/g, "").substring(0, 10);
        validatePhoneFormat();
    });
    phoneInput.addEventListener("blur", async () => { await checkDuplicatePhone(); });

    // ===========================
    // GUARDIAN PHONE VALIDATION
    // ===========================

    function validateGuardianPhoneFormat() {

        const phone = guardianPhoneInput.value.trim();

        if (phone === "") {
            showError(guardianPhoneInput, "Guardian phone number is required.");
            return false;
        }

        if (!/^\d{10}$/.test(phone)) {
            showError(guardianPhoneInput, "Guardian phone number must contain exactly 10 digits.");
            return false;
        }

        if (!/^[6-9]/.test(phone)) {
            showError(guardianPhoneInput, "Guardian phone number should start with 6, 7, 8 or 9.");
            return false;
        }

        if (phone === phoneInput.value.trim()) {
            showError(guardianPhoneInput, "Guardian phone number cannot be the same as the student's phone number.");
            return false;
        }

        clearError(guardianPhoneInput);
        return true;
    }

    async function checkDuplicateGuardianPhone() {

        if (!validateGuardianPhoneFormat()) return false;

        try {
            const excludeId = studentIdInput ? studentIdInput.value : "";
            const response = await fetch(
                `/admission/check-phone/?phone=${encodeURIComponent(guardianPhoneInput.value.trim())}&exclude_id=${encodeURIComponent(excludeId)}`
            );
            const data = await response.json();

            if (data.guardian_exists) {
                showError(guardianPhoneInput, "Guardian phone number already exists.");
                return false;
            }

            clearError(guardianPhoneInput);
            return true;

        } catch (err) {
            console.log(err);
            showError(guardianPhoneInput, "Unable to verify guardian phone right now.");
            return false;
        }
    }

    guardianPhoneInput.addEventListener("input", () => {
        guardianPhoneInput.value = guardianPhoneInput.value.replace(/\D/g, "").substring(0, 10);
        validateGuardianPhoneFormat();
    });
    guardianPhoneInput.addEventListener("blur", async () => { await checkDuplicateGuardianPhone(); });

    phoneInput.addEventListener("input", () => {
        if (guardianPhoneInput.value !== "") {
            validateGuardianPhoneFormat();
        }
    });

    // ===========================
    // DOB / START DATE
    // ===========================

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayString =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    dobInput.max = todayString;

    function enablePicker(input) {
        input.addEventListener("click", () => {
            if (input.showPicker) input.showPicker();
        });
    }
    enablePicker(dobInput);
    enablePicker(startDateInput);

    function calculateAge(dob) {
        let age = today.getFullYear() - dob.getFullYear();
        const month = today.getMonth() - dob.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) age--;
        return age;
    }

    function validateDOB() {

        if (dobInput.value === "") {
            showError(dobInput, "Date of birth is required.");
            return false;
        }

        const dob = new Date(dobInput.value);

        if (dob > today) {
            showError(dobInput, "Date of birth cannot be in the future.");
            return false;
        }

        if (calculateAge(dob) < 18) {
            showError(dobInput, "Student must be at least 18 years old.");
            return false;
        }

        clearError(dobInput);
        return true;
    }

    function validateStartDate() {

        if (startDateInput.value === "") {
            showError(startDateInput, "Start date is required.");
            return false;
        }

        clearError(startDateInput);
        return true;
    }

    dobInput.addEventListener("change", validateDOB);
    dobInput.addEventListener("blur", validateDOB);

    startDateInput.addEventListener("change", validateStartDate);
    startDateInput.addEventListener("blur", validateStartDate);

    // ===========================
    // GENDER / ADDRESS / COURSE / BATCH
    // ===========================

    function validateGender() {
        if (genderInput.value.trim() === "") {
            showError(genderInput, "Please select a gender.");
            return false;
        }
        clearError(genderInput);
        return true;
    }

    function validateAddress() {
        if (addressInput.value.trim() === "") {
            showError(addressInput, "Address is required.");
            return false;
        }
        clearError(addressInput);
        return true;
    }

    function validateCourse() {
        if (courseInput.value === "") {
            showError(courseInput, "Please select a course.");
            return false;
        }
        clearError(courseInput);
        return true;
    }

    function validateBatch() {
        if (batchInput.value === "") {
            showError(batchInput, "Please select a batch.");
            return false;
        }
        clearError(batchInput);
        return true;
    }

    genderInput.addEventListener("change", validateGender);
    genderInput.addEventListener("blur", validateGender);

    addressInput.addEventListener("input", validateAddress);
    addressInput.addEventListener("blur", validateAddress);

    courseInput.addEventListener("change", validateCourse);
    courseInput.addEventListener("blur", validateCourse);

    batchInput.addEventListener("change", validateBatch);
    batchInput.addEventListener("blur", validateBatch);

    // ===========================
    // FILE VALIDATION
    // (mirrors register.js: progress bars, remove buttons, and
    // multi-file support for id proof / certificate)
    // ===========================

    function validatePhoto() {

        clearError(photoInput);

        if (!photoInput.files.length) return true;

        const file = photoInput.files[0];
        const allowed = ["image/jpeg", "image/jpg", "image/png"];

        if (!allowed.includes(file.type)) {
            showError(photoInput, "Only JPG, JPEG and PNG are allowed.");
            photoInput.value = "";
            return false;
        }

        if (file.size > 2 * 1024 * 1024) {
            showError(photoInput, "Photo must be below 2MB.");
            photoInput.value = "";
            return false;
        }

        return true;
    }

    function handleSingleFileChange(input, progressBar, progressText, removeBtn) {

        clearError(input);

        if (input.files.length === 0) {
            progressBar.style.width = "0%";
            progressText.textContent = "No file selected";
            removeBtn.style.display = "none";
            return;
        }

        const file = input.files[0];
        const allowed = ["image/jpeg", "image/jpg", "image/png"];

        if (!allowed.includes(file.type)) {
            showError(input, "Only JPG, JPEG and PNG are allowed.");
            input.value = "";
            progressBar.style.width = "0%";
            progressText.textContent = "No file selected";
            removeBtn.style.display = "none";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showError(input, "Photo must be below 2MB.");
            input.value = "";
            progressBar.style.width = "0%";
            progressText.textContent = "No file selected";
            removeBtn.style.display = "none";
            return;
        }

        progressBar.style.width = "100%";
        progressText.textContent = file.name;
        removeBtn.style.display = "flex";
    }

    let idProofFiles = new DataTransfer();
    let certificateFiles = new DataTransfer();

    const allowedExtensions = ["pdf", "doc", "docx"];

    function isAllowedDocument(file) {
        const ext = file.name.split(".").pop().toLowerCase();
        return allowedExtensions.includes(ext);
    }

    function updateDocumentUI(store, progressBar, progressText, removeBtn) {
        const fileCount = store.files.length;

        if (fileCount > 0) {
            removeBtn.style.display = "flex";
            progressBar.style.width = "100%";
            progressText.textContent = `${fileCount} file(s) selected`;
        } else {
            removeBtn.style.display = "none";
            progressBar.style.width = "0%";
            progressText.textContent = "No file selected";
        }
    }

    function handleMultipleFileChange(input, store, progressBar, progressText, removeBtn) {

        // If user opens file explorer and clicks Cancel
        if (input.files.length === 0) {
            input.files = store.files;
            updateDocumentUI(store, progressBar, progressText, removeBtn);
            return;
        }

        let hasInvalidFile = false;

        Array.from(input.files).forEach(file => {

            if (!isAllowedDocument(file)) {
                hasInvalidFile = true;
                return;
            }

            const exists = Array.from(store.files).some(f =>
                f.name === file.name &&
                f.size === file.size &&
                f.lastModified === file.lastModified
            );

            if (!exists) {
                store.items.add(file);
            }

        });

        input.files = store.files;

        updateDocumentUI(store, progressBar, progressText, removeBtn);

        if (hasInvalidFile) {
            showError(input, "Only PDF, DOC, and DOCX files are allowed.");
            return;
        }

        clearError(input);
    }

    function validateDocument(input, store) {

        const invalidFile = Array.from(store.files).find(file => !isAllowedDocument(file));

        if (invalidFile) {
            showError(input, "Only PDF, DOC, and DOCX files are allowed.");
            return false;
        }

        clearError(input);
        return true;
    }

    photoInput.addEventListener("change", () => {
        handleSingleFileChange(photoInput, photoProgressBar, PhotoProgressText, removePhotoBtn);
    });

    idProofInput.addEventListener("change", () => {

        for (const file of idProofInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(idProofInput, "Each ID Proof file must be less than 5 MB.");
                idProofInput.value = "";
                return;
            }
        }

        clearError(idProofInput);

        handleMultipleFileChange(
            idProofInput,
            idProofFiles,
            idProofProgressBar,
            idProofProgressText,
            removeIdProofBtn
        );
    });

    certificateInput.addEventListener("change", () => {

        for (const file of certificateInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(certificateInput, "Each Certificate file must be less than 5 MB.");
                certificateInput.value = "";
                return;
            }
        }

        clearError(certificateInput);

        handleMultipleFileChange(
            certificateInput,
            certificateFiles,
            certificateProgressBar,
            certificateProgressText,
            removeCertificateBtn
        );
    });

    removePhotoBtn.addEventListener("click", () => {
        photoInput.value = "";
        photoProgressBar.style.width = "0%";
        PhotoProgressText.textContent = "No file selected";
        removePhotoBtn.style.display = "none";
        clearError(photoInput);
    });

    removeIdProofBtn.addEventListener("click", () => {
        idProofFiles = new DataTransfer();
        idProofInput.value = "";
        idProofInput.files = idProofFiles.files;
        updateDocumentUI(idProofFiles, idProofProgressBar, idProofProgressText, removeIdProofBtn);
        clearError(idProofInput);
    });

    removeCertificateBtn.addEventListener("click", () => {
        certificateFiles = new DataTransfer();
        certificateInput.value = "";
        certificateInput.files = certificateFiles.files;
        updateDocumentUI(certificateFiles, certificateProgressBar, certificateProgressText, removeCertificateBtn);
        clearError(certificateInput);
    });

    // ===========================
    // SINGLE SUBMIT HANDLER
    // ===========================

    let isSubmitting = false;

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        if (isSubmitting) return;

        // ---- Step 1: cheap synchronous checks first ----
        let valid = true;

        if (!validateName(firstNameInput, "First Name")) valid = false;
        if (!validateName(lastNameInput, "Last Name")) valid = false;
        if (!validateName(guardianNameInput, "Guardian Name")) valid = false;
        if (!validateGender()) valid = false;
        if (!validateAddress()) valid = false;
        if (!validateDOB()) valid = false;
        if (!validateStartDate()) valid = false;
        if (!validateCourse()) valid = false;
        if (!validateBatch()) valid = false;
        if (!validatePhoto()) valid = false;
        if (!validateDocument(idProofInput, idProofFiles)) valid = false;
        if (!validateDocument(certificateInput, certificateFiles)) valid = false;

        if (!validateEmailFormat()) valid = false;
        if (!validatePhoneFormat()) valid = false;
        if (!validateGuardianPhoneFormat()) valid = false;

        if (!valid) {
            const firstError = document.querySelector(".error-input");
            if (firstError) {
                firstError.scrollIntoView({ behavior: "smooth", block: "center" });
                firstError.focus();
            }
            return;
        }

        // ---- Step 2: async duplicate checks (network) ----
        isSubmitting = true;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = "Checking...";
        }

        const isEmailValid = await checkDuplicateEmail();
        const isPhoneValid = await checkDuplicatePhone();
        const isGuardianPhoneValid = await checkDuplicateGuardianPhone();

        if (!isEmailValid || !isPhoneValid || !isGuardianPhoneValid) {

            isSubmitting = false;

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText;
            }

            if (!isEmailValid) emailInput.focus();
            else if (!isPhoneValid) phoneInput.focus();
            else guardianPhoneInput.focus();

            return;
        }

        // ID Proof Size Validation
        for (const file of idProofInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(idProofInput, "Each ID Proof file must be less than 5 MB.");
                isValid = false;
                break;
            }
        }

        // Certificate Size Validation
        for (const file of certificateInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(certificateInput, "Each Certificate file must be less than 5 MB.");
                isValid = false;
                break;
            }
        }

        // ---- Step 3: all good, submit for real ----
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        form.submit();
    });

});