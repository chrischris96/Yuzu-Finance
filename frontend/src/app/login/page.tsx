"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";



export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      router.push("/"); // Go to home/dashboard
    } else {
      setError("Invalid credentials.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <form className="p-8 bg-gray-100 rounded-xl shadow-xl w-96 space-y-4" onSubmit={handleLogin}>
        <h1 className="text-2xl font-bold text-center">Login to Yuzu</h1>
        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          required
        />
        <button className="w-full py-2 rounded bg-gradient-to-tr from-pink-500 via-blue-500 to-violet-500 text-white font-bold">
          Login
        </button>
        {error && <div className="text-red-500 text-center">{error}</div>}
      </form>
    </div>
  );
}
