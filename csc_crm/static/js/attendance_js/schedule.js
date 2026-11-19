//================ IMPORTANT: CONFIRM THIS PREFIX ==================//
// Your screenshot showed the working page at 127.0.0.1:8000/api/schedule/
// so this app's urls.py is mounted under /api/ in the project root urls.py.
// If that is NOT correct, change this one line only.
const SCHEDULE_API_BASE = "/api/schedule";

//================ CSRF TOKEN HELPER ==================//
function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
}

//================ ALERT BANNER HELPER ==================//
function showScheduleAlert(message, type) {
    const alertBox = document.getElementById("scheduleAlert");
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = "schedule-alert " + type;
    alertBox.style.display = "block";

    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

    setTimeout(() => {
        alertBox.style.display = "none";
    }, 5000);
}

//================ FIELD ERROR HELPERS ==================//
function clearFieldErrors() {
    document.querySelectorAll(".field-error").forEach(el => {
        el.textContent = "";
    });
    document.querySelectorAll(".sched-input").forEach(el => {
        el.classList.remove("input-error");
    });
}

function setFieldError(fieldId, errorId, message) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);

    if (input) input.classList.add("input-error");
    if (errorEl) errorEl.textContent = message;
}

function clearSingleFieldError(fieldId, errorId) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);

    if (input) input.classList.remove("input-error");
    if (errorEl) errorEl.textContent = "";
}

//================ LOCAL DATE / TIME HELPERS ==================//
// toISOString() is UTC, which gives yesterday's date in India before 5:30 AM,
// so build yyyy-mm-dd and HH:MM from the local clock instead.
function getLocalToday() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
}

function getLocalNowTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mi}`;
}

/* ============================================
   CREATE SCHEDULE FORM - VALIDATION + SUBMIT LOCK
   (status field removed - always Upcoming, no validation needed for it)
============================================ */

const TOPIC_MIN_LENGTH = 3;
const TOPIC_MAX_LENGTH = 100;

function validateStaffField() {
    const staff = document.getElementById("assignTrainer");
    clearSingleFieldError("assignTrainer", "err-staff");

    if (!staff || !staff.value) {
        setFieldError("assignTrainer", "err-staff", "Please select a trainer.");
        return false;
    }
    return true;
}

function validateTopicField() {
    const topic = document.getElementById("scheduleTopic");
    clearSingleFieldError("scheduleTopic", "err-topic");

    const value = topic ? topic.value.trim() : "";

    if (!value) {
        setFieldError("scheduleTopic", "err-topic", "Topic is required.");
        return false;
    }
    if (value.length < TOPIC_MIN_LENGTH) {
        setFieldError("scheduleTopic", "err-topic", `Topic must be at least ${TOPIC_MIN_LENGTH} characters.`);
        return false;
    }
    if (value.length > TOPIC_MAX_LENGTH) {
        setFieldError("scheduleTopic", "err-topic", `Topic cannot exceed ${TOPIC_MAX_LENGTH} characters.`);
        return false;
    }
    if (!/\p{L}/u.test(value)) {
        setFieldError("scheduleTopic", "err-topic", "Topic must contain at least one letter.");
        return false;
    }
    return true;
}

function validateDateField() {
    const date = document.getElementById("scheduleDate");
    clearSingleFieldError("scheduleDate", "err-date");

    if (!date || !date.value) {
        setFieldError("scheduleDate", "err-date", "Date is required.");
        return false;
    }
    if (date.value < getLocalToday()) {
        setFieldError("scheduleDate", "err-date", "Date cannot be in the past.");
        return false;
    }
    return true;
}

function validateTimeField() {
    const date = document.getElementById("scheduleDate");
    const time = document.getElementById("scheduleTime");
    clearSingleFieldError("scheduleTime", "err-time");

    if (!time || !time.value) {
        setFieldError("scheduleTime", "err-time", "Time is required.");
        return false;
    }

    // scheduling for today -> time must not already be over
    if (date && date.value === getLocalToday() && time.value < getLocalNowTime()) {
        setFieldError("scheduleTime", "err-time", "Time cannot be in the past for today.");
        return false;
    }
    return true;
}

function validateTypeField() {
    const type = document.getElementById("scheduleType");
    clearSingleFieldError("scheduleType", "err-type");

    if (!type || !type.value) {
        setFieldError("scheduleType", "err-type", "Please select a type.");
        return false;
    }
    return true;
}

document.addEventListener("DOMContentLoaded", function () {

    const scheduleForm = document.getElementById("scheduleForm");
    if (!scheduleForm) return;

    const submitBtn = document.getElementById("addScheduleBtn");
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
    let isSubmitting = false;

    const staff = document.getElementById("assignTrainer");
    const topic = document.getElementById("scheduleTopic");
    const date = document.getElementById("scheduleDate");
    const time = document.getElementById("scheduleTime");
    const type = document.getElementById("scheduleType");

    // ---- Date can't be picked before today ----
    if (date) {
        date.setAttribute("min", getLocalToday());
    }

    // ---- Open the native picker as soon as the box is clicked ----
    [date, time].forEach(function (input) {
        if (!input) return;

        input.addEventListener("click", function () {
            if (typeof this.showPicker === "function") {
                try { this.showPicker(); } catch (err) { /* browser blocked it - ignore */ }
            }
        });
    });

    // ---- Live validation (error clears / shows while the user fills the form) ----
    if (staff) staff.addEventListener("change", validateStaffField);
    if (type) type.addEventListener("change", validateTypeField);

    if (topic) {
        topic.addEventListener("input", function () {
            if (topic.value.trim() !== "") validateTopicField();
            else clearSingleFieldError("scheduleTopic", "err-topic");
        });
        topic.addEventListener("blur", validateTopicField);
    }

    if (date) {
        date.addEventListener("change", function () {
            validateDateField();
            // date change can make an already-picked time invalid (or valid again)
            if (time && time.value) validateTimeField();
        });
    }

    if (time) {
        time.addEventListener("change", validateTimeField);
    }

    // ---- Submit ----
    scheduleForm.addEventListener("submit", function (e) {

        // already submitting -> block any extra click / Enter press
        if (isSubmitting) {
            e.preventDefault();
            return;
        }

        clearFieldErrors();

        // run every check (no short-circuit) so all errors show together
        const results = [
            validateStaffField(),
            validateTopicField(),
            validateDateField(),
            validateTimeField(),
            validateTypeField()
        ];

        if (results.includes(false)) {
            e.preventDefault();
            showScheduleAlert("Please correct the highlighted fields before creating the schedule.", "error");
            return;
        }

        // valid -> lock the button until the page reloads
        isSubmitting = true;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
        }
    });

    // coming back with the browser Back button -> unlock the form again
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
            isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    });

});

/* ============================================
   STATUS UPDATES - COMPLETED / BLOCK BUTTONS
   Both buttons share the same design (.status-action-btn), just
   different color themes (.btn-complete = green, .btn-block = red).

   Trainer: one-way only (upcoming -> completed OR blocked), then both
   buttons lock permanently (server also enforces this - see update_schedule_status view).

   Admin/Manager: free toggle. Clicking the already-active button
   reverts the schedule back to "upcoming". Clicking the other button
   switches to that status. Every change asks for confirmation.
============================================ */

document.addEventListener("DOMContentLoaded", function () {

    function applyStatusToRow(row, newStatus, newStatusDisplay) {
        const pill = row.querySelector(".status-pill");
        const completeBtn = row.querySelector(".btn-complete");
        const blockBtn = row.querySelector(".btn-block");

        pill.textContent = newStatusDisplay;
        pill.className = "status-pill " + newStatus;

        completeBtn.classList.toggle("active", newStatus === "completed");
        completeBtn.textContent = (newStatus === "completed") ? "Uncomplete" : "Completed";
        blockBtn.classList.toggle("active", newStatus === "blocked");
        blockBtn.textContent = (newStatus === "blocked") ? "Unblock" : "Block";

        // Trainer: lock both buttons permanently once status leaves "upcoming"
        if (typeof MY_ROLE !== "undefined" && MY_ROLE === "Trainer" && newStatus !== "upcoming") {
            completeBtn.disabled = true;
            blockBtn.disabled = true;
        }
    }

    function sendStatusUpdate(scheduleId, newStatus, row) {
        fetch(`${SCHEDULE_API_BASE}/status/${scheduleId}/`, {
            method: "POST",
            headers: {
                "X-CSRFToken": getCsrfToken(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                applyStatusToRow(row, data.new_status, data.new_status_display);
                showScheduleAlert("Status updated successfully.", "success");
            } else {
                showScheduleAlert(data.message || "Could not update status.", "error");
            }
        })
        .catch(() => {
            showScheduleAlert("Could not update status. Please try again.", "error");
        });
    }

    // ---- Completed button ----
    document.querySelectorAll(".btn-complete").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const scheduleId = this.dataset.scheduleId;
            const row = this.closest("tr");
            const isActive = this.classList.contains("active");

            if (isActive) {
                if (!confirm("Move this schedule back to upcoming?")) return;
                sendStatusUpdate(scheduleId, "upcoming", row);
            } else {
                if (!confirm("Mark this schedule as completed?")) return;
                sendStatusUpdate(scheduleId, "completed", row);
            }
        });
    });

    // ---- Block / Unblock button ----
    document.querySelectorAll(".btn-block").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const scheduleId = this.dataset.scheduleId;
            const row = this.closest("tr");
            const isActive = this.classList.contains("active");

            if (isActive) {
                if (!confirm("Unblock this schedule and move it back to upcoming?")) return;
                sendStatusUpdate(scheduleId, "upcoming", row);
            } else {
                if (!confirm("Block this schedule?")) return;
                sendStatusUpdate(scheduleId, "blocked", row);
            }
        });
    });

});

/* ============================================
   SELECT ALL / ROW SELECTION FOR EXPORT
============================================ */

document.addEventListener("DOMContentLoaded", function () {

    const selectAll = document.getElementById("selectAllRows");

    if (selectAll) {
        selectAll.addEventListener("change", function () {
            document.querySelectorAll(".row-check").forEach(cb => {
                cb.checked = selectAll.checked;
            });
        });
    }

    document.querySelectorAll(".row-check").forEach(cb => {
        cb.addEventListener("change", function () {
            const allChecked = Array.from(
                document.querySelectorAll(".row-check")
            ).every(box => box.checked);

            if (selectAll) selectAll.checked = allChecked;
        });
    });

});

/* ============================================
   EXPORT SELECTED ROWS
============================================ */

document.addEventListener("DOMContentLoaded", function () {

    const exportBtn = document.getElementById("exportBtn");
    if (!exportBtn) return;

    exportBtn.addEventListener("click", function () {

        const checkedBoxes = document.querySelectorAll(".row-check:checked");
        const ids = Array.from(checkedBoxes).map(cb => cb.value);

        let url = `${SCHEDULE_API_BASE}/export/`;

        if (ids.length > 0) {
            url += "?ids=" + ids.join(",");
        }

        window.location.href = url;

    });

});