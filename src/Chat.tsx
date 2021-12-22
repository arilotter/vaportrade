import { ButtonForm } from "packard-belle";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage } from "./utils/utils";
import "./Chat.css";
interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}
export function Chat({ messages, onSendMessage }: ChatProps) {
  const [chatMessage, setChatMessage] = useState("");

  const onSendChat = useCallback(() => {
    if (chatMessage.length) {
      onSendMessage(chatMessage);
      setChatMessage("");
      inputRef.current?.focus();
    }
  }, [chatMessage, onSendMessage]);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ref = messagesRef.current;
    if (!ref) {
      return;
    }
    // scroll to bottom on new msg
    ref.scrollTop = ref.scrollHeight - ref.clientHeight;
  }, [messages]);

  return (
    <div className="chat">
      <div className="chatMessages" ref={messagesRef}>
        {messages.map(({ chatter, message }, i) => (
          <div key={i}>
            <span className="chatSender">{chatter}: </span>
            {message}
          </div>
        ))}
      </div>
      <form
        className="chatInput"
        onSubmit={(ev) => {
          ev.preventDefault();
          onSendChat();
        }}
      >
        <input
          type="text"
          className="InputText text"
          value={chatMessage}
          placeholder="Send a message..."
          onChange={(ev) => {
            setChatMessage(ev.target.value);
          }}
          ref={inputRef}
        />
        <ButtonForm isDisabled={chatMessage.length === 0} onClick={onSendChat}>
          Send
        </ButtonForm>
      </form>
    </div>
  );
}
