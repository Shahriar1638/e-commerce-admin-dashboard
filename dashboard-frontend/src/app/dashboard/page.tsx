'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LogOut,
  Package,
  Tag,
  Building2,
  Users,
  Shield,
  Settings,
} from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Skeleton className="h-6 w-40" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const { user, role, permissions, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { label: 'Products', href: '/products', icon: Package, permission: 'product:watch' },
    { label: 'Categories', href: '/categories', icon: Tag, permission: 'category:watch' },
    { label: 'Brands', href: '/brands', icon: Building2, permission: 'brand:watch' },
    { label: 'Users', href: '/users', icon: Users, permission: 'user:watch' },
    { label: 'Roles', href: '/roles', icon: Shield, permission: 'role:watch' },
    { label: 'Settings', href: '/settings', icon: Settings, permission: 'permission:watch' },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    permissions.includes(item.permission)
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>

            <div className="flex items-center gap-4">
              <Badge variant="secondary">{role}</Badge>

              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-8 w-8 rounded-full cursor-pointer outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user ? getInitials(user.email) : '?'}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">{role}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.email.split('@')[0]}
            </h2>
            <p className="text-muted-foreground">
              Here&apos;s what you can access with your current role.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Your Permissions</h3>
            <div className="flex flex-wrap gap-2">
              {permissions.length > 0 ? (
                permissions.map((perm) => (
                  <Badge key={perm} variant="outline">
                    {perm}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No permissions assigned</p>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleMenuItems.map((item) => (
                <Card key={item.href} className="hover:bg-accent/50 transition-colors">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="ml-2 text-sm font-medium">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Manage {item.label.toLowerCase()}
                    </CardDescription>
                    <Button
                      variant="link"
                      className="p-0 h-auto mt-2"
                      onClick={() => router.push(item.href)}
                    >
                      View {item.label.toLowerCase()} →
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {visibleMenuItems.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No modules available for your current role.</p>
                    <p className="text-sm mt-1">Contact an administrator for access.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
