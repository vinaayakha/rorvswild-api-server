const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const auth = require('basic-auth');
require('dotenv').config()
// Initialize Express app
const app = express();

// Body parser middleware
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Define Schema for tenants
const tenantSchema = new mongoose.Schema({
  id: String,
  name: String,  
  apiKey: String
});
// Define Model for tenants
const Tenant = mongoose.model('Tenant', tenantSchema);

const metricSchema = new mongoose.Schema({
    path: String,
    data: Object,
    tenant_id: String 
});
  
// Define Model for metrics
const Metric = mongoose.model('Metric', metricSchema);

// Middleware for basic authentication with API key
const basicAuth = async (req, res, next) => {
  const credentials = auth(req);
  const apiKey = credentials ? credentials.pass : null;
  try {
    const tenant = await Tenant.findOne({ apiKey });
    if (!tenant) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      req.tenant = tenant;  
      next();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST route to handle all incoming data and save to metrics collection
app.post("*", basicAuth, async (req, res) => {
  try {
    const newData = req.body; // Assuming data is sent in the request body
    // Your logic to save data to MongoDB
    const metric = new Metric({ data: newData, path: req.path, tenant_id: req.tenant.id });
    await metric.save();
    res.status(201).json({ message: 'Data saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Start server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
