
import styled from "styled-components";

// 기본 페이지 레이아웃
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
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
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
`;

export const Row50 = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;

  & > button {
    flex: 1;
  }
`;

// 설정 버튼 스타일
export const Btn = styled.button`
  width: 100%;
  padding: 14px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  &:active { transform: scale(0.99); background: ${({ theme }) => theme.surfaceHover}; }
`;

// 섹션 제목 스타일
export const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.subText};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin-top: 24px;
  margin-bottom: 12px;
`;

// 토글 스위치 행
export const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  margin-bottom: 10px;
  font-weight: 600;
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
    background-color: ${({ theme }) => theme.card};
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  input:checked + span {
    background-color: ${({ theme }) => theme.primary};
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

export const FieldLabelStandalone = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.subText};
  margin-bottom: 6px;
`;

export const SelectInline = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  box-sizing: border-box;
`;

export const InputInline = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  box-sizing: border-box;
`;

// 입력값 저장 확정용 강조 버튼 (예: 카드 한도 저장)
export const PrimarySaveBtn = styled.button`
  width: 100%;
  padding: 13px;
  margin-bottom: 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme, disabled }) => (disabled ? theme.borderStrong : theme.primary)};
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  transition: transform 0.1s, opacity 0.15s;
  &:active { transform: ${({ disabled }) => (disabled ? "none" : "scale(0.98)")}; }
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