const mongoose = require("mongoose");

const StatusSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, required: true },
    executiveOfficerServiceNo: { type: String },
    executiveOfficerComment: { type: String},
    executiveOfficerStatus: { type: Number }, //1: Pending 2: Approved 3: Rejected
    verifyOfficerServiceNumber: { type: String},
    verifyOfficerComment: { type: String},
    verifyOfficerStatus: { type: Number },  //1: Pending 2: Approved 3: Rejected
    // dispachOfficerServiceNumber: { type: String},
    // dispachOfficerComment: { type: String},
    // dispachOfficerStatus: { type: Number }, //1: Pending 2: Approved 3: Rejected
    recieveOfficerServiceNumber: { type: String},
    recieveOfficerComment: { type: String},
    recieveOfficerStatus: { type: Number }, //1: Pending 2: Approved 3: Rejected
    comment: { type: String},
    beforeStatus: { type: Number },  
    afterStatus: { type: Number },   

    request: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true,
    }, //refID
  },
  { timestamps: true }
);

const Status = mongoose.model("Status", StatusSchema);
module.exports = Status;