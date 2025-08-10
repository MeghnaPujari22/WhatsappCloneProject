const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Enhanced Message Schema
const messageSchema = new mongoose.Schema({
  wa_id: { type: String, required: true },
  meta_msg_id: { type: String, required: true, index: true },
  text: { type: String },
  timestamp: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'failed'], 
    default: 'sent' 
  },
  direction: { 
    type: String, 
    enum: ['inbound', 'outbound'], 
    required: true 
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts'],
    required: true
  },
  user: {
    name: String,
    number: { type: String, required: true }
  },
  metadata: {
    display_phone_number: String,
    phone_number_id: String,
    messaging_product: { type: String, default: 'whatsapp' }
  },
  gs_app_id: String,
  payload_id: String,
  processing_times: {
    createdAt: Date,
    startedAt: Date,
    completedAt: Date
  },
  executed: Boolean
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema, 'processed_messages');

// Process Webhook Payloads
async function processPayloads() {
  try {
    const payloadsDir = path.join(__dirname, 'whatsapp_sample_payloads');
    const files = fs.readdirSync(payloadsDir).filter(file => file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(payloadsDir, file);
      console.log(`\nProcessing ${file}...`);

      try {
        const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (isWhatsappMessagePayload(payload)) {
          await processWhatsappPayload(payload, file);
        } else if (isStatusPayload(payload)) {
          await processStatusUpdate(payload);
        } else {
          console.log(`⚠️ Skipping unrecognized payload type in ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message);
      }
    }

    console.log('\nAll payloads processed successfully!');
  } catch (error) {
    console.error('🚨 Critical error in processor:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Payload Type Checkers
function isWhatsappMessagePayload(payload) {
  return payload?.payload_type === 'whatsapp_webhook' && 
         payload?.metaData?.entry?.[0]?.changes?.[0]?.field === 'messages';
}

function isStatusPayload(payload) {
  return payload?.status && payload?.message_id;
}

// Process WhatsApp Message Payload
async function processWhatsappPayload(payload, filename) {
  try {
    const entry = payload.metaData.entry[0];
    const change = entry.changes[0];
    const value = change.value;

    if (!value.messages || value.messages.length === 0) {
      console.log('ℹ️ No messages found in payload');
      return;
    }

    for (const message of value.messages) {
      const contact = value.contacts.find(c => c.wa_id === message.from) || {
        profile: { name: 'Unknown' },
        wa_id: message.from
      };

      const messageDoc = {
        wa_id: message.from,
        meta_msg_id: message.id,
        text: message.text?.body || `[${message.type} message]`,
        timestamp: convertTimestamp(message.timestamp),
        status: 'delivered', // Default status for incoming messages
        direction: 'inbound',
        type: message.type,
        user: {
          name: contact.profile?.name || 'Unknown',
          number: contact.wa_id
        },
        metadata: {
          display_phone_number: value.metadata?.display_phone_number,
          phone_number_id: value.metadata?.phone_number_id,
          messaging_product: value.messaging_product
        },
        gs_app_id: payload.metaData.gs_app_id,
        payload_id: payload._id,
        processing_times: {
          createdAt: new Date(payload.createdAt),
          startedAt: new Date(payload.startedAt),
          completedAt: new Date(payload.completedAt)
        },
        executed: payload.executed
      };

      await Message.create(messageDoc);
      console.log(`✅ Message ${message.id} processed for ${contact.profile?.name || contact.wa_id}`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to process WhatsApp payload ${filename}:`, error.message);
    throw error;
  }
}

// Process Status Update Payload
async function processStatusUpdate(payload) {
  try {
    const result = await Message.findOneAndUpdate(
      { meta_msg_id: payload.message_id },
      { 
        status: payload.status,
        $set: {
          'processing_times.updatedAt': new Date(),
          ...(payload.timestamp && { timestamp: convertTimestamp(payload.timestamp) })
        }
      },
      { new: true }
    );

    if (result) {
      console.log(`🔄 Status updated to ${payload.status} for message ${payload.message_id}`);
    } else {
      console.warn(`⚠️ Message not found for status update: ${payload.message_id}`);
    }
  } catch (error) {
    console.error('⚠️ Failed to process status update:', error.message);
    throw error;
  }
}

// Helper function to convert WhatsApp timestamp
function convertTimestamp(timestamp) {
  // Handle both string timestamps and Unix epoch numbers
  if (typeof timestamp === 'string') {
    return isNaN(timestamp) ? new Date(timestamp) : new Date(parseInt(timestamp) * 1000);
  }
  return new Date(timestamp * 1000); // Convert seconds to milliseconds
}

// Execute the processor
processPayloads();