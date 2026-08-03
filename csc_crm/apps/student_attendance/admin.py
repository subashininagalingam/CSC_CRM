from django.contrib import admin

from .models import (
    Trainer,
    Batch,
)


@admin.register(Trainer)
class TrainerAdmin(admin.ModelAdmin):

    list_display = (
        'trainer_name',
        'specialization',
        'phone_no',
        'email'
    )


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):

    list_display = (
        'batch_name',
        'course',
        'trainer',
        'student_count'
    )


