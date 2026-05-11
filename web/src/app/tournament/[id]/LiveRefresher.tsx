"use client"
import { useEffect } from "react"
import { io } from "socket.io-client"
import { useRouter } from "next/navigation"

export default function LiveRefresher() {
  const router = useRouter()

  useEffect(() => {
    // In produzione dovrebbe puntare all'URL reale (su Vercel ecc non funziona così facilmente, 
    // ma dato che siamo in un container custom con server.js, window.location.origin è perfetto)
    const socket = io(window.location.origin)
    
    socket.on("score-updated", () => {
      console.log("Score update received! Refreshing page...")
      router.refresh()
    })

    return () => {
      socket.disconnect()
    }
  }, [router])

  return null
}
