import { createSignal, Show, For, Suspense, createEffect, createResource } from 'solid-js';
import { A } from '@solidjs/router'; 
import { useNavigate } from "@solidjs/router";
import { apiDomain } from "../index"; 

const HomePage = () => {
    const navigate = useNavigate();

    const [firstName, setFirstName] = createSignal("");
    const [lastName, setLastName] = createSignal("");
    const [chat, setChat] = createSignal([] as string[]);
    const [showSidebar, setShowSidebar] = createSignal(false);

    let prompt = "";
    let chatId = "";
    let selectedChatId = "";

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

    const fetchChat = async (event: Event) => {
        // Prevent refresh
        event.preventDefault();

        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/chats/${selectedChatId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            setChat(await response.json());
            chatId = `/${selectedChatId}`;
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    const fetchChats = async () => {
        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/chats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            return response.json();
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    const [chats] = createResource(fetchChats)

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

        const response = await fetch(`${apiDomain}/api/v1/chats${chatId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: prompt
        });

        if (response.headers.has("location")) {
            const location = response.headers.get("location");
            chatId = location!.substring(location!.lastIndexOf("/"))
        }

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

    const openChat = () => {
        setChat([]);
        chatId = "";
    }

    return (
        <div class="flex">
            <Show when={showSidebar()}>
                <div class={`flex flex-col items-center w-1/5 h-screen border`}>
                    <button class="w-8/10 text-xl rounded-lg border cursor-pointer bg-slate-200 hover:bg-slate-100 p-2 my-6" onClick={openChat}>New Chat</button>
                    <h1 class="text-2xl font-medium mt-2">Chats</h1>
                    <hr class="w-9/10 my-2"/>
                    <For each={chats()}>
                        {(conversation) => (
                            <button class="m-2 w-9/10 rounded-lg border p-2 cursor-pointer text-left bg-slate-200 hover:bg-slate-100" onClick={fetchChat} onMouseOver={() => selectedChatId = conversation["chat_id"]}>{conversation["title"]}</button>
                        )}
                    </For>
                </div>
            </Show>
            <div class={`flex flex-col ${showSidebar() ? "w-4/5" : "w-screen"}`}>
                <Show when={chat().length === 0}>
                    <Suspense>
                        <A href="/profile">
                            <div class="flex justify-center items-center fixed top-6 right-6 rounded-full w-12 h-12 border">
                                <p>{firstName().toUpperCase()[0]}{lastName().toUpperCase()[0]}</p>
                            </div>
                        </A>
                    </Suspense>
                    <div class="flex flex-col justify-center items-center h-screen">
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
                                <div class={`w-full flex flex-col ${index() % 2 === 0 ? "items-end" : "items-start"}`}>
                                    <p class={`whitespace-pre-line w-fit border ${index() % 2 === 0 ? "bg-slate-200" : ""} rounded-lg p-4 m-4`}>{chatMessage}</p>
                                </div>
                            )}
                        </For>
                        <form class="flex flex-col fixed bottom-20" onSubmit={sendRequest}>
                            <input class="border rounded w-lg h-10" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
                        </form>
                    </div>
                </Show>
                <button class={`absolute flex items-center justify-center bottom-10 left-10 p-4 border bg-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer h-12 ${showSidebar() ? "w-32" : "w-10"}`} onClick={() => setShowSidebar(!showSidebar())}>{showSidebar() ? "Hide Chats" : ">"}</button>
            </div>
        </div>
    )
}

export default HomePage;
