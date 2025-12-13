import Style from "./Button.module.css";

interface buttonProps {
  style?: any;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<buttonProps> = ({ style, onClick, children }) => {
  return (
    <button style={style} onClick={onClick} className={Style.button_minecraft}>
      <span className={Style.button_minecraft_text}>{children}</span>
    </button>
  );
};