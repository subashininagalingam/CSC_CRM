// JS for the Student Register page: field validation (name/email/phone/DOB),
// course -> batch auto-fill, duplicate email/phone checks via AJAX, and
// file upload handling for photo/id proof/certificate before final submit.
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("studentForm");
    if (!form) return;

    // ===========================
    // INPUTS
    // ===========================

    const firstNameInput = document.getElementById("id_first_name");
    const lastNameInput = document.getElementById("id_last_name");
    const guardianNameInput = document.getElementById("id_guardian_name");

    const emailInput = document.getElementById("id_email");
    const phoneInput = document.getElementById("id_phone_no");
    const guardianPhoneInput = document.getElementById("id_guardian_phone_no");

    const dobInput = document.getElementById("id_dob");
    const admissionDateInput = document.getElementById("id_start_date");

    const genderInput = document.getElementById("id_gender");
    const addressInput = document.getElementById("id_address");

    const courseInput = document.getElementById("id_course");
    const batchInput = document.getElementById("id_batch");

    const durationInput = document.getElementById("duration");
    const feeInput = document.getElementById("fee");

    const photoInput = document.getElementById("id_photo");
    const idProofInput = document.getElementById("idProofInput");
    const certificateInput = document.getElementById("certificateInput");

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
    // PLACEHOLDER FORMAT
    // (matches the staff profile page style)
    // ===========================

    if (emailInput) emailInput.placeholder = "e.g. name@example.com";

    // "+91" is now a static box rendered in HTML (.country-code), separate
    // from the input itself - see register.html / register.css. The input
    // only ever holds the 10 digits the person types, nothing is baked
    // into its value, and its maxlength is a plain 10.
    if (phoneInput) {
        phoneInput.placeholder = "9876543210";
        phoneInput.setAttribute("maxlength", "10");
    }
    if (guardianPhoneInput) {
        guardianPhoneInput.placeholder = "9876543210";
        guardianPhoneInput.setAttribute("maxlength", "10");
    }

    // ===========================
    // REGEX
    // ===========================

    const nameRegex = /^[A-Za-z ]+$/;
    const basicEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const allowedDomainEndings = [
        ".com", ".in", ".co.in", ".org", ".org.in",
        ".net", ".edu", ".edu.in", ".ac.in"
    ];

    // ===========================
    // ERROR HELPERS
    // ===========================
    // Reuses the static error spans that already exist in the template
    // (email, phone, guardian phone, photo, id proof, certificate) and
    // falls back to a dynamically-created span for everything else.

    const staticErrorIds = {
        id_email: "email-error",
        id_phone_no: "phone-error",
        id_guardian_phone_no: "guardian-phone-error",
        id_photo: "photo-error",
        idProofInput: "idproof-error",
        certificateInput: "certificate-error"
    };

    function getStaticErrorSpan(input) {
        const id = staticErrorIds[input.id];
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

    // Keeps a phone field limited to digits only, max 10 characters.
    // No prefix to manage anymore - "+91" lives in its own static box
    // in the HTML, so the input's value IS the 10-digit number.
    function enforceDigitsOnly(input) {
        const digits = input.value.replace(/\D/g, "").substring(0, 10);
        if (input.value !== digits) {
            input.value = digits;
        }
    }

    // The input's value is already just the (up to) 10 digits typed -
    // no prefix to strip out anymore.
    function extractTenDigitPhone(value) {
        return value.replace(/\D/g, "").substring(0, 10);
    }

    // ===========================
    // COURSE AUTO FILL
    // ===========================

    function updateCourseDetails() {
        const selected = courseInput.options[courseInput.selectedIndex];
        durationInput.value = selected.dataset.duration || "";
        feeInput.value = selected.dataset.fee || "";
    }

    courseInput.addEventListener("change", updateCourseDetails);
    updateCourseDetails();

    // ===========================
    // COURSE -> BATCH (AJAX)
    // ===========================

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
    // NAME VALIDATION (sync)
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

        if (!basicEmailPattern.test(email)) {
            showError(emailInput, "Please enter a valid email address.");
            return false;
        }

        const isAllowedDomain = allowedDomainEndings.some(end =>
            domain.endsWith(end)
        );

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
            const response = await fetch(`/admission/check-email/?email=${encodeURIComponent(emailInput.value.trim())}`);
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
    // "+91" is a static box next to the input (see register.html /
    // register.css .country-code) - the input itself only ever holds
    // digits, kept to 10 by enforceDigitsOnly() on every keystroke.

    function validatePhoneFormat() {

        const phone = extractTenDigitPhone(phoneInput.value);

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
            const response = await fetch(`/admission/check-phone/?phone=${encodeURIComponent(extractTenDigitPhone(phoneInput.value))}`);
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
        enforceDigitsOnly(phoneInput);
        validatePhoneFormat();
    });
    phoneInput.addEventListener("blur", async () => { await checkDuplicatePhone(); });

    // ===========================
    // GUARDIAN PHONE VALIDATION
    // ===========================

    function validateGuardianPhoneFormat() {

        const phone = extractTenDigitPhone(guardianPhoneInput.value);

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

        if (phone === extractTenDigitPhone(phoneInput.value)) {
            showError(guardianPhoneInput, "Guardian phone number cannot be the same as the student's phone number.");
            return false;
        }

        clearError(guardianPhoneInput);
        return true;
    }

    async function checkDuplicateGuardianPhone() {

        if (!validateGuardianPhoneFormat()) return false;

        try {
            const response = await fetch(`/admission/check-phone/?phone=${encodeURIComponent(extractTenDigitPhone(guardianPhoneInput.value))}`);
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
        enforceDigitsOnly(guardianPhoneInput);
        validateGuardianPhoneFormat();
    });
    guardianPhoneInput.addEventListener("blur", async () => { await checkDuplicateGuardianPhone(); });

    // Re-check guardian phone if the student phone changes after the fact
    phoneInput.addEventListener("input", () => {
        if (guardianPhoneInput.value !== "") {
            validateGuardianPhoneFormat();
        }
    });

    // ===========================
    // DOB / ADMISSION DATE
    // ===========================

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayString =
        today.getFullYear() + "-" +
        String(today.getMonth() + 1).padStart(2, "0") + "-" +
        String(today.getDate()).padStart(2, "0");

    dobInput.max = todayString;

    // FIX: Admission date must be TODAY only - not a future date, not a
    // past date. Lock both min and max to today so the date picker itself
    // won't let anything else be chosen.
    admissionDateInput.min = todayString;
    admissionDateInput.max = todayString;
    admissionDateInput.value = todayString;

    function enablePicker(input) {
        input.addEventListener("click", () => {
            if (input.showPicker) input.showPicker();
        });
    }
    enablePicker(dobInput);
    enablePicker(admissionDateInput);

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

    function validateAdmissionDate() {

        if (admissionDateInput.value === "") {
            showError(admissionDateInput, "Admission date is required.");
            return false;
        }

        const selected = new Date(admissionDateInput.value);
        selected.setHours(0, 0, 0, 0);

        // FIX: must be exactly today - neither before nor after
        if (selected.getTime() !== today.getTime()) {
            showError(admissionDateInput, "Admission date must be today's date.");
            return false;
        }

        clearError(admissionDateInput);
        return true;
    }

    dobInput.addEventListener("change", validateDOB);
    dobInput.addEventListener("blur", validateDOB);

    admissionDateInput.addEventListener("change", validateAdmissionDate);
    admissionDateInput.addEventListener("blur", validateAdmissionDate);

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
    // SERVER-SIDE ERROR MAPPING (for AJAX submit)
    // ===========================
    // Maps the Django field name (as it appears in form.errors) to the
    // actual input element on this page, so server-side errors can be
    // shown inline without a full page reload / file reset.

    const fieldNameToInput = {
        first_name: firstNameInput,
        last_name: lastNameInput,
        email: emailInput,
        phone_no: phoneInput,
        dob: dobInput,
        gender: genderInput,
        guardian_name: guardianNameInput,
        guardian_phone_no: guardianPhoneInput,
        address: addressInput,
        photo: photoInput,
        course_name: courseInput,
        batch: batchInput,
        start_date: admissionDateInput,
        id_proof: idProofInput,
        certificate: certificateInput
    };

    function showServerErrors(errors) {
        if (!errors) return;

        Object.keys(errors).forEach(fieldName => {
            const input = fieldNameToInput[fieldName];
            if (!input) return;

            const raw = errors[fieldName];
            const message = Array.isArray(raw) ? raw[0] : raw;

            showError(input, message);
        });
    }

    // ===========================
    // SINGLE SUBMIT HANDLER
    // ===========================
    // Everything funnels through exactly one listener so nothing can
    // re-trigger the submit event and cause a cascade/race condition.

    let isSubmitting = false;

    form.addEventListener("submit", async function (e) {

        e.preventDefault();

        if (isSubmitting) return;

        // Normalize phone fields to plain digit-only strings in case the
        // person clicks Save without ever leaving (blurring) the field.
        phoneInput.value = extractTenDigitPhone(phoneInput.value);
        guardianPhoneInput.value = extractTenDigitPhone(guardianPhoneInput.value);

        // ---- Step 1: cheap synchronous checks first ----
        let valid = true;

        if (!validateName(firstNameInput, "First Name")) valid = false;
        if (!validateName(lastNameInput, "Last Name")) valid = false;
        if (!validateName(guardianNameInput, "Guardian Name")) valid = false;
        if (!validateGender()) valid = false;
        if (!validateAddress()) valid = false;
        if (!validateDOB()) valid = false;
        if (!validateAdmissionDate()) valid = false;
        if (!validateCourse()) valid = false;
        if (!validateBatch()) valid = false;
        if (!validatePhoto(photoInput, photoProgressBar, PhotoProgressText)) valid = false;
        if (!validateDocument(idProofInput, idProofFiles)) valid = false;
        if (!validateDocument(certificateInput, certificateFiles)) valid = false;

        // format-level checks for email/phone (cheap, no network)
        if (!validateEmailFormat()) valid = false;
        if (!validatePhoneFormat()) valid = false;
        if (!validateGuardianPhoneFormat()) valid = false;

        // FIX: file size checks now feed into the same `valid` flag
        // instead of an undeclared `isValid` variable that never
        // actually blocked submission.
        for (const file of idProofInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(idProofInput, "Each ID Proof file must be less than 5 MB.");
                valid = false;
                break;
            }
        }

        for (const file of certificateInput.files) {
            if (file.size > MAX_FILE_SIZE) {
                showError(certificateInput, "Each Certificate file must be less than 5 MB.");
                valid = false;
                break;
            }
        }

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

        // ---- Step 3: all good, submit via AJAX ----
        // We use fetch() instead of form.submit() so a server-side
        // validation error does NOT cause a full page reload - a full
        // reload wipes out any selected files (browser restriction),
        // which is what was happening before. On error we just show the
        // messages inline and the user's files/inputs stay exactly as
        // they were.
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const formData = new FormData(form);

            const response = await fetch(form.action, {
                method: "POST",
                body: formData,
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });

            const data = await response.json();

            if (data.success) {
                // Server accepted it - now it's safe to leave the page.
                window.location.href = data.redirect_url || form.action;
                return;
            }

            // Server-side validation failed (e.g. a duplicate that slipped
            // past the client-side check, or a server-only rule). Show the
            // errors inline - no reload, so files/inputs are untouched.
            showServerErrors(data.errors);

            isSubmitting = false;

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText;
            }

            const firstError = document.querySelector(".error-input");
            if (firstError) {
                firstError.scrollIntoView({ behavior: "smooth", block: "center" });
                firstError.focus();
            }

        } catch (err) {
            console.log(err);

            isSubmitting = false;

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText;
            }

            alert("Something went wrong while saving. Please try again.");
        }
    });

});