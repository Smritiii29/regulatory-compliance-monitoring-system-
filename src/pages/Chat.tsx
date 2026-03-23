import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { chatAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, MessageCircle, Hash, Paperclip, Download, FileText, Image, Video, Radio, Trash } from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatMode, setChatMode] = useState<'direct' | 'group'>('direct');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>();

  useEffect(() => {
    chatAPI.contacts().then(setContacts).catch(console.error);
    chatAPI.groups().then(setGroups).catch(console.error);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadMessages = async () => {
    try {
      if (chatMode === 'direct' && selectedContact) {
        const msgs = await chatAPI.directMessages(selectedContact.id);
        setMessages(msgs);
      } else if (chatMode === 'group' && selectedGroup) {
        const msgs = await chatAPI.groupMessages(selectedGroup);
        setMessages(msgs);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3 seconds
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedContact || selectedGroup) {
      pollRef.current = window.setInterval(loadMessages, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedContact, selectedGroup, chatMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const { toast } = useToast();
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;
    try {
      if (file) {
        if (chatMode === 'direct' && selectedContact) {
          await chatAPI.sendFile({ receiver_id: selectedContact.id, message: newMessage, file });
        } else if (chatMode === 'group' && selectedGroup) {
          await chatAPI.sendFile({ group_name: selectedGroup, message: newMessage, file });
        }
      } else {
        if (chatMode === 'direct' && selectedContact) {
          await chatAPI.sendMessage({ receiver_id: selectedContact.id, message: newMessage });
        } else if (chatMode === 'group' && selectedGroup) {
          await chatAPI.sendMessage({ group_name: selectedGroup, message: newMessage });
        }
      }
      setNewMessage('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMessages();
    } catch (e: any) {
      toast && toast({ title: 'Error', description: e?.message || 'Failed to send message or attachment', variant: 'destructive' });
      console.error(e);
    }
  };

  const selectContact = (contact: any) => {
    setSelectedContact(contact);
    setSelectedGroup(null);
    setChatMode('direct');
  };

  const selectGroup = (groupName: string) => {
    setSelectedGroup(groupName);
    setSelectedContact(null);
    setChatMode('group');
  };

  const chatTitle = chatMode === 'direct'
    ? selectedContact?.name || 'Select a contact'
    : selectedGroup || 'Select a group';

  // Helper to show file icon based on extension
  function getFileIcon(filename?: string) {
    if (!filename) {
      return (<FileText className="w-4 h-4" />);
    }
    const ext = filename.split('.').pop()?.toLowerCase();
    // Use FileText for all document types
    if (["pdf", "doc", "docx", "xls", "xlsx"].includes(ext)) return <FileText className="w-4 h-4" />;
    if (["png", "jpg", "jpeg", "gif"].includes(ext)) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chat</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Sidebar */}
        <Card className="md:col-span-1">
          <Tabs defaultValue="contacts" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="contacts" className="flex-1"><Users className="w-4 h-4 mr-1" /> Direct</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1"><Hash className="w-4 h-4 mr-1" /> Groups</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {contacts.map(c => (
                    <button key={c.id} onClick={() => selectContact(c)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedContact?.id === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{c.name}</span>
                        <Badge variant="outline" className="text-xs">{c.role}</Badge>
                      </div>
                      {c.department && <p className="text-xs opacity-70">{c.department}</p>}
                      {c.last_message && <p className="text-xs opacity-50 truncate mt-1">{c.last_message}</p>}
                    </button>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No contacts</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {groups.map(g => (
                    <button key={g.name} onClick={() => selectGroup(g.name)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedGroup === g.name ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                      }`}>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span className="font-medium text-sm">{g.name}</span>
                      </div>
                      {g.last_message && (
                        <p className="text-xs opacity-50 truncate mt-1">{g.sender_name}: {g.last_message}</p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              {chatMode === 'direct' ? <MessageCircle className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              {chatTitle}
              {selectedContact && (
                <Badge variant="secondary" className="ml-2">{selectedContact.role} {selectedContact.department ? `— ${selectedContact.department}` : ''}</Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {(selectedContact || selectedGroup) ? (
                messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map(m => {
                      const isMe = m.sender_id === user?.id;
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg p-3 ${
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                          }`}>
                            {!isMe && chatMode === 'group' && (
                              <p className="text-xs font-medium opacity-70 mb-1">{m.sender_name} ({m.sender_role})</p>
                            )}
                            {/* File attachment display */}
                            {m.message_type === 'file' ? (
                              <div className="mb-1">
                                <a href={chatAPI.downloadUrl(m.id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                  {getFileIcon(m.file_name)}
                                  <span className="text-sm font-medium">{m.file_name || 'Attachment'}</span>
                                  <Download className="w-4 h-4" />
                                </a>
                                {m.message && m.message !== `📎 ${m.file_name}` && (
                                  <p className="text-sm whitespace-pre-wrap mt-1">{m.message}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                            )}
                            <p className="text-xs opacity-50 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Select a contact or group to start chatting</p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            {(selectedContact || selectedGroup) && (
              <form onSubmit={sendMessage} className="p-4 border-t flex gap-2 items-center">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..." className="flex-1" autoFocus />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    console.log('Selected file:', f);
                    setFile(f);
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.mp4,.avi,.mkv,.mov,.wmv,.webm,.mp3,.wav,.ogg,.flac,.zip,.rar,.7z,.tar,.gz"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </Button>
                {file && (
                  <div className="flex items-center gap-2 bg-secondary px-2 py-1 rounded text-xs">
                    {getFileIcon(file.name)}
                    <span>{file.name}</span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <Button type="submit" size="icon" disabled={!newMessage.trim() && !file}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
