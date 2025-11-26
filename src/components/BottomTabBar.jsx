import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';
import { AiFillHome, AiOutlineBarChart, AiOutlineSetting } from "react-icons/ai";
import { MdListAlt, MdCalendarToday } from "react-icons/md"; // ← 캘린더 아이콘 추가


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
      {/* 홈 */}
      <TabWrapper>
        {path === "/" && <ActiveCircle />}
        <Tab to="/" active={path === "/"}>
          <AiFillHome size={26} />
        </Tab>
      </TabWrapper>

      {/* 통계 */}
      <TabWrapper>
        {path === "/stats" && <ActiveCircle />}
        <Tab to="/stats" active={path === "/stats"}>
          <AiOutlineBarChart size={26} />
        </Tab>
      </TabWrapper>

      {/* 새로 추가된 "캘린더 통계" */}
      <TabWrapper>
        {path === "/calendar-stats" && <ActiveCircle />}
        <Tab to="/calendar-stats" active={path === "/calendar-stats"}>
          <MdCalendarToday size={26} />
        </Tab>
      </TabWrapper>

      {/* 출처 통계 */}
      <TabWrapper>
        {path === "/source-stats" && <ActiveCircle />}
        <Tab to="/source-stats" active={path === "/source-stats"}>
          <MdListAlt size={26} />
        </Tab>
      </TabWrapper>

      {/* 설정 */}
      <TabWrapper>
        {path === "/settings" && <ActiveCircle />}
        <Tab to="/settings" active={path === "/settings"}>
          <AiOutlineSetting size={26} />
        </Tab>
      </TabWrapper>

    </Bar>
  );
}
