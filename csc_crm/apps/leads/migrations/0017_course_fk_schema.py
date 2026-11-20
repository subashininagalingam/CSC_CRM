from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
            ('leads', '0016_calllog_call_type_calllog_duration_seconds_and_more'),
            ('admissions', '__first__'),
        ]

    operations = [
        migrations.RenameField(
            model_name='leadcapture',
            old_name='course_interested',
            new_name='course_old',
        ),
        migrations.AlterField(
            model_name='leadcapture',
            name='course_old',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='leadcapture',
            name='course_interested',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='leads',
                to='admissions.course',
            ),
        ),
    ]