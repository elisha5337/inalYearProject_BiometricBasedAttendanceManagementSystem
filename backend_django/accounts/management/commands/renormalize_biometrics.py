"""
Management command: renormalize_biometrics

Fixes existing BiometricTemplate records that were stored with raw (unnormalized)
embeddings. After running this, all templates will be unit-normalized vectors
consistent with the new enrollment pipeline.

Usage:
    python manage.py renormalize_biometrics
"""
import numpy as np
from django.core.management.base import BaseCommand
from accounts.models import BiometricTemplate
from accounts.biometric_service import biometric_service


class Command(BaseCommand):
    help = 'Re-normalizes all existing biometric templates to unit vectors'

    def handle(self, *args, **options):
        templates = BiometricTemplate.objects.filter(type='FACE')
        total = templates.count()

        if total == 0:
            self.stdout.write(self.style.WARNING('No face templates found.'))
            return

        self.stdout.write(f'Re-normalizing {total} template(s)...')
        fixed = 0
        skipped = 0

        for t in templates:
            try:
                vec = np.array(t.template_data, dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm == 0:
                    self.stdout.write(self.style.ERROR(f'  SKIP {t.user.username}: zero vector'))
                    skipped += 1
                    continue
                if abs(norm - 1.0) < 1e-4:
                    self.stdout.write(f'  OK   {t.user.username}: already normalized (norm={norm:.6f})')
                    continue
                normalized = (vec / norm).tolist()
                t.template_data = normalized
                t.save(update_fields=['template_data'])
                self.stdout.write(self.style.SUCCESS(f'  FIXED {t.user.username}: norm was {norm:.4f}'))
                fixed += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ERROR {t.user.username}: {e}'))
                skipped += 1

        biometric_service.reload_cache()
        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Fixed: {fixed}, Skipped: {skipped}, Total: {total}'
        ))
        self.stdout.write(self.style.SUCCESS('BiometricRegistry reloaded.'))
        self.stdout.write(self.style.WARNING(
            '\nIMPORTANT: Re-enroll all users for best accuracy with the new pipeline.'
        ))
