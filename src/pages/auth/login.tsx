import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { authApi } from "@/entities/auth/api";
import { loginSchema, type LoginValues } from "@/entities/auth/schemas";
import { useAuthStore } from "@/shared/auth/store";
import { getErrorMessage } from "@/shared/api/errors";
import { ThemeToggle } from "@/widgets/theme-toggle/theme-toggle";
import { LanguageToggle } from "@/widgets/language-toggle/language-toggle";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const [showPw, setShowPw] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      signIn(data.token, data.user);
      navigate("/", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─────────────────────────── Desktop brand panel ─────────────────────────── */}
      <aside className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden brand-gradient">
        {/* Layered atmosphere: deep overlay → soft top glow → fine dot grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/40" />
        <div className="absolute -top-1/3 start-[-15%] w-[130%] h-[70%] bg-white/[0.07] blur-3xl rounded-full pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* Hairline frame for editorial feel */}
        <div className="absolute inset-6 border border-white/10 rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between w-full px-14 xl:px-20 py-16">
          {/* Top: wordmark */}
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-700">
            <img
              src="/sufrix.svg"
              alt={t("app.name")}
              className="h-9 w-auto select-none"
              draggable={false}
            />
          </div>

          {/* Middle: editorial hero */}
          <div className="space-y-7 max-w-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:delay-150 motion-safe:fill-mode-backwards">
            <span className="inline-flex items-center gap-2 text-white/55 text-[11px] uppercase tracking-[0.28em] font-medium">
              <span className="w-6 h-px bg-white/40" />
              {t("auth.eyebrow", "POS for hospitality")}
            </span>
            <h1 className="text-white font-serif text-[42px] xl:text-[56px] leading-[1.05] tracking-tight">
              {t("app.tagline")}
            </h1>
            <p className="text-white/65 text-base xl:text-lg leading-relaxed max-w-md">
              {t("auth.signInSubtitle")}
            </p>
          </div>

          {/* Bottom: footer line */}
          <div className="flex items-center justify-between text-white/45 text-xs tracking-wide">
            <span>© 2026 Sufrix</span>
            <span className="hidden xl:flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("auth.statusOperational", "All systems operational")}
            </span>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────── Form panel ─────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 sm:px-10 relative">
        <div className="absolute top-5 end-5 flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
        </div>

        {/* Mobile-only icon mark */}
        <div className="flex lg:hidden mb-10 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
          <img
            src="/Icon.svg"
            alt={t("app.name")}
            className="h-14 w-auto select-none"
            draggable={false}
          />
        </div>

        <div className="w-full max-w-[380px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100 motion-safe:fill-mode-backwards">
          <header className="mb-9">
            <h2 className="font-serif text-3xl sm:text-[34px] tracking-tight leading-tight">
              {t("auth.welcome")}
            </h2>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              {t("auth.signInSubtitle")}
            </p>
          </header>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t("auth.email")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@sufrix.com"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {t("auth.password")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="h-11 pe-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                loading={isPending}
                className="w-full h-11 mt-2 group text-sm font-medium"
              >
                <span>{t("auth.signIn")}</span>
                <ArrowRight
                  size={16}
                  className="ms-1 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                />
              </Button>
            </form>
          </Form>

          <p className="text-center text-[11px] text-muted-foreground/70 mt-12 tracking-wider uppercase">
            © 2026 · Sufrix
          </p>
        </div>
      </main>
    </div>
  );
}