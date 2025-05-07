import { useState, useEffect } from "react";
import { useGlobalNotification } from "../../globalState/GlobalState";
import Style from "./Notification.module.css";

export const Notification: React.FC = () => {
  const [timer, setTimer] = useState<boolean>(false);
  const [timePassed, setTimePassed] = useState<boolean>(false);
  const [stop, setStop] = useState<boolean>(false);
  const { messages, removeNotificationMessage } = useGlobalNotification();

  useEffect(() => {
    if (!stop) {
      setTimeout(() => {
        setTimePassed(!timePassed);
      }, 4000);
    }
  }, [timer]);

  useEffect(() => {
    removeNotificationMessage();

    verifyStop();
  }, [timePassed]);

  useEffect(() => {
    verifyStop();

    setTimer(!timer);
  }, [messages]);

  const verifyStop = () => {
    if (messages.length == 0) {
      setStop(true);
    } else {
      setStop(false);
    }
  };

  return (
    <>
      <div
        className={Style.modal_section}
        style={{ display: messages.length > 0 ? "flex" : "none" }}
      >
        {messages.length > 0
          ? messages.map((notification, index) => (
              <div className={Style.modal_container} key={index}>
                <p>
                  <strong> {notification.message} </strong>
                </p>
              </div>
            ))
          : null}
      </div>
    </>
  );
};
