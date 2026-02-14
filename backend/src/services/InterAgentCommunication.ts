import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';

interface AgentMessage {
  id: string;
  sender: string;
  recipient: string | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'error';
  content: any;
  timestamp: string;
  correlationId?: string; // For request-response tracking
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface AgentRequest extends AgentMessage {
  type: 'request';
  expectedResponseType?: string;
  timeoutMs?: number;
}

interface AgentResponse extends AgentMessage {
  type: 'response';
  requestId: string;
  status: 'success' | 'failure' | 'partial';
}

interface AgentSubscription {
  agentId: string;
  messageTypes: string[];
  callback: (message: AgentMessage) => void;
}

export class InterAgentCommunication extends EventEmitter {
  private messageQueue: AgentMessage[] = [];
  private pendingRequests: Map<string, {
    resolve: (response: AgentResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private subscriptions: AgentSubscription[] = [];
  private agentRegistry: Set<string> = new Set();

  constructor() {
    super();
    logger.info('🤝 Inter-agent communication system initialized');
  }

  registerAgent(agentId: string): void {
    if (this.agentRegistry.has(agentId)) {
      logger.warn(`Agent ${agentId} already registered`);
      return;
    }
    
    this.agentRegistry.add(agentId);
    logger.info(`📱 Registered agent: ${agentId}`);
    
    // Process any queued messages for this agent
    this.processQueueForAgent(agentId);
  }

  unregisterAgent(agentId: string): void {
    this.agentRegistry.delete(agentId);
    
    // Clean up subscriptions
    this.subscriptions = this.subscriptions.filter(sub => sub.agentId !== agentId);
    
    // Reject any pending requests from this agent
    this.pendingRequests.forEach((request, reqId) => {
      if (reqId.startsWith(`${agentId}:`)) {
        request.reject(new Error('Agent unregistered before request completed'));
        clearTimeout(request.timeout);
      }
    });
    
    logger.info(`📱 Unregistered agent: ${agentId}`);
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.agentRegistry);
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    // Validate message
    this.validateMessage(message);
    
    // Add timestamp if missing
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }
    
    // Add ID if missing
    if (!message.id) {
      message.id = `${message.sender}:${Date.now()}:${Math.random().toString(36).substring(2, 6)}`;
    }
    
    logger.debug(`📤 Message queued: ${message.type} from ${message.sender} to ${message.recipient}`);
    
    // Check if recipient is registered
    if (message.recipient !== 'broadcast' && !this.agentRegistry.has(message.recipient)) {
      logger.warn(`📦 Recipient ${message.recipient} not registered, queuing message`);
      this.messageQueue.push(message);
      return;
    }
    
    // Deliver the message
    await this.deliverMessage(message);
  }

  async requestResponse(request: AgentRequest): Promise<AgentResponse> {
    // Validate request
    if (request.type !== 'request') {
      throw new Error('Message must be of type "request" for requestResponse');
    }
    
    // Add correlation ID if missing
    if (!request.correlationId) {
      request.correlationId = `${request.sender}:req:${Date.now()}`;
    }
    
    // Set timeout if not specified
    const timeoutMs = request.timeoutMs || 10000;
    
    return new Promise((resolve, reject) => {
      // Store the pending request
      this.pendingRequests.set(request.correlationId!, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(request.correlationId!);
          reject(new Error(`Request ${request.correlationId} timed out after ${timeoutMs}ms`));
        }, timeoutMs)
      });
      
      // Send the request
      this.sendMessage(request)
        .then(() => {
          logger.debug(`📤 Request sent: ${request.correlationId}`);
        })
        .catch(error => {
          this.pendingRequests.delete(request.correlationId!);
          reject(error);
        });
    });
  }

  sendNotification(notification: AgentMessage): void {
    if (notification.type !== 'notification') {
      throw new Error('Message must be of type "notification"');
    }
    
    this.sendMessage(notification)
      .catch(error => {
        logger.error(`Failed to send notification:`, error);
      });
  }

  broadcastMessage(message: AgentMessage): void {
    if (message.recipient !== 'broadcast') {
      throw new Error('Broadcast messages must have recipient set to "broadcast"');
    }
    
    this.sendMessage(message)
      .catch(error => {
        logger.error(`Failed to broadcast message:`, error);
      });
  }

  subscribe(agentId: string, messageTypes: string[], callback: (message: AgentMessage) => void): () => void {
    const subscription: AgentSubscription = { agentId, messageTypes, callback };
    this.subscriptions.push(subscription);
    
    logger.debug(`🔔 ${agentId} subscribed to: ${messageTypes.join(', ')}`);
    
    return () => {
      this.subscriptions = this.subscriptions.filter(sub => sub !== subscription);
      logger.debug(`🔕 ${agentId} unsubscribed from: ${messageTypes.join(', ')}`);
    };
  }

  private async deliverMessage(message: AgentMessage): Promise<void> {
    try {
      // Deliver to specific recipient
      if (message.recipient !== 'broadcast') {
        await this.deliverToAgent(message);
        return;
      }
      
      // Broadcast to all agents
      if (message.recipient === 'broadcast') {
        await this.broadcastToAllAgents(message);
        return;
      }
    } catch (error) {
      logger.error(`Message delivery failed:`, error);
      
      // Send error message back to sender if this was a request
      if (message.type === 'request' && message.correlationId) {
        const errorResponse: AgentResponse = {
          id: `${message.recipient}:error:${Date.now()}`,
          sender: message.recipient,
          recipient: message.sender,
          type: 'error',
          content: {
            originalMessageId: message.id,
            error: error instanceof Error ? error.message : 'Unknown delivery error'
          },
          timestamp: new Date().toISOString(),
          correlationId: message.correlationId,
          requestId: message.id,
          status: 'failure'
        };
        
        this.sendMessage(errorResponse).catch(() => {
          // Silent failure for error responses
        });
      }
    }
  }

  private async deliverToAgent(message: AgentMessage): Promise<void> {
    // Check if agent is registered
    if (!this.agentRegistry.has(message.recipient)) {
      throw new Error(`Recipient agent ${message.recipient} not registered`);
    }
    
    // Notify subscribers
    this.notifySubscribers(message);
    
    // Emit event
    this.emit('message', message);
    this.emit(`message:${message.recipient}`, message);
    this.emit(`message:${message.sender}:${message.recipient}`, message);
    
    logger.debug(`📥 Message delivered to ${message.recipient}: ${message.type}`);
    
    // Handle response for requests
    if (message.type === 'response' && message.correlationId) {
      const pendingRequest = this.pendingRequests.get(message.correlationId);
      
      if (pendingRequest) {
        clearTimeout(pendingRequest.timeout);
        this.pendingRequests.delete(message.correlationId);
        
        if (message.status === 'success') {
          pendingRequest.resolve(message as AgentResponse);
        } else {
          pendingRequest.reject(new Error(
            message.content?.error || `Request failed: ${message.content}`
          ));
        }
      }
    }
  }

  private async broadcastToAllAgents(message: AgentMessage): Promise<void> {
    const successfulDeliveries: string[] = [];
    const failedDeliveries: string[] = [];
    
    // Deliver to each registered agent
    for (const agentId of this.agentRegistry) {
      try {
        // Skip sender for broadcasts
        if (agentId === message.sender) {
          continue;
        }
        
        // Create agent-specific message
        const agentMessage = {
          ...message,
          recipient: agentId,
          id: `${message.id}:${agentId}` // Unique ID per recipient
        };
        
        await this.deliverToAgent(agentMessage);
        successfulDeliveries.push(agentId);
      } catch (error) {
        logger.warn(`Broadcast failed for ${agentId}:`, error);
        failedDeliveries.push(agentId);
      }
    }
    
    logger.debug(`📢 Broadcast complete: ${successfulDeliveries.length} successful, ${failedDeliveries.length} failed`);
    
    if (failedDeliveries.length > 0) {
      throw new Error(`Broadcast failed for agents: ${failedDeliveries.join(', ')}`);
    }
  }

  private notifySubscribers(message: AgentMessage): void {
    this.subscriptions
      .filter(sub => 
        sub.agentId === message.recipient &&
        (sub.messageTypes.includes(message.type) || sub.messageTypes.includes('*'))
      )
      .forEach(sub => {
        try {
          sub.callback(message);
        } catch (error) {
          logger.error(`Subscription callback failed for ${sub.agentId}:`, error);
        }
      });
  }

  private processQueueForAgent(agentId: string): void {
    const queuedMessages = this.messageQueue.filter(msg => msg.recipient === agentId);
    
    if (queuedMessages.length === 0) {
      return;
    }
    
    logger.info(`📦 Processing ${queuedMessages.length} queued messages for ${agentId}`);
    
    // Remove from queue
    this.messageQueue = this.messageQueue.filter(msg => msg.recipient !== agentId);
    
    // Deliver each message
    queuedMessages.forEach(message => {
      this.deliverMessage(message).catch(error => {
        logger.error(`Queued message delivery failed for ${agentId}:`, error);
      });
    });
  }

  private validateMessage(message: AgentMessage): void {
    if (!message.sender) {
      throw new Error('Message must have a sender');
    }
    
    if (!message.recipient) {
      throw new Error('Message must have a recipient');
    }
    
    if (!['request', 'response', 'notification', 'error'].includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`);
    }
    
    if (message.recipient !== 'broadcast' && !this.agentRegistry.has(message.recipient)) {
      logger.warn(`Recipient ${message.recipient} not registered`);
    }
    
    if (!this.agentRegistry.has(message.sender)) {
      throw new Error(`Sender ${message.sender} not registered`);
    }
  }

  getMessageQueueSize(): number {
    return this.messageQueue.length;
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  async shutdown(): Promise<void> {
    logger.info('🔌 Shutting down inter-agent communication system...');
    
    // Reject all pending requests
    this.pendingRequests.forEach((request, reqId) => {
      clearTimeout(request.timeout);
      request.reject(new Error('Communication system shutting down'));
    });
    
    this.pendingRequests.clear();
    this.messageQueue = [];
    this.subscriptions = [];
    this.agentRegistry.clear();
    
    this.removeAllListeners();
    
    logger.info('🔌 Inter-agent communication system shutdown complete');
  }

  // Convenience methods for common agent interactions
  async coordinateTask(
    coordinator: string,
    taskDescription: string,
    requiredAgents: string[]
  ): Promise<{ success: boolean; responses: any[]; errors: any[] }> {
    const taskId = `task:${coordinator}:${Date.now()}`;
    const responses: any[] = [];
    const errors: any[] = [];
    
    logger.info(`🎯 Coordinating task ${taskId}: ${taskDescription}`);
    
    // Send task requests to all required agents
    const requestPromises = requiredAgents.map(agentId => {
      const request: AgentRequest = {
        id: `${taskId}:req:${agentId}`,
        sender: coordinator,
        recipient: agentId,
        type: 'request',
        content: {
          taskId,
          description: taskDescription,
          role: this.getAgentRole(agentId),
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        correlationId: taskId,
        timeoutMs: 15000
      };
      
      return this.requestResponse(request)
        .then(response => {
          responses.push({
            agent: agentId,
            response: response.content,
            status: response.status
          });
          
          logger.debug(`✅ ${agentId} completed task: ${response.status}`);
        })
        .catch(error => {
          errors.push({
            agent: agentId,
            error: error.message
          });
          
          logger.warn(`❌ ${agentId} failed task: ${error.message}`);
        });
    });
    
    // Wait for all responses
    await Promise.all(requestPromises);
    
    const success = errors.length === 0;
    
    if (success) {
      logger.info(`🎉 Task ${taskId} completed successfully`);
    } else {
      logger.warn(`⚠️ Task ${taskId} completed with ${errors.length} errors`);
    }
    
    return { success, responses, errors };
  }

  private getAgentRole(agentId: string): string {
    // Simple role mapping based on agent ID patterns
    if (agentId.includes('research')) return 'researcher';
    if (agentId.includes('writing')) return 'writing_coach';
    if (agentId.includes('simulation')) return 'simulation_engineer';
    if (agentId.includes('deadline')) return 'project_manager';
    return 'general_agent';
  }

  async negotiateTask(
    initiator: string,
    task: any,
    potentialAgents: string[]
  ): Promise<{ agent: string; response: any } | null> {
    // Broadcast task to potential agents
    const negotiationId = `negotiation:${initiator}:${Date.now()}`;
    const offers: { agent: string; response: any }[] = [];
    
    logger.info(`💼 Negotiating task ${negotiationId}: ${task.description}`);
    
    // Send negotiation requests
    const negotiationPromises = potentialAgents.map(agentId => {
      const negotiationRequest: AgentRequest = {
        id: `${negotiationId}:req:${agentId}`,
        sender: initiator,
        recipient: agentId,
        type: 'request',
        content: {
          negotiationId,
          task,
          requestType: 'negotiation',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        correlationId: negotiationId,
        timeoutMs: 10000
      };
      
      return this.requestResponse(negotiationRequest)
        .then(response => {
          if (response.status === 'success' && response.content?.accept) {
            offers.push({
              agent: agentId,
              response: response.content
            });
          }
        })
        .catch(() => {
          // Agent declined or failed to respond
        });
    });
    
    await Promise.all(negotiationPromises);
    
    if (offers.length === 0) {
      logger.warn(`🤷 No agents accepted task ${negotiationId}`);
      return null;
    }
    
    // Select the best offer (simple selection for now)
    const selectedOffer = this.selectBestOffer(offers);
    
    logger.info(`🏆 Selected ${selectedOffer.agent} for task ${negotiationId}`);
    
    // Notify selected agent
    const confirmation: AgentMessage = {
      id: `${negotiationId}:confirm:${selectedOffer.agent}`,
      sender: initiator,
      recipient: selectedOffer.agent,
      type: 'notification',
      content: {
        negotiationId,
        status: 'selected',
        message: 'Your offer has been accepted'
      },
      timestamp: new Date().toISOString(),
      correlationId: negotiationId
    };
    
    await this.sendMessage(confirmation);
    
    return selectedOffer;
  }

  private selectBestOffer(offers: { agent: string; response: any }[]): { agent: string; response: any } {
    // Simple selection strategy: pick the first offer
    // In a real implementation, this would consider:
    // - Agent capabilities
    // - Current workload
    // - Response quality
    // - Estimated completion time
    return offers[0];
  }
}