import { useNavigate } from "react-router"
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import { useAuth } from "~/contexts/auth-context"
import { cn } from "~/lib/utils"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, signout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    signout()
    navigate("/")
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "w-full h-12 rounded-xl p-2 transition-all duration-200 shadow-xs border",
                "bg-slate-50/50 hover:bg-slate-100/80 border-slate-100 text-slate-800",
                "dark:bg-slate-900/10 dark:hover:bg-slate-900/40 dark:border-slate-900 dark:text-slate-200",
                "data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-900/60"
              )}
            >
              <Avatar className="h-8 w-8 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-800">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=3b82f6&color=fff`}
                  alt={user.nama}
                />
                <AvatarFallback className="rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 text-white font-bold text-xs">
                  {getInitials(user.nama)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-xs leading-tight ml-1">
                <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{user.nama}</span>
                <span className="text-slate-400 dark:text-slate-500 truncate text-[10px] uppercase font-bold tracking-wider mt-0.5">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-3.5 text-slate-400 dark:text-slate-550 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg p-1.5"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm bg-slate-50/50 dark:bg-slate-900/20 rounded-lg border border-slate-100/50 dark:border-slate-800/30">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=3b82f6&color=fff`}
                    alt={user.nama}
                  />
                  <AvatarFallback className="rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 text-white font-bold text-xs">
                    {getInitials(user.nama)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-bold text-slate-800 dark:text-slate-200">{user.nama}</span>
                  <span className="text-slate-400 dark:text-slate-500 truncate text-[10px] uppercase font-bold tracking-wider">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuGroup className="space-y-0.5">
              <DropdownMenuItem 
                onClick={() => navigate("/admin/profile")}
                className="text-xs rounded-lg py-1.5 cursor-pointer text-slate-650 dark:text-slate-300"
              >
                <UserCircle className="size-4 mr-2" />
                Profil Saya
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="my-1.5" />
            <DropdownMenuItem onClick={handleLogout} className="text-xs rounded-lg py-1.5 text-rose-600 dark:text-rose-450 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/20">
              <LogOut className="size-4 mr-2" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
