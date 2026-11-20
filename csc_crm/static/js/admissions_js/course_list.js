(function () {
    const page = document.getElementById('coursePage') || document.querySelector('.course-page');
    if (!page) return;

    const createUrl = page.dataset.createUrl;

    const courseModal = document.getElementById('courseModal');
    const deleteModal = document.getElementById('deleteModal');
    const form = document.getElementById('courseForm');
    const titleEl = document.getElementById('courseModalTitle');
    const subEl = document.getElementById('courseModalSub');
    const submitBtn = document.getElementById('courseSubmitBtn');
    const feeHint = document.getElementById('courseFeeHint');
    const deleteText = document.getElementById('deleteModalText');
    const deleteError = document.getElementById('deleteError');
    const deleteBtn = document.getElementById('deleteConfirmBtn');
    const csrfToken = form.querySelector('[name=csrfmiddlewaretoken]').value;

    let editUrl = null;     // null => create mode
    let deleteUrl = null;

    // ---------- toast (survives the page reload) ----------
    function showToast(message, type) {
        const box = document.getElementById('courseToastBox');
        const toast = document.createElement('div');
        toast.className = 'cp-toast cp-toast-' + (type || 'success');
        toast.textContent = message;
        box.appendChild(toast);
        setTimeout(function () { toast.remove(); }, 3500);
    }

    const pending = sessionStorage.getItem('courseToast');
    if (pending) {
        sessionStorage.removeItem('courseToast');
        showToast(pending, 'success');
    }

    function reloadWithToast(message) {
        sessionStorage.setItem('courseToast', message);
        window.location.reload();
    }

    // ---------- modal helpers ----------
    function openModal(el) {
        el.classList.add('open');
        el.setAttribute('aria-hidden', 'false');
    }

    function closeModal(el) {
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
    }

    [courseModal, deleteModal].forEach(function (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal || e.target.closest('[data-close]')) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal(courseModal);
            closeModal(deleteModal);
        }
    });

    function clearErrors() {
        form.querySelectorAll('.cp-error').forEach(function (box) {
            box.textContent = '';
        });
    }

    function showErrors(errors) {
        Object.keys(errors || {}).forEach(function (field) {
            const box = form.querySelector('[data-error-for="' + field + '"]') ||
                        form.querySelector('[data-error-for="__all__"]');
            if (box) box.textContent = errors[field].join(' ');
        });
    }

    // ---------- add ----------
    document.getElementById('btnAddCourse').addEventListener('click', function () {
        editUrl = null;
        form.reset();
        document.getElementById('fDuration').value = 3;
        clearErrors();
        feeHint.hidden = true;

        titleEl.textContent = 'Create New Course';
        subEl.textContent = 'Add a course so batches and admissions can use it';
        submitBtn.textContent = 'Create Course';

        openModal(courseModal);
        document.getElementById('fCourseName').focus();
    });

    // ---------- edit / delete buttons (event delegation) ----------
    document.getElementById('courseTableBody').addEventListener('click', function (e) {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;

        if (e.target.closest('.js-edit')) {
            editUrl = row.dataset.updateUrl;
            clearErrors();

            document.getElementById('fCourseName').value = row.dataset.name;
            document.getElementById('fDuration').value = row.dataset.duration;
            document.getElementById('fFee').value = row.dataset.fee;

            feeHint.hidden = Number(row.dataset.students) === 0;

            titleEl.textContent = 'Edit Course';
            subEl.textContent = 'Update the course details';
            submitBtn.textContent = 'Save Changes';

            openModal(courseModal);
        }

        if (e.target.closest('.js-delete')) {
            deleteUrl = row.dataset.deleteUrl;
            deleteError.textContent = '';

            const students = Number(row.dataset.students);
            const batches = Number(row.dataset.batches);

            if (students || batches) {
                deleteText.textContent =
                    '"' + row.dataset.name + '" cannot be deleted.';
                deleteError.textContent =
                    'This course has ' + students + ' student(s) and ' +
                    batches + ' batch(es) linked to it. Remove or move them first.';
                deleteBtn.hidden = true;
            } else {
                deleteText.textContent =
                    'Are you sure you want to delete "' + row.dataset.name + '"? This cannot be undone.';
                deleteBtn.hidden = false;
            }

            openModal(deleteModal);
        }
    });

    // ---------- save (create / update) ----------
    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();
        submitBtn.disabled = true;

        const isEdit = editUrl !== null;

        try {
            const response = await fetch(isEdit ? editUrl : createUrl, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });

            const data = await response.json();

            if (data.success) {
                closeModal(courseModal);
                reloadWithToast(
                    isEdit ? 'Course updated successfully.' : 'Course created successfully.'
                );
                return;
            }

            showErrors(data.errors);
        } catch (err) {
            form.querySelector('[data-error-for="__all__"]').textContent =
                'Something went wrong. Please try again.';
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ---------- delete ----------
    deleteBtn.addEventListener('click', async function () {
        deleteBtn.disabled = true;
        deleteError.textContent = '';

        try {
            const response = await fetch(deleteUrl, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (data.success) {
                closeModal(deleteModal);
                reloadWithToast('Course "' + data.name + '" deleted.');
                return;
            }

            deleteError.textContent = (data.errors.__all__ || ['Could not delete course.']).join(' ');
        } catch (err) {
            deleteError.textContent = 'Something went wrong. Please try again.';
        } finally {
            deleteBtn.disabled = false;
        }
    });

    // ---------- search + reset ----------
    const searchInput = document.getElementById('courseSearch');
    const resetBtn = document.getElementById('courseReset');
    const noMatch = document.getElementById('courseNoMatch');

    function applySearch() {
        const term = searchInput.value.trim().toLowerCase();
        let visible = 0;

        document.querySelectorAll('#courseTableBody tr[data-id]').forEach(function (row) {
            const match = row.dataset.name.toLowerCase().includes(term);
            row.style.display = match ? '' : 'none';
            if (match) visible++;
        });

        noMatch.hidden = visible !== 0;
    }

    searchInput.addEventListener('input', applySearch);

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            searchInput.value = '';
            applySearch();
            searchInput.focus();
        });
    }
})();