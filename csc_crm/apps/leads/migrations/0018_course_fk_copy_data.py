from django.db import migrations

# old choice key -> name of the Course row it should link to
KEY_TO_COURSE_NAME = {
    'python': 'Python',
    'java': 'Java',
}

OLD_LABELS = {
    'fullstack': 'Full Stack Development',
    'frontend': 'Front-End Development',
    'backend': 'Back-End Development',
    'python': 'Python Programming',
    'java': 'Java Programming',
    'dotnet': '.NET Development',
    'mern': 'MERN Stack Development',
    'mean': 'MEAN Stack Development',
    'data_science': 'Data Science',
    'ai_ml': 'AI & Machine Learning',
    'cyber_security': 'Cyber Security',
    'cloud_computing': 'Cloud Computing',
    'uiux': 'UI/UX Design',
}


def copy_courses(apps, schema_editor):
    Lead = apps.get_model('leads', 'LeadCapture')
    Course = apps.get_model('admissions', 'Course')

    courses = {c.course_name.strip().lower(): c for c in Course.objects.all()}

    for lead in Lead.objects.exclude(course_old=''):
        key = (lead.course_old or '').strip()
        wanted = KEY_TO_COURSE_NAME.get(key)
        course = courses.get(wanted.lower()) if wanted else None

        if course:
            lead.course_interested = course
            lead.save(update_fields=['course_interested'])
        else:
            # no matching Course row: keep the old value in the notes
            label = OLD_LABELS.get(key, key)
            note = f'Course interested (old value): {label}'
            lead.initial_notes = f'{lead.initial_notes}\n{note}' if lead.initial_notes else note
            lead.save(update_fields=['initial_notes'])


class Migration(migrations.Migration):

    dependencies = [
            ('leads', '0017_course_fk_schema'),
        ]

    operations = [
        migrations.RunPython(copy_courses, migrations.RunPython.noop),
    ]