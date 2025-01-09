const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://aquads.netlify.app/'
    : 'http://localhost:5001'
})); 