import { ButtonForm } from "packard-belle";
import React, { useEffect, useState } from "react";

import "./Tabs.css";

interface Tab {
  title: string;
  contents: JSX.Element;
}

interface TabsProps {
  tabs: [Tab, ...Tab[]];
  style?: React.CSSProperties;
  className?: string;
}

export function Tabs({ tabs, style, className }: TabsProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    if (selectedTab >= tabs.length) {
      setSelectedTab(tabs.length - 1);
    }
  }, [selectedTab, tabs]);

  const realSelectedTab = Math.min(selectedTab, tabs.length - 1);

  return (
    <div
      style={style}
      className={`tabsContainer ${className ? className : ""}`}
    >
      <div>
        {tabs.map((tab, i) => (
          <ButtonForm
            className={`tab ${realSelectedTab === i ? "selectedTab" : ""}`}
            key={i}
            onClick={() => setSelectedTab(i)}
          >
            {tab.title}
          </ButtonForm>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          className="tabContents"
          style={i !== realSelectedTab ? { display: "none" } : {}}
        >
          {tab.contents}
        </div>
      ))}
    </div>
  );
}
