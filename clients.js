const fs = require('fs');
const path = require('path');

// Use /tmp directory for serverless environments, fallback to current directory for local
const CLIENTS_FILE = process.env.VERCEL ? '/tmp/client_master_list.json' : 'client_master_list.json';

// Load client list from file
function loadClientList() {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      const data = fs.readFileSync(CLIENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading client list:', error);
    return [];
  }
}

// Save client list to file
function saveClientList(clients) {
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving client list:', error);
    return false;
  }
}

// Add new client
function addClient(name, location, isFreezr = false, notes = '') {
  const clients = loadClientList();
  const newClient = {
    id: Date.now(),
    name: name.trim(),
    location: location.trim(),
    isFreezr: isFreezr,
    notes: notes,
    lastVisited: null,
    addedDate: new Date().toISOString()
  };
  
  clients.push(newClient);
  saveClientList(clients);
  return newClient;
}

// Update client last visited date
function updateClientVisit(clientName, date = null) {
  const clients = loadClientList();
  const client = clients.find(c => 
    c.name.toLowerCase().includes(clientName.toLowerCase()) ||
    clientName.toLowerCase().includes(c.name.toLowerCase())
  );
  
  if (client) {
    client.lastVisited = date || new Date().toISOString();
    saveClientList(clients);
    return client;
  }
  return null;
}

// Get clients not visited in X days
function getUnvisitedClients(days = 7) {
  const clients = loadClientList();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return clients.filter(client => {
    if (!client.lastVisited) return true; // Never visited
    return new Date(client.lastVisited) < cutoffDate;
  });
}

// Get formatted client list for prompt
function getClientListForPrompt() {
  const clients = loadClientList();
  return clients.map(client => 
    `${client.name} - ${client.location}${client.isFreezr ? ' (FREEZER)' : ''}`
  ).join('\n');
}

// Convert CSV-like JSON structure to proper client format
function convertCsvJsonToClients() {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) {
      return { success: false, error: 'Client file not found' };
    }

    const data = fs.readFileSync(CLIENTS_FILE, 'utf8');
    const importedData = JSON.parse(data);
    
    if (!Array.isArray(importedData)) {
      return { success: false, error: 'Invalid data format' };
    }

    const convertedClients = [];
    let convertedCount = 0;

    importedData.forEach((row, index) => {
      // Skip header row or invalid rows
      if (index === 0 || !row['Unnamed: 3'] || row['Unnamed: 3'] === "إسم'العميل") {
        return;
      }

      const clientName = row['Unnamed: 3']?.trim();
      const district = row['Unnamed: 2']?.trim();
      const zone = row['Unnamed: 1']?.trim();
      const clientType = row['Unnamed: 4']?.trim();
      const numFreezers = row['Unnamed: 10'];
      const freezerType = row['Unnamed: 11'];

      if (clientName && clientName !== '') {
        const normalizedClient = {
          id: Date.now() + Math.random() + index,
          name: clientName,
          location: district ? `${district} (${zone})` : zone || 'Unknown',
          clientType: clientType || 'Unknown',
          isFreezr: numFreezers && (numFreezers.toString().includes('1') || numFreezers.toString().includes('2')),
          freezerType: freezerType || '',
          notes: `Zone: ${zone}, Type: ${clientType}`,
          lastVisited: null,
          addedDate: new Date().toISOString()
        };

        // Check for duplicates
        const exists = convertedClients.find(existing => 
          existing.name.toLowerCase().trim() === normalizedClient.name.toLowerCase().trim()
        );

        if (!exists) {
          convertedClients.push(normalizedClient);
          convertedCount++;
        }
      }
    });

    // Save converted clients
    saveClientList(convertedClients);
    
    return {
      success: true,
      imported: convertedCount,
      total: importedData.length - 1, // Exclude header
      skipped: (importedData.length - 1) - convertedCount
    };
  } catch (error) {
    console.error('Conversion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Import clients from external JSON file
function importClientsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const importedData = JSON.parse(data);
    
    // Handle different JSON formats
    let clientsToImport = [];
    
    if (Array.isArray(importedData)) {
      clientsToImport = importedData;
    } else if (importedData.clients && Array.isArray(importedData.clients)) {
      clientsToImport = importedData.clients;
    } else {
      throw new Error('Invalid JSON format. Expected array of clients or object with clients array.');
    }

    const existingClients = loadClientList();
    let importedCount = 0;

    clientsToImport.forEach(client => {
      // Normalize the client data
      const normalizedClient = {
        id: client.id || Date.now() + Math.random(),
        name: client.name || client.clientName || client.client_name || '',
        location: client.location || client.area || client.address || '',
        isFreezr: client.isFreezr || client.isFreezer || client.freezer || false,
        notes: client.notes || client.description || '',
        lastVisited: client.lastVisited || client.last_visited || null,
        addedDate: client.addedDate || new Date().toISOString()
      };

      // Check if client already exists (by name)
      const exists = existingClients.find(existing => 
        existing.name.toLowerCase().trim() === normalizedClient.name.toLowerCase().trim()
      );

      if (!exists && normalizedClient.name) {
        existingClients.push(normalizedClient);
        importedCount++;
      }
    });

    saveClientList(existingClients);
    return {
      success: true,
      imported: importedCount,
      total: clientsToImport.length,
      skipped: clientsToImport.length - importedCount
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  loadClientList,
  saveClientList,
  addClient,
  updateClientVisit,
  getUnvisitedClients,
  getClientListForPrompt,
  importClientsFromFile,
  convertCsvJsonToClients
}; 