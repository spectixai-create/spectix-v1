export type AdjusterRole =
  | 'rep'
  | 'claims_specialist'
  | 'manager'
  | 'investigator'
  | 'admin';

export type AdjusterAction =
  | 'view_claim'
  | 'request_info'
  | 'recommend_decision'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'override'
  | 'user_admin';

type UserWithMetadata = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const ADJUSTER_ROLE_LABELS: Record<AdjusterRole, string> = {
  rep: 'נציג',
  claims_specialist: 'מומחה תביעות',
  manager: 'מנהל',
  investigator: 'חוקר',
  admin: 'Admin',
};

const ROLE_PERMISSIONS: Record<
  AdjusterRole,
  Record<AdjusterAction, boolean>
> = {
  rep: {
    view_claim: true,
    request_info: true,
    recommend_decision: true,
    approve: false,
    reject: false,
    escalate: false,
    override: false,
    user_admin: false,
  },
  claims_specialist: {
    view_claim: true,
    request_info: true,
    recommend_decision: true,
    approve: true,
    reject: true,
    escalate: true,
    override: false,
    user_admin: false,
  },
  manager: {
    view_claim: true,
    request_info: true,
    recommend_decision: true,
    approve: true,
    reject: true,
    escalate: true,
    override: true,
    user_admin: false,
  },
  investigator: {
    view_claim: true,
    request_info: false,
    recommend_decision: false,
    approve: false,
    reject: false,
    escalate: false,
    override: false,
    user_admin: false,
  },
  admin: {
    view_claim: true,
    request_info: true,
    recommend_decision: true,
    approve: true,
    reject: true,
    escalate: true,
    override: true,
    user_admin: true,
  },
};

export const ADJUSTER_PERMISSION_DENIED_MESSAGE = 'אין הרשאה לביצוע פעולה זו';

export function resolveAdjusterRole(
  user: UserWithMetadata | null | undefined,
): AdjusterRole {
  const value =
    readRole(user?.app_metadata, 'adjuster_role') ??
    readRole(user?.app_metadata, 'role') ??
    readRole(user?.user_metadata, 'adjuster_role') ??
    readRole(user?.user_metadata, 'role');

  return value ?? 'claims_specialist';
}

export function getAdjusterRoleLabel(role: AdjusterRole): string {
  return ADJUSTER_ROLE_LABELS[role];
}

export function canPerformAdjusterAction(
  role: AdjusterRole,
  action: AdjusterAction,
): boolean {
  return ROLE_PERMISSIONS[role][action];
}

function readRole(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): AdjusterRole | null {
  const value = metadata?.[key];

  if (
    value === 'rep' ||
    value === 'claims_specialist' ||
    value === 'manager' ||
    value === 'investigator' ||
    value === 'admin'
  ) {
    return value;
  }

  return null;
}
