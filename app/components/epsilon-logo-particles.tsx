'use client'

import React, { useRef, useEffect, useState } from 'react'

// Epsilon logo particle animation with interactive effects
export default function EpsilonLogoParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Load the actual Epsilon logo SVG
    const img = new window.Image()
    img.onload = () => {
      initParticles()
    }
    img.src = '/Epsilologo.svg'

    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    updateCanvasSize()

    let particles: {
      x: number
      y: number
      baseX: number
      baseY: number
      size: number
      color: string
      scatteredColor: string
      life: number
    }[] = []

    let textImageData: ImageData | null = null

    function createTextImage() {
      if (!ctx || !canvas || !img.complete) return 0
      
      // Ensure canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('Canvas has zero dimensions, skipping particle initialization')
        return 0
      }

      ctx.fillStyle = 'white'
      ctx.save()
      
      // Center the logo - make it bigger
      const logoSize = Math.min(canvas.width * 0.75, canvas.height * 0.75, 400)
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2 - 60 // Move up to make room for text
      
      // Draw the actual Epsilon logo SVG
      ctx.drawImage(
        img,
        centerX - logoSize / 2,
        centerY - logoSize / 2,
        logoSize,
        logoSize
      )

      // Draw the "Epsilo" text below the logo - make it bigger and clearer
      ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'white'
      
      // Add text stroke for better clarity
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 3
      
      const textY = centerY + logoSize / 2 + 100 // Position below logo
      ctx.strokeText('Epsilon', centerX, textY) // Draw stroke first
      ctx.fillText('Epsilon', centerX, textY) // Then draw fill

      textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      return logoSize / 400 // Return scale factor
    }

    function createParticle(scale: number) {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)

        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          // Determine if this particle is from the logo or text based on position
          const isTextParticle = y > canvas.height / 2 + 120 // Text is positioned lower
          
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: isTextParticle ? Math.random() * 2 + 1.5 : Math.random() * 2.5 + 0.5,
            color: 'white', 
            scatteredColor: isTextParticle ? '#22c55e' : '#22c55e', // Green for both
            life: Math.random() * 120 + 60
          }
        }
      }

      return null
    }

    function createInitialParticles(scale: number) {
      if (!canvas) return
      
      const baseParticleCount = 8000 // Increased for better logo + text coverage
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (800 * 600)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle(scale)
        if (particle) particles.push(particle)
      }
    }

    function initParticles() {
      if (!img.complete) return
      
      const scale = createTextImage()
      particles = []
      createInitialParticles(scale)
      animate(scale)
    }

    let animationFrameId: number

    function animate(scale: number) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 150

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !('ontouchstart' in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 40
          const moveY = Math.sin(angle) * force * 40
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY
          
          ctx.fillStyle = p.scatteredColor
        } else {
          p.x += (p.baseX - p.x) * 0.08
          p.y += (p.baseY - p.y) * 0.08
          ctx.fillStyle = 'white' 
        }

        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle(scale)
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 8000
      const targetParticleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (800 * 600)))
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle(scale)
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    const handleResize = () => {
      updateCanvasSize()
      if (img.complete) {
        initParticles()
      }
    }

    const handleMove = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect()
      mousePositionRef.current = { 
        x: x - rect.left, 
        y: y - rect.top 
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!('ontouchstart' in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label="Interactive Epsilon logo particle effect"
      />
      {/* Grid pattern overlay - bigger dots */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(34, 197, 94, 0.3) 2px, transparent 2px),
            radial-gradient(circle, rgba(34, 197, 94, 0.3) 2px, transparent 2px)
          `,
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0, 15px 15px'
        }}
      />
      
    </div>
  )
}
