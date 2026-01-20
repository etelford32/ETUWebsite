"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });

  // Verify token on page load
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setMessage({ type: "error", text: "Invalid reset link" });
      return;
    }

    async function verifyToken() {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setTokenValid(true);
        } else {
          setMessage({ type: "error", text: data.error || "Invalid or expired reset link" });
        }
      } catch (error) {
        setMessage({ type: "error", text: "Failed to verify reset link" });
      } finally {
        setIsVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  // Check password strength as user types
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: [] });
      return;
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push("At least 8 characters");

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push("One uppercase letter");

    // Lowercase check
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push("One lowercase letter");

    // Number check
    if (/[0-9]/.test(password)) score += 15;
    else feedback.push("One number");

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) score += 10;
    else feedback.push("One special character");

    setPasswordStrength({ score, feedback });
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      setMessage({ type: "error", text: "Invalid reset link" });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    if (passwordStrength.score < 100) {
      setMessage({ type: "error", text: "Password does not meet requirements" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: "Password reset successfully! Redirecting to login..." });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to reset password" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] via-[#1a1a2e] to-[#0a0a14] flex items-center justify-center p-4">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
          <p className="text-center text-gray-300 mt-4">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] via-[#1a1a2e] to-[#0a0a14] flex items-center justify-center p-4">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Reset Password</h1>
        <p className="text-gray-400 text-center mb-6">Choose a new password for your account</p>

        {!tokenValid ? (
          <div className="space-y-4">
            {message && (
              <div className={`p-4 rounded ${message.type === "error" ? "bg-red-500/20 border border-red-500/50 text-red-200" : "bg-green-500/20 border border-green-500/50 text-green-200"}`}>
                {message.text}
              </div>
            )}
            <Link
              href="/login"
              className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded transition text-center"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <div className={`p-4 rounded ${message.type === "error" ? "bg-red-500/20 border border-red-500/50 text-red-200" : "bg-green-500/20 border border-green-500/50 text-green-200"}`}>
                {message.text}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score < 50
                            ? "bg-red-500"
                            : passwordStrength.score < 75
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {passwordStrength.score < 50 ? "Weak" : passwordStrength.score < 75 ? "Fair" : "Strong"}
                    </span>
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Required: {passwordStrength.feedback.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword || passwordStrength.score < 100}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded transition"
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-purple-400 hover:text-purple-300">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a14] via-[#1a1a2e] to-[#0a0a14] flex items-center justify-center p-4">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
          <p className="text-center text-gray-300 mt-4">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
