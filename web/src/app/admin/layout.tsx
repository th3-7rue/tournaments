import { getServerSession } from "next-auth/next"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <a href="/admin" className="text-xl font-extrabold tracking-tight hover:text-blue-400 transition">Tournament Admin</a>
            {session && (
              <div className="hidden md:flex items-center gap-1">
                <a href="/admin" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition">🏠 Dashboard</a>
                <a href="/admin/tournaments" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition">🏆 Tornei</a>
                <a href="/admin/teams" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition">🛡️ Squadre</a>
                <a href="/admin/matches" className="px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition">⚽ Risultati</a>
              </div>
            )}
          </div>
          {session && (
            <div className="flex gap-4 items-center">
              <span className="text-slate-300 text-sm hidden sm:inline">👤 {session.user?.name}</span>
              <a href="/api/auth/signout" className="text-sm bg-red-600/90 px-4 py-1.5 rounded-md hover:bg-red-600 transition shadow-sm font-medium">Logout</a>
            </div>
          )}
        </div>
      </nav>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
