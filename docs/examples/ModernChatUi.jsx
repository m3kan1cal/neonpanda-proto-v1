import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MoreVertical, User, Zap, TrendingUp } from 'lucide-react';

const ModernChatInterface = () => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'user',
      content: 'Hey Marcus! I just finished Fran and got 8:47. Pretty happy with that time!',
      timestamp: '2:34 PM',
      type: 'text'
    },
    {
      id: 2,
      sender: 'ai',
      content: "That's solid! 8:47 is a great Fran time. I can see you've been working on those thrusters - your form improvements are paying off. How did you feel during the workout?",
      timestamp: '2:35 PM',
      type: 'text',
      coachName: 'Marcus',
      avatar: 'M'
    },
    {
      id: 3,
      sender: 'user',
      content: 'The thrusters felt way better than last time. Pull-ups were still the limiting factor though.',
      timestamp: '2:36 PM',
      type: 'text'
    },
    {
      id: 4,
      sender: 'ai',
      content: "Perfect insight! Your thruster strength is clearly improving. For pull-ups, let's focus on building that pulling endurance. I'm thinking we add some pull-up volume work this week - maybe some ladder sets?",
      timestamp: '2:37 PM',
      type: 'text',
      coachName: 'Marcus',
      avatar: 'M'
    },
    {
      id: 5,
      sender: 'ai',
      content: '',
      timestamp: '2:38 PM',
      type: 'workout_extraction',
      coachName: 'Marcus',
      avatar: 'M',
      workoutData: {
        name: 'Fran',
        time: '8:47',
        movements: ['Thrusters (95/65)', 'Pull-ups'],
        scheme: '21-15-9',
        confidence: 95
      }
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: 'user',
        content: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };

      setMessages([...messages, newMessage]);
      setMessage('');

      // Simulate AI typing
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const aiResponse = {
          id: messages.length + 2,
          sender: 'ai',
          content: "I'd be happy to help with that! Let me analyze your training data and get back to you with some specific recommendations.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text',
          coachName: 'Marcus',
          avatar: 'M'
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 2000);
    }
  };

  const WorkoutCard = ({ workoutData }) => (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{workoutData.name}</span>
        </div>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{workoutData.time}</div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Scheme:</span> {workoutData.scheme}
        </div>
        <div className="flex flex-wrap gap-1">
          {workoutData.movements.map((movement, idx) => (
            <span key={idx} className="bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
              {movement}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs text-gray-600 dark:text-gray-400">Extracted</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {workoutData.confidence}% confidence
        </div>
      </div>
    </div>
  );

  const MessageBubble = ({ msg, isLast }) => {
    const isUser = msg.sender === 'user';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1 group`}>
        <div className={`flex items-end gap-2 max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isUser && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {msg.avatar}
            </div>
          )}

          <div className="flex flex-col">
            {msg.type === 'workout_extraction' ? (
              <div className={`${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <WorkoutCard workoutData={msg.workoutData} />
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
                  {msg.timestamp}
                </span>
              </div>
            ) : (
              <>
                <div className={`px-4 py-3 rounded-2xl ${
                  isUser
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
                } shadow-sm`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>

                <div className={`flex items-center gap-1 mt-1 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {msg.timestamp}
                  </span>
                  {isUser && (
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60"></div>
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                M
              </div>
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Marcus</h3>
                {isOnline && (
                  <span className="px-2 py-0.5 bg-green-400/20 text-green-100 rounded-full text-xs font-medium">
                    Online
                  </span>
                )}
              </div>
              <p className="text-sm text-white/80">Technical CrossFit Coach</p>
            </div>
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages - with bottom padding for floating input */}
      <div className="flex-1 overflow-y-auto pb-24 bg-gray-50 dark:bg-gray-900">
        <div className="p-4 space-y-2">
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id} msg={msg} isLast={index === messages.length - 1} />
          ))}

          {isTyping && (
            <div className="flex justify-start mb-1">
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  M
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-700/50 p-4">
        {/* Recording indicator */}
        {isRecording && (
          <div className="mb-3 flex items-center justify-center">
            <div className="bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <span className="text-sm font-medium">Recording {formatTime(recordingTime)}</span>
              <button
                onClick={handleStopRecording}
                className="ml-2 hover:bg-red-600 rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-3">
          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all group">
              <Plus className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all">
              <Camera className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-all">
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-800 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 transition-all resize-none max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
            />
            <button className="absolute right-3 bottom-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors">
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Voice/Send buttons */}
          <div className="flex items-center gap-2">
            {message.trim() ? (
              <button
                onClick={handleSend}
                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onMouseDown={handleStartRecording}
                onMouseUp={handleStopRecording}
                onMouseLeave={handleStopRecording}
                className={`p-3 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Status/Tips */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Marcus is online and ready to help with your training</span>
          <div className="flex items-center gap-4">
            <span>Press Enter to send • Shift+Enter for new line</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatInterface;