// JS for the Attendance Dashboard page: live search refresh, batch grid
// filter/view toggle, attendance donut chart (+ hover tooltip), custom date calendar and sparklines.

//================ LIVE SEARCH - DEBOUNCED INPUT LISTENER ==================//
let timeout = null;

const searchInput = document.getElementById("searchInput");

if (searchInput) {
    searchInput.addEventListener("input", function () {

        clearTimeout(timeout);

        const query = this.value;

        timeout = setTimeout(() => {
            liveSearch(query);
        }, 300);
    });
}

//================ LIVE SEARCH - FETCH & REFRESH SUMMARY + BATCH DETAILS ==================//
// Refreshes the summary counters (and batch detail panel) from the
// dashboard-api endpoint, debounced by the input listener above
async function liveSearch(query) {

    const batchCard = document.getElementById("batchDetailCard");
    const batchList = document.getElementById("batchList");
    const titleEl = document.getElementById("dashboardTitle");

    if (!query.trim()) {

        if (titleEl) {
            titleEl.innerText = "Real-time overview of all batches and attendance status";
        }

        batchCard.style.display = "none";
        batchList.innerHTML = "";

        const res = await fetch('/api/dashboard-api/');
        const data = await res.json();

        document.getElementById("totalCount").innerText = data.total;
        document.getElementById("presentCount").innerText = data.present;
        document.getElementById("absentCount").innerText = data.absent;
        document.getElementById("lateCount").innerText = data.late;

        updateDonut(data.present, data.absent, data.late);

        return;
    }

    const res = await fetch(
        `/api/dashboard-api/?search=${encodeURIComponent(query)}`
    );

    const data = await res.json();

    if (titleEl) {
        titleEl.innerText = `Filtered results for "${query}"`;
    }

    document.getElementById("totalCount").innerText = data.total;
    document.getElementById("presentCount").innerText = data.present;
    document.getElementById("absentCount").innerText = data.absent;
    document.getElementById("lateCount").innerText = data.late;

    updateDonut(data.present, data.absent, data.late);

    batchList.innerHTML = "";

    data.batches.forEach(item => {

        batchList.innerHTML += `
            <div class="detail-row">
                <span class="label">Course :</span>
                <span>${item.course}</span>
            </div>

            <div class="detail-row">
                <span class="label">Batch :</span>
                <span>${item.batch}</span>
            </div>

            <div class="detail-row">
                <span class="label">Trainer :</span>
                <span>${item.trainer}</span>
            </div>

            <div class="detail-row">
                <span class="label">Timing :</span>
                 <span>${item.timing}</span>
            </div>

            <hr>
        `;
    });

    batchCard.style.display = "block";
}

/* ---- Batch overview local filter ---- */

//================ BATCH OVERVIEW - CLIENT-SIDE TEXT FILTER ==================//
const batchSearchInput = document.getElementById("batchSearchInput");
const batchesGrid = document.getElementById("batchesGrid");

if (batchSearchInput && batchesGrid) {

    batchSearchInput.addEventListener("input", function () {

        const q = this.value.trim().toLowerCase();
        const cards = batchesGrid.querySelectorAll(".batch-card");
        const noResults = document.getElementById("noBatchResults");
        let visibleCount = 0;

        cards.forEach(card => {
            const match = card.innerText.toLowerCase().includes(q);
            card.style.display = match ? "" : "none";
            if (match) visibleCount++;
        });

        // Cards irundhu, aana ellam hide aanaa mattum "No batches found" kaattum
        if (noResults) {
            noResults.style.display = (cards.length > 0 && visibleCount === 0) ? "" : "none";
        }
    });
}

/* ---- Grid / List view toggle ---- */

//================ BATCH OVERVIEW - GRID/LIST VIEW TOGGLE ==================//
// NOTE: We toggle a CSS class ("list-view") instead of setting an inline
// style directly. Inline styles (element.style.xxx) always win over the
// responsive @media rules in dashboard.css, so once "1fr" was set inline
// the grid would get permanently stuck at 1 column regardless of screen
// width/zoom/scaling. Using a class keeps the CSS cascade in control.
const viewButtons = document.querySelectorAll(".view-toggle button");

viewButtons.forEach((btn, index) => {

    btn.addEventListener("click", function () {

        viewButtons.forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        if (index === 1) {
            batchesGrid.classList.add("list-view");
        } else {
            batchesGrid.classList.remove("list-view");
        }
    });
});

//================ ATTENDANCE DONUT CHART (PRESENT / LATE / ABSENT - SEPARATE) ==================//
// Segments stored here so the hover tooltip can use them
let donutSegments = [];

function updateDonut(present, absent, late) {

    const donut = document.getElementById("attendanceDonut");
    if (!donut) return;

    const attendanceTotal = present + absent + late;

    const pct = donut.querySelector(".donut-pct");
    const label = donut.querySelector(".donut-label");

    // No attendance data
    if (attendanceTotal === 0) {

        donutSegments = [];
        donut.style.background = "conic-gradient(#d1d5db 0% 100%)";

        if (pct) {
            pct.style.display = "none";   // Hide 0%
        }

        if (label) {
            label.innerText = "No Attendance";
        }

        return;
    }

    // Show percentage again when attendance exists
    if (pct) {
        pct.style.display = "block";
    }

    // Each status gets its own separate segment
    const presentPct = (present / attendanceTotal) * 100;
    const latePct = (late / attendanceTotal) * 100;
    const absentPct = (absent / attendanceTotal) * 100;

    const presentEnd = presentPct;
    const lateEnd = presentPct + latePct;
    const absentEnd = lateEnd + absentPct;

    donutSegments = [
        { name: "Present", count: present, pct: presentPct, start: 0,          end: presentEnd, color: "#22c55e" },
        { name: "Late",    count: late,    pct: latePct,    start: presentEnd, end: lateEnd,    color: "#f59e0b" },
        { name: "Absent",  count: absent,  pct: absentPct,  start: lateEnd,    end: absentEnd,  color: "#ef4444" }
    ];

    donut.style.background = `
        conic-gradient(
            #22c55e 0% ${presentEnd}%,
            #f59e0b ${presentEnd}% ${lateEnd}%,
            #ef4444 ${lateEnd}% ${absentEnd}%
        )
    `;

    // Center shows Present only (late is not included)
    if (pct) {
        pct.innerText = `${Math.round(presentPct)}%`;
    }

    if (label) {
        label.innerText = "Present";
    }
}

//================ INITIALIZE DONUT CHART ON PAGE LOAD ==================//
document.addEventListener("DOMContentLoaded", function () {

    const present = parseInt(document.getElementById("presentCount").innerText) || 0;
    const absent = parseInt(document.getElementById("absentCount").innerText) || 0;
    const late = parseInt(document.getElementById("lateCount").innerText) || 0;

    updateDonut(present, absent, late);

});

//================ DONUT HOVER TOOLTIP ==================//
document.addEventListener("DOMContentLoaded", function () {

    const donut = document.getElementById("attendanceDonut");
    if (!donut) return;

    const tooltip = document.createElement("div");
    tooltip.className = "donut-tooltip";
    document.body.appendChild(tooltip);

    donut.addEventListener("mousemove", function (e) {

        if (!donutSegments.length) {
            tooltip.style.display = "none";
            return;
        }

        const rect = donut.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const outerR = rect.width / 2;
        const centerEl = donut.querySelector(".donut-center");
        const innerR = centerEl ? centerEl.getBoundingClientRect().width / 2 : outerR * 0.65;

        // Mouse is on the center hole (or outside), so no tooltip
        if (distance < innerR || distance > outerR) {
            tooltip.style.display = "none";
            return;
        }

        // Angle from top, clockwise (same as conic-gradient), as percent
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        const anglePct = (angle / 360) * 100;

        const seg = donutSegments.find(s => anglePct >= s.start && anglePct < s.end);

        if (!seg) {
            tooltip.style.display = "none";
            return;
        }

        tooltip.innerHTML = `
            <strong>${seg.name}</strong>
            <div><span class="donut-tooltip-dot" style="background:${seg.color}"></span>
            ${seg.name}: ${seg.count} (${seg.pct.toFixed(1)}%)</div>
        `;
        tooltip.style.display = "block";
        tooltip.style.left = (e.clientX + 14) + "px";
        tooltip.style.top = (e.clientY + 14) + "px";
    });

    donut.addEventListener("mouseleave", function () {
        tooltip.style.display = "none";
    });
});


// ------------------------------------------------------------
// Custom attendance-date calendar.
// Only dates that actually have attendance records (passed in
// from the view as JSON) are shown as clickable — every other
// day, including anything in the future, is greyed out.
// ------------------------------------------------------------

//================ CALENDAR STATE - AVAILABLE ATTENDANCE DATES (FROM JSON) ==================//
var availableAttendanceDates = [];

try {
    var availableDatesEl = document.getElementById("availableDatesData");
    if (availableDatesEl) {
        availableAttendanceDates = JSON.parse(availableDatesEl.textContent);
    }
} catch (err) {
    availableAttendanceDates = [];
}

var availableDatesSet = {};
availableAttendanceDates.forEach(function (d) {
    availableDatesSet[d] = true;
});

//================ CALENDAR STATE - CURRENT MONTH/YEAR + HELPERS ==================//
var todayIso = new Date().toISOString().slice(0, 10);

var selectedDateInput = document.getElementById("attendanceDatePicker");
var initialValue = selectedDateInput ? selectedDateInput.value : todayIso;
var initialParts = initialValue.split("-").map(Number);

// The month currently shown in the calendar dropdown.
var calendarYear = initialParts[0];
var calendarMonth = initialParts[1] - 1; // JS months are 0-indexed

var monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function pad(n) {
    return n < 10 ? "0" + n : "" + n;
}

function toIsoDate(year, month, day) {
    return year + "-" + pad(month + 1) + "-" + pad(day);
}

//================ CALENDAR - OPEN/CLOSE TOGGLE ==================//
function toggleAttendanceCalendar(event) {
    event.stopPropagation();
    var panel = document.getElementById("customCalendarPanel");
    var isOpen = panel.classList.contains("open");

    if (isOpen) {
        panel.classList.remove("open");
    } else {
        renderAttendanceCalendar();
        panel.classList.add("open");
    }
}

//================ CALENDAR - CHANGE MONTH (PREV/NEXT) ==================//
function changeCalendarMonth(delta) {
    calendarMonth += delta;

    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear -= 1;
    } else if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear += 1;
    }

    renderAttendanceCalendar();
}

//================ CALENDAR - RENDER MONTH GRID (DISABLE FUTURE/NO-DATA DAYS) ==================//
function renderAttendanceCalendar() {
    document.getElementById("calendarMonthLabel").textContent =
        monthNames[calendarMonth] + " " + calendarYear;

    var grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    var firstDayWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
    var daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    var currentValue = document.getElementById("attendanceDatePicker").value;

    // Blank filler cells so day 1 lands in the right weekday column.
    for (var i = 0; i < firstDayWeekday; i++) {
        var blank = document.createElement("span");
        blank.className = "calendar-day empty";
        grid.appendChild(blank);
    }

    for (var day = 1; day <= daysInMonth; day++) {
        var isoDate = toIsoDate(calendarYear, calendarMonth, day);
        var cell = document.createElement("span");
        cell.className = "calendar-day";
        cell.textContent = day;

        var isFuture = isoDate > todayIso;
        var hasData = !!availableDatesSet[isoDate];

        if (isFuture || !hasData) {
            cell.classList.add("disabled");
        } else {
            cell.classList.add("available");

            if (isoDate === currentValue) {
                cell.classList.add("selected");
            }

            (function (dateForClick) {
                cell.addEventListener("click", function () {
                    pickAttendanceDate(dateForClick);
                });
            })(isoDate);
        }

        grid.appendChild(cell);
    }
}

//================ CALENDAR - PICK DATE & SUBMIT FILTER FORM ==================//
function pickAttendanceDate(isoDate) {
    document.getElementById("attendanceDatePicker").value = isoDate;
    document.getElementById("customCalendarPanel").classList.remove("open");
    document.getElementById("dateFilterForm").submit();
}

//================ CALENDAR - CLOSE ON OUTSIDE CLICK ==================//
// Close the calendar when clicking anywhere outside of it.
document.addEventListener("click", function (event) {
    var panel = document.getElementById("customCalendarPanel");
    var pill = document.getElementById("datePillTrigger");

    if (!panel || !pill) return;

    if (!panel.contains(event.target) && !pill.contains(event.target)) {
        panel.classList.remove("open");
    }
});

//================ CALENDAR - PREVENT INSIDE CLICKS FROM BUBBLING/CLOSING ==================//
// Prevent clicks inside the calendar panel from bubbling up to
// the document listener above and immediately closing it.
document.addEventListener("DOMContentLoaded", function () {
    var panel = document.getElementById("customCalendarPanel");
    if (panel) {
        panel.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    }
});

//================ SPARKLINE CHART DRAWING (CANVAS) ==================//
// Draws a small wavy trend line with a soft fill underneath.
// points are just relative y-values between 0 (top) and 1 (bottom).
function drawSparkline(canvasId, points, color) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    var width = canvas.width;
    var height = canvas.height;
    var stepX = width / (points.length - 1);

    function getX(i) {
        return i * stepX;
    }

    function getY(value) {
        return height - (value * (height - 6)) - 3;
    }

    // Build a smooth curve through the points by drawing a
    // quadratic curve to the midpoint between each pair of points.
    function tracePath() {
        ctx.moveTo(getX(0), getY(points[0]));

        for (var i = 0; i < points.length - 1; i++) {
            var x1 = getX(i);
            var y1 = getY(points[i]);
            var x2 = getX(i + 1);
            var y2 = getY(points[i + 1]);
            var midX = (x1 + x2) / 2;
            var midY = (y1 + y2) / 2;

            ctx.quadraticCurveTo(x1, y1, midX, midY);
        }

        var last = points.length - 1;
        ctx.quadraticCurveTo(getX(last), getY(points[last]), getX(last), getY(points[last]));
    }

    // Filled area under the curve first.
    ctx.beginPath();
    tracePath();
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    var gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + "55");
    gradient.addColorStop(1, color + "00");
    ctx.fillStyle = gradient;
    ctx.fill();

    // The curved line itself, drawn on top of the fill.
    ctx.beginPath();
    tracePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
}

//================ INITIALIZE SPARKLINES ON PAGE LOAD ==================//
document.addEventListener("DOMContentLoaded", function () {
    drawSparkline("sparkTotal", [0.7, 0.9, 0.3, 0.6, 0.8, 0.5], "#a78bfa");
    drawSparkline("sparkPresent", [0.3, 0.5, 0.8, 0.6, 0.9, 0.55], "#4ade80");
    drawSparkline("sparkAbsent", [0.8, 0.35, 0.85, 0.4, 0.75, 0.45], "#f87171");
    drawSparkline("sparkLate", [0.4, 0.85, 0.3, 0.75, 0.35, 0.8], "#fbbf24");
});