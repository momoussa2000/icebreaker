const fs = require('fs');
const OpenAI = require('openai');
const { createPrompt } = require('./prompts');

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeReport(filePath, masterClientList = null) {
  try {
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
    // Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('No valid text provided for analysis');
    }

    // Clean and limit text length to avoid token limits
    const cleanText = text.trim().substring(0, 1500);
    const prompt = createPrompt(cleanText, masterClientList);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    const analysisResult = completion.choices[0].message.content;
    
    return {
      success: true,
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
      originalLength: text.length,
      processedLength: cleanText.length
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