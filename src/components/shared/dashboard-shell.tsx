"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SidebarNav } from "./sidebar-nav";
import { MobileTabBar, isFocusedPage } from "./mobile-tab-bar";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { initials, cn } from "@/lib/utils";
import type { NavSection, NavItem } from "@/lib/nav-config";

export function DashboardShell({
  sections,
  tabs,
  roleLabel,
  userName,
  signOutAction,
  notifications,
  unreadCount,
  children,
}: {
  sections: NavSection[];
  tabs: NavItem[];
  roleLabel: string;
  userName: string;
  signOutAction: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const showTabBar = tabs.length > 0 && !isFocusedPage(pathname);

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

        {/* Leave room under the content for the bottom tab bar (and the home bar on phones that have one). */}
        <main className={cn("flex-1 p-4 sm:p-6", showTabBar && "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6")}>{children}</main>
      </div>

      <MobileTabBar tabs={tabs} onMore={() => setMobileOpen(true)} />

      {/* The menu drawer: pinned to the left edge at every size below md (the sm: classes cancel the centred-card layout dialogs get from sm up). */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="inset-y-0 left-0 right-auto top-0 h-dvh max-h-none w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none border-b-0 border-l-0 border-r border-t-0 p-0 sm:inset-y-0 sm:left-0 sm:top-0 sm:h-dvh sm:max-h-none sm:w-72 sm:max-w-[85vw] sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:p-0 md:hidden">
          <SidebarNav sections={sections} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
