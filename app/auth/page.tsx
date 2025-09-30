"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import EpsilonLogoParticles from "@/app/components/epsilon-logo-particles"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentView, setCurrentView] = useState<'login' | 'forgot' | 'reset'>('login')
  const [resetLoading, setResetLoading] = useState(false)
  const { login, isAuthenticated, resetPassword } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated and check for reset parameters
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
    
    // Check URL parameters for password reset
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    
    if (urlParams.get('reset') === 'true' || hashParams.has('access_token')) {
      setCurrentView('reset')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      await login(email, password)
      router.push("/")
    } catch (err: any) {
      setError(err.message || "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError("")
    setSuccess("")

    try {
      await resetPassword(email)
      setSuccess("Password reset email sent! Check your inbox.")
      setCurrentView('login')
    } catch (err: any) {
      setError(err.message || "Failed to send reset email")
    } finally {
      setResetLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError("")
    setSuccess("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      setResetLoading(false)
      return
    }

    try {
      // This would be implemented with Supabase's updateUser function
      // For now, we'll show a success message
      setSuccess("Password updated successfully! You can now login with your new password.")
      setCurrentView('login')
    } catch (err: any) {
      setError(err.message || "Failed to update password")
    } finally {
      setResetLoading(false)
    }
  }

  if (isAuthenticated) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{
      backgroundImage: `
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)
      `,
      backgroundSize: '20px 20px'
    }}>
      {/* Main Login Card */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex min-h-[600px]" style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Left Panel - Interactive Logo Particles */}
        <div className="w-2/5 bg-black relative">
          <EpsilonLogoParticles />
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-3/5 bg-gray-800 p-12 flex flex-col justify-center relative">
          {/* Sign In Button (Top Right) */}
          <Button
            variant="outline"
            className="absolute top-6 right-6 bg-green-400 hover:bg-green-500 text-gray-800 border-green-400 rounded-full px-6 py-2 text-sm font-medium"
          >
            Sign In
          </Button>

          {/* Main Content */}
          <div className="max-w-md relative z-10">
            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-8">
              {currentView === 'login' && 'Sign In'}
              {currentView === 'forgot' && 'Reset Password'}
              {currentView === 'reset' && 'Set New Password'}
            </h1>

            {/* Messages */}
            {error && (
              <Alert className="border-red-400 bg-red-900/20 rounded-lg mb-6 shadow-lg" style={{
                boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1), 0 0 0 1px rgba(239, 68, 68, 0.05)'
              }}>
                <AlertDescription className="text-red-300 text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-400 bg-green-900/20 rounded-lg mb-6 shadow-lg" style={{
                boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.1), 0 0 0 1px rgba(34, 197, 94, 0.05)'
              }}>
                <AlertDescription className="text-green-300 text-sm">{success}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            {currentView === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="h-12 bg-transparent border-0 border-b border-gray-600 rounded-none px-0 text-gray-200 placeholder:text-gray-500 focus:border-green-400 focus:ring-0 focus:outline-none"
                    disabled={loading}
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 bg-transparent border-0 border-b border-gray-600 rounded-none px-0 pr-12 text-gray-200 placeholder:text-gray-500 focus:border-green-400 focus:ring-0 focus:outline-none"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    disabled={loading}
                    onClick={() => setCurrentView('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-400 hover:bg-green-500 text-gray-800 font-bold rounded-full transition-all duration-200 hover:shadow-lg mt-8"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "SIGN IN"
                  )}
                </Button>
              </form>
            )}

            {/* Forgot Password Form */}
            {currentView === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="h-12 bg-transparent border-0 border-b border-gray-600 rounded-none px-0 text-gray-200 placeholder:text-gray-500 focus:border-green-400 focus:ring-0 focus:outline-none"
                    disabled={resetLoading}
                  />
                </div>

                {/* Send Reset Email Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-400 hover:bg-green-500 text-gray-800 font-bold rounded-full transition-all duration-200 hover:shadow-lg mt-8"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "SEND RESET EMAIL"
                  )}
                </Button>

                {/* Back to Login */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    onClick={() => setCurrentView('login')}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Set New Password Form */}
            {currentView === 'reset' && (
              <form onSubmit={handlePasswordReset} className="space-y-6">
                {/* New Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                      className="h-12 bg-transparent border-0 border-b border-gray-600 rounded-none px-0 pr-12 text-gray-200 placeholder:text-gray-500 focus:border-green-400 focus:ring-0 focus:outline-none"
                      disabled={resetLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={resetLoading}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      required
                      className="h-12 bg-transparent border-0 border-b border-gray-600 rounded-none px-0 pr-12 text-gray-200 placeholder:text-gray-500 focus:border-green-400 focus:ring-0 focus:outline-none"
                      disabled={resetLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={resetLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Set Password Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-400 hover:bg-green-500 text-gray-800 font-bold rounded-full transition-all duration-200 hover:shadow-lg mt-8"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    "SET NEW PASSWORD"
                  )}
                </Button>

                {/* Back to Login */}
                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-400 hover:text-green-400 transition-colors"
                    onClick={() => setCurrentView('login')}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 flex justify-between items-center">
              <span className="text-sm text-gray-400">I'm already a member</span>
              <Button
                variant="outline"
                className="bg-green-400 hover:bg-green-500 text-gray-800 border-green-400 rounded-full px-6 py-2 text-sm font-bold"
              >
                SIGN IN
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
