from django import forms
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db.models import Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from csc_crm.apps.student_attendance.models import Batch

from .models import Admission, Course
from .views import is_admin_manager


class CourseForm(forms.ModelForm):
    class Meta:
        model = Course
        fields = ['course_name', 'duration', 'course_fee']

    def clean_course_name(self):
        name = ' '.join(self.cleaned_data['course_name'].split())

        duplicate = Course.objects.filter(course_name__iexact=name)

        if self.instance and self.instance.pk:
            duplicate = duplicate.exclude(pk=self.instance.pk)

        if duplicate.exists():
            raise ValidationError("A course with this name already exists.")

        return name

    def clean_duration(self):
        duration = self.cleaned_data['duration']

        if duration < 1 or duration > 60:
            raise ValidationError("Duration must be between 1 and 60 months.")

        return duration

    def clean_course_fee(self):
        fee = self.cleaned_data['course_fee']

        if fee <= 0:
            raise ValidationError("Course fee must be greater than 0.")

        return fee


def _forbidden():
    return JsonResponse({
        'success': False,
        'errors': {'__all__': ["You do not have permission to manage courses."]}
    }, status=403)


def _form_errors(form):
    return {field: list(errs) for field, errs in form.errors.items()}


@login_required(login_url='staff_login')
def course_list(request):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to access courses.")
        return redirect('staff_dashboard')

    batch_counts = {
        r['course_id']: r['c']
        for r in Batch.objects.values('course_id').annotate(c=Count('id'))
    }

    student_counts = {
        r['course_name_id']: r['c']
        for r in Admission.objects.values('course_name_id').annotate(c=Count('id'))
    }

    rows = [
        {
            'course': course,
            'batches': batch_counts.get(course.id, 0),
            'students': student_counts.get(course.id, 0),
        }
        for course in Course.objects.order_by('course_name')
    ]

    return render(request, 'admissions/course_list.html', {
        'rows': rows,
        'total_courses': len(rows),
    })


@login_required(login_url='staff_login')
@require_POST
def course_create(request):
    if not is_admin_manager(request):
        return _forbidden()

    form = CourseForm(request.POST)

    if not form.is_valid():
        return JsonResponse({'success': False, 'errors': _form_errors(form)}, status=400)

    course = form.save()

    return JsonResponse({
        'success': True,
        'course': {'id': course.id, 'name': course.course_name},
    })


@login_required(login_url='staff_login')
@require_POST
def course_update(request, pk):
    if not is_admin_manager(request):
        return _forbidden()

    course = get_object_or_404(Course, pk=pk)
    form = CourseForm(request.POST, instance=course)

    if not form.is_valid():
        return JsonResponse({'success': False, 'errors': _form_errors(form)}, status=400)

    course = form.save()

    return JsonResponse({
        'success': True,
        'course': {'id': course.id, 'name': course.course_name},
    })


@login_required(login_url='staff_login')
@require_POST
def course_delete(request, pk):
    if not is_admin_manager(request):
        return _forbidden()

    course = get_object_or_404(Course, pk=pk)

    students = Admission.objects.filter(course_name=course).count()
    batches = Batch.objects.filter(course=course).count()

    # Admission / Batch cascade on delete, so never delete a course that is in use.
    if students or batches:
        return JsonResponse({
            'success': False,
            'errors': {
                '__all__': [
                    f"Cannot delete: this course has {students} student(s) "
                    f"and {batches} batch(es) linked to it."
                ]
            }
        }, status=409)

    name = course.course_name
    course.delete()

    return JsonResponse({'success': True, 'name': name})