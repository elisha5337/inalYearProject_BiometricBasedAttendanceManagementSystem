from datetime import date

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.views import materialize_absent_records_for_date


class Command(BaseCommand):
    help = 'Materialize absent attendance records for a date range or a single date.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date in YYYY-MM-DD format. Defaults to today.',
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            try:
                date_obj = date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR('Invalid date format. Use YYYY-MM-DD.'))
                return
        else:
            date_obj = timezone.localdate()

        created = materialize_absent_records_for_date(date_obj)
        self.stdout.write(self.style.SUCCESS(
            f'Created {len(created)} absent attendance record(s) for {date_obj}.'
        ))
