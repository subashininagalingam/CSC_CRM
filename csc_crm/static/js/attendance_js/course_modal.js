(function () {
    const form = document.getElementById('courseForm');
    if (!form) return;   // non Admin/Manager -> modal illa

    const modalEl = document.getElementById('courseModal');
    const submitBtn = document.getElementById('courseSubmitBtn');

    const errorBoxes = {
        course_name: document.getElementById('courseNameError'),
        duration: document.getElementById('durationError'),
        course_fee: document.getElementById('courseFeeError'),
        __all__: document.getElementById('courseFormError'),
    };

    function clearErrors() {
        Object.values(errorBoxes).forEach(function (box) {
            if (box) box.textContent = '';
        });
    }

    function showToast(message, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText =
            'padding:12px 18px;margin-bottom:10px;border-radius:10px;' +
            'font-size:14px;font-weight:600;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18);' +
            'background:' + (type === 'error' ? '#dc2626' : '#16a34a') + ';';

        container.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 3500);
    }

    function addCourseOption(course) {
        const selects = [
            document.getElementById('filterCourse'),
            document.querySelector('#batchForm select[name="course"]'),
        ];

        selects.forEach(function (select) {
            if (!select) return;
            select.appendChild(new Option(course.name, course.id));
        });
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();

        submitBtn.disabled = true;

        try {
            const response = await fetch(window.COURSE_CREATE_URL, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });

            const data = await response.json();

            if (data.success) {
                addCourseOption(data.course);
                bootstrap.Modal.getInstance(modalEl).hide();
                form.reset();
                showToast('Course "' + data.course.name + '" created successfully.', 'success');
                return;
            }

            Object.keys(data.errors || {}).forEach(function (field) {
                const box = errorBoxes[field] || errorBoxes.__all__;
                if (box) box.textContent = data.errors[field].join(' ');
            });
        } catch (err) {
            errorBoxes.__all__.textContent = 'Something went wrong. Please try again.';
        } finally {
            submitBtn.disabled = false;
        }
    });

    modalEl.addEventListener('hidden.bs.modal', function () {
        form.reset();
        clearErrors();
    });
})();