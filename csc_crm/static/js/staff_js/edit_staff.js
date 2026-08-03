
// ================================= GLOBAL VALIDATION FOR FORM =================================

function isFormValid() {
    const phone = document.getElementById('phoneInput').value.trim();

    const dobError = document.getElementById('dateOfBirthError').textContent.trim();
    const dojError = document.getElementById('dateOfJoiningError').textContent.trim();
    const phoneError = document.getElementById('phoneError').textContent.trim();
    const emailError = document.getElementById('emailError').textContent.trim();

    const indianPhonePattern = /^\+91[\s-]?[6-9]\d{9}$/;

    if (!indianPhonePattern.test(phone)) {
        return false;
    }

    if (dobError !== '') {
        return false;
    }

    if (dojError !== '') {
        return false;
    }

    if (phoneError !== '') {
        return false;
    }

    if (emailError !== '') {
        return false;
    }

    return true;
}

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

// ============================ EDIT FORM UPDATE BTN DISABLED ============================

let checkChanges;

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');
    const updateBtn = document.getElementById('updateStaffBtn');

    const originalValues = {};

    form.querySelectorAll('input, select, textarea').forEach(field => {

        originalValues[field.name] = field.value;

    });

    checkChanges = function () {

        let changed = false;

        form.querySelectorAll('input, select, textarea').forEach(field => {

            if (field.value !== originalValues[field.name]) {
                changed = true;
            }

        });

        updateBtn.disabled = !(changed && isFormValid());

    };

    form.querySelectorAll('input, select, textarea').forEach(field => {

        field.addEventListener('input', checkChanges);
        field.addEventListener('change', checkChanges);

    });

});

// =================================== EDIT EMAIL VALIDATION ===================================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');
    const emailInput = document.getElementById('emailInput');
    const emailError = document.getElementById('emailError');
    const staffId = document.getElementById('staffId').value;

    if (!form || !emailInput || !emailError || !staffId) return;

    let emailValid = true;
    let isEmailSubmitRunning = false;

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

    function showEmailError(message) {
        emailError.textContent = message;
        emailInput.classList.add('error-input');
        emailValid = false;
    }

    function clearEmailError() {
        emailError.textContent = '';
        emailInput.classList.remove('error-input');
        emailValid = true;
    }

    function validateEmailFormat() {
        const email = emailInput.value.trim().toLowerCase();

        if (email === '') {
            showEmailError('Email is required.');
            return false;
        }

        const basicEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!basicEmailPattern.test(email)) {
            showEmailError('Please enter a valid email address.');
            return false;
        }

        const domain = email.substring(email.lastIndexOf('@') + 1);

        const isAllowedDomain = allowedDomainEndings.some(ending => {
            return domain.endsWith(ending);
        });

        if (!isAllowedDomain) {
            showEmailError(
                'Please enter an email with a valid domain like .com, .in, .co.in, .org, .net, .edu, or .ac.in.'
            );
            return false;
        }

        clearEmailError();
        return true;
    }

    async function checkDuplicateEmail() {
        const email = emailInput.value.trim();

        try {
            const response = await fetch(
                `/staff/check-email/?email=${encodeURIComponent(email)}&staff_id=${staffId}`
            );

            const data = await response.json();

            if (data.exists) {
                showEmailError('This email already exists!');
                return false;
            }

            clearEmailError();
            return true;

        } catch (error) {
            console.log('Email check error:', error);
            showEmailError('Unable to check email right now. Please try again.');
            return false;
        }
    }

    async function validateEmailFully() {
        const isFormatValid = validateEmailFormat();

        if (!isFormatValid) {
            if (typeof checkChanges === 'function') {
                checkChanges();
            }
            return false;
        }

        const isDuplicateValid = await checkDuplicateEmail();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }

        return isDuplicateValid;
    }

    emailInput.addEventListener('input', () => {
        validateEmailFormat();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    });

    emailInput.addEventListener('blur', async () => {
        await validateEmailFully();
    });

    form.addEventListener('submit', async function (e) {

        if (isEmailSubmitRunning) {
            return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        const isEmailValid = await validateEmailFully();

        if (!isEmailValid) {
            emailInput.focus();
            return;
        }

        isEmailSubmitRunning = true;
        form.requestSubmit();

        setTimeout(() => {
            isEmailSubmitRunning = false;
        }, 0);

    }, true);

});
// =================================== PHONE VALIDATION ===================================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');
    const phoneInput = document.getElementById('phoneInput');
    const phoneError = document.getElementById('phoneError');
    const staffId = document.getElementById('staffId').value;

    let phoneValid = true;

    function showPhoneError(message) {
        phoneError.textContent = message;
        phoneInput.classList.add('error-input');
    }

    function clearPhoneError() {
        phoneError.textContent = '';
        phoneInput.classList.remove('error-input');
    }

    function validatePhoneFormat() {
        const phone = phoneInput.value.trim();

        if (phone === '') {
            showPhoneError('Phone number is required.');
            phoneValid = false;
            return false;
        }

        const indianPhonePattern = /^\+91[\s-]?[6-9]\d{9}$/;

        if (!indianPhonePattern.test(phone)) {
            showPhoneError('Phone number should start with +91 and contain a valid 10-digit Indian mobile number.');
            phoneValid = false;
            return false;
        }

        clearPhoneError();
        phoneValid = true;
        return true;
    }

    async function checkDuplicatePhone() {
        const phone = phoneInput.value.trim();

        try {
            const response = await fetch(
                `/staff/check-phone/?phone=${encodeURIComponent(phone)}&staff_id=${staffId}`
            );

            const data = await response.json();

            if (data.exists) {
                showPhoneError('This phone number already exists!');
                phoneValid = false;
                return false;
            }

            clearPhoneError();
            phoneValid = true;
            return true;

        } catch (error) {
            console.log('Phone check error:', error);
            showPhoneError('Unable to check phone number right now.');
            phoneValid = false;
            return false;
        }
    }

    async function validatePhoneFully() {
        const isFormatValid = validatePhoneFormat();

        if (!isFormatValid) {
            if (typeof checkChanges === 'function') {
                checkChanges();
            }
            return false;
        }

        const isDuplicateValid = await checkDuplicatePhone();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }

        return isDuplicateValid;
    }

    phoneInput.addEventListener('input', () => {
        // Allow only digits, +, space and hyphen
        phoneInput.value = phoneInput.value.replace(/[^0-9+\s-]/g, '');

        validatePhoneFormat();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    });

    phoneInput.addEventListener('blur', async () => {
        await validatePhoneFully();
    });

    form.addEventListener('submit', function (e) {
        if (!validatePhoneFormat() || !phoneValid) {
            e.preventDefault();
            phoneInput.focus();
        }
    });

});
// ========================== FIRST & LAST NAME CONTAINS ONLY STRINGS ============================

document.addEventListener('DOMContentLoaded', ()=>{
    const firstNameInput = document.getElementById('firstNameInput');
    
    firstNameInput.addEventListener('input', ()=>{
        firstNameInput.value = firstNameInput.value.replace(/[^a-zA-Z\s]/g, '');
    });

    const lastNameInput = document.getElementById('lastNameInput');

    lastNameInput.addEventListener('input', ()=>{
        lastNameInput.value = lastNameInput.value.replace(/[^a-zA-Z\s]/g, '');
    });
})

// ================================== DOB & DOJ ENHANCING ==================================

document.addEventListener('DOMContentLoaded', ()=>{
    const dateOfBirthInput = document.getElementById('dateOfBirthInput');
    const dateOfJoiningInput = document.getElementById('dateOfJoiningInput');

    function enableFullDatePicker(input){
        input.addEventListener('click', ()=>{
            if(input.showPicker){
                input.showPicker();
            }
        });
    }

    enableFullDatePicker(dateOfBirthInput);
    enableFullDatePicker(dateOfJoiningInput);

});

// ======================== DOB + DOJ VALIDATION ============================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');

    const dateOfBirthInput = document.getElementById('dateOfBirthInput');
    const dateOfJoiningInput = document.getElementById('dateOfJoiningInput');

    const dateOfBirthError = document.getElementById('dateOfBirthError');
    const dateOfJoiningError = document.getElementById('dateOfJoiningError');

    if (!form || !dateOfBirthInput || !dateOfJoiningInput) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dateOfBirthInput.setAttribute('max', today.toISOString().split('T')[0]);

    function calculateAgeOnJoining(dob, doj) {
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

    function validateDOBAndDOJ() {

        let isValid = true;

        dateOfBirthError.textContent = '';
        dateOfJoiningError.textContent = '';

        dateOfBirthInput.classList.remove('error-input');
        dateOfJoiningInput.classList.remove('error-input');

        const dobValue = dateOfBirthInput.value;
        const dojValue = dateOfJoiningInput.value;

        const dob = dobValue ? new Date(dobValue) : null;
        const doj = dojValue ? new Date(dojValue) : null;

        if (!dojValue) {
            dateOfJoiningError.textContent = 'Date of Joining is required';
            dateOfJoiningInput.classList.add('error-input');
            isValid = false;
        }

        if (dob && dob > today) {
            dateOfBirthError.textContent = 'Date of birth cannot be in the future';
            dateOfBirthInput.classList.add('error-input');
            isValid = false;
        }

        if (dob && doj) {

            if (dob > doj) {
                dateOfBirthError.textContent =
                    'Date of birth cannot be after date of joining';

                dateOfBirthInput.classList.add('error-input');
                dateOfJoiningInput.classList.add('error-input');

                isValid = false;
            } else {
                const ageOnJoining = calculateAgeOnJoining(dob, doj);

                if (ageOnJoining < 18) {
                    dateOfJoiningError.textContent =
                        'Employee must be at least 18 years old on date of joining';

                    dateOfBirthInput.classList.add('error-input');
                    dateOfJoiningInput.classList.add('error-input');

                    isValid = false;
                }
            }
        }

        if (typeof checkChanges === 'function') {
            checkChanges();
        }

        return isValid;
    }

    dateOfBirthInput.addEventListener('change', validateDOBAndDOJ);
    dateOfBirthInput.addEventListener('input', validateDOBAndDOJ);

    dateOfJoiningInput.addEventListener('change', validateDOBAndDOJ);
    dateOfJoiningInput.addEventListener('input', validateDOBAndDOJ);

    validateDOBAndDOJ();

    form.addEventListener('submit', (e) => {
        if (!validateDOBAndDOJ()) {
            e.preventDefault();
        }
    });

});
// ============================== DEPARTMENT & ROLE AUTOMATICALLY SELECTED ==============================

document.addEventListener('DOMContentLoaded', () => {
    const roleInput = document.getElementById('roleInput');
    const departmentInput = document.getElementById('departmentInput');

    if (!roleInput || !departmentInput) return;

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

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    }

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
});

// ============================== IMAGE UPLOAD HANDLING ==============================

document.addEventListener('DOMContentLoaded', () => {

    const photoInput = document.getElementById('profilePhotoInput');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const progressBar = document.getElementById('photoProgressBar');
    const progressText = document.getElementById('progressText');
    const currentPhotoSection = document.getElementById('currentPhotoSection');

    if (!photoInput || !removePhotoBtn || !progressBar || !progressText) return;

    let previousFiles = [];
    let interval = null;

    function resetUploadUI() {
        progressBar.style.width = '0%';
        progressText.textContent = 'No file selected';
        removePhotoBtn.style.display = 'none';

        if (currentPhotoSection) {
            currentPhotoSection.style.display = '';
        }

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    }

    function showUploadedUI(message = '✓ Image Uploaded') {
        progressBar.style.width = '100%';
        progressText.textContent = message;
        removePhotoBtn.style.display = 'flex';

        if (currentPhotoSection) {
            currentPhotoSection.style.display = 'none';
        }

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
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
                progressText.textContent = '✓ Image Uploaded';
            }

        }, 50);
    }

    photoInput.addEventListener('click', () => {
        previousFiles = Array.from(photoInput.files);
    });

    photoInput.addEventListener('change', () => {

        // User opened file explorer and clicked Cancel
        if (photoInput.files.length === 0) {

            if (previousFiles.length > 0) {
                const dataTransfer = new DataTransfer();

                previousFiles.forEach(file => {
                    dataTransfer.items.add(file);
                });

                photoInput.files = dataTransfer.files;
                showUploadedUI('✓ Image Uploaded');
                return;
            }

            resetUploadUI();
            return;
        }

        previousFiles = Array.from(photoInput.files);

        if (currentPhotoSection) {
            currentPhotoSection.style.display = 'none';
        }

        removePhotoBtn.style.display = 'flex';

        startProgress();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    });

    removePhotoBtn.addEventListener('click', () => {
        photoInput.value = '';
        previousFiles = [];

        if (interval) {
            clearInterval(interval);
        }

        resetUploadUI();
    });

});

// ====================== EDIT PAGE: SHOW / HIDE MONTHLY TARGET BASED ON ROLE ======================

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('staffMgmtForm');
    const roleInput = document.getElementById('roleInput');

    const monthlyTargetGroup = document.getElementById('monthlyTargetGroup');
    const monthlyTargetInput = document.getElementById('monthlyTargetInput');
    const monthlyTargetError = document.getElementById('monthlyTargetError');

    if (!form || !roleInput || !monthlyTargetGroup || !monthlyTargetInput || !monthlyTargetError) {
        console.log('Edit monthly target validation elements not found');
        return;
    }

    const rolesNeedMonthlyTarget = [
        'manager',
        'sales exec',
        'sales exec lead'
    ];

    // Match this with your models.py
    // If model is max_digits=10, decimal_places=2
    const MAX_MONTHLY_TARGET = 99999999.99;
    const MAX_WHOLE_DIGITS = 8;

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

        if (typeof checkChanges === 'function') {
            checkChanges();
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

        const [wholePart] = value.split('.');

        if (wholePart.length > MAX_WHOLE_DIGITS) {
            showMonthlyTargetError('Monthly target must not exceed ₹99,999,999.99.');
            return false;
        }

        const target = Number(value);

        if (target <= 0) {
            showMonthlyTargetError('Monthly target must be greater than 0.');
            return false;
        }

        if (target > MAX_MONTHLY_TARGET) {
            showMonthlyTargetError('Monthly target must not exceed ₹99,999,999.99.');
            return false;
        }

        clearMonthlyTargetError();
        return true;
    }

    roleInput.addEventListener('change', () => {
        toggleMonthlyTarget();
        validateMonthlyTarget();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    });

    monthlyTargetInput.addEventListener('keydown', (e) => {
        const blockedKeys = ['e', 'E', '+', '-'];

        if (blockedKeys.includes(e.key)) {
            e.preventDefault();
        }
    });

    monthlyTargetInput.addEventListener('input', () => {
        sanitizeMonthlyTargetInput();
        validateMonthlyTarget();

        if (typeof checkChanges === 'function') {
            checkChanges();
        }
    });

    monthlyTargetInput.addEventListener('blur', () => {
        validateMonthlyTarget();

        if (typeof checkChanges === 'function') {
            checkChanges();
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