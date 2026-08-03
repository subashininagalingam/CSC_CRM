// Call-Logs //
    
    function openPopup(name, date, time, duration, outcome, notes, follow) {
        document.getElementById("p_name").innerText = name;
        document.getElementById("p_date").innerText = date;
        document.getElementById("p_time").innerText = time;
        document.getElementById("p_duration").innerText = duration;
        document.getElementById("p_outcome").innerText = outcome;
        document.getElementById("p_notes").innerText = notes;
        document.getElementById("p_follow").innerText = follow;

        document.getElementById("popup").style.display = "block";
    }

    function closePopup() {
        document.getElementById("popup").style.display = "none";
    }

function onlyLetters(input) {

    input.value = input.value.replace(/[^A-Za-z\s]/g, '');

}


function validateForm() {

    let name = document.getElementById("lead_name").value.trim();

    let error = document.getElementById("name_error");

    if (name === "") {

        error.innerText = "Please enter a name";
        return false;
    }

    else {

        error.innerText = "";
        return true;
    }
}
window.onload = function () {

    let today = new Date().toISOString().split("T")[0];

    document.getElementById("call_date").setAttribute("max", today);

}
window.onload = function () {

    let today = new Date().toISOString().split("T")[0];

   
    document.getElementById("call_date").setAttribute("max", today);

    
    document.getElementById("next_followup_date").setAttribute("min", today);

}

window.onload = function () {

    let today = new Date().toISOString().split("T")[0];

    document.getElementById("call_date").setAttribute("max", today);

    document.getElementById("next_followup_date").setAttribute("min", today);

    toggleFollowupRequired();

    document.getElementById("call_outcome").addEventListener("change", toggleFollowupRequired);
}

function toggleFollowupRequired() {

    let outcome = document.getElementById("call_outcome").value;

    let followup = document.getElementById("next_followup_date");

    if (outcome === "Not Interested") {

        followup.required = false;
        followup.value = "";

    } else {

        followup.required = true;
    }
}