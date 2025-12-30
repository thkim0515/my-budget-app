import React from "react";
import Header from "../UI/Header";
import styled from "styled-components";

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  padding-bottom: 80px;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
  position: relative;
`;

const HeaderFix = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${({ theme }) => theme.bg};
  width: 100%;
  max-width: 480px;
`;

const Content = styled.div`
  padding: 16px; 
  line-height: 1.6;
  font-size: 14px;

  h2 { 
    font-size: 17px; 
    margin-top: 24px; 
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
    color: ${({ theme }) => theme.mode === 'dark' ? '#e5e5e5' : '#2c3e50'};
    font-weight: bold;
    padding: 15px;
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8f9fa'};
    border-left: 4px solid #1976d2;
    border-radius: 4px;
    margin: 20px 0;
    font-size: 13px;
    border: 1px solid ${({ theme }) => theme.border};
    border-left: 4px solid #1976d2;
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
        <p>본 가계부 앱(이하 '앱')은 사용자의 개인정보를 소중히 다루며, 관련 법령을 준수하고 종단간 암호화(E2EE) 기술을 통해 데이터를 보호합니다.</p>

        <h2>1. 개인정보의 수집 및 이용 목적</h2>
        <p>앱은 다음의 목적을 위해 최소한의 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않습니다.</p>
        <ul>
          <li><strong>사용자 식별 및 서비스 관리:</strong> 구글 계정을 통한 본인 인증 및 중복 가입 방지</li>
          <li><strong>데이터 백업 및 동기화:</strong> 기기 변경 또는 앱 재설치 시 사용자의 가계부 데이터 복구</li>
        </ul>

        <h2>2. 수집하는 개인정보의 항목</h2>
        <ul>
          <li><strong>필수 정보:</strong> 구글 계정 정보(이메일 주소, 이름, 프로필 사진 URL)</li>
          <li><strong>서비스 이용 정보:</strong> 암호화된 가계부 데이터 덩어리(Payload), 기기 식별값</li>
        </ul>

        <div className="security-card">
          🛡️ 핵심 안내: 앱에서 생성된 지출/수입 상세 내역은 전송 전 기기 내에서 AES-256 방식으로 암호화됩니다. 서버 관리자를 포함한 제3자는 복호화 비밀번호 없이는 어떠한 내용도 열람할 수 없습니다.
        </div>

        <h2>3. 개인정보의 제3자 제공 및 위탁</h2>
        <p>앱은 서비스 제공을 위해 아래와 같은 외부 서비스를 이용하며, 해당 서비스의 인프라를 통해 데이터가 처리됩니다.</p>
        <ul>
          <li><strong>제공받는 자:</strong> Google (Firebase Auth, Cloud Firestore, Cloud Functions)</li>
          <li><strong>이용 목적:</strong> 본인 인증 및 데이터 클라우드 저장</li>
          <li><strong>보유 및 이용 기간:</strong> 서비스 종료 또는 사용자의 삭제 요청 시까지</li>
        </ul>

        <h2>4. 정보주체의 권리 및 행사방법</h2>
        <p>사용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 다음의 방법을 통해 탈퇴 및 데이터 삭제를 요청할 수 있습니다.</p>
        <ul>
          <li>앱 내 '전체 데이터 초기화' 기능을 통한 데이터 즉시 삭제</li>
          <li>구글 계정 연결 해제 또는 개발자 메일을 통한 계정 삭제 요청</li>
        </ul>

        <h2>5. 개인정보의 파기</h2>
        <p>앱은 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체 없이 해당 개인정보를 파기합니다. 파기 절차 및 방법은 다음과 같습니다.</p>
        <ul>
          <li><strong>파기절차:</strong> 사용자가 삭제를 요청하거나 서비스를 탈퇴할 경우 클라우드에 저장된 암호화된 데이터를 즉시 삭제합니다.</li>
          <li><strong>파기방법:</strong> 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
        </ul>

        <h2>6. 문의처</h2>
        <p>개인정보 보호 관련 문의 및 불만 처리는 아래 연락처로 문의해 주시기 바랍니다.</p>
        <p>이메일: <strong>starblogk@gmail.com</strong></p>
        
        <div className="footer-date">최종 수정일: 2025년 12월 29일</div>
      </Content>
    </PageWrap>
  );
}