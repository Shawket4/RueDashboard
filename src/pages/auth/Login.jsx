import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Eye, EyeOff, LogIn } from "lucide-react";
import { login } from "../../api/auth";
import { useAuth } from "../../store/auth.jsx";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await login({ email, password });
      signIn(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a56db 0%, #3b28cc 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-32 -right-16 w-[500px] h-[500px] rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/3 right-0 w-64 h-64 rounded-full opacity-5 bg-white" />

        <div className="relative z-10 px-12 max-w-md">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <Coffee size={26} className="text-white" />
            </div>
            <span className="text-white text-3xl font-bold tracking-tight">Rue POS</span>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4 leading-snug">
            Coffee Shop Management Made Easy
          </h2>
          <p className="text-blue-200 text-base leading-relaxed">
            Manage your branches, menus, staff, shifts, and orders — all from one powerful dashboard.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Multi-branch", desc: "Manage all locations" },
              { label: "Smart Menus",  desc: "Drinks & addons" },
              { label: "Shift Control",desc: "Cash reconciliation" },
              { label: "Permissions",  desc: "Per-user access" },
            ].map(f => (
              <div key={f.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-blue-200 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
            <Coffee size={18} className="text-white" />
          </div>
          <span className="text-gray-900 text-xl font-bold">Rue POS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 p-8 border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h1>
            <p className="text-gray-500 text-sm mb-7">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="Enter your email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="Enter your password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white pr-11"
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-sm transition disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #1a56db, #3b28cc)" }}>
                <LogIn size={16} />
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © 2026 Rue POS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}