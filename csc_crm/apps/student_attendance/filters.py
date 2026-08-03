import django_filters
from django.db.models import Q
from .models import Attendance, Batch                   


class AttendanceFilter(django_filters.FilterSet):

    from_date = django_filters.DateFilter(
        field_name='attendance_date',
        lookup_expr='gte',
    )

    to_date = django_filters.DateFilter(
        field_name='attendance_date',
        lookup_expr='lte',
        method='filter_to_date' ,
    )

    status = django_filters.ChoiceFilter(
        choices=[
            ('Present', 'Present'),
            ('Absent', 'Absent'),
            ('Late', 'Late')
        ],
        empty_label="All"
    )

    batch = django_filters.ModelChoiceFilter(
        queryset=Batch.objects.all(),
        empty_label="All Batches"
    )

    course_name = django_filters.CharFilter(
        method='filter_course_name'
    )

    search = django_filters.CharFilter(method='custom_search')


    def filter_to_date(self, queryset, name, value):
        if value:
            return queryset.filter(attendance_date__lte=value)
        return queryset
    
    def filter_course_name(self, queryset, name, value):
        print("COURSE =", value)  # Debug

        if value:
            qs = queryset.filter(
                batch__course__course_name=value
            )

            print("FILTERED =", qs.count())
            return qs

        return queryset

    class Meta:
        model = Attendance
        fields = ['from_date', 'to_date', 'status', 'batch', 'course_name']

    def custom_search(self, queryset, name, value):
        query = (
        Q(enrollment__admission__student__first_name__istartswith=value) |
        Q(enrollment__admission__student__last_name__istartswith=value)
    )

        student_id = value.upper().replace("STU", "")

        if student_id.isdigit():
            query |= Q(enrollment__admission__student__id=int(student_id))

        return queryset.filter(query).distinct()