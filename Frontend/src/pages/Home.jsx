import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { io } from 'socket.io-client';
import ChatMobileBar from '../components/chats/ChatMobileBar.jsx';
import ChatSidebar from '../components/chats/ChatSideBar.jsx';
import ChatMessages from '../components/chats/ChatMessages.jsx';
import ChatComposer from '../components/chats/chatComposer.jsx';
import '../components/chats/ChatLayout.css';
import {
  ensureInitialChat,
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  setChats
} from '../store/chatSlice.js';

const Home = () => {
  const dispatch = useDispatch();
  const chats = useSelector(state => state.chat.chats);
  const activeChatId = useSelector(state => state.chat.activeChatId);
  const input = useSelector(state => state.chat.input);
  const isSending = useSelector(state => state.chat.isSending);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  //  Create new chat
  const handleNewChat = async () => {
    try {
      const response = await axios.post(
        "https://atlas-jl9d.onrender.com/api/chat",
        { title: "New Chat" },
        { withCredentials: true }
      );

      setMessages([]);
      dispatch(startNewChat(response.data.chat));
      setSidebarOpen(false);
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  };

  useEffect(() => {
    axios.get("https://atlas-jl9d.onrender.com/api/chat", { withCredentials: true })
      .then(response => {
        dispatch(setChats(response.data.chats.reverse()));
      });

    const tempSocket = io("https://atlas-jl9d.onrender.com", {
      withCredentials: true,
    });

    tempSocket.on("ai-response", (messagePayload) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messagePayload.id || Date.now(),
          type: 'ai',
          content: messagePayload.content,
        }
      ]);
      dispatch(sendingFinished());
    });

    setSocket(tempSocket);
  }, []);

  // Send message + auto-update chat title if "New Chat"
const sendMessage = async () => {
  const trimmed = input.trim();
  if (!trimmed || isSending) return;

  dispatch(sendingStarted());

  let chatId = activeChatId;

  try {
    //  If no chat yet, create one first
    if (!chatId) {
      const response = await axios.post(
        "https://atlas-jl9d.onrender.com/api/chat",
        { title: trimmed.split(" ").slice(0, 5).join(" ") || "New Chat" },
        { withCredentials: true }
      );
      const newChat = response.data.chat;
      chatId = newChat._id;

      // Save new chat in Redux
      dispatch(startNewChat(newChat));
    }

    // ✅ Push user message locally
    const newMessage = { id: Date.now(), type: 'user', content: trimmed };
    setMessages((prev) => [...prev, newMessage]);
    dispatch(setInput(""));

    // ✅ Emit to backend
    socket.emit("ai-message", {
      chat: chatId,
      content: trimmed,
    });

    // ✅ If chat was "New Chat", update its title
    const activeChat = chats.find(c => c._id === chatId);
    if (activeChat && activeChat.title === "New Chat") {
      const newTitle = trimmed.split(" ").slice(0, 5).join(" ");
      await axios.patch(
        `https://atlas-jl9d.onrender.com/api/chat/${chatId}`,
        { title: newTitle },
        { withCredentials: true }
      );
      const updatedChats = chats.map(c =>
        c._id === chatId ? { ...c, title: newTitle } : c
      );
      dispatch(setChats(updatedChats));
    }

  } catch (err) {
    console.error("Error sending message:", err);
    dispatch(sendingFinished());
  }
};


  const getMessages = async (chatId) => {
    const response = await axios.get(
      `https://atlas-jl9d.onrender.com/api/chat/messages/${chatId}`,
      { withCredentials: true }
    );
    setMessages(response.data.messages.map(m => ({
      id: m._id,
      type: m.role === 'user' ? 'user' : 'ai',
      content: m.content
    })));
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`https://atlas-jl9d.onrender.com/api/chat/messages/${messageId}`, {
        withCredentials: true,
      });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  return (
    <div className="chat-layout minimal">
      <ChatMobileBar
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onNewChat={handleNewChat}
      />
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          dispatch(selectChat(id));
          setSidebarOpen(false);
          getMessages(id);
        }}
        onNewChat={handleNewChat}
        open={sidebarOpen}
      />
      <main className="chat-main" role="main">
        {messages.length === 0 && (
          <div className="chat-welcome" aria-hidden="true">
            <div className="chip">Early Preview</div>
            <h1>Atlas</h1>
            <p>
              Ask anything. Paste text, brainstorm ideas, or get quick explanations.
              Your chats stay in the sidebar so you can pick up where you left off.
            </p>
          </div>
        )}

        <ChatMessages
          messages={messages}
          isSending={isSending}
          onDeleteMessage={handleDeleteMessage}
        />

        <ChatComposer
          input={input}
          setInput={(v) => dispatch(setInput(v))}
          onSend={sendMessage}
          isSending={isSending}
        />
      </main>

      {/* Mobile view */}
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;
