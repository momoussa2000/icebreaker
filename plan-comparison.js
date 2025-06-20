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
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && 
        !trimmedLine.includes('اسم العميل') && 
        !trimmedLine.includes('Client Name') &&
        !trimmedLine.includes('Comment') && 
        !trimmedLine.includes('اجمالي') &&
        !trimmedLine.includes('Total') &&
        !trimmedLine.includes('3 KG') &&
        !trimmedLine.includes('5 KG') &&
        !trimmedLine.includes('V00') &&
        !trimmedLine.includes('Cup') &&
        trimmedLine.length > 3) {
      
      // Try to parse as table row with product columns
      // Expected format: Client Name | 3KG | 5KG | V00 | Cup | Comment
      const parts = trimmedLine.split(/[\t\|]+/).map(p => p.trim());
      
      if (parts.length >= 2) {
        let clientName = parts[0].trim();
        
        // Clean up client name - remove leading numbers and special chars
        clientName = clientName.replace(/^[0-9\.\-\s]+/, '').trim();
        
        if (clientName.length > 2 && !clientName.match(/^[0-9]+$/)) {
          // Extract product quantities from columns
          const products = {
            '3KG': 0,
            '5KG': 0,
            'V00': 0,
            'Cup': 0
          };
          
          // Try to map columns to products (typical order: name, 3KG, 5KG, V00, Cup)
          if (parts.length >= 2 && parts[1] && !isNaN(parts[1])) products['3KG'] = parseInt(parts[1]) || 0;
          if (parts.length >= 3 && parts[2] && !isNaN(parts[2])) products['5KG'] = parseInt(parts[2]) || 0;
          if (parts.length >= 4 && parts[3] && !isNaN(parts[3])) products['V00'] = parseInt(parts[3]) || 0;
          if (parts.length >= 5 && parts[4] && !isNaN(parts[4])) products['Cup'] = parseInt(parts[4]) || 0;
          
          // Also try space-separated parsing as backup
          if (Object.values(products).every(v => v === 0)) {
            const spaceParts = trimmedLine.split(/\s+/);
            const numbers = spaceParts.filter(p => !isNaN(p) && p.trim() !== '').map(n => parseInt(n));
            if (numbers.length >= 4) {
              products['3KG'] = numbers[0] || 0;
              products['5KG'] = numbers[1] || 0;
              products['V00'] = numbers[2] || 0;
              products['Cup'] = numbers[3] || 0;
            }
          }
          
          clients.push({
            name: clientName,
            originalLine: trimmedLine,
            products: products,
            totalQuantity: Object.values(products).reduce((sum, qty) => sum + qty, 0),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }
  
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
  const today = new Date().toDateString();
  const planDateDisplay = plan.date;
  const deliveryDateDisplay = new Date(deliveryDate).toDateString();
  
  return `You are analyzing Icebreaker Egypt's delivery performance. Compare PLANNED product quantities vs ACTUAL deliveries with detailed product breakdown.

📅 DATE ANALYSIS:
- Plan Date: ${planDateDisplay}
- Delivery Date: ${deliveryDateDisplay}
- Date Match: ${planDateDisplay === deliveryDateDisplay ? '✅ Same day' : '⚠️ Different days'}

📋 DISTRIBUTION PLAN (${plan.clientCount} clients planned):
PLANNED TOTALS: 3KG: ${plan.totalProducts?.['3KG'] || 0} bags, 5KG: ${plan.totalProducts?.['5KG'] || 0} bags, V00: ${plan.totalProducts?.['V00'] || 0} bags, Cup: ${plan.totalProducts?.['Cup'] || 0} units

INDIVIDUAL CLIENT PLANS:
${plan.clients.map(client => 
  `- ${client.name}: 3KG:${client.products['3KG']} 5KG:${client.products['5KG']} V00:${client.products['V00']} Cup:${client.products['Cup']} (Total: ${client.totalQuantity})`
).join('\n')}

📦 ACTUAL DELIVERY REPORT (${deliveryDateDisplay}):
${deliveryText}

🏢 MASTER CLIENT LIST (for freezer status):
${masterClientList.substring(0, 2000)}

CRITICAL INSTRUCTIONS: 
1. Extract EXACT product quantities from both plan and delivery
2. Match clients by name (account for spelling variations)
3. Calculate precise fulfillment rates for each product type
4. Identify freezer clients using the master list
5. Show EXACT bag counts for every comparison

REQUIRED OUTPUT FORMAT:

📊 DELIVERY PERFORMANCE SUMMARY:
Date: ${deliveryDateDisplay} | Plan Date: ${planDateDisplay}
${planDateDisplay === deliveryDateDisplay ? '✅ Same-day delivery as planned' : '⚠️ Cross-date analysis (plan from different day)'}

✅ PLAN FULFILLED (Planned orders that were delivered):
For each client that received planned products:
- Client Name - [FREEZER/REGULAR]
  PLANNED: 3KG: X bags, 5KG: Y bags, V00: Z bags, Cup: W units
  DELIVERED: 3KG: X bags, 5KG: Y bags, V00: Z bags, Cup: W units
  STATUS: ✅ Complete / ⚠️ Partial (specify exact missing quantities)

❌ PLAN MISSED (Planned orders NOT delivered):
For each client that was planned but not delivered:
- Client Name - [FREEZER/REGULAR] 
  PLANNED: 3KG: X bags, 5KG: Y bags, V00: Z bags, Cup: W units
  DELIVERED: Nothing
  STATUS: ❌ Complete miss
  IMPACT: Lost revenue: [calculate based on planned quantities]

📦 PARTIAL DELIVERIES (Some products delivered, some missing):
For each client with incomplete orders:
- Client Name - [FREEZER/REGULAR]
  PLANNED: 3KG: X bags, 5KG: Y bags, V00: Z bags, Cup: W units  
  DELIVERED: 3KG: A bags, 5KG: B bags, V00: C bags, Cup: D units
  MISSING: 3KG: (X-A) bags, 5KG: (Y-B) bags, V00: (Z-C) bags, Cup: (W-D) units
  FULFILLMENT: [percentage]%

🔄 UNPLANNED DELIVERIES (Delivered but NOT in plan):
- Client Name - [FREEZER/REGULAR]
  DELIVERED: 3KG: X bags, 5KG: Y bags, V00: Z bags, Cup: W units
  NOTE: Not in original plan - additional sale or emergency delivery

🧊 FREEZER CLIENT ANALYSIS:
MISSED FREEZER CLIENTS (CRITICAL - require twice weekly):
- [List freezer clients with missed deliveries and exact quantities missed]

DELIVERED FREEZER CLIENTS:
- [List freezer clients successfully served with quantities]

📊 DETAILED PERFORMANCE METRICS:
OVERALL FULFILLMENT:
- Total planned clients: [COUNT]
- Total delivered clients: [COUNT]  
- Plan fulfillment rate: [DELIVERED/PLANNED]%

PRODUCT FULFILLMENT BY TYPE:
- 3KG bags: [DELIVERED bags]/[PLANNED bags] = [PERCENTAGE]%
- 5KG bags: [DELIVERED bags]/[PLANNED bags] = [PERCENTAGE]%  
- V00 bags: [DELIVERED bags]/[PLANNED bags] = [PERCENTAGE]%
- Cup units: [DELIVERED units]/[PLANNED units] = [PERCENTAGE]%

REVENUE IMPACT:
- Planned revenue: [estimate based on total planned quantities]
- Actual revenue: [estimate based on delivered quantities]
- Lost revenue: [difference]

🚨 URGENT ACTIONS FOR NEXT DELIVERY:
- [Specific products to deliver to missed freezer clients]
- [Clients with partial orders needing completion]
- [Recommended priority order for tomorrow with exact quantities]

⏰ DATE CONSIDERATIONS:
${planDateDisplay === deliveryDateDisplay ? 
  '✅ Plan and delivery are same day - excellent planning alignment' : 
  `⚠️ Plan (${planDateDisplay}) and delivery (${deliveryDateDisplay}) are different days - consider plan timing adjustments`}

BE PRECISE: Show exact bag counts for each product type (3KG, 5KG, V00, Cup) for every client comparison.`;
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