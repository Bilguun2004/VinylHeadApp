import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Updates from 'expo-updates';

import { useSegments } from 'expo-router';

import { useEffect, useState } from 'react';

import { AppState, Text, View } from 'react-native';



import { useAuthSessionQuery } from '../api/use-auth-session-query';

import { getPushStatus, type PushStatus } from '../lib/register-push-token';



const PUSH_INVOKE_KEY = 'vinylhead.push.lastInvoke';



function formatPushStatus(status: PushStatus | null): string {

  if (!status) return 'NO';

  if (status.ok && status.prefix) return status.prefix.slice(0, 20);

  if (status.reason) {

    const short = status.reason.replace(/^token_error:/, 'FCM:').slice(0, 40);

    return `ERR:${short}`;

  }

  return 'NO';

}



function formatPushDetail(status: PushStatus | null): string | null {

  if (!status?.reason || status.ok) return null;

  return status.reason.replace(/^token_error:/, 'FCM: ');

}



/** Visible boot diagnostics (no adb required). Remove after debug session. */

export function DebugBootStrip() {

  const segments = useSegments();

  const sessionQuery = useAuthSessionQuery();

  const [line, setLine] = useState('boot…');

  const [pushDetail, setPushDetail] = useState<string | null>(null);



  useEffect(() => {

    const refresh = () => {

      void (async () => {

        let pushDisplay = 'NO';

        let pushInvoke = 'none';

        let detail: string | null = null;



        try {

          const status = await getPushStatus();

          pushDisplay = formatPushStatus(status);

          detail = formatPushDetail(status);



          const invokeRaw = await AsyncStorage.getItem(PUSH_INVOKE_KEY);

          if (invokeRaw) {

            const parsed = JSON.parse(invokeRaw) as {

              sent?: number;

              tokenCount?: number;

              suppressed?: boolean;

            };

            pushInvoke = `s${parsed.sent ?? 0}/t${parsed.tokenCount ?? 0}${parsed.suppressed ? 'X' : ''}`;

          }

        } catch {

          /* ignore */

        }



        setPushDetail(detail);

        setLine(

          [

            `upd:${Updates.updateId?.slice(0, 8) ?? 'none'}`,

            `ses:${sessionQuery.data ? 'Y' : 'N'}`,

            `push:${pushDisplay}`,

            `snd:${pushInvoke}`,

            `seg:${JSON.stringify(segments)}`,

          ].join(' '),

        );

      })();

    };



    refresh();

    const sub = AppState.addEventListener('change', (state) => {

      if (state === 'active') refresh();

    });

    return () => sub.remove();

  }, [segments, sessionQuery.data]);



  return (

    <View className="mt-4 px-2">

      <Text className="text-[10px] text-vinyl-muted" selectable>

        {line}

      </Text>

      {pushDetail ? (

        <Text className="text-[9px] text-vinyl-muted" selectable>

          {pushDetail}

        </Text>

      ) : null}

    </View>

  );

}

