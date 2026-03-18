import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Shield, Eye, EyeOff, LogIn, Lock, User, ClipboardList } from 'lucide-react';

const DEMO_USERS = [
  { label: 'Administrador', sublabel: 'Jefe / Coordinador', color: '#006341', bg: '#dcfce7', email: 'admin@imss.gob.mx' },
  { label: 'Usuario Maestro', sublabel: 'Super Administrador', color: '#7c3aed', bg: '#ede9fe', email: 'super@imss.gob.mx' },
  { label: 'Usuario Común', sublabel: 'Técnico / Auditor', color: '#2563eb', bg: '#dbeafe', email: 'usuario@imss.gob.mx' },
];

export default function Login() {
  const { setIsLoggedIn } = useApp();
  const [email, setEmail] = useState('admin@imss.gob.mx');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e?.preventDefault();
    setLoading(true);
    // Simulate a short "auth" delay for realism
    setTimeout(() => {
      setIsLoggedIn(true);
    }, 900);
  };

  const selectDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('••••••••');
  };

  return (
    <div className="min-h-screen flex fade-in" style={{ background: 'linear-gradient(135deg, #00472e 0%, #006341 50%, #004d32 100%)' }}>

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Top logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">IMSS</p>
              <p className="text-green-200 text-sm font-medium">Instituto Mexicano del Seguro Social</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Ecosistema de<br />
            <span style={{ color: '#f0c040' }}>Gestión de Activos</span>
          </h1>
          <p className="text-green-100/80 text-lg leading-relaxed">
            Plataforma institucional para el control, seguimiento y auditoría del patrimonio informático de la Delegación Nayarit.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: '📦', text: 'Control completo del inventario de bienes' },
            { icon: '📱', text: 'Escaneo QR desde dispositivos móviles' },
            { icon: '🔒', text: 'Auditoría y bitácora de accesos' },
            { icon: '📋', text: 'Generación de formatos oficiales en PDF' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{f.icon}</span>
              <p className="text-green-100/80 text-sm">{f.text}</p>
            </div>
          ))}

          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-yellow-300" />
              <span className="text-xs font-semibold" style={{ color: '#f0c040' }}>Ecosistema IMSS v2.4.1</span>
            </div>
            <p className="text-green-200/40 text-xs mt-1">
              Bajo normativa MAAGTIC-SI · Ley Federal de Transparencia
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">IMSS — Gestión de Activos</p>
              <p className="text-green-200 text-xs">Delegación Nayarit</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                <Shield size={22} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
              <p className="text-gray-400 text-sm mt-1">
                Accede con tus credenciales institucionales IMSS
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 mx-8" />

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Correo Institucional
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@imss.gob.mx"
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-green-500 transition-all bg-gray-50 focus:bg-white"
                    style={{ '--tw-ring-color': 'rgba(0,99,65,0.3)' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Contraseña
                  </label>
                  <button type="button" className="text-xs font-medium" style={{ color: '#006341' }}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-green-500 transition-all bg-gray-50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #006341, #004d32)', boxShadow: '0 4px 15px rgba(0,99,65,0.35)' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verificando acceso...
                  </>
                ) : (
                  <>
                    <LogIn size={17} />
                    Ingresar al Sistema
                  </>
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="px-8 pb-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400 font-medium">Acceso rápido (demo)</span>
                </div>
              </div>

              <div className="space-y-2">
                {DEMO_USERS.map((u, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDemo(u.email)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-all text-left hover:border-gray-300 ${
                      email === u.email ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: u.bg }}>
                      <Shield size={13} style={{ color: u.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{u.label}</p>
                      <p className="text-xs text-gray-400 leading-tight">{u.email}</p>
                    </div>
                    {email === u.email && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#006341' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-green-200/40 text-xs mt-6">
            © 2026 IMSS — DGSTI · v2.4.1 · Delegación Nayarit
          </p>
        </div>
      </div>
    </div>
  );
}
