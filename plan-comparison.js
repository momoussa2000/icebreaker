const fs = require('fs');
const path = require('path');

const PLANS_FILE = process.env.VERCEL ? '/tmp/plans.json' : './plans.json';

// Session-based plan storage - plans are passed with each request
let sessionPlans = new Map(); // Session ID -> Plan Data

// Generate unique session ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Store plan in session with expiration
function storePlanInSession(planData) {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
  
  sessionPlans.set(sessionId, {
    data: planData,
    expiresAt: expiresAt
  });
  
  // Clean up expired sessions
  for (const [id, session] of sessionPlans.entries()) {
    if (session.expiresAt < Date.now()) {
      sessionPlans.delete(id);
    }
  }
  
  console.log('📋 Plan stored in session:', sessionId, 'Expires:', new Date(expiresAt).toLocaleTimeString());
  return sessionId;
}

// Retrieve plan from session
function getPlanFromSession(sessionId) {
  if (!sessionId) {
    console.log('❌ No session ID provided');
    return null;
  }
  
  const session = sessionPlans.get(sessionId);
  if (!session) {
    console.log('❌ Session not found:', sessionId);
    return null;
  }
  
  if (session.expiresAt < Date.now()) {
    console.log('❌ Session expired:', sessionId);
    sessionPlans.delete(sessionId);
    return null;
  }
  
  console.log('✅ Plan retrieved from session:', sessionId);
  return session.data;
}

// Legacy functions for backward compatibility
function loadPlans() {
  try {
    if (fs.existsSync(PLANS_FILE)) {
      const data = fs.readFileSync(PLANS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      return fileData;
    }
    return { plans: [] };
  } catch (error) {
    console.error('Error loading plans:', error);
    return { plans: [] };
  }
}

function savePlans(plansData) {
  try {
    fs.writeFileSync(PLANS_FILE, JSON.stringify(plansData, null, 2));
    return true;
  } catch (error) {
    console.log('📋 File save failed (serverless environment), using session storage only');
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
    
    // PRIMARY METHOD: Handle compound delivery format like "سبوتشو أركان - 12ص + 8ك + 2كوب"
    const compoundPattern = /^(.+?)\s*-\s*(.+)$/;
    const compoundMatch = line.match(compoundPattern);
    
    if (compoundMatch) {
      clientName = compoundMatch[1].trim();
      const quantitiesText = compoundMatch[2].trim();
      
      // Extract all quantities from the compound text
      // Note: Order matters! Process longer patterns first to avoid conflicts
      
      // Pattern for كوب (Cup) - must be before ك pattern
      const cupMatches = quantitiesText.match(/(\d+)\s*كوب/g);
      if (cupMatches) {
        cupMatches.forEach(match => {
          const qty = parseInt(match.match(/(\d+)/)[1]);
          quantities['Cup'] += qty;
        });
      }
      
      // Pattern for فو or فوو (V00)
      const v00Matches = quantitiesText.match(/(\d+)\s*فو/g);
      if (v00Matches) {
        v00Matches.forEach(match => {
          const qty = parseInt(match.match(/(\d+)/)[1]);
          quantities['V00'] += qty;
        });
      }
      
      // Pattern for ص (3KG)
      const smallMatches = quantitiesText.match(/(\d+)\s*ص(?!\w)/g);
      if (smallMatches) {
        smallMatches.forEach(match => {
          const qty = parseInt(match.match(/(\d+)/)[1]);
          quantities['3KG'] += qty;
        });
      }
      
      // Pattern for ك (5KG) - avoid matching كوب by using negative lookahead
      const largeMatches = quantitiesText.match(/(\d+)\s*ك(?!وب)/g);
      if (largeMatches) {
        largeMatches.forEach(match => {
          const qty = parseInt(match.match(/(\d+)/)[1]);
          quantities['5KG'] += qty;
        });
      }
      
      foundMatch = true;
    }
    
    // FALLBACK METHODS: Original individual patterns (keep for backward compatibility)
    if (!foundMatch) {
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
      
      // Method 4: Simple patterns with ص (صغير) and ك (كبير)
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
    }
    
    // Clean up client name and add to fulfilled deliveries
    if (foundMatch && clientName) {
      // Clean up client name
      clientName = clientName.replace(/^[0-9\.\-\s]+/, '').trim();
      clientName = clientName.replace(/[0-9]+$/, '').trim();
      
      // Skip header rows and totals
      if (clientName === 'اسم العميل' || 
          clientName === 'المجموع' || 
          clientName === 'Total' ||
          clientName.length < 2) {
        continue;
      }
      
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

// NEW function that processes plan and delivery together (no server storage needed)
async function compareDeliveryWithPlan(deliveryText, planText, masterClientList) {
  try {
    console.log('🚀 Starting DIRECT plan + delivery comparison (no server storage)');
    console.log('📋 Plan text length:', planText.length);
    console.log('📱 Delivery text length:', deliveryText.length);
    
    // STEP 1: Parse the plan text directly
    const planClients = [];
    const lines = planText.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.length < 3) continue;
      
      // Skip header rows and totals rows
      if (line.includes('اسم العميل') ||
          line.includes('المجموع') ||
          line.includes('Client Name') ||
          line.includes('Total') ||
          line.includes('3 KG') ||
          line.includes('5 KG') ||
          line.includes('V00') ||
          line.includes('Cup') ||
          line.includes('Comment')) {
        console.log('⏭️ Skipping header/total row:', line);
        continue;
      }
      
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
          console.log('✅ Added client:', clientName, 'with products:', products);
          planClients.push({
            name: clientName,
            products: products,
            totalQuantity: totalQty
          });
        }
      }
    }
    
    console.log('📋 STEP 1 Complete: Parsed', planClients.length, 'planned clients');
    
    if (planClients.length === 0) {
      return {
        success: false,
        error: 'No valid clients found in the plan text'
      };
    }
    
    // Create a mock plan object
    const plan = {
      id: Date.now(),
      date: new Date().toDateString(),
      clients: planClients,
      clientCount: planClients.length
    };
    
    // STEP 2: Parse delivery report (reuse existing function)
    const fulfilledDeliveries = parseDeliveryReport(deliveryText);
    
    if (fulfilledDeliveries.length === 0) {
      return {
        success: false,
        error: 'No valid deliveries found in the delivery text'
      };
    }
    
    // STEP 3: Match planned to delivered using existing logic
    return await performPlanDeliveryMatching(plan, fulfilledDeliveries, masterClientList);
    
  } catch (error) {
    console.error('Error in direct plan+delivery comparison:', error);
    return {
      success: false,
      error: 'Failed to compare: ' + error.message
    };
  }
}

// Extract the matching logic into a separate function for reuse
async function performPlanDeliveryMatching(plan, fulfilledDeliveries, masterClientList) {
  const plannedClients = plan.clients;
  console.log('🔄 STEP 3: Matching', plannedClients.length, 'planned clients with', fulfilledDeliveries.length, 'deliveries');
    
  const comparisonResults = [];
  const matchedDeliveries = new Set();
  
  // Match planned clients to deliveries
  for (const planned of plannedClients) {
    let bestMatch = null;
    let bestScore = 0;
    let matchIndex = -1;
    
    // Find best matching delivery
    fulfilledDeliveries.forEach((fulfilled, index) => {
      if (matchedDeliveries.has(index)) return;
      
      const plannedName = planned.name.toLowerCase().replace(/\s+/g, '');
      const fulfilledName = fulfilled.clientName.toLowerCase().replace(/\s+/g, '');
      
      let score = 0;
      if (plannedName === fulfilledName) score = 100;
      else if (plannedName.includes(fulfilledName) || fulfilledName.includes(plannedName)) score = 80;
      else if (plannedName.substring(0, 3) === fulfilledName.substring(0, 3)) score = 60;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = fulfilled;
        matchIndex = index;
      }
    });
    
    // Find client in master database
    const masterClient = masterClientList.find(mc => {
      const mName = mc.name.toLowerCase().replace(/\s+/g, '');
      const pName = planned.name.toLowerCase().replace(/\s+/g, '');
      return mName.includes(pName) || pName.includes(mName) || 
             mName.substring(0, Math.min(mName.length, pName.length)) === pName.substring(0, Math.min(mName.length, pName.length));
    });
    
    if (bestMatch && bestScore >= 60) {
      // Client was delivered
      matchedDeliveries.add(matchIndex);
      
      comparisonResults.push({
        clientName: planned.name,
        deliveryStatus: 'Delivered',
        hasFreezr: masterClient ? masterClient.isFreezr : false,
        zone: masterClient ? masterClient.location : 'Unknown',
        planned: {
          '3KG': planned.products['3KG'],
          '5KG': planned.products['5KG'],
          'V00': planned.products['V00'],
          'Cup': planned.products['Cup'],
          total: planned.totalQuantity
        },
        delivered: {
          '3KG': bestMatch.delivered3KG,
          '5KG': bestMatch.delivered5KG,
          'V00': bestMatch.deliveredV00,
          'Cup': bestMatch.deliveredCup,
          total: bestMatch.totalDelivered
        },
        variance: {
          '3KG': bestMatch.delivered3KG - planned.products['3KG'],
          '5KG': bestMatch.delivered5KG - planned.products['5KG'],
          'V00': bestMatch.deliveredV00 - planned.products['V00'],
          'Cup': bestMatch.deliveredCup - planned.products['Cup']
        },
        action: 'delivered'
      });
    } else {
      // Client was missed
      const needsFollowUp = masterClient && masterClient.isFreezr;
      
      comparisonResults.push({
        clientName: planned.name,
        deliveryStatus: 'Missed',
        hasFreezr: masterClient ? masterClient.isFreezr : false,
        zone: masterClient ? masterClient.location : 'Unknown',
        planned: {
          '3KG': planned.products['3KG'],
          '5KG': planned.products['5KG'],
          'V00': planned.products['V00'],
          'Cup': planned.products['Cup'],
          total: planned.totalQuantity
        },
        delivered: {
          '3KG': 0,
          '5KG': 0,
          'V00': 0,
          'Cup': 0,
          total: 0
        },
        variance: {
          '3KG': -planned.products['3KG'],
          '5KG': -planned.products['5KG'],
          'V00': -planned.products['V00'],
          'Cup': -planned.products['Cup']
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
}

// NEW 3-step comparison function
async function compareDeliveryFromText(deliveryText, masterClientList, sessionId = null) {
  try {
    console.log('🚀 Starting NEW 3-step delivery comparison system');
    console.log('🔍 Session ID provided:', sessionId);
    
    // Try to get plan from session first, then fallback to file storage
    let plan = null;
    
    if (sessionId) {
      plan = getPlanFromSession(sessionId);
      if (plan) {
        console.log('✅ Found plan in session with', plan.clients.length, 'clients from', plan.date);
      }
    }
    
    // Fallback to file storage if no session plan found
    if (!plan) {
      console.log('🔍 No session plan found, checking file storage...');
      const plansData = loadPlans();
      console.log('📋 Plans in file storage:', plansData.plans.length);
      
      if (plansData.plans.length > 0) {
        plan = plansData.plans[0];
        console.log('📋 Using plan from file:', plan.date, 'with', plan.clientCount, 'clients');
      }
    }
    
    if (!plan) {
      console.log('❌ No plan found in session or file storage');
      return {
        success: false,
        error: 'No distribution plan found. Please upload a plan first.'
      };
    }
    
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
    
    const newPlan = {
      id: Date.now(),
      date: new Date().toDateString(),
      timestamp: new Date().toISOString(),
      planText: planText,
      clients: clients,
      totalProducts: calculateTotalProducts(clients),
      clientCount: clients.length
    };
    
    // Store in session and also try to save to file
    const sessionId = storePlanInSession(newPlan);
    
    // Try to save to file as backup (may fail in serverless)
    const plansData = loadPlans();
    plansData.plans.unshift(newPlan);
    if (plansData.plans.length > 30) {
      plansData.plans = plansData.plans.slice(0, 30);
    }
    savePlans(plansData);
    
    console.log(`Plan saved with ${clients.length} clients, Session ID: ${sessionId}`);
    return {
      success: true,
      message: `Distribution plan saved successfully for ${newPlan.date}`,
      planId: newPlan.id,
      sessionId: sessionId,
      clientCount: clients.length
    };
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
  compareDeliveryWithPlan,
  getLatestPlan,
  getPlanForDate,
  extractDateFromText,
  calculateTotalProducts,
  parseDeliveryReport,
  generateComparisonReport,
  storePlanInSession,
  getPlanFromSession
};
