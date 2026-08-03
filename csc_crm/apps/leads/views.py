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

def lead_capture_list(request):

    leads = LeadCapture.objects.all().order_by('-created_at')

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
    recent_leads = LeadCapture.objects.filter(enquiry_date=today).order_by('-created_at')[:10]

    # Get Status Counts
    status_counts = LeadCapture.objects.values('initial_status').annotate(count=Count('id'))

    form = LeadCaptureForm()

    # Context
    context = {
        'leads': leads,
        'form': form,
        'recent_leads': recent_leads,
        'status_counts': status_counts,
        'search_query': search_query,
        'page_title': 'New Lead Entry'
    }

    return render(request, 'leads/lead_list.html', context)

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
        qs = LeadCapture.objects.filter(phone_no=phone)

        if lead_id:
            qs = qs.exclude(id=lead_id)

        data['phone_exists'] = qs.exists()


    return JsonResponse(data)

# Get Lead in Leads and Their Information
def lead_capture_details(request, id):

    lead = get_object_or_404(LeadCapture, id=id)

    context = {
        'lead':lead
    }
    return render(request, 'leads/lead_details.html', context)


def lead_capture_download_pdf(request, id):
    lead = get_object_or_404(LeadCapture, id=id)

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
        lead.course_interested,
        lead.enquiry_date.strftime('%Y-%m-%d') if lead.enquiry_date else '',
        lead.next_followup_date.strftime('%Y-%m-%d') if lead.next_followup_date else '',
        lead.initial_status,
        lead.lead_source,
    ])

    return response


#Create Leads
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
            return redirect('leads:lead_capture_details', id=lead.id)
        else:
            print(form.errors) 
    else:
        form = LeadCaptureForm()

    today = timezone.localdate()

    recent_leads = LeadCapture.objects.filter(
        enquiry_date=today
    ).order_by('-created_at')[:10]

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
    }

    return render(request, 'leads/lead_list.html', context)

# Update leads
@require_http_methods(['GET','POST'])
def lead_capture_update(request, id):
    lead = get_object_or_404(LeadCapture, id=id)

    if request.method == 'POST':
        form = LeadCaptureForm(request.POST, instance=lead)

        if form.is_valid():
            updated_lead = form.save()

            messages.success(
                request,
                f'Lead {updated_lead.lead_name} updated successfully!'
            )

            return redirect('leads:lead_capture_details', id=updated_lead.id)

        else:
            print(form.errors)

    else:
        form = LeadCaptureForm(instance=lead)

    today = timezone.localdate()

    recent_leads = LeadCapture.objects.filter(
        enquiry_date=today
    ).order_by('-created_at')[:10]

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
    }

    return render(request, 'leads/lead_list.html', context)
# Deleting Lead
# @require_http_methods(['POST'])
# def lead_capture_delete(request, id):
#     lead = get_object_or_404(LeadCapture, id=id)
#     lead_name = lead.lead_name
#     lead.delete()
#     messages.success(request, f'Lead {lead.lead_name} Deleted Successfully!')
#     return redirect('lead_capture_list')

# PIPELINE VIEW
def lead_pipeline_view(request):

    leads = LeadCapture.objects.all().order_by('created_at')

    search_query = request.GET.get('search', '').strip()
    assigned_to = request.GET.get('assigned_to', '').strip()
    page_size = request.GET.get('page_size', '10').strip()

    allowed_sizes = ['10', '25', '50', '100']
    if page_size not in allowed_sizes:
        page_size = '10'

    if search_query:
       leads = leads.filter(
          Q(course_interested__icontains=search_query)
    )

    if assigned_to:
        leads = leads.filter(assigned_to__id=assigned_to)

    staffs = Staff.objects.filter(role__role_name__in=['BDE', 'Telecall', 'Sales Exec'], status='active')

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
    }

    return render(request, 'leads/pipeline_view.html', context)


# csv download
def export_leads_csv(request):

    leads = LeadCapture.objects.all().order_by('created_at')

    # Clean inputs
    search_query = request.GET.get('search', '').strip()
    assigned_to = request.GET.get('assigned_to', '').strip()
    status = request.GET.get('status', '').strip()

    # Apply filters safely
    if search_query and search_query.lower() != "none":
        leads = leads.filter(
            Q(email__icontains=search_query) |
            Q(phone_no__icontains=search_query) |
            Q(course_interested__icontains=search_query)
        )

    if assigned_to:  
        leads = leads.filter(assigned_to__id=assigned_to)

    if status:
        leads = leads.filter(initial_status=status)

    print("EXPORT COUNT:", leads.count())  # DEBUG

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
            lead.course_interested,
            lead.lead_source,
            lead.initial_status,
            lead.assigned_to if lead.assigned_to else 'Unassigned',
            lead.created_at.strftime('%Y-%m-%d')
        ])

    return response

# Lead Conversion 
def lead_conversion_report(request):
    total_leads = LeadCapture.objects.count()
    enrolled_leads = LeadCapture.objects.filter(initial_status='enrolled').count()
    lost_leads = LeadCapture.objects.filter(initial_status='lost').count()
    new_leads=LeadCapture.objects.filter(initial_status='new').count()
    demo_leads=LeadCapture.objects.filter(initial_status='demo_scheduled').count()
    contacted_leads=LeadCapture.objects.filter(initial_status='contacted').count()

    conversion_rate = (enrolled_leads / total_leads *100) if total_leads > 0 else 0

    # Source performance
    source_performance = []
    for source_value, source_label in LeadCapture.SOURCE_CHOICES:
        total = LeadCapture.objects.filter(lead_source=source_value).count()
        enrolled = LeadCapture.objects.filter(
            lead_source = source_value,
            initial_status = 'enrolled',
        ).count()
        
        rate = round(enrolled / total * 100) if total > 0 else 0
    
        source_performance.append({
        'source' : source_label,
        'total': total,
        'enrolled':enrolled,
        'rate':round(rate,1), 
        })

    context = {
        'total_leads':total_leads,
        'enrolled_leads':enrolled_leads,
        'lost_leads':lost_leads,
        'conversion_rate':conversion_rate,
        'new_leads':new_leads,
        'contacted_leads':contacted_leads,
        'demo_leads':demo_leads,
        'source_performance':source_performance,
    }

    return render(request, 'leads/conversion_report.html',context)


# ============================= FOLLOW UP =============================
def followup_shedule(request):
    today = timezone.localdate()
    followups = LeadCapture.objects.all()
    search_query = request.GET.get('search', '').strip()

    if search_query:
        followups = followups.filter(
            Q(lead_name__icontains=search_query) |
            Q(lead_id__icontains=search_query) |
            Q(course_interested__icontains=search_query) |
            Q(assigned_to__first_name__icontains=search_query) |
            Q(assigned_to__last_name__icontains=search_query) |
            Q(assigned_to__employee_id__icontains=search_query)
        )

    pending_followups = followups.filter( followup_completed=False ).exclude( initial_status__in=['enrolled', 'lost'])

    overdue = pending_followups.filter( next_followup_date__lt=today )

    today_followups = pending_followups.filter(next_followup_date=today )

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

    completed_today = completed_followups.filter( followup_completed_at__date=today ).count()

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

    }

    return render(
        request,
        'leads/followup_schedule.html',
        context
    )

def mark_followup_completed(request, id):

    if request.method == 'POST':

        lead = get_object_or_404( LeadCapture, id=id)

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

# Call-log View
def call_log_view(request):
    if request.method == 'POST':
        form = CallLogForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('leads:call_logs')  
    else:
        form = CallLogForm()

    logs = CallLog.objects.all().order_by('-created_at')

    return render(request, 'leads/call_logs.html', {
        'form': form,
        'logs': logs
    })

def delete_call_log(request, id):
    
    log = get_object_or_404(CallLog, id=id)
    log.delete()
    messages.success(request, f'Call-Log Deleted!')
    return redirect('leads:call_logs')

def call_history(request):
    outcome = request.GET.get("outcome")

    logs = CallLog.objects.all().order_by("-call_date", "-call_time")

    if outcome and outcome != "All":
        logs = logs.filter(call_outcome=outcome)

    return render(request, "leads/call_history.html", {
        "logs": logs,
        "selected": outcome or "All"
    })