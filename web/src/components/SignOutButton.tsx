"use client"

import { signOut } from "next-auth/react"
import React from "react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
      className="text-sm bg-red-600/90 px-4 py-1.5 rounded-md hover:bg-red-600 transition shadow-sm font-medium"
    >
      Logout
    </button>
  )
}
