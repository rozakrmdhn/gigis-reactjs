import { DynamicBreadcrumb } from "~/components/dynamic-breadcrumb"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { useAuth } from "~/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar"
import { LogOut, Settings, User, ChevronDown } from "lucide-react"

export function SiteHeader() {
  const { user, signout } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-background/95 flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] duration-300 ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <DynamicBreadcrumb />
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center gap-2 px-1 py-1.5 h-auto hover:bg-transparent focus-visible:ring-0">
                  <div className="flex flex-col items-end mr-1 hidden sm:flex">
                    <span className="text-xs font-bold text-foreground leading-none">{user.nama}</span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1 leading-none uppercase tracking-wider">{user.role}</span>
                  </div>
                  <Avatar className="h-8 w-8 border-2 border-primary/10 transition-transform hover:scale-105">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.id}.png`} alt={user.nama} />
                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                      {user.nama?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">{user.nama}</p>
                    <p className="text-xs leading-none text-muted-foreground uppercase tracking-widest mt-1">
                      {user.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil Saya</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600 cursor-pointer font-bold"
                  onClick={() => signout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  )
}
