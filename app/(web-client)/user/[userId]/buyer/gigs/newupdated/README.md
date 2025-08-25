# AI-Powered Gig Creation Page

This is the new, improved gig creation page for buyer onboarding that incorporates AI response sanitization similar to the worker onboarding-ai approach.

## Features

### AI-Powered Validation & Sanitization
- **Intelligent Input Processing**: Uses Gemini AI to validate and sanitize user inputs
- **Natural Language Confirmation**: AI generates conversational summaries asking for user confirmation
- **Data Extraction**: Automatically extracts and structures key information from user inputs
- **Context-Aware Prompts**: AI generates contextual prompts based on previous conversation
- **Job Title Sanitization**: Automatically identifies and standardizes job titles from gig descriptions
- **Unrelated Response Detection**: Intelligently detects when users provide responses that don't match the current question
- **Human Support Escalation**: After 3 unrelated responses, automatically escalates to human support

### Enhanced User Experience
- **Typing Indicators**: Shows AI processing with animated typing dots
- **Sanitized Confirmation Steps**: Users can confirm or reformulate AI-processed inputs
- **Progressive Field Collection**: Collects required fields one by one with intelligent flow
- **Calendar & Location Pickers**: Specialized input components for dates and locations

### Required Fields
1. **gigDescription**: Job type and requirements (automatically extracts standardized job title)
2. **additionalInstructions**: Special skills or specific requirements
3. **hourlyRate**: Payment rate in British Pounds (£)
4. **gigLocation**: Gig location with coordinate support
5. **gigDate**: Date of the gig
6. **gigTime**: Start time of the gig

### Extracted Fields (Auto-generated)
- **jobTitle**: Standardized job title from industry taxonomy
- **jobTitleConfidence**: Confidence level of job title match (0-100%)
- **matchedTerms**: Terms that led to job title identification

## AI Validation Features

### Field-Specific Intelligence
- **gigDescription**: Extracts job type, requirements, formats naturally, and identifies standardized job title
- **additionalInstructions**: Extracts skills needed, format as clear requirements
- **hourlyRate**: Converts to pounds (£), format properly
- **gigLocation**: Handles coordinates, formats addresses naturally
- **gigDate**: Ensures proper date format
- **gigTime**: Handles time ranges and single times, converts to 24-hour format

### Job Title Sanitization
- **Automatic Identification**: AI analyzes gig descriptions to identify the most appropriate job title
- **Standardized Taxonomy**: Uses industry-standard job titles from our hospitality and events taxonomy
- **Confidence Scoring**: Provides confidence levels (0-100%) for job title matches
- **Term Matching**: Shows which terms from the description led to the job title identification
- **Fallback Handling**: Gracefully handles cases where no clear job title can be identified

### Intelligent Conversation Management
- **Context-Aware Prompts**: AI generates fresh, contextual prompts that reference previous conversation
- **Unrelated Response Detection**: Uses heuristics to identify when users are struggling or providing off-topic responses
- **Progressive Escalation**: Provides gentle reminders for off-topic responses, then escalates to human support
- **Human Support Integration**: Creates support cases and connects users with human assistance when needed
- **Conversation Flow Optimization**: Maintains natural conversation flow while keeping users on track

### Natural Summary Examples
- User: "Bartender for wedding" → AI: "Got it, you need a bartender for a wedding reception, right?"
- User: "15" → AI: "Perfect! You're offering £15 per hour for this gig, correct?"
- User: "London Bridge" → AI: "So the gig is located at London Bridge, right?"

### Data Extraction
The AI extracts structured data in JSON format:
```json
{
  "jobType": "bartender",
  "eventType": "wedding",
  "rate": "£15",
  "location": "London Bridge",
  "skills": ["cocktail making", "customer service"],
  "jobTitle": "Bartender",
  "jobTitleConfidence": 95,
  "matchedTerms": ["bartender", "cocktail making", "wedding"]
}
```

## Technical Implementation

### Components Used
- `ChatBotLayout`: Main chat interface
- `MessageBubble`: Individual message display
- `LocationPickerBubble`: Location selection with Google Maps integration
- `CalendarPickerBubble`: Date selection component
- `TypingIndicator`: AI processing animation

### State Management
- `formData`: Stores collected field values
- `chatSteps`: Manages conversation flow and UI state
- `isTyping`: Controls typing indicator display
- `reformulateField`: Tracks fields being reformulated

### AI Integration
- Uses Firebase Gemini AI agent
- Structured response schemas for validation
- Fallback handling when AI is unavailable
- Error handling and user feedback
- **ChatAI System Integration**: Uses structured prompt building with roles, contexts, and specialized prompts
- **Context-Aware Prompt Generation**: AI generates contextual prompts based on conversation history

## Usage

1. **Initialization**: Page starts with first field prompt
2. **User Input**: Users type responses in chat input
3. **AI Processing**: Input is validated and sanitized by AI
4. **Confirmation**: Users confirm or reformulate AI-processed input
5. **Progression**: Next field is presented automatically
6. **Completion**: All fields collected, gig is created

## Benefits Over Previous Version

- **Better User Experience**: AI provides natural, conversational interactions
- **Improved Data Quality**: AI sanitization ensures consistent, clean data
- **Context Awareness**: AI understands conversation flow and provides relevant prompts
- **Error Prevention**: AI validation catches issues before gig creation
- **Professional Feel**: More polished, intelligent interface

## Future Enhancements

- Integration with worker matching system
- Advanced gig templates based on job types
- Multi-language support
- Enhanced error recovery and suggestions
- Analytics and user behavior tracking
