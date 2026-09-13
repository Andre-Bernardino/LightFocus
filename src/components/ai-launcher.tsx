import { Link, useLocation } from "@tanstack/react-router";
import { Bot } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AiLauncher() {
  const location = useLocation();
  if (location.pathname === "/chat" || location.pathname === "/auth") return null;

  return (
    <Button
      asChild
      size="icon"
      className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg sm:bottom-7 sm:right-7"
    >
      <Link
        to="/chat"
        aria-label="Conversar com a Assistente LightFocus"
        title="Conversar com a IA"
      >
        <Bot className="h-5 w-5" />
      </Link>
    </Button>
  );
}
