'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { permissionApi, PermissionGroup } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, X, AlertCircle } from 'lucide-react';

const STANDARD_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'watch',
  'upload',
  'write',
  'approve',
  'status',
];

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  actions: z.array(z.string()).min(1, 'At least one action is required'),
  customActions: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

interface PermissionGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editGroup: PermissionGroup | null;
}

export function PermissionGroupDialog({
  open,
  onClose,
  onSuccess,
  editGroup,
}: PermissionGroupDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customActionInput, setCustomActionInput] = useState('');
  const [customActions, setCustomActions] = useState<string[]>([]);

  const isEditing = !!editGroup;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      actions: [],
      customActions: [],
    },
  });

  const selectedActions = watch('actions') || [];

  useEffect(() => {
    if (open) {
      if (editGroup) {
        const existingActions = editGroup.permissions.map((p) => {
          const parts = p.name.split(':');
          return parts[1] || p.name;
        });

        const standardActions = existingActions.filter((a) =>
          STANDARD_ACTIONS.includes(a)
        );
        const custom = existingActions.filter((a) => !STANDARD_ACTIONS.includes(a));

        reset({
          name: editGroup.name,
          description: editGroup.description || '',
          actions: standardActions,
          customActions: custom,
        });
        setCustomActions(custom);
      } else {
        reset({
          name: '',
          description: '',
          actions: [],
          customActions: [],
        });
        setCustomActions([]);
      }
      setError(null);
      setCustomActionInput('');
    }
  }, [open, editGroup, reset]);

  const handleActionToggle = (action: string) => {
    const current = selectedActions;
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    setValue('actions', updated, { shouldValidate: true });
  };

  const handleAddCustomAction = () => {
    const normalized = customActionInput
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!normalized) return;

    if (customActions.includes(normalized)) {
      setError('This custom action already exists');
      return;
    }

    const updated = [...customActions, normalized];
    setCustomActions(updated);
    setValue('customActions', updated, { shouldValidate: true });
    setCustomActionInput('');
    setError(null);
  };

  const handleRemoveCustomAction = (action: string) => {
    const updated = customActions.filter((a) => a !== action);
    setCustomActions(updated);
    setValue('customActions', updated, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        actions: data.actions,
        customActions: data.customActions,
      };

      if (isEditing) {
        await permissionApi.update(editGroup.id, payload);
      } else {
        await permissionApi.create(payload);
      }

      onSuccess();
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'An error occurred';
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Permission Group' : 'Create Permission Group'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the permission group and its actions.'
              : 'Create a new permission group with standard and custom actions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Module Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Product, Brand, Category"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of this module"
              {...register('description')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Standard Actions *</Label>
            <div className="grid grid-cols-3 gap-2">
              {STANDARD_ACTIONS.map((action) => (
                <div key={action} className="flex items-center space-x-2">
                  <Checkbox
                    id={`action-${action}`}
                    checked={selectedActions.includes(action)}
                    onCheckedChange={() => handleActionToggle(action)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor={`action-${action}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {action}
                  </Label>
                </div>
              ))}
            </div>
            {errors.actions && (
              <p className="text-sm text-destructive">{errors.actions.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Custom Actions</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., discount_apply"
                value={customActionInput}
                onChange={(e) => setCustomActionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomAction();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomAction}
                disabled={isLoading || !customActionInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {customActions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {customActions.map((action) => (
                  <span
                    key={action}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                  >
                    {action}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomAction(action)}
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
