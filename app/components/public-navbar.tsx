import { Link, useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import { Button } from "~/components/ui/button";
import { IconActivity, IconArrowRight, IconLogin } from "@tabler/icons-react";

export function PublicNavbar() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <IconActivity size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">GIGI'S</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/peta-interaktif">
            <Button variant="ghost" className="text-slate-600">Peta Interaktif</Button>
          </Link>
          {isAuthenticated ? (
            <Button onClick={() => navigate("/dashboard")} className="gap-2">
              Dashboard <IconArrowRight size={18} />
            </Button>
          ) : (
            <Link to="/login">
              <Button variant="ghost" className="gap-2">
                Masuk <IconLogin size={18} />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
