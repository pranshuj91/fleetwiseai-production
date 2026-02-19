import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Send, MessageSquare, User, Clock, Tag } from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

const WorkOrderMessages = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const messageTypes = [
    { value: 'general', label: 'General Update', color: 'bg-gray-100 text-gray-800' },
    { value: 'parts_request', label: 'Parts Request', color: 'bg-orange-100 text-orange-800' },
    { value: 'delay_update', label: 'Delay/ETA Update', color: 'bg-red-100 text-red-800' },
    { value: 'ready_proposal', label: 'Vehicle Ready', color: 'bg-purple-100 text-purple-800' },
    { value: 'customer_question', label: 'Customer Question', color: 'bg-blue-100 text-blue-800' }
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchMessages, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch project
      const projectRes = await fetch(
        `${BACKEND_URL}/api/projects/${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        setProject(projectData);
      }

      // Fetch messages
      await fetchMessages();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${projectId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/work-orders/${projectId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            message: newMessage,
            message_type: messageType
          })
        }
      );

      if (!response.ok) throw new Error('Failed to send message');

      setNewMessage('');
      setMessageType('general');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTypeColor = (type) => {
    const typeObj = messageTypes.find(t => t.value === type);
    return typeObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    const typeObj = messageTypes.find(t => t.value === type);
    return typeObj?.label || 'General';
  };

  return (
    <>
      <Navigation />
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Work Order
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Order Messages</h1>
            {project && (
              <p className="text-gray-600">
                WO #{project.work_order_number || projectId.substring(0, 8)} • {project.truck_number}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start">
            <MessageSquare className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Threaded Communication</p>
              <p>All messages are attached to this work order for complete audit trail and accountability. 
              Tag messages with type to route notifications to the right team.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Message Thread ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="border-l-4 border-l-blue-500 bg-gray-50 p-4 rounded-r-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-900">{msg.sender_name}</span>
                      <Badge className={getTypeColor(msg.message_type)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {getTypeLabel(msg.message_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* New Message Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
            <div className="flex flex-wrap gap-2">
              {messageTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setMessageType(type.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    messageType === type.value
                      ? type.color + ' border-2 border-current'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={4}
              placeholder="Type your message..."
              className="w-full"
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? 'Sending...' : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default WorkOrderMessages;
