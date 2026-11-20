from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
            ('leads', '0018_course_fk_copy_data'),
        ]

    operations = [
        migrations.RemoveField(
            model_name='leadcapture',
            name='course_old',
        ),
    ]