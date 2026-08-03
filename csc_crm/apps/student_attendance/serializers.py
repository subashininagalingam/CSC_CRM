from rest_framework import serializers
from django.utils import timezone
from .models import (
    SyllabusLog,
    Batch,
    Attendance
)


# class TrainerSerializer(serializers.ModelSerializer):

#     class Meta:
#         model = Trainer
#         fields = '__all__'


class BatchSerializer(serializers.ModelSerializer):

    trainer_name = serializers.SerializerMethodField()
    is_marked = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    course_name = serializers.CharField(
        source='course.course_name',
        read_only=True
    )
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    is_marked = serializers.SerializerMethodField()
    display_status = serializers.CharField(read_only=True)

    class Meta:
        model = Batch
        fields = [
            'id',
            'batch_name',
            'course',
            'course_name',
            'timing',
            'start_time',
            'end_time',
            'student_count',
            'present_count',
            'absent_count',
            'trainer',
            'trainer_name',
            'is_marked',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
            'status', 
            'display_status',
        ]


    def validate(self, data):
        trainer = data.get('trainer')
        timing = data.get('timing')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        today = timezone.now().date()

        # Only enforce "no past start date" on CREATE, not on UPDATE
        # (self.instance is set when updating an existing batch)
        if self.instance is None and start_date and start_date < today:
            raise serializers.ValidationError({
            "start_date": "Start cannot be a past date."
        })

        # Trainer overlap validation
        if trainer and start_date and end_date:
            overlapping_batches = Batch.objects.filter(
            trainer=trainer,
            timing=timing,
            start_date__lte=end_date,
            end_date__gte=start_date
        )

        # Update time exclude current batch
            if self.instance:
                overlapping_batches = overlapping_batches.exclude(
                pk=self.instance.pk
            )

            if overlapping_batches.exists():
                raise serializers.ValidationError({
                "trainer": [
                    "Trainer already assigned to another batch during this period."
                ]
            })

        return data

    def get_student_count(self, obj):

        return obj.student_count

    def get_trainer_name(self, obj):

        if obj.trainer:
            return f"{obj.trainer.first_name} {obj.trainer.last_name}"

        return None

    def get_present_count(self, obj):
        today = timezone.now().date()
        return Attendance.objects.filter(
            batch=obj,
            attendance_date=today,
            status__in=["Present", "Late"]
        ).count()

    def get_absent_count(self, obj):
        today = timezone.now().date()
        return Attendance.objects.filter(
            batch=obj,
            attendance_date=today,
            status="Absent"
        ).count()



    def get_is_marked(self, obj):

        return Attendance.objects.filter(
            batch=obj,
            attendance_date=timezone.now().date()
        ).exists()
    



class AttendanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Attendance
        fields = '__all__'

class SyllabusLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = SyllabusLog
        fields = "__all__"