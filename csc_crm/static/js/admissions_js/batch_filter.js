(function () {
    const course = document.getElementById('id_course');
    const batch = document.getElementById('id_batch');
    const form = document.getElementById('studentForm');

    if (!course || !batch) return;

    // keep a copy of every real batch option (server already removed ended / full ones)
    const allBatches = Array.from(batch.options)
        .filter(function (opt) { return opt.value !== ''; })
        .map(function (opt) {
            return {
                value: opt.value,
                text: opt.textContent.trim(),
                course: opt.dataset.course,
            };
        });

    function render(courseId, keepValue) {
        batch.innerHTML = '';

        let placeholderText = 'Select Batch';
        let matches = [];

        if (!courseId) {
            placeholderText = 'Select course first';
        } else {
            matches = allBatches.filter(function (b) { return b.course === String(courseId); });
            if (!matches.length) placeholderText = 'No batches available for this course';
        }

        batch.appendChild(new Option(placeholderText, ''));

        matches.forEach(function (b) {
            batch.appendChild(new Option(b.text, b.value));
        });

        if (keepValue && matches.some(function (b) { return b.value === String(keepValue); })) {
            batch.value = String(keepValue);
        }
    }

    course.addEventListener('change', function () {
        render(course.value, null);
    });

    if (form) {
        // "Clear Form" button
        form.addEventListener('reset', function () {
            setTimeout(function () { render(course.value, null); }, 0);
        });
    }

    // first load (also handles "add student from a batch" locked flow)
    const lockedCourse = form ? form.dataset.lockedCourse : null;
    const lockedBatch = form ? form.dataset.lockedBatch : null;

    if (lockedCourse) {
        course.value = lockedCourse;
        render(lockedCourse, lockedBatch);
    } else {
        render(course.value, batch.value);
    }
})();