const fs = require('fs');
const OpenAI = require('openai');
const { createPrompt } = require('./prompts');

require('dotenv').config();

// Check for API key and provide helpful error message
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is not set!');
  console.error('Please add your OpenAI API key to the environment variables in Vercel.');
  // Don't exit, just log the error - let the app start but API calls will fail gracefully
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
});

async function analyzeReport(filePath, masterClientList = null) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.');
    }

    // Check if file exists and read it
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const rawText = fs.readFileSync(filePath, 'utf8');
    const cleanText = rawText.trim().substring(0, 1500);
    const prompt = createPrompt(cleanText, masterClientList);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    // Parse the response and structure it
    const analysisResult = completion.choices[0].message.content;
    
    return {
      success: true,
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
      originalFile: filePath
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function analyzeTextDirectly(text, masterClientList = null) {
  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.');
    }

    // Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('No valid text provided for analysis');
    }

    // Check if the text is already a complete prompt (contains formatting and instructions)
    // If it contains "PLAN" and "DELIVERY REPORT" and "REQUIRED OUTPUT FORMAT", treat as complete prompt
    let prompt;
    if (text.includes('DISTRIBUTION PLAN') || text.includes('PLANNED CLIENTS') || text.includes('extract client names')) {
      // This is already a complete prompt from plan comparison
      prompt = text;
      console.log('🤖 Using custom comparison prompt');
    } else {
      // This is raw delivery text, create a prompt for it
      const cleanText = text.trim().substring(0, 1500);
      prompt = createPrompt(cleanText, masterClientList);
      console.log('📝 Using standard analysis prompt');
    }

    console.log('📤 SENDING TO AI:', prompt.substring(0, 200), '...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 1500 // Increase token limit for detailed responses
    });

    const analysisResult = completion.choices[0].message.content;
    
    console.log('📥 AI RESPONSE:', analysisResult.substring(0, 200), '...');
    
    return {
      success: true,
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
      originalLength: text.length,
      processedLength: prompt.length
    };
  } catch (error) {
    console.error('Analysis error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { analyzeReport, analyzeTextDirectly }; 