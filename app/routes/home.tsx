import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return null;
}
