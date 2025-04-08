#!/usr/bin/env node
const WebSocketServer = require('websocket').server;
const http = require('http');

// Create HTTP server
const server = http.createServer((request, response) => {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

// Start listening on port 8080
server.listen(8080, () => {
    console.log((new Date()) + ' Server is listening on port 8080');
});

// Create the WebSocket server
const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.
    autoAcceptConnections: false
});

// Function to validate connection origins
function originIsAllowed(origin) {
    // In a production environment, you would implement proper origin validation
    // For this example, we'll accept all origins
    return true;
}

// Active connections storage
const connections = new Set();

// Function to generate random sensor data
function generateSensorData() {
    return {
        timestamp: new Date().toISOString(),
        sensors: {
            temperature: parseFloat((Math.random() * 30 + 10).toFixed(1)),
            humidity: parseFloat((Math.random() * 60 + 30).toFixed(1)),
            pressure: parseFloat((Math.random() * 15 + 990).toFixed(1)),
            airQuality: parseFloat((Math.random() * 100).toFixed(1)),
            light: parseFloat((Math.random() * 1000 + 200).toFixed(1))
        }
    };
}

// Function to broadcast data to all connected clients
function broadcastData() {
    if (connections.size > 0) {
        const data = generateSensorData();
        console.log(`Broadcasting data to ${connections.size} clients:`, data);
        
        connections.forEach(connection => {
            if (connection.connected) {
                connection.sendUTF(JSON.stringify(data));
            }
        });
    }
}

// Set interval for data broadcasting (every 2 seconds)
setInterval(broadcastData, 2000);

// Handle WebSocket request
wsServer.on('request', (request) => {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from allowed origins
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    
    // Create a connection
    const connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted from ' + request.origin);
    
    // Add connection to the set
    connections.add(connection);
    
    // Send initial data immediately
    const initialData = generateSensorData();
    connection.sendUTF(JSON.stringify(initialData));
    
    // Handle incoming messages (commands from clients)
    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            try {
                const command = JSON.parse(message.utf8Data);
                console.log('Received command:', command);
                
                // Handle commands from client
                if (command.type === 'get_history') {
                    // Simulate sending historical data
                    const historyData = [];
                    const now = new Date();
                    
                    // Generate 10 historical data points
                    for (let i = 0; i < 10; i++) {
                        const timestamp = new Date(now - (10 - i) * 60000);
                        historyData.push({
                            timestamp: timestamp.toISOString(),
                            sensors: {
                                temperature: parseFloat((Math.random() * 30 + 10).toFixed(1)),
                                humidity: parseFloat((Math.random() * 60 + 30).toFixed(1)),
                                pressure: parseFloat((Math.random() * 15 + 990).toFixed(1)),
                                airQuality: parseFloat((Math.random() * 100).toFixed(1)),
                                light: parseFloat((Math.random() * 1000 + 200).toFixed(1))
                            }
                        });
                    }
                    
                    connection.sendUTF(JSON.stringify({
                        type: 'history_data',
                        data: historyData
                    }));
                }
            } catch (e) {
                console.log('Error processing message:', e);
            }
        }
    });
    
    // Handle connection close
    connection.on('close', (reasonCode, description) => {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        // Remove from connections set
        connections.delete(connection);
    });
});