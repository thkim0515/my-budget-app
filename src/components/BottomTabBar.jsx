import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';

import { AiFillHome, AiOutlineBarChart, AiOutlineSetting } from "react-icons/ai";

const Bar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 70px;

  background: ${({ theme }) => theme.card};
  border-top: 1px solid ${({ theme }) => theme.border};

  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 10;
`;

const TabWrapper = styled.div`
  flex: 1;
  text-align: center;
  position: relative;
`;

const ActiveCircle = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  width: 42px;
  height: 42px;

  /* 밝은 파란색 하이라이트 (다크모드에서도 잘 보임) */
  background: rgba(25, 118, 210, 0.25);

  border-radius: 50%;
  transition: all 0.25s ease;
`;

const Tab = styled(Link)`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;

  text-decoration: none;

  /* 아이콘 색상 */
  color: ${({ active, theme }) =>
    active ? theme.activeText : theme.text};

  font-size: 12px;
  font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
`;


export default function BottomTabBar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <Bar>
      <TabWrapper>
        {path === "/" && <ActiveCircle />}
        <Tab to="/" active={path === "/"}>
          <AiFillHome size={26} />
        </Tab>
      </TabWrapper>

      <TabWrapper>
        {path === "/stats" && <ActiveCircle />}
        <Tab to="/stats" active={path === "/stats"}>
          <AiOutlineBarChart size={26} />
        </Tab>
      </TabWrapper>

      <TabWrapper>
        {path === "/settings" && <ActiveCircle />}
        <Tab to="/settings" active={path === "/settings"}>
          <AiOutlineSetting size={26} />
        </Tab>
      </TabWrapper>
    </Bar>
  );
}
