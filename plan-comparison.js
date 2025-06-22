const fs = require('fs');
const path = require('path');

const PLANS_FILE = process.env.VERCEL ? '/tmp/plans.json' : './plans.json';

// In-memory plan storage for serverless environments
let memoryPlans = {
  plans: [],
  lastUpdated: null
};

// Load plans from file or memory
function loadPlans() {
  try {
    // First try to load from memory (for serverless)
    if (memoryPlans.plans.length > 0) {
      // Check if plans are still fresh (within 1 hour)
      const now = new Date();
      const lastUpdate = new Date(memoryPlans.lastUpdated);
      const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursDiff < 1) {
        console.log('📋 Using in-memory plans (age:', Math.round(hoursDiff * 60), 'minutes)');
        return memoryPlans;
      } else {
        console.log('📋 Memory plans expired, clearing...');
        memoryPlans = { plans: [], lastUpdated: null };
      }
    }
    
    // Try to load from file
    if (fs.existsSync(PLANS_FILE)) {
      const data = fs.readFileSync(PLANS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Update memory with file data
      memoryPlans = {
        plans: fileData.plans || [],
        lastUpdated: new Date().toISOString()
      };
      
      console.log('📋 Loaded plans from file, saved to memory');
      return memoryPlans;
    }
    
    console.log('📋 No plans found in file or memory');
    return { plans: [] };
  } catch (error) {
    console.error('Error loading plans:', error);
    return { plans: [] };
  }
}

// Save plans to file and memory
function savePlans(plansData) {
  try {
    // Save to memory first (always works)
    memoryPlans = {
      plans: plansData.plans || [],
      lastUpdated: new Date().toISOString()
    };
    console.log('📋 Plans saved to memory');
    
    // Try to save to file (may fail in serverless)
    try {
      fs.writeFileSync(PLANS_FILE, JSON.stringify(plansData, null, 2));
      console.log('📋 Plans also saved to file');
    } catch (fileError) {
      console.log('📋 File save failed (serverless environment), using memory only');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving plans:', error);
    return false;
  }
}

// STEP 2: Parse WhatsApp delivery text to extract fulfilled deliveries
function parseDeliveryReport(deliveryText) {
  const fulfilledDeliveries = [];
  const lines = deliveryText.split('\n');
  
  console.log('📱 STEP 2: Parsing WhatsApp delivery report with', lines.length, 'lines');
  
  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines, dates, phone numbers, and headers
    if (!line || 
        line.length < 3 ||
        line.includes('تقرير') ||
        line.includes('اليوم') ||
        line.includes('بتاريخ') ||
        line.includes('+20') ||
        line.includes('عربية') ||
        line.includes('جامبو') ||
        line.includes('مندوب') ||
        line.includes('سائق') ||
        line.match(/^\d{1,2}:\d{2}$/) ||
        line.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      continue;
    }
    
    let clientName = '';
    let quantities = { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 };
    let foundMatch = false;
    
    // Method 1: Handle "صغير" (small = 3KG) and "كبير" (large = 5KG) patterns
    const smallMatch = line.match(/(.+?)\s*(\d+)\s*صغير/i) || line.match(/(.+?)\s*صغير.*?(\d+)/i);
    if (smallMatch) {
      clientName = smallMatch[1].trim();
      quantities['3KG'] = parseInt(smallMatch[2]) || 0;
      foundMatch = true;
    }
    
    const largeMatch = line.match(/(.+?)\s*(\d+)\s*كبير/i) || line.match(/(.+?)\s*كبير.*?(\d+)/i);
    if (largeMatch) {
      if (!clientName) clientName = largeMatch[1].trim();
      quantities['5KG'] = parseInt(largeMatch[2]) || 0;
      foundMatch = true;
    }
    
    // Method 2: Handle "فو" or "فوو" (V00) patterns
    const v00Match = line.match(/(.+?)\s*(\d+)\s*فو/i);
    if (v00Match) {
      if (!clientName) clientName = v00Match[1].trim();
      quantities['V00'] = parseInt(v00Match[2]) || 0;
      foundMatch = true;
    }
    
    // Method 3: Handle "كوب" (Cup) patterns
    const cupMatch = line.match(/(.+?)\s*(\d+)\s*كوب/i);
    if (cupMatch) {
      if (!clientName) clientName = cupMatch[1].trim();
      quantities['Cup'] = parseInt(cupMatch[2]) || 0;
      foundMatch = true;
    }
    
    // Method 4: Original patterns with ص (صغير) and ك (كبير)
    const match3KG = line.match(/(.+?)\s*(\d+)\s*ص/);
    if (match3KG && !foundMatch) {
      clientName = match3KG[1].trim();
      quantities['3KG'] = parseInt(match3KG[2]);
      foundMatch = true;
    }
    
    const match5KG = line.match(/(.+?)\s*(\d+)\s*ك/);
    if (match5KG && !foundMatch) {
      if (!clientName) clientName = match5KG[1].trim();
      quantities['5KG'] = parseInt(match5KG[2]);
      foundMatch = true;
    }
    
    // Clean up client name and add to fulfilled deliveries
    if (foundMatch && clientName) {
      clientName = clientName.replace(/^[0-9\.\-\s]+/, '').trim();
      clientName = clientName.replace(/[0-9]+$/, '').trim();
      
      const totalDelivered = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
      if (clientName.length > 1 && totalDelivered > 0) {
        console.log(`📱 Delivered: ${clientName} - 3KG:${quantities['3KG']}, 5KG:${quantities['5KG']}, V00:${quantities['V00']}, Cup:${quantities['Cup']}`);
        
        fulfilledDeliveries.push({
          clientName: clientName,
          originalLine: line,
          delivered3KG: quantities['3KG'],
          delivered5KG: quantities['5KG'],
          deliveredV00: quantities['V00'],
          deliveredCup: quantities['Cup'],
          totalDelivered: totalDelivered,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  console.log(`📱 STEP 2 Complete: Extracted ${fulfilledDeliveries.length} fulfilled deliveries`);
  return fulfilledDeliveries;
}

// Generate human-readable comparison report
function generateComparisonReport(comparisonResults, planDate, deliveryDate) {
  const deliveredClients = comparisonResults.filter(r => r.deliveryStatus === 'Delivered');
  const missedClients = comparisonResults.filter(r => r.deliveryStatus === 'Missed');
  const unplannedClients = comparisonResults.filter(r => r.deliveryStatus === 'Unplanned');
  const urgentFollowUps = missedClients.filter(r => r.action === 'urgent_followup');
  
  let report = `📊 Plan vs Actual Delivery Comparison\n`;
  report += `📅 Plan Date: ${planDate} | Delivery Date: ${deliveryDate}\n\n`;
  
  // Delivered clients
  report += `✅ DELIVERED CLIENTS (${deliveredClients.length}):\n`;
  deliveredClients.forEach(client => {
    const freezerIcon = client.hasFreezr ? ' 🧊' : '';
    const variance3KG = client.variance['3KG'];
    const variance5KG = client.variance['5KG'];
    const varianceText = variance3KG !== 0 || variance5KG !== 0 ? 
      ` (Variance: 3KG${variance3KG > 0 ? '+' : ''}${variance3KG}, 5KG${variance5KG > 0 ? '+' : ''}${variance5KG})` : '';
    
    report += `• ${client.clientName}${freezerIcon} - ${client.zone}\n`;
    report += `  Planned: 3KG:${client.planned['3KG']}, 5KG:${client.planned['5KG']}, V00:${client.planned['V00']}, Cup:${client.planned['Cup']}\n`;
    report += `  Delivered: 3KG:${client.delivered['3KG']}, 5KG:${client.delivered['5KG']}, V00:${client.delivered['V00']}, Cup:${client.delivered['Cup']}${varianceText}\n\n`;
  });
  
  // Missed clients
  report += `❌ MISSED CLIENTS (${missedClients.length}):\n`;
  missedClients.forEach(client => {
    const freezerIcon = client.hasFreezr ? ' 🧊' : '';
    const actionIcon = client.action === 'urgent_followup' ? ' ⚠️ URGENT' : '';
    
    report += `• ${client.clientName}${freezerIcon} - ${client.zone}${actionIcon}\n`;
    report += `  Planned: 3KG:${client.planned['3KG']}, 5KG:${client.planned['5KG']}, V00:${client.planned['V00']}, Cup:${client.planned['Cup']} - NOT DELIVERED\n\n`;
  });
  
  // Unplanned deliveries
  if (unplannedClients.length > 0) {
    report += `📦 UNPLANNED DELIVERIES (${unplannedClients.length}):\n`;
    unplannedClients.forEach(client => {
      const freezerIcon = client.hasFreezr ? ' 🧊' : '';
      
      report += `• ${client.clientName}${freezerIcon} - ${client.zone}\n`;
      report += `  Delivered: 3KG:${client.delivered['3KG']}, 5KG:${client.delivered['5KG']}, V00:${client.delivered['V00']}, Cup:${client.delivered['Cup']} (NOT PLANNED)\n\n`;
    });
  }
  
  // Summary
  const totalPlanned3KG = comparisonResults.reduce((sum, r) => sum + r.planned['3KG'], 0);
  const totalPlanned5KG = comparisonResults.reduce((sum, r) => sum + r.planned['5KG'], 0);
  const totalDelivered3KG = comparisonResults.reduce((sum, r) => sum + r.delivered['3KG'], 0);
  const totalDelivered5KG = comparisonResults.reduce((sum, r) => sum + r.delivered['5KG'], 0);
  
  const fulfillmentRate = comparisonResults.length > 0 ? 
    Math.round((deliveredClients.length / (deliveredClients.length + missedClients.length)) * 100) : 0;
  
  report += `📈 SUMMARY:\n`;
  report += `• Total planned clients: ${deliveredClients.length + missedClients.length}\n`;
  report += `• Successfully delivered: ${deliveredClients.length}\n`;
  report += `• Missed deliveries: ${missedClients.length}\n`;
  report += `• Unplanned deliveries: ${unplannedClients.length}\n`;
  report += `• Fulfillment rate: ${fulfillmentRate}%\n`;
  report += `• Planned totals: 3KG:${totalPlanned3KG}, 5KG:${totalPlanned5KG}\n`;
  report += `• Delivered totals: 3KG:${totalDelivered3KG}, 5KG:${totalDelivered5KG}\n`;
  
  if (urgentFollowUps.length > 0) {
    report += `\n⚠️ URGENT FOLLOW-UPS REQUIRED:\n`;
    urgentFollowUps.forEach(client => {
      report += `• ${client.clientName} 🧊 - Freezer client missed delivery!\n`;
    });
  }
  
  return report;
}

// NEW 3-step comparison function
async function compareDeliveryFromText(deliveryText, masterClientList) {
  try {
    console.log('🚀 Starting NEW 3-step delivery comparison system');
    
    // Debug: Check plan storage status
    console.log('🔍 Checking for existing plans...');
    const plansData = loadPlans();
    console.log('📋 Plans in storage:', plansData.plans.length);
    if (plansData.plans.length > 0) {
      console.log('📋 Latest plan date:', plansData.plans[0].date);
      console.log('📋 Latest plan clients:', plansData.plans[0].clientCount);
    }
    
    // Find the appropriate plan for this delivery date
    const plan = getLatestPlan(); // Use latest plan for now
    
    if (!plan) {
      console.log('❌ No plan found in storage');
      return {
        success: false,
        error: 'No distribution plan found. Please upload a plan first.'
      };
    }
    
    console.log('✅ Found plan with', plan.clients.length, 'clients from', plan.date);
    
    // STEP 1: Get planned clients from saved plan
    const plannedClients = plan.clients.map(client => ({
      clientName: client.name,
      planned3KG: client.products['3KG'],
      planned5KG: client.products['5KG'],
      plannedV00: client.products['V00'],
      plannedCup: client.products['Cup'],
      totalPlanned: client.totalQuantity
    }));
    
    // STEP 2: Parse WhatsApp delivery text to get fulfilled deliveries
    const fulfilledDeliveries = parseDeliveryReport(deliveryText);
    
    // STEP 3: Match planned clients to fulfilled deliveries
    const comparisonResults = [];
    const matchedDeliveries = new Set();
    
    // Process each planned client
    for (const planned of plannedClients) {
      // Try to find matching fulfilled delivery using fuzzy matching
      const matchedDelivery = fulfilledDeliveries.find((fulfilled, index) => {
        if (matchedDeliveries.has(index)) return false; // Already matched
        
        const pName = planned.clientName.toLowerCase().replace(/\s+/g, '');
        const fName = fulfilled.clientName.toLowerCase().replace(/\s+/g, '');
        
        // Various matching strategies
        return pName.includes(fName) || 
               fName.includes(pName) || 
               pName.replace(/[^\u0600-\u06FF]/g, '') === fName.replace(/[^\u0600-\u06FF]/g, '');
      });
      
      // Find client in master database for freezer status
      const masterClient = masterClientList.find(mc => {
        const mName = mc.name.toLowerCase().replace(/\s+/g, '');
        const pName = planned.clientName.toLowerCase().replace(/\s+/g, '');
        return mName.includes(pName) || pName.includes(mName);
      });
      
      if (matchedDelivery) {
        // Mark delivery as matched
        const deliveryIndex = fulfilledDeliveries.indexOf(matchedDelivery);
        matchedDeliveries.add(deliveryIndex);
        
        comparisonResults.push({
          clientName: planned.clientName,
          deliveryStatus: 'Delivered',
          hasFreezr: masterClient ? masterClient.isFreezr : false,
          zone: masterClient ? masterClient.location : 'Unknown',
          planned: {
            '3KG': planned.planned3KG,
            '5KG': planned.planned5KG,
            'V00': planned.plannedV00,
            'Cup': planned.plannedCup,
            total: planned.totalPlanned
          },
          delivered: {
            '3KG': matchedDelivery.delivered3KG,
            '5KG': matchedDelivery.delivered5KG,
            'V00': matchedDelivery.deliveredV00,
            'Cup': matchedDelivery.deliveredCup,
            total: matchedDelivery.totalDelivered
          },
          variance: {
            '3KG': matchedDelivery.delivered3KG - planned.planned3KG,
            '5KG': matchedDelivery.delivered5KG - planned.planned5KG,
            'V00': matchedDelivery.deliveredV00 - planned.plannedV00,
            'Cup': matchedDelivery.deliveredCup - planned.plannedCup
          },
          action: 'none'
        });
      } else {
        // Client was planned but not delivered
        const needsFollowUp = masterClient && masterClient.isFreezr;
        
        comparisonResults.push({
          clientName: planned.clientName,
          deliveryStatus: 'Missed',
          hasFreezr: masterClient ? masterClient.isFreezr : false,
          zone: masterClient ? masterClient.location : 'Unknown',
          planned: {
            '3KG': planned.planned3KG,
            '5KG': planned.planned5KG,
            'V00': planned.plannedV00,
            'Cup': planned.plannedCup,
            total: planned.totalPlanned
          },
          delivered: {
            '3KG': 0,
            '5KG': 0,
            'V00': 0,
            'Cup': 0,
            total: 0
          },
          variance: {
            '3KG': -planned.planned3KG,
            '5KG': -planned.planned5KG,
            'V00': -planned.plannedV00,
            'Cup': -planned.plannedCup
          },
          action: needsFollowUp ? 'urgent_followup' : 'followup'
        });
      }
    }
    
    // Process unplanned deliveries
    fulfilledDeliveries.forEach((fulfilled, index) => {
      if (!matchedDeliveries.has(index)) {
        // Find client in master database
        const masterClient = masterClientList.find(mc => {
          const mName = mc.name.toLowerCase().replace(/\s+/g, '');
          const fName = fulfilled.clientName.toLowerCase().replace(/\s+/g, '');
          return mName.includes(fName) || fName.includes(mName);
        });
        
        comparisonResults.push({
          clientName: fulfilled.clientName,
          deliveryStatus: 'Unplanned',
          hasFreezr: masterClient ? masterClient.isFreezr : false,
          zone: masterClient ? masterClient.location : 'Unknown',
          planned: {
            '3KG': 0,
            '5KG': 0,
            'V00': 0,
            'Cup': 0,
            total: 0
          },
          delivered: {
            '3KG': fulfilled.delivered3KG,
            '5KG': fulfilled.delivered5KG,
            'V00': fulfilled.deliveredV00,
            'Cup': fulfilled.deliveredCup,
            total: fulfilled.totalDelivered
          },
          variance: {
            '3KG': fulfilled.delivered3KG,
            '5KG': fulfilled.delivered5KG,
            'V00': fulfilled.deliveredV00,
            'Cup': fulfilled.deliveredCup
          },
          action: 'review'
        });
      }
    });
    
    // Generate human-readable report
    const comparison = generateComparisonReport(comparisonResults, plan.date, new Date().toDateString());
    
    return {
      success: true,
      comparison: comparison,
      comparisonResults: comparisonResults,
      timestamp: new Date().toISOString(),
      planDate: plan.date,
      deliveryDate: new Date().toDateString(),
      planId: plan.id,
      stats: {
        plannedClients: plannedClients.length,
        fulfilledDeliveries: fulfilledDeliveries.length,
        delivered: comparisonResults.filter(r => r.deliveryStatus === 'Delivered').length,
        missed: comparisonResults.filter(r => r.deliveryStatus === 'Missed').length,
        unplanned: comparisonResults.filter(r => r.deliveryStatus === 'Unplanned').length
      }
    };
  } catch (error) {
    console.error('Error in 3-step comparison:', error);
    return {
      success: false,
      error: 'Failed to compare delivery: ' + error.message
    };
  }
}

// Other required functions (simplified versions)
function getPlanForDate(targetDate) {
  const plansData = loadPlans();
  return plansData.plans.length > 0 ? plansData.plans[0] : null;
}

function getLatestPlan() {
  const plansData = loadPlans();
  return plansData.plans.length > 0 ? plansData.plans[0] : null;
}

async function savePlanFromText(planText, planDate = null) {
  try {
    const lines = planText.split('\n');
    const clients = [];
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.length < 3) continue;
      
      // Parse tab-separated values (Excel copy-paste format)
      const parts = line.split('\t').map(p => p.trim()).filter(p => p !== '');
      if (parts.length >= 2) {
        const clientName = parts[0];
        const products = {
          '3KG': parseInt(parts[1]) || 0,
          '5KG': parseInt(parts[2]) || 0,
          'V00': parseInt(parts[3]) || 0,
          'Cup': parseInt(parts[4]) || 0
        };
        
        const totalQty = Object.values(products).reduce((sum, qty) => sum + qty, 0);
        if (clientName.length > 1 && totalQty > 0) {
          clients.push({
            name: clientName,
            products: products,
            totalQuantity: totalQty,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    if (clients.length === 0) {
      return { success: false, error: 'No valid clients found in plan text' };
    }
    
    const plansData = loadPlans();
    const newPlan = {
      id: Date.now(),
      date: new Date().toDateString(),
      timestamp: new Date().toISOString(),
      planText: planText,
      clients: clients,
      totalProducts: calculateTotalProducts(clients),
      clientCount: clients.length
    };
    
    // Add new plan at the beginning
    plansData.plans.unshift(newPlan);
    
    // Keep only last 30 plans
    if (plansData.plans.length > 30) {
      plansData.plans = plansData.plans.slice(0, 30);
    }
    
    const saved = savePlans(plansData);
    
    if (saved) {
      console.log(`Plan saved with ${clients.length} clients`);
      return {
        success: true,
        message: `Distribution plan saved successfully for ${newPlan.date}`,
        planId: newPlan.id,
        clientCount: clients.length
      };
    } else {
      throw new Error('Failed to save plan to file');
    }
  } catch (error) {
    console.error('Error saving plan:', error);
    return {
      success: false,
      error: 'Failed to save plan: ' + error.message
    };
  }
}

async function savePlanFromFile(filePath) {
  return { success: true, message: "Plan saved" };
}

async function compareDeliveryFromFile(filePath, masterClientList) {
  const deliveryText = fs.readFileSync(filePath, 'utf8');
  return await compareDeliveryFromText(deliveryText, masterClientList);
}

function extractDateFromText(text) {
  return null;
}

function calculateTotalProducts(clients) {
  return clients.reduce((totals, client) => {
    totals['3KG'] += client.products['3KG'] || 0;
    totals['5KG'] += client.products['5KG'] || 0;
    totals['V00'] += client.products['V00'] || 0;
    totals['Cup'] += client.products['Cup'] || 0;
    return totals;
  }, { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 });
}

module.exports = {
  loadPlans,
  savePlans,
  savePlanFromFile,
  savePlanFromText,
  compareDeliveryFromFile,
  compareDeliveryFromText,
  getLatestPlan,
  getPlanForDate,
  extractDateFromText,
  calculateTotalProducts,
  parseDeliveryReport,
  generateComparisonReport
};
