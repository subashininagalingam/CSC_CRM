from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.utils import timezone
from django.db.models.functions import TruncMonth
from django.db.models import Q, Avg, Count, F, FloatField, ExpressionWrapper
from django.http import JsonResponse, HttpResponse
from django.core.paginator import Paginator

from datetime import datetime, time

from openpyxl import Workbook
from functools import wraps

import csv
import re
import calendar
import os

from csc_crm.apps.leads.models import *
from csc_crm.apps.admissions.models import *
from csc_crm.apps.student_attendance.models import *

from .models import *
from .forms import *

# ============================= LEAD CAPTURE TARGET - ROLES =============================
MARKETING_TARGET_ROLES = [
    'Marketing Lead', 'Digital Marketing', 'Content Creator',   # marketing team
    'Admin', 'Manager', 'HR',                                   # view-only access
]                                                                    # who can VIEW the page
MARKETING_LEAD_ROLES = ['Marketing Lead']                          # who can ASSIGN/EDIT targets
DELETE_TARGET_ROLES = ['Marketing Lead']                           # who can DELETE targets
VIEW_ALL_TARGET_ROLES = ['Marketing Lead', 'Admin', 'Manager', 'HR']  # who can see ALL targets (not just their own)

# Marketing team members must stay inside Lead Capture Target only — they
# never get the full Lead Management pages (Lead Capture, Pipeline,
# Follow Up, Conversion Report, Call Log).
MARKETING_ONLY_ROLES = ['Marketing Lead', 'Digital Marketing', 'Content Creator']

# ============================ ROLE-BLOCK DECORATOR ============================

def block_roles(blocked_roles):
    """Deny access to the given roles, allow everyone else who's logged in.
    Used to keep the Marketing team out of the full Lead Management pages."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('staff_login')
            try:
                staff = request.user.staff_profile
            except Staff.DoesNotExist:
                messages.error(request, 'No staff profile found.')
                return redirect('staff_login')

            if staff.role.role_name in blocked_roles:
                messages.error(request, 'You do not have permission to access this page.')
                return redirect('leads:lead_capture_target')

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# ============================ ROLE-BASED ACCESS DECORATOR ============================

def role_required(allowed_roles, marketing_only=False):
    """Only allow access if the logged-in user's Staff role is in allowed_roles.
    If marketing_only=True, staff must also belong to the Marketing department."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return redirect('staff_login')
            try:
                staff = request.user.staff_profile
            except Staff.DoesNotExist:
                messages.error(request, 'No staff profile found.')
                return redirect('staff_login')

            if staff.role.role_name not in allowed_roles:
                messages.error(request, 'You do not have permission to access this page.')
                return redirect('staff_dashboard')

            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# ============================ LOGIN / LOGOUT ============================

def staff_login(request):
    """Employee ID + Password login"""

    if request.user.is_authenticated:
        return redirect('staff_dashboard')

    if request.method == 'POST':
        employee_id = request.POST.get('employee_id', '').strip()
        password = request.POST.get('password', '')

        user = authenticate(request, username=employee_id, password=password)

        if user is not None:
            try:
                staff = user.staff_profile
            except Staff.DoesNotExist:
                messages.error(request, 'No staff profile linked to this account.')
                return render(request, 'staff/login.html')

            if staff.status != 'active':
                messages.error(request, 'Your account is not active. Contact admin.')
                return render(request, 'staff/login.html')

            auth_login(request, user)

            staff.last_login = timezone.now()
            staff.last_login_ip = request.META.get('REMOTE_ADDR')
            staff.save(update_fields=['last_login', 'last_login_ip'])

            messages.success(request, f"Welcome back, {staff.full_name()}!")
            return redirect('staff_dashboard')
        else:
            messages.error(request, 'Invalid Employee ID or Password.')

    return render(request, 'staff/login.html')


def staff_logout(request):
    """Logout current user"""
    auth_logout(request)
    messages.success(request, 'Logged out successfully.')
    return redirect('staff_login')


# ============================ LIST-VIEW ============================ 


@login_required(login_url='staff_login')
def staff_management(request):
    """Display all staff members with filters and role permissions matrix"""

    my_staff = getattr(request.user, 'staff_profile', None)
    my_role = my_staff.role.role_name if my_staff and my_staff.role else None

    allowed_roles = [
        'Admin',
        'Manager',
        'HR',
        'Sales Exec Lead',
        'Marketing Lead',
        'Sales Exec',
        'Trainer',
        'Digital Marketing',
        'Content Creator',
        'Developer',
    ]

    if my_role not in allowed_roles:
        messages.error(request, 'You do not have permission to access this page.')
        return redirect('staff_dashboard')

    queryset = (
        Staff.objects
        .exclude(role__role_name='Admin')
        .select_related('role', 'department')
        .annotate(
            leads_assigned=Count('leadcapture'),

            closed_deals=Count(
                'leadcapture',
                filter=Q(leadcapture__initial_status='enrolled')
            )
        )
        .order_by('-created_at')
    )

    # Sales Exec Lead -> Sales department only (excluding own record)
    if my_role == 'Sales Exec Lead':
        queryset = queryset.filter(
            department__dept_name='Sales'
        ).exclude(id=my_staff.id)

    # Marketing Lead -> Marketing department only (excluding own record)
    elif my_role == 'Marketing Lead':
        queryset = queryset.filter(
            department__dept_name='Marketing'
        ).exclude(id=my_staff.id)

    # Sales Exec, Digital Marketing, Content Creator, Developer -> own record only
    elif my_role in ['Sales Exec', 'Digital Marketing', 'Content Creator', 'Trainer', 'Developer']:
        queryset = queryset.filter(id=my_staff.id)

    # Admin, Manager, HR -> all departments, but excluding own record
    else:
        queryset = queryset.exclude(id=my_staff.id)

    # Apply filters
    department = request.GET.get('department')
    role = request.GET.get('role')
    status = request.GET.get('status')
    search = request.GET.get('search', '').strip()

    if department:
        queryset = queryset.filter(department_id=department)

    if role:
        queryset = queryset.filter(role_id = role)
    
    if status:
        queryset = queryset.filter(status = status)

    if search:
        queryset = queryset.filter(
            Q(first_name__icontains = search) |
            Q(last_name__icontains = search) |
            Q(email__icontains = search) |
            Q(employee_id__icontains = search)
        )
    # Pagination
    paginator = Paginator(queryset, 15)
    page_number = request.GET.get('page')
    staff_list = paginator.get_page(page_number)

    # Get all roles and departments for filters
    all_roles = StaffRole.objects.all()
    all_departments = Department.objects.all()

    # Role permission Matrix data
    permissions_matrix = [
        {
            'module':'Leads',
            'permission':{
                'admin': 'All',
                'manager': 'All',
                'sales_exec': 'Own',
                'telecaller': 'Own',
                'support': 'View',
                'hr': 'View',
                'trainer': 'View'
            }
        },
        {
            'module': 'Staff',
            'permission':{
                'admin':'All',
                'manager':'View',
                'sales_exec': 'None',
                'telecaller': 'None',
                'support': 'None',
                'hr': 'All',
                'trainer': 'None'
            }
        },
        {
            'module': 'Reports',
            'permission':{
                'admin':'All',
                'manager':'Team',
                'sales_exec':'Own',
                'telecaller': 'None',
                'support': 'None',
                'hr': 'HR',
                'trainer': 'None'
            }
        },
        {
            'module': 'Attendance',
            'permission': {
                'admin': 'All',
                'manager': 'View',
                'sales_exec':'Own',
                'telecaller':  'Own',
                'support': 'Own',
                'hr': 'All',
                'trainer': 'Own'
            }
        }
    ]

    # Filter form
    filter_form = StaffFilterForm(request.GET)

    context = {
        'page_title': 'Staff Management',
        'staff_list': staff_list,
        'filter_form': filter_form,
        'total_staff': queryset.count(),
        'roles': all_roles,
        'departments': all_departments,
        'permissions_matrix': permissions_matrix,
        'paginator': paginator,
        'page_obj': staff_list,
        'is_paginated': staff_list.has_other_pages(),
        'page_obj_number': staff_list.number,
        'search_query': search,
    }
    return render(request, 'staff/management.html', context)

# ========================== AUTO GENERATE EMP ID ==========================

def generate_employee_id():
    staff_ids = Staff.objects.values_list('employee_id', flat=True)

    max_number = 0

    for employee_id in staff_ids:
        match = re.match(r'^EMP(\d+)$', employee_id)

        if match:
            number = int(match.group(1))

            if number > max_number:
                max_number = number

    return f"EMP{max_number + 1:03d}"

# ========================== CREATE NEW STAFF ==============================
def _get_staff_roles_map():
    """{ staff_id (str): role_name } — JS ku Reporting Manager dropdown 
    filter panna use aagum."""
    return {
        str(s.id): s.role.role_name
        for s in Staff.objects.filter(status='active').select_related('role')
    }



@login_required(login_url='staff_login')
@role_required(['Admin', 'Manager'])
def add_staff(request):
    if request.method == 'POST':
        form = StaffForm(request.POST, request.FILES)

        if form.is_valid():
            documents = request.FILES.getlist('documents')

            if not documents:
                form.add_error(None, 'At least one document is required.')
                return render(request, 'staff/add_staff.html', {
                    'page_title': 'Add New Staff',
                    'form': form
                })

            staff = form.save(commit=False)

            # ===== CREATE USER ACCOUNT FOR LOGIN =====
            password = form.cleaned_data.get('password')
            employee_id = form.cleaned_data.get('employee_id')
            email = form.cleaned_data.get('email')

            user = User.objects.create_user(
                username=employee_id,
                email=email,
                password=password
            )

            staff.user = user
            staff.save()

            for document in documents:
                StaffDocument.objects.create(
                    staff=staff,
                    document=document
                )

            messages.success(
                request,
                f"Staff member '{staff.full_name()}' added successfully!"
            )

            return redirect('overview', staff_id=staff.id)
        else:
            print(form.errors)
    else:
        form = StaffForm(
            initial={'employee_id': generate_employee_id()}
        )

    context = {
        'page_title': 'Add New Staff',
        'form': form,
        'staff_roles_map': _get_staff_roles_map(),
    }
    return render(request, 'staff/add_staff.html', context)

# ============================= CHECK EMAIL EXISTING (FOR VALIDATION) ===============================

def check_email(request):

    email = request.GET.get('email')
    staff_id = request.GET.get('staff_id')

    email_exists = Staff.objects.filter(
        email=email
    ).exclude(
        id=staff_id
    ).exists()

    return JsonResponse({
        'exists': email_exists
    })

# ======================= CHECK PHONE NO EXISTING (FOR VALIDATION) ====================

def check_phone(request):

    phone = request.GET.get('phone','').strip()
    staff_id = request.GET.get('staff_id')

    phone_exists = Staff.objects.filter(
        phone = phone
    ).exclude(
        id=staff_id
    ).exists()

    return JsonResponse({
        'exists':phone_exists
    })

# ========================== UPDATING STAFF ===================================
@login_required(login_url='staff_login')
@role_required(['Admin', 'Manager'])
def edit_staff(request, id):

    staff = get_object_or_404(Staff, id=id)

    # =========================================================
    # REPORTING MANAGER DROPDOWN
    # =========================================================
    reporting_managers = Staff.objects.filter(
        status='active'
    ).exclude(
        id=staff.id
    ).select_related('role')

    if request.method == 'POST':

        form = EditStaffForm(
            request.POST,
            request.FILES,
            instance=staff
        )

        # IMPORTANT
        form.fields['reporting_manager'].queryset = reporting_managers

        if form.is_valid():

            staff = form.save(commit=False)

            # Password empty -> old password remains
            password = form.cleaned_data.get('password')

            if password:
                staff.set_password(password)

            staff.save()

            messages.success(
                request,
                f'{staff.full_name()} updated successfully.'
            )

            return redirect('staff_management')

    else:

        form = EditStaffForm(instance=staff)

        # IMPORTANT
        form.fields['reporting_manager'].queryset = reporting_managers

    context = {
        'form': form,
        'staff': staff,
        'page_title': 'Edit Staff',

        # IMPORTANT FOR JS
        'staff_roles_map': _get_staff_roles_map(),

    }

    return render(
        request,
        'staff/edit_staff.html',
        context
    )
# ============================= STAFF DELETE ==================================

@login_required(login_url='staff_login')
@role_required(['Admin', 'Manager'])
def delete_staff(request, id):
    """Deleting staff member"""

    staff = get_object_or_404(Staff, id=id)

    if request.method == 'POST':
        staff.status = 'terminated'
        staff.save()
        messages.success(request, f"Staff member '{staff.full_name()}' terminated!")
        next_url = request.POST.get('next')

        if next_url:
            return redirect(next_url)

        return redirect('staff_management')
        
    context = {
        'page_title': 'Delete Staff',
        'staff': staff,
        'next_url': request.GET.get('next', ''),
    }

    return render(request, 'staff/confirm_delete.html', context)

# =========================== QUICK EDIT/AJAX ===================================

@login_required(login_url='staff_login')
def quick_edit_staff(request, id):
    """Quick edit via AJAX"""

    staff = get_object_or_404(Staff, id=id)

    if request.method == 'POST':
        form = StaffQuickEditForm(request.POST, instance=staff)
        if form.is_valid():
            form.save()

            # Check if it's an AJAX request
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': 'Updated Successfully'
                })
            else:
                messages.success(request, f"Staff '{staff.full_name}' updated successfully!")
        else:
            # Return JSON error response for AJAX
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'errors': form.errors
                })
    else:
        form = StaffQuickEditForm(instance=staff)

    context = {
        'page_title': f'Quick Edit - {staff.full_name}',
        'form': form,
        'staff': staff
    }

    return render(request, 'staff/quick_edit.html', context)

# ============================ EXPORT - STAFF LIST TO CSV ===============================

@login_required(login_url='staff_login')
def export_staff(request):
    """Export staff list as CSV"""

    my_staff = getattr(request.user, 'staff_profile', None)
    my_role = my_staff.role.role_name if my_staff and my_staff.role else None

    response = HttpResponse(content_type ='text/csv')
    response['Content-Disposition'] = 'attachement; filename="staff_list.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Employee ID', 'Name', 'Email', 'Phone', 'Role', 'Department',
        'Status', 'Monthly Target', 'Performance Rating', 'Date of Joining'
    ])

    # Get all staff (Admin's own record excluded — same as Staff Management list)
    staff_list = Staff.objects.exclude(role__role_name='Admin').select_related('role', 'department')

    # Sales Exec Lead -> Sales department only
    if my_role == 'Sales Exec Lead':
        staff_list = staff_list.filter(department__dept_name='Sales')

    # Marketing Lead -> Marketing department only
    elif my_role == 'Marketing Lead':
        staff_list = staff_list.filter(department__dept_name='Marketing')

    # Sales Exec, Digital Marketing, Content Creator, Developer -> own record only
    elif my_role in ['Sales Exec', 'Digital Marketing', 'Trainer', 'Content Creator', 'Developer']:
        staff_list = staff_list.filter(id=my_staff.id)

    # Admin, Manager, HR -> all staff (no filter)

    department = request.GET.get('department')
    role = request.GET.get('role')
    search = request.GET.get('search', '').strip()

    if department:
        staff_list = staff_list.filter(
            department_id=department
        )

    if role:
        staff_list = staff_list.filter(
            role_id=role
        )

    if search:
        staff_list = staff_list.filter(
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(email__icontains=search) |
            Q(employee_id__icontains=search)
        )

    for staff in staff_list:
        writer.writerow([
            staff.employee_id,
            staff.full_name(),
            staff.email,
            staff.phone,
            staff.role.get_role_name_display(),
            staff.department.get_dept_name_display(),
            staff.get_status_display(),
            staff.monthly_target,
            staff.performance_rating,
            staff.date_of_joining.strftime('%d-%m-%Y'),
        ])

    return response

# ===================================== STAFF OVERVIEW =========================

@login_required(login_url='staff_login')
def overview(request, staff_id=None):

    def get_weekly_enrollment_amounts(year, month, staff):
        week_amounts = {}
        last_day = calendar.monthrange(year, month)[1]

        staff_lead_phones = list(
            LeadCapture.objects.filter(
                assigned_to=staff,
                initial_status="enrolled"
            ).values_list("phone_no", flat=True)
        )

        students = Student.objects.filter(phone_no__in=staff_lead_phones)

        for week in range(1, 6):
            start_day = (week - 1) * 7 + 1
            end_day = min(start_day + 6, last_day)
            total = 0

            for student in students:
                admission = student.admissions.filter(status="enrolled").first()

                if not admission or not hasattr(admission, "enrollment"):
                    continue

                enrollment = admission.enrollment

                if (
                    enrollment.start_date.year == year
                    and enrollment.start_date.month == month
                    and start_day <= enrollment.start_date.day <= end_day
                ):
                    total += admission.course_name.course_fee

            week_amounts[week] = total

        return week_amounts

    # === STAFF ===
    if staff_id:
        staff = get_object_or_404(Staff, id=staff_id)
    else:
        staff = Staff.objects.filter(status="active").first()

    if not staff:
        return render(request, "staff/overview.html", {
            "error": "No active staff found."
        })

    now = timezone.now()
    week_amounts = get_weekly_enrollment_amounts(now.year, now.month, staff)
    week_data_this = [week_amounts.get(i, 0) for i in range(1, 6)]
    completed_amount = sum(week_data_this)

    # === TRAINER SCHEDULE (POST) ===
    if request.method == "POST" and "topic" in request.POST:
        date = request.POST.get("date")
        schedule_time = request.POST.get("time")
        schedule_type = request.POST.get("type")
        topic = request.POST.get("topic")
        status = request.POST.get("status", "upcoming")

        if all([date, schedule_time, schedule_type, topic]):
            TrainerSchedule.objects.create(
                staff=staff,
                date=date,
                time=schedule_time,
                type=schedule_type,
                topic=topic,
                status=status
            )
            messages.success(request, "Trainer schedule added successfully.")

        return redirect("overview", staff_id=staff.id)

    # === KPI: LEADS ===
    leads = LeadCapture.objects.filter(assigned_to=staff)
    assigned_leads = leads.count()
    converted_leads = leads.filter(initial_status="enrolled").count()
    pending_leads = leads.filter(
        initial_status__in=["new", "contacted", "interested", "demo_scheduled"]
    ).count()
    recent_leads = leads.order_by("-created_at")[:6]

    # === TARGET PROGRESS ===
    target_amount = float(staff.monthly_target or 0)
    progress_percentage = (
        round((completed_amount / target_amount) * 100) if target_amount > 0 else 0
    )
    progress_percentage = min(progress_percentage, 100)

    # === ATTENDANCE ===
    today = timezone.localdate()
    today_attendance = Attendance.objects.filter(
        staff=staff, date=today
    ).order_by("-id").first()

    today_status = today_attendance.status if today_attendance else "Absent"
    is_present_today = today_status in ["Present", "Late"]

    attendance_qs = Attendance.objects.filter(staff=staff)
    total_working_days = attendance_qs.count()
    present_days = attendance_qs.filter(status="Present").count()
    late_days = attendance_qs.filter(status="Late").count()
    absent_days = attendance_qs.filter(status="Absent").count()
    leave_days = attendance_qs.filter(status="Leave").count()

    attendance_score = present_days + (late_days * 0.5)
    attendance_percentage = (
        round((attendance_score / total_working_days) * 100)
        if total_working_days > 0 else 0
    )

    # === RATING ===
    rating = staff.performance_rating or 0

    # === SCHEDULE LIST ===
    schedules = TrainerSchedule.objects.filter(staff=staff).order_by("-date", "-time")

    # === WEEKLY TARGETS ===
    weekly_targets = [
        {"week_no": i, "completed_amount": week_amounts.get(i, 0)}
        for i in range(1, 6)
    ]

    # === CONTEXT ===
    context = {
        "staff": staff,

        "assigned_leads": assigned_leads,
        "converted_leads": converted_leads,
        "pending_leads": pending_leads,
        "recent_leads": recent_leads,

        "week_data_this": week_data_this,
        "completed_amount": completed_amount,
        "progress_percentage": progress_percentage,
        "week_amounts": week_amounts,
        "weekly_targets": weekly_targets,

        "today_attendance": today_attendance,
        "today_status": today_status,
        "is_present_today": is_present_today,
        "total_working_days": total_working_days,
        "present_days": present_days,
        "late_days": late_days,
        "absent_days": absent_days,
        "leave_days": leave_days,
        "attendance_percentage": attendance_percentage,

        "rating": rating,
        "schedules": schedules,
    }

    return render(request, "staff/overview.html", context)
    
# ============================== EXPORT OVERVIEW CSV ==============================



@login_required(login_url='staff_login')
def staff_export(request, id):

    staff = get_object_or_404(Staff, id=id)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = (
        f'attachment; filename="{staff.employee_id}_report.csv"'
    )

    writer = csv.writer(response)

    
    # STAFF DETAILS
   
    writer.writerow(['STAFF DETAILS'])

    writer.writerow([
        'Employee ID',
        'Name',
        'Email',
        'Phone',
        'Role',
        'Department',
        'Status',
        'Monthly Target',
        'Performance Rating',
        'Date Of Joining'
    ])

    writer.writerow([
        staff.employee_id,
        staff.full_name(),
        staff.email,
        staff.phone,
        staff.role.get_role_name_display(),
        staff.department.get_dept_name_display(),
        staff.get_status_display(),
        staff.monthly_target,
        staff.performance_rating,
        staff.date_of_joining.strftime('%d-%m-%Y')
        if staff.date_of_joining else ''
    ])

    writer.writerow([])

    role_name = staff.role.role_name

    
    # SALES EXECUTIVE & TELECALLER
   
    if role_name in ['sales_executive', 'telecaller']:

        leads = Lead.objects.filter(staff=staff)

        writer.writerow(['LEADS DATA'])

        writer.writerow([
            'Lead Name',
            'Phone',
            'Email',
            'Status',
            'Created At'
        ])

        for lead in leads:
            writer.writerow([
                lead.name,
                lead.phone,
                lead.email or '',
                lead.get_status_display(),
                lead.created_at.strftime('%d-%m-%Y %H:%M')
            ])

    
    # TRAINER
   
    elif role_name == 'trainer':

        schedules = TrainerSchedule.objects.filter(
            staff=staff
        ).order_by('-date', '-time')

        writer.writerow(['TRAINING SCHEDULE'])

        writer.writerow([
            'Date',
            'Time',
            'Class / Meeting',
            'Topic',
            'Status'
        ])

        for schedule in schedules:
            writer.writerow([
                schedule.date.strftime('%d-%m-%Y'),
                schedule.time.strftime('%I:%M %p'),
                schedule.get_type_display(),
                schedule.topic,
                schedule.get_status_display(),
            ])

    return response
 
#============================================================Attendance page=======================================================================   

def auto_checkout_pending_attendance():

    today = timezone.localdate()
    current_time = timezone.localtime(timezone.now())

    # ==========================================================
    # TODAY - AUTO CHECKOUT AT 7:00 PM
    # ==========================================================
    if current_time.time() >= time(19, 0):

        today_pending_attendance = Attendance.objects.filter(
            log_in__isnull=False,
            log_out__isnull=True,
            date=today
        )

        for attendance in today_pending_attendance:

            auto_logout_time = timezone.make_aware(
                datetime.combine(
                    attendance.date,
                    time(19, 0)
                )
            )

            attendance.log_out = auto_logout_time

            worked_time = (
                attendance.log_out -
                attendance.log_in
            )

            attendance.total_hours = worked_time

            worked_hours = (
                worked_time.total_seconds() / 3600
            )

            if worked_hours < 4:
                attendance.status = "Absent"

            attendance.save()

    # ==========================================================
    # PREVIOUS DAYS - AUTO CHECKOUT AT 6:30 PM
    # ==========================================================
    pending_attendance = Attendance.objects.filter(
        log_in__isnull=False,
        log_out__isnull=True,
        date__lt=today
    )

    for attendance in pending_attendance:

        auto_logout_time = timezone.make_aware(
            datetime.combine(
                attendance.date,
                time(18, 30)
            )
        )

        attendance.log_out = auto_logout_time

        worked_time = (
            attendance.log_out -
            attendance.log_in
        )

        attendance.total_hours = worked_time

        worked_hours = (
            worked_time.total_seconds() / 3600
        )

        if worked_hours < 4:
            attendance.status = "Absent"

        attendance.save()

#======attendance=========
@login_required(login_url='staff_login')
def attendance_page(request, id):

    auto_checkout_pending_attendance()
    staff = get_object_or_404(Staff, id=id)
    
    if staff.role.role_name == "Admin":
        messages.error(request, "Attendance is not applicable for Admin.")
        return redirect("overview", staff_id=staff.id)  
    # ================= TODAY =================
    today = timezone.localdate()

    today_attendance = Attendance.objects.filter(staff=staff,date=today ).first()
    current_time = timezone.localtime(timezone.now())

    is_checkout_closed = current_time.time() >= time(19, 0)

    is_checkin_done = False
    is_checkout_done = False
    is_leave_or_absent = False

    if today_attendance:

        if today_attendance.log_in:
            is_checkin_done = True

        if today_attendance.log_out:
            is_checkout_done = True

        if today_attendance.status in ['Leave', 'Absent']:
            is_leave_or_absent = True

    today_status = today_attendance.status if today_attendance else 'Absent'
    
    show_checkout = False

    if (
       today_attendance and
       today_attendance.log_in and
       not today_attendance.log_out):

       show_checkout = True
    # ================= HISTORY =================
    attendance_data = Attendance.objects.filter( staff=staff).order_by('-date')

    filter_date = request.GET.get('date')
    month = request.GET.get('month')
    year = request.GET.get('year')

    if filter_date:
        attendance_data = attendance_data.filter(date=filter_date)

    if month:
        attendance_data = attendance_data.filter(date__month=month)

    if year:
        attendance_data = attendance_data.filter(date__year=year)

    # ================= COUNTS =================
    total_working_days = attendance_data.count()
    present_days = attendance_data.filter(status__in=['Present', 'Late']).count()
    absent_days = attendance_data.filter(status='Absent').count()
    leave_days = attendance_data.filter(status='Leave').count()
    late_days = attendance_data.filter(status='Late').count()

    attendance_score = (attendance_data.filter(status='Present').count() +(late_days * 0.5))

    if total_working_days > 0:
        attendance_percentage = int(attendance_score / total_working_days * 100)
    else:
        attendance_percentage = 0
    
# ================= PAGINATION =================
    paginator = Paginator(attendance_data, 6)

    page_number = request.GET.get("page")

    attendance_data = paginator.get_page(page_number)

    # ================= CONTEXT =================
    context = {
        'attendance_data': attendance_data,
        'total_working_days': total_working_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'leave_days': leave_days,
        'late_days': late_days,
        'attendance_percentage': attendance_percentage,
        'today_status': today_status,
        'today_attendance': today_attendance,
        'show_checkout': show_checkout,
        'staff': staff,
        'active_attendance': Attendance.objects.filter(
        staff=staff,
        log_in__isnull=False,
        log_out__isnull=True
        ).order_by('-id').first(),

        'is_checkin_done': is_checkin_done,

        'is_checkout_done': is_checkout_done,

        'is_leave_or_absent': is_leave_or_absent,

        'is_checkout_closed': is_checkout_closed,
        
    }

    return render(request, 'staff/attendance.html', context)


#======================================== export atttendance btn ======================

@login_required(login_url='staff_login')
def export_attendance(request, id):

    staff = get_object_or_404(Staff, id=id)

    attendance_data = Attendance.objects.filter(staff=staff)

    filter_date = request.GET.get('date')
    month = request.GET.get('month')
    year = request.GET.get('year')

    if filter_date:
        attendance_data = attendance_data.filter(date=filter_date)

    if month:
        attendance_data = attendance_data.filter(date__month=month)

    if year:
        attendance_data = attendance_data.filter(date__year=year)

    attendance_data = attendance_data.order_by('-date')

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance"

    ws.append(["Date", "Log In", "Log Out", "Status", "Hours"])

    for a in attendance_data:
        ws.append([
            str(a.date),
            a.log_in.strftime("%I:%M %p") if a.log_in else "--",
            a.log_out.strftime("%I:%M %p") if a.log_out else "--",
            a.status,
            str(a.total_hours) if a.total_hours else "--"
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    response['Content-Disposition'] = f'attachment; filename=attendance_{staff.employee_id}.xlsx'

    wb.save(response)

    return response
#==========================================staff-checkin page===============================================
@login_required(login_url='staff_login')
def staff_checkin(request, id):

    auto_checkout_pending_attendance()

    staff = get_object_or_404(Staff, id=id)
    today = timezone.localdate()
    current_time = timezone.localtime(timezone.now())
    is_checkout_closed = current_time.time() >= time(19, 0)

    today_attendance = Attendance.objects.filter(staff=staff, date=today).first()

    is_checkin_done = False
    is_checkout_done = False
    is_leave_or_absent = False

    if today_attendance:
        if today_attendance.log_in:
            is_checkin_done = True
        if today_attendance.log_out:
            is_checkout_done = True
        if today_attendance.status in ['Leave', 'Absent']:
            is_leave_or_absent = True

    if request.method == 'POST':

        if staff.date_of_joining > today:
            messages.error(request, "Attendance cannot be marked before joining date.")
            return redirect('staff_dashboard')

        if staff.role.role_name == "Admin":
            messages.error(request, "Attendance is not applicable for Admin.")
            return redirect('staff_dashboard')

        action = request.POST.get('action')
        current_time = timezone.localtime(timezone.now())

        attendance, created = Attendance.objects.get_or_create(
            staff=staff,
            date=today
        )

        if action == 'checkin':
            if current_time.time() >= time(19, 0):
                messages.error(request, "Check-In is not allowed after 7:00 PM.")
                return redirect('staff_dashboard')

            if attendance.log_in:
                messages.error(request, "You have already checked in today.")
                return redirect('staff_dashboard')

            attendance.log_in = current_time
            attendance.log_out = None
            attendance.total_hours = None
            office_time = datetime.strptime("09:15", "%H:%M").time()
            attendance.status = 'Late' if current_time.time() > office_time else 'Present'
            attendance.save()
            messages.success(request, "Check-In completed successfully.")

        elif action == 'checkout':
            if not attendance.log_in:
                messages.error(request, "Please check in first before checking out.")
                return redirect('staff_dashboard')

            if attendance.log_out:
                messages.error(request, "You have already checked out today.")
                return redirect('staff_dashboard')

            if current_time.time() >= time(19, 0):
                messages.error(request, "Checkout is allowed only until 7:00 PM.")
                return redirect('staff_dashboard')

            attendance.log_out = current_time
            worked_time = attendance.log_out - attendance.log_in
            attendance.total_hours = worked_time
            worked_hours = worked_time.total_seconds() / 3600
            if worked_hours < 4:
                attendance.status = 'Absent'
            attendance.save()
            messages.success(request, "Check-Out completed successfully.")

        elif action == 'leave':
            attendance.status = 'Leave'
            attendance.log_in = None
            attendance.log_out = None
            attendance.total_hours = None
            attendance.save()
            messages.success(request, "Leave marked successfully.")

        elif action == 'absent':
            attendance.status = 'Absent'
            attendance.log_in = None
            attendance.log_out = None
            attendance.total_hours = None
            attendance.save()
            messages.success(request, "Absent marked successfully.")

        return redirect('staff_dashboard')

    active_attendance = Attendance.objects.filter(
        staff=staff, log_in__isnull=False, log_out__isnull=True
    ).order_by('-id').first()

    return render(request, 'staff/staff_checkin.html', {
        'active_attendance': active_attendance,
        'staff': staff,
        'is_checkin_done': is_checkin_done,
        'is_checkout_done': is_checkout_done,
        'is_leave_or_absent': is_leave_or_absent,
        'is_checkout_closed': is_checkout_closed,
    })

# ================================ DOCUMENT VIEWS ================================

def _detect_document_type(filename):
    """Auto-detect document type from filename keywords."""
    import os
    name = os.path.splitext(filename)[0].lower()
    if any(k in name for k in ['aadhaar', 'aadhar', 'uid']):
        return 'aadhaar', 'Aadhaar Card'
    if any(k in name for k in ['pan', 'pancard']):
        return 'pan', 'PAN Card'
    if 'passport' in name:
        return 'other', 'Passport'
    if any(k in name for k in ['resume', 'cv']):
        return 'resume', 'Resume'
    if any(k in name for k in ['offer', 'appointment']):
        return 'offer_letter', 'Offer Letter'
    if any(k in name for k in ['certificate', 'cert', 'degree', 'diploma']):
        return 'certificate', 'Certificate'
    return 'other', os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()


def _ensure_legacy_document(staff):
    """If staff has a legacy documents field file, create a StaffDocument entry for it."""
    import os
    if not staff.documents:
        return
    # Check if already imported
    existing = StaffDocument.objects.filter(staff=staff, document=staff.documents.name)
    if existing.exists():
        return
    filename = os.path.basename(staff.documents.name)
    doc_type, doc_name = _detect_document_type(filename)
    StaffDocument.objects.create(
        staff=staff,
        document_name=doc_name,
        document_type=doc_type,
        document=staff.documents.name,
        status='pending',
    )


@login_required(login_url='staff_login')
def staff_documents(request, staff_id):
    """View documents for a specific staff member"""
    staff = get_object_or_404(Staff, id=staff_id)

    documents = StaffDocument.objects.filter(staff=staff).order_by('-uploaded_at')

    if request.method == 'POST':
        uploaded_file = request.FILES.get('file')

        if uploaded_file:
            StaffDocument.objects.create(
                staff=staff,
                document=uploaded_file
            )

            messages.success(request, f"Document '{uploaded_file.name}' uploaded successfully!")
            return redirect('staff_documents', staff_id=staff.id)

        else:
            messages.error(request, 'Please select a file to upload.')

    context = {
        'staff': staff,
        'documents': documents,
        'total_count': documents.count(),
    }

    return render(request, 'staff/documents.html', context)

@login_required(login_url='staff_login')
def delete_document(request, doc_id):
    """Delete a staff document"""
    import os

    doc = get_object_or_404(StaffDocument, id=doc_id)
    staff_id = doc.staff.id

    # Get file name before deleting
    document_display_name = os.path.basename(doc.document.name) if doc.document else "Document"

    if request.method == 'POST':
        if doc.document:
            doc.document.delete(save=False)

        doc.delete()
        messages.success(request, f"Document '{document_display_name}' deleted.")

    return redirect('staff_documents', staff_id=staff_id)


@login_required(login_url='staff_login')
def update_document_status(request, doc_id):
    """Update document verification status"""
    doc = get_object_or_404(StaffDocument, id=doc_id)
    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in ['pending', 'verified', 'rejected']:
            doc.status = new_status
            doc.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True, 'status': new_status})
    return redirect('staff_documents', staff_id=doc.staff.id)

    
# ================================ Dashboard View ===================================


@login_required(login_url='staff_login')
def staff_dashboard(request):

    auto_checkout_pending_attendance()

    # ================================
    # STAFF DASHBOARD
    # ================================

    total_staff = Staff.objects.exclude(role__role_name='Admin').count()

    active_staff = Staff.objects.exclude(role__role_name='Admin').filter(status='active').count()

    on_leave = Staff.objects.exclude(role__role_name='Admin').filter(status='on_leave').count()

    terminate = Staff.objects.exclude(role__role_name='Admin').filter(status='terminated').count()

    inactive = Staff.objects.exclude(role__role_name='Admin').filter(status='inactive').count()

    recent_staff = Staff.objects.exclude(
        role__role_name='Admin'
    ).order_by('-created_at')[:5]

    average_rating = round(
        Staff.objects.exclude(role__role_name='Admin').aggregate(
            Avg('performance_rating')
        )['performance_rating__avg'] or 0,
        2
    )

    today = timezone.localdate()

    present = Attendance.objects.exclude(staff__role__role_name='Admin').filter(
        date=today,
        status='Present'
    ).count()

    late = Attendance.objects.exclude(staff__role__role_name='Admin').filter(
        date=today,
        status='Late'
    ).count()

    absent = Attendance.objects.exclude(staff__role__role_name='Admin').filter(
        date=today,
        status='Absent'
    ).count()

    leave = Attendance.objects.exclude(staff__role__role_name='Admin').filter(
        date=today,
        status='Leave'
    ).count()

    departments = Department.objects.annotate(
        total_staff=Count(
            'staff_members',
            filter=~Q(staff_members__role__role_name='Admin')
        )
    ).order_by('dept_name')

    total_attendance = present + late + absent + leave

    my_staff = getattr(request.user, 'staff_profile', None)

    # ================================
    # TRAINER - MY STUDENTS & BATCHES
    # ================================

    trainer_total_students = 0
    trainer_active_students = 0
    trainer_completed_students = 0
    trainer_dropped_students = 0
    trainer_recent_students = []

    trainer_active_students_pct = 0
    trainer_completed_students_pct = 0
    trainer_dropped_students_pct = 0

    trainer_active_students_deg = 0
    trainer_completed_students_deg = 0
    trainer_dropped_students_deg = 0

    trainer_total_batches = 0
    trainer_ongoing_batches = 0
    trainer_upcoming_batches = 0
    trainer_completed_batches = 0
    trainer_batch_summary = Batch.objects.none()

    if my_staff and my_staff.role and my_staff.role.role_name == 'Trainer':

        trainer_enrollments = Enrollment.objects.filter(
            batch__trainer=my_staff
        )

        trainer_total_students = trainer_enrollments.values(
            'admission__student'
        ).distinct().count()

        trainer_active_students = trainer_enrollments.filter(
            batch__status='Ongoing'
        ).count()

        trainer_completed_students = trainer_enrollments.filter(
            batch__status='Completed'
        ).count()

        trainer_dropped_students = Admission.objects.filter(
            status='dropped',
            enrollment__batch__trainer=my_staff
        ).count()

        trainer_recent_students = Student.objects.filter(
            admissions__enrollment__batch__trainer=my_staff
        ).distinct().order_by('-id')[:5]

        if trainer_total_students > 0:

            trainer_active_students_pct = round(
                (trainer_active_students / trainer_total_students) * 100,
                1
            )

            trainer_completed_students_pct = round(
                (trainer_completed_students / trainer_total_students) * 100,
                1
            )

            trainer_dropped_students_pct = round(
                (trainer_dropped_students / trainer_total_students) * 100,
                1
            )

        trainer_active_students_deg = trainer_active_students_pct * 3.6

        trainer_completed_students_deg = (
            trainer_active_students_deg +
            (trainer_completed_students_pct * 3.6)
        )

        trainer_dropped_students_deg = (
            trainer_completed_students_deg +
            (trainer_dropped_students_pct * 3.6)
        )

        trainer_batches_qs = Batch.objects.filter(
            trainer=my_staff
        )

        trainer_total_batches = trainer_batches_qs.count()

        trainer_ongoing_batches = trainer_batches_qs.filter(
            status='Ongoing'
        ).count()

        trainer_upcoming_batches = trainer_batches_qs.filter(
            status='Upcoming'
        ).count()

        trainer_completed_batches = trainer_batches_qs.filter(
            status='Completed'
        ).count()

        trainer_batch_summary = trainer_batches_qs.select_related(
            'course',
            'trainer'
        ).annotate(
            enrolled_students=Count('enrollments'),
            occupancy_percentage=ExpressionWrapper(
                Count('enrollments') * 100.0 / F('max_students'),
                output_field=FloatField()
            )
        ).order_by(
            '-enrolled_students',
            'batch_name'
        )

    # ============================================
    # MY DEPARTMENT ATTENDANCE
    # ============================================

    my_dept_present = 0
    my_dept_late = 0
    my_dept_absent = 0
    my_dept_leave = 0

    my_dept_attendance_percentage = 0
    my_department_name = None

    if my_staff and my_staff.department:

        my_department_name = my_staff.department.get_dept_name_display()

        my_dept_staff_ids = Staff.objects.exclude(
            role__role_name='Admin'
        ).filter(
            department=my_staff.department,
            status='active'
        ).values_list('id', flat=True)

        my_dept_present = Attendance.objects.filter(
            staff_id__in=my_dept_staff_ids,
            date=today,
            status='Present'
        ).count()

        my_dept_late = Attendance.objects.filter(
            staff_id__in=my_dept_staff_ids,
            date=today,
            status='Late'
        ).count()

        my_dept_absent = Attendance.objects.filter(
            staff_id__in=my_dept_staff_ids,
            date=today,
            status='Absent'
        ).count()

        my_dept_leave = Attendance.objects.filter(
            staff_id__in=my_dept_staff_ids,
            date=today,
            status='Leave'
        ).count()

        my_dept_total_staff = my_dept_staff_ids.count()

        my_dept_attendance_percentage = (
            round(
                (
                    (my_dept_present + my_dept_late)
                    / my_dept_total_staff
                ) * 100,
                1
            )
            if my_dept_total_staff > 0
            else 0
        )

    # ================================
    # MY ATTENDANCE
    # ================================

    if my_staff:

        my_attendance_qs = Attendance.objects.filter(
            staff=my_staff
        )

        my_total_days = my_attendance_qs.count()

        my_present_days = my_attendance_qs.filter(
            status='Present'
        ).count()

        my_late_days = my_attendance_qs.filter(
            status='Late'
        ).count()

        my_absent_days = my_attendance_qs.filter(
            status='Absent'
        ).count()

        my_leave_days = my_attendance_qs.filter(
            status='Leave'
        ).count()

        my_score = my_present_days + (my_late_days * 0.5)

        my_attendance_percentage = (
            round((my_score / my_total_days) * 100)
            if my_total_days > 0
            else 0
        )

    else:

        my_present_days = 0
        my_late_days = 0
        my_absent_days = 0
        my_leave_days = 0
        my_attendance_percentage = 0

    # ================================
    # CHECK-IN
    # ================================

    today_attendance_for_me = None
    today_status_for_me = 'Absent'
    show_checkout_for_me = False
    is_checkout_closed_for_me = True

    if my_staff:

        today_attendance_for_me = Attendance.objects.filter(
            staff=my_staff,
            date=today
        ).first()

        today_status_for_me = (
            today_attendance_for_me.status
            if today_attendance_for_me
            else 'Absent'
        )

        current_time = timezone.localtime(timezone.now())

        is_checkout_closed_for_me = (
            current_time.time() >= time(19, 0)
        )

        if (
            today_attendance_for_me
            and today_attendance_for_me.log_in
            and not today_attendance_for_me.log_out
        ):
            show_checkout_for_me = True

    is_checkin_done_for_me = bool(
        today_attendance_for_me
        and today_attendance_for_me.log_in
    )

    is_checkout_done_for_me = bool(
        today_attendance_for_me
        and today_attendance_for_me.log_out
    )

    is_leave_or_absent_for_me = bool(
        today_attendance_for_me
        and today_attendance_for_me.status in [
            'Leave',
            'Absent'
        ]
    )

    active_attendance_for_me = (
        today_attendance_for_me
        if (
            today_attendance_for_me
            and today_attendance_for_me.log_in
            and not today_attendance_for_me.log_out
        )
        else None
    )

    if total_attendance > 0:

        attendance_percentage = round(
            (
                (present + late)
                / active_staff
            ) * 100,
            1
        )

    else:

        attendance_percentage = 0

    staff_status = {
        'Active': active_staff,
        'On Leave': on_leave,
        'Inactive': inactive,
        'Terminated': terminate,
        'my_present_days': my_present_days,
    }

    roles = StaffRole.objects.annotate(
        total_staff=Count('staff_members')
    )

    # ================================
    # LEAD DASHBOARD
    # ================================

    total_leads = LeadCapture.objects.count()

    new_leads = LeadCapture.objects.filter(
        initial_status='new'
    ).count()

    contacted_leads = LeadCapture.objects.filter(
        initial_status='contacted'
    ).count()

    interested_leads = LeadCapture.objects.filter(
        initial_status='interested'
    ).count()

    demo_leads = LeadCapture.objects.filter(
        initial_status='demo_scheduled'
    ).count()

    enrolled_leads = LeadCapture.objects.filter(
        initial_status='enrolled'
    ).count()

    lost_leads = LeadCapture.objects.filter(
        initial_status='lost'
    ).count()

    # =====================================================
    # MY LEADS
    # =====================================================

    my_leads_qs = (
        LeadCapture.objects.filter(
            assigned_to=my_staff
        )
        if my_staff
        else LeadCapture.objects.none()
    )

    my_total_leads = my_leads_qs.count()

    my_new_leads = my_leads_qs.filter(
        initial_status='new'
    ).count()

    my_contacted_leads = my_leads_qs.filter(
        initial_status='contacted'
    ).count()

    my_interested_leads = my_leads_qs.filter(
        initial_status='interested'
    ).count()

    my_demo_leads = my_leads_qs.filter(
        initial_status='demo_scheduled'
    ).count()

    my_enrolled_leads = my_leads_qs.filter(
        initial_status='enrolled'
    ).count()

    my_lost_leads = my_leads_qs.filter(
        initial_status='lost'
    ).count()

    my_due_today = my_leads_qs.filter(
        next_followup_date=today
    ).exclude(
        initial_status__in=[
            'enrolled',
            'lost'
        ]
    ).count()

    my_overdue_count = my_leads_qs.filter(
        next_followup_date__lt=today
    ).exclude(
        initial_status__in=[
            'enrolled',
            'lost'
        ]
    ).count()

    if my_total_leads > 0:

        my_conversion_rate = round(
            (my_enrolled_leads / my_total_leads) * 100,
            1
        )

        my_new_leads_pct = round(
            (my_new_leads / my_total_leads) * 100,
            1
        )

        my_contacted_leads_pct = round(
            (my_contacted_leads / my_total_leads) * 100,
            1
        )

        my_interested_leads_pct = round(
            (my_interested_leads / my_total_leads) * 100,
            1
        )

        my_demo_leads_pct = round(
            (my_demo_leads / my_total_leads) * 100,
            1
        )

        my_enrolled_leads_pct = round(
            (my_enrolled_leads / my_total_leads) * 100,
            1
        )

        my_lost_leads_pct = round(
            (my_lost_leads / my_total_leads) * 100,
            1
        )

    else:

        my_conversion_rate = 0

        my_new_leads_pct = 0
        my_contacted_leads_pct = 0
        my_interested_leads_pct = 0
        my_demo_leads_pct = 0
        my_enrolled_leads_pct = 0
        my_lost_leads_pct = 0

    my_new_leads_deg = my_new_leads_pct * 3.6

    my_contacted_leads_deg = (
        my_new_leads_deg +
        (my_contacted_leads_pct * 3.6)
    )

    my_interested_leads_deg = (
        my_contacted_leads_deg +
        (my_interested_leads_pct * 3.6)
    )

    my_demo_leads_deg = (
        my_interested_leads_deg +
        (my_demo_leads_pct * 3.6)
    )

    my_enrolled_leads_deg = (
        my_demo_leads_deg +
        (my_enrolled_leads_pct * 3.6)
    )

    # ==========================================
    # LEAD PERCENTAGE
    # ==========================================

    if total_leads > 0:

        new_leads_pct = round(
            (new_leads / total_leads) * 100,
            1
        )

        contacted_leads_pct = round(
            (contacted_leads / total_leads) * 100,
            1
        )

        interested_leads_pct = round(
            (interested_leads / total_leads) * 100,
            1
        )

        demo_leads_pct = round(
            (demo_leads / total_leads) * 100,
            1
        )

        enrolled_leads_pct = round(
            (enrolled_leads / total_leads) * 100,
            1
        )

        lost_leads_pct = round(
            (lost_leads / total_leads) * 100,
            1
        )

    else:

        new_leads_pct = 0
        contacted_leads_pct = 0
        interested_leads_pct = 0
        demo_leads_pct = 0
        enrolled_leads_pct = 0
        lost_leads_pct = 0

    # ==========================================
    # LEAD DONUT DEGREES
    # ==========================================

    new_leads_deg = new_leads_pct * 3.6

    contacted_leads_deg = (
        new_leads_deg +
        (contacted_leads_pct * 3.6)
    )

    interested_leads_deg = (
        contacted_leads_deg +
        (interested_leads_pct * 3.6)
    )

    demo_leads_deg = (
        interested_leads_deg +
        (demo_leads_pct * 3.6)
    )

    enrolled_leads_deg = (
        demo_leads_deg +
        (enrolled_leads_pct * 3.6)
    )

    # ================================
    # CONVERSION RATE
    # ================================

    if total_leads > 0:

        conversion_rate = round(
            (enrolled_leads / total_leads) * 100,
            1
        )

    else:

        conversion_rate = 0

    # =====================================================
    # RECENT LEADS
    # =====================================================

    if (
        my_staff
        and my_staff.role
        and my_staff.role.role_name == 'Sales Exec'
    ):

        recent_leads = LeadCapture.objects.filter(
            assigned_to=my_staff
        ).select_related(
            'assigned_to'
        ).order_by(
            '-created_at'
        )[:5]

    else:

        recent_leads = LeadCapture.objects.select_related(
            'assigned_to'
        ).order_by(
            'created_at'
        )[:5]

    # =====================================================
    # MARKETING - CAPTURE TARGET COUNTS
    # =====================================================

    my_targets_total = 0
    my_targets_completed = 0
    my_targets_active = 0
    my_targets_expired = 0

    my_capture_target = None
    my_captured_leads_count = 0

    marketing_team_targets_total = 0
    marketing_team_targets_completed = 0
    marketing_team_targets_active = 0
    marketing_team_targets_expired = 0

    marketing_team_captured_leads_count = 0

    if (
        my_staff
        and my_staff.role
        and my_staff.role.role_name in [
            'Marketing Lead',
            'Digital Marketing'
        ]
    ):

        my_targets_qs = LeadCaptureTarget.objects.filter(
            assigned_to=my_staff
        )

        my_targets_total = my_targets_qs.count()

        my_targets_completed = my_targets_qs.filter(
            is_completed=True
        ).count()

        my_targets_expired = my_targets_qs.filter(
            is_completed=False,
            end_date__lt=today
        ).count()

        my_targets_active = my_targets_qs.filter(
            is_completed=False,
            end_date__gte=today
        ).count()

        # My own current capture target
        my_capture_target = my_targets_qs.order_by(
            '-created_at'
        ).first()

        # =================================================
        # FIX:
        # LeadCapture has NO captured_by field.
        # Use assigned_to instead.
        # =================================================

        my_captured_leads_count = LeadCapture.objects.filter(
            assigned_to=my_staff
        ).count()

    if (
        my_staff
        and my_staff.role
        and my_staff.role.role_name == 'Marketing Lead'
    ):

        marketing_team_targets_qs = LeadCaptureTarget.objects.filter(
            assigned_to__department__dept_name='Marketing'
        )

        marketing_team_targets_total = (
            marketing_team_targets_qs.count()
        )

        marketing_team_targets_completed = (
            marketing_team_targets_qs.filter(
                is_completed=True
            ).count()
        )

        marketing_team_targets_expired = (
            marketing_team_targets_qs.filter(
                is_completed=False,
                end_date__lt=today
            ).count()
        )

        marketing_team_targets_active = (
            marketing_team_targets_qs.filter(
                is_completed=False,
                end_date__gte=today
            ).count()
        )

        # =================================================
        # FIX:
        # LeadCapture has NO captured_by field.
        # Use assigned_to__department instead.
        # =================================================

        marketing_team_captured_leads_count = (
            LeadCapture.objects.filter(
                assigned_to__department__dept_name='Marketing'
            ).count()
        )

    # =====================================================
    # TODAY'S FOLLOW-UPS
    # =====================================================

    today_followups = LeadCapture.objects.filter(
        next_followup_date=today
    ).exclude(
        initial_status__in=[
            'enrolled',
            'lost'
        ]
    )

    # =====================================================
    # FOLLOW-UP SUMMARY
    # =====================================================

    due_today = today_followups.count()

    overdue_count = LeadCapture.objects.filter(
        next_followup_date=today
    ).exclude(
        initial_status__in=[
            'enrolled',
            'lost'
        ]
    ).count()

    completed_today = LeadCapture.objects.filter(
        updated_at__date=today,
        initial_status__in=[
            'enrolled',
            'lost'
        ]
    ).count()

    # =====================================================
    # LEAD SOURCE SUMMARY
    # =====================================================

    lead_sources = LeadCapture.objects.values(
        'lead_source'
    ).annotate(
        total=Count('id')
    ).order_by('-total')

    # =====================================================
    # COURSE INTEREST SUMMARY
    # =====================================================

    course_interseted = LeadCapture.objects.values(
        'course_interested'
    ).annotate(
        total=Count('id')
    ).order_by('-total')

    # =====================================================
    # ASSIGNED STAFF SUMMARY
    # =====================================================

    assigned_staff = LeadCapture.objects.values(
        'assigned_to__first_name',
        'assigned_to__last_name'
    ).annotate(
        total_leads=Count('id')
    ).order_by('-total_leads')

    # ================================
    # STUDENT DASHBOARD
    # ================================

    total_students = Student.objects.count()

    active_students = Enrollment.objects.filter(
        batch__status='Ongoing'
    ).count()

    completed_students = Enrollment.objects.filter(
        batch__status='Completed'
    ).count()

    dropped_students = Admission.objects.filter(
        status='dropped'
    ).count()

    recent_students = Student.objects.order_by(
        '-id'
    )[:5]

    # ==========================================
    # STUDENT PERCENTAGE
    # ==========================================

    if total_students > 0:

        active_students_pct = round(
            (active_students / total_students) * 100,
            1
        )

        completed_students_pct = round(
            (completed_students / total_students) * 100,
            1
        )

        dropped_students_pct = round(
            (dropped_students / total_students) * 100,
            1
        )

    else:

        active_students_pct = 0
        completed_students_pct = 0
        dropped_students_pct = 0

    active_students_deg = active_students_pct * 3.6

    completed_students_deg = (
        active_students_deg +
        (completed_students_pct * 3.6)
    )

    dropped_students_deg = (
        completed_students_deg +
        (dropped_students_pct * 3.6)
    )

    # ================================
    # BATCH DASHBOARD
    # ================================

    total_batches = Batch.objects.count()

    ongoing_batches = Batch.objects.filter(
        status='Ongoing'
    ).count()

    upcoming_batches = Batch.objects.filter(
        status='Upcoming'
    ).count()

    completed_batches = Batch.objects.filter(
        status='Completed'
    ).count()

    batch_summary = Batch.objects.select_related(
        'course',
        'trainer'
    ).annotate(
        enrolled_students=Count('enrollments'),
        occupancy_percentage=ExpressionWrapper(
            Count('enrollments') * 100.0 / F('max_students'),
            output_field=FloatField()
        )
    ).order_by(
        '-enrolled_students',
        'batch_name'
    )

    # ================================
    # CONTEXT
    # ================================

    context = {

        # Staff Module

        'total_staff': total_staff,
        'active_staff': active_staff,
        'on_leave': on_leave,
        'terminated': terminate,
        'inactive': inactive,
        'recent_staff': recent_staff,
        'average_rating': average_rating,
        'present': present,
        'late': late,
        'absent': absent,
        'leave': leave,
        'departments': departments,
        'attendance_percentage': attendance_percentage,
        'staff_status': staff_status,
        'roles': roles,

        # Leads Module

        'total_leads': total_leads,
        'new_leads': new_leads,
        'contacted_leads': contacted_leads,
        'interested_leads': interested_leads,
        'demo_leads': demo_leads,
        'enrolled_leads': enrolled_leads,
        'lost_leads': lost_leads,
        'conversion_rate': conversion_rate,
        'recent_leads': recent_leads,
        'today_followups': today_followups,
        'due_today': due_today,
        'overdue_count': overdue_count,
        'completed_today': completed_today,
        'lead_sources': lead_sources,
        'course_interseted': course_interseted,
        'assigned_staff': assigned_staff,

        'new_leads_pct': new_leads_pct,
        'contacted_leads_pct': contacted_leads_pct,
        'interested_leads_pct': interested_leads_pct,
        'demo_leads_pct': demo_leads_pct,
        'enrolled_leads_pct': enrolled_leads_pct,
        'lost_leads_pct': lost_leads_pct,

        'new_leads_deg': new_leads_deg,
        'contacted_leads_deg': contacted_leads_deg,
        'interested_leads_deg': interested_leads_deg,
        'demo_leads_deg': demo_leads_deg,
        'enrolled_leads_deg': enrolled_leads_deg,

        # Student Module

        'total_students': total_students,
        'active_students': active_students,
        'completed_students': completed_students,
        'dropped_students': dropped_students,
        'recent_students': recent_students,

        'active_students_pct': active_students_pct,
        'completed_students_pct': completed_students_pct,
        'dropped_students_pct': dropped_students_pct,

        'active_students_deg': active_students_deg,
        'completed_students_deg': completed_students_deg,
        'dropped_students_deg': dropped_students_deg,

        # Batch Module

        'total_batches': total_batches,
        'ongoing_batches': ongoing_batches,
        'upcoming_batches': upcoming_batches,
        'completed_batches': completed_batches,
        'batch_summary': batch_summary,

        # My Attendance

        'my_late_days': my_late_days,
        'my_absent_days': my_absent_days,
        'my_leave_days': my_leave_days,
        'my_attendance_percentage': my_attendance_percentage,

        # Check-in

        'today_attendance': today_attendance_for_me,
        'today_status_for_me': today_status_for_me,
        'show_checkout_for_me': show_checkout_for_me,
        'is_checkin_done_for_me': is_checkin_done_for_me,
        'is_checkout_done_for_me': is_checkout_done_for_me,
        'is_leave_or_absent_for_me': is_leave_or_absent_for_me,
        'active_attendance_for_me': active_attendance_for_me,
        'is_checkout_closed_for_me': is_checkout_closed_for_me,

        # My Department Attendance

        'my_dept_present': my_dept_present,
        'my_dept_late': my_dept_late,
        'my_dept_absent': my_dept_absent,
        'my_dept_leave': my_dept_leave,
        'my_dept_attendance_percentage':
            my_dept_attendance_percentage,
        'my_department_name': my_department_name,

        # Sales Exec Own Leads

        'my_total_leads': my_total_leads,
        'my_new_leads': my_new_leads,
        'my_contacted_leads': my_contacted_leads,
        'my_interested_leads': my_interested_leads,
        'my_demo_leads': my_demo_leads,
        'my_enrolled_leads': my_enrolled_leads,
        'my_lost_leads': my_lost_leads,
        'my_due_today': my_due_today,
        'my_overdue_count': my_overdue_count,
        'my_conversion_rate': my_conversion_rate,

        'my_new_leads_pct': my_new_leads_pct,
        'my_contacted_leads_pct': my_contacted_leads_pct,
        'my_interested_leads_pct': my_interested_leads_pct,
        'my_demo_leads_pct': my_demo_leads_pct,
        'my_enrolled_leads_pct': my_enrolled_leads_pct,
        'my_lost_leads_pct': my_lost_leads_pct,

        'my_new_leads_deg': my_new_leads_deg,
        'my_contacted_leads_deg': my_contacted_leads_deg,
        'my_interested_leads_deg': my_interested_leads_deg,
        'my_demo_leads_deg': my_demo_leads_deg,
        'my_enrolled_leads_deg': my_enrolled_leads_deg,

        # Trainer

        'trainer_total_students': trainer_total_students,
        'trainer_active_students': trainer_active_students,
        'trainer_completed_students': trainer_completed_students,
        'trainer_dropped_students': trainer_dropped_students,
        'trainer_recent_students': trainer_recent_students,

        'trainer_active_students_pct':
            trainer_active_students_pct,
        'trainer_completed_students_pct':
            trainer_completed_students_pct,
        'trainer_dropped_students_pct':
            trainer_dropped_students_pct,

        'trainer_active_students_deg':
            trainer_active_students_deg,
        'trainer_completed_students_deg':
            trainer_completed_students_deg,
        'trainer_dropped_students_deg':
            trainer_dropped_students_deg,

        'trainer_total_batches': trainer_total_batches,
        'trainer_ongoing_batches': trainer_ongoing_batches,
        'trainer_upcoming_batches': trainer_upcoming_batches,
        'trainer_completed_batches': trainer_completed_batches,
        'trainer_batch_summary': trainer_batch_summary,

        # Marketing

        'my_targets_total': my_targets_total,
        'my_targets_completed': my_targets_completed,
        'my_targets_active': my_targets_active,
        'my_targets_expired': my_targets_expired,
        'my_capture_target': my_capture_target,
        'my_captured_leads_count': my_captured_leads_count,

        # Marketing Lead - Team Targets

        'marketing_team_targets_total':
            marketing_team_targets_total,
        'marketing_team_targets_completed':
            marketing_team_targets_completed,
        'marketing_team_targets_active':
            marketing_team_targets_active,
        'marketing_team_targets_expired':
            marketing_team_targets_expired,
        'marketing_team_captured_leads_count':
            marketing_team_captured_leads_count,
    }

    return render(
        request,
        'staff/dashboard.html',
        context
    )
 
# ================================ MY PROFILE ================================

@login_required(login_url='staff_login')
def staff_profile(request, staff_id):
    """View and edit a staff member's own profile page"""

    staff = get_object_or_404(Staff, id=staff_id)

    # Handle Edit Profile form submission
    if request.method == 'POST':
        form = staffProfileForm(request.POST, request.FILES, instance=staff)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('staff_profile', staff_id=staff.id)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = staffProfileForm(instance=staff)

    # Attendance this month
    now = timezone.now()
    this_month_attendance = Attendance.objects.filter(
        staff=staff,
        date__year=now.year,
        date__month=now.month
    )
    days_present = this_month_attendance.filter(status__in=['Present', 'Late']).count()
    # Approximate working days in month (Mon-Fri)
    import calendar
    cal = calendar.monthcalendar(now.year, now.month)
    working_days = sum(1 for week in cal for day in week[0:5] if day != 0)

    # Leave balance (days not marked Absent/Present in month, rough calc)
    leave_days = this_month_attendance.filter(status='Leave').count()
    # Simple leave balance: assume 15 days annual / 12 months
    leave_balance = max(0, 15 - leave_days)

    # Tasks completed (converted leads as proxy)
    tasks_completed = Lead.objects.filter(staff=staff, status='converted').count()
    tasks_total = Lead.objects.filter(staff=staff).count()

    # Documents uploaded for this staff
    documents = StaffDocument.objects.filter(staff=staff)

    # ── RECENT ACTIVITY FEED ──────────────────────────────────────────
    from datetime import datetime as _dt
    activity_feed = []

    # 1) Check-ins: Attendance records where status is Present/Late and log_in exists
    checkins = Attendance.objects.filter(
        staff=staff,
        status__in=['Present', 'Late'],
        log_in__isnull=False
    ).order_by('-log_in')[:10]
    for att in checkins:
        activity_feed.append({
            'type': 'checkin',
            'icon': 'fa-right-to-bracket',
            'color': 'green',
            'title': 'Checked In' if att.status == 'Present' else 'Checked In (Late)',
            'detail': att.log_in.strftime('%d %b %Y, %I:%M %p'),
            'timestamp': att.log_in,
        })

    # 2) Document uploads: each StaffDocument with filename as designation
    for doc in documents.order_by('-uploaded_at')[:10]:
        raw_name = doc.document.name.split('/')[-1] if doc.document else 'Document'
        # Strip extension for label
        doc_label = raw_name.rsplit('.', 1)[0].replace('_', ' ').title()
        activity_feed.append({
            'type': 'document',
            'icon': 'fa-file-arrow-up',
            'color': 'blue',
            'title': f'Uploaded {doc_label}',
            'detail': doc.uploaded_at.strftime('%d %b %Y, %I:%M %p'),
            'timestamp': doc.uploaded_at,
        })

    # 3) Profile updates: staff updated_at (if different from created_at)
    if staff.updated_at and abs((staff.updated_at - staff.created_at).total_seconds()) > 60:
        activity_feed.append({
            'type': 'profile',
            'icon': 'fa-user-pen',
            'color': 'yellow',
            'title': 'Profile Updated',
            'detail': staff.updated_at.strftime('%d %b %Y, %I:%M %p'),
            'timestamp': staff.updated_at,
        })


    # Sort all by timestamp descending, keep latest 10
    activity_feed.sort(key=lambda x: x['timestamp'], reverse=True)
    activity_feed = activity_feed[:10]

    # Humanize timestamps
    _now = timezone.now()
    for item in activity_feed:
        diff = _now - item['timestamp']
        if diff.days == 0:
            item['when'] = 'Today'
        elif diff.days == 1:
            item['when'] = 'Yesterday'
        elif diff.days < 7:
            item['when'] = f"{diff.days} Days Ago"
        elif diff.days < 30:
            item['when'] = f"{diff.days // 7} Week{'s' if diff.days // 7 > 1 else ''} Ago"
        else:
            item['when'] = item['timestamp'].strftime('%d %b %Y')
    # ─────────────────────────────────────────────────────────────────
    context = {
        'staff': staff,
        'form': form,
        'days_present': days_present,
        'working_days': working_days,
        'leave_balance': leave_balance,
        'tasks_completed': tasks_completed,
        'tasks_total': tasks_total,
        'documents': documents,
        'activity_feed': activity_feed,
    }
    return render(request, 'staff/staff_profile.html', context)