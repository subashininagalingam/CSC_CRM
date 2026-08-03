// JS for the Student List page: delete confirmation, row action dropdown,
// export format validation, and the search/reset filter behaviour.

// Shows a confirm popup before actually following the delete link
function confirmDelete(event, url) {
    event.preventDefault();

    Swal.fire({
        title: "Are you sure?",
        text: "This student will be deleted permanently!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = url;
        }
    });
}


//  DROPDOWN MENU


function toggleDropdown(button) {

    const dropdown = button.nextElementSibling;
    const isOpen = dropdown.classList.contains("show");

    // close all dropdowns first
    document.querySelectorAll(".dropdown-content").forEach(d => {
        d.classList.remove("show");
    });

    if (!isOpen) {
        const rect = button.getBoundingClientRect();

        dropdown.style.top = (rect.bottom + 4) + "px";
        dropdown.style.left = "auto";
        dropdown.style.right = (window.innerWidth - rect.right) + "px";

        dropdown.classList.add("show");
    }
}

// outside click close
document.addEventListener("click", function (e) {

    if (!e.target.matches('.dots')) {

        document.querySelectorAll(".dropdown-content").forEach(d => {
            d.classList.remove("show");
        });

    }

});

// close open dropdown on scroll (table scroll / page scroll)
document.addEventListener("scroll", function () {
    document.querySelectorAll(".dropdown-content.show").forEach(d => {
        d.classList.remove("show");
    });
}, true);

// Makes sure a download format (excel/pdf) is picked before submitting the download form
function validateFormat() {

    let format = document.getElementById("format").value;
    let error = document.getElementById("error-msg");

    if (format === "") {
        error.innerText = "Please select one format";
        return false;
    }

    error.innerText = "";
    return true;
}


const form = document.getElementById("filterForm");
const error = document.getElementById("search-error");

// Require at least one filter to be filled before searching
form.addEventListener("submit", function (e) {

    const inputs = form.querySelectorAll("input");
    const selects = form.querySelectorAll("select");

    let hasValue = false;

    // CHECK INPUTS
    inputs.forEach(input => {
        if (input.value.trim() !== "") {
            hasValue = true;
        }
    });

    // CHECK SELECTS
    selects.forEach(select => {
        if (select.value.trim() !== "") {
            hasValue = true;
        }
    });

    // ALL EMPTY
    if (!hasValue) {

        e.preventDefault();

        error.innerText = "Enter at least one filter";
        error.style.color = "red";

    } else {

        error.innerText = "";

    }

});


// RESET
document.getElementById("resetBtn").addEventListener("click", function () {

    // CLEAR INPUTS
    form.querySelectorAll("input").forEach(input => {
        input.value = "";
    });

    // RESET SELECTS
    form.querySelectorAll("select").forEach(select => {
        select.selectedIndex = 0;
    });

    // CLEAR ERROR
    error.innerText = "";

    // REMOVE URL PARAMS
    window.history.replaceState({}, document.title, window.location.pathname);

    fetch(window.location.pathname)
        .then(response => response.text())
        .then(data => {

            let parser = new DOMParser();
            let doc = parser.parseFromString(data, "text/html");

            // TABLE UPDATE
            document.querySelector(".table-wrapper").innerHTML =
                doc.querySelector(".table-wrapper").innerHTML;

            // TOTAL STUDENTS UPDATE
            document.querySelector(".total-count").innerHTML =
                doc.querySelector(".total-count").innerHTML;

            // PAGINATION INFO UPDATE
            document.querySelector(".pagination-info").innerHTML =
                doc.querySelector(".pagination-info").innerHTML;

            // PAGINATION BUTTONS UPDATE
            document.querySelector(".pagination-buttons").innerHTML =
                doc.querySelector(".pagination-buttons").innerHTML;

        });

});