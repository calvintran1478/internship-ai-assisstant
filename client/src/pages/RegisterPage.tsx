import { createSignal, Show } from "solid-js";
import { useNavigate, A } from "@solidjs/router";
import { apiDomain } from "../index";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [firstName, setFirstName] = createSignal("");
  const [lastName, setLastName] = createSignal("");

  const [registerLoading, setRegisterLoading] = createSignal(false);
  const [registerError, setRegisterError] = createSignal("");

  const registerUser = async (event: Event) => {
    event.preventDefault();

    setRegisterLoading(true);
    setRegisterError("");

    try {
      const response = await fetch(`${apiDomain}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        // ✅ original backend format
        body: `${email()}\n${password()}\n${firstName()}\n${lastName()}`,
      });

      if (response.ok) {
        // after successful registration go to login
        navigate("/login");
      } else {
        const msg = await response.text();
        setRegisterError(msg || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setRegisterError("Network error. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div class="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-sky-950 to-emerald-900 text-slate-50">
      {/* Centered register card with brand inside (no overlap) */}
      <div class="w-full max-w-xl mx-4 bg-slate-950/80 border border-slate-700/80 rounded-3xl px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.8)] backdrop-blur-xl">
        {/* Brand header – same style as login */}
        <div class="flex items-center justify-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-400 via-emerald-300 to-amber-200 shadow-lg flex items-center justify-center">
            <span class="text-lg">🎓</span>
          </div>
          <div class="leading-tight">
            <p class="font-semibold text-base">
              Internship &amp; Career Assistant
            </p>
            <p class="text-[10px] text-slate-300">
              Create your account to get started
            </p>
          </div>
        </div>

        <h1 class="text-2xl font-semibold mb-2 text-center text-slate-50">
          Create your account
        </h1>
        <p class="text-xs text-slate-400 mb-6 text-center">
          Sign up to personalize internship recommendations and AI guidance.
        </p>

        <form class="space-y-4" onSubmit={registerUser}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label
                class="block text-slate-300 text-xs mb-1"
                for="firstName"
              >
                First name
              </label>
              <input
                id="firstName"
                class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:outline-none focus:border-sky-400 placeholder:text-slate-500"
                value={firstName()}
                onInput={(e) =>
                  setFirstName((e.currentTarget as HTMLInputElement).value)
                }
                required
                placeholder="Abhinav"
              />
            </div>
            <div>
              <label
                class="block text-slate-300 text-xs mb-1"
                for="lastName"
              >
                Last name
              </label>
              <input
                id="lastName"
                class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:outline-none focus:border-sky-400 placeholder:text-slate-500"
                value={lastName()}
                onInput={(e) =>
                  setLastName((e.currentTarget as HTMLInputElement).value)
                }
                required
                placeholder="Shankar"
              />
            </div>
          </div>

          <div class="text-sm">
            <label class="block text-slate-300 text-xs mb-1" for="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:outline-none focus:border-sky-400 placeholder:text-slate-500"
              value={email()}
              onInput={(e) =>
                setEmail((e.currentTarget as HTMLInputElement).value)
              }
              required
              placeholder="you@example.com"
            />
          </div>

          <div class="text-sm">
            <label
              class="block text-slate-300 text-xs mb-1"
              for="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-50 text-sm focus:outline-none focus:border-sky-400 placeholder:text-slate-500"
              value={password()}
              onInput={(e) =>
                setPassword((e.currentTarget as HTMLInputElement).value)
              }
              required
              minLength={8}
              maxLength={71}
              placeholder="At least 8 characters"
            />
          </div>

          <Show when={registerError()}>
            <p class="text-xs text-red-300">{registerError()}</p>
          </Show>

          <button
            type="submit"
            disabled={registerLoading()}
            class={`w-full h-10 rounded-xl text-xs font-semibold uppercase tracking-wide mt-2 shadow-lg transition-all ${
              registerLoading()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-300 text-slate-900 hover:brightness-110"
            }`}
          >
            {registerLoading() ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <div class="mt-4 text-xs text-slate-300 text-center">
          <span>Already have an account? </span>
          <A href="/login" class="text-sky-300 hover:text-sky-200 underline">
            Login
          </A>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
