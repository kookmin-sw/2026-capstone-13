/** 닉네임 첫 글자 반환. 탈퇴 계정((알 수 없음))은 '?' 반환 */
export const getInitial = (name: string): string => {
  if (name === '(알 수 없음)') return '?';
  return name.charAt(0);
};
