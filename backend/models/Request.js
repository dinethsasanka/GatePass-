const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true },
  itemCode: { type: String },
  itemDescription: { type: String, required: true },
  itemCategory: { type: String, required: true },
  categoryDescription: { type: String, required: true },
  itemPhotos: [
    {
      url: { type: String },
      path: { type: String },
    },
  ],
  itemQuantity: { type: Number, required: true },
  returnDate: { type: Date },
  //status:{ type: String },
  status: {
    type: String,
    enum: [
      "returnable",
      "non-returnable",
      "return to Sender",
      "return to Petrol Leader",
      "return to Out Location Petrol Leader",
      "return to Executive Officer",
      "returned",
    ],
    default: "non-returnable",
  },
});

const TransportSchema = new mongoose.Schema({
  transportMethod: {
    type: String,
    enum: ["By Hand", "Vehicle"],
    required: true,
  },
  transporterType: { type: String, enum: ["SLT", "Non-SLT"], required: true },
  transporterServiceNo: { type: String },
  // Non-SLT transporter details
  nonSLTTransporterName: { type: String },
  nonSLTTransporterNIC: { type: String },
  nonSLTTransporterPhone: { type: String },
  nonSLTTransporterEmail: { type: String },
  // Vehicle details
  vehicleNumber: { type: String },
  vehicleModel: { type: String },
});

const LoadingSchema = new mongoose.Schema({
  loadingType: { type: String, enum: ["Loading", "Unloading"] },
  loadingLocation: { type: String },
  loadingTime: { type: Date },
  // Add new fields for loading/unloading staff
  staffType: { type: String, enum: ["SLT", "Non-SLT"] },
  staffServiceNo: { type: String }, // For SLT staff
  // Non-SLT staff details
  nonSLTStaffName: { type: String },
  nonSLTStaffCompany: { type: String },
  nonSLTStaffNIC: { type: String },
  nonSLTStaffContact: { type: String },
  nonSLTStaffEmail: { type: String },
});

const UnLoadingSchema = new mongoose.Schema({
  loadingType: { type: String, enum: ["Loading", "Unloading"] },
  loadingLocation: { type: String },
  loadingTime: { type: Date },
  // Add new fields for loading/unloading staff
  staffType: { type: String, enum: ["SLT", "Non-SLT"] },
  staffServiceNo: { type: String }, // For SLT staff
  // Non-SLT staff details
  nonSLTStaffName: { type: String },
  nonSLTStaffCompany: { type: String },
  nonSLTStaffNIC: { type: String },
  nonSLTStaffContact: { type: String },
  nonSLTStaffEmail: { type: String },
});

const ReturnableItemSchema = new mongoose.Schema({
  serialNumber: { type: String, required: true },
  itemCode: { type: String },
  itemDescription: { type: String, required: true },
  itemCategory: { type: String, required: true },
  categoryDescription: { type: String, required: true },
  itemQuantity: { type: Number, required: true }, // Changed from returnQuantity
  returnDate: { type: Date }, // Expected return date
  returned: { type: Boolean, default: false }, //  ADD THIS: Track if item has been returned
  returnedDate: { type: Date }, //  ADD THIS: Actual return date
  status: { type: String },
  remarks: { type: String }, // ADD THIS: Any notes about the return
});

const RequestSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, required: true, unique: true },
    employeeServiceNo: { type: String, required: true },
    items: [ItemSchema], // Array of items
    outLocation: { type: String, required: true },
    inLocation: { type: String, required: true },
    executiveOfficerServiceNo: { type: String },
    receiverAvailable: { type: Boolean, required: true },
    status: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      default: 1,
    },
    // 1: Executive Pending
    // 2: Executive Approved
    // 3: Executive Rejected
    // 4: Verify Pending
    // 5: Verify Approved
    // 6: Verify Rejected
    // 7: Dispatch Pending
    // 8: Dispatch Approved
    // 9: Dispatch Rejected
    // 10: Received Pending
    // 11: Received Approved
    // 12: Received Rejected
    // 13: Canceled
    receiverServiceNo: { type: String },

    senderPleaderServiceNo: {
      type: String,
      required: false, // IMPORTANT: keep false so old docs are valid
    },
    receiverPleaderServiceNo: {
      type: String,
      required: false,
    },
    verifyOfficerServiceNo: {
      type: String,
      required: false,
    },
    // Non-SLT destination fields
    isNonSltPlace: { type: Boolean, default: false },
    companyName: { type: String },
    companyAddress: { type: String },
    receiverNIC: { type: String },
    receiverName: { type: String },
    receiverContact: { type: String },
    // End of Non-SLT fields
    transport: TransportSchema,
    loading: LoadingSchema,
    unLoading: UnLoadingSchema,
    returnableItems: [ReturnableItemSchema],
    show: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Request = mongoose.model("Request", RequestSchema);
module.exports = Request;
