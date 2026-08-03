const attendanceChart = document.getElementById(
    'attendanceChart'
);

const monthlyPresent = JSON.parse(
    document.getElementById(
        "monthly-present"
    ).textContent
);

const monthlyAbsent = JSON.parse(
    document.getElementById(
        "monthly-absent"
    ).textContent
);

const monthlyLate = JSON.parse(
    document.getElementById(
        "monthly-late"
    ).textContent
);

const batchLabels = JSON.parse(
    document.getElementById(
        "batch-labels"
    ).textContent
);

const batchCounts = JSON.parse(
    document.getElementById(
        "batch-counts"
    ).textContent
);

const presentList = JSON.parse(
    document.getElementById(
        "batch-present-list"
    ).textContent
);

const absentList = JSON.parse(
    document.getElementById(
        "batch-absent-list"
    ).textContent
);

const lateList = JSON.parse(
    document.getElementById(
        "batch-late-list"
    ).textContent
);

const percentageList = JSON.parse(
    document.getElementById(
        "batch-percentage-list"
    ).textContent
);

const latestMonth = JSON.parse(
    document.getElementById(
        "latest-month"
    ).textContent
);

const attendanceChartInstance = new Chart(
    attendanceChart,
    {
        type: 'bar',

        data: {

            labels: [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
            ],

            datasets: [

                {
                    label: 'Present',

                    data: monthlyPresent,

                    backgroundColor: '#22c55e',

                    borderRadius: 8,

                    barThickness: 18

                },

                {
                    label: 'Absent',

                    data: monthlyAbsent,

                    backgroundColor: '#ef4444',

                    borderRadius: 8,

                    barThickness: 18

                },

                {
                    label: 'Late',

                    data: monthlyLate,

                    backgroundColor: '#f59e0b',

                    borderRadius: 8,

                    barThickness: 18

                }

            ]

        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: 'index',
                intersect: false
            },

            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }

            }

        }

    }
);

const batchChart = document.getElementById(
    'batchChart'
);

const colorPalette = [
    '#22c55e',
    '#2563eb',
    '#f59e0b',
    '#7c3aed',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#84cc16',
    '#f97316'
];

const colors = [
    '#2563eb',
    '#16a34a',
    '#dc2626',
    '#9333ea',
    '#ea580c',
    '#0891b2',
    '#ca8a04',
    '#be123c',
    '#22c55e',
    '#f59e0b'
];

const chartColors = batchLabels.map(
    (_, index) => colors[index % colors.length]
);

let batchChartInstance = null;

if (batchChart) {
    batchChartInstance = new Chart(
        batchChart,
        {
            type: 'doughnut',

            data: {

                labels: batchLabels,

                datasets: [{

                    data: batchCounts,

                    backgroundColor: chartColors,

                    borderWidth: 0

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: '70%',

                plugins: {

                    legend: {
                        position: 'right'
                    },

                    tooltip: {
                        displayColors: false,

                        callbacks: {

                            title: function (context) {

                                return batchLabels[
                                    context[0].dataIndex
                                ];

                            },

                            label: function (context) {

                                let index =
                                    context.dataIndex;

                                return [

                                    "🟩 Present : " +
                                    presentList[index],

                                    "🟥 Absent : " +
                                    absentList[index],

                                    "🟨 Late : " +
                                    lateList[index],

                                    "📊 Attendance : " +
                                    (percentageList[index] || 0) + "%"

                                ];

                            }

                        }

                    }

                }

            }

        }
    );
}


const batchPerformanceLabels = JSON.parse(
    document.getElementById(
        "batch-performance-labels"
    ).textContent
);

const batchPerformanceCounts = JSON.parse(
    document.getElementById(
        "batch-performance-counts"
    ).textContent
);

const batchPerformanceChart =
    document.getElementById(
        "batchPerformanceChart"
    );

if (batchPerformanceChart) {
new Chart(
    batchPerformanceChart,
    {
        type: "bar",

        data: {

            labels:
                batchPerformanceLabels,

            datasets: [

                {
                    label:
                        "Attendance %",

                    data:
                        batchPerformanceCounts,

                    backgroundColor:
                        "#2563eb",

                    borderRadius: 8
                }
            ]
        },

        options: {

            indexAxis: "y",

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                x: {

                    beginAtZero: true,

                    max: 100
                }
            }
        }
    }
);
}
// ---------- Attendance Distribution (Present / Absent / Late / Incomplete) ----------
// Only affected by the "Min % (Distribution)" filter.

const distributionData = JSON.parse(
    document.getElementById("distribution-data").textContent
);

const distributionChartCanvas = document.getElementById("distributionChart");

let distributionChartInstance = null;

if (distributionChartCanvas) {
    distributionChartInstance = new Chart(distributionChartCanvas, {
        type: "doughnut",
        data: {
            labels: ["Present", "Absent", "Late", "Incomplete"],
            datasets: [{
                data: [
                    distributionData.present,
                    distributionData.absent,
                    distributionData.late,
                    distributionData.incomplete
                ],
                backgroundColor: ["#22c55e", "#ef4444", "#f59e0b", "#94a3b8"],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
                legend: { position: "right" },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pctKey = [
                                "present_pct",
                                "absent_pct",
                                "late_pct",
                                "incomplete_pct"
                            ][context.dataIndex];
                            return `${context.label}: ${context.raw} (${distributionData[pctKey]}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ---------- Batch-wise Attendance (independent dropdown selector) ----------

const allBatchLabels = JSON.parse(
    document.getElementById("all-batch-labels").textContent
);
const allBatchIds = JSON.parse(
    document.getElementById("all-batch-ids").textContent
);
const allBatchPresentList = JSON.parse(
    document.getElementById("all-batch-present-list").textContent
);
const allBatchAbsentList = JSON.parse(
    document.getElementById("all-batch-absent-list").textContent
);
const allBatchLateList = JSON.parse(
    document.getElementById("all-batch-late-list").textContent
);
const allBatchPercentageList = JSON.parse(
    document.getElementById("all-batch-percentage-list").textContent
);

const batchWiseSelector = document.getElementById("batchWiseSelector");

if (batchWiseSelector) {

    allBatchIds.forEach((id, index) => {
        const option = document.createElement("option");
        option.value = String(id);
        option.textContent = allBatchLabels[index];
        batchWiseSelector.appendChild(option);
    });

    batchWiseSelector.addEventListener("change", function () {

        const selectedId = this.value;

        if (selectedId === "") {
            // "All Batches" selected — restore the existing batch chart as-is.
            if (batchChartInstance) {
                batchChartInstance.data.labels = batchLabels;
                batchChartInstance.data.datasets[0].data = batchCounts;
                batchChartInstance.data.datasets[0].backgroundColor = chartColors;
                batchChartInstance.update();
            }
            return;
        }

        const index = allBatchIds.findIndex(
            id => String(id) === selectedId
        );

        if (index === -1) return;

        const present = allBatchPresentList[index];
        const absent = allBatchAbsentList[index];
        const late = allBatchLateList[index];

        if (batchChartInstance) {
            batchChartInstance.data.labels = ["Present", "Absent", "Late"];
            batchChartInstance.data.datasets[0].data = [present, absent, late];
            batchChartInstance.data.datasets[0].backgroundColor = [
                "#22c55e", "#ef4444", "#f59e0b"
            ];
            batchChartInstance.update();
        }
    });
}

// filters

function applyFilters() {

    let visibleCount = 0;

    const totalCount =
        document.querySelectorAll(
            ".report-row"
        ).length;

    const name =
        document.getElementById(
            "studentNameFilter"
        ).value.toLowerCase().trim();

    const course =
        document.getElementById(
            "courseFilter"
        ).value.toLowerCase().trim();

    const batch =
        document.getElementById(
            "batchFilter"
        ).value.toLowerCase().trim();


    const status =
        document.getElementById(
            "statusFilter"
        ).value.toLowerCase().trim();
    const student_name =
        document.getElementById(
            "studentNameFilter"
        ).value;



    const attendance =
        document.getElementById(
            "attendanceFilter"
        ).value.trim();

    document.querySelectorAll(
        ".report-row"
    ).forEach(row => {

        const studentName =
            row.dataset.name.toLowerCase();

        const studentCourse =
            row.dataset.course.toLowerCase();

        const studentStatus =
            row.dataset.status.toLowerCase();

        const studentAttendance =
            parseFloat(
                row.dataset.attendance
            );

        let attendanceMatch = true;

        if (attendance !== "") {

            attendanceMatch =
                Math.floor(studentAttendance) ===
                parseInt(attendance);

        }

        const show =

            (name === "" ||
                studentName.startsWith(name))

            &&


            (course === "" ||
                studentCourse === course)

            &&

            (batch === "" ||
                row.dataset.batch === batch)

            &&

            (status === "" ||
                studentStatus === status)

            &&

            attendanceMatch;

        row.style.display =
            show ? "" : "none";

        if (show) {

            visibleCount++;

        }

    });
    if (visibleCount === 0) {

        document.getElementById(
            "noResultsMessage"
        ).style.display = "block";

    } else {

        document.getElementById(
            "noResultsMessage"
        ).style.display = "none";

    }

    // document.getElementById("resultsCount").textContent = `Showing ${visibleCount} of ${totalCount} Students`;

}

/* document.querySelectorAll(
     ".filter-input,.filter-select"
 ).forEach(input => {
 
     input.addEventListener(
         "keyup",
         applyFilters
     );
 
     input.addEventListener(
         "change",
         applyFilters
     );
 
 });*/

// ---------- Live filtering via AJAX (no full page reload) ----------

function buildFilterParams() {

    const params = {
        student_name: document.getElementById("studentNameFilter").value,
        course: document.getElementById("courseFilter").value,
        batch: document.getElementById("batchFilter").value,
        status: document.getElementById("statusFilter").value,
        attendance: document.getElementById("attendanceFilter").value,
        date_from: document.getElementById("dateFromFilter").value,
        date_to: document.getElementById("dateToFilter").value,
        distribution_percentage:
            document.getElementById("distributionPercentageFilter").value,
    };

    const query = new URLSearchParams();

    Object.keys(params).forEach(key => {
        if (params[key]) {
            query.set(key, params[key]);
        }
    });

    return query;
}

function setLoadingState(isLoading) {

    const applyBtn = document.getElementById("showAllBtn");

    if (applyBtn) {
        applyBtn.disabled = isLoading;
        applyBtn.style.opacity = isLoading ? "0.6" : "1";
    }
}

function applyFiltersLive(query) {

    setLoadingState(true);

    const url = "?" + query.toString();

    fetch(url, {
        headers: { "X-Requested-With": "XMLHttpRequest" }
    })
        .then(response => response.json())
        .then(data => {

            // Update URL bar without reloading the page.
            window.history.pushState({}, "", url);

            // Monthly Attendance Chart
            if (attendanceChartInstance) {
                attendanceChartInstance.data.datasets[0].data = data.monthly_present;
                attendanceChartInstance.data.datasets[1].data = data.monthly_absent;
                attendanceChartInstance.data.datasets[2].data = data.monthly_late;
                attendanceChartInstance.update();
            }

            const monthlyTitleEl = document.getElementById("monthlyChartTitle");
            if (monthlyTitleEl) {
                monthlyTitleEl.textContent = data.monthly_chart_title;
            }

            // Attendance Distribution chart
            if (distributionChartInstance) {
                const d = data.distribution_data;
                distributionChartInstance.data.datasets[0].data = [
                    d.present, d.absent, d.late, d.incomplete
                ];
                distributionChartInstance.options.plugins.tooltip.callbacks.label =
                    function (context) {
                        const pctKey = [
                            "present_pct", "absent_pct", "late_pct", "incomplete_pct"
                        ][context.dataIndex];
                        return `${context.label}: ${context.raw} (${d[pctKey]}%)`;
                    };
                distributionChartInstance.update();
            }

            // Student Performance Report table
            const tbody = document.getElementById("reportTableBody");
            if (tbody) {
                tbody.innerHTML = data.table_rows_html;
            }

            const footer = document.getElementById("reportTableFooter");
            if (footer) {
                const count = data.record_count;
                footer.textContent =
                    `Showing all ${count} record${count === 1 ? "" : "s"} — single page, no pagination.`;
            }

            const noResults = document.getElementById("noResultsMessage");
            if (noResults) {
                noResults.style.display = data.record_count === 0 ? "block" : "none";
            }

            const filterMessage = document.getElementById("filterMessage");
            if (filterMessage) {
                filterMessage.innerHTML = data.filter_message_html;
            }

            setLoadingState(false);
        })
        .catch(err => {
            console.error("Live filter update failed:", err);
            setLoadingState(false);
        });
}

document.getElementById(
    "clearFilters"
).addEventListener(
    "click",
    function () {

        document.getElementById("studentNameFilter").value = "";
        document.getElementById("courseFilter").value = "";
        document.getElementById("batchFilter").value = "";
        document.getElementById("statusFilter").value = "";
        document.getElementById("attendanceFilter").value = "";
        document.getElementById("dateFromFilter").value = "";
        document.getElementById("dateToFilter").value = "";
        document.getElementById("distributionPercentageFilter").value = "";

        applyFiltersLive(new URLSearchParams());

    }
);

/* Select all btn */
document.getElementById(
    "showAllBtn"
).addEventListener(
    "click",
    function () {

        applyFiltersLive(buildFilterParams());

    }
);