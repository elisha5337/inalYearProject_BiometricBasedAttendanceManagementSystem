from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_attendancerecord_employee_name_snapshot_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='device',
            name='type',
            field=models.CharField(
                choices=[
                    ('Kiosk', 'Kiosk'),
                    ('Handheld', 'Handheld'),
                    ('Desktop', 'Desktop'),
                ],
                default='Kiosk',
                max_length=20,
            ),
        ),
    ]
