"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SidebarNav } from "./sidebar-nav";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { initials } from "@/lib/utils";
import type { NavSection } from "@/lib/nav-config";

export function DashboardShell({
  sections,
  roleLabel,
  userName,
  signOutAction,
  notifications,
  unreadCount,
  children,
}: {
  sections: NavSection[];
  roleLabel: string;
  userName: string;
  signOutAction: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <div className="fixed h-screen w-64">
          <SidebarNav sections={sections} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials(userName)}</AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight">{userName}</span>
                  <span className="block text-xs leading-tight text-muted-foreground">{roleLabel}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block">{userName}</span>
                <span className="block text-xs font-normal text-muted-foreground">{roleLabel}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/notifications">Notification Preferences</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => void signOutAction()}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="left-0 top-0 h-full w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-r border-l-0 border-t-0 border-b-0 p-0 md:hidden">
          <SidebarNav sections={sections} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
