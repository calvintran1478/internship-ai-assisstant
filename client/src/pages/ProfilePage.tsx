import {
  createSignal,
  createResource,
  Show,
  Suspense,
  onMount,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiDomain } from "../index";
import MainLayout from "../components/MainLayout";

const ProfilePage = () => {
  const navigate = useNavigate();

  let resumeInput!: HTMLInputElement;
  let concentrationInput!: HTMLSelectElement;

  const [concentrationChanged, setConcentrationChanged] = createSignal(false);

  // --- For avatar initials ---
  const [firstName, setFirstName] = createSignal("");
  const [lastName, setLastName] = createSignal("");

  const getName = async () => {
    const token = localStorage.getItem("accessToken");
    if (token === null) {
      navigate("/login");
      return;
    }

    const response = await fetch(`${apiDomain}/api/v1/users/name`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const arr = (await response.text()).split("\n");
      setFirstName(arr[0] ?? "");
      setLastName(arr[1] ?? "");
    } else if (response.status === 401) {
      navigate("/login");
    }
  };

  const initials = () => {
    const f = firstName().trim();
    const l = lastName().trim();
    if (!f && !l) return "?";
    return `${f[0]?.toUpperCase() ?? ""}${l[0]?.toUpperCase() ?? ""}`;
  };

  // --- Concentration logic (same as before) ---

  const fetchConcentration = async () => {
    const token = localStorage.getItem("accessToken");
    if (token === null) {
      navigate("/login");
    }

    const response = await fetch(`${apiDomain}/api/v1/users/concentration`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      return response.text();
    } else if (response.status === 401) {
      navigate("/login");
    } else if (response.status === 404) {
      return "";
    }
  };

  const [concentration] = createResource(fetchConcentration);

  const updateConcentrationChanged = () => {
    setConcentrationChanged(concentrationInput.value !== concentration());
  };

  const setConcentration = async (event: Event) => {
    event.preventDefault();

    const token = localStorage.getItem("accessToken");
    if (token === null) {
      navigate("/login");
    }

    const response = await fetch(`${apiDomain}/api/v1/users/concentration`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: concentrationInput.value,
    });

    if (response.ok) {
      setConcentrationChanged(false);
    } else if (response.status === 401) {
      navigate("/login");
    }
  };

  // --- Resume logic (same as before, just made more robust) ---

  const fetchResume = async () => {
    const token = localStorage.getItem("accessToken");
    if (token === null) {
      navigate("/login");
    }

    const response = await fetch(`${apiDomain}/api/v1/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const pdfBuffer = await response.arrayBuffer();
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      return url;
    } else if (response.status === 401) {
      navigate("/login");
    } else if (response.status === 404) {
      return "";
    }
  };

  const [resume, modifyResume] = createResource(fetchResume);

  const uploadResume = async (event: Event) => {
    event.preventDefault();

    if (!resumeInput.files || resumeInput.files.length === 0) return;

    const token = localStorage.getItem("accessToken");
    if (token === null) {
      navigate("/login");
    }

    const file = resumeInput.files[0];

    const response = await fetch(`${apiDomain}/api/v1/resume`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: file,
    });

    if (response.ok) {
      // Show the uploaded file immediately in the iframe
      const blob = new Blob([file], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      modifyResume.mutate(url);
    } else if (response.status === 401) {
      navigate("/login");
    }
  };

  onMount(() => {
    void getName();
  });

  return (
    <MainLayout
      title="Profile"
      subtitle="Manage your resume and MScAC concentration."
      rightNote="Profile & MScAC details"
      initials={initials()}
    >
      <div class="space-y-8 mb-6">
        {/* Resume section */}
        <section class="bg-slate-950/70 backdrop-blur-xl rounded-3xl border border-slate-700/70 shadow-[0_20px_60px_rgba(15,23,42,0.8)] p-6 md:p-8">
          <h1 class="text-xl md:text-2xl font-semibold mb-1 text-slate-50">
            Resume
          </h1>
          <p class="text-xs text-slate-400 mb-5">
            Upload your latest resume so the assistant can tailor advice to your
            profile.
          </p>

          <form
            onSubmit={uploadResume}
            class="flex flex-col md:flex-row md:items-center gap-3 mb-5"
          >
            <input
              class="border border-slate-700/80 bg-slate-900/80 text-slate-100 text-xs rounded-xl px-3 py-2 w-full md:w-64 file:bg-slate-800 file:border-0 file:text-xs file:px-3 file:py-2 file:rounded-l-xl"
              ref={resumeInput}
              type="file"
              id="resume"
              accept="application/pdf"
            />
            <button
              class="border border-sky-400/80 bg-sky-500/80 hover:bg-sky-400/80 text-slate-50 text-xs font-semibold rounded-xl px-4 py-2 shadow-lg transition-all"
              type="submit"
            >
              Upload
            </button>
          </form>

          <Suspense fallback={<p class="text-xs text-slate-400">Loading…</p>}>
            <Show when={resume() && resume() !== ""}>
              <div class="mt-3">
                <iframe
                  title="Uploaded resume"
                  class="w-full h-[520px] border border-slate-700/80 rounded-2xl bg-slate-900/80"
                  src={resume() || ""}
                />
              </div>
            </Show>
          </Suspense>
        </section>

        {/* MScAC details section */}
        <section class="bg-slate-950/70 backdrop-blur-xl rounded-3xl border border-slate-700/70 shadow-[0_20px_60px_rgba(15,23,42,0.8)] p-6 md:p-8">
          <h2 class="text-xl md:text-2xl font-semibold mb-1 text-slate-50">
            MScAC Details
          </h2>
          <p class="text-xs text-slate-400 mb-5">
            Keep your planned concentration up to date so recommendations match
            your goals.
          </p>

          <form onSubmit={setConcentration}>
            <div class="flex flex-col md:flex-row md:items-center gap-3 text-sm">
              <label
                class="text-slate-200 text-sm md:text-base"
                for="concentration"
              >
                Concentration:
              </label>
              <Suspense
                fallback={
                  <p class="text-xs text-slate-400">Loading options…</p>
                }
              >
                <select
                  class="border border-slate-700/80 bg-slate-900/80 text-slate-100 rounded-xl h-9 px-3 text-sm"
                  ref={concentrationInput}
                  value={concentration()}
                  onChange={updateConcentrationChanged}
                  name="concentration"
                  id="concentration"
                >
                  <option value="">--Please choose an option--</option>
                  <option value="applied-mathematics">
                    Applied Mathematics
                  </option>
                  <option value="artificial-intelligence">
                    Artificial Intelligence
                  </option>
                  <option value="artificial-intelligence-healthcare">
                    Artificial Intelligence in Healthcare
                  </option>
                  <option value="computer-science">Computer Science</option>
                  <option value="data-science">Data Science</option>
                  <option value="data-science-biology">
                    Data Science for Biology
                  </option>
                  <option value="quantum-computing">Quantum Computing</option>
                </select>
              </Suspense>
              <button
                class="border border-emerald-400/80 bg-emerald-500/80 hover:bg-emerald-400/80 text-slate-50 text-xs font-semibold rounded-xl px-4 h-9 shadow-lg transition-all"
                type="submit"
              >
                Save
              </button>
              <Show when={concentrationChanged()}>
                <span class="text-xs md:text-sm text-amber-300">
                  (Unsaved changes)
                </span>
              </Show>
            </div>
          </form>
        </section>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
