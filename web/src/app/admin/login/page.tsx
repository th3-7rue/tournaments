"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Credenziali non valide. Se è il primo accesso, usa admin/admin o verifica il db.");
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-slate-800 tracking-tight">Accesso Admin</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center border border-red-100">{error}</div>}
        <div className="mb-5">
          <label className="block text-slate-600 mb-2 font-medium text-sm">Username</label>
          <input 
            type="text" 
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
          />
        </div>
        <div className="mb-8">
          <label className="block text-slate-600 mb-2 font-medium text-sm">Password</label>
          <input 
            type="password" 
            className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md">
          Accedi alla Dashboard
        </button>
      </form>
    </div>
  );
}
