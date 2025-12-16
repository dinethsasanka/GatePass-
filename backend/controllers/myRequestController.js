
const Request = require("../models/Request");
const User = require("../models/User");

const markItemsAsReturned = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const { serialNumbers, remarks } = req.body;

    console.log('Received request:', { referenceNumber, serialNumbers, remarks });

    // Validation
    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Serial numbers are required and must be a non-empty array"
      });
    }

    // Find the request by reference number
    const request = await Request.findOne({ referenceNumber });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found with this reference number"
      });
    }

    let updatedCount = 0;

    // Update items array - change status to "returned"
    if (request.items && Array.isArray(request.items)) {
      request.items = request.items.map(item => {
        if (serialNumbers.includes(item.serialNo)) {
          updatedCount++;
          return {
            ...item.toObject(),
            status: 'returned',  // Changed from 'return to sender' to 'returned'
            returnDate: new Date(),
            returnRemarks: remarks || undefined
          };
        }
        return item;
      });
    }

    // Initialize returnableItems array if it doesn't exist
    if (!request.returnableItems) {
      request.returnableItems = [];
    }

    // Update or add to returnableItems
    serialNumbers.forEach(serialNo => {
      const existingIndex = request.returnableItems.findIndex(
        ri => ri.serialNo === serialNo
      );

      const itemData = request.items.find(item => item.serialNo === serialNo);

      if (existingIndex !== -1) {
        // Update existing returnable item
        request.returnableItems[existingIndex] = {
          ...request.returnableItems[existingIndex].toObject(),
          status: 'returned',  // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined
        };
      } else if (itemData) {
        // Add new returnable item
        request.returnableItems.push({
          ...itemData.toObject(),
          status: 'returned',  // Changed status
          returned: true,
          returnedDate: new Date(),
          returnRemarks: remarks || undefined
        });
      }
    });

    // Save the updated request
    await request.save();

    console.log(`Successfully marked ${updatedCount} items as returned`);

    return res.status(200).json({
      success: true,
      message: `Successfully marked ${updatedCount} item(s) as returned`,
      updatedCount,
      referenceNumber: request.referenceNumber
    });

  } catch (error) {
    console.error('Error in markItemsAsReturnedController:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while marking items as returned"
    });
  }
};


module.exports = {
  
  markItemsAsReturned

};
