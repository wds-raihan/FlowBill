"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Navigation } from "./Navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show navigation on auth pages
  const isAuthPage = pathname?.startsWith("/auth");
  const isPublicPage = pathname === "/" || isAuthPage;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="lg:pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}