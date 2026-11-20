from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Q, Count
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from datetime import timedelta
from django.contrib import messages
from .models import *
from .forms import *
import csv
from django.http import HttpResponse
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.core.exceptions import PermissionDenied
from .permissions import (
    leads_permission,
    has_permission,
    get_group,
    group_of_user,
    is_sales_exec,          # CHANGED
    PERMISSIONS,
    scope_leads,
    scope_calls,
    ensure_lead_access,
    ui_flags,
)


def _after_save_redirect(request, lead):
    """After create / update, open the lead details page."""
    return redirect('leads:lead_capture_details', id=lead.id)


@leads_permission('lead_view')
def lead_capture_list(request):

    # Sales Exec -> only their own leads (everyone else sees all)
    all_leads = scope_leads(request, LeadCapture.objects.all())

    leads = all_leads.order_by('-created_at')

    # Filter by status if provided
    status = request.GET.get('status')
    if status:
        leads = leads.filter(initial_status=status)

    # Search by Assigned Staff
    assigned_to = request.GET.get('assigned_to')
    if assigned_to:
        leads = leads.filter(assigned_to=assigned_to)

    # Filtered by Functionality
    search_query = request.GET.get('search')
    if search_query:
        leads = leads.filter(
            Q(lead_name__icontains=search_query)|
            Q(email__icontains = search_query)|
            Q(phone_no__icontains=search_query)
        )

    # Get recent Leads for Today
    today = timezone.localdate()
    recent_leads = all_leads.filter(enquiry_date=today).order_by('-created_at')[:5]

    # Get Status Counts
    status_counts = all_leads.values('initial_status').annotate(count=Count('id'))

    form = LeadCaptureForm()

    # Context
    context = {
        'leads': leads,
        'form': form,
        'recent_leads': recent_leads,
        'status_counts': status_counts,
        'search_query': search_query,
        'page_title': 'New Lead Entry',
        **ui_flags(request),
    }

    return render(request, 'leads/lead_list.html', context)

@leads_permission('lead_create', json=True)
def check_lead_exists(request):

    email = request.GET.get('email')
    phone = request.GET.get('phone')
    lead_id = request.GET.get('lead_id')

    data = {
        'email_exists': False,
        'phone_exists': False
    }

    if email:
        qs = LeadCapture.objects.filter(email=email)

        if lead_id:
            qs = qs.exclude(id=lead_id)

        data['email_exists'] = qs.exists()

    if phone:
        # Accept either the 10 digits typed in the form or a stored +91 number
        digits = ''.join(ch for ch in phone if ch.isdigit())[-10:]
        qs = LeadCapture.objects.filter(phone_no=f'{digits}')

        if lead_id:
            qs = qs.exclude(id=lead_id)

        data['phone_exists'] = qs.exists()


    return JsonResponse(data)

# Get Lead in Leads and Their Information
@leads_permission('lead_view')
def lead_capture_details(request, id):

    lead = get_object_or_404(LeadCapture, id=id)
    ensure_lead_access(request, lead)

    context = {
        'lead':lead,
        **ui_flags(request),
    }
    return render(request, 'leads/lead_details.html', context)

@leads_permission('lead_view')
def lead_capture_download_pdf(request, id):
    lead = get_object_or_404(LeadCapture, id=id)
    ensure_lead_access(request, lead)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="lead_{lead.lead_id}.csv"'

    writer = csv.writer(response)

    writer.writerow([
        'Lead ID', 'Name', 'Phone Number', 'Email Address',
        'Course Interested', 'Enquiry Date', 'Next Follow-Up',
        'Lead Status', 'Lead Source'
    ])

    writer.writerow([
        lead.lead_id,
        lead.lead_name,
        lead.phone_no,
        lead.email,
        lead.course_interested.course_name if lead.course_interested else '',
        lead.enquiry_date.strftime('%Y-%m-%d') if lead.enquiry_date else '',
        lead.next_followup_date.strftime('%Y-%m-%d') if lead.next_followup_date else '',
        lead.initial_status,
        lead.lead_source,
    ])

    return response


#Create Leads
@leads_permission('lead_create')
@require_http_methods(["GET", "POST"])
def lead_capture_create(request):
    if request.method == 'POST':
        form = LeadCaptureForm(request.POST)
        if form.is_valid():
            lead = form.save(commit=False)
            lead_count = LeadCapture.objects.count()+1
            lead.lead_id = f'LID-{lead_count:04d}'
            lead.save()
            messages.success(request, f'Lead {lead.lead_name} created successfully!')
            return _after_save_redirect(request, lead)
        else:
            print(form.errors) 
    else:
        form = LeadCaptureForm()

    today = timezone.localdate()

    recent_leads = LeadCapture.objects.filter(
        enquiry_date=today
    ).order_by('-created_at')[:5]

    status_counts = LeadCapture.objects.values(
        'initial_status'
    ).annotate(count=Count('id'))

    leads = LeadCapture.objects.all().order_by('-created_at')

    context = {
        'form': form,
        'page_title':'New Lead Entry',
        'leads': leads,
        'recent_leads': recent_leads,
        'status_counts': status_counts,
        **ui_flags(request),
    }

    return render(request, 'leads/lead_list.html', context)

# Update leads
@leads_permission('lead_edit')
@require_http_methods(['GET','POST'])
def lead_capture_update(request, id):
    lead = get_object_or_404(LeadCapture, id=id)
    ensure_lead_access(request, lead)

    if request.method == 'POST':
        form = LeadCaptureForm(request.POST, instance=lead)

        if form.is_valid():
            updated_lead = form.save()

            messages.success(
                request,
                f'Lead {updated_lead.lead_name} updated successfully!'
            )

            return _after_save_redirect(request, updated_lead)

        else:
            print(form.errors)

    else:
        form = LeadCaptureForm(instance=lead)

    today = timezone.localdate()

    recent_leads = LeadCapture.objects.filter(
        enquiry_date=today
    ).order_by('-created_at')[:5]

    status_counts = LeadCapture.objects.values(
        'initial_status'
    ).annotate(count=Count('id'))

    leads = LeadCapture.objects.all().order_by('-created_at')

    context = {
        'form': form,
        'lead': lead,
        'leads': leads,
        'page_title': f'Edit Lead - {lead.lead_name}',
        'recent_leads': recent_leads,
        'status_counts': status_counts,
        **ui_flags(request),
    }

    return render(request, 'leads/lead_list.html', context)



# PIPELINE VIEW
@leads_permission('lead_view')
def lead_pipeline_view(request):

    # Sales Exec -> only their own leads
    leads = scope_leads(request, LeadCapture.objects.all()).order_by('created_at')

    search_query = request.GET.get('search', '').strip()
    assigned_to = request.GET.get('assigned_to', '').strip()
    page_size = request.GET.get('page_size', '10').strip()

    allowed_sizes = ['10', '25', '50', '100']
    if page_size not in allowed_sizes:
        page_size = '10'

    if search_query:
       leads = leads.filter(
          Q(course_interested__course_name__icontains=search_query)
    )

    if assigned_to:
        leads = leads.filter(assigned_to__id=assigned_to)

    staffs = Staff.objects.filter(role__role_name__in=['BDE', 'Telecall', 'Sales Exec lead'], status='active')

    no_results = False
    if (search_query or assigned_to) and leads.count() == 0:
        no_results = True

    leads_by_status = {}

    for value, label in LeadCapture.STATUS_CHOICES:
        leads_by_status[label] = leads.filter(initial_status=value)

    total_leads = leads.count()

    funnel_data = []
    status_counts = []

    for value, label in LeadCapture.STATUS_CHOICES:
        count = leads.filter(initial_status=value).count()
        percentage = round((count / total_leads * 100), 1) if total_leads else 0

        funnel_data.append({
            'status': label,
            'count': count,
            'percentage': percentage
        })

        status_counts.append({
            'status': label,
            'count': count,
        })

    # Pagination
    paginator = Paginator(leads, int(page_size))
    page_number = request.GET.get('page')
    leads = paginator.get_page(page_number)

    context = {
        'leads_by_status': leads_by_status,
        'funnel_data': funnel_data,
        'status_counts': status_counts,
        'total_leads': total_leads,
        'search_query': search_query,
        'assigned_to': assigned_to,
        'staffs': staffs,
        'leads': leads,
        'no_results': no_results,
        'page_size': page_size,
        **ui_flags(request),
    }

    return render(request, 'leads/pipeline_view.html', context)

# csv download
@leads_permission('lead_view')
def export_leads_csv(request):

    # Sales Exec -> only their own leads
    leads = scope_leads(request, LeadCapture.objects.all()).order_by('created_at')

    # Clean inputs
    search_query = request.GET.get('search', '').strip()
    assigned_to = request.GET.get('assigned_to', '').strip()
    status = request.GET.get('status', '').strip()

    # Apply filters safely
    if search_query and search_query.lower() != "none":
        leads = leads.filter(
            Q(email__icontains=search_query) |
            Q(phone_no__icontains=search_query) |
            Q(course_interested__course_name__icontains=search_query)
        )

    if assigned_to:
        leads = leads.filter(assigned_to__id=assigned_to)

    if status:
        leads = leads.filter(initial_status=status)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="leads.csv"'

    writer = csv.writer(response)

    writer.writerow([
        'Lead ID','Name','Email','Phone','Course',
        'Source','Status','Assigned To','Date'
    ])

    for lead in leads:
        writer.writerow([
            lead.lead_id,
            lead.lead_name,
            lead.email,
            lead.phone_no,
            lead.course_interested.course_name if lead.course_interested else '',
            lead.lead_source,
            lead.initial_status,
            lead.assigned_to if lead.assigned_to else 'Unassigned',
            lead.created_at.strftime('%Y-%m-%d')
        ])

    return response

# ---- Conversion report date range (drives the date dropdown) ----
def _month_start(d, offset=0):
    """First day of the month `offset` months from d's month."""
    import datetime as _dt
    idx = d.year * 12 + (d.month - 1) + offset
    return _dt.date(idx // 12, idx % 12 + 1, 1)


def _month_end(d, offset=0):
    import calendar
    import datetime as _dt
    first = _month_start(d, offset)
    return _dt.date(first.year, first.month, calendar.monthrange(first.year, first.month)[1])


CONVERSION_RANGE_LABELS = {
    'this_month': 'This Month',
    'last_month': 'Last Month',
    'last_3_months': 'Last 3 Months',
    'last_6_months': 'Last 6 Months',
    'this_year': 'This Year',
    'all_time': 'All Time',
}


def _conversion_report_range(request):
    """
    Work out (start_date, end_date, range_key, label) from ?range= or ?start=&end=.
    Falls back to the current month, which is what the dropdown shows by default.
    start/end are None for 'All Time'.
    """
    import datetime as _dt
    today = timezone.localdate()

    def fmt(d):
        return d.strftime('%d %b %Y')

    key = request.GET.get('range', '').strip()
    if key in CONVERSION_RANGE_LABELS:
        if key == 'this_month':
            start, end = _month_start(today), _month_end(today)
        elif key == 'last_month':
            start, end = _month_start(today, -1), _month_end(today, -1)
        elif key == 'last_3_months':
            start, end = _month_start(today, -2), _month_end(today)
        elif key == 'last_6_months':
            start, end = _month_start(today, -5), _month_end(today)
        elif key == 'this_year':
            start, end = _dt.date(today.year, 1, 1), _dt.date(today.year, 12, 31)
        else:  # all_time
            return None, None, key, CONVERSION_RANGE_LABELS[key]
        return start, end, key, CONVERSION_RANGE_LABELS[key]

    start_raw = request.GET.get('start', '').strip()
    end_raw = request.GET.get('end', '').strip()
    if start_raw and end_raw:
        try:
            start = _dt.date.fromisoformat(start_raw)
            end = _dt.date.fromisoformat(end_raw)
            if start > end:
                start, end = end, start
            return start, end, '', f'{fmt(start)} \u2013 {fmt(end)}'
        except ValueError:
            pass  # bad dates -> fall through to the default

    start, end = _month_start(today), _month_end(today)
    return start, end, 'this_month', f'{fmt(start)} \u2013 {fmt(end)}'


# Lead Conversion 
@leads_permission('lead_view')
def lead_conversion_report(request):

    # Sales Exec -> own assigned leads only
    leads_qs = scope_leads(request, LeadCapture.objects.all())

    # Date range from the dropdown (?range=... or ?start=...&end=...)
    range_start, range_end, range_key, range_label = _conversion_report_range(request)
    if range_start and range_end:
        import datetime as _dt
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(_dt.datetime.combine(range_start, _dt.time.min), tz)
        end_dt = timezone.make_aware(
            _dt.datetime.combine(range_end + _dt.timedelta(days=1), _dt.time.min), tz
        )
        leads_qs = leads_qs.filter(created_at__gte=start_dt, created_at__lt=end_dt)

    total_leads = leads_qs.count()
    enrolled_leads = leads_qs.filter(initial_status='enrolled').count()
    lost_leads = leads_qs.filter(initial_status='lost').count()
    new_leads = leads_qs.filter(initial_status='new').count()
    demo_leads = leads_qs.filter(initial_status='demo_scheduled').count()
    contacted_leads = leads_qs.filter(initial_status='contacted').count()

    conversion_rate = (enrolled_leads / total_leads * 100) if total_leads > 0 else 0

    # Source performance
    source_performance = []
    for source_value, source_label in LeadCapture.SOURCE_CHOICES:
        total = leads_qs.filter(lead_source=source_value).count()
        enrolled = leads_qs.filter(
            lead_source=source_value,
            initial_status='enrolled',
        ).count()

        rate = round(enrolled / total * 100) if total > 0 else 0

        source_performance.append({
            'source': source_label,
            'total': total,
            'enrolled': enrolled,
            'rate': round(rate, 1),
        })

    context = {
        'total_leads': total_leads,
        'enrolled_leads': enrolled_leads,
        'lost_leads': lost_leads,
        'conversion_rate': conversion_rate,
        'new_leads': new_leads,
        'contacted_leads': contacted_leads,
        'demo_leads': demo_leads,
        'source_performance': source_performance,
        'range_label': range_label,
        'range_key': range_key,
        'range_start': range_start.isoformat() if range_start else '',
        'range_end': range_end.isoformat() if range_end else '',
    }

    return render(request, 'leads/conversion_report.html', context)

# ============================= FOLLOW UP =============================
@leads_permission('lead_view')
def followup_shedule(request):
    today = timezone.localdate()

    # Sales Exec -> own assigned leads only
    followups = scope_leads(request, LeadCapture.objects.all())

    search_query = request.GET.get('search', '').strip()

    if search_query:
        followups = followups.filter(
            Q(lead_name__icontains=search_query) |
            Q(lead_id__icontains=search_query) |
            Q(course_interested__course_name__icontains=search_query) |
            Q(assigned_to__first_name__icontains=search_query) |
            Q(assigned_to__last_name__icontains=search_query) |
            Q(assigned_to__employee_id__icontains=search_query)
        )

    pending_followups = followups.filter(followup_completed=False).exclude(initial_status__in=['enrolled', 'lost'])

    overdue = pending_followups.filter(next_followup_date__lt=today)

    today_followups = pending_followups.filter(next_followup_date=today)

    # Current week end (Sunday)
    days_left = 6 - today.weekday()
    week_end = today + timedelta(days=days_left)

    # This Week
    week_followups = pending_followups.filter(
        next_followup_date__gt=today,
        next_followup_date__lte=week_end
    )

    # Upcoming
    upcoming_followups = pending_followups.filter(
        next_followup_date__gt=today
    )

    completed_followups = followups.filter(
        followup_completed=True
    )

    # Summary Cards

    due_today = today_followups.count()

    overdue_count = overdue.count()

    this_week = week_followups.count()

    completed_today = completed_followups.filter(followup_completed_at__date=today).count()

    current_filter = request.GET.get('filter', 'all')

    if current_filter == 'overdue':
        displayed_followups = overdue

    elif current_filter == 'today':
        displayed_followups = today_followups

    elif current_filter == 'week':
        displayed_followups = week_followups

    elif current_filter == 'upcoming':
        displayed_followups = upcoming_followups

    elif current_filter == 'completed':
        displayed_followups = completed_followups

    else:
        displayed_followups = followups

    # Pagination

    paginator = Paginator(displayed_followups.order_by('-created_at'), 15)

    page_number = request.GET.get('page', 1)

    page_obj = paginator.get_page(page_number)

    context = {

        'followups': page_obj,
        'page_obj': page_obj,
        'paginator': paginator,
        'overdue': overdue,
        'today_followups': today_followups,
        'week_followups': week_followups,
        'upcoming_followups': upcoming_followups,
        'completed_followups': completed_followups,

        'due_today': due_today,
        'overdue_count': overdue_count,
        'this_week': this_week,
        'completed_today': completed_today,

        'search_query': search_query,
        'current_filter': current_filter,

        'today': today,

        **ui_flags(request),

    }

    return render(
        request,
        'leads/followup_schedule.html',
        context
    )

@leads_permission('followup')
def mark_followup_completed(request, id):

    if request.method == 'POST':

        lead = get_object_or_404( LeadCapture, id=id)
        ensure_lead_access(request, lead)

        lead.followup_completed = True
        lead.followup_completed_at = timezone.now()

        lead.save(
            update_fields=[
                'followup_completed',
                'followup_completed_at',
                'updated_at'
            ]
        )

        messages.success(request,f'Follow-up for {lead.lead_name} marked as completed.' )

    return redirect('leads:followup_shedule')

# Search Leads by Name (for Call-Log "Contact Name" autocomplete)
@leads_permission('call_write', json=True)
def search_lead_by_name(request):

    query = request.GET.get('q', '').strip()

    results = []

    if query:
        leads = scope_leads(request, LeadCapture.objects.all()).filter(
            lead_name__icontains=query
        ).order_by('lead_name')[:10]

        results = [
            {
                'id': lead.id,
                'lead_name': lead.lead_name,
                'phone_no': lead.phone_no,
                'course_interested': lead.course_interested.course_name if lead.course_interested else '',
            }
            for lead in leads
        ]

    return JsonResponse({'leads': results})

# Call-log View
@leads_permission('call_view')
def call_log_view(request):

    # the leads this user may log calls for (Sales Exec -> own leads only)    # CHANGED
    my_leads = scope_leads(request, LeadCapture.objects.all())                 # CHANGED

    if request.method == 'POST':

        # viewing is allowed for HR, saving a call is not
        if not has_permission(request, 'call_write'):
            messages.error(request, 'You do not have permission to add call logs.')
            return redirect('leads:call_logs')

        form = CallLogForm(request.POST)
        form.fields['lead'].queryset = my_leads                                # CHANGED

        if form.is_valid():
            log = form.save(commit=False)                                      # CHANGED

            # Sales Exec: the call must be linked to one of their own leads   # CHANGED
            if is_sales_exec(request) and not (                                # CHANGED
                log.lead_id and my_leads.filter(id=log.lead_id).exists()       # CHANGED
            ):                                                                 # CHANGED
                messages.error(                                                # CHANGED
                    request,                                                   # CHANGED
                    'Select one of your own leads for this call.'              # CHANGED
                )                                                              # CHANGED
            else:                                                              # CHANGED
                log.save()                                                     # CHANGED
                messages.success(request, 'Call saved!')
                # After "Save Call" go straight to the contact's call-log page
                return redirect('leads:contact_calls', log_id=log.id)
        else:
            messages.error(request, 'Please correct the errors in the call form.')
    else:
        form = CallLogForm()
        form.fields['lead'].queryset = my_leads                                # CHANGED

    logs = scope_calls(request, CallLog.objects.all()).order_by('-created_at')

    return render(request, 'leads/call_logs.html', {
        'form': form,
        'logs': logs,
        **ui_flags(request),
    })


# Contact details + mobile-style call log for one contact
@leads_permission('call_view')
def contact_calls(request, log_id):
    log = get_object_or_404(CallLog, id=log_id)

    lead = log.lead
    if lead is None and log.lead_name:
        matches = list(LeadCapture.objects.filter(lead_name__iexact=log.lead_name.strip())[:2])
        if len(matches) == 1:
            lead = matches[0]

    # Sales Exec -> only the calls of their own leads
    ensure_lead_access(request, lead)

    if lead:
        calls = CallLog.objects.filter(Q(lead=lead) | Q(lead__isnull=True, lead_name__iexact=lead.lead_name))
        contact_name = lead.lead_name
    else:
        calls = CallLog.objects.filter(lead__isnull=True, lead_name__iexact=(log.lead_name or '').strip())
        contact_name = log.lead_name or 'Unknown'

    calls = calls.order_by('-call_date', '-call_time', '-created_at')
    call_list = list(calls)

    total = len(call_list)
    connected = sum(1 for c in call_list if c.is_connected)
    talk_seconds = sum(c.total_seconds for c in call_list if c.is_connected)
    t_min, t_sec = divmod(talk_seconds, 60)
    t_hr, t_min = divmod(t_min, 60)
    talk_time = f'{t_hr} hr {t_min} min' if t_hr else (f'{t_min} min {t_sec} s' if t_min else f'{t_sec} sec')

    return render(request, 'leads/contact_calls.html', {
        'lead': lead,
        'contact_name': contact_name,
        'latest_log': call_list[0] if call_list else log,
        'calls': call_list,
        'total_calls': total,
        'connected_calls': connected,
        'not_connected_calls': total - connected,
        'talk_time': talk_time,
        **ui_flags(request),
    })

@leads_permission('call_write')
def delete_call_log(request, id):

    # Sales Exec can delete only the calls of their own leads                  # CHANGED
    log = get_object_or_404(scope_calls(request, CallLog.objects.all()), id=id)  # CHANGED
    log.delete()
    messages.success(request, f'Call-Log Deleted!')
    return redirect('leads:call_logs')

@leads_permission('call_view')
def call_history(request):
    outcome = request.GET.get("outcome")

    logs = scope_calls(request, CallLog.objects.all()).order_by("-call_date", "-call_time")

    if outcome and outcome != "All":
        logs = logs.filter(call_outcome=outcome)

    return render(request, "leads/call_history.html", {
        "logs": logs,
        "selected": outcome or "All",
        **ui_flags(request),
    })

# ============================= LEAD CAPTURE TARGET (MARKETING) =============================

def is_target_assigner(user):
    """
    Admin / Manager / Marketing Lead can assign targets
    (Django superuser is always allowed).
    """
    return group_of_user(user) in PERMISSIONS['target_manage']


# ==========================================================
# PERMISSION HELPER
# ADMIN / MANAGER -> ANY TARGET
# MARKETING LEAD  -> ONLY TARGETS ASSIGNED BY THEM
# EVERYONE ELSE   -> NONE
# ==========================================================

def can_manage_target(request, target):

    group = get_group(request)

    if group == 'admin':
        return True

    if group == 'marketing_lead':
        staff = getattr(request.user, 'staff_profile', None)
        return bool(staff and target.assigned_by_id == staff.id)

    return False


@leads_permission('target_page')
def lead_capture_target(request):

    # ==========================================================
    # CURRENT STAFF
    # ==========================================================

    staff = getattr(request.user, 'staff_profile', None)

    if not staff:
        messages.error(
            request,
            'Staff profile not found.'
        )
        return redirect('home')

    current_role = (
        staff.role.role_name.strip()
        if staff.role
        else ''
    )

    group = get_group(request)

    # ==========================================================
    # ROLE FLAGS
    # ==========================================================

    is_admin = (
        request.user.is_superuser
        or current_role == 'Admin'
    )

    is_manager = (
        current_role == 'Manager'
    )

    is_hr = (
        group == 'hr'
    )

    is_marketing_lead = (
        group == 'marketing_lead'
    )

    is_marketing_member = (
        group == 'marketing_emp'
    )

    # ==========================================================
    # ASSIGN PERMISSION (Admin / Manager / Marketing Lead)
    # ==========================================================

    can_assign = group in PERMISSIONS['target_manage']

    # ==========================================================
    # MARKETING MEMBERS DON'T MANAGE THE LIST
    # ==========================================================

    if is_marketing_member:
        return redirect('leads:my_lead_capture_target')

    # ==========================================================
    # TARGET VISIBILITY
    # ==========================================================

    if group in ('admin', 'hr'):

        # Admin / Manager / HR (HR is view only)
        # Can see every target except their own

        targets = LeadCaptureTarget.objects.select_related(
            'assigned_to',
            'assigned_to__role',
            'assigned_to__department',
            'assigned_by',
            'assigned_by__role',
            'assigned_by__department',
            'assigned_by__user',
        ).exclude(
            assigned_to=staff
        )

    else:

        # Marketing Lead
        # Can see Marketing Lead + Marketing Member targets
        # except their own

        targets = LeadCaptureTarget.objects.select_related(
            'assigned_to',
            'assigned_to__role',
            'assigned_to__department',
            'assigned_by',
            'assigned_by__role',
            'assigned_by__department',
            'assigned_by__user',
        ).filter(
            assigned_to__role__role_name__in=[
                'Marketing Lead',
                'Marketing Member',
                'Digital Marketing',
                'Content Creator',
            ]
        ).exclude(
            assigned_to=staff
        )

    # ==========================================================
    # CONVERT QUERYSET TO LIST
    # ==========================================================

    targets = list(targets)

    # ==========================================================
    # EDIT / DELETE PERMISSION
    # ADMIN / MANAGER -> ANY TARGET
    # MARKETING LEAD  -> ONLY TARGETS ASSIGNED BY THEM
    # HR              -> VIEW ONLY
    # COMPLETED TARGET -> BOTH BUTTONS DISABLED
    # ==========================================================

    for target in targets:

        can_manage = can_manage_target(request, target)

        target.can_edit = can_manage and not target.is_completed
        target.can_delete = can_manage and not target.is_completed

    # ==========================================================
    # STATUS COUNTS
    # ==========================================================

    active_count = sum(
        1
        for target in targets
        if target.status == 'active'
    )

    completed_count = sum(
        1
        for target in targets
        if target.status == 'completed'
    )

    expired_count = sum(
        1
        for target in targets
        if target.status == 'expired'
    )

    total_count = len(targets)

    # ==========================================================
    # FORMS
    # ==========================================================

    form = LeadCaptureTargetForm(
        user=request.user
    )

    edit_form = LeadCaptureTargetUpdateForm()

    # ==========================================================
    # CONTEXT
    # ==========================================================

    context = {
        'targets': targets,

        'form': form,
        'edit_form': edit_form,

        'can_assign': can_assign,

        'is_admin': is_admin,
        'is_manager': is_manager,
        'is_hr': is_hr,
        'is_marketing_lead': is_marketing_lead,
        'is_marketing_member': is_marketing_member,

        'active_count': active_count,
        'completed_count': completed_count,
        'expired_count': expired_count,
        'total_count': total_count,

        'page_title': 'Lead Capture Target',
    }

    return render(
        request,
        'leads/target_assign_list.html',
        context
    )


# ==========================================================
# ASSIGN TARGET
# ADMIN + MANAGER + MARKETING LEAD ONLY
# ==========================================================

@leads_permission('target_manage')
@require_http_methods(['GET', 'POST'])
def lead_capture_target_assign(request):

    if request.method == 'POST':

        form = LeadCaptureTargetForm(
            request.POST,
            user=request.user
        )

        if form.is_valid():

            target = form.save(commit=False)

            # Get logged-in user's Staff record
            staff = getattr(
                request.user,
                'staff_profile',
                None
            )

            if not staff:
                messages.error(
                    request,
                    'Staff profile not found for the logged-in user.'
                )
                return redirect(
                    'leads:lead_capture_target'
                )

            # ==========================================
            # WHO ASSIGNED THE TARGET
            # ==========================================

            target.assigned_by = staff

            # ==========================================
            # TARGET START DATE
            # ==========================================

            target.start_date = timezone.localdate()

            # ==========================================
            # INITIAL PROGRESS
            # ==========================================

            target.achieved_count = 0
            target.is_completed = False
            target.completed_at = None

            target.save()

            messages.success(
                request,
                f'Lead target successfully assigned to '
                f'{target.assigned_to.full_name()}.'
            )

            return redirect(
                'leads:lead_capture_target'
            )

    else:

        form = LeadCaptureTargetForm(
            user=request.user
        )

    return render(
        request,
        'leads/lead_capture_target.html',
        {
            'form': form,
        }
    )


# ==========================================================
# UPDATE TARGET
# ADMIN / MANAGER: ANY TARGET | MARKETING LEAD: ONLY TARGETS ASSIGNED BY THEM
# ==========================================================

@leads_permission('target_manage')
@require_http_methods(['POST'])
def lead_capture_target_update(request, pk):

    target = get_object_or_404(
        LeadCaptureTarget,
        pk=pk
    )

    # ==========================================
    # PERMISSION CHECK
    # ==========================================

    if not can_manage_target(request, target):
        raise PermissionDenied

    # ==========================================
    # UPDATE FORM
    # ==========================================

    form = LeadCaptureTargetUpdateForm(
        request.POST,
        instance=target
    )

    if form.is_valid():

        form.save()

        messages.success(
            request,
            f'Target for '
            f'{target.assigned_to.full_name()} '
            f'updated successfully!'
        )

    else:

        for field, errors in form.errors.items():

            for error in errors:

                messages.error(
                    request,
                    f'{field}: {error}'
                )

    return redirect(
        'leads:lead_capture_target'
    )


# ==========================================================
# DELETE TARGET
# ADMIN / MANAGER: ANY TARGET | MARKETING LEAD: ONLY TARGETS ASSIGNED BY THEM
# ==========================================================

@leads_permission('target_manage')
@require_http_methods(['POST'])
def lead_capture_target_delete(request, pk):

    target = get_object_or_404(
        LeadCaptureTarget,
        pk=pk
    )

    # ==========================================
    # PERMISSION CHECK
    # ==========================================

    if not can_manage_target(request, target):
        raise PermissionDenied

    # ==========================================
    # DELETE TARGET
    # ==========================================

    staff_name = target.assigned_to.full_name()

    target.delete()

    messages.success(
        request,
        f'Lead capture target for '
        f'{staff_name} deleted.'
    )

    return redirect(
        'leads:lead_capture_target'
    )


# ==========================================================
# UPDATE PROGRESS (SELF REPORT)
# MARKETING LEAD / MARKETING EMP -> ONLY THEIR OWN TARGET
# ==========================================================

@leads_permission('target_progress')
@require_http_methods(['POST'])
def lead_capture_target_progress(request, pk):
    """Team member self-reports how many leads they captured against
    their own target — they never touch the Lead Management page."""

    staff = getattr(request.user, 'staff_profile', None)
    if staff is None:
        messages.error(request, 'No staff profile found.')
        return redirect('leads:my_lead_capture_target')

    target = get_object_or_404(LeadCaptureTarget, pk=pk)

    # Only the person the target belongs to can update it
    if target.assigned_to_id != staff.id:
        raise PermissionDenied

    if target.is_completed:
        messages.error(request, 'This target is already completed.')
        return redirect('leads:my_lead_capture_target')

    if target.is_expired:
        messages.error(request, 'This target has expired and can no longer be updated.')
        return redirect('leads:my_lead_capture_target')

    form = LeadCaptureTargetProgressForm(request.POST)

    if form.is_valid():
        count = form.cleaned_data['captured_count']
        remaining = target.target_count - target.achieved_count

        if count > remaining:
            messages.error(
                request,
                f'Only {remaining} lead(s) remaining on this target — enter {remaining} or fewer.'
            )
        else:
            target.achieved_count += count
            if target.achieved_count >= target.target_count:
                target.is_completed = True
                target.completed_at = timezone.now()
            target.save(update_fields=['achieved_count', 'is_completed', 'completed_at', 'updated_at'])
            messages.success(request, f'Progress updated — {count} lead(s) added.')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                messages.error(request, f'{field}: {error}')

    return redirect('leads:my_lead_capture_target')


# ============================= MY LEAD CAPTURE TARGET (SELF VIEW) =============================
@leads_permission('target_progress')
def my_lead_capture_target(request):
    """
    Marketing member's own Lead Capture Target page.
    Shows only their own target(s) + self-report progress.
    """

    staff = getattr(request.user, 'staff_profile', None)

    if not staff:
        messages.error(request, 'Staff profile not found.')
        return redirect('home')

    targets = LeadCaptureTarget.objects.select_related(
        'assigned_to',
        'assigned_to__role',
        'assigned_by',
        'assigned_by__role',
    ).filter(
        assigned_to=staff
    ).order_by('-start_date')

    for target in targets:
        target.can_update_progress = (target.status == 'active')

    active_count = sum(1 for t in targets if t.status == 'active')
    completed_count = sum(1 for t in targets if t.status == 'completed')
    expired_count = sum(1 for t in targets if t.status == 'expired')
    total_count = len(targets)

    progress_form = LeadCaptureTargetProgressForm()

    context = {
        'targets': targets,
        'progress_form': progress_form,
        'active_count': active_count,
        'completed_count': completed_count,
        'expired_count': expired_count,
        'total_count': total_count,
        'page_title': 'My Lead Capture Target',
    }

    return render(request, 'leads/my_target.html', context)