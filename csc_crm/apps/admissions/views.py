import os
import uuid
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render, get_object_or_404
from django.core.paginator import Paginator
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.urls import reverse
from django.contrib.staticfiles import finders
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from playwright.async_api import async_playwright
from asgiref.sync import async_to_sync

from .forms import StudentForm, AdmissionForm, EnrollmentForm
from .models import *
from .filters import StudentFilter
from .services import get_fee_summary
from csc_crm.apps.student_attendance.models import Batch
from csc_crm.apps.admissions.models import Payment


def get_role(request):
    staff = getattr(request.user, 'staff_profile', None)
    return staff.role.role_name if staff and staff.role else None


def is_admin_manager(request):
    return get_role(request) in ['Admin', 'Manager']


def is_sales_team(request):
    return get_role(request) in ['Sales Exec Lead', 'Sales Exec']


def is_hr(request):
    return get_role(request) == 'HR'


def is_trainer(request):
    return get_role(request) == 'Trainer'


def student(request):
    if not (is_admin_manager(request) or is_sales_team(request)):
        messages.error(request, "You do not have permission to access this page.")
        return redirect('staff_dashboard')

    student_form = StudentForm()
    admission_form = AdmissionForm()
    enrollment_form = EnrollmentForm()
    courses = Course.objects.all()
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == "POST":
        student_form = StudentForm(request.POST, request.FILES)
        admission_form = AdmissionForm(request.POST)
        enrollment_form = EnrollmentForm(request.POST, request.FILES)

        if student_form.is_valid() and admission_form.is_valid() and enrollment_form.is_valid():
            enrollment_preview = enrollment_form.save(commit=False)

            if enrollment_preview.batch.course_id != admission_form.cleaned_data['course_name'].id:
                error_msg = "Selected batch does not belong to selected course."

                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'errors': {'batch': [error_msg]}
                    })

                messages.error(request, error_msg)
                return render(request, 'admissions/register.html', {
                    'student_form': student_form,
                    'admission_form': admission_form,
                    'enrollment_form': enrollment_form,
                    'courses': courses,
                })

            try:
                with transaction.atomic():
                    student_obj = student_form.save()

                    for file in request.FILES.getlist("id_proof"):
                        StudentDocument.objects.create(
                            student=student_obj,
                            document_type="id_proof",
                            document=file
                        )

                    for file in request.FILES.getlist("certificate"):
                        StudentDocument.objects.create(
                            student=student_obj,
                            document_type="certificate",
                            document=file
                        )

                    admission = Admission.objects.create(
                        student=student_obj,
                        course_name=admission_form.cleaned_data['course_name'],
                        status=admission_form.cleaned_data['status']
                    )

                    enrollment = enrollment_form.save(commit=False)
                    enrollment.admission = admission
                    enrollment.save()

                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'redirect_url': reverse(
                            'staff_dashboard' if is_sales_team(request)
                            else 'fee_dashboard'
                        )
                    })

                messages.success(request, "Student enrolled successfully!")

                if is_sales_team(request):
                    return redirect('staff_dashboard')

                return redirect('fee_dashboard')

            except Exception as e:
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'errors': {
                            '__all__': [f"Something went wrong while saving: {e}"]
                        }
                    })

                messages.error(
                    request,
                    f"Something went wrong while saving the student: {e}"
                )
        else:
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'errors': {
                        **student_form.errors,
                        **admission_form.errors,
                        **enrollment_form.errors,
                    }
                })

            messages.error(request, "Form has errors. Please check!")

    return render(request, 'admissions/register.html', {
        'student_form': student_form,
        'admission_form': admission_form,
        'enrollment_form': enrollment_form,
        'courses': courses,
    })


def delete_student_document(request, pk):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to delete documents.")
        return redirect('student_list')

    document = get_object_or_404(StudentDocument, pk=pk)
    student_id = document.student.id
    document_display_name = (
        os.path.basename(document.document.name)
        if document.document else "Document"
    )

    if request.method == "POST":
        if document.document:
            document.document.delete(save=False)

        document.delete()
        messages.success(
            request,
            f"Document '{document_display_name}' deleted successfully."
        )

    return redirect("edit_student", id=student_id)


def _get_summary_value(summary, key, default=0):
    if isinstance(summary, dict):
        return summary.get(key, default)
    return getattr(summary, key, default)


@login_required(login_url='staff_login')
def fee_dashboard(request):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to access fee dashboard.")
        return redirect('staff_dashboard')

    students = Student.objects.all().order_by('-id')
    fee_students = [
        student for student in students
        if student.pending_amount() > 0
    ]

    latest_payments = []
    seen_students = set()

    for payment in Payment.objects.order_by('-date', '-id'):
        if payment.student.id not in seen_students:
            latest_payments.append(payment)
            seen_students.add(payment.student.id)

        if len(latest_payments) == 5:
            break

    selected_student_id = request.GET.get('student_id')
    remaining_payments = 0

    if request.method == 'POST':
        student_id = request.POST.get('student')
        amount = request.POST.get('amount')

        try:
            amount = float(amount)
        except:
            messages.error(request, "Invalid amount")
            return redirect('fee_dashboard')

        mode = request.POST.get('mode')
        reference = request.POST.get('reference')

        if not reference or not reference.strip():
            reference = f"TXN{uuid.uuid4().hex[:8].upper()}"

        remarks = request.POST.get('remarks')
        student_obj = Student.objects.get(id=student_id)

        total_fee = student_obj.total_fee()
        paid_amount = student_obj.total_paid()
        pending_amount = total_fee - paid_amount

        if amount <= 0:
            messages.error(request, "Amount must be greater than 0.")
            return redirect('fee_dashboard')

        if amount > pending_amount:
            messages.error(
                request,
                f"Only remaining amount ₹{pending_amount} can be paid."
            )
            return redirect('fee_dashboard')

        payment_count = Payment.objects.filter(student=student_obj).count()

        if payment_count >= 6:
            messages.error(request, "Only 6 payments allowed.")
            return redirect('fee_dashboard')

        if payment_count == 5 and amount != pending_amount:
            messages.error(
                request,
                f"6th payment must clear full remaining amount ₹{pending_amount}"
            )
            return redirect('fee_dashboard')

        Payment.objects.create(
            student_id=student_id,
            amount=amount,
            mode=mode,
            reference_id=reference,
            remarks=remarks
        )

        remaining_payments = 6 - (payment_count + 1)
        new_pending = pending_amount - amount

        if new_pending <= 0:
            messages.success(
                request,
                "Payment Successful! Full fee has been paid."
            )
        else:
            messages.success(
                request,
                f"Payment Successful! Remaining payments: {remaining_payments}"
            )

        return redirect('fee_dashboard')

    format = request.GET.get('format')

    if format == 'excel':
        wb = Workbook()
        ws = wb.active
        ws.title = "Fee Payments"

        ws.append([
            "Student", "Course", "Batch", "Amount",
            "Mode", "Reference", "Date"
        ])

        header_fill = PatternFill(
            start_color="FFC000",
            end_color="FFC000",
            fill_type="solid"
        )

        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for payment in Payment.objects.select_related(
            'student'
        ).order_by('-date', '-id'):

            admission = payment.student.admissions.first()
            enrollment = (
                admission.enrollment
                if admission and hasattr(admission, 'enrollment')
                else None
            )

            ws.append([
                f"{payment.student.first_name} {payment.student.last_name}",
                str(admission.course_name) if admission else "-",
                str(enrollment.batch) if enrollment else "-",
                payment.amount,
                payment.mode,
                payment.reference_id,
                str(payment.date),
            ])

        for col, width in {
            'A': 25, 'B': 25, 'C': 18,
            'D': 15, 'E': 15, 'F': 20, 'G': 18
        }.items():
            ws.column_dimensions[col].width = width

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=fee_payments.xlsx'
        wb.save(response)
        return response

    summary = get_fee_summary()
    collected = _get_summary_value(summary, 'collected', 0) or 0
    outstanding = _get_summary_value(summary, 'outstanding', 0) or 0
    total_expected = collected + outstanding

    collection_percentage = (
        round((collected / total_expected) * 100)
        if total_expected > 0 else 0
    )

    student_fee_status = []

    for student_obj in students:
        total_fee = student_obj.total_fee()
        paid = student_obj.total_paid()
        pending = student_obj.pending_amount()

        if pending <= 0:
            status = 'Paid'
        elif paid == 0:
            status = 'Pending'
        else:
            status = 'Partial'

        student_fee_status.append({
            'student': student_obj,
            'total_fee': total_fee,
            'paid': paid,
            'pending': pending,
            'status': status
        })

    return render(request, 'admissions/fee_dashboard.html', {
        'students': fee_students,
        'payments': latest_payments,
        'summary': summary,
        'remaining_payments': remaining_payments,
        'student_fee_status': student_fee_status,
        'selected_student_id': selected_student_id,
        'collection_percentage': collection_percentage,
    })


@login_required(login_url='staff_login')
def student_detail(request, pk):
    if not (is_admin_manager(request) or is_hr(request)):
        messages.error(request, "You do not have permission to view student details.")
        return redirect('staff_dashboard')

    student_obj = get_object_or_404(Student, id=pk)

    payments = student_obj.payments.all()

    return render(request, 'students/detail.html', {
        'student': student_obj,
        'payments': payments,
        'total_paid': student_obj.total_paid(),
        'pending': student_obj.pending_amount(),
    })


def link_callback(uri):
    if uri.startswith(settings.STATIC_URL):
        path = finders.find(
            uri.replace(settings.STATIC_URL, "")
        )
        if path:
            return path

    return uri


async def html_to_pdf(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_load_state("networkidle")
        await page.emulate_media(media="print")

        pdf = await page.pdf(
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
            margin={
                "top": "8mm",
                "bottom": "8mm",
                "left": "8mm",
                "right": "8mm"
            },
        )

        await browser.close()
        return pdf


def generate_receipt(request, pk):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to generate receipts.")
        return redirect('staff_dashboard')

    payment = Payment.objects.get(id=pk)
    admission = payment.student.admissions.first()
    enrollment = (
        admission.enrollment
        if admission and hasattr(admission, 'enrollment')
        else None
    )

    context = {
        'payment': payment,
        'student_name': f"{payment.student.first_name} {payment.student.last_name}",
        'phone': payment.student.phone_no,
        'email': payment.student.email,
        'course': admission.course_name if admission else "-",
        'batch': enrollment.batch if enrollment else "-",
        'total_fee': payment.student.total_fee(),
        'total_paid': payment.student.total_paid(),
        'pending': payment.student.pending_amount(),
    }

    url = request.build_absolute_uri(
        reverse("receipt_pdf", args=[pk])
    )

    pdf = async_to_sync(html_to_pdf)(url)

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="receipt_{pk}.pdf"'
    )

    return response


@login_required(login_url='staff_login')
def student_list(request):
    if not (is_admin_manager(request) or is_hr(request) or is_trainer(request)):
        messages.error(request, "You do not have permission to access student list.")
        return redirect('staff_dashboard')

    my_staff = getattr(request.user, 'staff_profile', None)
    my_role = get_role(request)

    students = Student.objects.prefetch_related(
        'payments',
        'admissions__enrollment',
        'admissions__course_name',
    ).all()

    if my_role == 'Trainer':
        students = students.filter(
            admissions__enrollment__batch__trainer=my_staff
        ).distinct()

    student_filter = StudentFilter(request.GET, queryset=students)
    filtered_students = student_filter.qs.distinct().order_by('-id')

    paginator = Paginator(filtered_students, 10)
    page_obj = paginator.get_page(request.GET.get("page"))

    active_students_qs = Admission.objects.filter(status="enrolled")

    if my_role == 'Trainer':
        active_students_qs = active_students_qs.filter(
            enrollment__batch__trainer=my_staff
        )

    active_students = active_students_qs.count()
    summary = get_fee_summary()
    format = request.GET.get('format')

    if format == 'excel':
        wb = Workbook()
        ws = wb.active
        ws.title = "Students"

        headers = [
            "Student", "Course", "Batch",
            "Phone", "Payment Status", "Joined"
        ]

        ws.append(headers)

        header_fill = PatternFill(
            start_color="FFC000",
            end_color="FFC000",
            fill_type="solid"
        )

        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        for s in filtered_students:
            for admission in s.admissions.all():
                enrollment = getattr(admission, 'enrollment', None)

                ws.append([
                    f"{s.first_name} {s.last_name}",
                    str(admission.course_name) if admission else "-",
                    str(enrollment.batch)
                    if enrollment and enrollment.batch else "-",
                    s.phone_no,
                    enrollment.payment_status if enrollment else "-",
                    str(enrollment.start_date) if enrollment else "-"
                ])

        for col, width in {
            'A': 25, 'B': 20, 'C': 15,
            'D': 18, 'E': 18, 'F': 18
        }.items():
            ws.column_dimensions[col].width = width

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=students.xlsx'
        wb.save(response)
        return response

    if format == 'pdf':
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="students.pdf"'

        data = [[
            "Student", "Course", "Batch",
            "Phone", "Payment Status", "Joined"
        ]]

        for s in filtered_students:
            for admission in s.admissions.all():
                enrollment = getattr(admission, 'enrollment', None)

                data.append([
                    f"{s.first_name} {s.last_name}",
                    str(admission.course_name) if admission else "-",
                    str(enrollment.batch)
                    if enrollment and enrollment.batch else "-",
                    s.phone_no,
                    enrollment.payment_status if enrollment else "-",
                    str(enrollment.start_date) if enrollment else "-"
                ])

        doc = SimpleDocTemplate(response)
        styles = getSampleStyleSheet()

        title = Paragraph("Student Report", styles['Title'])
        table = Table(data)

        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.gold),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))

        doc.build([
            title,
            Spacer(1, 12),
            table
        ])

        return response

    batches_qs = Batch.objects.all()

    if my_role == 'Trainer':
        batches_qs = batches_qs.filter(trainer=my_staff)

    return render(request, 'admissions/student_list.html', {
        'page_obj': page_obj,
        'filter': student_filter,
        'courses': Course.objects.all(),
        'batches': batches_qs,
        'total_students': filtered_students.count(),
        'active_students': active_students,
        'summary': summary
    })


@login_required(login_url='staff_login')
def edit_student(request, id):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to edit students.")
        return redirect('student_list')

    student_obj = get_object_or_404(Student, id=id)
    admission = Admission.objects.get(student=student_obj)
    enrollment = Enrollment.objects.get(admission=admission)

    courses = Course.objects.all()

    batches = (
        Batch.objects.filter(course_id=admission.course_name_id)
        if admission.course_name_id
        else Batch.objects.none()
    )

    if request.method == 'POST':
        student_obj.first_name = request.POST.get('first_name')
        student_obj.last_name = request.POST.get('last_name')
        student_obj.email = request.POST.get('email')
        student_obj.phone_no = request.POST.get('phone_no')
        student_obj.dob = request.POST.get('dob')
        student_obj.gender = request.POST.get('gender')
        student_obj.guardian_name = request.POST.get('guardian_name')
        student_obj.guardian_phone_no = request.POST.get('guardian_phone_no')
        student_obj.address = request.POST.get('address')

        if request.FILES.get('photo'):
            student_obj.photo = request.FILES.get('photo')

        if request.FILES.get('id_proof'):
            student_obj.id_proof = request.FILES.get('id_proof')

        if request.FILES.get('certificate'):
            student_obj.certificate = request.FILES.get('certificate')

        student_obj.save()

        course_id = request.POST.get('course_name')

        if course_id:
            admission.course_name_id = course_id

        admission.status = request.POST.get('status')
        admission.save()

        batch_id = request.POST.get('batch')

        if batch_id:
            enrollment.batch_id = batch_id

        enrollment.start_date = request.POST.get('start_date')
        enrollment.save()

        messages.success(
            request,
            "✅ Student details updated successfully"
        )

        return redirect('student_list')

    return render(request, "admissions/edit_student.html", {
        'student': student_obj,
        'admission': admission,
        'enrollment': enrollment,
        'courses': courses,
        'batches': batches
    })


@login_required(login_url='staff_login')
def delete_student(request, id):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to delete students.")
        return redirect('student_list')

    student_obj = get_object_or_404(Student, id=id)
    student_obj.delete()

    messages.success(request, "✅ Student deleted successfully")

    return redirect('student_list')


@login_required(login_url='staff_login')
def search_students(request):
    if not (is_admin_manager(request) or is_hr(request) or is_trainer(request)):
        messages.error(request, "You do not have permission to search students.")
        return redirect('staff_dashboard')

    my_staff = getattr(request.user, 'staff_profile', None)
    my_role = get_role(request)

    students = Student.objects.prefetch_related(
        'admissions__course_name',
        'admissions__enrollment'
    )

    if my_role == 'Trainer':
        students = students.filter(
            admissions__enrollment__batch__trainer=my_staff
        )

    student_filter = StudentFilter(
        request.GET,
        queryset=students
    )

    filtered_students = student_filter.qs.distinct().order_by('-id')
    format = request.GET.get('format')

    if format == 'excel':
        wb = Workbook()
        ws = wb.active
        ws.title = "Search Results"

        headers = [
            "Student", "Student ID", "Course",
            "Status", "Fee", "Joined"
        ]

        ws.append(headers)

        header_fill = PatternFill(
            start_color="FFC000",
            end_color="FFC000",
            fill_type="solid"
        )

        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        ids_param = request.GET.get('ids')

        if ids_param:
            selected_ids = [
                i for i in ids_param.split(',')
                if i.strip().isdigit()
            ]
            export_students = filtered_students.filter(
                id__in=selected_ids
            )
        else:
            export_students = filtered_students

        for student_obj in export_students:
            for admission in student_obj.admissions.all():
                enrollment = getattr(admission, 'enrollment', None)

                if student_obj.pending_amount() <= 0:
                    fee_status = "Paid"
                elif student_obj.total_paid() > 0:
                    fee_status = "Partial"
                else:
                    fee_status = "Pending"

                ws.append([
                    f"{student_obj.first_name} {student_obj.last_name}",
                    f"STU{student_obj.id}",
                    str(admission.course_name)
                    if admission.course_name else "-",
                    admission.status,
                    fee_status,
                    str(enrollment.start_date)
                    if enrollment else "-",
                ])

        for col, width in {
            'A': 25, 'B': 12, 'C': 20,
            'D': 15, 'E': 12, 'F': 15
        }.items():
            ws.column_dimensions[col].width = width

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        response['Content-Disposition'] = (
            'attachment; filename=search_results.xlsx'
        )

        wb.save(response)
        return response

    try:
        per_page = int(request.GET.get('per_page', 10))

        if per_page not in (10, 25, 50, 100):
            per_page = 10

    except (TypeError, ValueError):
        per_page = 10

    paginator = Paginator(filtered_students, per_page)

    page_obj = paginator.get_page(
        request.GET.get('page', 1)
    )

    querydict = request.GET.copy()
    querydict.pop('page', None)
    querydict.pop('format', None)

    base_query = querydict.urlencode()

    batches_qs = Batch.objects.all()

    if my_role == 'Trainer':
        batches_qs = batches_qs.filter(trainer=my_staff)

    return render(request, "admissions/search_students.html", {
        'filter': student_filter,
        'page_obj': page_obj,
        'courses': Course.objects.all(),
        'batches': batches_qs,
        'per_page': per_page,
        'base_query': base_query,
    })


@login_required(login_url='staff_login')
def view_student(request, id):
    my_staff = getattr(request.user, 'staff_profile', None)
    my_role = get_role(request)

    if not (
        is_admin_manager(request)
        or is_hr(request)
        or is_trainer(request)
    ):
        messages.error(request, "You do not have permission to view students.")
        return redirect('staff_dashboard')

    student_obj = Student.objects.prefetch_related(
        'payments',
        'admissions__course_name',
        'admissions__enrollment'
    ).get(id=id)

    if my_role == 'Trainer':
        trainer_batches = Batch.objects.filter(
            trainer=my_staff
        ).values_list('id', flat=True)

        if not student_obj.admissions.filter(
            enrollment__batch_id__in=trainer_batches
        ).exists():
            messages.error(
                request,
                "You can only view students from your assigned batches."
            )
            return redirect('student_list')

    admission = student_obj.admissions.first()
    enrollment = admission.enrollment if admission else None
    payments = student_obj.payments.all().order_by('-date')

    return render(request, "admissions/view_student.html", {
        'student': student_obj,
        'admission': admission,
        'enrollment': enrollment,
        'payments': payments,
        'total_paid': student_obj.total_paid(),
        'pending': student_obj.pending_amount(),
    })


def check_email(request):
    email = request.GET.get('email')
    exclude_id = request.GET.get('exclude_id')

    qs = Student.objects.filter(email=email)

    if exclude_id:
        qs = qs.exclude(pk=exclude_id)

    return JsonResponse({
        'exists': qs.exists()
    })


def check_phone(request):
    phone = request.GET.get('phone')
    exclude_id = request.GET.get('exclude_id')

    qs = Student.objects.filter(phone_no=phone)
    guardian_qs = Student.objects.filter(guardian_phone_no=phone)

    if exclude_id:
        qs = qs.exclude(pk=exclude_id)
        guardian_qs = guardian_qs.exclude(pk=exclude_id)

    return JsonResponse({
        'exists': qs.exists(),
        'guardian_exists': guardian_qs.exists()
    })


@login_required(login_url='staff_login')
def preview_receipt(request, pk):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to view receipts.")
        return redirect('staff_dashboard')

    payment = Payment.objects.get(id=pk)
    admission = payment.student.admissions.first()

    enrollment = (
        admission.enrollment
        if admission and hasattr(admission, 'enrollment')
        else None
    )

    return render(request, "admissions/preview_receipt.html", {
        'payment': payment,
        'student_name': (
            f"{payment.student.first_name} "
            f"{payment.student.last_name}"
        ),
        'phone': payment.student.phone_no,
        'email': payment.student.email,
        'course': admission.course_name if admission else "-",
        'batch': enrollment.batch if enrollment else "-",
        'total_fee': payment.student.total_fee(),
        'total_paid': payment.student.total_paid(),
        'pending': payment.student.pending_amount(),
        'today': timezone.localdate(),
    })


@login_required(login_url='staff_login')
def receipt_pdf(request, pk):
    if not is_admin_manager(request):
        messages.error(request, "You do not have permission to view receipts.")
        return redirect('staff_dashboard')

    payment = Payment.objects.get(id=pk)
    admission = payment.student.admissions.first()

    enrollment = (
        admission.enrollment
        if admission and hasattr(admission, "enrollment")
        else None
    )

    return render(request, "admissions/fee_receipt.html", {
        "payment": payment,
        "student_name": (
            f"{payment.student.first_name} "
            f"{payment.student.last_name}"
        ),
        "phone": payment.student.phone_no,
        "email": payment.student.email,
        "course": admission.course_name if admission else "-",
        "batch": enrollment.batch if enrollment else "-",
        "total_fee": payment.student.total_fee(),
        "total_paid": payment.student.total_paid(),
        "pending": payment.student.pending_amount(),
        "today": timezone.localdate(),
    })