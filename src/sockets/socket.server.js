const {Server, Socket} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.service")
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");



function initSocketServer(httpServer){
    const io = new Server(httpServer, {});

    io.use(async (socket, next) => {
    try {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
        const token = cookies.token; // Get the token

        
        if (!token) {
            return next(new Error("Authentication Error: No token provided"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);

       
        if (!user) {
            return next(new Error("Authentication Error: User not found"));
        }

        socket.user = user;
        next();

    } catch (error) {
        
        next(new Error("Authentication Error: Invalid Token"));
    }
  });

    io.on("connection", (socket)=>{
        socket.on("ai-message", async(messagePayload)=>{

            const message = await messageModel.create({
                chat:messagePayload.chat,
                user:socket.user._id,
                content:messagePayload.content,
                role:"user"
            })

            const vectors = await aiService.generateVector(messagePayload.content);

            const memory = await queryMemory({
                queryVector:vectors,
                limit:3,
                metadata:{
                    user:socket.user._id
                }
            })
            
            await createMemory({
                vectors,
                messageId:message._id,
                metadata:{
                    chat:messagePayload.chat,
                    user:socket.user._id,
                    text:messagePayload.content
                }
            })

            console.log(memory)

            const chatHistory = await messageModel.find({
                chat:messagePayload.chat
            })

            const stm = chatHistory.map(item =>{
                return {
                    role:item.role,
                    parts:[{text: item.content}]
                }
            })

            const ltm = [{
                role:"user",
                parts: [{
                    text: `
                        these are some previous messages from the chat, use them to generate response

                        ${memory.map(item => item.metadata.text).join("\n")}
                    `
                }]
            }]

            console.log(ltm, stm)

            const response = await aiService.generateResponse([...ltm, ...stm]);
          

            const responseMessage = await messageModel.create({
                chat:messagePayload.chat,
                user:socket.user._id,
                content:response,
                role:"model"
            })

            const responseVectors = await aiService.generateVector(response);

            await createMemory({
                vectors:responseVectors,
                messageId:responseMessage._id,
                metadata:{
                    chat:messagePayload.chat,
                    user:socket.user._id,
                    text:response
                }
            })

            socket.emit('ai-response', {
                content:response,
                chat:messagePayload.chat
            })
        })
    })

   
}

module.exports = initSocketServer;