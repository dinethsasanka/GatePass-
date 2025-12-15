const express = require('express');
const router = express.Router();
const Request = require('../models/Request'); // Importing the Request model

// Get requests where receiverAvailable is true
// const getReicept = async (req, res)  => {
//     try {
//         const receipts = await Request.find({ receiverAvailable: true }, 'referenceNumber executiveOfficerName createdAt');
        
//         const formattedReceipts = receipts.map(receipt => ({
//             refNo: receipt.referenceNumber,
//             name: receipt.executiveOfficerName,
//             createdAt: receipt.createdAt
//         }));

//         res.status(200).json(formattedReceipts);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching receipts', error });
//     }
// };

const getReicept = async (req, res) => {
    try {
        const requests = await Request.find();
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getReicept
};

