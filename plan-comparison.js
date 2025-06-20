const fs = require('fs');
const { analyzeTextDirectly, analyzeReport } = require('./analysis');

// Use /tmp directory for serverless environments, fallback to current directory for local
const PLANS_FILE = process.env.VERCEL ? '/tmp/distribution_plans.json' : 'distribution_plans.json';

// Load stored plans
function loadPlans() {
  try {
    if (fs.existsSync(PLANS_FILE)) {
      const data = fs.readFileSync(PLANS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return { plans: [] };
  } catch (error) {
    console.error('Error loading plans:', error);
    return { plans: [] };
  }
}

// Save plans to file
function savePlans(plansData) {
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plansData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving plans:', error);
    return false;
  }
}

// Extract client names and product quantities from plan text
function extractPlanClients(planText) {
  const clients = [];
  const lines = planText.split('\n');
  
  console.log('Processing plan with', lines.length, 'lines');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || 
        line.includes('اسم العميل') || 
        line.includes('Client Name') ||
        line.includes('Comment') || 
        line.includes('3 KG') ||
        line.includes('5 KG') ||
        line.includes('V00') ||
        line.includes('Cup') ||
        line.includes('3KG') ||
        line.includes('5KG') ||
        line.includes('Total') ||
        line.includes('اجمالي') ||
        line.length < 3) {
      continue;
    }
    
    // Parse different formats
    let clientName = '';
    let products = { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 };
    
    // Method 1: Tab-separated values (most common in Excel copy-paste)
    const tabParts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
    if (tabParts.length >= 2) {
      clientName = tabParts[0];
      
      // Look for numbers in the subsequent columns
      for (let j = 1; j < tabParts.length && j <= 4; j++) {
        const value = parseInt(tabParts[j]) || 0;
        if (value > 0) {
          if (j === 1) products['3KG'] = value;
          else if (j === 2) products['5KG'] = value;
          else if (j === 3) products['V00'] = value;
          else if (j === 4) products['Cup'] = value;
        }
      }
    }
    
    // Method 2: Pipe-separated values
    if (!clientName) {
      const pipeParts = line.split('|').map(p => p.trim()).filter(p => p !== '');
      if (pipeParts.length >= 2) {
        clientName = pipeParts[0];
        for (let j = 1; j < pipeParts.length && j <= 4; j++) {
          const value = parseInt(pipeParts[j]) || 0;
          if (value > 0) {
            if (j === 1) products['3KG'] = value;
            else if (j === 2) products['5KG'] = value;
            else if (j === 3) products['V00'] = value;
            else if (j === 4) products['Cup'] = value;
          }
        }
      }
    }
    
    // Method 3: Space-separated with numbers
    if (!clientName || Object.values(products).every(v => v === 0)) {
      const spaceParts = line.split(/\s+/);
      const textParts = [];
      const numbers = [];
      
      spaceParts.forEach(part => {
        if (!isNaN(part) && part.trim() !== '' && parseInt(part) > 0) {
          numbers.push(parseInt(part));
        } else if (part.trim() !== '' && isNaN(part)) {
          textParts.push(part);
        }
      });
      
      if (textParts.length > 0 && numbers.length > 0) {
        clientName = textParts.join(' ');
        
        // Map numbers to products in order
        if (numbers[0]) products['3KG'] = numbers[0];
        if (numbers[1]) products['5KG'] = numbers[1];
        if (numbers[2]) products['V00'] = numbers[2];
        if (numbers[3]) products['Cup'] = numbers[3];
      }
    }
    
    // Method 4: Regex approach for mixed Arabic/numbers
    if (!clientName || Object.values(products).every(v => v === 0)) {
      // Extract Arabic text as client name
      const arabicMatch = line.match(/[\u0600-\u06FF\s]+/);
      if (arabicMatch) {
        clientName = arabicMatch[0].trim();
      }
      
      // Extract all numbers from the line
      const numberMatches = line.match(/\b\d+\b/g);
      if (numberMatches && numberMatches.length > 0) {
        const nums = numberMatches.map(n => parseInt(n)).filter(n => n > 0);
        if (nums[0]) products['3KG'] = nums[0];
        if (nums[1]) products['5KG'] = nums[1];
        if (nums[2]) products['V00'] = nums[2];
        if (nums[3]) products['Cup'] = nums[3];
      }
    }
    
    // Clean up client name
    if (clientName) {
      clientName = clientName.replace(/^[0-9\.\-\s]+/, '').trim();
      clientName = clientName.replace(/[0-9]+$/, '').trim(); // Remove trailing numbers
      
      // Only add if we have a valid client name and at least one product
      const totalQty = Object.values(products).reduce((sum, qty) => sum + qty, 0);
      if (clientName.length > 1 && !clientName.match(/^[0-9\.\-\s]+$/) && totalQty > 0) {
        console.log(`Parsed client: ${clientName} - 3KG:${products['3KG']}, 5KG:${products['5KG']}, V00:${products['V00']}, Cup:${products['Cup']}`);
        
        clients.push({
          name: clientName,
          originalLine: line,
          products: products,
          totalQuantity: totalQty,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  console.log(`Extracted ${clients.length} clients with products`);
  return clients;
}

// Save plan from file
async function savePlanFromFile(filePath) {
  try {
    let planText = '';
    
    // Read the file (assuming text-based for now)
    planText = fs.readFileSync(filePath, 'utf8');
    
    return await savePlanFromText(planText);
  } catch (error) {
    console.error('Error processing plan file:', error);
    return {
      success: false,
      error: 'Failed to process plan file: ' + error.message
    };
  }
}

// Save plan from text with date extraction
async function savePlanFromText(planText, planDate = null) {
  try {
    const planClients = extractPlanClients(planText);
    
    // Extract date from plan text or use provided date
    let extractedDate = planDate;
    if (!extractedDate) {
      extractedDate = extractDateFromText(planText);
    }
    
    const timestamp = new Date().toISOString();
    const dateForComparison = extractedDate ? new Date(extractedDate) : new Date();
    const dateString = dateForComparison.toDateString();
    
    const plansData = loadPlans();
    
    const newPlan = {
      id: Date.now(),
      date: dateString,
      originalDate: extractedDate,
      timestamp: timestamp,
      planText: planText,
      clients: planClients,
      clientCount: planClients.length,
      totalProducts: calculateTotalProducts(planClients)
    };
    
    // Remove any existing plan for the same date
    plansData.plans = plansData.plans.filter(p => p.date !== dateString);
    
    plansData.plans.unshift(newPlan); // Add to beginning
    
    // Keep only last 30 plans
    if (plansData.plans.length > 30) {
      plansData.plans = plansData.plans.slice(0, 30);
    }
    
    if (savePlans(plansData)) {
      return {
        success: true,
        message: `Distribution plan saved successfully for ${dateString}`,
        clientCount: planClients.length,
        timestamp: timestamp,
        planId: newPlan.id,
        planDate: dateString,
        totalProducts: newPlan.totalProducts
      };
    } else {
      return {
        success: false,
        error: 'Failed to save plan to storage'
      };
    }
  } catch (error) {
    console.error('Error saving plan:', error);
    return {
      success: false,
      error: 'Failed to save plan: ' + error.message
    };
  }
}

// Extract date from text (Arabic and English formats)
function extractDateFromText(text) {
  // Common date patterns
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g, // YYYY/MM/DD or YYYY-MM-DD
    /(\d{1,2})\s*(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*(\d{4})/gi,
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/gi,
    /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*(\d{1,2})\s*(\d{4})/gi,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*(\d{4})/gi
  ];
  
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Try to parse the first match
      const dateStr = matches[0];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
  }
  
  return null;
}

// Calculate total products in plan
function calculateTotalProducts(clients) {
  const totals = { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 };
  clients.forEach(client => {
    Object.keys(totals).forEach(product => {
      totals[product] += client.products[product] || 0;
    });
  });
  return totals;
}

// Get plan for specific date
function getPlanForDate(targetDate) {
  const plansData = loadPlans();
  const targetDateString = new Date(targetDate).toDateString();
  
  // First try exact date match
  let plan = plansData.plans.find(p => p.date === targetDateString);
  
  if (!plan) {
    // Try to find plan from previous day (plan made night before)
    const previousDay = new Date(targetDate);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayString = previousDay.toDateString();
    plan = plansData.plans.find(p => p.date === previousDayString);
  }
  
  if (!plan) {
    // If still no plan, get the most recent one
    plan = plansData.plans.length > 0 ? plansData.plans[0] : null;
  }
  
  return plan;
}

// Get latest plan
function getLatestPlan() {
  const plansData = loadPlans();
  return plansData.plans.length > 0 ? plansData.plans[0] : null;
}

// Compare delivery against plan
async function compareDeliveryFromFile(filePath, masterClientList) {
  try {
    let deliveryText = '';
    deliveryText = fs.readFileSync(filePath, 'utf8');
    
    return await compareDeliveryFromText(deliveryText, masterClientList);
  } catch (error) {
    console.error('Error processing delivery file:', error);
    return {
      success: false,
      error: 'Failed to process delivery file: ' + error.message
    };
  }
}

// Compare delivery against plan with AI analysis
async function compareDeliveryFromText(deliveryText, masterClientList) {
  try {
    // Extract date from delivery text
    const deliveryDate = extractDateFromText(deliveryText) || new Date().toISOString().split('T')[0];
    
    // Find the appropriate plan for this delivery date
    const plan = getPlanForDate(deliveryDate);
    
    if (!plan) {
      return {
        success: false,
        error: 'No distribution plan found for the delivery date. Please upload a plan first.'
      };
    }
    
    // Create enhanced prompt for plan vs delivery comparison
    const comparisonPrompt = createComparisonPrompt(plan, deliveryText, masterClientList, deliveryDate);
    
    // Use existing AI analysis but with enhanced prompt
    const result = await analyzeTextDirectly(comparisonPrompt, masterClientList);
    
    if (result.success) {
      return {
        success: true,
        comparison: result.analysis,
        timestamp: new Date().toISOString(),
        planDate: plan.date,
        deliveryDate: deliveryDate,
        planId: plan.id,
        dateMatch: plan.date === new Date(deliveryDate).toDateString()
      };
    } else {
      return result;
    }
  } catch (error) {
    console.error('Error comparing delivery:', error);
    return {
      success: false,
      error: 'Failed to compare delivery: ' + error.message
    };
  }
}

// Create enhanced prompt for comparison
function createComparisonPrompt(plan, deliveryText, masterClientList, deliveryDate) {
  const planDateDisplay = plan.date;
  const deliveryDateDisplay = new Date(deliveryDate).toDateString();
  
  // Create a focused list of planned clients with names and quantities
  const plannedClientsText = plan.clients.map(client => 
    `${client.name}: 3KG:${client.products['3KG']} bags, 5KG:${client.products['5KG']} bags, V00:${client.products['V00']} bags, Cup:${client.products['Cup']} units`
  ).join('\n');
  
  return `Analyze Icebreaker Egypt delivery vs distribution plan. Use EXACT CLIENT NAMES, not generic labels.

📅 DELIVERY DATE: ${deliveryDateDisplay}
📋 PLAN DATE: ${planDateDisplay}

PLANNED CLIENTS WITH QUANTITIES:
${plannedClientsText}

ACTUAL DELIVERY REPORT:
${deliveryText}

MASTER CLIENT LIST (for freezer status):
${masterClientList.substring(0, 1500)}

OUTPUT REQUIREMENTS:
1. Use EXACT client names from plan and delivery (Arabic names like سيت الزمالك, ماتيمور, etc.)
2. Compare each client's planned vs delivered quantities
3. Show product breakdown for each client: 3KG, 5KG, V00, Cup
4. Mark freezer clients as (FREEZER) using master list

FORMAT:
📊 Plan vs Actual Delivery Comparison
📅 Date Analysis: ${planDateDisplay === deliveryDateDisplay ? '✅ Same-day analysis' : '⚠️ Cross-date analysis'}

1. Delivered clients:
- [EXACT CLIENT NAME]: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty]
- [EXACT CLIENT NAME]: 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty]

2. Missed/unvisited clients:
- [EXACT CLIENT NAME]: Planned 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty] - NOT delivered
- [EXACT CLIENT NAME]: Planned 3KG:[qty], 5KG:[qty], V00:[qty], Cup:[qty] - NOT delivered

3. Product fulfillment summary:
- Total 3KG: [delivered]/[planned] bags
- Total 5KG: [delivered]/[planned] bags  
- Total V00: [delivered]/[planned] bags
- Total Cup: [delivered]/[planned] units

CRITICAL: Use the actual Arabic client names from the plan, not "Client 1", "Client 2"!`;
}

module.exports = {
  savePlanFromFile,
  savePlanFromText,
  compareDeliveryFromFile,
  compareDeliveryFromText,
  getLatestPlan,
  getPlanForDate,
  extractDateFromText,
  calculateTotalProducts,
  loadPlans
}; 