'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ErrorBanner } from '@/components/states/error-state';
import { Spinner } from '@/components/states/loading';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LoginFormValues = {
  email: string;
  password: string;
  remember: boolean;
};

export type LoginErrorState = 'invalid' | 'expired' | null;

const loginErrorCopy: Record<Exclude<LoginErrorState, null>, string> = {
  invalid: 'פרטי ההתחברות שגויים. נסה שוב.',
  expired: 'הסשן פג תוקף. נא להתחבר מחדש.',
};

function RequiredLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <FormLabel>
      {children}
      <span className="text-destructive" aria-hidden="true">
        {' '}
        *
      </span>
    </FormLabel>
  );
}

export function LoginForm({
  errorState,
}: Readonly<{
  errorState: LoginErrorState;
}>) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  function onSubmit() {
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 1500);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <p className="font-latin text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Spectix
        </p>
        <CardTitle className="text-2xl">כניסה למערכת</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {errorState ? (
          <ErrorBanner
            title="לא ניתן להתחבר"
            description={loginErrorCopy[errorState]}
          />
        ) : null}

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>אימייל</RequiredLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      className="font-latin"
                      required
                      suppressHydrationWarning
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <RequiredLabel>סיסמה</RequiredLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="current-password"
                      className="font-latin"
                      required
                      suppressHydrationWarning
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      suppressHydrationWarning
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    זכור אותי
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="min-h-11 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner label="מתחבר..." /> : 'כניסה'}
              </Button>
              <Button
                type="button"
                variant="link"
                className="min-h-11 w-full"
                onClick={() => toast.info('פנה למנהל המערכת לאיפוס סיסמה')}
              >
                שכחתי סיסמה
              </Button>
            </div>
          </form>
        </Form>

        {/*
          Signup UI permanently out of scope per Spike #01 design
          (adjusters seeded via /scripts/seed/create-adjuster.ts CLI).
          Do not add signup link.
        */}
        <p className="text-center text-sm text-muted-foreground">
          אין לך חשבון? פנה למנהל המערכת
        </p>
      </CardContent>
    </Card>
  );
}
