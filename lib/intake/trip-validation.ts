export type PreTripInsurance = 'yes' | 'no' | 'unknown';

export type TripDateContext = {
  incidentDate: string;
  tripStartDate: string;
  tripEndDate: string;
  today?: string;
};

export const TRIP_DATE_MESSAGES = {
  futureTripStart: 'תאריך עזיבה לא יכול להיות עתידי',
  tripEndBeforeStart: 'תאריך חזרה חייב להיות אחרי תאריך עזיבה',
  incidentOutsideTrip: 'תאריך האירוע חייב להיות בין תאריך העזיבה לחזרה.',
  futureIncident:
    'לא ניתן לפתוח תיק על אירוע שטרם התרחש. תיק נפתח רק לאחר שהאירוע אירע בפועל.',
} as const;

export function todayInIsrael(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jerusalem',
  });
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function validateTripDateContext({
  incidentDate,
  tripStartDate,
  tripEndDate,
  today = todayInIsrael(),
}: TripDateContext): Partial<Record<keyof TripDateContext, string>> {
  const issues: Partial<Record<keyof TripDateContext, string>> = {};

  if (isIsoDate(tripStartDate) && isIsoDate(today) && tripStartDate > today) {
    issues.tripStartDate = TRIP_DATE_MESSAGES.futureTripStart;
  }

  if (
    isIsoDate(tripStartDate) &&
    isIsoDate(tripEndDate) &&
    tripEndDate < tripStartDate
  ) {
    issues.tripEndDate = TRIP_DATE_MESSAGES.tripEndBeforeStart;
  }

  if (isIsoDate(incidentDate) && isIsoDate(today) && incidentDate > today) {
    issues.incidentDate = TRIP_DATE_MESSAGES.futureIncident;
  }

  if (
    isIsoDate(incidentDate) &&
    isIsoDate(tripStartDate) &&
    isIsoDate(tripEndDate) &&
    !issues.incidentDate &&
    (incidentDate < tripStartDate || incidentDate > tripEndDate)
  ) {
    issues.incidentDate = TRIP_DATE_MESSAGES.incidentOutsideTrip;
  }

  return issues;
}
