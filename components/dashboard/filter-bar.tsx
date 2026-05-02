'use client';

import { Plus, X } from 'lucide-react';

import { Tag } from '@/components/data-display/tag';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const filters = [
  'סיכון: אדום + כתום',
  'סטטוס: בעיבוד',
  'מטרה: תיירות',
] as const;

export function FilterBar() {
  return (
    <section
      className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between"
      aria-label="מסנני תור עבודה"
    >
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Tag key={filter} tone="info" className="gap-2">
            {filter}
            <button
              type="button"
              aria-label={`הסרת מסנן ${filter}`}
              className="rounded-sm p-0.5 hover:bg-background"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </Tag>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select defaultValue="newest" dir="rtl">
          <SelectTrigger className="w-full sm:w-56" aria-label="מיון תיקים">
            <SelectValue placeholder="בחר מיון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">תאריך (חדש לישן)</SelectItem>
            <SelectItem value="oldest">תאריך (ישן לחדש)</SelectItem>
            <SelectItem value="risk">סיכון (גבוה לנמוך)</SelectItem>
            <SelectItem value="amount">סכום (גבוה לנמוך)</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          הוסף מסנן
        </Button>
      </div>
    </section>
  );
}
