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
document.addEventListener(

    "DOMContentLoaded",

    function () {

        const notifyButtons = document.querySelectorAll(

            ".notify-action-btn"

        );

        notifyButtons.forEach(

            function (button) {

                button.addEventListener(

                    "click",

                    function () {
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

                            button.classList.remove(

                                "notify-btn"

                            );

                            button.classList.add(

                                "renotify-btn"

                            );

                            // BUTTON TEXT CHANGE

                            button.innerHTML = `

                                <i class="bi bi-arrow-repeat"></i>

                                Re-notify

                            `;
                            showToast("Student Re-notification Sent Successfully", 'success');

                            // ENABLE AGAIN

                            button.disabled = false;

                            // STATUS BADGE UPDATE

                            const row = button.closest("tr");

                            const statusBadge = row.querySelector(

                                ".notification-cell .status-badge"
                            );

                            statusBadge.classList.remove(

                                "pending"
                            );

                            statusBadge.classList.add(

                                "dispatched"
                            );

                            statusBadge.innerHTML = `

                                <i class="bi bi-check-circle-fill"></i>

                                Dispatched

                            `;

                            // SUCCESS MESSAGE

                            showToast("Student SMS Alert Queued Successfully", 'success');

                        }, 3200);

                    }

                );

            }

        );

    }

);

//================ TABLE FILTERS (NAME, BATCH, COURSE, PHONE, EMAIL, STATUS) ==================//
function applyFilters() {

    const name =
        document.getElementById(
            "studentNameFilter"
        ).value.toLowerCase();



    const batch =
        document.getElementById(
            "batchFilter"
        ).value.toLowerCase();

    const course =
        document.getElementById(
            "courseFilter"
        ).value.toLowerCase();

    const phone =
        document.getElementById(
            "phoneFilter"
        ).value.toLowerCase();

    const email =
        document.getElementById(
            "emailFilter"
        ).value.toLowerCase();

    const status =
        document.getElementById(
            "statusFilter"
        ).value.toLowerCase();

    let visibleCount = 0;

    const totalCount =
        document.querySelectorAll(
            ".student-row"
        ).length;

    document.querySelectorAll(
        ".student-row"
    ).forEach(row => {

        const show =

            (name === "" ||
                row.dataset.name
                    .toLowerCase()
                    .startsWith(name)) &&


            (course === "" ||
                row.dataset.course
                    .toLowerCase() === course) &&

            (batch === "" ||
                row.dataset.batch
                    .toLowerCase() === batch) &&

            (phone === "" ||
                row.dataset.phone
                    .toLowerCase()
                    .startsWith(phone)) &&

            (email === "" ||
                row.dataset.email
                    .toLowerCase()
                    .includes(email)) &&

            (status === "" ||
                row.dataset.status
                    .toLowerCase() === status);

        row.style.display =
            show ? "" : "none";

        if (show) {

            visibleCount++;

        }

    });
    document.getElementById(
        "resultsCount"
    ).innerHTML =

        `Showing ${visibleCount} of ${totalCount} Students`;
    if (visibleCount === 0) {

        document.getElementById("noResultsMessage").style.display = "block";

    } else {

        document.getElementById("noResultsMessage").style.display = "none";

    }


}

//================ FILTER INPUT LISTENERS (KEYUP/CHANGE) ==================//
document.querySelectorAll(
    ".filter-input, .filter-select"
).forEach(input => {

    input.addEventListener(
        "keyup",
        applyFilters
    );

    input.addEventListener(
        "change",
        applyFilters
    );

});

//================ CLEAR FILTERS BUTTON ==================//
document.getElementById(
    "clearFilters"
).addEventListener(
    "click",
    function () {

        document.querySelectorAll(
            ".filter-input"
        ).forEach(input => {

            input.value = "";

        });

        document.getElementById(
            "statusFilter"
        ).value = "";

        document.getElementById(
            "courseFilter"
        ).value = "";
        document.getElementById(
            "batchFilter"
        ).value = "";

        applyFilters();



    }
);

//================ SHOW ALL / RESET FILTERS BUTTON ==================//
document.getElementById(
    "showAllBtn"
).addEventListener(
    "click",
    function () {

        document.querySelectorAll(
            ".filter-input"
        ).forEach(input => {

            input.value = "";

        });

        document.getElementById(
            "statusFilter"
        ).value = "";

        document.getElementById(
            "courseFilter"
        ).value = "";

        document.getElementById(
            "batchFilter"
        ).value = "";

        applyFilters();

    }
);

function showToast(message, type = 'success', duration = 3200) {

    let container = document.getElementById('toastContainer');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
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

applyFilters();

//================ ADMIN NOTES MODAL - EDIT MODE ==================//
function openEditModal(id, note) {

    document.getElementById(
        "trackerId"
    ).value = id;

    document.getElementById(
        "adminNoteText"
    ).value = note || "";

    document.getElementById(
        "adminNoteText"
    ).readOnly = false;

    document.querySelector(
        ".notify-btn.mt-3"
    ).style.display = "inline-block";

    document.getElementById(
        "adminNoteModal"
    ).style.display = "block";

}

//================ ADMIN NOTES MODAL - VIEW MODE (READ-ONLY) ==================//
function openViewModal(id, note) {

    document.getElementById(
        "trackerId"
    ).value = id;

    document.getElementById(
        "adminNoteText"
    ).value = note || "No notes available";

    document.getElementById(
        "adminNoteText"
    ).readOnly = true;

    document.getElementById(
        "saveNoteBtn"
    ).style.display = "none";

    document.getElementById(
        "editNoteBtn"
    ).style.display = "inline-block";

    document.getElementById(
        "adminNoteModal"
    ).style.display = "block";
}

//================ ADMIN NOTES MODAL - CLOSE ==================//
function closeAdminModal() {

    document.getElementById(
        "adminNoteModal"
    ).style.display = "none";

    document.getElementById(
        "adminNoteText"
    ).value = "";

    document.getElementById(
        "adminNoteText"
    ).readOnly = false;

    document.querySelector(
        ".notify-btn.mt-3"
    ).style.display = "inline-block";

}

//================ ADMIN NOTES - SAVE (AJAX POST) ==================//
function saveAdminNotes() {

    const trackerId =
        document.getElementById(
            "trackerId"
        ).value;

    const note =
        document.getElementById(
            "adminNoteText"
        ).value.trim();

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

                updateAdminNoteInRow(trackerId, note);

                showToast(" Notes Saved Successfully!", 'success');

            } else {
                showToast(" Failed to save notes.", 'error');
            }
        })
        .catch(error => {
            console.error(error);
            showToast(" Error saving notes.", 'error');
        });

}

//================ UPDATE ADMIN NOTE ON BUTTON WITHOUT PAGE RELOAD ==================//
function updateAdminNoteInRow(trackerId, note) {

    const safeNote = note && note.trim() !== "" ? note : "No notes available";

    const viewBtn = document.querySelector(
        `.action-dropdown button[onclick*="openViewModal('${trackerId}'"]`
    );

    const editBtn = document.querySelector(
        `.action-dropdown button[onclick*="openEditModal('${trackerId}'"]`
    );

    if (viewBtn) {
        viewBtn.setAttribute(
            "onclick",
            `openViewModal('${trackerId}', \`${safeNote.replace(/`/g, "\\`")}\`)`
        );
    }

    if (editBtn) {
        editBtn.setAttribute(
            "onclick",
            `openEditModal('${trackerId}', '${note.replace(/'/g, "\\'")}')`
        );
    }
}

//================ ADMIN NOTES MODAL - SWITCH VIEW MODE TO EDIT MODE ==================//
function enableEditMode() {

    document.getElementById(
        "adminNoteText"
    ).readOnly = false;

    document.getElementById(
        "saveNoteBtn"
    ).style.display = "inline-block";

    document.getElementById(
        "editNoteBtn"
    ).style.display = "none";
}

//================ ACTION MENU (THREE-DOT DROPDOWN) - TOGGLE ==================//
function toggleActionMenu(button) {

    const dropdown = button
        .closest('.action-menu')
        .querySelector('.action-dropdown');

    const wasOpen = dropdown.classList.contains('show');

    // Close all other menus
    document.querySelectorAll('.action-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
    });

    if (!wasOpen) {

        const rect = button.getBoundingClientRect();

        dropdown.style.top = (rect.bottom + 4) + "px";
        dropdown.style.left = "auto";
        dropdown.style.right = (window.innerWidth - rect.right) + "px";

        dropdown.classList.add('show');
    }
}

//================ ACTION MENU - CLOSE ON OUTSIDE CLICK ==================//
// Close menu when clicking outside
document.addEventListener('click', function (event) {

    if (!event.target.closest('.action-menu')) {

        document
            .querySelectorAll('.action-dropdown.show')
            .forEach(menu => {
                menu.classList.remove('show');
            });

    }

});

//================ ACTION MENU - CLOSE ON SCROLL ==================//
// Close open dropdown on scroll (table scroll / page scroll)
document.addEventListener('scroll', function () {
    document.querySelectorAll('.action-dropdown.show').forEach(menu => {
        menu.classList.remove('show');
    });
}, true);