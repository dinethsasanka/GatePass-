const Request = require("../models/Request");

// // Create a new item
// exports.createItem = async (req, res) => {
//     try {
//         const newItem = new Item(req.body);
//         const savedItem = await newItem.save();
//         res.status(201).json(savedItem);
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };

// // Get all items
// exports.getAllItems = async (req, res) => {
//     try {
//         const items = await Item.find();
//         res.json(items);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// // Get returnable items (for item tracker page)
// exports.getReturnableItems = async (req, res) => {
//     try {
//         const returnableItems = await Item.find({ itemReturnable: true });
//         res.json(returnableItems);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };


exports.GetItemForTracking = async(req,res) => {
    try{
        const returnableItems = await Request.find({ "items": { $elemMatch: { "itemReturnable": true } } });
        res.json(returnableItems);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}