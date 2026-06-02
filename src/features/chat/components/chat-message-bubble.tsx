import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Download, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, Text, View } from 'react-native';

import { ProfileAvatar } from '../../profile/components/profile-avatar';
import type { ChatMessageRow } from '../api/use-chat-messages-query';
import {
  bubbleRadiusClass,
  type MessageGroupMeta,
} from '../lib/message-grouping';

const AVATAR_SIZE = 28;
const LOGO = require('../../../../assets/logo.png');

type Props = {
  message: ChatMessageRow;
  isMine: boolean;
  group: MessageGroupMeta;
  peerAvatarUrl?: string | null;
  useBrandAvatar?: boolean;
};

function extensionFromUrl(url: string): 'png' | 'jpg' | 'webp' | 'gif' {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function mimeForExt(ext: string): string {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function PeerAvatar({
  peerAvatarUrl,
  useBrandAvatar,
}: {
  peerAvatarUrl?: string | null;
  useBrandAvatar?: boolean;
}) {
  if (useBrandAvatar) {
    return (
      <View
        className="overflow-hidden rounded-full bg-white"
        style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      >
        <Image
          source={LOGO}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return <ProfileAvatar avatarUrl={peerAvatarUrl ?? null} size={AVATAR_SIZE} />;
}

export function ChatMessageBubble({
  message,
  isMine,
  group,
  peerAvatarUrl,
  useBrandAvatar = false,
}: Props) {
  const bubble = isMine ? 'bg-vinyl-black' : 'bg-vinyl-input';
  const textColor = isMine ? 'text-vinyl-paper' : 'text-vinyl-black';
  const radiusClass = bubbleRadiusClass(isMine, group);
  const showAvatar = !isMine && group.isLastInGroup;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const imageUrl = message.image_url ?? null;
  const imageExt = useMemo(() => (imageUrl ? extensionFromUrl(imageUrl) : 'jpg'), [imageUrl]);

  const downloadImage = async () => {
    if (!imageUrl) return;

    if (Platform.OS === 'web') {
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!FileSystem.cacheDirectory) {
      throw new Error('Татаж авах боломжгүй.');
    }

    try {
      setIsDownloading(true);
      const filename = `chat-image-${message.id}.${imageExt}`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const result = await FileSystem.downloadAsync(imageUrl, dest);
      if (result.status !== 200) {
        throw new Error('Зураг татахад алдаа гарлаа.');
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Энэ төхөөрөмж дээр татаж авах боломжгүй.');
      }

      let shareUri = result.uri;
      if (Platform.OS === 'android') {
        shareUri = await FileSystem.getContentUriAsync(result.uri);
      }

      await Sharing.shareAsync(shareUri, {
        mimeType: mimeForExt(imageExt),
        dialogTitle: 'Чатын зураг',
        UTI: 'public.image',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View
      className={`flex-row px-4 ${group.isFirstInGroup ? 'mt-3' : 'mt-0.5'} ${
        isMine ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isMine ? (
        <View
          className="mr-2 justify-end"
          style={{ width: AVATAR_SIZE, minHeight: AVATAR_SIZE }}
        >
          {showAvatar ? (
            <PeerAvatar peerAvatarUrl={peerAvatarUrl} useBrandAvatar={useBrandAvatar} />
          ) : null}
        </View>
      ) : null}

      <View className={`max-w-[78%] overflow-hidden ${radiusClass} ${bubble}`}>
        {imageUrl ? (
          <>
            <Pressable
              onPress={() => setIsPreviewOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Зургийг харах"
            >
              <Image
                source={{ uri: imageUrl }}
                className="h-56 w-56"
                resizeMode="cover"
                accessibilityLabel="Chat image"
              />
            </Pressable>

            <Modal
              visible={isPreviewOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsPreviewOpen(false)}
            >
              <View className="flex-1 bg-black/90">
                <View className="flex-row items-center justify-between px-4 pb-3 pt-12">
                  <Pressable
                    onPress={() => void downloadImage()}
                    disabled={isDownloading}
                    accessibilityRole="button"
                    accessibilityLabel="Зураг татах"
                    accessibilityState={{ disabled: isDownloading, busy: isDownloading }}
                    hitSlop={8}
                    className={`flex-row items-center gap-2 rounded-2xl px-4 py-2 ${
                      isDownloading ? 'bg-white/20' : 'bg-white/15'
                    }`}
                  >
                    {isDownloading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Download size={18} color="#FFFFFF" />
                    )}
                    <Text className="text-sm font-semibold text-white">Татах</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setIsPreviewOpen(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Хаах"
                    hitSlop={8}
                    className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15"
                  >
                    <X size={20} color="#FFFFFF" />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => setIsPreviewOpen(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Зураг хаах"
                  className="flex-1 items-center justify-center px-4 pb-8"
                >
                  <Image
                    source={{ uri: imageUrl }}
                    className="h-full w-full rounded-2xl"
                    resizeMode="contain"
                    accessibilityLabel="Chat image preview"
                  />
                </Pressable>
              </View>
            </Modal>
          </>
        ) : null}
        {message.text ? (
          <Text className={`px-3.5 py-2.5 text-[15px] leading-5 ${textColor}`}>
            {message.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
