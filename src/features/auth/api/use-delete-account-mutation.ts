import { useMutation, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '../../chat/api/chat-keys';
import { deleteAccountWithCleanup } from '../lib/delete-account';
import { authSessionKeys } from './use-auth-session-query';

export function useDeleteAccountMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['auth', 'delete-account'],
    mutationFn: deleteAccountWithCleanup,
    onSuccess: () => {
      qc.setQueryData(authSessionKeys.session, null);
      void qc.removeQueries({ queryKey: chatKeys.all });
    },
  });
}
