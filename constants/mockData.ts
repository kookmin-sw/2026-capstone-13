// 백엔드 연결 전 UI 확인용 목업 데이터
import type { HelpRequest } from '../types';

export const MOCK_REQUESTS: HelpRequest[] = [
  {
    id: 1,
    title: '은행 계좌 개설 도와주실 분 구해요',
    description:
      '신한은행에서 외국인 계좌 개설하려는데 서류 준비부터 같이 가주실 분 있나요?\n\n필요한 서류가 뭔지도 잘 모르고, 은행 직원이랑 한국어로 대화하는 게 너무 어려워요. 근처 신한은행 같이 가주실 분 구합니다. 시간은 평일 오전에 가능해요!',
    category: 'BANK',
    helpMethod: 'OFFLINE',
    status: 'WAITING',
    requester: {
      id: 1,
      email: 'li@test.com',
      nickname: '리웨이',
      userType: 'INTERNATIONAL',
      university: '한양대학교',
      rating: 4.5,
      helpCount: 2,
      createdAt: '2026-03-10',
    },
    createdAt: '2026-03-15T09:00:00',
    updatedAt: '2026-03-15T09:00:00',
  },
  {
    id: 2,
    title: '병원 예약 전화 통역 부탁드려요',
    description:
      '내과 예약 전화해야 하는데 한국어가 아직 서툴러서 통역 좀 도와주실 수 있나요?\n\n전화 통화 5분 정도면 될 것 같아요. 가능하시면 채팅으로 먼저 연락 주시면 일정 맞춰볼게요.',
    category: 'HOSPITAL',
    helpMethod: 'CHAT',
    status: 'WAITING',
    requester: {
      id: 2,
      email: 'ahmed@test.com',
      nickname: '아흐메드',
      userType: 'INTERNATIONAL',
      university: '연세대학교',
      rating: 4.8,
      helpCount: 0,
      createdAt: '2026-03-12',
    },
    createdAt: '2026-03-15T10:30:00',
    updatedAt: '2026-03-15T10:30:00',
  },
  {
    id: 3,
    title: '수강신청 방법 알려주실 분!',
    description:
      '포탈에서 수강신청하는 방법을 잘 모르겠어요. 영상통화로 같이 해주실 수 있나요?\n\n수강신청 날짜가 곧 다가오는데 혼자 하기가 너무 어렵네요. 학교 포탈 사용법, 수강 바구니 담는 법 등을 알려주시면 정말 감사하겠습니다!',
    category: 'SCHOOL',
    helpMethod: 'VIDEO_CALL',
    status: 'WAITING',
    requester: {
      id: 3,
      email: 'maria@test.com',
      nickname: '마리아',
      userType: 'INTERNATIONAL',
      university: '성균관대학교',
      rating: 5.0,
      helpCount: 1,
      createdAt: '2026-03-11',
    },
    createdAt: '2026-03-15T11:00:00',
    updatedAt: '2026-03-15T11:00:00',
  },
  {
    id: 4,
    title: '주민등록증 발급 절차 안내 부탁해요',
    description:
      '외국인 등록증 발급받으러 출입국사무소 가야 하는데 어떻게 하는지 알려주실 분!\n\n어떤 서류를 준비해야 하는지, 예약은 어떻게 하는지 너무 복잡해서 도움 요청드립니다.',
    category: 'DAILY',
    helpMethod: 'CHAT',
    status: 'MATCHED',
    requester: {
      id: 4,
      email: 'chen@test.com',
      nickname: '천밍',
      userType: 'INTERNATIONAL',
      university: '고려대학교',
      rating: 4.2,
      helpCount: 3,
      createdAt: '2026-03-08',
    },
    createdAt: '2026-03-14T15:00:00',
    updatedAt: '2026-03-14T16:00:00',
  },
];
