import { useEffect } from "react";
import { useGlobalNotification } from "../../globalState/GlobalState";
import Style from "./Notification.module.css";

export const Notification: React.FC = () => {
  const { messages, removeNotificationMessage } = useGlobalNotification();

  useEffect(() => {
    if (messages.length === 0) return;

    const timeout = setTimeout(() => {
      removeNotificationMessage();
    }, 4000);

    return () => clearTimeout(timeout);
  }, [messages, removeNotificationMessage]);

  if (messages.length === 0) return null;

  return (
    <div className={Style.modal_section}>
      {messages.map((notification, index) => (
        <div className={Style.modal_container} key={index}>
          <p>
            <strong>{notification.message}</strong>
          </p>
        </div>
      ))}
    </div>
  );
};
