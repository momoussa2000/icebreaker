// Self-contained Vercel serverless function for delivery comparison
// No external dependencies to avoid import issues

// Minimal client list for testing (you can expand this)
const defaultClients = [
  { name: "سوبر ماركت العزبي", location: "6th'October (C4)", isFreezr: true },
  { name: "سوبر ماركت الجمعة", location: "6th'October (C4)", isFreezr: false },
  { name: "بيزكس ستي فيو", location: "6th'October (C4)", isFreezr: true },
  { name: "نوي", location: "6th'October (C4)", isFreezr: true },
  { name: "فوو زايد", location: "6th'October (C4)", isFreezr: true },
  { name: "هايبر الشيخ", location: "Sheikh Zayed (C5)", isFreezr: false },
  { name: "كارفور مول", location: "New Cairo (C6)", isFreezr: true }
];

// Parse delivery text to extract deliveries
function parseDeliveryReport(deliveryText) {
  const deliveries = [];
  const lines = deliveryText.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.length < 3) continue;
    
    let clientName = '';
    let quantities = { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 };
    let foundMatch = false;
    
    // Handle Arabic patterns
    const smallMatch = line.match(/(.+?)\s*(\d+)\s*صغير/i);
    if (smallMatch) {
      clientName = smallMatch[1].trim();
      quantities['3KG'] = parseInt(smallMatch[2]) || 0;
      foundMatch = true;
    }
    
    const largeMatch = line.match(/(.+?)\s*(\d+)\s*كبير/i);
    if (largeMatch) {
      if (!clientName) clientName = largeMatch[1].trim();
      quantities['5KG'] = parseInt(largeMatch[2]) || 0;
      foundMatch = true;
    }
    
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
    
    if (foundMatch && clientName) {
      clientName = clientName.replace(/^[0-9\.\-\s]+/, '').trim();
      const totalDelivered = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
      
      if (clientName.length > 1 && totalDelivered > 0) {
        deliveries.push({
          clientName,
          delivered3KG: quantities['3KG'],
          delivered5KG: quantities['5KG'],
          deliveredV00: quantities['V00'],
          deliveredCup: quantities['Cup'],
          totalDelivered
        });
      }
    }
  }
  
  return deliveries;
}

// Parse plan text
function parsePlanText(planText) {
  const planClients = [];
  const lines = planText.split('\n');
  
  for (let line of lines) {
    line = line.trim();
    if (!line || line.length < 3) continue;
    
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
        planClients.push({
          name: clientName,
          products,
          totalQuantity: totalQty
        });
      }
    }
  }
  
  return planClients;
}

// Simple comparison logic
function compareDeliveries(planClients, deliveries, masterClients) {
  const results = [];
  const matchedDeliveries = new Set();
  
  // Match planned to delivered
  for (const planned of planClients) {
    let bestMatch = null;
    let bestScore = 0;
    let matchIndex = -1;
    
    deliveries.forEach((delivered, index) => {
      if (matchedDeliveries.has(index)) return;
      
      const pName = planned.name.toLowerCase().replace(/\s+/g, '');
      const dName = delivered.clientName.toLowerCase().replace(/\s+/g, '');
      
      let score = 0;
      if (pName === dName) score = 100;
      else if (pName.includes(dName) || dName.includes(pName)) score = 80;
      else if (pName.substring(0, 3) === dName.substring(0, 3)) score = 60;
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = delivered;
        matchIndex = index;
      }
    });
    
    const masterClient = masterClients.find(mc => {
      const mName = mc.name.toLowerCase().replace(/\s+/g, '');
      const pName = planned.name.toLowerCase().replace(/\s+/g, '');
      return mName.includes(pName) || pName.includes(mName);
    });
    
    if (bestMatch && bestScore >= 60) {
      matchedDeliveries.add(matchIndex);
      results.push({
        clientName: planned.name,
        deliveryStatus: 'Delivered',
        hasFreezr: masterClient?.isFreezr || false,
        zone: masterClient?.location || 'Unknown',
        planned: planned.products,
        delivered: {
          '3KG': bestMatch.delivered3KG,
          '5KG': bestMatch.delivered5KG,
          'V00': bestMatch.deliveredV00,
          'Cup': bestMatch.deliveredCup
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
      results.push({
        clientName: planned.name,
        deliveryStatus: 'Missed',
        hasFreezr: masterClient?.isFreezr || false,
        zone: masterClient?.location || 'Unknown',
        planned: planned.products,
        delivered: { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 },
        variance: {
          '3KG': -planned.products['3KG'],
          '5KG': -planned.products['5KG'],
          'V00': -planned.products['V00'],
          'Cup': -planned.products['Cup']
        },
        action: (masterClient?.isFreezr) ? 'urgent_followup' : 'followup'
      });
    }
  }
  
  // Add unplanned deliveries
  deliveries.forEach((delivery, index) => {
    if (!matchedDeliveries.has(index)) {
      const masterClient = masterClients.find(mc => {
        const mName = mc.name.toLowerCase().replace(/\s+/g, '');
        const dName = delivery.clientName.toLowerCase().replace(/\s+/g, '');
        return mName.includes(dName) || dName.includes(mName);
      });
      
      results.push({
        clientName: delivery.clientName,
        deliveryStatus: 'Unplanned',
        hasFreezr: masterClient?.isFreezr || false,
        zone: masterClient?.location || 'Unknown',
        planned: { '3KG': 0, '5KG': 0, 'V00': 0, 'Cup': 0 },
        delivered: {
          '3KG': delivery.delivered3KG,
          '5KG': delivery.delivered5KG,
          'V00': delivery.deliveredV00,
          'Cup': delivery.deliveredCup
        },
        variance: {
          '3KG': delivery.delivered3KG,
          '5KG': delivery.delivered5KG,
          'V00': delivery.deliveredV00,
          'Cup': delivery.deliveredCup
        },
        action: 'review'
      });
    }
  });
  
  return results;
}

// Generate formatted report
function generateReport(results) {
  const delivered = results.filter(r => r.deliveryStatus === 'Delivered');
  const missed = results.filter(r => r.deliveryStatus === 'Missed');
  const unplanned = results.filter(r => r.deliveryStatus === 'Unplanned');
  const urgent = missed.filter(r => r.action === 'urgent_followup');
  
  let report = `📊 Plan vs Actual Delivery Comparison\n`;
  report += `📅 Date: ${new Date().toDateString()}\n\n`;
  
  report += `✅ DELIVERED CLIENTS (${delivered.length}):\n`;
  delivered.forEach(client => {
    const freezerIcon = client.hasFreezr ? ' 🧊' : '';
    report += `• ${client.clientName}${freezerIcon} - ${client.zone}\n`;
    report += `  Planned: 3KG:${client.planned['3KG']}, 5KG:${client.planned['5KG']}\n`;
    report += `  Delivered: 3KG:${client.delivered['3KG']}, 5KG:${client.delivered['5KG']}\n\n`;
  });
  
  report += `❌ MISSED CLIENTS (${missed.length}):\n`;
  missed.forEach(client => {
    const freezerIcon = client.hasFreezr ? ' 🧊' : '';
    const urgentIcon = client.action === 'urgent_followup' ? ' ⚠️ URGENT' : '';
    report += `• ${client.clientName}${freezerIcon} - ${client.zone}${urgentIcon}\n`;
    report += `  Planned: 3KG:${client.planned['3KG']}, 5KG:${client.planned['5KG']} - NOT DELIVERED\n\n`;
  });
  
  if (unplanned.length > 0) {
    report += `📦 UNPLANNED DELIVERIES (${unplanned.length}):\n`;
    unplanned.forEach(client => {
      const freezerIcon = client.hasFreezr ? ' 🧊' : '';
      report += `• ${client.clientName}${freezerIcon} - ${client.zone}\n`;
      report += `  Delivered: 3KG:${client.delivered['3KG']}, 5KG:${client.delivered['5KG']} (NOT PLANNED)\n\n`;
    });
  }
  
  const fulfillmentRate = delivered.length + missed.length > 0 ? 
    Math.round((delivered.length / (delivered.length + missed.length)) * 100) : 0;
  
  report += `📈 SUMMARY:\n`;
  report += `• Planned clients: ${delivered.length + missed.length}\n`;
  report += `• Delivered: ${delivered.length}\n`;
  report += `• Missed: ${missed.length}\n`;
  report += `• Unplanned: ${unplanned.length}\n`;
  report += `• Success rate: ${fulfillmentRate}%\n`;
  
  if (urgent.length > 0) {
    report += `\n⚠️ URGENT FOLLOW-UPS:\n`;
    urgent.forEach(client => {
      report += `• ${client.clientName} 🧊 - Freezer client missed!\n`;
    });
  }
  
  return report;
}

// Main serverless function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST only" });
  }

  try {
    const { deliveryText, planText } = req.body;

    if (!deliveryText || !planText) {
      return res.status(400).json({ 
        success: false, 
        error: "Both deliveryText and planText are required" 
      });
    }

    // Parse inputs
    const planClients = parsePlanText(planText);
    const deliveries = parseDeliveryReport(deliveryText);
    
    if (planClients.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid clients found in plan text"
      });
    }
    
    if (deliveries.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid deliveries found in delivery text"
      });
    }

    // Compare
    const results = compareDeliveries(planClients, deliveries, defaultClients);
    const formattedOutput = generateReport(results);
    
    const delivered = results.filter(r => r.deliveryStatus === 'Delivered');
    const missed = results.filter(r => r.deliveryStatus === 'Missed');
    const unplanned = results.filter(r => r.deliveryStatus === 'Unplanned');
    const urgent = results.filter(r => r.action === 'urgent_followup');

    return res.status(200).json({
      success: true,
      result: {
        formattedOutput,
        summary: {
          totalPlanned: planClients.length,
          totalDelivered: delivered.length,
          missed: missed.length,
          extras: unplanned.length,
          fulfillmentRate: delivered.length + missed.length > 0 ? 
            Math.round((delivered.length / (delivered.length + missed.length)) * 100) : 0
        },
        deliveredClients: delivered,
        missedClients: missed,
        unplannedDeliveries: unplanned,
        urgentFollowUps: urgent,
        planDate: new Date().toDateString(),
        deliveryDate: new Date().toDateString(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error("Serverless function error:", err);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error",
      details: err.message
    });
  }
} 