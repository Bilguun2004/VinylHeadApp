import type { ChatMessageRow } from '../api/use-chat-messages-query';

export type MessageGroupMeta = {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
};

function isSameSender(a: ChatMessageRow, b: ChatMessageRow): boolean {
  return a.sender_role === b.sender_role && a.sender_user_id === b.sender_user_id;
}

export function getMessageGroupMeta(
  messages: ChatMessageRow[],
  index: number,
): MessageGroupMeta {
  const message = messages[index];
  const prev = messages[index - 1];
  const next = messages[index + 1];

  return {
    isFirstInGroup: !prev || !isSameSender(prev, message),
    isLastInGroup: !next || !isSameSender(next, message),
  };
}

export function bubbleRadiusClass(
  isMine: boolean,
  { isFirstInGroup, isLastInGroup }: MessageGroupMeta,
): string {
  if (isMine) {
    if (isFirstInGroup && isLastInGroup) return 'rounded-[20px]';
    if (isFirstInGroup) return 'rounded-[20px] rounded-br-[6px]';
    if (isLastInGroup) return 'rounded-[20px] rounded-tr-[6px]';
    return 'rounded-[20px] rounded-r-[6px]';
  }

  if (isFirstInGroup && isLastInGroup) return 'rounded-[20px]';
  if (isFirstInGroup) return 'rounded-[20px] rounded-bl-[6px]';
  if (isLastInGroup) return 'rounded-[20px] rounded-tl-[6px]';
  return 'rounded-[20px] rounded-l-[6px]';
}
