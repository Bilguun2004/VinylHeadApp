import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '../../chat/api/chat-keys';
import { authSessionKeys } from './use-auth-session-query';
import { signOutWithCleanup } from '../lib/sign-out';

export function useSignOutMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['auth', 'sign-out'],
    mutationFn: signOutWithCleanup,
    onSuccess: () => {
      qc.setQueryData(authSessionKeys.session, null);
      void qc.removeQueries({ queryKey: chatKeys.all });
    },
  });
}
