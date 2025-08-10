const mongoose = require('mongoose');
require('dotenv').config();
const Message = require('./Message'); // adjust path as needed

async function testMessageModel() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testMessage = {
      wa_id: 'test123',
      meta_msg_id: 'unique123_' + Date.now(), // unique each test
      text: 'Hello, this is a test message',
      timestamp: new Date(),
      direction: 'inbound',
      user: {
        name: 'Test User',
        number: '1234567890'
      }
    };

    // Test CREATE
    const createdMessage = await Message.create(testMessage);
    console.log('✅ Message created:', createdMessage);

    // Test READ
    const foundMessage = await Message.findOne({ meta_msg_id: testMessage.meta_msg_id });
    console.log('✅ Message found:', foundMessage);

    // Test UPDATE
    const updatedMessage = await Message.findOneAndUpdate(
      { meta_msg_id: testMessage.meta_msg_id },
      { status: 'delivered' },
      { new: true }
    );
    console.log('✅ Message updated:', updatedMessage);

    // Test DELETE
    const deletedMessage = await Message.findOneAndDelete({ meta_msg_id: testMessage.meta_msg_id });
    console.log('✅ Message deleted:', deletedMessage);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

testMessageModel();