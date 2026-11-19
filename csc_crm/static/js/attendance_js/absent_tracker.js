//================ TOAST NOTIFICATION HELPER ==================//
const TOAST_ICONS = {
    success: "fa-check",
    error: "fa-times",
    warning: "fa-exclamation"
};

const TOAST_TITLES = {
    success: "Success",
    error: "Error",
    warning: "Attention"
};

//================ CSRF TOKEN HELPER (READ FROM COOKIE) ==================//
function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();

            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                );
                break;
            }
        }
    }

    return cookieValue;
}

//================ NOTIFY / RE-NOTIFY BUTTON HANDLER ==================//
document.addEventListener("DOMContentLoaded", function () {

    const notifyButtons = document.querySelectorAll(".notify-action-btn");

    notifyButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const studentId = button.dataset.id;

            fetch(`/api/mark-notification/${studentId}/`)
                .then(response => response.json())
                .then(data => {
                    console.log(data);
                });

            // PREVENT MULTIPLE CLICKS
            button.disabled = true;

            // LOADING STATE
            button.innerHTML = `
                <span class="spinner-border spinner-border-sm"></span>
                Sending...
            `;

            // SIMULATE REAL-TIME API
            setTimeout(function () {

                // BUTTON STYLE CHANGE
                button.classList.remove("notify-btn");
                button.classList.add("renotify-btn");

                // BUTTON TEXT CHANGE
                button.innerHTML = `
                    <i class="bi bi-arrow-repeat"></i>
                    Re-notify
                `;

                // ENABLE AGAIN
                button.disabled = false;

                // STATUS BADGE UPDATE
                const row = button.closest("tr");
                const statusBadge = row.querySelector(".notification-cell .status-badge");

                if (statusBadge) {
                    statusBadge.classList.remove("pending");
                    statusBadge.classList.add("dispatched");
                    statusBadge.innerHTML = `
                        <i class="bi bi-check-circle-fill"></i>
                        Dispatched
                    `;
                }

                // SUCCESS MESSAGE
                showToast("Student SMS Alert Queued Successfully", 'success');

            }, 3200);

        });

    });

});

//================ FILTER INPUT VALIDATION (NAME / PHONE / EMAIL) ==================//
// Name  -> letters + spaces only
// Phone -> Indian mobile number only (10 digits, first digit 6-9, no +91)
// Email -> only valid email characters while typing; filter applies once the
//          format is complete (name@example.com)
const NAME_INVALID_CHARS = /[^\p{L}\s]/gu;
const EMAIL_INVALID_CHARS = /[^A-Za-z0-9._%+\-@]/g;
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;

const PHONE_ERROR_TEXT = "Phone: enter a valid mobile number (10 digits, starts with 6-9)";

const FILTER_MESSAGES = { name: "", phone: "", email: "" };

//================ FILTER ERROR MESSAGE BOX (CREATED ONCE, INSIDE FILTER BAR) ==================//
// Placed INSIDE .filter-container as a full-width last row, so it sits under the
// inputs (left aligned with them) and the container's own bottom spacing is used.
// grid-column + flex-basis make it span the full row for both grid and flex layouts.
function getFilterErrorBox() {

    let box = document.getElementById("filterError");

    if (!box) {
        box = document.createElement("div");
        box.id = "filterError";
        box.style.cssText =
            "display:none; grid-column:1 / -1; flex:0 0 100%; width:100%; " +
            "box-sizing:border-box; margin:0; padding:0 4px; text-align:left; " +
            "color:#dc2626; font-size:13px; line-height:1.4;";

        const container = document.querySelector(".filter-container");
        if (container) {
            container.appendChild(box);
        }
    }

    return box;
}

function renderFilterMessages() {

    const box = getFilterErrorBox();
    const text = Object.values(FILTER_MESSAGES).filter(Boolean).join("  •  ");

    box.textContent = text;
    box.style.display = text ? "block" : "none";
}

//================ MOBILE NUMBER HELPERS ==================//
// Filter input -> digits only, first digit must be 6-9, max 10 digits.
// No +91 / country code handling: "+" and any other non-digit is removed.
function toIndianMobileDigits(raw) {

    let digits = String(raw || "").replace(/\D/g, "");

    // Indian mobile numbers start with 6, 7, 8 or 9 only
    digits = digits.replace(/^[0-5]+/, "");

    return digits.slice(0, 10);
}

// Phone saved in the table row -> last 10 digits, so rows stored as
// "+916380885756" still match what is typed in the filter.
function normalizeRowPhone(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
}

//================ SANITIZERS (RUN ON EVERY TYPE / PASTE) ==================//
function sanitizeNameFilter(input) {
    const cleaned = input.value.replace(NAME_INVALID_CHARS, "");
    FILTER_MESSAGES.name = cleaned !== input.value ? "Name: letters only" : "";
    input.value = cleaned;
}

function sanitizePhoneFilter(input) {
    const cleaned = toIndianMobileDigits(input.value);
    FILTER_MESSAGES.phone = cleaned !== input.value ? PHONE_ERROR_TEXT : "";
    input.value = cleaned;
}

function sanitizeEmailFilter(input) {
    const cleaned = input.value.replace(EMAIL_INVALID_CHARS, "");

    if (cleaned !== input.value) {
        FILTER_MESSAGES.email = "Email: invalid character removed";
    } else if (cleaned && !EMAIL_REGEX.test(cleaned)) {
        FILTER_MESSAGES.email = "Email: enter a valid email (e.g. name@example.com)";
    } else {
        FILTER_MESSAGES.email = "";
    }

    input.value = cleaned;

    // typed text is clean but still incomplete -> keep showing the format hint
    if (!FILTER_MESSAGES.email && cleaned && !EMAIL_REGEX.test(cleaned)) {
        FILTER_MESSAGES.email = "Email: enter a valid email (e.g. name@example.com)";
    }
}

//================ SUMMARY CARDS + ALERT BADGE + PROGRESS BAR (FOLLOW THE FILTERS) ==================//
// Same rules as the backend: a student needs attention / is "at risk"
// when consecutive absences >= 3. Consecutive count is read from the row's
// ".absence-pill" text (e.g. "2 Days" -> 2).
const ATTENTION_THRESHOLD = 3;

function getRowConsecutiveAbsences(row) {
    const pill = row.querySelector(".absence-pill");
    return pill ? (parseInt(pill.textContent, 10) || 0) : 0;
}

function setText(el, value) {
    if (el) el.textContent = value;
}

function updateSummaryCards(visibleRows) {

    const total = visibleRows.length;

    let attention = 0;
    let maxConsecutive = 0;

    visibleRows.forEach(row => {
        const consecutive = getRowConsecutiveAbsences(row);

        if (consecutive >= ATTENTION_THRESHOLD) attention++;
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
    });

    const percentage = total > 0 ? Math.round((attention / total) * 100) : 0;

    // ---- 4 summary cards (order: Active Alerts, Total Students, Max Consecutive, At Risk %) ----
    const cardValues = document.querySelectorAll(".tracker-summary .summary-card .summary-content strong");

    setText(cardValues[0], attention);
    setText(cardValues[1], total);
    setText(cardValues[2], maxConsecutive);
    setText(cardValues[3], `${percentage}%`);

    // ---- Header badge: "N Active Alerts" ----
    setText(document.querySelector(".tracker-header .alert-badge"), `${attention} Active Alerts`);

    // ---- Attention progress bar ----
    setText(
        document.querySelector(".attention-progress .progress-header span"),
        `${attention} of ${total} students require attention`
    );
    setText(document.querySelector(".attention-progress .progress-header strong"), `${percentage}%`);

    const fill = document.querySelector(".attention-progress .progress-fill");
    if (fill) fill.style.width = `${percentage}%`;
}

//================ TABLE FILTERS (NAME, BATCH, COURSE, PHONE, EMAIL, STATUS) ==================//
function applyFilters() {

    const name = document.getElementById("studentNameFilter").value.toLowerCase();
    const batch = document.getElementById("batchFilter").value.toLowerCase();

    // courseFilter is rendered only for Admin / Manager / HR (null for Trainer)
    const courseEl = document.getElementById("courseFilter");
    const course = courseEl ? courseEl.value.toLowerCase() : "";

    const phone = document.getElementById("phoneFilter").value.replace(/\D/g, "");
    const email = document.getElementById("emailFilter").value.toLowerCase();
    const status = document.getElementById("statusFilter").value.toLowerCase();

    // email filter is applied only when the typed email is a valid format
    const emailIsValid = email !== "" && EMAIL_REGEX.test(email);

    let visibleCount = 0;
    const visibleRows = [];

    const totalCount = document.querySelectorAll(".student-row").length;

    document.querySelectorAll(".student-row").forEach(row => {

        const show =
            (name === "" || row.dataset.name.toLowerCase().startsWith(name)) &&
            (course === "" || row.dataset.course.toLowerCase() === course) &&
            (batch === "" || row.dataset.batch.toLowerCase() === batch) &&
            (phone === "" || normalizeRowPhone(row.dataset.phone).startsWith(phone)) &&
            (!emailIsValid || row.dataset.email.toLowerCase().includes(email)) &&
            (status === "" || row.dataset.status.toLowerCase() === status);

        row.style.display = show ? "" : "none";

        if (show) {
            visibleCount++;
            visibleRows.push(row);
        }

    });

    document.getElementById("resultsCount").innerHTML =
        `Showing ${visibleCount} of ${totalCount} Students`;

    const noResults = document.getElementById("noResultsMessage");
    if (noResults) {
        noResults.style.display = (visibleCount === 0 && totalCount > 0) ? "block" : "none";
    }

    // keep the 4 cards, badge and progress bar in sync with the filtered rows
    updateSummaryCards(visibleRows);

}

//================ FILTER INPUT LISTENERS (VALIDATE ON INPUT, FILTER ON KEYUP/CHANGE) ==================//
const nameFilterInput = document.getElementById("studentNameFilter");
const phoneFilterInput = document.getElementById("phoneFilter");
const emailFilterInput = document.getElementById("emailFilter");

if (phoneFilterInput) {
    phoneFilterInput.setAttribute("maxlength", "10");
    phoneFilterInput.setAttribute("inputmode", "numeric");
}

if (emailFilterInput) {
    emailFilterInput.setAttribute("maxlength", "100");
}

// "input" fires on typing AND paste, before keyup/change
if (nameFilterInput) {
    nameFilterInput.addEventListener("input", () => {
        sanitizeNameFilter(nameFilterInput);
        renderFilterMessages();
    });
}

if (phoneFilterInput) {
    phoneFilterInput.addEventListener("input", () => {
        sanitizePhoneFilter(phoneFilterInput);
        renderFilterMessages();
    });
}

if (emailFilterInput) {
    emailFilterInput.addEventListener("input", () => {
        sanitizeEmailFilter(emailFilterInput);
        renderFilterMessages();
    });
}

document.querySelectorAll(".filter-input, .filter-select").forEach(input => {
    input.addEventListener("keyup", applyFilters);
    input.addEventListener("change", applyFilters);
});

//================ CLEAR FILTERS BUTTON ==================//
function clearAllFilters() {

    document.querySelectorAll(".filter-input").forEach(input => {
        input.value = "";
    });

    document.getElementById("statusFilter").value = "";
    document.getElementById("batchFilter").value = "";

    // courseFilter does not exist for Trainer login
    const courseEl = document.getElementById("courseFilter");
    if (courseEl) courseEl.value = "";

    // clear validation messages too
    FILTER_MESSAGES.name = "";
    FILTER_MESSAGES.phone = "";
    FILTER_MESSAGES.email = "";
    renderFilterMessages();

    applyFilters();
}

const clearBtn = document.getElementById("clearFilters");
if (clearBtn) {
    clearBtn.addEventListener("click", clearAllFilters);
}

//================ SHOW ALL / RESET FILTERS BUTTON (OPTIONAL - COMMENTED OUT IN HTML) ==================//
const showAllBtn = document.getElementById("showAllBtn");
if (showAllBtn) {
    showAllBtn.addEventListener("click", clearAllFilters);
}

//================ TOAST (SAME DESIGN AS REST OF CRM) ==================//
function showToast(message, type = 'success', duration = 3200) {

    let container = document.getElementById('toastContainer');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
    }

    // Keep the container directly under <body> so parent overflow / z-index
    // / transform inside the page layout cannot hide the toast
    if (container.parentElement !== document.body) {
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${TOAST_ICONS[type] || TOAST_ICONS.success}"></i></div>
        <div class="toast-body">
            <p class="toast-message">${message}</p>
        </div>
        <button type="button" class="toast-close" aria-label="Close">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    const removeToast = () => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    const timer = setTimeout(removeToast, duration);

    toast.addEventListener('mouseenter', () => clearTimeout(timer));
}

// Initial run
applyFilters();

//================ ADMIN NOTES MODAL - SET MODE (VIEW / EDIT) ==================//
function setNoteMode(mode) {

    const textarea = document.getElementById("adminNoteText");
    const title = document.getElementById("adminNoteTitle");
    const isEdit = mode === "edit";

    textarea.readOnly = !isEdit;

    if (title) {
        title.textContent = isEdit ? "Edit Admin Notes" : "Admin Notes";
    }

    document.getElementById("saveNoteBtn").style.display = isEdit ? "inline-block" : "none";
    document.getElementById("editNoteBtn").style.display = isEdit ? "none" : "inline-block";

    if (isEdit) {
        textarea.focus();
        // cursor at the end of the existing text
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
}

//================ ADMIN NOTES MODAL - EDIT MODE ==================//
function openEditModal(id, note) {

    closeActionMenus();

    document.getElementById("trackerId").value = id;

    document.getElementById("adminNoteText").value = note || "";

    document.getElementById("adminNoteModal").style.display = "block";

    setNoteMode("edit");

}

//================ ADMIN NOTES MODAL - VIEW MODE (READ-ONLY) ==================//
function openViewModal(id, note) {

    closeActionMenus();

    document.getElementById("trackerId").value = id;

    document.getElementById("adminNoteText").value = note || "No notes available";

    document.getElementById("adminNoteModal").style.display = "block";

    setNoteMode("view");
}

//================ ADMIN NOTES MODAL - CLOSE ==================//
function closeAdminModal() {

    document.getElementById("adminNoteModal").style.display = "none";

    document.getElementById("adminNoteText").value = "";

    // Reset to default (edit) state
    setNoteMode("edit");

}

//================ ADMIN NOTES - SAVE (AJAX POST) ==================//
function saveAdminNotes() {

    const trackerId = document.getElementById("trackerId").value;
    const note = document.getElementById("adminNoteText").value.trim();

    const csrftoken = getCookie("csrftoken");

    fetch(
        "/api/save-admin-notes/",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken,
            },
            body: JSON.stringify({
                tracker_id: trackerId,
                notes: note
            })
        }
    )
        .then(response => response.json())
        .then(data => {

            console.log("SERVER RESPONSE:", data);

            if (data.status === "success") {

                closeAdminModal();
                closeActionMenus();

                updateAdminNoteInRow(trackerId, note);

                showToast("Notes updated successfully!", 'success');

            } else {
                showToast(data.message || " Failed to save notes.", 'error');
            }
        })
        .catch(error => {
            console.error(error);
            showToast(" Error saving notes.", 'error');
        });

}

//================ UPDATE ADMIN NOTE ON BUTTON WITHOUT PAGE RELOAD ==================//
// Selector depends on the onclick starting exactly as: openViewModal('ID' / openEditModal('ID'
function updateAdminNoteInRow(trackerId, note) {

    const safeNote = note && note.trim() !== "" ? note : "No notes available";

    const viewBtn = document.querySelector(
        `.action-dropdown button[onclick*="openViewModal('${trackerId}'"]`
    );

    const editBtn = document.querySelector(
        `.action-dropdown button[onclick*="openEditModal('${trackerId}'"]`
    );

    // JSON.stringify gives a valid JS string literal (handles quotes + new lines)
    if (viewBtn) {
        viewBtn.setAttribute(
            "onclick",
            `openViewModal('${trackerId}', ${JSON.stringify(safeNote)})`
        );
    }

    if (editBtn) {
        editBtn.setAttribute(
            "onclick",
            `openEditModal('${trackerId}', ${JSON.stringify(note || "")})`
        );
    }
}

//================ ADMIN NOTES MODAL - SWITCH VIEW MODE TO EDIT MODE ==================//
function enableEditMode() {

    const textarea = document.getElementById("adminNoteText");

    // If it was only the placeholder text, start with an empty box
    if (textarea.value === "No notes available") {
        textarea.value = "";
    }

    setNoteMode("edit");
}

//================ ACTION MENU - CLOSE ALL ==================//
function closeActionMenus() {
    document.querySelectorAll('.action-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
    });
}

//================ ACTION MENU (THREE-DOT DROPDOWN) - TOGGLE ==================//
function toggleActionMenu(button) {

    const dropdown = button
        .closest('.action-menu')
        .querySelector('.action-dropdown');

    const wasOpen = dropdown.classList.contains('show');

    // Close all other menus
    closeActionMenus();

    if (!wasOpen) {

        const rect = button.getBoundingClientRect();

        dropdown.style.top = (rect.bottom + 4) + "px";
        dropdown.style.left = "auto";
        dropdown.style.right = (window.innerWidth - rect.right) + "px";

        dropdown.classList.add('show');
    }
}

//================ ACTION MENU - CLOSE ON OUTSIDE CLICK ==================//
document.addEventListener('click', function (event) {

    if (!event.target.closest('.action-menu')) {
        closeActionMenus();
    }

});

//================ ACTION MENU - CLOSE ON SCROLL ==================//
document.addEventListener('scroll', closeActionMenus, true);