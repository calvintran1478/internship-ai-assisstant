import { createSignal, Show, For, Suspense, createEffect } from 'solid-js';
import { A } from '@solidjs/router'; 
import { useNavigate } from "@solidjs/router";
import { apiDomain } from "../index"; 

const HomePage = () => {
    const navigate = useNavigate();

    const [firstName, setFirstName] = createSignal("");
    const [lastName, setLastName] = createSignal("");
    const [chat, setChat] = createSignal([] as string[]);

    let prompt = "";

    const getName = async () => {
        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/users/name`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const arr = (await response.text()).split("\n")
            setFirstName(arr[0])
            setLastName(arr[1])
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    createEffect(() => {
        getName()
    })

    const sendRequest = async (event: Event) => {
        event.preventDefault();
        document.querySelector("form")!.reset();
        setChat(chat().concat([prompt, ""]));

        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/chat`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: prompt
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder("utf-8");
        const updateIndex = chat().length - 1;
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
                const chunkValue = decoder.decode(value, { stream: true });
                const updatedChat = [...chat()];
                updatedChat[updateIndex] = updatedChat[updateIndex] + chunkValue;
                setChat(updatedChat);
            }
        }
    }

    return (
        <div>
            <Show when={chat().length === 0}>
                <Suspense>
                    <A href="/profile">
                        <div class="flex justify-center items-center fixed top-6 right-6 rounded-full w-12 h-12 border">
                            <p>{firstName().toUpperCase()[0]}{lastName().toUpperCase()[0]}</p>
                        </div>
                    </A>
                </Suspense>
                <div class="flex flex-col justify-center items-center h-screen w-screen">
                    <form class="flex flex-col" onSubmit={sendRequest}>
                        <label class="text-3xl mb-8">Hello! How can I help with your career?</label>
                        <input class="border rounded w-lg h-10" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
                    </form>
                </div>
            </Show>
            <Show when={chat().length !== 0}>
                <div class="flex flex-col items-center">
                    <For each={chat()}>
                        {(chatMessage, index) => (
                            <p style={`top: ${index() * 80}px`} class={`fixed border rounded p-4 m-4 ${index() % 2 === 0 ? "right-0" : "left-0"}`}>{chatMessage}</p>
                        )}
                    </For>
                    <form class="flex flex-col fixed bottom-20" onSubmit={sendRequest}>
                        <input class="border rounded w-lg h-10" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
                    </form>
                </div>
            </Show>
        </div>
    )
}

export default HomePage;
