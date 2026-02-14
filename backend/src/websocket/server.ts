import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '@/utils/logger';
import { InterAgentCommunication } from '../services/InterAgentCommunication';

export class WebSocketServer {
  private io: SocketIOServer;
  private interAgentCommunication: InterAgentCommunication;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.interAgentCommunication = new InterAgentCommunication();
    this.setupHandlers();
    this.setupAgentCommunicationBridge();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user?.id || socket.id;
      logger.info(`User connected: ${userId}`);

      socket.join(`user:${userId}`);

      // Register user as an agent in the communication system
      this.registerUserAsAgent(socket, userId);

      socket.on('project:join', async (projectId: string) => {
        socket.join(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:joined', {
          userId,
          username: socket.data.user?.name || 'Anonymous',
        });
      });

      socket.on('project:leave', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        socket.to(`project:${projectId}`).emit('user:left', { userId });
      });

      socket.on('ai:stream', async (data: { message: string; sessionId: string }) => {
        try {
          socket.emit('ai:chunk', { chunk: 'Processing...' });
          socket.emit('ai:complete');
        } catch (error) {
          socket.emit('ai:error', { error: (error as Error).message });
        }
      });

      socket.on('simulation:subscribe', (simulationId: string) => {
        socket.join(`simulation:${simulationId}`);
      });

      socket.on('cursor:move', (data: { projectId: string; position: any }) => {
        socket.to(`project:${data.projectId}`).emit('cursor:update', {
          userId,
          position: data.position,
        });
      });

      socket.on('file:edit', (data: { projectId: string; fileId: string; changes: any }) => {
        socket.to(`project:${data.projectId}`).emit('file:changed', {
          userId,
          fileId: data.fileId,
          changes: data.changes,
        });
      });

      // Agent communication handlers
      socket.on('agent:register', (agentData: { agentId: string; capabilities: string[] }) => {
        this.handleAgentRegistration(socket, agentData);
      });

      socket.on('agent:message', (message: any) => {
        this.handleAgentMessage(socket, message);
      });

      socket.on('agent:request', (request: any) => {
        this.handleAgentRequest(socket, request);
      });

      socket.on('agent:subscribe', (subscription: { messageTypes: string[] }) => {
        this.handleAgentSubscription(socket, subscription);
      });

      socket.on('disconnect', () => {
        this.handleAgentDisconnect(socket, userId);
        logger.info(`User disconnected: ${userId}`);
      });
    });
  }

  private registerUserAsAgent(socket: Socket, userId: string): void {
    try {
      const agentId = `ws_agent_${userId}`;
      this.interAgentCommunication.registerAgent(agentId);
      
      // Store agent ID in socket data
      socket.data.agentId = agentId;
      
      logger.info(`🤖 Registered WebSocket user as agent: ${agentId}`);
      
    } catch (error) {
      logger.error(`Failed to register user as agent:`, error);
    }
  }

  private handleAgentRegistration(socket: Socket, agentData: { agentId: string; capabilities: string[] }) {
    try {
      const userId = socket.data.user?.id || socket.id;
      const agentId = agentData.agentId || `ws_agent_${userId}`;
      
      // Register or update agent
      this.interAgentCommunication.registerAgent(agentId);
      
      // Store agent data in socket
      socket.data.agentId = agentId;
      socket.data.agentCapabilities = agentData.capabilities;
      
      logger.info(`🤖 Agent registered: ${agentId} (capabilities: ${agentData.capabilities.join(', ')})`);
      
      socket.emit('agent:registered', {
        success: true,
        agentId,
        registeredAgents: this.interAgentCommunication.getRegisteredAgents()
      });
      
    } catch (error) {
      logger.error(`Agent registration failed:`, error);
      socket.emit('agent:registration_error', {
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  }

  private handleAgentMessage(socket: Socket, message: any) {
    try {
      if (!socket.data.agentId) {
        throw new Error('Agent not registered');
      }
      
      // Set sender to this agent's ID
      message.sender = socket.data.agentId;
      
      logger.debug(`📩 WebSocket agent message from ${message.sender} to ${message.recipient}`);
      
      // Send through inter-agent communication system
      this.interAgentCommunication.sendMessage(message);
      
      socket.emit('agent:message_ack', {
        messageId: message.id,
        status: 'queued'
      });
      
    } catch (error) {
      logger.error(`Failed to handle agent message:`, error);
      socket.emit('agent:message_error', {
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Message handling failed'
      });
    }
  }

  private async handleAgentRequest(socket: Socket, request: any) {
    try {
      if (!socket.data.agentId) {
        throw new Error('Agent not registered');
      }
      
      // Set sender to this agent's ID
      request.sender = socket.data.agentId;
      
      logger.debug(`🤝 WebSocket agent request from ${request.sender} to ${request.recipient}`);
      
      // Use inter-agent communication for request-response
      const response = await this.interAgentCommunication.requestResponse(request);
      
      socket.emit('agent:request_response', {
        requestId: request.id,
        response
      });
      
    } catch (error) {
      logger.error(`Agent request failed:`, error);
      socket.emit('agent:request_error', {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Request failed'
      });
    }
  }

  private handleAgentSubscription(socket: Socket, subscription: { messageTypes: string[] }) {
    try {
      if (!socket.data.agentId) {
        throw new Error('Agent not registered');
      }
      
      const agentId = socket.data.agentId;
      
      // Subscribe to message types
      const unsubscribe = this.interAgentCommunication.subscribe(
        agentId,
        subscription.messageTypes,
        (message) => {
          this.forwardMessageToSocket(socket, message);
        }
      );
      
      // Store unsubscribe function
      if (!socket.data.agentSubscriptions) {
        socket.data.agentSubscriptions = [];
      }
      socket.data.agentSubscriptions.push(unsubscribe);
      
      logger.debug(`🔔 Agent ${agentId} subscribed to: ${subscription.messageTypes.join(', ')}`);
      
      socket.emit('agent:subscription_ack', {
        success: true,
        messageTypes: subscription.messageTypes
      });
      
    } catch (error) {
      logger.error(`Agent subscription failed:`, error);
      socket.emit('agent:subscription_error', {
        error: error instanceof Error ? error.message : 'Subscription failed'
      });
    }
  }

  private forwardMessageToSocket(socket: Socket, message: any) {
    try {
      if (socket.disconnected) {
        logger.warn(`Cannot forward message to disconnected socket: ${message.type}`);
        return;
      }
      
      socket.emit('agent:message', message);
      logger.debug(`📤 Forwarded message to agent: ${message.type}`);
      
    } catch (error) {
      logger.error(`Failed to forward message to socket:`, error);
    }
  }

  private handleAgentDisconnect(socket: Socket, userId: string) {
    try {
      if (socket.data.agentId) {
        this.interAgentCommunication.unregisterAgent(socket.data.agentId);
        logger.info(`🤖 Unregistered agent on disconnect: ${socket.data.agentId}`);
      }
      
      // Clean up subscriptions
      if (socket.data.agentSubscriptions) {
        socket.data.agentSubscriptions.forEach((unsubscribe: () => void) => {
          unsubscribe();
        });
      }
      
    } catch (error) {
      logger.error(`Error handling agent disconnect:`, error);
    }
  }

  private setupAgentCommunicationBridge() {
    // Forward inter-agent communication events to WebSocket
    this.interAgentCommunication.on('message', (message) => {
      this.broadcastAgentMessage(message);
    });
    
    // Periodically broadcast agent registry
    setInterval(() => {
      this.broadcastAgentRegistry();
    }, 30000); // Every 30 seconds
  }

  private broadcastAgentMessage(message: any) {
    // Broadcast to all sockets in the recipient's user channel
    if (message.recipient && message.recipient !== 'broadcast') {
      const agentPrefix = 'ws_agent_';
      const userId = message.recipient.startsWith(agentPrefix) 
        ? message.recipient.substring(agentPrefix.length)
        : message.recipient;
      
      this.io.to(`user:${userId}`).emit('agent:message', message);
    }
  }

  private broadcastAgentRegistry() {
    const registeredAgents = this.interAgentCommunication.getRegisteredAgents();
    const messageQueueSize = this.interAgentCommunication.getMessageQueueSize();
    const pendingRequests = this.interAgentCommunication.getPendingRequestCount();
    
    this.io.emit('agent:registry_update', {
      timestamp: new Date().toISOString(),
      registeredAgents,
      agentCount: registeredAgents.length,
      messageQueueSize,
      pendingRequests
    });
    
    logger.debug(`📡 Broadcast agent registry: ${registeredAgents.length} agents online`);
  }

  async broadcastSimulationUpdate(simulationId: string, data: any) {
    this.io.to(`simulation:${simulationId}`).emit('simulation:progress', data);
  }

  async sendNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  async shutdown() {
    logger.info('🔌 Shutting down WebSocket server...');
    
    try {
      await this.interAgentCommunication.shutdown();
      this.io.close();
      logger.info('🔌 WebSocket server shutdown complete');
    } catch (error) {
      logger.error('WebSocket server shutdown error:', error);
      throw error;
    }
  }
}