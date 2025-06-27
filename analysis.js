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

// Enhanced prompt for detailed plan vs delivery comparison
function createDetailedComparisonPrompt(planText, deliveryText, masterClientList = null) {
  return `
You are analyzing a distribution plan vs actual delivery report for an ice cream distribution business in Egypt.

📋 DISTRIBUTION PLAN:
${planText}

📦 ACTUAL DELIVERY REPORT:
${deliveryText}

🎯 REQUIRED OUTPUT FORMAT:
Generate a detailed comparison exactly like this structure:

📊 Plan vs Actual Delivery Comparison
📅 Plan Date: [Extract from plan] | Delivery Date: [Extract from delivery]

✅ DELIVERED CLIENTS ([count]):
${masterClientList ? '• [Client Name] 🧊 - From Plan' : '• [Client Name] - From Plan'}
  Planned: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty]
  Delivered: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty] (Variance: [differences])

❌ MISSED CLIENTS ([count]):
• [Client Name] 🧊 - From Plan
  Planned: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty] - NOT DELIVERED

🆕 UNPLANNED DELIVERIES ([count]):
• [Client Name] - Not in Plan
  Delivered: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty]

📈 SUMMARY:
• Total planned clients: [count]
• Successfully delivered: [count]
• Missed deliveries: [count] 
• Unplanned deliveries: [count]
• Fulfillment rate: [percentage]%
• Planned totals: 3KG:[total], 5KG:[total], V00:[total], Cup:[total]
• Delivered totals: 3KG:[total], 5KG:[total], V00:[total], Cup:[total]

🔍 ANALYSIS RULES:
1. Extract exact product quantities (3KG, 5KG, V00/فو, Cup/كوب) for each client
2. Handle Arabic text variations and abbreviations (ص = 3KG, ك = 5KG)
3. Match client names flexibly (handle slight variations in spelling)
4. Calculate exact variances: show +/- differences for each product type
5. Show freezer clients with 🧊 emoji if masterClientList indicates they have freezers
6. For Late Orders in plans, mark them but include in comparison
7. Handle mixed language text (Arabic + English)
8. Parse compound delivery formats like "سبوتشو أركان - 12ص + 8ك + 2كوب"

Extract dates from headers or text patterns. If no clear dates, use "Date not specified".
Be precise with numbers - don't approximate or round. Show exact quantities delivered vs planned.
`;
}

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

// Enhanced function for detailed plan vs delivery comparison
async function analyzePlanVsDeliveryDetailed(planText, deliveryText, masterClientList = null) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.');
    }

    if (!planText || !deliveryText) {
      throw new Error('Both plan text and delivery text are required');
    }

    const prompt = createDetailedComparisonPrompt(planText, deliveryText, masterClientList);
    
    console.log('🤖 DETAILED COMPARISON PROMPT LENGTH:', prompt.length);
    console.log('📤 SENDING DETAILED COMPARISON TO AI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Use GPT-4 for better analysis
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Very low temperature for consistent structured output
      max_tokens: 2000 // Increased token limit for detailed analysis
    });

    const analysisResult = completion.choices[0].message.content;
    
    console.log('📥 DETAILED AI RESPONSE LENGTH:', analysisResult.length);
    
    // Parse the structured response to extract key metrics
    const metrics = extractMetricsFromAnalysis(analysisResult);
    
    return {
      success: true,
      analysis: analysisResult,
      metrics: metrics,
      timestamp: new Date().toISOString(),
      planLength: planText.length,
      deliveryLength: deliveryText.length,
      analysisType: 'detailed_comparison'
    };
  } catch (error) {
    console.error('Detailed analysis error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      analysisType: 'detailed_comparison'
    };
  }
}

// Extract key metrics from the structured analysis response
function extractMetricsFromAnalysis(analysisText) {
  const metrics = {
    totalPlannedClients: 0,
    successfullyDelivered: 0,
    missedDeliveries: 0,
    unplannedDeliveries: 0,
    fulfillmentRate: 0,
    plannedTotals: { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 },
    deliveredTotals: { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 }
  };

  try {
    // Extract summary section
    const summaryMatch = analysisText.match(/📈 SUMMARY:(.*?)(?=\n\n|\n[🎯🔍]|$)/s);
    if (summaryMatch) {
      const summaryText = summaryMatch[1];
      
      // Extract numbers using regex patterns
      const totalPlannedMatch = summaryText.match(/Total planned clients:\s*(\d+)/);
      if (totalPlannedMatch) metrics.totalPlannedClients = parseInt(totalPlannedMatch[1]);
      
      const deliveredMatch = summaryText.match(/Successfully delivered:\s*(\d+)/);
      if (deliveredMatch) metrics.successfullyDelivered = parseInt(deliveredMatch[1]);
      
      const missedMatch = summaryText.match(/Missed deliveries:\s*(\d+)/);
      if (missedMatch) metrics.missedDeliveries = parseInt(missedMatch[1]);
      
      const unplannedMatch = summaryText.match(/Unplanned deliveries:\s*(\d+)/);
      if (unplannedMatch) metrics.unplannedDeliveries = parseInt(unplannedMatch[1]);
      
      const fulfillmentMatch = summaryText.match(/Fulfillment rate:\s*(\d+)%/);
      if (fulfillmentMatch) metrics.fulfillmentRate = parseInt(fulfillmentMatch[1]);
      
      // Extract planned totals
      const plannedTotalsMatch = summaryText.match(/Planned totals:\s*3KG:(\d+),\s*5KG:(\d+),\s*V00:(\d+),\s*Cup:(\d+)/);
      if (plannedTotalsMatch) {
        metrics.plannedTotals = {
          '3KG': parseInt(plannedTotalsMatch[1]),
          '5KG': parseInt(plannedTotalsMatch[2]),
          'V00': parseInt(plannedTotalsMatch[3]),
          'Cup': parseInt(plannedTotalsMatch[4])
        };
      }
      
      // Extract delivered totals
      const deliveredTotalsMatch = summaryText.match(/Delivered totals:\s*3KG:(\d+),\s*5KG:(\d+),\s*V00:(\d+),\s*Cup:(\d+)/);
      if (deliveredTotalsMatch) {
        metrics.deliveredTotals = {
          '3KG': parseInt(deliveredTotalsMatch[1]),
          '5KG': parseInt(deliveredTotalsMatch[2]),
          'V00': parseInt(deliveredTotalsMatch[3]),
          'Cup': parseInt(deliveredTotalsMatch[4])
        };
      }
    }
  } catch (error) {
    console.error('Error extracting metrics:', error);
  }

  return metrics;
}

module.exports = { 
  analyzeReport, 
  analyzeTextDirectly, 
  analyzePlanVsDeliveryDetailed,
  createDetailedComparisonPrompt,
  extractMetricsFromAnalysis
}; 