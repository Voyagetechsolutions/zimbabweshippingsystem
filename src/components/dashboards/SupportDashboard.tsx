
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, LifeBuoy, FileText, AlertCircle, User,
  MessagesSquare, Clock, Search
} from 'lucide-react';

const SupportDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
              <div className="text-2xl font-bold">3</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <LifeBuoy className="h-8 w-8 text-yellow-500 mr-3" />
              <div className="text-2xl font-bold">12</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Unresolved Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
              <div className="text-2xl font-bold">5</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg. Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500 mr-3" />
              <div className="text-2xl font-bold">4m</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="chats" className="mb-8">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 gap-2">
          <TabsTrigger value="chats" className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" />
            <span>Chats</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            <span>Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="complaints" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>Complaints</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>User Search</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chats">
          <Card>
            <CardHeader>
              <CardTitle>Communication Center</CardTitle>
              <CardDescription>Manage customer chats and messages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3">
                  <div className="font-medium mb-2">Active Conversations</div>
                  <div className="space-y-2">
                    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">John Smith</div>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Tracking issue with ABC123</div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Sarah Johnson</div>
                        <Badge className="bg-gray-100 text-gray-800">Idle</Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Inquiring about shipping rates</div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Mike Brown</div>
                        <Badge className="bg-amber-100 text-amber-800">Waiting</Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Delivery delay concern</div>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-2/3 border rounded-lg p-4">
                  <div className="text-center p-12">
                    <MessagesSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                    <p className="text-gray-500 mb-4">Choose a chat from the list to start messaging</p>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Start New Chat
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Management</CardTitle>
              <CardDescription>Handle support tickets and issues</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Ticket management interface will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="complaints">
          <Card>
            <CardHeader>
              <CardTitle>Complaint Resolution</CardTitle>
              <CardDescription>Address and resolve customer complaints</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Complaint resolution interface will go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Search</CardTitle>
              <CardDescription>Find customer information quickly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input 
                    type="text" 
                    placeholder="Search by name, email, or tracking number" 
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-zim-green focus:outline-none focus:ring-1 focus:ring-zim-green"
                  />
                </div>
                
                <div className="text-center p-8">
                  <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Search for a user</h3>
                  <p className="text-gray-500">Enter a search term to find users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportDashboard;
