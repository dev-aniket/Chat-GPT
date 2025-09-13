const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");

async function createChat(req, res) {
  const { title } = req.body;
  const user = req.user;

  const chat = await chatModel.create({
    user: user._id,
    title
  });

  res.status(201).json({
    message: "Chat created successfully",
    chat: {
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user
    }
  });
}

async function getChats(req, res) {
  const user = req.user;
  const chats = await chatModel.find({ user: user._id });

  res.status(200).json({
    message: "Chats retrieved successfully",
    chats: chats.map(chat => ({
      _id: chat._id,
      title: chat.title,
      lastActivity: chat.lastActivity,
      user: chat.user
    }))
  });
}

async function getMessages(req, res) {
  const chatId = req.params.id;
  const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });

  res.status(200).json({
    message: "Message Retrieved Successfully",
    messages: messages
  });
}

async function deleteChat(req, res) {
  try {
    const chatId = req.params.id;
    const user = req.user;

    const chat = await chatModel.findOneAndDelete({ _id: chatId, user: user._id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found or not authorized" });
    }

    await messageModel.deleteMany({ chat: chatId });

    res.status(200).json({
      message: "Chat deleted successfully",
      chatId: chatId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting chat" });
  }
}

async function updateChatTitle(req, res) {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const user = req.user;

    const chat = await chatModel.findOneAndUpdate(
      { _id: id, user: user._id },
      { title },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ message: "Chat not found or not authorized" });
    }

    res.status(200).json({
      message: "Chat title updated successfully",
      chat
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating chat title" });
  }
}

module.exports = { createChat, getChats, getMessages, deleteChat, updateChatTitle };
