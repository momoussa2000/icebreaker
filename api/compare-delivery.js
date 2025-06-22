// Import necessary functions from the main application
const { loadClientList } = require('../clients');
const { compareDeliveryWithPlan } = require('../plan-comparison');

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "POST only" });
  }

  const { deliveryText, planText } = req.body;

  if (!deliveryText || !planText) {
    return res.status(400).json({ success: false, error: "Both deliveryText and planText are required" });
  }

  try {
    // Load client master list (204 clients with freezer status)
    const clientList = loadClientList();

    // Run the comparison logic (deliveryText, planText, clientList)
    const result = await compareDeliveryWithPlan(deliveryText, planText, clientList);

    // Check if the comparison was successful
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      result: {
        formattedOutput: result.comparison, // The formatted text report
        summary: {
          totalPlanned: result.stats.plannedClients,
          totalDelivered: result.stats.delivered,
          missed: result.stats.missed,
          extras: result.stats.unplanned,
          fulfillmentRate: Math.round((result.stats.delivered / (result.stats.delivered + result.stats.missed)) * 100) || 0
        },
        deliveredClients: result.comparisonResults.filter(r => r.deliveryStatus === 'Delivered'),
        missedClients: result.comparisonResults.filter(r => r.deliveryStatus === 'Missed'),
        unplannedDeliveries: result.comparisonResults.filter(r => r.deliveryStatus === 'Unplanned'),
        urgentFollowUps: result.comparisonResults.filter(r => r.action === 'urgent_followup'),
        planDate: result.planDate,
        deliveryDate: result.deliveryDate,
        timestamp: result.timestamp
      },
    });
  } catch (err) {
    console.error("Comparison Error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
} 