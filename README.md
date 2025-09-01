# 🤖 Chat Bot - Personal Digital Companion

A conversational AI chatbot built with **Gemini API**, **Node.js**, **React**, and **MongoDB** that acts as a natural language interface for task management and account operations.

## ✨ Features

### 🎯 **Smart Natural Language Processing**
- Understands user requests in plain English
- Extracts relevant entities automatically
- Asks follow-up questions when details are missing
- Maintains conversational context throughout multi-step operations

### 📝 **To-Do  Management (CRUD)**
- **Create Task**: "Add a task", "Create a todo", "Add task to my list"
- **Read Tasks**: "list the tasks", "What's on my todo list?"
- **Update Task**: "Mark the task as completed", "Toggle the task status"
- **Delete Task**: "Delete the task", "Remove buy milk from my list"

### 👤 **Account Management (CRUD)**
- **Create User**: "Create a new account", "Sign me up"
- **Change Password**: "Reset the password", "Change my password"
- **Update User**: "Update role to admin", "Change my account details"
- **Delete User**: "Delete my account", "Remove account"

### 💬 **Conversational AI**
- Friendly, helpful, and professional personality
- Uses emojis and natural language
- Handles general greetings and casual conversations
- Explains technical concepts (e.g., "explain about LLM")

## 🏗️ **Architecture**

### **Backend (Node.js + Express)**
```
backend/
├── config/
│   └── db.js          # MongoDB connection
├── models/
│   ├── Account.js     # User account schema
│   └── Todo.js        # Todo item schema
├── routes/
│   ├── accounts.js    # Account CRUD API
│   ├── todos.js       # Todo CRUD API
│   └── chat.js        # AI chat processing
└── server.js          # Main server file
```

### **Frontend (React)**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Chat.jsx    # Main chat interface
│   │   ├── Todos.jsx   # Todo management UI
│   │   └── Accounts.jsx # Account management UI
│   ├── context/
│   │   └── ChatContext.jsx # Global chat state
│   └── lib/
│       └── auth.jsx    # Authentication utilities
```

## 🚀 **Getting Started**

### **Prerequisites**
- react (frontend)
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Google Gemini API key

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CHAT-BOT
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Add your MONGODB_URI and GEMINI_API_KEY to .env
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Database Setup**
   - **Local MongoDB**: Start MongoDB service
   - **MongoDB Atlas**: Add your connection string to `.env`

### **Environment Variables**
   ```env
MONGODB_URI=mongodb://127.0.0.1:27017/chat-bot
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   ```

## 🔧 **Technical Implementation**

### **AI Processing Flow**
1. **Intent Detection**: Uses Gemini API + fallback heuristic parsing
2. **Entity Extraction**: Automatically identifies emails, task titles, etc.
3. **Missing Information**: Asks follow-up questions when needed
4. **Action Execution**: Performs CRUD operations via backend APIs
5. **Response Generation**: Creates natural, friendly responses

### **Conversational State Management**
- **Pending Operations**: Tracks multi-step operations

#### **Account Schema**
```javascript
{
  email: String,        // Unique email address
  password: String,     // Hashed password
  name: String,         // Username
  role: String,         // User role (default: 'user')
  isActive: Boolean,    // Account status
  timestamps: Date      // Created/updated timestamps
}
```

#### **Todo Schema**
```javascript
{
  title: String,        // Task title
  description: String,  // Task description
  status: String,       // Task status
  priority: String,     // Priority level
  dueDate: Date,        // Due date
  isCompleted: Boolean, // Completion status
  completedAt: Date,    // Completion timestamp
  timestamps: Date      // Created/updated timestamps
}
```

## 🎭 **Bot Personality & Behavior**

### **Core Traits**
- **Friendly & Helpful**: Welcoming and supportive
- **Professional**: Maintains business-like efficiency
- **Empathetic**: Understands user context and needs
- **Conversational**: Natural, non-robotic responses
- **Efficient**: Keeps responses concise and actionable

### **Response Patterns**
- Uses appropriate emojis for visual appeal
- Provides clear, actionable prompts
- Handles errors gracefully with helpful suggestions
- Maintains conversation flow without abrupt resets

## 🔒 **Security Features**

- **Password Hashing**: Secure password storage
- **Input Validation**: Email format validation with typo detection
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Secure error messages without data leakage

## 🧪 **Testing the Bot**

### **Account Operations**
```
User: "create account"
Bot: "What email would you like to use for your account?"
User: "user@example.com"
Bot: "What password would you like to set for your account?"
User: "mypassword123"
Bot: "What username would you like to use for your account?"
User: "JohnDoe"
Bot: "Excellent! 🎉 I've created an account for JohnDoe (user@example.com)."
```

### **Password Change**
```
User: "change password"
Bot: "What email would you like to use for your account?"
User: "user@example.com"
Bot: "What new password would you like to set for your account?"
User: "newpassword456"
Bot: "Security updated! 🔐 The password has been changed successfully."
```

### **Todo Operations**
```
User: "add todo task"
Bot: "What task would you like me to add to your list?"
User: "buy groceries"
Bot: "I've added 'buy groceries' to your todo list! 🎯"
```

## 🚨 **Troubleshooting**

### **Common Issues**
1. **MongoDB Connection**: Ensure MongoDB service is running
2. **API Rate Limits**: Gemini API may have usage limits
3. **Environment Variables**: Check `.env` file configuration
4. **Port Conflicts**: Ensure ports 3000 and 5000 are available

### **Debug Mode**
Enable detailed logging by checking console output for:
- Intent detection results
- Pending operation status
- Missing field tracking
- Action execution results

## 🔮 **Future Enhancements**

- [ ] User authentication and sessions
- [ ] Task categories and tags
- [ ] Reminder notifications
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Advanced AI features (sentiment analysis, smart suggestions)

## 📄 **License**

This project is licensed under the MIT License.

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using modern web technologies and AI capabilities**

