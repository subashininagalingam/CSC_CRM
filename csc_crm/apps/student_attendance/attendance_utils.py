from django.db.models import Q, Count, Max
from .models import Attendance, Batch
from csc_crm.apps.admissions.models import Enrollment


#=========================== STATUS COLOR MAP (SHARED ACROSS PDF/EXCEL) ==============================#
STATUS_COLOR_HEX = {
    "Excellent": "00B050",
    "Good": "2563EB",
    "Warning": "F59E0B",
    "Critical": "DC2626",
    "New": "6B7280",
}

# Below this many marked classes, percentage is not reliable -> status is "New"
MIN_CLASSES_FOR_STATUS = 5

#================ STATUS FROM PERCENTAGE (SINGLE SOURCE OF TRUTH) ======================#
# 90% - 100%  -> Excellent
# 75% - 89%   -> Good
# 60% - 74%   -> Warning
# Below 60%   -> Critical
def get_status_from_rate(rate):
    if rate >= 90:
        return "Excellent"
    if rate >= 75:
        return "Good"
    if rate >= 60:
        return "Warning"
    return "Critical"

#================ ATTENDANCE STATUS CALCULATION (EXCELLENT/GOOD/WARNING/CRITICAL) ======================#
def get_attendance_status(present_count, absent_count, late_count, total_days):
    if total_days == 0:
        return None, 0

    effective_present = present_count + late_count
    attendance_rate = round((effective_present / total_days) * 100, 3)

    if total_days < MIN_CLASSES_FOR_STATUS:
        return "New", attendance_rate

    return get_status_from_rate(attendance_rate), attendance_rate

# ================= PRESENT / ABSENT / LATE COUNTS - PER ENROLLMENT =================
def get_attendance_counts(enrollment, date_from=None, date_to=None):
    qs = Attendance.objects.filter(enrollment=enrollment)

    if date_from:
        qs = qs.filter(attendance_date__gte=date_from)

    if date_to:
        qs = qs.filter(attendance_date__lte=date_to)

    counts = qs.aggregate(
        present=Count("id", filter=Q(status="Present")),
        absent=Count("id", filter=Q(status="Absent")),
        late=Count("id", filter=Q(status="Late")),
    )

    present_count = counts["present"] or 0
    absent_count = counts["absent"] or 0
    late_count = counts["late"] or 0

    total_days = present_count + absent_count + late_count

    return present_count, absent_count, late_count, total_days


# ================= PRESENT / ABSENT / LATE COUNTS - GENERIC QUERYSET =================
def count_by_status(queryset):

    counts = queryset.aggregate(
        present=Count("id", filter=Q(status="Present")),
        absent=Count("id", filter=Q(status="Absent")),
        late=Count("id", filter=Q(status="Late")),
    )

    present = counts["present"] or 0
    absent = counts["absent"] or 0
    late = counts["late"] or 0

    return {
        "present": present,
        "absent": absent,
        "late": late,
        "total": present + absent + late,
    }

# ================= PRESENT / ABSENT / LATE COUNTS - ALL ENROLLMENTS AT ONCE =================
def get_bulk_attendance_counts(enrollment_ids, date_from=None, date_to=None):

    qs = Attendance.objects.filter(enrollment_id__in=enrollment_ids)

    if date_from:
        qs = qs.filter(attendance_date__gte=date_from)

    if date_to:
        qs = qs.filter(attendance_date__lte=date_to)

    rows = qs.values('enrollment_id').annotate(
        present=Count('id', filter=Q(status='Present')),
        absent=Count('id', filter=Q(status='Absent')),
        late=Count('id', filter=Q(status='Late')),
    ).order_by()

    result = {}

    for row in rows:
        present = row['present'] or 0
        absent = row['absent'] or 0
        late = row['late'] or 0

        result[row['enrollment_id']] = {
            'present': present,
            'absent': absent,
            'late': late,
            'total': present + absent + late,
        }

    return result

#==================== STUDENT ATTENDANCE % (FOR EMAIL/SMS NOTIFICATIONS) ========================#
def get_student_attendance_percentage(enrollment):
    # present / total marked working days (notification flows use this simple %)
    total_working_days = Attendance.objects.order_by().values('attendance_date').distinct().count()
    present_count = Attendance.objects.filter(enrollment=enrollment, status='Present').count()

    return round((present_count / total_working_days) * 100, 1) if total_working_days > 0 else 100

#================================ LATEST ATTENDANCE DATE HELPERS ===============================#
def get_latest_attendance_date():
    return Attendance.objects.aggregate(latest=Max('attendance_date'))['latest']


def get_formatted_latest_attendance_date(fmt="%d %b %Y", fallback="-"):
    latest_date = get_latest_attendance_date()
    return latest_date.strftime(fmt) if latest_date else fallback

#===================================== BATCH-WISE ATTENDANCE STATS ===================================#
def compute_batch_stats(batch, date_from=None, date_to=None, enrollment_ids=None, fallback_to_latest=False):
    qs = Attendance.objects.filter(batch=batch)

    if enrollment_ids is not None:
        qs = qs.filter(enrollment_id__in=enrollment_ids)

    if date_from:
        qs = qs.filter(attendance_date__gte=date_from)
    if date_to:
        qs = qs.filter(attendance_date__lte=date_to)

    if fallback_to_latest and not date_from and not date_to:
        latest_date = get_latest_attendance_date()
        qs = qs.filter(attendance_date=latest_date)

    counts = count_by_status(qs)
    present, absent, late, total = counts["present"], counts["absent"], counts["late"], counts["total"]

    percentage = round(((present + late) / total) * 100, 1) if total else 0

    return {
        "present": present,
        "absent": absent,
        "late": late,
        "total": total,
        "percentage": percentage,
    }


# same as compute_batch_stats but for many batches in a single query
def get_bulk_batch_stats(batch_ids, date_from=None, date_to=None, enrollment_ids=None, fallback_to_latest=False):

    result = {
        batch_id: {"present": 0, "absent": 0, "late": 0, "total": 0, "percentage": 0}
        for batch_id in batch_ids
    }

    qs = Attendance.objects.filter(batch_id__in=batch_ids)

    if enrollment_ids is not None:
        qs = qs.filter(enrollment_id__in=enrollment_ids)

    if date_from:
        qs = qs.filter(attendance_date__gte=date_from)
    if date_to:
        qs = qs.filter(attendance_date__lte=date_to)

    if fallback_to_latest and not date_from and not date_to:
        latest_date = get_latest_attendance_date()

        if latest_date is None:
            return result

        qs = qs.filter(attendance_date=latest_date)

    rows = qs.values('batch_id').annotate(
        present=Count('id', filter=Q(status='Present')),
        absent=Count('id', filter=Q(status='Absent')),
        late=Count('id', filter=Q(status='Late')),
    ).order_by()

    for row in rows:
        present = row['present'] or 0
        absent = row['absent'] or 0
        late = row['late'] or 0
        total = present + absent + late

        result[row['batch_id']] = {
            "present": present,
            "absent": absent,
            "late": late,
            "total": total,
            "percentage": round(((present + late) / total) * 100, 1) if total else 0,
        }

    return result

#==================== STATUS SUMMARY COUNTS (EXCELLENT/GOOD/WARNING/CRITICAL) ==================#
def get_status_summary_counts(report_students):
    counts = {"Excellent": 0, "Good": 0, "Warning": 0, "Critical": 0, "New": 0}
    for student in report_students:
        counts[student["status"]] = counts.get(student["status"], 0) + 1
    return counts

#======================== BATCH ANALYTICS TABLE ROWS (PDF/EXCEL EXPORT) =========================#
def get_batch_analytics_rows(my_staff=None, my_role=None, course=None, batch_id=None, date_from=None, date_to=None):
    # [course_name, batch_name, students, total_days, present, absent, late, "xx.x%"]
    rows = []

    batches = Batch.objects.select_related('course')

    if my_role == 'Trainer' and my_staff:
        batches = batches.filter(trainer=my_staff)

    if course:
        batches = batches.filter(course__course_name__iexact=course)

    if batch_id:
        batches = batches.filter(id=batch_id)

    batches = list(batches)
    batch_ids = [b.id for b in batches]

    stats_map = get_bulk_batch_stats(batch_ids, date_from=date_from, date_to=date_to)

    student_counts = dict(
        Enrollment.objects.filter(batch_id__in=batch_ids)
        .values_list('batch_id')
        .annotate(total=Count('id'))
        .order_by()
    )

    for batch in batches:
        stats = stats_map[batch.id]
        rows.append([
            batch.course.course_name,
            batch.batch_name,
            student_counts.get(batch.id, 0),
            stats["total"],
            stats["present"],
            stats["absent"],
            stats["late"],
            f"{stats['percentage']}%",
        ])
    return rows

#=============================== TRAINER & TIMING DISPLAY HELPERS ==========================#
def get_trainer_display_name(batch):
    return f"{batch.trainer.first_name} {batch.trainer.last_name}" if batch.trainer else "Not Assigned"


def get_batch_timing_display(batch):
    return f"{batch.start_time.strftime('%I:%M %p')} - {batch.end_time.strftime('%I:%M %p')}"

#================================= BATCH SEARCH FILTER (DASHBOARD) ===========================#
def filter_batches_by_search(queryset, search):
    # used by both dashboard_api and dashboard views
    if not search:
        return queryset

    return queryset.filter(
        Q(batch_name__icontains=search) |
        Q(course__course_name__icontains=search) |
        Q(trainer__first_name__icontains=search) |
        Q(trainer__last_name__icontains=search) |
        Q(timing__icontains=search)
    )

#========================= EMAIL TEMPLATE - LOW/CRITICAL ATTENDANCE ALERT ==============================#
def build_attendance_email(student, attendance_percentage):
    is_critical = attendance_percentage < 60
    subject = "Critical Attendance Alert" if is_critical else "Low Attendance Warning"

    if is_critical:
        message = f"""

        Dear {student.first_name},
        Your attendance percentage is critically low.
        Attendance Percentage: {attendance_percentage}%
        Immediate action is required. Please contact your trainer.

        Regards,
        CSC Computer Education"""
    else:
        message = f"""

        Dear {student.first_name},
        Your attendance percentage is below the required level.
        Attendance Percentage: {attendance_percentage}%
        Please attend classes regularly.

        Regards,
        CSC Computer Education"""

    return subject, message

#======================= SMS TEMPLATE - LOW/CRITICAL ATTENDANCE ALERT =======================#
def build_attendance_sms(student, attendance_percentage):
    is_critical = attendance_percentage < 60
    header = "Critical Attendance Alert" if is_critical else "Low Attendance Warning"
    action_line = "Immediate action required." if is_critical else "Please attend classes regularly."

    return f"""

        CSC ALERT
        {header}

        Student:{student.first_name}
        Attendance:{attendance_percentage}%
        {action_line}"""

#====================== ATTENDANCE EXPORT ROW BUILDER (EXCEL/PDF) =====================#
def build_export_rows(qs):
    rows = []
    for r in qs:
        rows.append({
            "date": str(r.attendance_date),
            "student_name": f"{r.enrollment.student.first_name} {r.enrollment.student.last_name}",
            "course_name": r.enrollment.course.course_name,
            "batch_name": r.batch.batch_name,
            "status": str(r.status),
            "trainer_name": getattr(r.trainer, "name", str(r.trainer)),
        })
    return rows