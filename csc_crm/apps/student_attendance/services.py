from .models import Attendance, AbsentTracker
from .attendance_utils import get_status_from_rate
from csc_crm.apps.admissions.models import Enrollment
from django.utils import timezone
from .attendance_utils import get_status_from_rate, MIN_CLASSES_FOR_STATUS

# used when an enrollment has no attendance records yet
NO_ATTENDANCE = {
    'days': 0,
    'present': 0,
    'absent': 0,
    'consecutive': 0,
    'marked_today': False,
}


#================== ATTENDANCE SUMMARY FOR ALL ENROLLMENTS (ONE QUERY) ====================#
def _get_attendance_summary(today=None):

    summary = {}

    records = (
        Attendance.objects
        .order_by('enrollment_id', '-attendance_date')
        .values_list('enrollment_id', 'attendance_date', 'status')
        .iterator(chunk_size=2000)
    )

    for enrollment_id, attendance_date, status in records:

        data = summary.get(enrollment_id)

        if data is None:
            data = summary[enrollment_id] = {
                'days': 0,
                'present': 0,
                'absent': 0,
                'consecutive': 0,
                'marked_today': False,
                'last_date': None,
                'streak_broken': False,
            }

        if data['last_date'] != attendance_date:
            data['days'] += 1
            data['last_date'] = attendance_date

        if today and attendance_date == today:
            data['marked_today'] = True

        if status == 'Absent':
            data['absent'] += 1
            if not data['streak_broken']:
                data['consecutive'] += 1
        else:
            data['streak_broken'] = True
            if status in ('Present', 'Late'):
                data['present'] += 1

    return summary


#======================= ABSENT TRACKER DATA (FOR ABSENT TRACKER PAGE) =====================#
def get_absent_tracker_data():

    today = timezone.now().date()

    total_working_days = Attendance.objects.order_by().values('attendance_date').distinct().count()

    summary = _get_attendance_summary(today)

    enrollments = list(
        Enrollment.objects.select_related('admission__student', 'admission__course_name', 'batch')
    )

    trackers = {t.enrollment_id: t for t in AbsentTracker.objects.all()}

    new_trackers = []
    changed_trackers = []
    rows = []

    for enrollment in enrollments:

        data = summary.get(enrollment.id, NO_ATTENDANCE)

        if data['marked_today']:
            attendance_status = "Complete"
        else:
            attendance_status = "Incomplete"

        tracker = trackers.get(enrollment.id)

        if tracker is None:
            tracker = AbsentTracker(enrollment=enrollment, attendance_status=attendance_status)
            new_trackers.append(tracker)
        elif tracker.attendance_status != attendance_status:
            tracker.attendance_status = attendance_status
            changed_trackers.append(tracker)

        rows.append((enrollment, tracker, data, attendance_status))

    if new_trackers:
        AbsentTracker.objects.bulk_create(new_trackers)

    if changed_trackers:
        AbsentTracker.objects.bulk_update(changed_trackers, ['attendance_status'])

    students_data = []

    for enrollment, tracker, data, attendance_status in rows:

        total_absences = data['absent']
        consecutive_absences = data['consecutive']

        if total_working_days > 0:
            attendance_percentage = (data['present'] / total_working_days) * 100
        else:
            attendance_percentage = 100

        if total_absences >= 3:
            alert_level = "Critical"
        elif total_absences == 2:
            alert_level = "Medium"
        else:
            alert_level = "Low"

        if consecutive_absences >= 5:
            observation_note = "Critical Follow-up"
        elif consecutive_absences >= 3:
            observation_note = "Monitoring Required"
        elif total_absences >= 5:
            observation_note = "Frequent Absences"
        else:
            observation_note = "Normal Attendance"

        students_data.append({

            "id": enrollment.id,
            "notification_sent": tracker.notification_sent,
            "notification_status": tracker.notification_status,
            "student": enrollment.student,
            "course": enrollment.course,
            "batch": enrollment.batch,
            "total_absences": total_absences,
            "consecutive_absences": consecutive_absences,
            "attendance_percentage": round(attendance_percentage, 1),
            "alert_level": alert_level,
            "observation_note": observation_note,
            "attendance_status": attendance_status,
            "admin_notes": tracker.admin_notes,
            "tracker_id": tracker.id,

        })

    return students_data


#========================== LOW ATTENDANCE DATA (FOR LOW ATTENDANCE ALERTS PAGE) ======================#
def get_low_attendance_data():

    students_data = []

    summary = _get_attendance_summary()

    enrollments = Enrollment.objects.select_related(
        'admission__student', 'admission__course_name', 'batch'
    )

    for enrollment in enrollments:

        data = summary.get(enrollment.id)

        # no attendance marked yet
        if not data:
            continue

        # not enough classes yet -> percentage is unreliable (Absent Tracker covers early absences)
        if data['days'] < MIN_CLASSES_FOR_STATUS:
            continue

        # Attendance Percentage
        attendance_percentage = round((data['present'] / data['days']) * 100, 1)

        # Alert Logic (same 90 / 75 / 60 rule as the Reports page)
        # Only Warning (60-74%) and Critical (below 60%) students are listed here.
        alert_level = get_status_from_rate(attendance_percentage)

        if alert_level not in ("Warning", "Critical"):
            continue

        students_data.append({
            "id": enrollment.id,
            "student": enrollment.student,
            "course": enrollment.course,
            "batch": enrollment.batch,
            "attendance_percentage": attendance_percentage,
            "total_absences": data['absent'],
            "consecutive_absences": data['consecutive'],
            "alert_level": alert_level,
        })

    return students_data