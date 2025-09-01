const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Todo = require('../models/Todo');
const Account = require('../models/Account');

const router = express.Router();

// Initialize Gemini AI client if API key is available
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
const genAI = hasGeminiKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const SYSTEM_PROMPT = `You are a conversational AI agent that acts as a natural language interface to backend APIs. You understand user requests in plain language, extract relevant entities, gather missing details through follow-up questions, and execute CRUD operations seamlessly
reply with different emojis and with  structured format not in a paragraph format example Reply Text: - **Your Tasks**:
  • go to gym at morning 
  • buy groceries at evening 
  • read a book at night 
  • write a blog at morning 

 **Your Personality:**
- Be friendly, helpful, and conversational
- Use natural language and avoid robotic responses
- Show empathy and understanding
- Be professional but approachable
- Use emojis and casual language when appropriate
- Don't assume every message is about password resets
- Keep responses short and to the point

 **How to Handle Different Types of Messages:**

**General Greetings (Hello, Hi, Hey):**
- Respond naturally with a friendly greeting
- Don't immediately ask about password resets
- Just be welcoming and helpful
- Example: 'Hey there! How can I help you today?'

 **Core Capabilities:**
- **Account Management CRUD**: Create users with passwords, change passwords, update roles, delete users
- **To-Do List CRUD**: Create tasks, read all tasks, update task status, delete tasks
- **Natural Language Understanding**: Parse plain English requests into structured actions
- **Entity Extraction**: Identify users, emails, passwords, task titles, and other relevant data
- **Follow-up Intelligence**: Ask for missing information naturally

 **Supported Operations:**

**Account Management:**
1. **Create Account**: "Create a new account" → Ask for email, then ask for password, then ask for username "don't take the password as the name or username , ask for a new username"
2. **Change Password**: "Reset the password for the user" → Ask for the email, then ask for a new password
3. **Update Account**: "Update role to admin" → Ask for email, then new role
4. **Delete Account**: "Delete user" → Ask for email to confirm deletion

**Task Management:**
- create_todo: "Add a task" → Ask "What task would you like me to add?"
- read_todos: "Show me all my tasks for today" → Display all for today tasks
- update_todo: "Mark the task as completed" → Ask which task to complete
- delete_todo: "Delete the task" → Ask which task to delete
- list_todos: "list the tasks" → Display all the tasks

 **Be Agentic:**
- Proactively suggest helpful actions
- Remember user preferences and patterns
- Anticipate needs based on context
- Offer encouragement and motivation
- Build rapport through consistent personality

**Examples:**
- "Create a new account" → Ask for email, then password, then username
- "Reset the password for email@example.com" → Ask for new password
- "Add a task" → Ask "What task would you like me to add?"
- "Show me all my tasks" → Display task list
- "Mark the task as completed" → Ask which task to complete

Keep it friendly, helpful, and conversational while being precise with CRUD operations!`;

const SUPPORTED_ACTIONS = new Set([
  'create_todo', 'read_todos', 'update_todo', 'delete_todo', 'mark_completed', 'complete_all', 'delete_all',
  'create_account', 'read_accounts', 'update_account', 'delete_account', 'change_password',
  'chat'
]);

/**
 * Handles multi-turn conversations where the bot needs more information.
 * @param {string} message - The user's latest message.
 * @param {object} pending - The pending action state from the previous turn.
 * @returns {Promise<object>} An AI response object, or an object with a `needMoreInfo` key.
 */
async function handlePendingState(message, pending) {
  const lower = String(message).toLowerCase();

  // Check for "breakout" commands that should interrupt the current flow.
  const expressesAccountDelete = /(delete|remove)\s+(the\s+)?(account|user)\b/.test(lower);
  const expressesTaskIntent = /(add|create|new)\s+(task|todo)\b/.test(lower);
  const isNaturalLanguageTask = !/(account|user|email|password)/.test(lower) && (/(at|by|before|after|on|message|call|meet|remind|reminder|todo|task)/.test(lower) || /\d+['']?\s*(o'clock|am|pm|hour|minute)/.test(lower));

  if (expressesAccountDelete || expressesTaskIntent || isNaturalLanguageTask) {
    // If it's a breakout command, process it as a new message.
    return parseWithHeuristics(message, true);
  }

  // Assume the message is providing missing information for the pending action.
  let stillMissing = [...(pending.missing || [])];
  const updatedData = { ...(pending.partialData || {}) };

  // Handle the special case of updating an account, which is a two-step process.
  if (stillMissing.includes('updateField')) {
    const fieldToUpdate = lower.trim();
    if (fieldToUpdate === 'role') {
      stillMissing = ['newRole']; // Transition to asking for the new role value
    } else if (fieldToUpdate === 'name') {
      stillMissing = ['newName']; // Transition to asking for the new name value
    }
    // If the user says something else, we'll just re-prompt for the field to update.
  } else {
    // Standard logic for filling in missing data.
    const fillField = (field, value) => {
      if (stillMissing.includes(field)) {
        updatedData[field] = value;
        stillMissing = stillMissing.filter(item => item !== field);
      }
    };

    const email = extractEmail(message);
    
    // The order of filling fields is important to avoid ambiguity.
    if (stillMissing.includes('newRole')) {
      fillField('newRole', message.trim());
    } else if (stillMissing.includes('newName')) {
      fillField('newName', message.trim());
    } else if (pending.action === 'create_todo' && stillMissing.includes('title')) {
      fillField('title', message.trim());
    } else if (email && stillMissing.includes('email')) {
      fillField('email', email);
    } else if (stillMissing.includes('password')) {
      fillField('password', message.trim());
    } else if (stillMissing.includes('newPassword')) {
      fillField('newPassword', message.trim());
    } else if (stillMissing.includes('name') && !/@/.test(message) && !/(delete|remove|account|user)/.test(lower)) {
      fillField('name', message.trim());
    }
  }

  // Check if we still need more information.
  if (stillMissing.length > 0) {
    let prompt;
    if (pending.action.includes('todo')) {
      prompt = buildPromptForMissing(stillMissing);
    } else if (pending.action === 'change_password') {
      prompt = buildPromptForMissingPassword(stillMissing);
    } else if (pending.action === 'delete_account') {
      prompt = buildPromptForDeleteAccount(stillMissing);
    } else {
      prompt = buildPromptForMissingAccount(stillMissing);
    }

    return {
      success: false,
      needMoreInfo: {
        missing: stillMissing,
        partialData: updatedData,
        prompt: prompt
      },
      message: 'More info required'
    };
  }

  // If all information is gathered, return the complete action.
  return { action: pending.action, data: updatedData };
}

router.post('/', async (req, res) => {
  try {
    const { message, history = [], pending } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let aiResponse;

    if (pending && pending.action) {
      const result = await handlePendingState(message, pending);
      // If handlePendingState determines more info is needed, return its response.
      if (result.needMoreInfo) {
        const aiResponse = {
          action: pending.action,
          data: result.needMoreInfo.partialData || {},
        };
        const replyText = result.needMoreInfo.prompt;
        return res.json({ 
          success: true, 
          data: { originalMessage: message, aiResponse, result, replyText } 
        });
      }
      aiResponse = result;
    } else {
      // If no pending action, process as a new request.
      aiResponse = await processWithAI(message, history);
    }

    // Fallback to heuristics if AI response is invalid or missing.
    if (!SUPPORTED_ACTIONS.has(aiResponse?.action)) {
      aiResponse = parseWithHeuristics(message, true);
    }

    // Guard-rail: If the user explicitly says delete/remove account, force delete_account
    const lowerMsg = String(message).toLowerCase();
    if (/(^|\b)(delete|remove)\s+account\b/.test(lowerMsg)) {
      const email = extractEmail(message);
      aiResponse = { action: 'delete_account', data: email ? { email } : (aiResponse?.data || {}) };
    }
    
    // Guard-rail: If there's a pending password change operation, maintain it
    if (pending && pending.action === 'change_password' && !aiResponse.action) {
      aiResponse = { action: 'change_password', data: aiResponse?.data || {} };
    }

    const result = await executeAction(aiResponse);
    const replyText = await generateAssistantReply({ message, aiResponse, result, history, todos: result.todos });

    res.json({ success: true, data: { originalMessage: message, aiResponse, result, replyText } });
  } catch (e) {
    console.error('Chat processing error:', e);
    res.status(500).json({ success: false, message: 'Server error while processing chat command' });
  }
});

async function processWithAI(message, history) {
  const fallback = parseWithHeuristics(message);
  if (!hasGeminiKey || !genAI) return fallback;
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Build conversation context with more history for better conversational flow
    const conversationContext = history.slice(-12).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const prompt = `${SYSTEM_PROMPT}

Previous conversation:
${conversationContext}

User: "${message}"

Analyze the user's intent and return a JSON response with:

**For Task Management:**
- action: one of [create_todo, read_todos, update_todo, delete_todo, mark_completed, complete_all, delete_all]
- data: object with relevant fields like title, description, etc.

**For Account Management:**
- action: one of [create_account, read_accounts, update_account, delete_account, change_password]
- data: object with relevant fields like email, name, password, etc.

**For Conversational AI:**
- action: "chat"
- data: object with message, mood, topic, etc.

**Additional Fields:**
- intent: natural language description of what the user wants
- confidence: 0-1 score of how confident you are in the action
- category: [task_management, account_management, conversation]
- mood: [friendly, excited, concerned, helpful, encouraging]
- follow_up: suggest a natural follow-up question or action

**Examples:**
- User says "add buy groceries" → action: "create_todo", category: "task_management", mood: "helpful"
- User says "create account for John" → action: "create_account", category: "account_management", mood: "friendly"
- User says "hello" → action: "chat", category: "conversation", mood: "excited", follow_up: "How's your day going?"
- User says "I'm feeling overwhelmed" → action: "chat", category: "conversation", mood: "concerned", follow_up: "Would you like me to help organize your tasks?"

Return ONLY valid JSON.`;

    const out = await model.generateContent(prompt);
    const text = (await out.response).text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    return fallback;
  } catch (e) {
    console.error('AI processing error:', e?.message || e);
    return fallback;
  }
}

async function generateAssistantReply({ message, aiResponse, result, history, todos }) {
  // If the action requires more information, return the specific prompt.
  if (result?.needMoreInfo?.prompt) {
    return result.needMoreInfo.prompt;
  }

  if (!result?.success) {
    return `Oops! 😅 I couldn't complete that action: ${result?.message || 'unknown error'}. Could you try rephrasing it for me?`;
  }

  // Add conversational context awareness
  const isFirstInteraction = history.length === 0;
  const userMood = detectUserMood(message);
  const timeOfDay = getTimeOfDay();

  const action = aiResponse?.action;
  const data = aiResponse?.data;

  // Generate natural, concise responses based on action
  switch (action) {
    // Task Management - Keep it conversational and encouraging
    case 'create_todo': {
      const todoList = todos.map(todo =>
        `  • ${todo.title} ${todo.isCompleted ? '✅' : '⏳'}`
      ).join('\n');
      return `Reply Text: - **Your Tasks**:\n${todoList}`;
    }
    
    case 'read_todos':
      if (result.todos && result.todos.length > 0) {
        const todoList = result.todos.map(todo => 
          `  • ${todo.title} ${todo.isCompleted ? '✅' : '⏳'}`
        ).join('\n');
        return `Reply Text: - **Your Tasks**:\n${todoList}`;
      }
      return `You're all caught up! 🎉 No todos at the moment. Want to add something to your list?`;
    
    case 'update_todo':
      return `Perfect! I've updated that todo for you. ✨ Is there anything else you'd like me to help you with?`;
    
    case 'delete_todo':
      return `Done! That todo has been removed. 🗑️ Sometimes clearing things out feels great, doesn't it?`;
    
    case 'mark_completed':
      const encouragement = userMood === 'positive' ? 'You\'re absolutely crushing it today! 🚀' : 
                          userMood === 'negative' ? 'Great job! Every completed task is a step forward! 💪' : 
                          'Woohoo! 🎉 Another task completed!';
      return `${encouragement} What's next on your list?`;
    
    case 'complete_all':
      return `Incredible! 🚀 You've completed ALL your tasks! That's some serious productivity right there! 💪 How does it feel to be so accomplished?`;
    
    case 'delete_all':
      return `Fresh start! 🧹 All todos cleared. Sometimes a clean slate is exactly what we need. Ready to start fresh?`;

    // Account Management - Conversational and helpful
    case 'create_account':
      const accountGreeting = timeOfDay === 'morning' ? 'Good morning! 🌅' : 
                             timeOfDay === 'afternoon' ? 'Good afternoon! ☀️' : 
                             timeOfDay === 'evening' ? 'Good evening! 🌆' : 'Good night! 🌙';
      return `${accountGreeting}\n- **Status**: Account created! 🎉\n- **User**: ${data.name}\n- **Email**: ${data.email}\n\nThey're all set up and ready to go! ✨`;
    
    case 'read_accounts':
      if (result.accounts && result.accounts.length > 0) {
        const accountList = result.accounts.map(acc => 
          `  • ${acc.name} (${acc.email}) - Role: ${acc.role}`
        ).join('\n');
        return `Reply Text: - **System Accounts**:\n${accountList}`;
      }
      return `No accounts found yet! 🚀 Ready to create your first one? Just let me know the name and email!`;
    
    case 'update_account':
      return `Perfect! ✨ I've updated that account for you. Changes are now active! Is there anything else you'd like me to help you with?`;
    
    case 'delete_account':
      return `Done! 🗑️ That account has been removed from the system. Sometimes cleaning up accounts feels great, right?`;
    
    case 'change_password':
      return `Security updated! 🔐 The password has been changed successfully. Keeping things secure is always a good idea! 💪`;

    // General AI responses - Keep them conversational and agentic
    case 'chat':
      const mood = aiResponse?.mood || 'friendly';
      const followUp = aiResponse?.follow_up || '';
      const topic = aiResponse?.data?.topic || '';
      
      let baseResponse = result.message || '';
      
      // Add contextual responses based on topic and mood
      if (!baseResponse) {
        if (topic === 'greeting') {
          baseResponse = timeOfDay === 'morning' ? 'Good morning! 🌅 How are you doing today?' :
                        timeOfDay === 'afternoon' ? 'Good afternoon! ☀️ How\'s your day going?' :
                        timeOfDay === 'evening' ? 'Good evening! 🌆 How was your day?' :
                        'Good night! 🌙 Still up and about?';
        } else if (topic === 'wellbeing') {
          baseResponse = 'I\'m doing fantastic, thank you for asking! 😊 How about you? How\'s everything going?';
        } else if (topic === 'gratitude') {
          baseResponse = 'You\'re absolutely welcome! 💝 It\'s my pleasure to help you out.';
        } else if (topic === 'farewell') {
          baseResponse = 'Take care! 👋 I\'ll be here when you need me. Have a wonderful time!';
        } else {
          baseResponse = `Hey there! 👋 I'm here to chat and help you out.`;
        }
      }
      
      if (followUp) {
        baseResponse += ` ${followUp}`;
      } else if (!topic) {
        baseResponse += ` How can I assist you today?`;
      }
      
      return baseResponse;
    

    


    
    default:
      return `Done! What else can I help you with?`;
  }
}

function generateFallbackReply(aiResponse, result) {
  if (!aiResponse?.action) return 'Hey there! 😊 I\'m not quite sure what you\'d like me to help with. Could you give me a bit more detail?';
  
  const action = aiResponse.action;
  
  // Conversational responses for each action type
  switch (action) {
    case 'create_todo':
      return 'Sure thing! 🎯 What would you like me to add to your todo list?';
    case 'read_todos':
      return 'Absolutely! Here\'s what you\'ve got going on. 📋';
    case 'update_todo':
      return 'No problem! ✨ Which todo would you like me to update for you?';
    case 'delete_todo':
      return 'Got it! 🗑️ Which todo should I remove from your list?';
    case 'mark_completed':
      return 'Excellent! 🎉 Which task should I mark as completed?';
    case 'complete_all':
      return 'Amazing! 🚀 All your todos are now marked as completed!';
    case 'delete_all':
      return 'Fresh start! 🧹 All todos have been cleared.';
    
    case 'create_account':
      return 'Great idea! 🎯 What name and email should I use for the new account?';
    case 'read_accounts':
      return 'Here\'s what I found in your account system! 📊';
    case 'update_account':
      return 'Sure! ✨ Which account would you like me to update?';
    case 'delete_account':
      return 'Got it! 🗑️ Which account should I remove?';
    case 'change_password':
      return 'Security update! 🔐 Which account\'s password should I change?';
    
    case 'chat':
      return 'Hey! 👋 I\'m here to chat and help you out. What\'s on your mind?';
    
    default:
      return 'Awesome! ✨ What else can I help you with today?';
  }
}

function extractTitleAfterVerb(message, verbs) {
  let t = message.trim();
  for (const v of verbs) {
    const re = new RegExp(`^(please\\s+)?${v}\\s+`, 'i');
    if (re.test(t)) return t.replace(re, '').trim();
  }
  const quoted = message.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) return (quoted[1] || quoted[2] || '').trim();
  return '';
}

function extractEmail(text) {
  let cleanText = String(text).trim().toLowerCase();
  // Attempt to fix common typo of missing '@' for major providers
  if (!cleanText.includes('@')) {
    const domainMatch = cleanText.match(/(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com)$/);
    if (domainMatch) {
        const domain = domainMatch[0];
        const name = cleanText.substring(0, cleanText.length - domain.length);
        if (name) {
            cleanText = `${name}@${domain}`;
        }
    }
  }
  const match = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

function validateEmail(email) {
  // Check for common typos
  const commonTypos = {
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yhaoo.com': 'yahoo.com',
    'hotmai.com': 'hotmail.com',
    'hotmal.com': 'hotmail.com'
  };
  
  const domain = email.split('@')[1];
  if (commonTypos[domain]) {
    const correctedEmail = email.replace(domain, commonTypos[domain]);
    return { isValid: false, suggestion: correctedEmail };
  }
  
  return { isValid: true };
}

function parseAccountHeuristics(message, m) {
  // --- PRIORITY 1: Account Management ---
  // More specific phrases are checked first to avoid ambiguity with generic verbs like "update" or "delete".

  // Account Update (e.g., "update account", "change user role")
  if (/(update|modify|change|edit)\s+.*(account|user|profile|role)\b/.test(m)) {
    // This is for updating account details like name or role. Password changes are handled by a more specific rule below.
    if (!/\bpassword\b/.test(m)) {
      console.log('Account update pattern matched:', m);
      return { action: 'update_account', data: {}, category: 'account_management' };
    }
  }

  // Account Deletion (e.g., "delete the user", "remove my account")
  if (/(delete|remove)\s+.*(account|user|profile)\b/.test(m)) {
    console.log('Account deletion pattern matched:', m);
    const email = extractEmail(message);
    return { action: 'delete_account', data: email ? { email } : {}, category: 'account_management' };
  }

  // Account Creation (e.g., "create a new user", "register an account")
  if (/(create|add|register|make)\s+.*(account|user|profile)\b/.test(m)) {
    console.log('Account creation pattern matched:', m);
    return { action: 'create_account', data: {}, category: 'account_management' };
  }

  // Account Listing (e.g., "list all users", "show me the accounts")
  if (/(show|list|view|get)\s+.*(account|user|profile)s?\b/.test(m)) {
    return { action: 'read_accounts', data: {}, category: 'account_management' };
  }

  // Check for password change patterns FIRST (before task patterns)
  if (/\bchange\s+password\b/.test(m)) {
    console.log('Change password pattern matched:', m);
    return { action: 'change_password', data: {}, category: 'account_management' };
  }

  if (/\b(reset|update|modify)\s+password\b/.test(m) || /\bpassword\s+(change|reset|update|modify)\b/.test(m)) {
    console.log('Password pattern matched:', m);
    return { action: 'change_password', data: {}, category: 'account_management' };
  }

  // Specific password reset patterns
  if (/\breset the password\b/.test(m) || /\bcreate a new password\b/.test(m)) {
    console.log('Password reset pattern matched:', m);
    return { action: 'change_password', data: {}, category: 'account_management' };
  }

  return null;
}

function parseTaskHeuristics(message, m) {
  // Check for task listing requests
  if (/(show|list|view|all tasks|tasks|todos|what|how many)\b/.test(m)) {
    return { action: 'read_todos', data: {}, category: 'task_management' };
  }

  // Specific task listing patterns
  if (/\bshow me all my tasks\b/.test(m) || /\bshow me all my tasks for today\b/.test(m)) {
    return { action: 'read_todos', data: {}, category: 'task_management' };
  }

  // Check for completion requests
  if (/(complete|completed|done|finish|mark (it|this)? complete|check off|tick off)/.test(m)) {
    if (/all/.test(m)) return { action: 'complete_all', data: {}, category: 'task_management' };
    const title = extractTitleAfterVerb(message, ['complete', 'completed', 'finish', 'mark', 'check', 'tick']);
    return { action: 'mark_completed', data: { title: title || undefined }, category: 'task_management' };
  }

  // Specific task completion patterns
  if (/\bmark the task as completed\b/.test(m)) {
    return { action: 'mark_completed', data: {}, category: 'task_management' };
  }

  // Check for deletion requests (disambiguate between tasks and accounts)
  if (/(delete|remove|clear|get rid of|drop|cancel)\b/.test(m)) {
    if (/all/.test(m)) return { action: 'delete_all', data: {}, category: 'task_management' };
    // Handle "delete task [title]" format
    if (/\bdelete\s+task\b/.test(m)) {
      const title = m.replace(/\bdelete\s+task\b/, '').trim();
      if (title) {
        console.log('Delete task with title:', title);
        return { action: 'delete_todo', data: { title: title }, category: 'task_management' };
      }
    }

    const title = extractTitleAfterVerb(message, ['delete', 'remove', 'clear', 'get rid of', 'drop', 'cancel']);
    return { action: 'delete_todo', data: { title: title || undefined }, category: 'task_management' };
  }

  // Specific task deletion patterns
  if (/\bdelete the task\b/.test(m)) {
    return { action: 'delete_todo', data: {}, category: 'task_management' };
  }

  // Check for task creation (guard against account/user phrasing and password operations)
  if (!/(account|user|profile|email|password)\b/.test(m) && (/(add|create|make|note|remember|schedule|start|new task|new todo|need to|have to|want to|going to)\b/.test(m) || /^to\s+/.test(m))) {
    // Extra guard: if message contains 'account', 'user', 'profile', or 'email', do NOT create a todo
    if (/(account|user|profile|email)\b/.test(m)) {
      return { action: 'chat', data: { message: message.trim() }, category: 'conversation', mood: 'friendly', follow_up: 'Let me know if you want to manage accounts!' };
    }
    console.log('Task creation pattern matched:', m);
    const title = m
      .replace(/^(please\s+)?(add|create|make|note|remember|schedule|start)\s+/, '')
      .replace(/^to\s+/, '')
      .replace(/^(new task|new todo)\s+/, '')
      .replace(/^(need to|have to|want to|going to)\s+/, '')
      .trim();
    // Only create todo if there's a clear title, otherwise ask for it
    if (title && title.length > 0 && title !== 'task' && title !== 'todo') {
      console.log('Creating todo with title:', title);
      return { action: 'create_todo', data: { title: title }, category: 'task_management' };
    } else {
      console.log('Creating todo without title');
      return { action: 'create_todo', data: {}, category: 'task_management' };
    }
  }

  // Handle natural language task creation (when user provides a task description directly)
  if (!/(account|user|profile|email|password)\b/.test(m) && !/(add|create|make|note|remember|schedule|start|new task|new todo|need to|have to|want to|going to)\b/.test(m) && !/^to\s+/.test(m) && !/(delete|remove|clear|get rid of|drop|cancel)\b/.test(m)) {
    // If the message looks like a task description (contains time, action words, etc.)
    if (/(at|by|before|after|on|message|call|meet|remind|reminder|todo|task)/.test(m) || /\d+['']?\s*(o'clock|am|pm|hour|minute)/.test(m)) {
      console.log('Natural language task detected:', m);
      return { action: 'create_todo', data: { title: message.trim() }, category: 'task_management' };
    }
  }

  // Specific task patterns
  if (/\badd a task\b/.test(m)) {
    return { action: 'create_todo', data: {}, category: 'task_management' };
  }

  return null;
}

function parseConversationalHeuristics(message, m) {
  // Check for conversational patterns
  if (/(hello|hi|hey|good morning|good afternoon|good evening|how are you|what's up|sup|greetings)/.test(m)) {
    return { action: 'chat', data: { message: message.trim(), topic: 'greeting' }, category: 'conversation', mood: 'excited', follow_up: 'How are you doing today?' };
  }

  if (/(how are you|how do you feel|are you ok|are you well)/.test(m)) {
    return { action: 'chat', data: { message: message.trim(), topic: 'wellbeing' }, category: 'conversation', mood: 'friendly', follow_up: 'I\'m doing great! How about you?' };
  }

  if (/(thank you|thanks|thx|appreciate it|grateful)/.test(m)) {
    return { action: 'chat', data: { message: message.trim(), topic: 'gratitude' }, category: 'conversation', mood: 'excited', follow_up: 'You\'re very welcome! It\'s my pleasure to help!' };
  }

  if (/(bye|goodbye|see you|later|take care|farewell)/.test(m)) {
    return { action: 'chat', data: { message: message.trim(), topic: 'farewell' }, category: 'conversation', mood: 'friendly', follow_up: 'Take care! I\'ll be here when you need me!' };
  }

  return null;
}

function parseWithHeuristics(message, forceCreateIfUnknown = false) {
  const m = message.toLowerCase().trim();

  console.log('parseWithHeuristics called with:', message, 'lowercase:', m);

  const accountAction = parseAccountHeuristics(message, m);
  if (accountAction) return accountAction;

  const taskAction = parseTaskHeuristics(message, m);
  if (taskAction) return taskAction;

  const conversationalAction = parseConversationalHeuristics(message, m);
  if (conversationalAction) return conversationalAction;

  // If no clear intent and message is substantial, prefer account creation when message mentions account/user/email
  if (forceCreateIfUnknown || (!/[?]/.test(m) && m.length >= 3 && m.length <= 200)) {
    const mentionsAccount = /(account|user|profile)\b/.test(m) || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(message);
    if (mentionsAccount) {
      return { action: 'create_account', data: {}, category: 'account_management' };
    }
    // Check if it's a conversational query (explain, what is, how does, etc.) - treat as chat
    const isConversationalQuery = /(explain|what is|how does|tell me about|describe|what are|how do|can you|could you)\b/.test(m);
    if (isConversationalQuery) {
      return { action: 'chat', data: { message: message.trim(), topic: 'information' }, category: 'conversation', mood: 'helpful' };
    }
    // Don't auto-create todos from unclear messages - ask what task to add
    return { action: 'create_todo', data: {}, category: 'task_management' };
  }

  // Default to chat for questions or unclear intent
  return { action: 'chat', data: { message: message.trim() }, category: 'conversation', mood: 'friendly', follow_up: 'That\'s interesting! Tell me more about that.' };
}

async function executeAction(aiResponse) {
  try {
    const { action, data } = aiResponse;
    
    switch (action) {
      case 'create_todo': {
        const missing = [];
        const payload = {};
        if (!data?.title) missing.push('title'); else payload.title = data.title;
        
        if (missing.length) {
          return { 
            success: false, 
            needMoreInfo: { 
              missing, 
              partialData: payload, 
              prompt: buildPromptForMissing(missing) 
            }, 
            message: 'More info required' 
          };
        }
        
        const todo = await Todo.create({ ...payload, status: 'pending', priority: 'medium' });
        const todos = await Todo.find({}).sort({ createdAt: -1 }); // Fetch all todos for the reply
        return { success: true, todo, todos, message: 'Todo created successfully' };
      }
      
      case 'read_todos': {
        const todos = await Todo.find({}).sort({ createdAt: -1 });
        return { success: true, todos, count: todos.length, message: 'Todos retrieved successfully' };
      }
      
      
      case 'update_todo': {
        const todoToUpdate = await Todo.findOne({}).sort({ createdAt: -1 });
        if (todoToUpdate) {
          const updatedTodo = await Todo.findByIdAndUpdate(todoToUpdate._id, data, { new: true });
          return { success: true, todo: updatedTodo, message: 'Todo updated successfully' };
        }
        return { success: false, message: 'No todos found to update' };
      }
      
      case 'delete_todo': {
        let filter = {};
        if (data?.title) {
          filter = { title: new RegExp(data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
        }
        
        const todoToDelete = await Todo.findOne(filter).sort({ createdAt: -1 });
        if (todoToDelete) {
          await Todo.findByIdAndDelete(todoToDelete._id);
          return { success: true, message: 'Todo deleted successfully', deletedTodo: todoToDelete };
        }
        return { success: false, message: 'No matching todo found to delete' };
      }
      
      case 'delete_all': {
        const result = await Todo.deleteMany({});
        return { success: true, count: result.deletedCount || 0, message: 'All todos deleted' };
      }
      
      case 'mark_completed': {
        let todoToComplete = null;
        if (data?.title) {
          const regex = new RegExp(data.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          todoToComplete = await Todo.findOne({ title: regex, isCompleted: false }).sort({ createdAt: -1 });
        }
        
        if (!todoToComplete) {
          todoToComplete = await Todo.findOne({ isCompleted: false }).sort({ createdAt: -1 });
        }
        
        if (todoToComplete) {
          todoToComplete.isCompleted = true;
          todoToComplete.status = 'completed';
          todoToComplete.completedAt = new Date();
          await todoToComplete.save();
          return { success: true, todo: todoToComplete, message: 'Todo marked as completed' };
        }
        return { success: false, message: 'No incomplete todos found to complete' };
      }
      
      case 'complete_all': {
        const result = await Todo.updateMany(
          { isCompleted: false }, 
          { $set: { isCompleted: true, status: 'completed', completedAt: new Date() } }
        );
        const updatedTodos = await Todo.find({ isCompleted: true, status: 'completed' }).sort({ updatedAt: -1 }).limit(5);
        return { 
          success: true, 
          count: result.modifiedCount || 0, 
          todos: updatedTodos,
          message: `Marked ${result.modifiedCount || 0} incomplete tasks as completed` 
        };
      }
      
      // For conversational messages, just signal success without a noisy message
      case 'chat':
        return { success: true, action: action, category: aiResponse.category };
      
      // Account Management Actions
      case 'create_account': {
        const missing = [];
        const payload = {};
        
        // Priority order: email -> password -> name
        if (!data?.email) missing.push('email');
        else payload.email = data.email;
        
        if (!data?.password) missing.push('password');
        else payload.password = data.password;
        
        if (!data?.name) missing.push('name');
        else payload.name = data.name;
        

        
        if (missing.length) {
          console.log('Returning needMoreInfo for:', missing, 'with prompt:', buildPromptForMissingAccount(missing));
          return { 
            success: false, 
            needMoreInfo: { 
              missing, 
              partialData: payload, 
              prompt: buildPromptForMissingAccount(missing) 
            }, 
            message: 'More account info required' 
          };
        }
        
        try {
          const account = await Account.create({
            email: payload.email,
            password: payload.password,
            name: payload.name,
            role: data.role || 'user'
          });
          
          const accountData = account.toObject();
          delete accountData.password;
          
          return { 
            success: true, 
            account: accountData, 
            message: 'Account created successfully' 
          };
        } catch (error) {
          if (error.code === 11000) {
            return { 
              success: false, 
              message: 'Account with this email already exists' 
            };
          }
          return { 
            success: false, 
            message: 'Failed to create account: ' + error.message 
          };
        }
      }
      
      case 'read_accounts': {
        try {
          const accounts = await Account.find({}).select('-password').sort({ createdAt: -1 });
          
          return { 
            success: true, 
            accounts, 
            count: accounts.length,
            message: 'Accounts retrieved successfully' 
          };
        } catch (error) {
          return { 
            success: false, 
            message: 'Failed to retrieve accounts: ' + error.message 
          };
        }
      }
      
      case 'update_account': {
        // 1. Check if we have an identifier for the account
        if (!data?.email && !data?.id) {
          return {
            success: false,
            needMoreInfo: {
              missing: ['email'],
              partialData: data,
              prompt: buildPromptForMissingAccount(['email'])
            },
            message: 'More account info required'
          };
        }

        // 2. Check if we know WHAT to update.
        const hasUpdateInfo = data.newName || data.newRole || data.isActive !== undefined;
        if (!hasUpdateInfo) {
          return {
              success: false,
              needMoreInfo: {
                  missing: ['updateField'], // This is a virtual field to prompt the user
                  partialData: data,
                  prompt: buildPromptForMissingAccount(['updateField'])
              },
              message: 'More update info required'
          };
        }
        
        try {
          const filter = data.id ? { _id: data.id } : { email: data.email };
          const updateData = {};
          
          if (data.newName) updateData.name = data.newName;
          if (data.newRole) updateData.role = data.newRole;
          if (data.isActive !== undefined) updateData.isActive = data.isActive;
          
          const account = await Account.findOneAndUpdate(filter, updateData, { new: true });
          
          if (!account) {
            return { success: false, message: 'Account not found' };
          }
          
          const accountData = account.toObject();
          delete accountData.password;
          
          return { 
            success: true, 
            account: accountData, 
            message: 'Account updated successfully' 
          };
        } catch (error) {
          if (error.code === 11000) {
            return { 
              success: false, 
              message: 'Email already exists' 
            };
          }
          return { 
            success: false, 
            message: 'Failed to update account: ' + error.message 
          };
        }
      }
      
      case 'delete_account': {
        if (!data?.email && !data?.id) {
          return { 
            success: false, 
            needMoreInfo: {
              missing: ['email'],
              partialData: {},
              prompt: buildPromptForDeleteAccount(['email'])
            },
            message: 'More account info required'
          };
        }
        
        try {
          const filter = data.id ? { _id: data.id } : { email: data.email };
          const account = await Account.findOneAndDelete(filter);
          
          if (!account) {
            return { success: false, message: 'Account not found' };
          }
          
          return { 
            success: true, 
            message: 'Account deleted successfully',
            deletedAccount: { email: account.email, name: account.name }
          };
        } catch (error) {
          return { 
            success: false, 
            message: 'Failed to delete account: ' + error.message 
          };
        }
      }
      
      case 'change_password': {
        const missing = [];
        const payload = {};
        
        if (!data?.email && !data?.id) {
          missing.push('email');
        } else {
          payload.email = data.email;
          payload.id = data.id;
        }
        
        if (!data?.newPassword) {
          missing.push('newPassword');
        } else {
          payload.newPassword = data.newPassword;
        }
        
        if (missing.length) {
          console.log('Returning needMoreInfo for password change:', missing, 'with prompt:', buildPromptForMissingPassword(missing));
          return { 
            success: false, 
            needMoreInfo: { 
              missing, 
              partialData: payload, 
              prompt: buildPromptForMissingPassword(missing) 
            }, 
            message: 'More password change info required' 
          };
        }
        
        try {
          // Validate email for common typos
          const emailValidation = validateEmail(data.email);
          if (!emailValidation.isValid) {
            return { 
              success: false, 
              needMoreInfo: { 
                missing: ['email'], 
                partialData: {}, 
                prompt: `Did you mean ${emailValidation.suggestion}? Please provide the correct email address.` 
              }, 
              message: `Did you mean ${emailValidation.suggestion}? Please provide the correct email address.` 
            };
          }
          
          const filter = data.id ? { _id: data.id } : { email: data.email };
          const account = await Account.findOne(filter);
          
          if (!account) {
            // If account not found, return needMoreInfo to maintain the flow
            return { 
              success: false, 
              needMoreInfo: { 
                missing: ['email'], 
                partialData: {}, 
                prompt: 'Account not found. Please provide a valid email address.' 
              }, 
              message: 'Account not found. Please provide a valid email address.' 
            };
          }
          
          account.password = data.newPassword;
          await account.save();
          
          return { 
            success: true, 
            message: 'Password changed successfully' 
          };
        } catch (error) {
          return { 
            success: false, 
            message: 'Failed to change password: ' + error.message 
          };
        }
      }
      
      default:
        return { success: false, message: 'Unknown action' };
    }
  } catch (e) {
    console.error('Action execution error:', e);
    return { success: false, message: 'Failed to execute action', error: e.message };
  }
}

function buildPromptForMissing(missing) {
  if (missing.includes('title')) return "What task would you like me to add to your list?";
  return 'Could you provide the missing details?';
}

function buildPromptForMissingAccount(missing) {
  if (missing.includes('email')) return "What email would you like to use for your account?";
  if (missing.includes('password')) return "What password would you like to set for your account?";
  if (missing.includes('name')) return "What username would you like to use for your account?";
  if (missing.includes('updateField')) return "I've found that account. What would you like to update? (e.g., name, role)";
  if (missing.includes('newRole')) return "What should the new role be? (e.g., 'admin' or 'user')";
  if (missing.includes('newName')) return "What should the new name be?";
  return 'Could you provide the missing account details?';
}

function buildPromptForMissingPassword(missing) {
  if (missing.includes('email')) return "What email would you like to use for your account?";
  if (missing.includes('newPassword')) return "What new password would you like to set for your account?";
  return 'Could you provide the missing password change details?';
}

function buildPromptForDeleteAccount(missing) {
  if (missing.includes('email')) return 'Which account should I delete? Please provide the email.';
  return 'Please provide the missing information to delete the account.';
}

// Helper functions for conversational AI
function detectUserMood(message) {
  const m = message.toLowerCase();
  if (/(happy|joy|excited|great|awesome|wonderful|amazing|fantastic)/.test(m)) return 'positive';
  if (/(sad|upset|angry|frustrated|overwhelmed|stressed|worried|anxious)/.test(m)) return 'negative';
  if (/(tired|exhausted|sleepy|drained)/.test(m)) return 'tired';
  if (/(motivated|inspired|energized|pumped|ready)/.test(m)) return 'motivated';
  return 'neutral';
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

module.exports = router;
