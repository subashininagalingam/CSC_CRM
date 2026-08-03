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
                            showToast(
                                " Student Re-notification Sent Successfully"
                            );

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

                            showToast(
                                " Student SMS Alert Queued Successfully"
                            );

                        }, 1500);

                    }

                );

            }

        );

    }

);
//filter

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

function showToast(message) {

    const toast =
        document.getElementById(
            "smsToast"
        );

    toast.innerHTML = message;

    toast.style.display = "block";

    setTimeout(() => {

        toast.style.display = "none";

    }, 3000);

}
applyFilters();

// Admin Notes Modal

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

                "Content-Type":
                    "application/json",

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

                alert(
                    "Notes Saved Successfully!"
                );

                setTimeout(() => {

                    location.reload();

                }, 300);

            } else {

                alert(
                    "Failed to save notes."
                );

            }

        })

        .catch(error => {

            console.error(error);

            alert(
                "Error saving notes."
            );

        });

}

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

function toggleActionMenu(button) {

    const dropdown = button
        .closest('.action-menu')
        .querySelector('.action-dropdown');

    // Close all other menus
    document.querySelectorAll('.action-dropdown.show').forEach(menu => {
        if (menu !== dropdown) {
            menu.classList.remove('show');
        }
    });

    // Toggle current menu
    dropdown.classList.toggle('show');
}


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