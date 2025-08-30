const {Server, Socket} = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.services")
const messageModel = require("../models/message.model");
const { response } = require("express");

function initSocketServer(httpServer){
    const io = new Server(httpServer, {});

     io.use(async(socket, next)=>{
        const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

        if(!cookies){
            next(new Error("Aunthentication Failed : No token provided"));
        }

        try {
            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);
            socket.user = user;
            next();
        } 
        catch (error) {
            next(new Error("Aunthentication Error : Invalid User"))
        }
    })

    io.on("connection", (socket)=>{
        socket.on("ai-message", async(messagePayload)=>{
            console.log(messagePayload);

            await messageModel.create({
                chat:messagePayload.chat,
                user:socket.user._id,
                content:messagePayload.content,
                role:"user"
            })

            const chatHistory = await messageModel.find({
                chat:messagePayload.chat
            })

            const response = await aiService.generateResponse(chatHistory.map(item =>{
                return {
                    role:item.role,
                    parts:[{text: item.content}]
                }
            }));


            await messageModel.create({
                chat:messagePayload.chat,
                user:socket.user._id,
                content:response,
                role:"model"
            })

            socket.emit('ai-response', {
                content:response,
                chat:messagePayload.chat
            })
        })
    })

   
}

module.exports = initSocketServer;