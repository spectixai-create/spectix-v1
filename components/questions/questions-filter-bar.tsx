'use client';

import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import { Tag } from '@/components/data-display/tag';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuestionFilter, QuestionSort } from './questions-view';

const filterLabels: Record<QuestionFilter, string> = {
  'claim-2024-001': 'תיק: 2024-001',
  urgent: 'דחוף בלבד',
  week: 'השבוע',
  month: 'החודש',
};

export function QuestionsFilterBar({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
}: Readonly<{
  filters: QuestionFilter[];
  sort: QuestionSort;
  onFiltersChange: (filters: QuestionFilter[]) => void;
  onSortChange: (sort: QuestionSort) => void;
}>) {
  function removeFilter(filter: QuestionFilter) {
    onFiltersChange(filters.filter((item) => item !== filter));
  }

  function addDemoFilter() {
    if (filters.includes('claim-2024-001')) {
      toast.info('מסנן הדמו כבר פעיל');
      return;
    }

    onFiltersChange([...filters, 'claim-2024-001']);
    toast.info('מסנן דמו נוסף');
  }

  return (
    <section
      className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between"
      aria-label="מסנני שאלות הבהרה"
    >
      <div className="flex flex-wrap gap-2">
        {filters.length ? (
          filters.map((filter) => (
            <Tag key={filter} tone="info" className="gap-2">
              {filterLabels[filter]}
              <button
                type="button"
                aria-label={`הסרת מסנן ${filterLabels[filter]}`}
                className="rounded-sm p-0.5 hover:bg-background"
                onClick={() => removeFilter(filter)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Tag>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">
            אין מסננים פעילים
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={sort}
          onValueChange={(value) => onSortChange(value as QuestionSort)}
          dir="rtl"
        >
          <SelectTrigger
            className="w-full sm:w-60"
            aria-label="מיון שאלות הבהרה"
          >
            <SelectValue placeholder="בחר מיון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">לפי תאריך (חדש לישן)</SelectItem>
            <SelectItem value="date-asc">לפי תאריך (ישן לחדש)</SelectItem>
            <SelectItem value="urgency">לפי דחיפות</SelectItem>
            <SelectItem value="claim">לפי תיק</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={addDemoFilter}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          הוסף מסנן
        </Button>
      </div>
    </section>
  );
}
