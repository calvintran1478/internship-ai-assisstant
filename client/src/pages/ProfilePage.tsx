import { createResource, Show, Suspense } from "solid-js";
import { useNavigate } from "@solidjs/router";

const ProfilePage = () => {
    const navigate = useNavigate();

    let resumeInput!: HTMLInputElement;

    const fetchResume = async () => {
        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch("http://localhost:8000/api/v1/resume", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const pdfBuffer = await response.arrayBuffer();
            const blob = new Blob([pdfBuffer])
            const url = window.URL.createObjectURL(blob);
            return url;
        } else if (response.status === 401) {
            navigate("/login");
        } else if (response.status === 404) {
            return "";
        }
    }

    const [resume, modifyResume] = createResource(fetchResume);

    const uploadResume = async(event: Event) => {
        event.preventDefault();

        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch("http://localhost:8000/api/v1/resume", {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` },
            body: resumeInput.files![0]
        });

        if (response.ok) {
            const blob = new Blob([resumeInput.files![0]]);
            const url = window.URL.createObjectURL(blob);
            modifyResume.mutate(url);
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    return (
        <div class="flex flex-col">
            <h1 class="text-3xl font-medium m-6">Profile Page</h1>
            <h2 class="text-2xl font-medium mx-6">Resume</h2>
            <div class="flex justify-center">
                <hr class="w-96/100 my-4"/>
            </div>
            <form onSubmit={uploadResume} class="flex items-center">
                <input class="border w-52 h-8 mx-6" ref={resumeInput} type="file" id="resume"/>
                <button class="border w-20 h-8">Upload</button>
            </form>
            <Suspense fallback={<p>Loading...</p>}>
                <Show when={resume() !== ""}>
                    <iframe class="w-[400px] h-[500px] m-6 border" src={resume()}></iframe>
                </Show>
            </Suspense>
            <div class="flex justify-center">
                <hr class="w-96/100 my-4"/>
            </div>
        </div>
    )
}

export default ProfilePage;
