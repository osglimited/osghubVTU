import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/firebase";

export function Topbar() {
  const user = auth.currentUser || JSON.parse(localStorage.getItem('mockUser') || '{}');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-primary px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-primary-foreground md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-primary/70" />
          <Input
            type="search"
            placeholder="Search anything..."
            className="w-64 rounded-full border-none bg-white/10 pl-9 text-white placeholder:text-white/70 focus-visible:bg-white focus-visible:text-foreground focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-white/10">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent animate-pulse" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-white/20 hover:ring-white">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatar-placeholder.png" alt="Admin" />
                <AvatarFallback className="bg-primary-foreground text-primary font-bold">
                  {user.displayName ? user.displayName.charAt(0) : 'A'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => auth.signOut()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
