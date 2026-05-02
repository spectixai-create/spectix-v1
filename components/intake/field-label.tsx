import { FormLabel } from '@/components/ui/form';

export function FieldLabel({
  children,
  required,
}: Readonly<{
  children: React.ReactNode;
  required?: boolean;
}>) {
  return (
    <FormLabel>
      {children}
      {required ? (
        <span className="text-destructive" aria-hidden="true">
          {' '}
          *
        </span>
      ) : null}
    </FormLabel>
  );
}
