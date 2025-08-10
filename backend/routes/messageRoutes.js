const express = require('express');
const Message = require('../models/Message');

const router = express.Router();

module.exports = (io) => {
  // Get all conversations
  router.get('/conversations', async (req, res) => {
    try {
      const conversations = await Message.aggregate([
        {
          $group: {
            _id: "$wa_id",
            lastMessage: { $last: "$$ROOT" },
            user: { $first: "$user" }
          }
        },
        { $sort: { "lastMessage.timestamp": -1 } }
      ]);
      res.json({ data: { conversations } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get messages for a specific chat
  router.get('/:wa_id', async (req, res) => {
    try {
      const messages = await Message.find({ wa_id: req.params.wa_id })
        .sort({ timestamp: 1 });
      res.json({ data: { messages } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Send new message
  router.post('/', async (req, res) => {
    try {
      const { wa_id, text } = req.body;
      
      const newMessage = new Message({
        wa_id,
        meta_msg_id: `web-${Date.now()}`,
        text,
        timestamp: new Date(),
        status: 'sent',
        direction: 'outbound',
        user: {
          name: 'You',
          number: wa_id
        }
      });

      const savedMessage = await newMessage.save();
      io.emit('new_message', savedMessage);
      res.status(201).json({ data: { message: savedMessage } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
