import { createSignal, Show, For } from 'solid-js'

function App() {
    const [chat, setChat] = createSignal([] as string[]);
    let prompt = "";

    const sendRequest = async (event: Event) => {
        event.preventDefault();
        const updatedChat = [...chat()];
        updatedChat.push(prompt);

        const response = await fetch("http://localhost:8000/api/v1/chat", {
            method: "POST",
            body: prompt
        });

        if (response.ok) {
            updatedChat.push(await response.text());
            setChat(updatedChat);
        }
    }

    return (
        <div>
            <Show when={chat().length === 0}>
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

export default App
