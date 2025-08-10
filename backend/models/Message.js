const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  wa_id: { type: String, required: true },
  meta_msg_id: { type: String, required: true, unique: true },
  text: String,
  timestamp: { type: Date },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'], 
    default: 'sent' 
  },
  direction: { 
    type: String, 
    enum: ['inbound', 'outbound'], 
    required: true 
  },
  user: {
    name: String,
    number: { type: String, required: true }
  },
  metadata: Object
}, { timestamps: true });

// Model points to "processed_messages" collection in "whatsapp" DB
module.exports = mongoose.model('ProcessedMessage', messageSchema, 'processed_messages');
