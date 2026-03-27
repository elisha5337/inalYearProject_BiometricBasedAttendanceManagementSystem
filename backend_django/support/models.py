from django.db import models

class FAQCategory(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='HelpCircle', help_text="Lucide icon name")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "FAQ Categories"
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

class FAQItem(models.Model):
    category = models.ForeignKey(FAQCategory, related_name='items', on_delete=models.CASCADE)
    question = models.CharField(max_length=255)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'question']

    def __str__(self):
        return self.question
