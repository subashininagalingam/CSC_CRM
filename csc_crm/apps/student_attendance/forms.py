from django import forms
from .models import Batch
from csc_crm.apps.staff.models import Staff

class BatchForm(forms.ModelForm):

    class Meta:
        model = Batch
        fields = [
            'batch_name',
            'course',
            'timing',
            'start_time',
            'end_time',
            'start_date',
            'end_date',
            'trainer',
        ]

        widgets = {
            'batch_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Eg: June 2026',
            }),

            'course': forms.Select(attrs={
                'class': 'form-select'
            }),

            'timing': forms.Select(attrs={
                'class': 'form-control'
            }),

            'start_date':forms.DateInput(attrs={
                'class':'form-control',
                'type':'date',
                'required':True,
            }),

            'end_date':forms.DateInput(attrs={
                'class':'form-control',
                'type':'date',
                'required':True,
                'readonly': True,
            }),

            'start_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),

            'end_time': forms.TimeInput(attrs={
                'class': 'form-control',
                'type': 'time'
            }),

            'trainer': forms.Select(attrs={
                'class': 'form-select',
            }),
        }
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['trainer'].queryset = Staff.objects.filter(
            role__role_name="Trainer",
            status="active"
        ).order_by("first_name")
        