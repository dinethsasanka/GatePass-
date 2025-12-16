const Request = require("../models/Request");
const Status = require("../models/Status");
const { uploadImage, getImage } = require("../utils/imageUpload");
const { emitNewRequest } = require("../utils/socketEmitter");

const createRequest = async (req, res) => {
  try {
    console.log('📥 Received request body:', req.body);
    console.log('📁 Received files:', req.files?.length || 0);

    const {
      items,
      outLocation,
      inLocation,
      executiveOfficerServiceNo,
      receiverAvailable,
      receiverServiceNo,
      isNonSltPlace,
      companyName,
      companyAddress,
      receiverNIC,
      receiverName,
      receiverContact,
      transportMethod,
      transporterType,
      transporterServiceNo,
      nonSLTTransporterName,
      nonSLTTransporterNIC,
      nonSLTTransporterPhone,
      nonSLTTransporterEmail,
      vehicleNumber,
      vehicleModel,
    } = req.body;

    const referenceNumber = `REQ-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    
    const parsedItems = JSON.parse(items);
    console.log('📦 Parsed items:', parsedItems.length);

    // Process items with images
    const processedItems = await processCSVItems(parsedItems, req.files);
    console.log('✅ Processed items:', processedItems.length);

    // ✅ Filter and create returnableItems array
    const returnableItems = processedItems
      .filter(item => item.itemReturnable === true)
      .map(item => ({
        itemName: item.itemName,
        serialNo: item.serialNo,
        itemCategory: item.itemCategory,
        itemModel: item.itemModel,
        itemQuantity: item.itemQuantity,
        returnDate: item.returnDate || null,
        returned: false,
        returnedDate: null,
        status: item.status,
        remarks: ""
      }));

    console.log('🔄 Returnable items:', returnableItems.length);

    const requestData = {
      referenceNumber,
      employeeServiceNo: req.user.serviceNo,
      items: processedItems,
      returnableItems: returnableItems,
      outLocation,
      inLocation,
      executiveOfficerServiceNo,
      receiverAvailable,
      receiverServiceNo: receiverServiceNo || null,
    };

    // Add Non-SLT destination fields if applicable
    if (isNonSltPlace === "true" || isNonSltPlace === true) {
      requestData.isNonSltPlace = true;
      requestData.companyName = companyName;
      requestData.companyAddress = companyAddress;
      requestData.receiverNIC = receiverNIC;
      requestData.receiverName = receiverName;
      requestData.receiverContact = receiverContact;
    }

    // Add transport details if provided
    if (transportMethod) {
      const transportData = {
        transportMethod,
      };

      if (transportMethod === "Vehicle") {
        transportData.transporterType = transporterType;

        if (transporterType === "SLT") {
          transportData.transporterServiceNo = transporterServiceNo;
        } else {
          transportData.nonSLTTransporterName = nonSLTTransporterName;
          transportData.nonSLTTransporterNIC = nonSLTTransporterNIC;
          transportData.nonSLTTransporterPhone = nonSLTTransporterPhone;
          transportData.nonSLTTransporterEmail = nonSLTTransporterEmail;
        }

        transportData.vehicleNumber = vehicleNumber;
        transportData.vehicleModel = vehicleModel;
      }
      
      if (transportMethod === "By Hand") {
        transportData.transporterType = transporterType;

        if (transporterType === "SLT") {
          transportData.transporterServiceNo = transporterServiceNo;
        } else {
          transportData.nonSLTTransporterName = nonSLTTransporterName;
          transportData.nonSLTTransporterNIC = nonSLTTransporterNIC;
          transportData.nonSLTTransporterPhone = nonSLTTransporterPhone;
          transportData.nonSLTTransporterEmail = nonSLTTransporterEmail;
        }
      }
      
      requestData.transport = transportData;
    }

    console.log('💾 Creating request in database...');
    const request = await Request.create(requestData);
    console.log('✅ Request created:', request.referenceNumber);

    // Create pending status for the new request
    const newStatus = new Status({
      referenceNumber,
      executiveOfficerServiceNo,
      executiveOfficerStatus: 1,
      request: request._id,
    });

    await newStatus.save();
    console.log('✅ Status created');

    // Emit real-time event for new request
    const io = req.app.get("io");
    if (io) {
      emitNewRequest(io, request);
      console.log('📡 Real-time event emitted');
    }

    res.status(201).json({
      referenceNumber,
      request,
      status: newStatus,
    });
  } catch (error) {
    console.error("❌ Create request error:", error);
    res.status(400).json({ 
      message: error.message,
      details: error.toString()
    });
  }
};

// ⭐ CORRECTED processCSVItems function
const processCSVItems = async (csvItems, files) => {
  // Create a map to group files by their original names if files exist
  const fileMap = {};
  if (files && files.length > 0) {
    files.forEach((file) => {
      fileMap[file.originalname] = file;
    });
    console.log('📎 File map created with', Object.keys(fileMap).length, 'files');
  }

  return Promise.all(
    csvItems.map(async (item, index) => {
      const itemPhotos = [];

      // Process photos for this specific item if they exist
      if (item.originalFileNames && item.originalFileNames.length > 0) {
        console.log(`📸 Processing ${item.originalFileNames.length} photos for item ${index + 1}`);
        
        for (const fileName of item.originalFileNames) {
          const file = fileMap[fileName];
          if (file) {
            try {
              // ⭐ uploadImage returns { url: '...', path: '...' }
              const uploadedImage = await uploadImage(file, "items");
              
              // ⭐ CRITICAL: Verify the structure before pushing
              if (uploadedImage && uploadedImage.url && uploadedImage.path) {
                itemPhotos.push(uploadedImage);
                console.log(`✅ Uploaded image for item ${index + 1}:`, uploadedImage.url);
              } else {
                console.error(`❌ Invalid image object structure:`, uploadedImage);
              }
            } catch (error) {
              console.error(`❌ Error uploading image ${fileName}:`, error);
            }
          } else {
            console.warn(`⚠️ File not found in fileMap: ${fileName}`);
          }
        }
      }

      // Determine if item is returnable
      const isReturnable = item.itemReturnable === true ||
            item.itemReturnable === 'true' ||
            item.itemReturnable === 'Yes' ||
            item.itemReturnable === 'yes';

      const processedItem = {
        itemName: item.itemName,
        serialNo: item.serialNo,
        itemCategory: item.itemCategory,
        itemReturnable: isReturnable,
        itemQuantity: parseInt(item.itemQuantity || item.qty) || 1,
        itemModel: item.itemModel || "",
        returnDate: item.returnDate || null,
        // ⭐ itemPhotos is now correctly an array of { url, path } objects
        itemPhotos: itemPhotos,
        status: isReturnable ? "returnable" : "non-returnable",
      };

      console.log(`✅ Processed item ${index + 1}:`, {
        name: processedItem.itemName,
        photos: processedItem.itemPhotos.length
      });

      return processedItem;
    })
  );
};

const getRequests = async (req, res) => {
  try {
    const requests = await Request.find();
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Request by EmployeeServiceNo
const getRequestByEmployeeServiceNo = async (req, res) => {
  try {
    const requests = await Request.find({
      employeeServiceNo: req.params.serviceNo,
    });
    if (!requests.length) {
      return res.status(404).json({ message: "No requests found" });
    }
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Request
const updateRequest = async (req, res) => {
  try {
    const {
      items,
      outLocation,
      inLocation,
      executiveOfficerName,
      receiverAvailable,
      receiverServiceNo,
    } = req.body;

    // Handle item photos upload for updated items
    const parsedItems = JSON.parse(items);
    const processedItems = await Promise.all(
      parsedItems.map(async (item, index) => {
        const photos = [...(item.itemPhotos || [])];
        if (req.files && req.files.length > 0) {
          const itemFiles = req.files.filter(
            (file) => file.fieldname === `itemPhotos_${index}`
          );
          for (const file of itemFiles) {
            const uploadedImage = await uploadImage(file, "items");
            photos.push(uploadedImage);
          }
        }
        return { ...item, itemPhotos: photos };
      })
    );

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      {
        items: processedItems,
        outLocation,
        inLocation,
        executiveOfficerName,
        receiverAvailable,
        receiverServiceNo,
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(updatedRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Request
const deleteRequest = async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Request Status
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(updatedRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Requests by Status
const getRequestsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const requests = await Request.find({ status: parseInt(status) });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Requests by Item Returnable Status
const getRequestsByItemReturnable = async (req, res) => {
  try {
    const { returnable } = req.params;
    const requests = await Request.find({
      "items.itemReturnable": returnable === "true",
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Requests by Receiver Available Status
const getRequestsByReceiverAvailable = async (req, res) => {
  try {
    const { available } = req.params;
    const requests = await Request.find({
      receiverAvailable: available === "true",
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRequestImage = async (req, res) => {
  try {
    const { path } = req.params;
    const imageUrl = await getImage(decodeURIComponent(path));
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Failed to get image URL" });
  }
};

const updateExecutiveOfficer = async (req, res) => {
  try {
    const { executiveOfficerServiceNo } = req.body;
    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { executiveOfficerServiceNo },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }

    const updateExServiceNo = await Status.findOneAndUpdate(
      { request: req.params.id },
      { executiveOfficerServiceNo: executiveOfficerServiceNo },
      { new: true }
    );

    res.json({ updatedRequest, updateExServiceNo });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { referenceNumber } = req.params;

    const request = await Request.findOneAndUpdate(
      { referenceNumber, status: 1 },
      { status: 13, show: false },
      { new: true }
    );

    if (!request) {
      return res
        .status(404)
        .json({ message: "Request not found or cannot be canceled" });
    }

    res.json({ message: "Request canceled successfully", request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestImage,
  getRequestByEmployeeServiceNo,
  updateRequest,
  deleteRequest,
  updateRequestStatus,
  getRequestsByStatus,
  getRequestsByItemReturnable,
  getRequestsByReceiverAvailable,
  updateExecutiveOfficer,
  cancelRequest,
};