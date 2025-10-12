import { createSignal } from 'solid-js'

function App() {
    const [data, setData] = createSignal("");
    let prompt = "";

    const sendRequest = async (event: Event) => {
        event.preventDefault();
        const response = await fetch("http://localhost:8000/api/v1/chat", {
            method: "POST",
            body: prompt
        });

        if (response.ok) {
            setData(await response.text());
        }
    }

    return (
        <div class="flex flex-col justify-center items-center h-screen w-screen">
            <form class="flex flex-col" onSubmit={sendRequest}>
                <label class="text-3xl mb-8">Hello! How can I help with your career?</label>
                <input class="border rounded w-lg h-10" onChange={(event) => {prompt = event.target.value}} placeholder="Ask me anything..."/>
            </form>
            <p>{data()}</p>
        </div>
    )
}

export default App
