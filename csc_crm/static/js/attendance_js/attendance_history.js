//================ EXPORT FORMAT VALIDATION (BEFORE DOWNLOAD SUBMIT) ==================//
function validateFormat() {

    const format = document.getElementById("format");
    const error = document.getElementById("error-msg");

    if (!format.value) {

        error.innerText =
            "Please select a format (Excel or PDF)";
        error.style.color = "red";

        return false;
    }

    error.innerText = "";

    // Make sure the latest checkbox selection is on the form right
    // before it submits (covers rows hidden by client-side filters too).
    syncSelectedIds();

    setTimeout(() => {
        format.value = "";
    }, 100);

    return true;
}


/* ============ SELECTED ROWS -> DOWNLOAD FORM ============ */

//================ SYNC CHECKED ROW IDS INTO HIDDEN INPUT ==================//
function syncSelectedIds() {

    const selectedIdsInput = document.getElementById("selectedIdsInput");
    const label = document.getElementById("selectedCountLabel");
    const selectAll = document.getElementById("selectAll");

    if (!selectedIdsInput) return;

    // Only rows that are visible (not filtered out) count for select-all / download.
    const visibleCheckboxes = Array.from(
        document.querySelectorAll(".row-check")
    ).filter(cb => cb.closest(".attendance-row").style.display !== "none");

    const checkedBoxes = visibleCheckboxes.filter(cb => cb.checked);

    const ids = checkedBoxes.map(cb => cb.value);

    selectedIdsInput.value = ids.join(",");

    if (label) {
        label.innerText = `${ids.length} row${ids.length !== 1 ? "s" : ""} selected`;
    }

    if (selectAll) {
        selectAll.checked =
            visibleCheckboxes.length > 0 &&
            checkedBoxes.length === visibleCheckboxes.length;
    }
}

//================ ROW CHECKBOX + SELECT-ALL LISTENERS ==================//
document.addEventListener("DOMContentLoaded", function () {

    document.querySelectorAll(".row-check").forEach(cb => {
        cb.addEventListener("change", syncSelectedIds);
    });

    const selectAll = document.getElementById("selectAll");

    if (selectAll) {

        selectAll.addEventListener("change", function () {

            document.querySelectorAll(".row-check").forEach(cb => {
                if (cb.closest(".attendance-row").style.display !== "none") {
                    cb.checked = selectAll.checked;
                }
            });

            syncSelectedIds();
        });
    }

    // Page load aagum bothe "0 rows selected" nu default-a show aagum
    syncSelectedIds();

});

/* ============ STUDENT SUMMARY MODAL ============ */

//================ FETCH & RENDER STUDENT ATTENDANCE SUMMARY ==================//
function openStudentSummary(studentId) {

    const modal = document.getElementById("attendanceModal");

    fetch(`/api/student-attendance-summary/${studentId}/`)
        .then(res => res.json())
        .then(data => {

            document.getElementById("studentName").innerText =
                data.student_name;

            const photo = document.getElementById("studentPhoto");
            const avatar = document.getElementById("studentAvatar");

            if (data.photo_url) {

                photo.src = data.photo_url;
                photo.style.display = "block";

                avatar.style.display = "none";
            }
            else {

                photo.style.display = "none";
                avatar.style.display = "flex";

                const names = data.student_name.trim().split(" ");

                let initials = "";

                if (names.length >= 2) {
                    initials = names[0][0] + names[names.length - 1][0];
                }
                else {
                    initials = names[0][0];
                }

                avatar.innerText = initials.toUpperCase();
            }

            document.getElementById("studentInfo").innerText =
                data.course + " • " + data.batch + "(" + data.timing + ")";

            document.getElementById("presentCount").innerText =
                data.present;

            document.getElementById("absentCount").innerText =
                data.absent;

            document.getElementById("lateCount").innerText =
                data.late;

            document.getElementById("attendancePercent").innerText =
                data.percentage;

            let timeline = document.getElementById("timeline");
            timeline.innerHTML = "";

            data.timeline.forEach(item => {

                timeline.innerHTML += `
                <div class="timeline-item">
                    <strong>${item.date}</strong> -
                    ${item.status}
                </div>
            `;
            });

            modal.style.display = "flex";

        })
        .catch(err => {
            console.error(err);
            alert("Error loading attendance data");
        });
}

//================ STUDENT SUMMARY MODAL - OPEN/CLOSE + NAME LINK HANDLER ==================//
document.addEventListener("DOMContentLoaded", function () {

    const modal = document.getElementById("attendanceModal");
    const closeBtn = document.getElementById("closeModal");

    closeBtn.onclick = function () {
        modal.style.display = "none";
    }

    window.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });

    // Name link still opens the summary modal
    document.querySelectorAll(".student-detail-btn").forEach(btn => {

        btn.addEventListener("click", function (e) {

            e.preventDefault();

            let studentId = this.dataset.id;

            openStudentSummary(studentId);

        });

    });

});


/* ============ ROW 3-DOT ACTION MENU ============ */

//================ ROW ACTION MENU - TOGGLE, SCROLL-CLOSE, OUTSIDE-CLICK-CLOSE ==================//
document.addEventListener("DOMContentLoaded", function () {

    // Toggle a row's dropdown, closing any other open ones first
    document.querySelectorAll(".row-menu-btn").forEach(btn => {

        btn.addEventListener("click", function (e) {

            e.preventDefault();
            e.stopPropagation();

            const menu = this.closest(".row-menu");
            const dropdown = menu.querySelector(".row-menu-dropdown");
            const wasOpen = menu.classList.contains("open");

            document.querySelectorAll(".row-menu.open").forEach(m => {
                m.classList.remove("open");
            });

            if (!wasOpen) {

                const rect = this.getBoundingClientRect();

                dropdown.style.top = (rect.bottom + 4) + "px";
                dropdown.style.left = "auto";
                dropdown.style.right = (window.innerWidth - rect.right) + "px";

                menu.classList.add("open");
            }

        });

    });

    // close open dropdown on scroll (table scroll / page scroll)
    document.addEventListener("scroll", function () {
        document.querySelectorAll(".row-menu.open").forEach(m => {
            m.classList.remove("open");
        });
    }, true);

    // "View" -> reuse the student summary modal
    document.querySelectorAll(".row-view-btn").forEach(btn => {
        // hook up navigation/view logic here
    });

    // "Edit" -> hook up to your edit route/modal here
    document.querySelectorAll(".row-edit-btn").forEach(btn => {
        // hook up edit logic here
    });

    // Close any open dropdown when clicking outside of it
    document.addEventListener("click", function () {
        document.querySelectorAll(".row-menu.open").forEach(m => {
            m.classList.remove("open");
        });
    });

});


/* ============ AVATAR COLORS ============ */

//================ AVATAR COLOR ASSIGNMENT (CYCLED PALETTE) ==================//
function getAvatarColor(index) {

    const colors = [
        '#2563eb',
        '#16a34a',
        '#dc2626',
        '#9333ea',
        '#ea580c',
        '#0891b2',
        '#ca8a04',
        '#be123c'
    ];

    return colors[index % colors.length];
}

function applyAvatarColors() {

    document.querySelectorAll('.student-avatar').forEach((el, index) => {
        el.style.backgroundColor = getAvatarColor(index);
    });

}

//================ APPLY AVATAR COLORS ON PAGE LOAD ==================//
document.addEventListener("DOMContentLoaded", function () {
    applyAvatarColors();
});


/* ============ DATE FIELDS ============ */

//================ DATE PICKER TRIGGER + FUTURE-DATE VALIDATION ==================//
document.addEventListener("DOMContentLoaded", function () {

    const today = new Date().toISOString().split('T')[0];

    document.querySelectorAll('input[type="date"], input[type="time"]')
        .forEach(input => {

            input.addEventListener("click", function () {
                if (this.showPicker) {
                    this.showPicker();
                }
            });

        });

    const fromDate = document.querySelector('input[name="from_date"]');
    const toDate = document.querySelector('input[name="to_date"]');
    const error = document.getElementById("date-error");

    fromDate.max = today;
    toDate.max = today;

    function validateDate() {

        if (
            (fromDate.value && fromDate.value > today) ||
            (toDate.value && toDate.value > today)
        ) {
            if (error) error.innerText = "Future dates are not allowed";
        } else {
            if (error) error.innerText = "";
        }

    }

    fromDate.addEventListener("input", validateDate);
    toDate.addEventListener("input", validateDate);

    fromDate.addEventListener("change", validateDate);
    toDate.addEventListener("change", validateDate);

});



//================ RESET FILTERS BUTTON (CLEAR FORM + TABLE + SELECTIONS) ==================//

document.getElementById("resetBtn").addEventListener("click", function () {

    window.location.href = window.location.pathname;

    document.querySelectorAll("#filterForm input").forEach(input => {
        input.value = "";
    });

    document.querySelectorAll("#filterForm select").forEach(select => {
        select.selectedIndex = 0;
    });

    document.getElementById("search-error").innerText = "";

    document.querySelectorAll('.download-form input[type="hidden"]')
        .forEach(input => {
            input.value = "";
        });

    document.querySelectorAll(".attendance-row")
        .forEach(row => {
            row.style.display = "";
        });

    document.querySelectorAll(".row-check").forEach(cb => {
        cb.checked = false;
    });

    if (selectAllCheckbox()) selectAllCheckbox().checked = false;

    syncSelectedIds();

});

function selectAllCheckbox() {
    return document.getElementById("selectAll");
}


/* ============ CLIENT-SIDE FILTERS ============ */

//================ APPLY FILTERS (SEARCH/STATUS/BATCH/COURSE/DATE) TO TABLE ROWS ==================//
function applyFilters() {

    const search =
        document.querySelector('input[name="search"]').value.toLowerCase();

    const fromDate =
        document.querySelector('input[name="from_date"]').value;

    const toDate =
        document.querySelector('input[name="to_date"]').value;

    const status =
        document.querySelector('select[name="status"]').value.toLowerCase();

    const batch =
        document.querySelector('select[name="batch"]').value;

    const course =
        document.querySelector('select[name="course_name"]').value.toLowerCase();

    document.querySelector('.download-form input[name="search"]').value =
        document.querySelector('input[name="search"]').value;

    document.querySelector('.download-form input[name="from_date"]').value =
        document.querySelector('input[name="from_date"]').value;

    document.querySelector('.download-form input[name="to_date"]').value =
        document.querySelector('input[name="to_date"]').value;

    document.querySelector('.download-form input[name="status"]').value =
        document.querySelector('select[name="status"]').value;

    document.querySelector('.download-form input[name="batch"]').value =
        document.querySelector('select[name="batch"]').value;

    document.querySelector('.download-form input[name="course_name"]').value =
        document.querySelector('select[name="course_name"]').value;

    document
        .querySelectorAll(".attendance-row")
        .forEach(row => {

            const rowDate = row.dataset.date;

            const show =

                (search === "" ||
                    row.dataset.name.includes(search) ||
                    row.dataset.id.includes(search))

                &&

                (status === "" ||
                    row.dataset.status === status)

                &&

                (batch === "" ||
                    row.dataset.batch === batch)

                &&

                (course === "" ||
                    row.dataset.course === course)

                &&

                (fromDate === "" ||
                    rowDate >= fromDate)

                &&

                (toDate === "" ||
                    rowDate <= toDate);

            row.style.display =
                show ? "" : "none";

        });

    syncSelectedIds();
}

//================ FILTER INPUT LISTENERS (KEYUP/CHANGE) ==================//
document.addEventListener(
    "DOMContentLoaded",
    function () {

        document
            .querySelectorAll('#filterForm input, #filterForm select')
            .forEach(el => {

                el.addEventListener("keyup", applyFilters);
                el.addEventListener("change", applyFilters);

            });

    }
);