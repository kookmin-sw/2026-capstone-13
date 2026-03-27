// Expo Go용 react-native-agora 목업
import React from 'react';
import { View } from 'react-native';

export const createAgoraRtcEngine = () => ({
  initialize: () => {},
  registerEventHandler: () => {},
  unregisterEventHandler: () => {},
  enableVideo: () => {},
  startPreview: () => {},
  joinChannel: () => {},
  leaveChannel: () => {},
  release: () => {},
  muteLocalAudioStream: () => {},
  muteLocalVideoStream: () => {},
  setClientRole: () => {},
  setChannelProfile: () => {},
  setupLocalVideo: () => {},
  setupRemoteVideo: () => {},
});

export const RtcSurfaceView = ({ style }: { style?: object }) =>
  React.createElement(View, { style });

export enum ChannelProfileType {
  ChannelProfileLiveBroadcasting = 1,
  ChannelProfileCommunication = 0,
}

export enum ClientRoleType {
  ClientRoleBroadcaster = 1,
  ClientRoleAudience = 2,
}

export enum VideoSourceType {
  VideoSourceCamera = 0,
  VideoSourceRemote = 1,
}

export type IRtcEngine = ReturnType<typeof createAgoraRtcEngine>;
export type IRtcEngineEventHandler = Record<string, (...args: unknown[]) => void>;
