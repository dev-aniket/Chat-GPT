import React from 'react';
import './ChatSidebar.css';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setChats } from '../../store/chatSlice.js';
import { Trash2 } from 'lucide-react';

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onNewChat, open }) => {
  const dispatch = useDispatch();

  const handleDeleteChat = async (chatId) => {
    try {
      await axios.delete(`http://localhost:3000/api/chat/${chatId}`, {
        withCredentials: true,
      });

      // update Redux instead of reloading
      const updatedChats = chats.filter((c) => c._id !== chatId);
      dispatch(setChats(updatedChats));
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  return (
    <aside className={"chat-sidebar " + (open ? 'open' : '')} aria-label="Previous chats">
      <div className="sidebar-header">
        <h2>Chats</h2>
        <button className="small-btn" onClick={onNewChat}>New</button>
      </div>

      <nav className="chat-list" aria-live="polite">
        {chats.map(c => (
          <div
            key={c._id}
            className={`chat-list-item ${c._id === activeChatId ? 'active' : ''}`}
          >
            <div className="chat-row">
              {/* Chat title */}
              <button
                className="chat-title-btn"
                onClick={() => onSelectChat(c._id)}
              >
                {c.title || "Untitled Chat"}
              </button>

              {/* Trash icon */}
              <button
                className="delete-chat-btn"
                aria-label="Delete chat"
                onClick={() => handleDeleteChat(c._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {chats.length === 0 && <p className="empty-hint">No chats yet.</p>}
      </nav>
    </aside>
  );
};

export default ChatSidebar;
