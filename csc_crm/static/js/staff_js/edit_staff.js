// ============================================================
// EDIT STAFF - COMPLETE JS
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const form = document.getElementById("staffMgmtForm");
    if (!form) return;

    console.log("EDIT STAFF JS LOADED");

    // ========================================================
    // HELPERS
    // ========================================================

    const $ = (id) => document.getElementById(id);

    const field = (name, id) =>
        (id && $(id)) || document.querySelector(`[name="${name}"]`);

    const value = (input) =>
        input ? String(input.value || "").trim() : "";

    function error(input, errorEl, message) {
        if (errorEl) errorEl.textContent = message;
        if (input) input.classList.add("error-input");
    }

    function clearError(input, errorEl) {
        if (errorEl) errorEl.textContent = "";
        if (input) input.classList.remove("error-input");
    }

    // ========================================================
    // FIELDS
    // ========================================================

    const employeeId = field("employee_id", "employeeIdInput");
    const firstName = field("first_name", "firstNameInput");
    const lastName = field("last_name", "lastNameInput");
    const email = field("email", "emailInput");
    const phone = field("phone", "phoneInput");

    const dob = field("date_of_birth", "dateOfBirthInput");
    const doj = field("date_of_joining", "dateOfJoiningInput");

    const gender = field("gender", "genderInput");
    const bloodGroup = field("blood_group", "bloodGroupInput");

    const emergencyName =
        field("emergency_contact_name", "emergencyContactNameInput");

    const emergencyPhone =
        field("emergency_contact_phone", "emergencyContactPhoneInput");

    const role = field("role", "roleInput");
    const department = field("department", "departmentInput");
    const status = field("status", "statusInput");

    const reportingManager =
        field("reporting_manager", "reportingManagerInput");

    const password = field("password", "passwordInput");
    const confirmPassword =
        field("confirm_password", "confirmPasswordInput");

    const skillsInput = $("skillsTypedInput");
    const skillsHidden = field("skills", "skillsInput");

    const monthlyTarget =
        field("monthly_target", "monthlyTargetInput");

    const performanceRating =
        field("performance_rating", "performanceRatingInput");

    const updateBtn = $("updateStaffBtn");

    // ========================================================
    // ERRORS
    // ========================================================

    const errors = {
        firstName: $("firstNameError"),
        lastName: $("lastNameError"),
        email: $("emailError"),
        phone: $("phoneError"),
        dob: $("dateOfBirthError"),
        doj: $("dateOfJoiningError"),
        role: $("roleError"),
        status: $("statusError"),
        emergencyName: $("emergencyContactNameError"),
        emergencyPhone: $("emergencyContactPhoneError"),
        password: $("passwordError"),
        confirmPassword: $("confirmPasswordError"),
        skills: $("skillsError"),
        monthlyTarget: $("monthlyTargetError"),
        performance: $("performanceRatingError")
    };

    // ========================================================
    // ORIGINAL VALUES
    // ========================================================

    const original = {
        firstName: value(firstName),
        lastName: value(lastName),
        email: value(email),
        phone: value(phone),

        dob: dob ? dob.value : "",
        doj: doj ? doj.value : "",

        gender: gender ? gender.value : "",
        bloodGroup: bloodGroup ? bloodGroup.value : "",

        emergencyName: value(emergencyName),
        emergencyPhone: value(emergencyPhone),

        role: role ? role.value : "",
        department: department ? department.value : "",
        status: status ? status.value : "",

        reportingManager:
            reportingManager ? reportingManager.value : "",

        monthlyTarget:
            monthlyTarget ? monthlyTarget.value : "",

        performanceRating:
            performanceRating ? performanceRating.value : ""
    };

    // ========================================================
    // EMPLOYEE ID
    // ========================================================

    if (employeeId) {
        employeeId.readOnly = true;
    }

    // ========================================================
    // ROLE -> DEPARTMENT
    // ========================================================

    const roleDepartmentMap = {
        "Developer": "Technical",
        "Trainer": "Technical",

        "Admin": "Management",
        "Manager": "Management",
        "HR": "Management",

        "Sales Exec": "Sales Department",
        "Sales Exec Lead": "Sales Department",

        "Digital Marketing": "Marketing",
        "Content Creator": "Marketing",
        "Marketing Lead": "Marketing"
    };

    function getRoleText() {
        if (!role) return "";

        const option =
            role.options[role.selectedIndex];

        return option
            ? option.text.trim()
            : "";
    }

    function setDepartmentFromRole() {
        if (!role || !department) return;

        const roleText = getRoleText();
        const departmentName =
            roleDepartmentMap[roleText];

        if (!departmentName) return;

        for (const option of department.options) {
            if (
                option.text.trim().toLowerCase() ===
                departmentName.toLowerCase()
            ) {
                department.value = option.value;
                break;
            }
        }
    }

    if (department) {
        department.disabled = true;
    }

    // ========================================================
    // REPORTING MANAGER
    // ========================================================

    /*
        IMPORTANT:

        Django must send ALL possible staff in the
        reporting_manager <select>.

        Example:

        <option value="10">Arun Kumar</option>
        <option value="11">Suresh Kumar</option>

        JavaScript will then filter them according to role.
    */

    const REPORTING_RULES = {
        "Admin": [],
        "Manager": ["Admin"],

        "Developer": ["Manager"],
        "Trainer": ["Manager"],
        "HR": ["Manager"],

        "Sales Exec Lead": ["Manager"],
        "Marketing Lead": ["Manager"],

        "Sales Exec": ["Sales Exec Lead"],

        "Digital Marketing": ["Marketing Lead"],
        "Content Creator": ["Marketing Lead"]
    };

    /*
        Read role information from:

        <script id="staffRolesData" type="application/json">
            ...
        </script>
    */

    let staffRoles = {};

    const staffRolesElement =
        $("staffRolesData");

    if (staffRolesElement) {
        try {
            staffRoles =
                JSON.parse(
                    staffRolesElement.textContent
                ) || {};
        } catch (e) {
            console.error(
                "staffRolesData JSON error:",
                e
            );
        }
    }

    /*
        Save ALL manager options once.

        DO NOT use the already-filtered list.
    */

    let managerOptions = [];

    if (reportingManager) {
        managerOptions =
            Array.from(
                reportingManager.options
            ).filter(
                option => option.value !== ""
            );

        console.log(
            "Reporting manager options:",
            managerOptions
        );
    }

    function getManagerRole(option) {

        if (!option) return "";

        // First try data-role directly
        if (option.dataset.role) {
            return option.dataset.role.trim();
        }

        // Then try JSON object
        const data =
            staffRoles[option.value];

        if (typeof data === "string") {
            return data.trim();
        }

        if (data && typeof data === "object") {

            return (
                data.role ||
                data.role_name ||
                data.staff_role ||
                ""
            ).toString().trim();
        }

        return "";
    }

    function filterReportingManagers() {

        if (!role || !reportingManager) {
            return;
        }

        const selectedRole =
            getRoleText();

        console.log(
            "Selected role:",
            selectedRole
        );

        const allowedRoles =
            REPORTING_RULES[selectedRole];

        /*
            ADMIN
            No reporting manager
        */

        if (
            selectedRole === "Admin" ||
            allowedRoles === null ||
            typeof allowedRoles === "undefined" &&
            selectedRole === ""
        ) {
            reportingManager.value = "";
            reportingManager.required = false;

            reportingManager.innerHTML =
                '<option value="">---------</option>';

            const group =
                $("reportingManagerGroup");

            if (group) {
                group.style.display = "none";
            }

            return;
        }

        /*
            Show reporting manager field
        */

        const group =
            $("reportingManagerGroup");

        if (group) {
            group.style.display = "";
        }

        reportingManager.required = true;

        /*
            Remember currently selected manager
        */

        const currentValue =
            reportingManager.value;

        /*
            Rebuild options
        */

        reportingManager.innerHTML = "";

        const placeholder =
            document.createElement("option");

        placeholder.value = "";
        placeholder.textContent = "---------";

        reportingManager.appendChild(
            placeholder
        );

        /*
            Add only allowed managers
        */

        managerOptions.forEach(
            function (option) {

                const managerRole =
                    getManagerRole(option);

                console.log(
                    "Manager:",
                    option.text,
                    "Role:",
                    managerRole
                );

                if (
                    allowedRoles.includes(
                        managerRole
                    )
                ) {

                    const newOption =
                        option.cloneNode(true);

                    reportingManager.appendChild(
                        newOption
                    );
                }
            }
        );

        /*
            Restore old manager if still valid
        */

        const exists =
            Array.from(
                reportingManager.options
            ).some(
                option =>
                    option.value === currentValue
            );

        if (exists) {
            reportingManager.value =
                currentValue;
        } else {
            reportingManager.value = "";
        }

        checkChanges();
    }

    // ========================================================
    // ROLE CHANGE
    // ========================================================

    if (role) {

        role.addEventListener(
            "change",
            function () {

                setDepartmentFromRole();

                filterReportingManagers();

                toggleMonthlyTarget();

                validateRole();

                validateMonthlyTarget();

                checkChanges();
            }
        );
    }

    // ========================================================
    // ROLE VALIDATION
    // ========================================================

    function validateRole() {

        if (!role) return true;

        if (!role.value) {

            error(
                role,
                errors.role,
                "Role is required."
            );

            return false;
        }

        clearError(
            role,
            errors.role
        );

        return true;
    }

    // ========================================================
    // STATUS
    // ========================================================

    function validateStatus() {

        if (!status) return true;

        if (!status.value) {

            error(
                status,
                errors.status,
                "Status is required."
            );

            return false;
        }

        clearError(
            status,
            errors.status
        );

        return true;
    }

    if (status) {
        status.addEventListener(
            "change",
            function () {
                validateStatus();
                checkChanges();
            }
        );
    }

    // ========================================================
    // EMAIL
    // ========================================================

    const emailPattern =
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    function validateEmail() {

        if (!email) return true;

        const val =
            value(email).toLowerCase();

        if (!val) {

            error(
                email,
                errors.email,
                "Email is required."
            );

            return false;
        }

        if (!emailPattern.test(val)) {

            error(
                email,
                errors.email,
                "Please enter a valid email address."
            );

            return false;
        }

        clearError(
            email,
            errors.email
        );

        return true;
    }

    async function duplicateEmail() {

        if (!email || !validateEmail()) {
            return false;
        }

        const current =
            value(email);

        if (
            current.toLowerCase() ===
            original.email.toLowerCase()
        ) {
            return true;
        }

        try {

            const response =
                await fetch(
                    `/staff/check-email/?email=${encodeURIComponent(current)}`
                );

            const data =
                await response.json();

            if (data.exists) {

                error(
                    email,
                    errors.email,
                    "This email already exists!"
                );

                return false;
            }

            clearError(
                email,
                errors.email
            );

            return true;

        } catch (e) {

            console.error(e);

            return true;
        }
    }

    if (email) {

        email.addEventListener(
            "input",
            function () {
                validateEmail();
                checkChanges();
            }
        );

        email.addEventListener(
            "blur",
            duplicateEmail
        );
    }

    // ========================================================
    // PHONE
    // ========================================================

    const indianPhone =
        /^\+91[6-9]\d{9}$/;

    function sanitizePhone(input) {

        if (!input) return;

        let val =
            input.value.replace(
                /[^0-9+]/g,
                ""
            );

        if (val.startsWith("+")) {

            val =
                "+" +
                val.substring(1)
                    .replace(/\+/g, "");

        } else {

            val =
                val.replace(/\+/g, "");
        }

        input.value =
            val.substring(0, 13);
    }

    function validatePhone() {

        if (!phone) return true;

        const val =
            value(phone);

        if (!val) {

            error(
                phone,
                errors.phone,
                "Phone number is required."
            );

            return false;
        }

        if (!indianPhone.test(val)) {

            error(
                phone,
                errors.phone,
                "Enter valid +91 Indian mobile number."
            );

            return false;
        }

        clearError(
            phone,
            errors.phone
        );

        return true;
    }

    async function duplicatePhone() {

        if (!phone || !validatePhone()) {
            return false;
        }

        const current =
            value(phone);

        if (current === original.phone) {
            return true;
        }

        try {

            const response =
                await fetch(
                    `/staff/check-phone/?phone=${encodeURIComponent(current)}`
                );

            const data =
                await response.json();

            if (data.exists) {

                error(
                    phone,
                    errors.phone,
                    "This phone number already exists!"
                );

                return false;
            }

            clearError(
                phone,
                errors.phone
            );

            return true;

        } catch (e) {

            console.error(e);

            return true;
        }
    }

    if (phone) {

        phone.addEventListener(
            "input",
            function () {

                sanitizePhone(phone);
                validatePhone();
                checkChanges();
            }
        );

        phone.addEventListener(
            "blur",
            duplicatePhone
        );
    }

    // ========================================================
    // NAME
    // ========================================================

    function validateName(
        input,
        errorEl,
        label
    ) {

        if (!input) return true;

        input.value =
            input.value
                .replace(
                    /[^a-zA-Z\s]/g,
                    ""
                )
                .substring(0, 50);

        if (!value(input)) {

            error(
                input,
                errorEl,
                `${label} is required.`
            );

            return false;
        }

        clearError(
            input,
            errorEl
        );

        return true;
    }

    if (firstName) {

        firstName.addEventListener(
            "input",
            function () {

                validateName(
                    firstName,
                    errors.firstName,
                    "First name"
                );

                checkChanges();
            }
        );
    }

    if (lastName) {

        lastName.addEventListener(
            "input",
            function () {

                validateName(
                    lastName,
                    errors.lastName,
                    "Last name"
                );

                checkChanges();
            }
        );
    }

    // ========================================================
    // EMERGENCY CONTACT
    // ========================================================

    function validateEmergencyName() {

        if (!emergencyName) return true;

        emergencyName.value =
            emergencyName.value.replace(
                /[^a-zA-Z\s]/g,
                ""
            );

        clearError(
            emergencyName,
            errors.emergencyName
        );

        return true;
    }

    function validateEmergencyPhone() {

        if (!emergencyPhone) return true;

        const val =
            value(emergencyPhone);

        if (!val) {

            clearError(
                emergencyPhone,
                errors.emergencyPhone
            );

            return true;
        }

        if (!indianPhone.test(val)) {

            error(
                emergencyPhone,
                errors.emergencyPhone,
                "Enter valid +91 Indian mobile number."
            );

            return false;
        }

        clearError(
            emergencyPhone,
            errors.emergencyPhone
        );

        return true;
    }

    if (emergencyName) {

        emergencyName.addEventListener(
            "input",
            function () {
                validateEmergencyName();
                checkChanges();
            }
        );
    }

    if (emergencyPhone) {

        emergencyPhone.addEventListener(
            "input",
            function () {

                sanitizePhone(
                    emergencyPhone
                );

                validateEmergencyPhone();
                checkChanges();
            }
        );
    }

    // ========================================================
    // PASSWORD
    // ========================================================

    function validatePassword() {

        if (!password || !confirmPassword) {
            return true;
        }

        /*
            Blank = keep old password
        */

        if (
            !password.value &&
            !confirmPassword.value
        ) {

            clearError(
                password,
                errors.password
            );

            clearError(
                confirmPassword,
                errors.confirmPassword
            );

            return true;
        }

        if (
            password.value !==
            confirmPassword.value
        ) {

            error(
                confirmPassword,
                errors.confirmPassword,
                "Passwords do not match."
            );

            return false;
        }

        clearError(
            password,
            errors.password
        );

        clearError(
            confirmPassword,
            errors.confirmPassword
        );

        return true;
    }

    if (password) {

        password.addEventListener(
            "input",
            function () {

                validatePassword();
                checkChanges();
            }
        );
    }

    if (confirmPassword) {

        confirmPassword.addEventListener(
            "input",
            function () {

                validatePassword();
                checkChanges();
            }
        );
    }

    // ========================================================
    // DATE
    // ========================================================

    function parseDate(val) {

        if (!val) return null;

        const parts =
            val.split("-").map(Number);

        if (parts.length !== 3) {
            return null;
        }

        const date =
            new Date(
                parts[0],
                parts[1] - 1,
                parts[2]
            );

        date.setHours(0, 0, 0, 0);

        return date;
    }

    function validateDates() {

        let valid = true;

        clearError(
            dob,
            errors.dob
        );

        clearError(
            doj,
            errors.doj
        );

        const dobDate =
            dob ? parseDate(dob.value) : null;

        const dojDate =
            doj ? parseDate(doj.value) : null;

        const today =
            new Date();

        today.setHours(
            0, 0, 0, 0
        );

        if (
            dob &&
            dob.value &&
            !dobDate
        ) {

            error(
                dob,
                errors.dob,
                "Invalid date of birth."
            );

            valid = false;
        }

        if (
            dobDate &&
            dobDate > today
        ) {

            error(
                dob,
                errors.dob,
                "Date of birth cannot be in the future."
            );

            valid = false;
        }

        if (
            doj &&
            !doj.value
        ) {

            error(
                doj,
                errors.doj,
                "Date of joining is required."
            );

            valid = false;
        }

        if (
            dobDate &&
            dojDate &&
            dojDate < dobDate
        ) {

            error(
                doj,
                errors.doj,
                "Date of joining cannot be before date of birth."
            );

            valid = false;
        }

        return valid;
    }

    if (dob) {
        dob.addEventListener(
            "change",
            function () {
                validateDates();
                checkChanges();
            }
        );
    }

    if (doj) {
        doj.addEventListener(
            "change",
            function () {
                validateDates();
                checkChanges();
            }
        );
    }

    // ========================================================
    // SKILLS
    // ========================================================

    function loadSkills() {

        if (!skillsInput || !skillsHidden) {
            return;
        }

        const raw =
            skillsHidden.value.trim();

        if (!raw) return;

        try {

            const parsed =
                JSON.parse(raw);

            if (Array.isArray(parsed)) {

                skillsInput.value =
                    parsed
                        .map(
                            s =>
                                typeof s === "string"
                                    ? s
                                    : s.name
                        )
                        .filter(Boolean)
                        .join(", ");
            }

        } catch (e) {

            console.warn(
                "Existing skills could not be parsed."
            );
        }
    }

    function validateSkills() {

        if (!skillsInput || !skillsHidden) {
            return true;
        }

        const raw =
            skillsInput.value.trim();

        if (!raw) {

            skillsHidden.value = "[]";

            clearError(
                skillsInput,
                errors.skills
            );

            return true;
        }

        const skills =
            raw.split(",")
                .map(s => s.trim())
                .filter(Boolean);

        for (const skill of skills) {

            if (/\d/.test(skill)) {

                error(
                    skillsInput,
                    errors.skills,
                    "Skills should not contain numbers."
                );

                return false;
            }
        }

        skillsHidden.value =
            JSON.stringify(skills);

        clearError(
            skillsInput,
            errors.skills
        );

        return true;
    }

    if (skillsInput) {

        skillsInput.addEventListener(
            "input",
            function () {

                skillsInput.value =
                    skillsInput.value.replace(
                        /[^A-Za-z\s,.+#-]/g,
                        ""
                    );

                validateSkills();
                checkChanges();
            }
        );
    }

    loadSkills();

    // ========================================================
    // MONTHLY TARGET
    // ========================================================

    const monthlyGroup =
        $("monthlyTargetGroup");

    const targetRoles = [
        "manager",
        "sales exec",
        "sales exec lead"
    ];

    function isTargetRole() {

        return targetRoles.includes(
            getRoleText()
                .toLowerCase()
                .trim()
        );
    }

    function toggleMonthlyTarget() {

        if (!monthlyGroup || !monthlyTarget) {
            return;
        }

        if (isTargetRole()) {

            monthlyGroup.style.display = "";
            monthlyTarget.disabled = false;

        } else {

            monthlyGroup.style.display = "none";
            monthlyTarget.disabled = true;
        }
    }

    function validateMonthlyTarget() {

        if (!monthlyTarget) {
            return true;
        }

        if (!isTargetRole()) {
            return true;
        }

        if (!value(monthlyTarget)) {

            error(
                monthlyTarget,
                errors.monthlyTarget,
                "Monthly target is required."
            );

            return false;
        }

        const amount =
            Number(monthlyTarget.value);

        if (
            isNaN(amount) ||
            amount <= 0 ||
            amount > 1000000
        ) {

            error(
                monthlyTarget,
                errors.monthlyTarget,
                "Enter a valid monthly target."
            );

            return false;
        }

        clearError(
            monthlyTarget,
            errors.monthlyTarget
        );

        return true;
    }

    if (monthlyTarget) {

        monthlyTarget.addEventListener(
            "input",
            function () {

                monthlyTarget.value =
                    monthlyTarget.value.replace(
                        /[^0-9.]/g,
                        ""
                    );

                validateMonthlyTarget();
                checkChanges();
            }
        );
    }

    // ========================================================
    // PERFORMANCE
    // ========================================================

    function validatePerformance() {

        if (!performanceRating) {
            return true;
        }

        const rating =
            Number(performanceRating.value);

        if (
            !performanceRating.value ||
            rating < 1 ||
            rating > 5
        ) {

            error(
                performanceRating,
                errors.performance,
                "Performance rating must be between 1 and 5."
            );

            return false;
        }

        clearError(
            performanceRating,
            errors.performance
        );

        return true;
    }

    if (performanceRating) {

        performanceRating.addEventListener(
            "change",
            function () {

                validatePerformance();
                checkChanges();
            }
        );
    }

    // ========================================================
    // CHANGE DETECTION
    // ========================================================

    function checkChanges() {

        if (!updateBtn) return;

        const changed =
            value(firstName) !== original.firstName ||
            value(lastName) !== original.lastName ||
            value(email) !== original.email ||
            value(phone) !== original.phone ||

            (dob && dob.value !== original.dob) ||
            (doj && doj.value !== original.doj) ||

            (gender && gender.value !== original.gender) ||
            (bloodGroup &&
                bloodGroup.value !== original.bloodGroup) ||

            value(emergencyName) !==
                original.emergencyName ||

            value(emergencyPhone) !==
                original.emergencyPhone ||

            (role &&
                role.value !== original.role) ||

            (department &&
                department.value !== original.department) ||

            (status &&
                status.value !== original.status) ||

            (reportingManager &&
                reportingManager.value !==
                    original.reportingManager) ||

            (monthlyTarget &&
                monthlyTarget.value !==
                    original.monthlyTarget) ||

            (performanceRating &&
                performanceRating.value !==
                    original.performanceRating) ||

            (password &&
                password.value !== "") ||

            (confirmPassword &&
                confirmPassword.value !== "") ||

            (skillsHidden &&
                skillsHidden.value !== "") ;

        updateBtn.disabled = !changed;
    }

    window.checkChanges =
        checkChanges;

    // ========================================================
    // SUBMIT
    // ========================================================

    let submitting = false;

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (submitting) return;

            const results = [

                validateName(
                    firstName,
                    errors.firstName,
                    "First name"
                ),

                validateName(
                    lastName,
                    errors.lastName,
                    "Last name"
                ),

                validateEmail(),

                validatePhone(),

                validateEmergencyName(),

                validateEmergencyPhone(),

                validatePassword(),

                validateDates(),

                validateRole(),

                validateStatus(),

                validateSkills(),

                validateMonthlyTarget(),

                validatePerformance()
            ];

            if (results.includes(false)) {

                const firstError =
                    form.querySelector(
                        ".error-input"
                    );

                if (firstError) {

                    firstError.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    firstError.focus();
                }

                return;
            }

            const emailOK =
                await duplicateEmail();

            const phoneOK =
                await duplicatePhone();

            if (!emailOK || !phoneOK) {
                return;
            }

            /*
                Reporting manager is required for
                every role except Admin.
            */

            const roleText =
                getRoleText();

            if (
                roleText !== "Admin" &&
                reportingManager &&
                !reportingManager.value
            ) {

                alert(
                    "Please select a Reporting Manager."
                );

                reportingManager.focus();

                return;
            }

            if (
                updateBtn &&
                updateBtn.disabled
            ) {
                return;
            }

            submitting = true;

            if (updateBtn) {

                updateBtn.disabled = true;

                updateBtn.innerHTML =
                    '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
            }

            HTMLFormElement.prototype.submit.call(
                form
            );
        }
    );

    // ========================================================
    // INITIALIZE
    // ========================================================

    setDepartmentFromRole();

    /*
        VERY IMPORTANT:
        Run reporting manager filter only AFTER
        managerOptions has been collected.
    */

    filterReportingManagers();

    toggleMonthlyTarget();

    validateEmail();
    validatePhone();

    validateName(
        firstName,
        errors.firstName,
        "First name"
    );

    validateName(
        lastName,
        errors.lastName,
        "Last name"
    );

    validateEmergencyName();
    validateEmergencyPhone();

    validatePassword();
    validateDates();
    validateRole();
    validateStatus();
    validateSkills();
    validateMonthlyTarget();
    validatePerformance();

    checkChanges();

});