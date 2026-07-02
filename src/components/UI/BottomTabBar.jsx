import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { AiFillHome, AiOutlineBarChart, AiOutlineSetting } from "react-icons/ai";
import { MdListAlt, MdCalendarToday } from "react-icons/md";

const Bar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: calc(72px + env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.card};
  border-top: 1px solid ${({ theme }) => theme.border};
  box-shadow: 0 -6px 20px rgba(20, 30, 60, 0.06);
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  z-index: 10;
  padding-bottom: env(safe-area-inset-bottom);
`;

const TabWrapper = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ActiveIndicator = styled.div`
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  background: ${({ theme }) => theme.activeBg};
  border-radius: 50%;
  transition: all 0.2s ease;
`;

const Tab = styled(Link)`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 4px;
  width: 100%;
  text-decoration: none;
  color: ${({ $active, theme }) => ($active ? theme.activeText : theme.text)};
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? "700" : "400")};
  opacity: ${({ $active }) => ($active ? 1 : 0.55)};
  transition: color 0.2s, opacity 0.2s;
`;

const TABS = [
  { to: "/", icon: AiFillHome, label: "홈" },
  { to: "/stats", icon: AiOutlineBarChart, label: "통계" },
  { to: "/calendar-stats", icon: MdCalendarToday, label: "캘린더" },
  { to: "/source-stats", icon: MdListAlt, label: "출처" },
  { to: "/settings", icon: AiOutlineSetting, label: "설정" },
];

export default function BottomTabBar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <Bar>
      {TABS.map(({ to, icon: Icon, label }) => {
        const isActive = path === to;
        return (
          <TabWrapper key={to}>
            {isActive && <ActiveIndicator />}
            <Tab to={to} $active={isActive}>
              <Icon size={24} />
              <span>{label}</span>
            </Tab>
          </TabWrapper>
        );
      })}
    </Bar>
  );
}
