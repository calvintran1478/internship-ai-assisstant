import { useState } from "react"

function App() {
    const [data, setData] = useState("");
    const [prompt, setPrompt] = useState("");

    const sendRequest = async (event: any) => {
        event.preventDefault()
        const response = await fetch("http://localhost:8000/api/v1/test", {
            method: "POST",
            body: prompt
        });

        if (response.ok) {
            setData(await response.text());
        }
    }

    return (
        <div className="flex flex-col justify-center items-center h-screen w-screen">
            <form className="flex flex-col" onSubmit={sendRequest}>
                <label className="text-3xl mb-8" >Hello! How can I help with your career?</label>
                <input className="border rounded w-lg h-10" onChange={(e) => setPrompt(e.target.value)} placeholder="Ask me anything..."></input>
            </form>
            <p>{data}</p>
        </div>
    )
}

export default App
