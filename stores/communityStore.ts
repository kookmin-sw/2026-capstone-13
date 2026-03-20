// 커뮤니티 게시글 상태 관리 (Zustand)
import { create } from 'zustand';
import type { CommunityPost, Comment, PostCategory, UserType } from '../types';

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 1, category: 'INFO',
    title: '외국인 학생 건강보험 가입 방법 총정리',
    content: '많이들 모르는 외국인 유학생 건강보험 가입 절차를 정리해봤어요. 국민건강보험 홈페이지에서...',
    images: [],
    author: '김민준', university: '국민대학교', userType: 'KOREAN',
    likes: 34, comments: 12, createdAt: '2026-03-15T08:00:00',
  },
  {
    id: 2, category: 'QUESTION',
    title: '편의점 알바 지원할 때 외국인도 가능한가요?',
    content: 'D-2 비자로 재학 중인데, 주 20시간 이내로 편의점 알바를 하려고 합니다. 서류는 어떻게...',
    images: [],
    author: '리웨이', university: '국민대학교', userType: 'INTERNATIONAL',
    likes: 15, comments: 8, createdAt: '2026-03-15T09:30:00',
  },
  {
    id: 3, category: 'CULTURE',
    title: '한국 추석 문화가 너무 신기해요!',
    content: '지난 추석에 친구 가족이랑 같이 지냈는데 차례상 차리고 성묘 가는 문화가 정말 인상적이었어요.',
    images: [],
    author: '아흐메드', university: '국민대학교', userType: 'INTERNATIONAL',
    likes: 42, comments: 23, createdAt: '2026-03-14T14:00:00',
  },
  {
    id: 4, category: 'CHAT',
    title: '오늘 학식 메뉴 추천해주세요 ㅋㅋ',
    content: '학식 처음 먹어보는데 뭐가 맛있어요? 한국 밥은 다 맛있어 보여서 고르기가 어렵네요 😂',
    images: [],
    author: '마리아', university: '국민대학교', userType: 'INTERNATIONAL',
    likes: 7, comments: 19, createdAt: '2026-03-15T11:20:00',
  },
  {
    id: 5, category: 'INFO',
    title: '서울 외국인 유학생 무료 한국어 수업 정보',
    content: '서울시에서 운영하는 무료 한국어 수업 링크 공유해요. 초급/중급/고급 반 모두 있고 온라인도...',
    images: [],
    author: '이서연', university: '국민대학교', userType: 'KOREAN',
    likes: 28, comments: 6, createdAt: '2026-03-14T10:00:00',
  },
  {
    id: 6, category: 'QUESTION',
    title: '기숙사 신청 경쟁률이 너무 높아요',
    content: '1지망 탈락했는데 2지망도 안될 것 같아서요. 학교 근처 고시원이나 쉐어하우스 어떻게 구하는지...',
    images: [],
    author: '천밍', university: '국민대학교', userType: 'INTERNATIONAL',
    likes: 11, comments: 14, createdAt: '2026-03-13T16:00:00',
  },
];

const INITIAL_COMMENTS: Record<number, Comment[]> = {
  1: [
    { id: 101, postId: 1, author: '박지혜', university: '국민대학교', userType: 'KOREAN', content: '너무 유용한 정보 감사해요!', createdAt: '2026-03-15T09:00:00' },
    { id: 102, postId: 1, author: '소피아', university: '국민대학교', userType: 'INTERNATIONAL', content: '이 정보 찾고 있었는데 도움됐어요 😊', createdAt: '2026-03-15T10:00:00' },
  ],
  3: [
    { id: 201, postId: 3, author: '이민수', university: '국민대학교', userType: 'KOREAN', content: '한국 문화에 관심 가져줘서 고마워요!', createdAt: '2026-03-14T15:00:00' },
  ],
};

interface NewPostInput {
  category: PostCategory;
  title: string;
  content: string;
  images: string[];
  author: string;
  authorId?: number;
  university: string;
  userType: UserType;
}

interface CommunityState {
  posts: CommunityPost[];
  likedPostIds: Record<number, number[]>; // userId → postId[]
  postComments: Record<number, Comment[]>;
  addPost: (input: NewPostInput) => void;
  toggleLike: (postId: number, userId: number) => void;
  addComment: (postId: number, content: string, author: string, university: string, userType: UserType) => void;
}

let nextPostId = INITIAL_POSTS.length + 1;
let nextCommentId = 300;

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: INITIAL_POSTS,
  likedPostIds: {},
  postComments: INITIAL_COMMENTS,

  addPost: (input: NewPostInput) => {
    const newPost: CommunityPost = {
      id: nextPostId++,
      ...input,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ posts: [newPost, ...state.posts] }));
  },

  toggleLike: (postId: number, userId: number) => {
    const liked = (get().likedPostIds[userId] ?? []).includes(postId);
    set((state) => ({
      likedPostIds: {
        ...state.likedPostIds,
        [userId]: liked
          ? (state.likedPostIds[userId] ?? []).filter((id) => id !== postId)
          : [...(state.likedPostIds[userId] ?? []), postId],
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p
      ),
    }));
  },

  addComment: (postId: number, content: string, author: string, university: string, userType: UserType) => {
    const newComment: Comment = {
      id: nextCommentId++,
      postId,
      author,
      university,
      userType,
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      postComments: {
        ...state.postComments,
        [postId]: [...(state.postComments[postId] ?? []), newComment],
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p
      ),
    }));
  },
}));
