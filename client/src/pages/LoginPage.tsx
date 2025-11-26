import { createSignal, Show } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { apiDomain } from "../index";

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const handleLogin = async (event: Event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`${apiDomain}/api/v1/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: `${email()}\n${password()}`, // original backend format
        credentials: "include",
      });

      if (res.ok) {
        const token = await res.text(); 
        localStorage.setItem("accessToken", token);

        // IMPORTANT: internal router route
        navigate("/home");
      } else {
        const msg = await res.text();
        setError(msg || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-emerald-900 text-slate-50">
      
      <div class="w-full max-w-md mx-4 bg-slate-950/80 border border-slate-700/80 rounded-3xl px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        
        {/* Brand */}
        <div class="flex items-center justify-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-emerald-300 to-amber-200 shadow-lg flex items-center justify-center">
            <span class="text-lg">🎓</span>
          </div>
          <div class="leading-tight">
            <p class="font-semibold text-base">Internship & Career Assistant</p>
            <p class="text-[10px] text-slate-300">Sign in to access your AI assistant</p>
          </div>
        </div>

        <h1 class="text-xl font-semibold text-center mb-1">Welcome back</h1>
        <p class="text-xs text-slate-400 text-center mb-6">Log in to continue</p>

        <form class="space-y-4" onSubmit={handleLogin}>
          
          <div class="text-sm">
            <label class="block text-slate-300 text-xs mb-1" for="email">Email</label>
            <input
              id="email"
              type="email"
              class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:border-sky-400"
              value={email()}
              onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div class="text-sm">
            <label class="block text-slate-300 text-xs mb-1" for="password">Password</label>
            <input
              id="password"
              type="password"
              class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:border-sky-400"
              value={password()}
              onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
              required
              placeholder="••••••••"
            />
          </div>

          <Show when={error()}>
            <p class="text-xs text-red-300">{error()}</p>
          </Show>

          <button
            type="submit"
            disabled={isSubmitting()}
            class={`w-full h-10 rounded-xl text-xs font-semibold uppercase tracking-wide mt-2 shadow-lg transition-all ${
              isSubmitting()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-300 text-slate-900 hover:brightness-110"
            }`}
          >
            {isSubmitting() ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* NEW: Register Link */}
        <div class="mt-5 text-xs text-center text-slate-300">
          <span>Don't have an account? </span>
          <A href="/register" class="text-sky-300 hover:text-sky-200 underline">
            Create one
          </A>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
