document.addEventListener("DOMContentLoaded", () => {

    const toggle =
        document.getElementById("menuToggle");

    const sidebar =
        document.getElementById("navLinks");

    toggle.addEventListener("click", () => {

        sidebar.classList.toggle("show");

    });

});



setTimeout(() => {

    const alerts = document.querySelectorAll(".alert");

    alerts.forEach(alert => {

        alert.style.display = "none";

    });

}, 3000);