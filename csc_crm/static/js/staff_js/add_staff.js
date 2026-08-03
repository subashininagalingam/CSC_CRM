 // ====================== BLOCK EMPLOYEE ID EDITING ======================

document.addEventListener('DOMContentLoaded', () => {
    const employeeIdInput = document.querySelector('[name="employee_id"]');

    if (!employeeIdInput) return;

    const originalEmployeeId = employeeIdInput.value;

    // Make it readonly
    employeeIdInput.readOnly = true;

    // Stop typing
    employeeIdInput.addEventListener('keydown', (e) => {
        e.preventDefault();
    });

    // Stop paste
    employeeIdInput.addEventListener('paste', (e) => {
        e.preventDefault();
    });

    // Stop drag/drop text
    employeeIdInput.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    // If any extension like FakeFiller changes it, restore old value
    employeeIdInput.addEventListener('input', () => {
        employeeIdInput.value = originalEmployeeId;
    });

    employeeIdInput.addEventListener('change', () => {
        employeeIdInput.value = originalEmployeeId;
    });
});
    
// ===================== EMAIL + PHONE VALIDATION =============================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('staffMgmtForm');

    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');

    const phoneInput = document.getElementById('phoneInput');
    const phoneError = document.getElementById('phoneError');

    if (!form || !emailInput || !emailError || !phoneInput || !phoneError) {
        console.log('Email / Phone validation elements missing:', {
            form,
            emailInput,
            emailError,
            phoneInput,
            phoneError
        });
        return;
    }

    let allowFinalSubmit = false;

    const allowedDomainEndings = [
        '.com',
        '.in',
        '.co.in',
        '.org',
        '.org.in',
        '.net',
        '.edu',
        '.edu.in',
        '.ac.in'
    ];

    function showError(input, errorElement, message) {
        errorElement.textContent = message;
        input.classList.add('error-input');
    }

    function clearError(input, errorElement) {
        errorElement.textContent = '';
        input.classList.remove('error-input');
    }

    function validateEmailFormat() {
        const email = emailInput.value.trim().toLowerCase();

        if (email === '') {
            showError(emailInput, emailError, 'Email is required.');
            return false;
        }

        const basicEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!basicEmailPattern.test(email)) {
            showError(emailInput, emailError, 'Please enter a valid email address.');
            return false;
        }

        const domain = email.substring(email.lastIndexOf('@') + 1);

        const isAllowedDomain = allowedDomainEndings.some(ending => {
            return domain.endsWith(ending);
        });

        if (!isAllowedDomain) {
            showError(
                emailInput,
                emailError,
                'Please enter an email with a valid domain like .com, .in, .co.in, .org, .net, .edu, or .ac.in.'
            );
            return false;
        }

        clearError(emailInput, emailError);
        return true;
    }

    async function checkDuplicateEmail() {
        if (!validateEmailFormat()) {
            return false;
        }

        const email = emailInput.value.trim();

        try {
            const response = await fetch(`/staff/check-email/?email=${encodeURIComponent(email)}`);
            const data = await response.json();

            if (data.exists) {
                showError(emailInput, emailError, 'This email already exists!');
                return false;
            }

            clearError(emailInput, emailError);
            return true;

        } catch (error) {
            console.log('Email check error:', error);
            showError(emailInput, emailError, 'Unable to check email right now. Please try again.');
            return false;
        }
    }

    function validatePhoneFormat() {
        const phone = phoneInput.value.trim();

        if (phone === '') {
            showError(phoneInput, phoneError, 'Phone number is required.');
            return false;
        }

        const indianPhonePattern = /^\+91[\s-]?[6-9]\d{9}$/;

        if (!indianPhonePattern.test(phone)) {
            showError(
                phoneInput,
                phoneError,
                'Phone number should start with +91 and contain a valid 10-digit Indian mobile number.'
            );
            return false;
        }

        clearError(phoneInput, phoneError);
        return true;
    }

    async function checkDuplicatePhone() {
        if (!validatePhoneFormat()) {
            return false;
        }

        const phone = phoneInput.value.trim();

        try {
            const response = await fetch(`/staff/check-phone/?phone=${encodeURIComponent(phone)}`);
            const data = await response.json();

            if (data.exists) {
                showError(phoneInput, phoneError, 'This phone number already exists!');
                return false;
            }

            clearError(phoneInput, phoneError);
            return true;

        } catch (error) {
            console.log('Phone check error:', error);
            showError(phoneInput, phoneError, 'Unable to check phone number right now.');
            return false;
        }
    }

    emailInput.addEventListener('input', () => {
        validateEmailFormat();
    });

    emailInput.addEventListener('blur', async () => {
        await checkDuplicateEmail();
    });

    phoneInput.addEventListener('input', () => {
        phoneInput.value = phoneInput.value.replace(/[^0-9+\s-]/g, '');
        validatePhoneFormat();
    });

    phoneInput.addEventListener('blur', async () => {
        await checkDuplicatePhone();
    });

let isChecking = false;

form.addEventListener('submit', async function (e) {
    if (e.defaultPrevented) {
        return;
    }

    if (allowFinalSubmit) {
        return;
    }

    e.preventDefault();

    if (isChecking) {
        return;
    }

    if (!form.reportValidity()) {
        return;
    }

    isChecking = true;

    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerText;
        submitBtn.innerText = 'Checking...';
    }

    const isEmailValid = await checkDuplicateEmail();
    const isPhoneValid = await checkDuplicatePhone();

    if (!isEmailValid) {
        emailInput.focus();

        isChecking = false;

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = submitBtn.dataset.originalText || 'Add Staff';
        }

        return;
    }

    if (!isPhoneValid) {
        phoneInput.focus();

        isChecking = false;

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = submitBtn.dataset.originalText || 'Add Staff';
        }

        return;
    }

    allowFinalSubmit = true;
    form.requestSubmit();
});
});
    // ======================== FIRST NAME AND LAST NAME CONTAINS ONLY STRINGS =======================

    document.addEventListener('DOMContentLoaded', () => {
        const firstNameInput = document.getElementById('firstNameInput');
        const firstNameInputError = document.getElementById('firstNameError')

        function firstNameValidate(){
            if(firstNameInput.value.trim() === ''){
                firstNameInputError.textContent = 'First name is required.';
                firstNameInput.classList.add('error-input');
                return false
            }
            else{
                firstNameInputError.textContent = '';
                firstNameInput.classList.remove('error-input');
                return false
            }
        }

        firstNameInput.addEventListener('input', async () => {
            firstNameInput.value = firstNameInput.value.replace(/[^a-zA-Z\s]/g, '');
            await firstNameValidate()
        })

        firstNameInput.addEventListener('blur', async ()=>{
            await firstNameValidate()
        })
    })

    document.addEventListener('DOMContentLoaded', () => {
        const lastNameInput = document.getElementById('lastNameInput');
        const lastNameInputError = document.getElementById('lastNameError');

        function lastNameValidation(){
            if(lastNameInput.value.trim() === ''){
                lastNameInputError.textContent = 'Last name is required';
                lastNameInput.classList.add('error-input');
                return false;
            }
            else{
                lastNameInputError.textContent = '';
                lastNameInput.classList.remove('error-input');
                return false;
            }
        }

        lastNameInput.addEventListener('input', async () => {
            lastNameInput.value = lastNameInput.value.replace(/[^a-zA-Z\s]/g, '');
            await lastNameValidation()
        })
        
        lastNameInput.addEventListener('blur', async ()=>{
            await lastNameValidation()
        })
    })

    // =========================== DOB & DOJ DATE PICKER UX ============================

    document.addEventListener('DOMContentLoaded', () => {
        const dateOfBirthInput = document.getElementById('dateOfBirthInput');
        const dateOfBirthError = document.getElementById('dateOfBirthError');
        const dateOfJoiningInput = document.getElementById('dateOfJoiningInput');
        const dateOfJoiningError = document.getElementById('dateOfJoiningError');

        function dobValidation (){
            if(dateOfBirthInput.value.trim() === ''){
                // dateOfBirthError.textContent = 'DOB is required.'
                // dateOfBirthInput.classList.add('error-input')
                return false
            }
            else{
                dateOfBirthError.textContent = '';
                dateOfBirthInput.classList.remove('error-input')
                return false;
            }
        }

        function dojValidation(){
            if(dateOfJoiningInput.value.trim() === ''){
                dateOfJoiningError.textContent = 'Date of joining is required.'
                dateOfJoiningInput.classList.add('error-input');
                return false
            }
            else{
                dateOfJoiningError.textContent = ''
                dateOfJoiningInput.classList.remove('error-input');
                return false
            }
        }

        function enableFullDatePicker(input){
            input.addEventListener('click', () => {
                if(input.showPicker){
                    input.showPicker()
                }
            });
        }
        enableFullDatePicker(dateOfBirthInput);
        enableFullDatePicker(dateOfJoiningInput);

        dateOfBirthInput.addEventListener('blur', async ()=>{
            await dobValidation()
        })
        dateOfJoiningInput.addEventListener('blur', async ()=>{
            await dojValidation()
        })
    })


    // ======================== DOB + DOJ AGE VALIDATION ============================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('staffMgmtForm');

    const dateOfBirthInput = document.getElementById('dateOfBirthInput');
    const dateOfJoiningInput = document.getElementById('dateOfJoiningInput');

    const dateOfBirthError = document.getElementById('dateOfBirthError');
    const dateOfJoiningError = document.getElementById('dateOfJoiningError');

    if (!form || !dateOfBirthInput || !dateOfJoiningInput) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayString =
        today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

    dateOfBirthInput.setAttribute('max', todayString);
    dateOfJoiningInput.removeAttribute('max');

    function parseDate(value) {
        if (!value) return null;

        const parts = value.split('-');

        if (parts.length !== 3) return null;

        let day, month, year;

        // Handles yyyy-mm-dd
        if (parts[0].length === 4) {
            year = Number(parts[0]);
            month = Number(parts[1]);
            day = Number(parts[2]);
        }
        // Handles dd-mm-yyyy
        else {
            day = Number(parts[0]);
            month = Number(parts[1]);
            year = Number(parts[2]);
        }

        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        date.setHours(0, 0, 0, 0);
        return date;
    }

    function calculateAge(dob, doj) {
        let age = doj.getFullYear() - dob.getFullYear();

        const monthDiff = doj.getMonth() - dob.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && doj.getDate() < dob.getDate())
        ) {
            age--;
        }

        return age;
    }

    function validateDobAndDoj() {
        let isValid = true;

        dateOfBirthError.textContent = '';
        dateOfJoiningError.textContent = '';

        dateOfBirthInput.classList.remove('error-input');
        dateOfJoiningInput.classList.remove('error-input');

        const dob = parseDate(dateOfBirthInput.value);
        const doj = parseDate(dateOfJoiningInput.value);

        // DOB is optional, so validate only if user entered DOB
        if (dateOfBirthInput.value && !dob) {
            dateOfBirthError.textContent = 'Invalid date of birth';
            dateOfBirthInput.classList.add('error-input');
            isValid = false;
        }

        if (dob && dob > today) {
            dateOfBirthError.textContent = 'Date of birth cannot be in the future';
            dateOfBirthInput.classList.add('error-input');
            isValid = false;
        }

        if (!dateOfJoiningInput.value) {
            dateOfJoiningError.textContent = 'Date of joining is required';
            dateOfJoiningInput.classList.add('error-input');
            isValid = false;
        }

        if (dateOfJoiningInput.value && !doj) {
            dateOfJoiningError.textContent = 'Invalid date of joining';
            dateOfJoiningInput.classList.add('error-input');
            isValid = false;
        }

        // if (doj && doj > today) {
        //     dateOfJoiningError.textContent = 'Date of joining cannot be in the future';
        //     dateOfJoiningInput.classList.add('error-input');
        //     isValid = false;
        // }

        if (dob && doj) {
            const ageAtJoining = calculateAge(dob, doj);

            if (doj < dob) {
                dateOfJoiningError.textContent =
                    'Date of joining cannot be before date of birth';

                dateOfBirthInput.classList.add('error-input');
                dateOfJoiningInput.classList.add('error-input');

                isValid = false;
            }
            else if (ageAtJoining < 18) {
                dateOfJoiningError.textContent =
                    'Employee must be at least 18 years old on date of joining';

                dateOfBirthInput.classList.add('error-input');
                dateOfJoiningInput.classList.add('error-input');

                isValid = false;
            }
        }

        return isValid;
    }

    dateOfBirthInput.addEventListener('change', validateDobAndDoj);
    dateOfJoiningInput.addEventListener('change', validateDobAndDoj);

    form.addEventListener('submit', (e) => {
    if (!validateDobAndDoj()) {
            e.preventDefault();
            e.stopImmediatePropagation();

            dateOfJoiningInput.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            dateOfJoiningInput.focus();

            return false;
        }
    }, true);
});

// ============================== DEPARTMENT & ROLE AUTOMATICALLY SELECTED ==============================

document.addEventListener('DOMContentLoaded', () => {
    const roleInput = document.getElementById('roleInput');
    const roleError = document.getElementById('roleError');
    const departmentInput = document.getElementById('departmentInput');

    function roleValidation (){

        if(roleInput.value.trim() === ''){
            roleInput.classList.add('error-input');
            roleError.textContent = 'Role is required';
            return false
        }
        else{
            roleInput.classList.remove('error-input');
            roleError.textContent = '';
            return false
        }
    }

    const roleDepartmentMap = {
        'Developer': 'Technical',
        'Trainer': 'Technical',

        'Admin': 'Management',
        'Manager': 'Management',
        'HR': 'Management',

        'Sales Exec': 'Sales Department',
        'Sales Exec Lead': 'Sales Department',

        'Digital Marketing': 'Marketing',
        'Content Creator': 'Marketing',
        'Marketing Lead': 'Marketing',
    };

    function autoSelectDepartment() {
        const selectedRoleText =
            roleInput.options[roleInput.selectedIndex].text.trim();

        const departmentName = roleDepartmentMap[selectedRoleText];

        if (!departmentName) {
            departmentInput.value = '';
            return;
        }

        for (let option of departmentInput.options) {
            if (option.text.trim() === departmentName) {
                departmentInput.value = option.value;
                break;
            }
        }
    }

    // Auto select department when role changes
    roleInput.addEventListener('change', autoSelectDepartment);

    // Block user from manually changing department
    departmentInput.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    departmentInput.addEventListener('keydown', (e) => {
        e.preventDefault();
    });

    departmentInput.addEventListener('focus', () => {
        departmentInput.blur();
    });

    roleInput.addEventListener('blur', async ()=>{
        await roleValidation()
    })

    roleInput.addEventListener('input', async ()=>{
        await roleValidation()
    })

    // Optional: auto-select once on page load
    autoSelectDepartment();
});

// ============================= DISABLE TERMINATED STATUS IN ADD STAFF =============================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('staffMgmtForm');
    const statusInput = document.getElementById('statusInput');
    const statusError = document.getElementById('statusError');

    if (!form || !statusInput || !statusError) return;

    // Disable "Terminated" option
    Array.from(statusInput.options).forEach(option => {
        const optionValue = option.value.trim().toLowerCase();
        const optionText = option.textContent.trim().toLowerCase();

        if (optionValue === 'terminated' || optionText === 'terminated') {
            option.disabled = true;
            option.textContent = 'Terminated - Not allowed while adding staff';
        }
    });

    function showStatusError(message) {
        statusError.textContent = message;
        statusInput.classList.add('error-input');
    }

    function clearStatusError() {
        statusError.textContent = '';
        statusInput.classList.remove('error-input');
    }

    function validateStatus() {
        const status = statusInput.value.trim().toLowerCase();

        if (status === '') {
            showStatusError('Status is required.');
            return false;
        }

        if (status === 'terminated') {
            showStatusError('You cannot create a new staff record with Terminated status.');
            return false;
        }

        clearStatusError();
        return true;
    }

    statusInput.addEventListener('change', validateStatus);
    statusInput.addEventListener('blur', validateStatus);

    form.addEventListener('submit', function (e) {
        const isStatusValid = validateStatus();

        if (!isStatusValid) {
            e.preventDefault();
            statusInput.focus();
            return;
        }
    });
});

// ====================== FILE UPLOAD HANDLING ======================

document.addEventListener('DOMContentLoaded', () => {

    function setupFileUpload(inputId, removeBtnId, progressBarId, progressTextId, successMessage) {
        const fileInput = document.getElementById(inputId);
        const removeBtn = document.getElementById(removeBtnId);
        const progressBar = document.getElementById(progressBarId);
        const progressText = document.getElementById(progressTextId);

        let previousFiles = [];
        let interval = null;

        function resetUploadUI() {
            progressBar.style.width = '0%';
            progressText.textContent = 'No file selected';
            removeBtn.style.display = 'none';
        }

        function showUploadedUI() {
            progressBar.style.width = '100%';
            progressText.textContent = successMessage;
            removeBtn.style.display = 'flex';
        }

        function startProgress() {
            let progress = 0;

            if (interval) {
                clearInterval(interval);
            }

            progressBar.style.width = '0%';
            progressText.textContent = '0% Uploaded';

            interval = setInterval(() => {
                progress += 10;

                progressBar.style.width = progress + '%';
                progressText.textContent = progress + '% Uploaded';

                if (progress >= 100) {
                    clearInterval(interval);
                    progressText.textContent = successMessage;
                }
            }, 50);
        }

        fileInput.addEventListener('click', () => {
            previousFiles = Array.from(fileInput.files);
        });

        fileInput.addEventListener('change', () => {

            // If user opened file explorer and clicked Cancel
            if (fileInput.files.length === 0) {

                // Restore old selected file if possible
                if (previousFiles.length > 0) {
                    const dataTransfer = new DataTransfer();

                    previousFiles.forEach(file => {
                        dataTransfer.items.add(file);
                    });

                    fileInput.files = dataTransfer.files;
                    showUploadedUI();
                    return;
                }

                resetUploadUI();
                return;
            }

            previousFiles = Array.from(fileInput.files);
            removeBtn.style.display = 'flex';
            startProgress();
        });

        removeBtn.addEventListener('click', () => {
            fileInput.value = '';
            previousFiles = [];

            if (interval) {
                clearInterval(interval);
            }

            resetUploadUI();
        });
    }

    setupFileUpload(
        'profilePhotoInput',
        'removePhotoBtn',
        'photoProgressBar',
        'progressText',
        '✓ Image Uploaded'
    );

});

// ============================= DOCUMENT VALIDATION =============================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');

    const documentInput = document.getElementById('documentInput');
    const removeDocBtn = document.getElementById('removeDocumentBtn');
    const progressBar = document.getElementById('documentProgressBar');
    const progressText = document.getElementById('documentprogressText');
    const documentError = document.getElementById('documentError');

    if (
        !form ||
        !documentInput ||
        !removeDocBtn ||
        !progressBar ||
        !progressText ||
        !documentError
    ) return;

    let selectedFiles = new DataTransfer();

    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

    function showDocumentError(message) {
        documentError.textContent = message;
        documentInput.classList.add('error-input');
    }

    function clearDocumentError() {
        documentError.textContent = '';
        documentInput.classList.remove('error-input');
    }

    function isAllowedDocument(file) {
        const fileName = file.name.toLowerCase();
        const extension = fileName.split('.').pop();

        return allowedExtensions.includes(extension);
    }

    function validateDocument() {
        if (selectedFiles.files.length === 0) {
            showDocumentError('Please upload at least one document.');
            return false;
        }

        const invalidFile = Array.from(selectedFiles.files).find(file => {
            return !isAllowedDocument(file);
        });

        if (invalidFile) {
            showDocumentError('Only PDF and image files are allowed.');
            return false;
        }

        clearDocumentError();
        return true;
    }

    function updateDocumentUI() {
        const fileCount = selectedFiles.files.length;

        if (fileCount > 0) {
            removeDocBtn.style.display = 'flex';
            progressBar.style.width = '100%';
            progressText.textContent = `${fileCount} document(s) selected`;
        } else {
            removeDocBtn.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = 'No file selected';
        }
    }

    documentInput.addEventListener('change', () => {

        // If user opens file explorer and clicks Cancel
        if (documentInput.files.length === 0) {
            documentInput.files = selectedFiles.files;
            updateDocumentUI();
            return;
        }

        let hasInvalidFile = false;

        Array.from(documentInput.files).forEach(file => {

            if (!isAllowedDocument(file)) {
                hasInvalidFile = true;
                return;
            }

            const alreadyExists = Array.from(selectedFiles.files).some(
                existingFile =>
                    existingFile.name === file.name &&
                    existingFile.size === file.size &&
                    existingFile.lastModified === file.lastModified
            );

            if (!alreadyExists) {
                selectedFiles.items.add(file);
            }

        });

        documentInput.files = selectedFiles.files;

        updateDocumentUI();

        if (hasInvalidFile) {
            showDocumentError('Only PDF and image files are allowed.');
            return;
        }

        validateDocument();
    });

    removeDocBtn.addEventListener('click', () => {
        selectedFiles = new DataTransfer();

        documentInput.value = '';
        documentInput.files = selectedFiles.files;

        progressBar.style.width = '0%';
        progressText.textContent = 'No file selected';
        removeDocBtn.style.display = 'none';

        showDocumentError('Please upload at least one document.');
    });

    form.addEventListener('submit', (e) => {
    if (!validateDocument()) {
        e.preventDefault();
        e.stopImmediatePropagation();

        documentInput.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        documentInput.focus();
        return false;
    }
}, true);

});

// ====================== SHOW / HIDE MONTHLY TARGET BASED ON ROLE ======================

document.addEventListener('DOMContentLoaded', () => {

    const MAX_MONTHLY_TARGET = 1000000;
    const MAX_WHOLE_DIGITS = 8;

    const form = document.getElementById('staffMgmtForm');
    const roleInput = document.getElementById('roleInput');

    const monthlyTargetGroup = document.getElementById('monthlyTargetGroup');
    const monthlyTargetInput = document.getElementById('monthlyTargetInput');
    const monthlyTargetError = document.getElementById('monthlyTargetError');

    if (!form || !roleInput || !monthlyTargetGroup || !monthlyTargetInput || !monthlyTargetError) {
        console.log('Monthly target validation elements not found');
        return;
    }

    const rolesNeedMonthlyTarget = [
        'manager',
        'sales exec',
        'sales exec lead'
    ];

    function sanitizeMonthlyTargetInput() {
    let value = monthlyTargetInput.value;

    // Allow only digits and one dot
    value = value.replace(/[^0-9.]/g, '');

    // Prevent multiple dots
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Allow only 2 decimal places
    if (value.includes('.')) {
        const [whole, decimal] = value.split('.');
        value = whole + '.' + decimal.substring(0, 2);
    }

    monthlyTargetInput.value = value;
}

    function normalizeRole(role) {
        return role
            .trim()
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ');
    }

    function getSelectedRoleText() {
        const selectedOption = roleInput.options[roleInput.selectedIndex];
        return selectedOption ? normalizeRole(selectedOption.textContent) : '';
    }

    function showMonthlyTargetError(message) {
        monthlyTargetError.textContent = message;
        monthlyTargetInput.classList.add('error-input');
    }

    function clearMonthlyTargetError() {
        monthlyTargetError.textContent = '';
        monthlyTargetInput.classList.remove('error-input');
    }

    function isMonthlyTargetRequired() {
        const selectedRole = getSelectedRoleText();
        return rolesNeedMonthlyTarget.includes(selectedRole);
    }

    function toggleMonthlyTarget() {
        if (isMonthlyTargetRequired()) {
            monthlyTargetGroup.style.display = '';

            monthlyTargetInput.disabled = false;
            monthlyTargetInput.required = true;
            monthlyTargetInput.setAttribute('required', 'required');
        } else {
            monthlyTargetGroup.style.display = 'none';

            monthlyTargetInput.value = '';
            monthlyTargetInput.disabled = true;
            monthlyTargetInput.required = false;
            monthlyTargetInput.removeAttribute('required');

            clearMonthlyTargetError();
        }
    }

function validateMonthlyTarget() {
    if (!isMonthlyTargetRequired()) {
        clearMonthlyTargetError();
        return true;
    }

    const value = monthlyTargetInput.value.trim();

    if (value === '') {
        showMonthlyTargetError('Monthly target is required.');
        return false;
    }

    const validAmountPattern = /^\d+(\.\d{1,2})?$/;

    if (!validAmountPattern.test(value)) {
        showMonthlyTargetError('Monthly target must contain only numbers.');
        return false;
    }

    const target = Number(value);

    if (target <= 0) {
        showMonthlyTargetError('Monthly target must be greater than 0.');
        return false;
    }

    if (target > MAX_MONTHLY_TARGET) {
        showMonthlyTargetError('Monthly target must not exceed ₹10,00,000.');
        return false;
    }

    clearMonthlyTargetError();
    return true;
}
    roleInput.addEventListener('change', () => {
        toggleMonthlyTarget();
        validateMonthlyTarget();
    });

    monthlyTargetInput.addEventListener('input', ()=>{
        sanitizeMonthlyTargetInput();
        validateMonthlyTarget();
    });
    monthlyTargetInput.addEventListener('blur', validateMonthlyTarget);

    monthlyTargetInput.addEventListener('keydown', (e) => {
        const blockedKeys = ['e', 'E', '+', '-'];

        if (blockedKeys.includes(e.key)) {
            e.preventDefault();
        }
    });

    form.addEventListener('submit', function (e) {
        toggleMonthlyTarget();

        const isMonthlyTargetValid = validateMonthlyTarget();

        if (!isMonthlyTargetValid) {
            e.preventDefault();
            e.stopImmediatePropagation();

            monthlyTargetInput.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            monthlyTargetInput.focus();
            return false;
        }
    }, true);

    toggleMonthlyTarget();
});