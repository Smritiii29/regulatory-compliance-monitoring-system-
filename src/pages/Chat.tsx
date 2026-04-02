import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { chatAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  FileText,
  Hash,
  Image,
  MessageCircle,
  Paperclip,
  Send,
  Trash,
  Users,
} from 'lucide-react';

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [chatMode, setChatMode] = useState<'direct' | 'group'>('direct');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number>();

  const loadSidebar = async () => {
    try {
      const [contactsData, groupsData] = await Promise.all([
        chatAPI.contacts(),
        chatAPI.groups(),
      ]);
      setContacts(contactsData);
      setGroups(groupsData);
    } catch (error) {
      console.error(error);
    }
  };

  const loadMessages = async () => {
    try {
      if (chatMode === 'direct' && selectedContact) {
        const msgs = await chatAPI.directMessages(selectedContact.id);
        setMessages(msgs);
      } else if (chatMode === 'group' && selectedGroup) {
        const msgs = await chatAPI.groupMessages(selectedGroup);
        setMessages(msgs);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSidebar();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      await loadMessages();
      await loadSidebar();
    };

    refresh();
    if (pollRef.current) clearInterval(pollRef.current);

    if (selectedContact || selectedGroup) {
      pollRef.current = window.setInterval(refresh, 3000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedContact, selectedGroup, chatMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedGroupMeta = groups.find((group) => group.name === selectedGroup);
  const canSendToSelectedGroup =
    chatMode !== 'group' || !selectedGroup || Boolean(selectedGroupMeta?.can_send);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !file) || !canSendToSelectedGroup) return;

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

      await Promise.all([loadMessages(), loadSidebar()]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send message or attachment',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleDownload = async (message: any) => {
    try {
      const blob = await chatAPI.download(message.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = message.file_name || 'attachment';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error?.message || 'Could not download attachment',
        variant: 'destructive',
      });
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

  const getFileIcon = (filename?: string) => {
    if (!filename) return <FileText className="h-4 w-4" />;

    const ext = filename.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) {
      return <FileText className="h-4 w-4" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chat</h1>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <Tabs defaultValue="contacts" className="flex h-full flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="contacts" className="flex-1">
                <Users className="mr-1 h-4 w-4" />
                Direct
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">
                <Hash className="mr-1 h-4 w-4" />
                Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className={`w-full rounded-lg p-3 text-left transition-colors ${
                        selectedContact?.id === contact.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{contact.name}</span>
                        <div className="flex items-center gap-2">
                          {contact.unread_count > 0 && (
                            <Badge className="min-w-5 justify-center px-1.5 text-[10px]">
                              {contact.unread_count}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {contact.role}
                          </Badge>
                        </div>
                      </div>
                      {contact.department && (
                        <p className="text-xs opacity-70">{contact.department}</p>
                      )}
                      {contact.last_message && (
                        <p className="mt-1 truncate text-xs opacity-50">{contact.last_message}</p>
                      )}
                    </button>
                  ))}
                  {contacts.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">No contacts</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {groups.map((group) => (
                    <button
                      key={group.name}
                      onClick={() => selectGroup(group.name)}
                      className={`w-full rounded-lg p-3 text-left transition-colors ${
                        selectedGroup === group.name
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          <span className="text-sm font-medium">{group.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {group.unread_count > 0 && (
                            <Badge className="min-w-5 justify-center px-1.5 text-[10px]">
                              {group.unread_count}
                            </Badge>
                          )}
                          {!group.can_send && (
                            <Badge variant="outline" className="text-[10px]">
                              Read only
                            </Badge>
                          )}
                        </div>
                      </div>
                      {group.last_message && (
                        <p className="mt-1 truncate text-xs opacity-50">
                          {group.sender_name}: {group.last_message}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="flex flex-col md:col-span-2">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {chatMode === 'direct'
                ? <MessageCircle className="h-5 w-5" />
                : <Hash className="h-5 w-5" />}
              {chatTitle}
              {selectedContact && (
                <Badge variant="secondary" className="ml-2">
                  {selectedContact.role}
                  {selectedContact.department ? ` - ${selectedContact.department}` : ''}
                </Badge>
              )}
              {selectedGroupMeta && (
                <Badge variant={selectedGroupMeta.can_send ? 'secondary' : 'outline'} className="ml-2">
                  {selectedGroupMeta.can_send ? 'Can post' : 'Read only'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 p-4">
              {(selectedContact || selectedGroup) ? (
                messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isMe = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                            }`}
                          >
                            {!isMe && chatMode === 'group' && (
                              <p className="mb-1 text-xs font-medium opacity-70">
                                {message.sender_name} ({message.sender_role})
                              </p>
                            )}
                            {message.message_type === 'file' ? (
                              <div className="mb-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownload(message)}
                                  className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                  {getFileIcon(message.file_name)}
                                  <span className="text-sm font-medium">
                                    {message.file_name || 'Attachment'}
                                  </span>
                                  <Download className="h-4 w-4" />
                                </button>
                                {message.message && message.message !== `Attachment: ${message.file_name}` && (
                                  <p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p>
                                )}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                            )}
                            <p className="mt-1 text-xs opacity-50">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="mx-auto mb-2 h-12 w-12 opacity-30" />
                    <p>Select a contact or group to start chatting</p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {(selectedContact || selectedGroup) && (
              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t p-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={canSendToSelectedGroup ? 'Type a message...' : 'Only admin and principal can post here'}
                  className="flex-1"
                  autoFocus
                  disabled={!canSendToSelectedGroup}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.mp4,.avi,.mkv,.mov,.wmv,.webm,.mp3,.wav,.ogg,.flac,.zip,.rar,.7z,.tar,.gz"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  disabled={!canSendToSelectedGroup}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                {file && (
                  <div className="flex items-center gap-2 rounded bg-secondary px-2 py-1 text-xs">
                    {getFileIcon(file.name)}
                    <span>{file.name}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!newMessage.trim() && !file) || !canSendToSelectedGroup}
                >
                  <Send className="h-4 w-4" />
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
