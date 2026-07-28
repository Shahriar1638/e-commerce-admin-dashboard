export const STANDARD_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'watch',
  'upload',
  'write',
  'approve',
  'status',
] as const;

export type StandardAction = (typeof STANDARD_ACTIONS)[number];

export function normalizeGroupName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Group name cannot be empty');
  }
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function normalizeActionName(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) {
    throw new Error('Action name cannot be empty');
  }
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function buildPermissionName(groupName: string, action: string): string {
  const normalizedGroup = normalizeGroupName(groupName);
  const normalizedAction = normalizeActionName(action);
  return `${normalizedGroup}:${normalizedAction}`;
}

export function validateActionName(action: string): void {
  const normalized = normalizeActionName(action);
  if (!normalized) {
    throw new Error(`Invalid action name: ${action}`);
  }
}

export function validateGroupName(name: string): void {
  const normalized = normalizeGroupName(name);
  if (!normalized) {
    throw new Error(`Invalid group name: ${name}`);
  }
}
