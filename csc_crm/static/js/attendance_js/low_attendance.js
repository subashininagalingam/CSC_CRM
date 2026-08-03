const csrftoken = "{{ csrf_token }}";

// ---------- helpers ----------

function showPopup(message, isError = false) {
    Swal.fire({
        icon: isError ? "error" : "success",
        title: isError ? "Failed" : "Success",
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}

function showLoading(title) {
    Swal.fire({
        icon: "info",
        title: title,
        text: "Please wait...",
        allowOutsideClick: false,
        showConfirmButton: false
    });
}

function sendEmailAll() {

    Swal.fire({
        icon: "info",
        title: "Sending Emails",
        text: "Please wait...",
        allowOutsideClick: false,
        showConfirmButton: false
    });

    fetch("/api/send-email-all/")

        .then(response => response.json())

        .then(data => {

            Swal.close();

            showPopup(data.message);

        })

        .catch(error => {

            showPopup(
                "❌ Email Sending Failed",
                true
            );

        });

}

function sendSMSAll() {

    Swal.fire({
        icon: "info",
        title: "Sending SMS",
        text: "Please wait...",
        allowOutsideClick: false,
        showConfirmButton: false
    });

    fetch("/api/send-sms-all/")

        .then(response => response.json())

        .then(data => {

            Swal.close();

            showPopup(data.message);

        })

        .catch(error => {

            showPopup(
                "❌ SMS Sending Failed",
                true
            );

        });

}

function sendMonthlyReport() {

    Swal.fire({
        icon: "info",
        title: "Generating Monthly Report",
        text: "Please wait...",
        allowOutsideClick: false,
        showConfirmButton: false
    });

    fetch("/api/send-monthly-report/")

        .then(response => response.json())

        .then(data => {

            Swal.close();

            showPopup(data.message);

        })

        .catch(error => {

            showPopup(
                "❌ Monthly Report Sending Failed",
                true
            );

        });

}

document.querySelectorAll(".mail-btn").forEach(button => {

    button.addEventListener("click", function (e) {

        e.preventDefault();

        if (this.href.includes("send_sms")) {

            Swal.fire({
                icon: "info",
                title: "Sending SMS",
                text: "Please wait...",
                allowOutsideClick: false,
                showConfirmButton: false
            });

        } else {

            Swal.fire({
                icon: "info",
                title: "Sending Email",
                text: "Please wait...",
                allowOutsideClick: false,
                showConfirmButton: false
            });
        }

        fetch(this.href)

            .then(response => response.json())

            .then(data => {

                Swal.close();

                showPopup(data.message);

            })

            .catch(error => {

                showPopup(
                    "❌ Notification Sending Failed",
                    true
                );

                setTimeout(() => {
                    msg.classList.add("d-none");
                }, 1000);

            });

    });

});

// ---------- last updated time ----------

document.getElementById("lastUpdatedTime").textContent =
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// ---------- per-row SMS / Email buttons ----------

document.querySelectorAll(".ajax-action-btn").forEach(function (button) {

    button.addEventListener("click", function (e) {

        e.preventDefault();

        showLoading(this.dataset.type === "sms" ? "Sending SMS" : "Sending Email");

        fetch(this.href)
            .then(response => response.json())
            .then(data => {
                Swal.close();
                showPopup(data.message);
            })
            .catch(() => {
                Swal.close();
                showPopup("❌ Notification Sending Failed", true);
            });

    });

});

// ---------- select all (per section) ----------

document.querySelectorAll(".select-all-checkbox").forEach(function (checkbox) {

    checkbox.addEventListener("change", function () {

        const section = document.getElementById(this.dataset.target);

        section.querySelectorAll(".row-checkbox").forEach(function (rowCheckbox) {
            rowCheckbox.checked = checkbox.checked;
        });

    });

});

// ---------- bulk send to selected rows in a section ----------

function sendSectionNotification(sectionId, type) {

    const section = document.getElementById(sectionId);

    const ids = Array.from(
        section.querySelectorAll(".row-checkbox:checked")
    ).map(cb => parseInt(cb.dataset.id, 10));

    if (ids.length === 0) {
        showPopup("Please select at least one student", true);
        return;
    }

    showLoading(type === "sms" ? "Sending SMS" : "Sending Emails");

    fetch("/api/send-bulk-notification/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({ type: type, enrollment_ids: ids })
    })
        .then(response => response.json())
        .then(data => {

            Swal.close();

            // Clear selected checkboxes
            section.querySelectorAll(".row-checkbox:checked").forEach(cb => {
                cb.checked = false;
            });

            // Clear Select All checkbox
            const selectAll = section.querySelector(".select-all-checkbox");
            if (selectAll) {
                selectAll.checked = false;
            }

            showPopup(data.message);

        })

        .catch(() => {
            Swal.close();
            showPopup("❌ Notification Sending Failed", true);
        });

}

// ---------- export dropdown ----------

function toggleExportMenu(button) {

    const menu = button.nextElementSibling;

    document.querySelectorAll(".export-menu").forEach(function (otherMenu) {
        if (otherMenu !== menu) otherMenu.classList.remove("open");
    });

    menu.classList.toggle("open");

}

document.addEventListener("click", function (e) {
    if (!e.target.closest(".alert-section-actions")) {
        document.querySelectorAll(".export-menu").forEach(m => m.classList.remove("open"));
    }
});

// ---------- pagination (per section) ----------

const PAGE_SIZE = 3;

function setupPagination(sectionId, colorClass) {

    const section = document.getElementById(sectionId);
    const rows = Array.from(section.querySelectorAll("tbody tr.data-row"));
    const footerCount = section.querySelector(".footer-count");
    const pagerEl = section.querySelector(".pager");

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    let currentPage = 1;

    function renderPage() {

        const start = (currentPage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        rows.forEach(function (row, index) {
            row.style.display = (index >= start && index < end) ? "" : "none";
        });

        if (total === 0) {
            footerCount.textContent = "Showing 0 of 0 students";
        } else {
            footerCount.textContent =
                `Showing ${start + 1} to ${Math.min(end, total)} of ${total} students`;
        }

        renderPager();

    }

    function renderPager() {

        pagerEl.innerHTML = "";

        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener("click", function () {
            if (currentPage > 1) { currentPage--; renderPage(); }
        });
        pagerEl.appendChild(prevBtn);

        for (let page = 1; page <= totalPages; page++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = page;
            if (page === currentPage) pageBtn.classList.add("active", colorClass);
            pageBtn.addEventListener("click", function () {
                currentPage = page;
                renderPage();
            });
            pagerEl.appendChild(pageBtn);
        }

        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener("click", function () {
            if (currentPage < totalPages) { currentPage++; renderPage(); }
        });
        pagerEl.appendChild(nextBtn);

    }

    renderPage();

}

setupPagination("criticalSection", "critical");
setupPagination("warningSection", "warning");

// ==========================================
//          FILTER FORM VALIDATION
// ==========================================

const lowAttendanceFilterForm = document.getElementById("filterForm");
const studentNameFilter = document.getElementById("studentNameFilter");
const percentageFilter = document.getElementById("percentageFilter");

// helper: create (or reuse) a small error tag right after a field
function getLowAttendanceFieldError(input) {

    if (!input) return null;

    let el = input.parentElement.querySelector(".field-error");

    if (!el) {
        el = document.createElement("small");
        el.className = "field-error";
        el.style.color = "red";
        el.style.display = "block";
        el.style.marginTop = "4px";
        input.insertAdjacentElement("afterend", el);
    }

    return el;

}

const studentNameError = getLowAttendanceFieldError(studentNameFilter);
const percentageError = getLowAttendanceFieldError(percentageFilter);


/*=========================================
        STUDENT NAME — letters, numbers, spaces only
=========================================*/

function validateStudentNameFilter() {

    if (!studentNameFilter || !studentNameError) return true;

    // strip out anything that isn't a letter, number, or space, live
    studentNameFilter.value = studentNameFilter.value.replace(/[^A-Za-z0-9 ]/g, "");

    if (studentNameFilter.value.trim() !== "" && !/^[A-Za-z0-9 ]+$/.test(studentNameFilter.value)) {

        studentNameError.innerText = "Only letters, numbers and spaces allowed";
        return false;

    } else {

        studentNameError.innerText = "";
        return true;

    }

}

if (studentNameFilter) {
    studentNameFilter.addEventListener("input", validateStudentNameFilter);
}


/*=========================================
        ATTENDANCE % — number between 0 and 100
=========================================*/

function validatePercentageFilter() {

    if (!percentageFilter || !percentageError) return true;

    // strip out anything that isn't a digit or a single decimal point, live
    let cleaned = percentageFilter.value.replace(/[^0-9.]/g, "");

    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    }

    percentageFilter.value = cleaned;

    if (cleaned.trim() === "") {

        percentageError.innerText = "";
        return true;

    }

    const value = parseFloat(cleaned);

    if (isNaN(value) || value < 0 || value > 100) {

        percentageError.innerText = "Attendance % must be between 0 and 100";
        return false;

    } else {

        percentageError.innerText = "";
        return true;

    }

}

if (percentageFilter) {
    percentageFilter.addEventListener("input", validatePercentageFilter);
}


/*=========================================
        BLOCK SUBMIT IF ANYTHING IS INVALID
=========================================*/

if (lowAttendanceFilterForm) {

    lowAttendanceFilterForm.addEventListener("submit", function (e) {

        const validName = validateStudentNameFilter();
        const validPercentage = validatePercentageFilter();

        if (!validName || !validPercentage) {
            e.preventDefault();
        }

    });

}

// ---------- filters ----------

document.getElementById("clearFilters").addEventListener("click", function () {

    if (studentNameError) studentNameError.innerText = "";
    if (percentageError) percentageError.innerText = "";

    window.location.href = window.location.pathname;
});