const User = require('../models/User');

const getUserByServiceNo = async (req, res) => {
    try {
        const user = await User.findOne({ serviceNo: req.params.serviceNo });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Return only necessary fields
        const userData = {
            serviceNo: user.serviceNo,
            name: user.name,
            designation: user.designation,
            section: user.section,
            group: user.group,
            contactNo: user.contactNo,
            role: user.role,
            email: user.email,
            branches: user.branches
        };
        res.status(200).json(userData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserByRole = async (req, res) => {
    try {
        const { role } = req.params;
        const users = await User.findByRole(role);
        
        const usersData = users.map(user => ({
            serviceNo: user.serviceNo,
            name: user.name,
            designation: user.designation,
            section: user.section,
            group: user.group,
            contactNo: user.contactNo,
            role: user.role,
            email: user.email
        }));
        
        res.status(200).json(usersData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getUserByRoleAndBranch = async (req, res) => {
    try {
        const { branch } = req.params;
        const users = await User.find({ 
            role: 'Pleader', 
            branches: { $in: [branch] } 
        });

        const usersData = users.map(user => ({
            serviceNo: user.serviceNo,
            name: user.name,
            designation: user.designation,
            section: user.section,
            group: user.group,
            contactNo: user.contactNo,
            role: user.role,
            email: user.email
        }));

        res.status(200).json(usersData);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getUserByServiceNo,
    getUserByRole,
    getUserByRoleAndBranch
};
