import { StartMenu, ButtonIconSmall, ButtonProgram } from "packard-belle";
import { useEffect, useState } from "react";

interface TaskBarProps {
  options: NestedArray<{ title: string; icon: string; onClick: () => void }>;
  quickLaunch?: Array<{ icon: string; title: string; onClick?: () => void }>;
  openWindows?: Array<{
    isActive: boolean;
    onClick: () => void;
    icon: string;
    title: string;
    id: number;
    isAlerting: boolean;
  }>;
  notifiers: Array<{ alt: string; icon: string; onClick: () => void }>;
}
export function TaskBar(props: TaskBarProps) {
  return (
    <div className="TaskBar">
      <StartMenu className="TaskBar__start" options={props.options} />
      {props.quickLaunch && (
        <div className="TaskBar__quick-launch">
          {props.quickLaunch.map((qlEntry) => (
            <ButtonIconSmall
              key={`${qlEntry.icon}-QuickLaunch`}
              title={qlEntry.title}
              onClick={qlEntry.onClick}
              icon={qlEntry.icon}
            />
          ))}
        </div>
      )}
      <div className="TaskBar__programs">
        {props.openWindows &&
          props.openWindows.map((openWindow) => (
            <ButtonProgram
              isActive={openWindow.isActive}
              onClick={openWindow.onClick}
              icon={openWindow.icon}
              key={`${openWindow.icon}-ButtonProgram-${openWindow.title}-${openWindow.id}`}
              className={openWindow.isAlerting ? "flashing" : ""}
            >
              {openWindow.title}
            </ButtonProgram>
          ))}
      </div>
      <Notifications notifiers={props.notifiers} />
    </div>
  );
}

const formatTime = (time: number) => {
  const date = new Date(time);
  let hour: number | string = date.getHours();
  let min: number | string = date.getMinutes();

  if (hour < 10) {
    hour = "0" + hour;
  }
  if (min < 10) {
    min = "0" + min;
  }

  return hour + ":" + min;
};

function Time() {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearTimeout(timer);
  });
  return <div className="TaskBar__notifications__time">{formatTime(time)}</div>;
}

export function Notifications(props: {
  notifiers: Array<{
    icon: string;
    onClick: () => void;
    alt: string;
  }>;
}) {
  return (
    <div className="TaskBar__notifications">
      {props.notifiers.map((notifier) => (
        <Notifier
          key={notifier.alt}
          icon={notifier.icon}
          onClick={notifier.onClick}
          title={notifier.alt}
        />
      ))}
      <Time />
    </div>
  );
}

export function Notifier(props: {
  title: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      className="btn Notifier TaskBar__notifications__notifier"
      title={props.title}
      onClick={props.onClick}
      style={{ backgroundImage: `url("${props.icon}")` }}
    />
  );
}
