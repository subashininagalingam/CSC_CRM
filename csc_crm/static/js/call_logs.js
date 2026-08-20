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

// ---------------- Lead Name Search (Contact Name autocomplete) ----------------

let leadSearchTimer = null;
let selectedLeadId = null;

function searchLeadName(query) {

    selectedLeadId = null;

    const box = document.getElementById("lead_suggestions");

    clearTimeout(leadSearchTimer);

    query = query.trim();

    if (query.length < 2) {
        box.innerHTML = "";
        box.style.display = "none";
        return;
    }

    leadSearchTimer = setTimeout(() => {

        fetch(`${searchLeadNameUrl}?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => renderLeadSuggestions(data.leads))
            .catch(() => {
                box.innerHTML = "";
                box.style.display = "none";
            });

    }, 300);
}

function renderLeadSuggestions(leads) {

    const box = document.getElementById("lead_suggestions");

    if (!leads || leads.length === 0) {
        box.innerHTML = `<div class="lead-suggestion-empty">No matching leads found</div>`;
        box.style.display = "block";
        return;
    }

    box.innerHTML = leads.map(lead => `
        <div class="lead-suggestion-item"
             onclick="selectLead(${lead.id}, '${lead.lead_name.replace(/'/g, "\\'")}', '${lead.phone_no}')">
            <span class="lead-suggestion-name">${lead.lead_name}</span>
            <span class="lead-suggestion-meta">${lead.phone_no} • ${lead.course_interested}</span>
        </div>
    `).join("");

    box.style.display = "block";
}

function selectLead(id, name, phone) {

    selectedLeadId = id;

    const nameInput = document.getElementById("lead_name");
    nameInput.value = name;

    const box = document.getElementById("lead_suggestions");
    box.innerHTML = "";
    box.style.display = "none";

    document.getElementById("name_error").innerText = "";
}

document.addEventListener("click", function (e) {

    const box = document.getElementById("lead_suggestions");
    const input = document.getElementById("lead_name");

    if (box && !box.contains(e.target) && e.target !== input) {
        box.style.display = "none";
    }
});


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