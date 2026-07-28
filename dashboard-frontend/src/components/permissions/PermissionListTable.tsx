'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { permissionApi, PermissionGroup } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { PermissionGroupDialog } from './PermissionGroupDialog';

interface PermissionListTableProps {
  onRefresh?: () => void;
}

export function PermissionListTable({ onRefresh }: PermissionListTableProps) {
  const { hasPermission } = useAuth();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<PermissionGroup | null>(null);

  const canCreate = hasPermission('permission:create');
  const canUpdate = hasPermission('permission:update');
  const canDelete = hasPermission('permission:delete');

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const response = await permissionApi.getAll({
        page,
        limit: 10,
        search: search || undefined,
      });
      setGroups(response.data);
      setMeta(response.meta);
    } catch (error) {
      console.error('Failed to fetch permission groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [page, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const handleEdit = (group: PermissionGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleDelete = (group: PermissionGroup) => {
    setDeletingGroup(group);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingGroup) return;

    try {
      await permissionApi.delete(deletingGroup.id);
      setDeleteDialogOpen(false);
      setDeletingGroup(null);
      fetchGroups();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to delete permission group:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingGroup(null);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingGroup(null);
    fetchGroups();
    onRefresh?.();
  };

  const extractActions = (permissions: { name: string }[]) => {
    return permissions.map((p) => {
      const parts = p.name.split(':');
      return parts[1] || p.name;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permission groups..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Permission Group
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions / Capabilities</TableHead>
              {(canUpdate || canDelete) && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  )}
                </TableRow>
              ))
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canUpdate || canDelete ? 4 : 3}
                  className="text-center py-8 text-muted-foreground"
                >
                  No permission groups found
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.description || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {extractActions(group.permissions).map((action) => (
                        <Badge key={action} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(group)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(meta.page - 1) * meta.limit + 1} to{' '}
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} groups
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <PermissionGroupDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        editGroup={editingGroup}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Permission Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingGroup?.name}</strong>?
              This will also delete all associated permissions and remove them from any
              assigned roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingGroup(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
