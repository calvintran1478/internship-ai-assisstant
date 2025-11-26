import {
  createSignal,
  Show,
  For,
  Suspense,
  createResource,
  onMount,
  createEffect,
  type Resource,
} from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { apiDomain } from "../index";

interface Conversation {
  title: string;
  chat_id: string;
}

const HomePage = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = createSignal("");
  const [lastName, setLastName] = createSignal("");

  const [chat, setChat] = createSignal<string[]>([]);
  const [showSidebar, setShowSidebar] = createSignal(true);

  // chatId = "/123" (for API path)
  const [chatId, setChatId] = createSignal("");
  // activeChatId = "123" (for sidebar highlight)
  const [activeChatId, setActiveChatId] = createSignal("");

  const [prompt, setPrompt] = createSignal("");
  const [isSending, setIsSending] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  // ---------------- Auth helper ----------------

  const ensureToken = (): string | null => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login");
      return null;
    }
    return token;
  };

  // ---------------- User name ----------------

  const getName = async () => {
    const token = ensureToken();
    if (!token) return;

    try {
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
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- Chats list ----------------

  const fetchChats = async (): Promise<Conversation[]> => {
    const token = ensureToken();
    if (!token) return [];

    try {
      const response = await fetch(`${apiDomain}/api/v1/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const conversations: Conversation[] = await response.json();
        return conversations.map((c) => ({
          ...c,
          title:
            c.title.length > 28 ? c.title.slice(0, 25).trimEnd() + "..." : c.title,
        }));
      } else if (response.status === 401) {
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
    }

    return [];
  };

  const [chats, { mutate: setChats }] =
    createResource<Conversation[]>(fetchChats);

  // ---------------- Chat operations ----------------

  const openExistingChat = async (id: string) => {
    setErrorMessage("");

    // highlight immediately
    setChatId(`/${id}`);
    setActiveChatId(id);

    const token = ensureToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiDomain}/api/v1/chats/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setChat(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        setErrorMessage("Failed to load chat. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong while loading the chat.");
    }
  };

  const startNewChat = () => {
    setChat([]);
    setChatId("");
    setActiveChatId("");
    setErrorMessage("");
  };

  const deleteChat = async (id: string) => {
    if (!confirm("Delete this chat?")) return;

    setErrorMessage("");

    const token = ensureToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiDomain}/api/v1/chats/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const currentChats = chats() ?? [];
        const idx = currentChats.findIndex((c) => c.chat_id === id);
        if (idx !== -1) {
          const newChats = [...currentChats];
          newChats.splice(idx, 1);
          setChats(newChats);
        }

        if (chatId() === `/${id}` || activeChatId() === id) {
          setChat([]);
          setChatId("");
          setActiveChatId("");
        }
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        setErrorMessage("Failed to delete chat. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong while deleting the chat.");
    }
  };

  // ---------------- Core send logic (form + suggestions) ----------------

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending()) return;

    const token = ensureToken();
    if (!token) return;

    setErrorMessage("");
    setIsSending(true);
    setPrompt("");

    const prevChat = chat();
    // add user + empty assistant
    setChat([...prevChat, trimmed, ""]);
    const updateIndex = prevChat.length + 1;

    try {
      const response = await fetch(`${apiDomain}/api/v1/chats${chatId()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: trimmed,
      });

      if (response.headers.has("location")) {
        const location = response.headers.get("location");
        const shortenedPrompt =
          trimmed.length > 28 ? trimmed.slice(0, 25).trimEnd() + "..." : trimmed;

        if (location) {
          const newChatId = location.substring(location.lastIndexOf("/")); // "/id"
          const rawId = newChatId.substring(1);

          setChatId(newChatId);
          setActiveChatId(rawId);

          const currentChats = chats() ?? [];
          const newConversation: Conversation = {
            title: shortenedPrompt,
            chat_id: rawId,
          };
          setChats([newConversation, ...currentChats]);
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          navigate("/login");
          return;
        }
        setErrorMessage("Failed to send message. Please try again.");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder("utf-8");
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunkValue = decoder.decode(value, { stream: true });
          setChat((prev) => {
            const updated = [...prev];
            const current = updated[updateIndex] ?? "";
            updated[updateIndex] = current + chunkValue;
            return updated;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong while sending your message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (event: Event) => {
    event.preventDefault();
    void sendPrompt(prompt());
  };

  // ---------------- Derived helpers ----------------

  const initials = () => {
    const f = firstName().trim();
    const l = lastName().trim();
    if (!f && !l) return "?";
    return `${f[0]?.toUpperCase() ?? ""}${l[0]?.toUpperCase() ?? ""}`;
  };

  const currentChatLabel = () => {
    if (!chatId()) return "New Internship Chat";
    const id = chatId().substring(1);
    const item = (chats() ?? []).find((c) => c.chat_id === id);
    return item ? item.title : "Ongoing Conversation";
  };

  const suggestionTopics = [
    "Improve my resume for a software internship",
    "Help me prepare for a data science interview",
    "Suggest projects to strengthen my ML profile",
    "How do I explain my internship experience?",
  ];

  const messageCount = () => Math.floor(chat().length / 2);

  const handleSuggestionClick = (text: string) => {
    void sendPrompt(text);
  };

  // ---------------- Lifecycle ----------------

  onMount(() => {
    getName();
  });

  return (
    <div class="flex h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-emerald-900 text-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        showSidebar={showSidebar}
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={startNewChat}
        onSelectChat={openExistingChat}
        onDeleteChat={deleteChat}
      />

      {/* Main area */}
      <main class="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Header */}
        <div class="flex justify-between items-center px-6 pt-5 pb-3 border-b border-slate-800/60 bg-slate-900/70 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-emerald-300 to-amber-200 shadow-lg flex items-center justify-center">
              <span class="text-xl">🎓</span>
            </div>
            <div>
              <h1 class="text-2xl font-semibold text-slate-50 flex items-center gap-2">
                Internship &amp; Career Assistant
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/20 text-emerald-100 border border-emerald-300/40">
                  AI Powered
                </span>
              </h1>
              <p class="text-xs text-slate-300">
                {currentChatLabel()}
              </p>
            </div>
          </div>
          <div class="hidden sm:flex flex-col items-end text-xs text-slate-300">
            <span> {messageCount()}</span>
          </div>
        </div>

        {/* Error bar */}
        <Show when={errorMessage()}>
          <div class="mx-6 mt-2 mb-1 px-4 py-2 rounded-md bg-red-500/10 border border-red-500/40 text-xs text-red-100 shadow-sm shrink-0">
            {errorMessage()}
          </div>
        </Show>

        {/* Central region: messages + input; outer container doesn't scroll */}
        <div class="flex-1 flex justify-center px-4 pb-4 overflow-hidden">
          <div class="w-full max-w-4xl flex flex-col h-full">
            {/* Scrollable messages area */}
            <ChatWindow
              chat={chat}
              isSending={isSending}
              suggestions={suggestionTopics}
              onSuggestionClick={handleSuggestionClick}
            />

            {/* Input bar */}
            <ChatInputBar
              prompt={prompt}
              setPrompt={setPrompt}
              isSending={isSending}
              onSubmit={handleFormSubmit}
            />
          </div>
        </div>

        {/* Profile avatar */}
        <Suspense>
          <ProfileAvatar initials={initials()} />
        </Suspense>

        {/* Sidebar toggle */}
        <SidebarToggle
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />
      </main>
    </div>
  );
};

/* ===================== Sidebar ===================== */

interface SidebarProps {
  showSidebar: () => boolean;
  chats: Resource<Conversation[] | undefined>;
  activeChatId: () => string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

const Sidebar = (props: SidebarProps) => {
  return (
    <Show when={props.showSidebar()}>
      <aside class="hidden md:flex flex-col items-center w-80 h-screen border-r border-slate-800/70 bg-slate-950/80 backdrop-blur-xl shadow-2xl">
        <button
          class="w-4/5 text-sm rounded-2xl border border-sky-400/60 cursor-pointer bg-sky-500/80 hover:bg-sky-400/80 text-slate-50 p-3 mt-6 mb-4 transition-all shadow-lg hover:-translate-y-0.5"
          onClick={props.onNewChat}
        >
          ✨ New Internship Chat
        </button>
        <h1 class="text-sm font-semibold mt-1 mb-1 text-slate-100 uppercase tracking-wide">
          Recent Chats
        </h1>
        <p class="text-[10px] text-slate-400 mb-2">
          Pick up where you left off
        </p>
        <hr class="w-11/12 my-2 border-slate-800" />

        <Suspense
          fallback={
            <p class="mt-4 text-xs text-slate-400 animate-pulse">
              Loading chats…
            </p>
          }
        >
          <Show
            when={(props.chats() ?? []).length > 0}
            fallback={
              <p class="mt-4 text-xs text-slate-400 text-center px-4">
                No chats yet.
                <br />
                Start your first conversation!
              </p>
            }
          >
            <div class="w-full flex-1 overflow-y-auto mt-2 px-3 pb-4">
              <For each={props.chats() ?? []}>
                {(conversation) => {
                  const isActive =
                    props.activeChatId() === conversation.chat_id;

                  return (
                    <div class="relative group w-full">
                      <button
                        class={`m-2 w-full rounded-2xl border p-3 cursor-pointer text-left text-xs transition-all flex justify-between items-center shadow-lg hover:-translate-y-0.5 ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-500/80 via-sky-500/80 to-blue-500/80 border-emerald-200/70 text-slate-50"
                            : "bg-slate-900/80 border-slate-700/70 text-slate-100 hover:bg-slate-800/80"
                        }`}
                        onClick={() =>
                          props.onSelectChat(conversation.chat_id)
                        }
                      >
                        <span class="truncate flex items-center gap-2">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-300/80 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
                          {conversation.title}
                        </span>
                        {isActive && (
                          <span class="ml-2 text-[9px] px-2 py-0.5 rounded-full bg-black/20">
                            Active
                          </span>
                        )}
                      </button>

                      <button
                        class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-100 border border-red-400/70 hover:bg-red-500/60 hover:border-red-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onDeleteChat(conversation.chat_id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </Suspense>
      </aside>
    </Show>
  );
};

/* ===================== Chat Window (scroll-only area) ===================== */

interface ChatWindowProps {
  chat: () => string[];
  isSending: () => boolean;
  suggestions: string[];
  onSuggestionClick: (text: string) => void;
}

const ChatWindow = (props: ChatWindowProps) => {
  let containerRef: HTMLDivElement | undefined;

  // Auto-scroll to bottom whenever chat changes
  createEffect(() => {
    props.chat(); // track dependency
    if (containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight;
    }
  });

  const hasMessages = () => props.chat().length > 0;

  const copyMessage = async (text: string) => {
    try {
      if (navigator && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      ref={(el) => (containerRef = el)}
      class="flex-1 overflow-y-auto pr-1 space-y-2"
    >
      {/* Empty state with suggestions */}
      <Show when={!hasMessages()}>
        <div class="flex flex-col justify-center items-center h-full">
          <div class="bg-slate-950/70 backdrop-blur-xl rounded-3xl border border-sky-400/40 shadow-[0_20px_60px_rgba(15,23,42,0.8)] px-8 py-8 text-center max-w-xl">
            <h2 class="text-2xl font-semibold mb-3 text-slate-50">
              Hello! 👋
            </h2>
            <p class="text-xs text-slate-300 mb-4">
              I&apos;m your AI internship &amp; career assistant. You can ask about:
            </p>
            <ul class="text-left text-xs text-slate-200 mb-5 space-y-1">
              <li>• Resume and CV improvements</li>
              <li>• Internship and placement preparation</li>
              <li>• Interview questions and answers</li>
              <li>• Project and profile building</li>
            </ul>
            <p class="text-[11px] text-slate-400 mb-3">
              Start typing below or pick a suggestion:
            </p>
            <div class="flex flex-wrap justify-center gap-2 mt-1">
              <For each={props.suggestions}>
                {(text) => (
                  <button
                    class="text-[11px] px-3 py-2 rounded-2xl border border-slate-600/80 bg-slate-900/70 hover:bg-sky-500/20 hover:border-sky-400/80 text-slate-200 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5"
                    onClick={() => props.onSuggestionClick(text)}
                  >
                    {text}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Messages when chat exists */}
      <Show when={hasMessages()}>
        <div class="mt-2 space-y-2 pb-2">
          <For each={props.chat()}>
            {(chatMessage, index) => {
              const isUser = index() % 2 === 0;
              return (
                <div
                  class={`w-full flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    class={`relative max-w-xl rounded-2xl px-4 py-3 m-1 shadow-lg border text-sm whitespace-pre-line transition-transform group ${
                      isUser
                        ? "bg-sky-500/20 border-sky-300/40 rounded-br-md"
                        : "bg-slate-950/80 border-slate-700/80 rounded-bl-md"
                    }`}
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span
                        class={`text-[10px] font-semibold uppercase tracking-wide ${
                          isUser ? "text-sky-200" : "text-emerald-200"
                        }`}
                      >
                        {isUser ? "You" : "CareerBot"}
                      </span>
                      <button
                        type="button"
                        class="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-0.5 rounded-full border border-slate-500/70 bg-slate-900/70 hover:bg-slate-800 text-slate-200"
                        onClick={() => copyMessage(chatMessage)}
                      >
                        Copy
                      </button>
                    </div>
                    <p class="text-slate-50 text-sm leading-relaxed">
                      {chatMessage}
                    </p>
                  </div>
                </div>
              );
            }}
          </For>

          {/* Typing indicator */}
          <Show when={props.isSending()}>
            <div class="w-full flex justify-start">
              <div class="max-w-xs rounded-2xl px-4 py-3 m-1 shadow-lg border bg-slate-950/80 border-slate-700/80 rounded-bl-md">
                <span class="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                  CareerBot
                </span>
                <div class="mt-1 flex gap-1 items-center">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                    style={{ "animation-delay": "0.15s" }}
                  />
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                    style={{ "animation-delay": "0.3s" }}
                  />
                </div>
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};

/* ===================== Input bar ===================== */

interface ChatInputBarProps {
  prompt: () => string;
  setPrompt: (value: string) => void;
  isSending: () => boolean;
  onSubmit: (event: Event) => void;
}

const ChatInputBar = (props: ChatInputBarProps) => {
  return (
    <form class="mt-2 shrink-0" onSubmit={props.onSubmit}>
      <div class="w-full bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.7)] px-3 py-2 flex items-center gap-2">
        <input
          class="flex-1 rounded-xl border border-transparent h-11 px-3 text-sm bg-transparent text-slate-50 focus:outline-none focus:ring-0 focus:border-sky-400 placeholder:text-slate-400"
          value={props.prompt()}
          onInput={(event) =>
            props.setPrompt((event.currentTarget as HTMLInputElement).value)
          }
          placeholder={
            props.isSending()
              ? "Waiting for response..."
              : "Ask anything about internships, resumes, or interviews..."
          }
          disabled={props.isSending()}
        />
        <button
          type="submit"
          disabled={props.isSending() || !props.prompt().trim()}
          class={`flex items-center justify-center rounded-xl px-4 h-9 text-xs font-semibold uppercase tracking-wide transition-all ${
            props.isSending() || !props.prompt().trim()
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-300 text-slate-900 hover:brightness-110 hover:-translate-y-0.5 shadow-lg"
          }`}
        >
          {props.isSending() ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
};

/* ===================== Profile avatar ===================== */

interface ProfileAvatarProps {
  initials: string;
}

const ProfileAvatar = (props: ProfileAvatarProps) => (
  <A href="/profile">
    <div class="flex justify-center items-center fixed top-5 right-5 rounded-full bg-emerald-400/90 w-11 h-11 border border-emerald-200 shadow-xl cursor-pointer hover:scale-105 transition-transform">
      <p class="font-semibold text-slate-900 text-sm">{props.initials}</p>
    </div>
  </A>
);

/* ===================== Sidebar toggle ===================== */

interface SidebarToggleProps {
  showSidebar: () => boolean;
  setShowSidebar: (value: boolean) => void;
}

const SidebarToggle = (props: SidebarToggleProps) => {
  const label = () => (props.showSidebar() ? "Hide Chats" : "Show Chats");

  return (
    <button
      class="fixed flex items-center gap-2 justify-center bottom-5 left-4 px-3 border border-slate-700/80 bg-slate-950/80 hover:bg-slate-900 rounded-xl cursor-pointer h-9 shadow-lg transition-all text-xs text-slate-100"
      onClick={() => props.setShowSidebar(!props.showSidebar())}
    >
      <span
        class={`transition-transform ${
          props.showSidebar() ? "" : "rotate-180"
        }`}
      >
        ❮
      </span>
      <span class="hidden sm:inline">{label()}</span>
    </button>
  );
};

export default HomePage;
