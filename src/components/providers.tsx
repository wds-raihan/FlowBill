"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MotionConfig reducedMotion="user">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </MotionConfig>
    </SessionProvider>
  );
}

function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
