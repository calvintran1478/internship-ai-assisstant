import { createSignal, Show, For, Suspense, createEffect, createResource } from 'solid-js';
import { A } from '@solidjs/router'; 
import { useNavigate } from "@solidjs/router";
import { apiDomain } from "../index"; 

interface Conversation {
    title: string,
    chat_id: string
}

const HomePage = () => {
    const navigate = useNavigate();

    const [firstName, setFirstName] = createSignal("");
    const [lastName, setLastName] = createSignal("");
    const [chat, setChat] = createSignal([] as string[]);
    const [showSidebar, setShowSidebar] = createSignal(false);

    const [chatId, setChatId] = createSignal("");
    const [selectedChatId, setSelectedChatId] = createSignal("");
    const [pendingDeleteChatId, setPendingDeleteChatId] = createSignal("");

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

    const fetchChat = async (event: Event) => {
        setPendingDeleteChatId("");

        // Prevent refresh
        event.preventDefault();

        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/chats/${selectedChatId()}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            setChat(await response.json());
            setChatId(`/${selectedChatId()}`);
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
            const conversations = await response.json();
            for (let i = 0; i < conversations.length; i++) {
                if (conversations[i]["title"].length > 24) {
                    conversations[i]["title"] = conversations[i]["title"].slice(0, 21) + "..."
                }
            }
            return conversations;
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    const [chats, modifyChats] = createResource(fetchChats)

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

        const response = await fetch(`${apiDomain}/api/v1/chats${chatId()}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: prompt
        });

        if (response.headers.has("location")) {
            const location = response.headers.get("location");
            const shortenedPrompt = prompt.length > 24 ? prompt.slice(0, 21) + "..." : prompt;
            setChatId(location!.substring(location!.lastIndexOf("/")));
            modifyChats.mutate([{"title": shortenedPrompt, "chat_id": chatId().substring(1)}, ...chats()]);
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

    const deleteChat = async (event: Event) => {
        // Prevent refresh
        event.preventDefault();

        const token = localStorage.getItem("accessToken");
        if (token === null) {
            navigate("/login");
        }

        const response = await fetch(`${apiDomain}/api/v1/chats/${pendingDeleteChatId()}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const newChats = [...chats()];
            newChats.splice(chats().findIndex((conversation: Conversation) => conversation["chat_id"] === pendingDeleteChatId()), 1);
            modifyChats.mutate(newChats);

            setChat([]);
            setChatId("");
            setSelectedChatId("");
            setPendingDeleteChatId("");
        } else if (response.status === 401) {
            navigate("/login");
        }
    }

    const openChat = () => {
        setChat([]);
        setChatId("");
        setPendingDeleteChatId("");
    }

    const logout = () => {
        localStorage.removeItem("accessToken");
        navigate("/login");
    }

    return (
        <div class="flex">
            <Show when={showSidebar()}>
                <div class={"sticky top-0 flex flex-col items-center w-84 h-screen border"}>
                    <button class="w-8/10 text-xl rounded-lg border cursor-pointer bg-slate-200 hover:bg-slate-100 p-2 my-6" onClick={openChat}>New Chat</button>
                    <h1 class="text-2xl font-medium mt-2">Chats</h1>
                    <hr class="w-9/10 my-2"/>
                    <For each={chats()}>
                        {(conversation) => (
                            <div class="relative w-9/10 " onMouseOver={() => setSelectedChatId(conversation["chat_id"])} onMouseLeave={() => setSelectedChatId("")}>
                                <button class={`m-2 w-9/10 rounded-lg border p-2 cursor-pointer text-left ${chatId() === `/${conversation["chat_id"]}` ? "bg-teal-200 hover:bg-teal-100" : "bg-slate-200 hover:bg-slate-100"}`} onClick={fetchChat}>{conversation["title"]}</button>
                                <Show when={selectedChatId() === conversation["chat_id"]}>
                                    <button class="absolute flex items-center justify-center border rounded-lg right-5 top-3 p-1 w-8 h-8 cursor-pointer" onClick={() => setPendingDeleteChatId(pendingDeleteChatId() !== conversation["chat_id"] ? conversation["chat_id"] : "")}>...</button>
                                </Show>
                                <Show when={pendingDeleteChatId() === conversation["chat_id"]}>
                                    <button class="absolute flex items-center justify-center border rounded-lg bg-white cursor-pointer left-56 top-3 p-1" onClick={deleteChat}>Delete?</button>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <div class={`flex flex-col w-full`}>
                <Show when={chat().length === 0}>
                    <div class="flex flex-col justify-center items-center h-screen">
                        <form class="flex flex-col items-center" onSubmit={sendRequest}>
                            <label class="text-3xl mb-8">Hello! How can I help with your career?</label>
                            <input class="border rounded w-lg h-10 p-1" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
                        </form>
                    </div>
                    <button class="absolute flex items-center justify-center border cursor-pointer bg-slate-200 hover:bg-slate-100 rounded-lg p-2 right-10 bottom-10" onClick={logout}>Logout</button>
                </Show>
                <Show when={chat().length !== 0}>
                    <div class="flex flex-col">
                        <div class="mt-20 mb-44">
                            <For each={chat()}>
                                {(chatMessage, index) => (
                                    <div class={`w-full flex flex-col ${index() % 2 === 0 ? "items-end" : "items-start"}`}>
                                        <p class={`whitespace-pre-line w-fit border ${index() % 2 === 0 ? "bg-slate-200" : ""} rounded-lg p-4 m-4`}>{chatMessage}</p>
                                    </div>
                                )}
                            </For>
                        </div>
                        <div class="flex flex-col items-center">
                            <form class="flex flex-col fixed border bottom-20 rounded-lg bg-slate-100" onSubmit={sendRequest}>
                                <input class="rounded border w-lg h-10 m-2 p-1 rounded-lg bg-white" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
                            </form>
                        </div>
                    </div>
                </Show>
                <Suspense>
                    <A href="/profile">
                        <div class="flex justify-center items-center fixed top-6 right-6 rounded-full bg-teal-200 w-12 h-12 border">
                            <p>{firstName().toUpperCase()[0]}{lastName().toUpperCase()[0]}</p>
                        </div>
                    </A>
                </Suspense>
            </div>
            <button class={`fixed flex items-center justify-center bottom-10 left-10 p-4 border bg-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer h-12 ${showSidebar() ? "w-40" : "w-10"}`} onClick={() => setShowSidebar(!showSidebar())}>{showSidebar() ? "Hide Chats" : ">"}</button>
        </div>
    )
}

export default HomePage;
