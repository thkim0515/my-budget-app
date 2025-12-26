
import styled from "styled-components";

// 기본 페이지 레이아웃
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

// 고정된 상단 헤더 영역
export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

// 스크롤 가능한 본문 영역
export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;

// 설정 버튼 스타일
export const Btn = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: none;
  border-radius: 6px;
  background: #1976d2;
  color: white;
  font-size: 15px;
`;

// 섹션 제목 스타일
export const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.text};
  margin-top: 20px;
  margin-bottom: 12px;
`;

// 토글 스위치 행
export const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.text};
`;

// 토글 스위치 스타일 구성
export const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }

  span:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + span {
    background-color: #1976d2;
  }

  input:checked + span:before {
    transform: translateX(24px);
  }
`;

// src/pages/Settings/SettingsPage.styles.jsx 에 추가

export const ColorConfigBox = styled.div`
  margin-top: 20px;
  padding: 15px;
  /* 테마의 카드 배경색보다 약간 더 강조되거나 구분되는 배경색 사용 */
  background: ${({ theme }) => theme.card}; 
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
`;

export const ConfigTitle = styled.p`
  font-size: 14px;
  margin-bottom: 15px;
  font-weight: bold;
  color: ${({ theme }) => theme.text}; /* 테마 글자색 적용 */
`;

export const ResetSubBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.text};
  opacity: 0.6; /* 약간 흐리게 처리 */
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 10px;
  margin-top: 10px;
  cursor: pointer;

  &:active {
    opacity: 1;
  }
`;