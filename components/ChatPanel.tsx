import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ChatThread } from './ChatThread';

export const ChatPanel: React.FC = () => {
    const { 
        activeCanvas, 
        isChatLoading, 
        sendChatMessage 
    } = useWorkspace();

    if (!activeCanvas) {
        return (
            <div className="flex items-center justify-center h-full text-cyan-400/70">
                Select or create a canvas to start a conversation.
            </div>
        );
    }

    return (
        <ChatThread
            messages={activeCanvas.chat_history || []}
            isLoading={isChatLoading}
            onSendMessage={sendChatMessage}
        />
    );
};