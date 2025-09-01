const express = require('express');
const Account = require('../models/Account');

const router = express.Router();

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching accounts' });
  }
});

// Create a new account
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and name are required' 
      });
    }
    
    // Check if account already exists
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Account with this email already exists' 
      });
    }
    
    const account = await Account.create({ 
      email, 
      password, 
      name, 
      role: role || 'user' 
    });
    
    // Return account without password
    const accountData = account.toObject();
    delete accountData.password;
    
    res.status(201).json({ success: true, data: accountData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating account' });
  }
});

// Update an account
router.put('/:id', async (req, res) => {
  try {
    const { email, password, name, role, isActive } = req.body;
    const updateData = {};
    
    if (email !== undefined) updateData.email = email;
    if (password !== undefined) updateData.password = password;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Check if email is being updated and if it already exists
    if (email) {
      const existingAccount = await Account.findOne({ email, _id: { $ne: req.params.id } });
      if (existingAccount) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }
    
    const account = await Account.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating account' });
  }
});

// Delete an account
router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findByIdAndDelete(req.params.id);
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting account' });
  }
});

// Get account by email
router.get('/email/:email', async (req, res) => {
  try {
    const account = await Account.findOne({ email: req.params.email }).select('-password');
    
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching account' });
  }
});

module.exports = router;
