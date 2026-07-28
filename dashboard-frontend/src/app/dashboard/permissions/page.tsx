'use client';

import { PermissionListTable } from '@/components/permissions';

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Permission Groups</h2>
        <p className="text-muted-foreground">
          Manage permission groups and their associated actions.
        </p>
      </div>

      <PermissionListTable />
    </div>
  );
}
