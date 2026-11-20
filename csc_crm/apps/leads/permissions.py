"""
Leads module - role based access in one place.

Edit ROLE_GROUPS to map a role name to a group, and PERMISSIONS to decide
which groups may do what. Role names are compared lower-case, so
"Sales Exec Lead" and "Sales Exec lead" are the same role.

Groups:
    admin           Admin, Manager (and Django superuser)
    hr              HR                 -> view only
    sales_lead      Sales Lead         -> full leads access, no target page
    sales_exec      Sales Exec         -> own leads: view, follow-up, call logs
                                          (no lead create / edit / delete)
    marketing_lead  Marketing Lead     -> Lead Capture Target page
    marketing_emp   Marketing members  -> update progress of own target
"""
from functools import wraps

from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from django.shortcuts import redirect


def _norm(name):
    return ' '.join((name or '').lower().split())


# role name (lower-case) -> group
ROLE_GROUPS = {
    'admin': 'admin',
    'manager': 'admin',

    'hr': 'hr',

    'sales exec lead': 'sales_lead',
    'sales lead': 'sales_lead',

    'sales exec': 'sales_exec',
    'sales executive': 'sales_exec',
    'bde': 'sales_exec',
    'telecall': 'sales_exec',
    'telecaller': 'sales_exec',
    'telecalling': 'sales_exec',

    'marketing lead': 'marketing_lead',

    'marketing member': 'marketing_emp',
    'digital marketing': 'marketing_emp',
    'content creator': 'marketing_emp',
}


# action -> groups that are allowed
PERMISSIONS = {
    # ---- leads ----
    'lead_view':   {'admin', 'hr', 'sales_lead', 'sales_exec'},
    'lead_create': {'admin', 'sales_lead'},
    'lead_edit':   {'admin', 'sales_lead'},
    'lead_delete': {'admin', 'sales_lead'},

    # ---- follow-ups and call logs ----
    # sales_exec can change these, but only for their own leads
    # (the views scope the data, see scope_leads / scope_calls)
    'followup':    {'admin', 'sales_lead', 'sales_exec'},
    'call_view':   {'admin', 'hr', 'sales_lead', 'sales_exec'},
    'call_write':  {'admin', 'sales_lead', 'sales_exec'},

    # ---- lead capture target (marketing) ----
    'target_page':     {'admin', 'hr', 'marketing_lead', 'marketing_emp'},
    'target_manage':   {'admin', 'marketing_lead'},
    'target_progress': {'marketing_lead', 'marketing_emp'},
}


def group_of_user(user):
    if not user.is_authenticated:
        return None

    if user.is_superuser:
        return 'admin'

    staff = getattr(user, 'staff_profile', None)
    role = staff.role.role_name if staff and staff.role else None

    return ROLE_GROUPS.get(_norm(role))


def get_group(request):
    return group_of_user(request.user)


def has_permission(request, action):
    return get_group(request) in PERMISSIONS[action]


def is_sales_exec(request):
    return get_group(request) == 'sales_exec'


def _my_staff(request):
    return getattr(request.user, 'staff_profile', None)


# ---------------------------------------------------------------
# decorator: put it on the outside of every leads view
#   @leads_permission('lead_view')
#   @leads_permission('call_write', json=True)   (JSON endpoints)
# ---------------------------------------------------------------
def leads_permission(action, json=False):
    allowed = PERMISSIONS[action]

    def decorator(view):
        @wraps(view)
        def wrapper(request, *args, **kwargs):

            if not request.user.is_authenticated:
                if json:
                    return JsonResponse({'error': 'Login required'}, status=401)
                return redirect('staff_login')

            if get_group(request) not in allowed:
                if json:
                    return JsonResponse({'error': 'Permission denied'}, status=403)

                messages.error(request, "You do not have permission to access this page.")
                return redirect('staff_dashboard')

            return view(request, *args, **kwargs)

        return wrapper

    return decorator


# ---------------------------------------------------------------
# data scope: Sales Exec sees only the leads assigned to them
# ---------------------------------------------------------------
def scope_leads(request, queryset):
    if is_sales_exec(request):
        staff = _my_staff(request)
        return queryset.filter(assigned_to=staff) if staff else queryset.none()
    return queryset


def scope_calls(request, queryset):
    """Call logs of the leads assigned to the Sales Exec."""
    if is_sales_exec(request):
        staff = _my_staff(request)
        return queryset.filter(lead__assigned_to=staff) if staff else queryset.none()
    return queryset


def ensure_lead_access(request, lead):
    """403 when a Sales Exec opens a lead that is not assigned to them."""
    if is_sales_exec(request):
        staff = _my_staff(request)
        if lead is None or not staff or lead.assigned_to_id != staff.id:
            raise PermissionDenied


# ---------------------------------------------------------------
# flags for templates (hide buttons the role cannot use)
# ---------------------------------------------------------------
def ui_flags(request):
    group = get_group(request)

    return {
        'can_create_lead': group in PERMISSIONS['lead_create'],
        'can_edit_lead': group in PERMISSIONS['lead_edit'],
        'can_delete_lead': group in PERMISSIONS['lead_delete'],
        'can_manage_followup': group in PERMISSIONS['followup'],
        'can_log_call': group in PERMISSIONS['call_write'],
    }