"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const errorMessages: Record<string, { title: string; description: string; action?: string }> = {
  Configuration: {
    title: "Server Configuration Error",
    description: "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to sign in with this account.",
    action: "Please contact your administrator or try a different account.",
  },
  Verification: {
    title: "Verification Error",
    description: "The verification token has expired or has already been used.",
    action: "Please request a new verification email.",
  },
  OAuthSignin: {
    title: "OAuth Sign-in Error",
    description: "There was an error signing in with your OAuth provider.",
    action: "Please try again or use a different sign-in method.",
  },
  OAuthCallback: {
    title: "OAuth Callback Error",
    description: "There was an error processing the OAuth callback.",
    action: "Please try signing in again.",
  },
  OAuthCreateAccount: {
    title: "OAuth Account Creation Error",
    description: "Could not create an account with your OAuth provider.",
    action: "Please try again or contact support if the problem persists.",
  },
  EmailCreateAccount: {
    title: "Email Account Creation Error",
    description: "Could not create an account with your email address.",
    action: "Please try again or contact support if the problem persists.",
  },
  Callback: {
    title: "Callback Error",
    description: "There was an error in the authentication callback.",
    action: "Please try signing in again.",
  },
  OAuthAccountNotLinked: {
    title: "Account Not Linked",
    description: "This account is not linked to your existing account.",
    action: "Please sign in with the same provider you used originally, or contact support to link your accounts.",
  },
  EmailSignin: {
    title: "Email Sign-in Error",
    description: "There was an error sending the verification email.",
    action: "Please check your email address and try again.",
  },
  CredentialsSignin: {
    title: "Invalid Credentials",
    description: "The email or password you entered is incorrect.",
    action: "Please check your credentials and try again.",
  },
  SessionRequired: {
    title: "Session Required",
    description: "You must be signed in to access this page.",
    action: "Please sign in to continue.",
  },
  default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during authentication.",
    action: "Please try again or contact support if the problem persists.",
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";
  
  const errorInfo = errorMessages[error] || errorMessages.default;

  const handleRetry = () => {
    window.location.href = "/auth/signin";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center"
            >
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>
            
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {errorInfo.title}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                {errorInfo.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="text-center">
            {errorInfo.action && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {errorInfo.action}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full"
              >
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Need help?{" "}
              <Link
                href="/contact"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Contact Support
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Error Details for Development */}
        {process.env.NODE_ENV === "development" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Debug Information
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>Error Code: {error}</div>
              <div>URL: {window.location.href}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}