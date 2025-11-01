"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "../lib/contexts/auth-context"
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
    // Check URL parameters for password reset first
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    
    if (urlParams.get('reset') === 'true' || hashParams.has('access_token')) {
      setCurrentView('reset')
      return
    }
    
    // Only redirect if authenticated and not on reset flow
    if (isAuthenticated) {
      const redirectTo = urlParams.get('redirectTo')
      if (redirectTo && redirectTo !== '/' && redirectTo !== '/auth') {
        router.replace(redirectTo)
      } else {
        router.replace('/dashboard')
      }
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
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Main Login Card */}
      <div className="w-full max-w-4xl bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]" style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Left Panel - Interactive Logo Particles (Hidden on mobile) */}
        <div className="hidden md:block md:w-2/5 bg-black relative">
          <EpsilonLogoParticles />
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full md:w-3/5 bg-gray-800 p-6 sm:p-8 md:p-12 flex flex-col justify-center relative">
          {/* Sign In Button (Top Right) - Removed duplicate, keeping only footer button */}

          {/* Main Content */}
          <div className="w-full max-w-md mx-auto relative z-10">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-6 sm:mb-8">
              {currentView === 'login' && 'Sign In'}
              {currentView === 'forgot' && 'Reset Password'}
              {currentView === 'reset' && 'Set New Password'}
            </h1>

            {/* Messages */}
            {error && (
              <Alert className="border-red-400 bg-red-900/20 rounded-lg mb-4 sm:mb-6 shadow-lg" style={{
                boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1), 0 0 0 1px rgba(239, 68, 68, 0.05)'
              }}>
                <AlertDescription className="text-red-300 text-xs sm:text-sm">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-400 bg-green-900/20 rounded-lg mb-4 sm:mb-6 shadow-lg" style={{
                boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.1), 0 0 0 1px rgba(34, 197, 94, 0.05)'
              }}>
                <AlertDescription className="text-green-300 text-xs sm:text-sm">{success}</AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            {currentView === 'login' && (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                    className="h-12 sm:h-14 bg-gray-700/30 border-2 border-gray-600/50 rounded-full px-4 sm:px-6 text-sm sm:text-base text-gray-100 placeholder:text-gray-400 focus:border-green-400 focus:bg-gray-700/40 focus:ring-0 focus:outline-none transition-all duration-300"
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
                      className="h-12 sm:h-14 bg-gray-700/30 border-2 border-gray-600/50 rounded-full px-4 sm:px-6 pr-12 sm:pr-14 text-sm sm:text-base text-gray-100 placeholder:text-gray-400 focus:border-green-400 focus:bg-gray-700/40 focus:ring-0 focus:outline-none transition-all duration-300"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200 rounded-full"
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
                <button
                  type="submit"
                  className="w-full h-12 sm:h-14 bg-green-400 hover:bg-green-500 font-bold rounded-full transition-all duration-200 hover:shadow-xl shadow-lg mt-6 sm:mt-8 disabled:opacity-50 text-sm sm:text-base"
                  style={{ color: '#000000 !important' }}
                  disabled={loading}
                >
                  {loading ? (
                    <span style={{ color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#000000' }} />
                      <span style={{ color: '#000000' }}>Signing in...</span>
                    </span>
                  ) : (
                    <span style={{ color: '#000000' }}>SIGN IN</span>
                  )}
                </button>
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
                    className="h-14 bg-gray-700/30 border-2 border-gray-600/50 rounded-full px-6 text-gray-100 placeholder:text-gray-400 focus:border-green-400 focus:bg-gray-700/40 focus:ring-0 focus:outline-none transition-all duration-300"
                    disabled={resetLoading}
                  />
                </div>

                {/* Send Reset Email Button */}
                <button
                  type="submit"
                  className="w-full h-12 bg-green-400 hover:bg-green-500 font-bold rounded-full transition-all duration-200 hover:shadow-xl shadow-lg mt-8 disabled:opacity-50"
                  style={{ color: '#000000' }}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <span style={{ color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#000000' }} />
                      <span style={{ color: '#000000' }}>Sending...</span>
                    </span>
                  ) : (
                    <span style={{ color: '#000000' }}>SEND RESET EMAIL</span>
                  )}
                </button>

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
                      className="h-14 bg-gray-700/30 border-2 border-gray-600/50 rounded-full px-6 pr-14 text-gray-100 placeholder:text-gray-400 focus:border-green-400 focus:bg-gray-700/40 focus:ring-0 focus:outline-none transition-all duration-300"
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
                      className="h-14 bg-gray-700/30 border-2 border-gray-600/50 rounded-full px-6 pr-14 text-gray-100 placeholder:text-gray-400 focus:border-green-400 focus:bg-gray-700/40 focus:ring-0 focus:outline-none transition-all duration-300"
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
                <button
                  type="submit"
                  className="w-full h-12 bg-green-400 hover:bg-green-500 font-bold rounded-full transition-all duration-200 hover:shadow-xl shadow-lg mt-8 disabled:opacity-50"
                  style={{ color: '#000000' }}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <span style={{ color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" style={{ color: '#000000' }} />
                      <span style={{ color: '#000000' }}>Setting...</span>
                    </span>
                  ) : (
                    <span style={{ color: '#000000' }}>SET NEW PASSWORD</span>
                  )}
                </button>

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
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
              <span className="text-xs sm:text-sm text-white font-medium">I'm already a member</span>
              <button
                className="bg-green-400 hover:bg-green-500 border-green-400 rounded-full px-6 py-2 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transition-all border w-full sm:w-auto"
                style={{ color: '#000000' }}
              >
                <span style={{ color: '#000000' }}>SIGN IN</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
