import React from "react";
import styled from "styled-components";
import Header from "./Header";

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  padding-bottom: 80px;
  
  /* 중앙 정렬을 위한 핵심 코드 */
  max-width: 480px;  /* 모바일 가독성을 위한 너비 제한 */
  margin: 0 auto;    /* 화면 가운데로 정렬 */
  width: 100%;       /* 모바일 기기에서는 전체 너비 사용 */
  box-shadow: 0 0 10px rgba(0,0,0,0.05); /* 경계 구분을 위한 미세한 그림자 */
`;

const HeaderFix = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${({ theme }) => theme.bg};
  width: 100%;
`;

const Content = styled.div`
  padding: 20px;
  line-height: 1.7;
  font-size: 14px;

  h2 { 
    font-size: 17px; 
    margin-top: 28px; 
    margin-bottom: 10px;
    color: #1976d2; 
    font-weight: bold;
  }
  
  p, li { 
    opacity: 0.85; 
    margin-bottom: 8px; 
    word-break: keep-all;
  }

  ul { padding-left: 18px; }

  .security-card { 
    color: #2c3e50;
    font-weight: bold;
    padding: 15px;
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#eef2f7'};
    border-left: 4px solid #1976d2;
    border-radius: 4px;
    margin: 20px 0;
    font-size: 13px;
  }

  .footer-date {
    margin-top: 40px;
    opacity: 0.5;
    font-size: 12px;
    text-align: right;
  }
`;

export default function PrivacyPolicyPage() {
  return (
    <PageWrap>
      <HeaderFix>
        <Header title="개인정보 처리방침" />
      </HeaderFix>

      <Content>
        <p>본 앱은 사용자의 소중한 금융 데이터를 보호하기 위해 <strong>종단간 암호화(E2EE)</strong> 기술을 사용하여 정보를 처리합니다.</p>

        <h2>1. 수집하는 정보 항목</h2>
        <p>앱은 서비스 제공을 위해 최소한의 정보만을 처리하며, 가계부의 상세 내용은 본인 외에는 누구도 알 수 없도록 처리됩니다.</p>
        <ul>
          <li><strong>계정 식별 정보:</strong> 이메일 주소, 프로필 이름 (데이터 백업 및 본인 인증 용도)</li>
          <li><strong>암호화된 백업 데이터:</strong> 사용자가 백업 시 생성되는 암호화된 텍스트 덩어리</li>
        </ul>

        <div className="security-card">
          🛡️ 본 앱은 사용자의 원본 지출/수입 내역을 서버에 평문으로 저장하지 않습니다. 모든 데이터는 기기 내에서 AES-256 방식으로 암호화된 후 전송됩니다.
        </div>

        <h2>2. 데이터 이용 및 동기화</h2>
        <p>수집된 정보는 오직 사용자가 직접 요청한 <strong>'데이터 복구 및 기기 간 동기화'</strong>를 위해서만 사용됩니다. 백업 시 사용되는 비밀번호는 서버에 전송되거나 저장되지 않습니다.</p>

        <h2>3. 강력한 개인정보 보호 원칙</h2>
        <ul>
          <li><strong>열람 불가:</strong> 개발자와 시스템 관리자를 포함한 제3자는 사용자의 가계부 내용을 절대 열람할 수 없습니다.</li>
          <li><strong>비밀번호 보안:</strong> 암호화된 데이터는 사용자 기기에서만 처리되며, 분실 시 개발자도 데이터를 복구해 드릴 수 없습니다.</li>
          <li><strong>투명한 관리:</strong> 로그아웃 하거나 계정을 탈퇴하는 경우 서버의 암호화된 데이터는 즉시 삭제됩니다.</li>
        </ul>

        <h2>4. 문의처</h2>
        <p>보안 및 개인정보와 관련한 문의는 아래 메일로 연락 부탁드립니다.</p>
        <p>이메일: <strong>starblogk@gmail.com</strong></p>
        
        <div className="footer-date">최종 수정일: 2025년 12월 29일</div>
      </Content>
    </PageWrap>
  );
}