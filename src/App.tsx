import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { useEffect } from "react";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminJarvis from "./pages/AdminJarvis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Инициализация Telegram WebApp + регистрация webhook
function AppInit() {
  useEffect(() => {
    // Инициализируем Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Устанавливаем тёмную тему
      document.documentElement.style.setProperty('--tg-color-scheme', 'dark');
    }

    // Регистрируем Telegram webhook
    fetch('https://ldvlahtoiwimroycqcav.supabase.co/functions/v1/setup-webhook', {
      method: 'POST',
    }).then(r => r.json()).then(d => {
      console.log('[App] Telegram webhook setup:', d);
    }).catch(() => {});
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AppInit />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/jarvis" element={<AdminJarvis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;